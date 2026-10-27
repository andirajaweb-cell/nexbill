import { describe, expect, it } from "vitest";
import { BOT_LANGS, BOT_TEXT, botText } from "./bot-text";
import {
  categoryToText,
  conversationStats,
  enforcedPriority,
  escalate,
  highestPriority,
  isSupportHours,
  isUrgentText,
  makeLinkCode,
  parseCommand,
  splitTelegramText,
  ticketSubject,
  toChatMessages,
} from "./support-rules";

describe("perintah & kode tautan", () => {
  it("mengurai perintah Telegram", () => {
    expect(parseCommand("/start abc_123")).toEqual({ command: "start", arg: "abc_123" });
    expect(parseCommand("/START@NexbillBot  kode")).toEqual({ command: "start", arg: "kode" });
    expect(parseCommand("/tim TV mati semua")).toEqual({ command: "tim", arg: "TV mati semua" });
    expect(parseCommand("halo /tim")).toBeNull();
  });
  it("kode tautan aman untuk parameter /start", () => {
    const code = makeLinkCode(new Uint8Array(24).map((_, i) => i * 37));
    expect(code).toHaveLength(24);
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe("prioritas", () => {
  it("kata kunci darurat → P1, apa pun kata AI", () => {
    expect(isUrgentText("Semua TV terkunci, pelanggan menunggu")).toBe(true);
    expect(isUrgentText("kasir gak bisa login dari pagi")).toBe(true);
    expect(isUrgentText("data transaksi hilang setelah update")).toBe(true);
    expect(isUrgentText("can't log in to the dashboard")).toBe(true);
    expect(isUrgentText("cara atur paket promo malam")).toBe(false);
    expect(enforcedPriority("P3", { text: "semua unit tidak bisa mulai" })).toBe("P1");
  });
  it("masalah berulang naik satu tingkat", () => {
    expect(enforcedPriority("P3", { text: "struk tidak tercetak", repeatedProblem: true })).toBe("P2");
    expect(escalate("P1")).toBe("P1");
    expect(escalate("P4", 2)).toBe("P2");
    expect(highestPriority("P3", null, "P2")).toBe("P2");
    expect(highestPriority()).toBeNull();
  });
});

describe("jam kerja (WIB)", () => {
  it("Senin 10.00 WIB jam kerja; Minggu & malam tidak", () => {
    expect(isSupportHours(new Date("2026-10-26T03:00:00Z"))).toBe(true); // Senin 10.00 WIB
    expect(isSupportHours(new Date("2026-10-25T03:00:00Z"))).toBe(false); // Minggu
    expect(isSupportHours(new Date("2026-10-26T15:00:00Z"))).toBe(false); // Senin 22.00 WIB
    expect(isSupportHours(new Date("2026-10-26T01:59:00Z"))).toBe(false); // 08.59 WIB
  });
});

describe("teks Telegram", () => {
  it("jawaban panjang dipotong di batas paragraf, tidak ada yang hilang", () => {
    const para = "a".repeat(3000);
    const parts = splitTelegramText(`${para}\n\n${para}\n\n${para}`);
    expect(parts.length).toBe(3);
    expect(parts.every((p) => p.length <= 4096)).toBe(true);
    expect(parts.join("").length).toBe(9000);
    expect(splitTelegramText("pendek")).toEqual(["pendek"]);
  });
  it("judul tiket berupa kalimat biasa (darurat ditandai) & dipotong", () => {
    expect(ticketSubject("TV  unit 3\nmati", "P2")).toBe("TV unit 3 mati");
    expect(ticketSubject("kasir tidak bisa login", "P1")).toBe("Darurat: Kasir tidak bisa login");
    expect(ticketSubject("x".repeat(100), "P1").endsWith("…")).toBe(true);
  });
  it("setiap teks tetap punya 6 bahasa dengan placeholder yang sama", () => {
    for (const [key, entry] of Object.entries(BOT_TEXT)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
      const base = ph(entry.id);
      for (const l of BOT_LANGS) {
        expect(entry[l], `${key}.${l}`).toBeTruthy();
        expect(ph(entry[l]), `${key}.${l}`).toBe(base);
      }
    }
    expect(botText("xx", "appended", { ticket: "ab12" })).toBe("Siap, sudah kami tambahkan ke tiket #ab12. Staf kami membalas di sini ya 🙏");
  });
});

describe("konteks AI", () => {
  it("bergantian user/assistant, diawali user, balasan tim ditandai", () => {
    const msgs = toChatMessages([
      { role: "bot", body: "sapaan lama", createdAt: "1" },
      { role: "user", body: "TV mati", createdAt: "2" },
      { role: "user", body: "unit 3", createdAt: "3" },
      { role: "bot", body: "coba cek steker", createdAt: "4" },
      { role: "team", body: "kami cek", createdAt: "5" },
      { role: "user", body: "makasih", createdAt: "6" },
    ]);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(msgs[0].content).toBe("TV mati\n\nunit 3");
    expect(msgs[1].content).toContain("[Balasan tim NEXBILL] kami cek");
  });
  it("kategori panduan jadi teks bernomor", () => {
    const txt = categoryToText({ id: "x", group: "mulai", label: "Mode Offline", summary: "Ringkas.", steps: ["Buka", "Tekan"], subsections: [{ title: "Sub", steps: ["Satu"] }] });
    expect(txt).toBe("# Mode Offline\nRingkas.\n1. Buka\n2. Tekan\n## Sub\n1. Satu");
  });
});

describe("metrik selesai di bot", () => {
  it("percakapan dipisah jeda 6 jam; tiket/P1 tidak dihitung selesai di bot", () => {
    const rows = [
      { chatId: "a", role: "user" as const, resolution: null, createdAt: "2026-10-01T01:00:00Z" },
      { chatId: "a", role: "bot" as const, resolution: "answered" as const, createdAt: "2026-10-01T01:00:05Z" },
      { chatId: "a", role: "user" as const, resolution: null, createdAt: "2026-10-01T02:00:00Z" },
      { chatId: "a", role: "bot" as const, resolution: "ticket" as const, createdAt: "2026-10-01T02:00:05Z" },
      { chatId: "a", role: "team" as const, resolution: null, createdAt: "2026-10-01T09:30:00Z" },
      { chatId: "a", role: "user" as const, resolution: null, createdAt: "2026-10-01T10:00:00Z" },
      { chatId: "a", role: "bot" as const, resolution: "answered" as const, createdAt: "2026-10-01T10:00:05Z" },
      { chatId: "b", role: "user" as const, resolution: null, createdAt: "2026-10-01T03:00:00Z" },
      { chatId: "b", role: "bot" as const, resolution: "urgent" as const, createdAt: "2026-10-01T03:00:05Z" },
    ];
    expect(conversationStats(rows)).toMatchObject({ conversations: 3, resolvedByBot: 1, tickets: 2, urgent: 1, deflection: 1 / 3 });
    expect(conversationStats([]).deflection).toBeNull();
  });
  it("menghitung jawaban per tingkat & tombol penilaian (tombol tidak membuka percakapan baru)", () => {
    const rows = [
      { chatId: "a", role: "user" as const, resolution: null, createdAt: "2026-10-01T01:00:00Z" },
      { chatId: "a", role: "bot" as const, resolution: "faq", createdAt: "2026-10-01T01:00:01Z" },
      { chatId: "a", role: "user" as const, resolution: "fb_no", createdAt: "2026-10-01T08:00:00Z" },
      { chatId: "a", role: "bot" as const, resolution: "answered", createdAt: "2026-10-01T08:00:05Z" },
      { chatId: "a", role: "user" as const, resolution: "fb_ok", createdAt: "2026-10-01T08:01:00Z" },
    ];
    expect(conversationStats(rows)).toMatchObject({ conversations: 1, resolvedByBot: 1, faqAnswers: 1, aiAnswers: 1, feedbackOk: 1, feedbackNo: 1, feedbackTeam: 0 });
  });
});
