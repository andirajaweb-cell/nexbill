import { describe, it, expect } from "vitest";
import { describeDevice, isSessionFresh, IDLE_MINUTES, SessionConflictError } from "./single-session";

describe("isSessionFresh — kapan akun dianggap masih dipakai", () => {
  const now = Date.parse("2026-09-27T10:00:00Z");
  it("is fresh within the idle window and stale after it", () => {
    expect(isSessionFresh(new Date(now - 5 * 60_000).toISOString(), now)).toBe(true);
    expect(isSessionFresh(new Date(now - (IDLE_MINUTES + 1) * 60_000).toISOString(), now)).toBe(false);
    expect(isSessionFresh(null, now)).toBe(false);
  });
});

describe("describeDevice", () => {
  it("names common browsers and OSes", () => {
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")).toBe("Chrome · Windows");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 Edg/129.0")).toBe("Edge · Windows");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iOS");
    expect(describeDevice(null)).toBe("Perangkat tidak dikenal");
  });
});

describe("SessionConflictError", () => {
  it("tells the user where the account is active and how to get in", () => {
    const e = new SessionConflictError("Chrome · Windows", new Date(Date.now() - 3 * 60_000).toISOString());
    expect(e.message).toMatch(/Chrome · Windows, aktif 3 menit lalu/);
    expect(e.message).toMatch(/Keluar \(logout\) dulu/);
  });
});
