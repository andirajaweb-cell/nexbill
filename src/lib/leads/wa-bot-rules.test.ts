import { describe, expect, it } from "vitest";
import {
  BOT_STALE_AFTER_MS,
  RESET_UNLINKED_AFTER_FAILURES,
  DEFAULT_DAILY_LIMIT,
  SEND_DELAY_MAX_MS,
  SEND_DELAY_MIN_MS,
  botState,
  inboundActivityText,
  jidFromPhone,
  outboundActivityText,
  parseDailyLimit,
  phoneFromJids,
  phoneVariants,
  sendDelayMs,
  startOfTodayWibIso,
  closeCodeName,
  closeNote,
  reconnectDelayMs,
} from "./wa-bot-rules";

const now = Date.parse("2026-09-29T10:00:00Z");
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

describe("botState", () => {
  it("online hanya bila terhubung dan heartbeat segar", () => {
    expect(botState({ connected: true, qrDataUrl: null, lastHeartbeatAt: iso(10_000) }, now)).toBe("online");
    expect(botState({ connected: true, qrDataUrl: null, lastHeartbeatAt: iso(BOT_STALE_AFTER_MS + 1) }, now)).toBe("offline");
  });
  it("menunggu scan bila ada QR dan heartbeat segar", () => {
    expect(botState({ connected: false, qrDataUrl: "data:x", lastHeartbeatAt: iso(5_000) }, now)).toBe("menunggu_scan");
  });
  it("QR basi tidak ditampilkan sebagai menunggu scan", () => {
    expect(botState({ connected: false, qrDataUrl: "data:x", lastHeartbeatAt: iso(BOT_STALE_AFTER_MS + 1) }, now)).toBe("offline");
  });
  it("bot hidup tanpa QR & belum terhubung = menghubungkan, bukan offline", () => {
    expect(botState({ connected: false, qrDataUrl: null, lastHeartbeatAt: iso(5_000) }, now)).toBe("menghubungkan");
  });
  it("tanpa baris status = belum pernah", () => {
    expect(botState(null, now)).toBe("belum_pernah");
    expect(botState({ connected: true, qrDataUrl: null, lastHeartbeatAt: null }, now)).toBe("offline");
  });
});

describe("jeda & batas", () => {
  it("jeda selalu dalam rentang", () => {
    expect(sendDelayMs(0)).toBe(SEND_DELAY_MIN_MS);
    expect(sendDelayMs(1)).toBe(SEND_DELAY_MAX_MS);
  });
  it("batas harian dari env, default bila kosong/tidak valid", () => {
    expect(parseDailyLimit("40")).toBe(40);
    expect(parseDailyLimit(undefined)).toBe(DEFAULT_DAILY_LIMIT);
    expect(parseDailyLimit("abc")).toBe(DEFAULT_DAILY_LIMIT);
    expect(parseDailyLimit("0")).toBe(DEFAULT_DAILY_LIMIT);
  });
  it("awal hari WIB", () => {
    // 29 Sep 10:00 UTC = 17:00 WIB → awal hari 29 Sep 00:00 WIB = 28 Sep 17:00 UTC
    expect(startOfTodayWibIso(new Date(now))).toBe("2026-09-28T17:00:00.000Z");
    // 29 Sep 18:30 UTC = 30 Sep 01:30 WIB → awal hari 30 Sep WIB = 29 Sep 17:00 UTC
    expect(startOfTodayWibIso(new Date("2026-09-29T18:30:00Z"))).toBe("2026-09-29T17:00:00.000Z");
  });
});

describe("nomor & JID", () => {
  it("mengambil nomor dari JID telepon, melewati @lid", () => {
    expect(phoneFromJids(["123456789012345@lid", "6281234567890@s.whatsapp.net"])).toBe("6281234567890");
    expect(phoneFromJids(["6281234567890:12@s.whatsapp.net"])).toBe("6281234567890");
    expect(phoneFromJids(["123@lid", null, undefined])).toBeNull();
    expect(phoneFromJids(["120363000000@g.us"])).toBeNull();
  });
  it("membentuk JID & variasi nomor", () => {
    expect(jidFromPhone("+62 812-3456")).toBe("628123456@s.whatsapp.net");
    expect(phoneVariants("6281234")).toEqual(["6281234", "081234", "81234"]);
  });
});

describe("teks aktivitas", () => {
  it("balasan masuk dipotong & diberi penanda", () => {
    expect(inboundActivityText("  halo kak  ")).toBe("↩ Balasan WhatsApp: halo kak");
    expect(inboundActivityText("x".repeat(1200)).endsWith("…")).toBe(true);
  });
  it("pesan keluar menyebut template & cuplikan", () => {
    expect(outboundActivityText("Perkenalan", "Halo\nkak")).toBe('Kirim WA via bot — template "Perkenalan": Halo kak');
    expect(outboundActivityText(null, "Hai")).toBe("Kirim WA via bot — pesan bebas: Hai");
  });
});

describe("sambung ulang & QR", () => {
  it("jeda sambung ulang naik bertahap, maks 60 dtk", () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(reconnectDelayMs)).toEqual([3000, 6000, 12000, 24000, 48000, 60000, 60000]);
  });
  it("QR habis tanpa scan hanya bila socket sempat menampilkan QR", () => {
    expect(closeNote({ statusCode: 408, linked: false, hadQr: true, failuresWithoutQr: 0, retryInMs: 3000 })).toMatch(/kedaluwarsa/);
    const gagal = closeNote({ statusCode: 405, linked: false, hadQr: false, failuresWithoutQr: 2, retryInMs: 6000 });
    expect(gagal).toMatch(/^Gagal mendapat QR/);
    expect(gagal).toContain("405");
    expect(gagal).not.toMatch(/dibuang/);
    expect(closeNote({ statusCode: 405, linked: false, hadQr: false, failuresWithoutQr: RESET_UNLINKED_AFTER_FAILURES, retryInMs: 12000 })).toMatch(/dibuang/);
  });
  it("logout & terputus setelah tertaut", () => {
    expect(closeNote({ statusCode: 401, linked: true, hadQr: false, failuresWithoutQr: 0, retryInMs: 3000 })).toMatch(/^Logout/);
    expect(closeNote({ statusCode: 428, linked: true, hadQr: false, failuresWithoutQr: 0, retryInMs: 3000 })).toMatch(/^Terputus \(koneksi ditutup 428\)/);
    expect(closeCodeName(undefined)).toBe("tanpa kode");
  });
});

describe("perintah Minta QR baru", () => {
  it("catatan berawalan CMD: dianggap perintah, bukan catatan biasa", async () => {
    const { isBotCommand, BOT_COMMAND_RESTART } = await import("./wa-bot-rules");
    expect(isBotCommand(BOT_COMMAND_RESTART)).toBe(true);
    expect(isBotCommand("Langkah 3/3: QR siap")).toBe(false);
    expect(isBotCommand(null)).toBe(false);
  });
});
