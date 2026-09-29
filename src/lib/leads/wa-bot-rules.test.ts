import { describe, expect, it } from "vitest";
import {
  BOT_STALE_AFTER_MS,
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
