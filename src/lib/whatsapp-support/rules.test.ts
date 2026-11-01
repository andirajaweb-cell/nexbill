import { describe, expect, it } from "vitest";
import {
  botPhoneFromJid,
  isWaChatId,
  makeWaCode,
  normalizePhone,
  numberedList,
  parseLinkMessage,
  parseNumberReply,
  parseWaCommand,
  phoneOfWaChat,
  pickStaff,
  stateFresh,
  toWhatsAppText,
  waChatId,
  waMeUrl,
  WA_STATE_TTL_MS,
} from "./rules";
import { WA_TEXT } from "./text";

describe("support WhatsApp — aturan", () => {
  it("chat id log", () => {
    expect(waChatId("628123456789")).toBe("wa:628123456789");
    expect(isWaChatId("wa:628123456789")).toBe(true);
    expect(isWaChatId("123456")).toBe(false);
    expect(isWaChatId("wa-link:628123")).toBe(false);
    expect(phoneOfWaChat("wa:628123456789")).toBe("628123456789");
  });

  it("kode tautan", () => {
    const code = makeWaCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(parseLinkMessage("NEXBILL KODE AB2CD3")).toBe("AB2CD3");
    expect(parseLinkMessage("nexbill ab2cd3")).toBe("AB2CD3");
    expect(parseLinkMessage("kode: AB2CD3")).toBe("AB2CD3");
    expect(parseLinkMessage("makasih")).toBeNull();
    expect(parseLinkMessage("AB2CD3")).toBeNull();
    expect(parseLinkMessage("NEXBILL KODE AB0CD1")).toBeNull(); // 0 & 1 tidak dipakai di kode
    expect(parseLinkMessage("nexbill kode tv saya rusak")).toBeNull();
  });

  it("nomor telepon & bot", () => {
    expect(normalizePhone("0812-3456-789")).toBe("628123456789");
    expect(normalizePhone("+62 812 3456 789")).toBe("628123456789");
    expect(normalizePhone("8123456789")).toBe("628123456789");
    expect(normalizePhone("12")).toBeNull();
    expect(botPhoneFromJid("628111222333:12@s.whatsapp.net")).toBe("628111222333");
    expect(botPhoneFromJid("628111222333@s.whatsapp.net")).toBe("628111222333");
    expect(botPhoneFromJid(null)).toBeNull();
    expect(waMeUrl("628111", "NEXBILL KODE AB2CD3")).toBe("https://wa.me/628111?text=NEXBILL%20KODE%20AB2CD3");
  });

  it("perintah kata", () => {
    expect(parseWaCommand("MENU")?.command).toBe("menu");
    expect(parseWaCommand("/menu")?.command).toBe("menu");
    expect(parseWaCommand("0")?.command).toBe("menu");
    expect(parseWaCommand("tim")?.command).toBe("team");
    expect(parseWaCommand("TEAM")?.command).toBe("team");
    expect(parseWaCommand("status")?.command).toBe("status");
    expect(parseWaCommand("outlet 2")).toEqual({ command: "outlet", arg: "2" });
    expect(parseWaCommand("status shift saya kok merah")).toBeNull();
    expect(parseWaCommand("menu kasir tidak muncul")).toBeNull();
    expect(parseWaCommand("cara tutup shift")).toBeNull();
  });

  it("balasan angka & status menu", () => {
    expect(parseNumberReply("2")).toBe(2);
    expect(parseNumberReply(" 3. ")).toBe(3);
    expect(parseNumberReply("2 jam")).toBeNull();
    const now = Date.now();
    expect(stateFresh({ kind: "feedback", logId: "x", at: now - 1000 }, now)).toBe(true);
    expect(stateFresh({ kind: "feedback", logId: "x", at: now - WA_STATE_TTL_MS - 1 }, now)).toBe(false);
    expect(stateFresh(undefined, now)).toBe(false);
    expect(numberedList(["A", "B"])).toBe("1. A\n2. B");
  });

  it("format WhatsApp", () => {
    expect(toWhatsAppText("## Langkah\nBuka **Rental PS** lalu [panduan](https://x.id/a)")).toBe("Langkah\nBuka *Rental PS* lalu panduan (https://x.id/a)");
  });

  it("pilih staf untuk nomor di beberapa outlet", () => {
    const list = [
      { outletId: "a", role: "cashier" },
      { outletId: "b", role: "owner" },
    ];
    expect(pickStaff(list, "a")?.outletId).toBe("a");
    expect(pickStaff(list, null)?.outletId).toBe("b");
    expect(pickStaff(list, "zz")?.outletId).toBe("b");
    expect(pickStaff([], null)).toBeNull();
  });

  it("teks punya 6 bahasa & placeholder sama", () => {
    for (const [key, entry] of Object.entries(WA_TEXT)) {
      const e = entry as Record<string, string>;
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
      for (const l of ["id", "en", "ms", "th", "fil", "vi"]) {
        expect(e[l], `${key}.${l}`).toBeTruthy();
        expect(ph(e[l]), `${key}.${l}`).toBe(ph(e.id));
      }
    }
  });
});
