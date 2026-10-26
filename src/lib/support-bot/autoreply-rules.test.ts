import { describe, expect, it } from "vitest";
import { shouldNotifyOnCall } from "@/lib/telegram/support-rules";
import { botSenderName, escalatedPriorityOf, HUMAN_ACTIVE_MS, isBotSender, needsHuman, pendingEscalation, shouldAutoReply, threadToTurns, type ThreadMsg } from "./autoreply-rules";

const T0 = Date.parse("2026-10-26T10:00:00Z");
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
let n = 0;
const msg = (sender: ThreadMsg["sender"], senderName: string | null, min: number, body = "x"): ThreadMsg => ({ id: `m${n++}`, sender, senderName, body, createdAt: at(min) });

describe("penanda bot tanpa migrasi", () => {
  it("senderName membawa status perlu tim + prioritas", () => {
    expect(botSenderName(null)).toBe("Bot NEXBILL");
    expect(botSenderName("P2")).toBe("Bot NEXBILL · perlu tim P2");
    expect(isBotSender("Bot NEXBILL · perlu tim P1")).toBe(true);
    expect(isBotSender("Andiraja")).toBe(false);
    expect(escalatedPriorityOf("Bot NEXBILL · perlu tim P1")).toBe("P1");
    expect(escalatedPriorityOf("Bot NEXBILL")).toBeNull();
  });
});

describe("kapan bot membalas", () => {
  it("membalas pesan outlet terakhir", () => {
    expect(shouldAutoReply([msg("outlet", "Kasir", 0)], T0)).toEqual({ ok: true });
  });
  it("diam bila pesan terakhir bukan dari outlet, atau dimatikan", () => {
    expect(shouldAutoReply([msg("outlet", "Kasir", 0), msg("platform_admin", "Bot NEXBILL", 1)], T0)).toEqual({ ok: false, reason: "no_outlet_message" });
    expect(shouldAutoReply([msg("outlet", "Kasir", 0)], T0, false)).toEqual({ ok: false, reason: "disabled" });
  });
  it("diam 2 jam setelah manusia membalas, lalu aktif lagi", () => {
    const msgs = [msg("outlet", "Kasir", 0), msg("platform_admin", "Andiraja", 5), msg("outlet", "Kasir", 10)];
    expect(shouldAutoReply(msgs, T0 + 30 * 60_000)).toEqual({ ok: false, reason: "human_active" });
    expect(shouldAutoReply(msgs, T0 + 5 * 60_000 + HUMAN_ACTIVE_MS + 1)).toEqual({ ok: true });
  });
  it("rem: maksimal 8 balasan bot per jam per tiket", () => {
    const msgs: ThreadMsg[] = [];
    for (let i = 0; i < 8; i++) msgs.push(msg("outlet", "Kasir", i * 2), msg("platform_admin", "Bot NEXBILL", i * 2 + 1));
    msgs.push(msg("outlet", "Kasir", 20));
    expect(shouldAutoReply(msgs, T0 + 21 * 60_000)).toEqual({ ok: false, reason: "rate_limited" });
  });
});

describe("perlu saya (admin tunggal)", () => {
  it("pesan outlet belum dijawab → perlu", () => {
    expect(needsHuman([msg("outlet", "Kasir", 0)], "open")).toEqual({ needs: true, priority: null });
  });
  it("dijawab bot tanpa penerusan → tidak perlu", () => {
    expect(needsHuman([msg("outlet", "Kasir", 0), msg("platform_admin", "Bot NEXBILL", 1)], "open").needs).toBe(false);
  });
  it("penerusan bot tetap menunggu walau bot membalas lagi, sampai manusia membalas", () => {
    const msgs = [msg("outlet", "Kasir", 0), msg("platform_admin", "Bot NEXBILL · perlu tim P2", 1), msg("outlet", "Kasir", 2), msg("platform_admin", "Bot NEXBILL", 3)];
    expect(needsHuman(msgs, "open")).toEqual({ needs: true, priority: "P2" });
    expect(pendingEscalation([...msgs, msg("platform_admin", "Andiraja", 4)])).toBeNull();
    expect(needsHuman(msgs, "resolved").needs).toBe(false);
  });
  it("prioritas tertinggi yang dipakai", () => {
    expect(pendingEscalation([msg("platform_admin", "Bot NEXBILL · perlu tim P3", 0), msg("platform_admin", "Bot NEXBILL · perlu tim P1", 1)])).toBe("P1");
  });
});

describe("riwayat untuk AI & notifikasi", () => {
  it("lampiran disebut, peran dipetakan", () => {
    const turns = threadToTurns([
      { ...msg("outlet", "Kasir", 0, ""), attachmentName: "tv.jpg" },
      msg("platform_admin", "Bot NEXBILL", 1, "coba ini"),
      msg("platform_admin", "Andiraja", 2, "kami cek"),
    ]);
    expect(turns.map((t) => [t.role, t.body])).toEqual([
      ["user", "[lampiran: tv.jpg]"],
      ["bot", "coba ini"],
      ["team", "kami cek"],
    ]);
  });
  it("petugas jaga: default P1 & P2, bisa diubah", () => {
    expect(shouldNotifyOnCall("P2", undefined)).toBe(true);
    expect(shouldNotifyOnCall("P3", undefined)).toBe(false);
    expect(shouldNotifyOnCall("P2", "P1")).toBe(false);
    expect(shouldNotifyOnCall("P4", "P4")).toBe(true);
  });
});
