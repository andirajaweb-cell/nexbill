import { describe, expect, it } from "vitest";
import { decidePairing, deviceMatches, isDeviceId, STALE_BINDING_MS } from "./device-binding";
import { deviceIdOf, keepAppVersion, withDeviceId } from "./app-marker";

const DEV = "0123456789abcdef0123456789abcdef";
const NOW = Date.parse("2026-10-27T10:00:00Z");
const seen = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("satu TV = satu outlet", () => {
  it("TV yang masih aktif di outlet lain DITOLAK", () => {
    const d = decidePairing({ targetScreenId: "s-b", targetOutletId: "outlet-B", deviceId: DEV, bound: [{ id: "s-a", outletId: "outlet-A", lastSeenAt: seen(60_000) }], now: NOW });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toMatch(/outlet lain/);
  });
  it("ikatan di outlet lain yang tidak terlihat > 30 hari dilepas otomatis", () => {
    const d = decidePairing({ targetScreenId: "s-b", targetOutletId: "outlet-B", deviceId: DEV, bound: [{ id: "s-a", outletId: "outlet-A", lastSeenAt: seen(STALE_BINDING_MS + 1) }], now: NOW });
    expect(d).toEqual({ ok: true, release: ["s-a"] });
  });
  it("pindah unit di outlet yang sama: layar lama dilepas", () => {
    const d = decidePairing({ targetScreenId: "s-2", targetOutletId: "outlet-A", deviceId: DEV, bound: [{ id: "s-1", outletId: "outlet-A", lastSeenAt: seen(1000) }, { id: "s-2", outletId: "outlet-A", lastSeenAt: null }], now: NOW });
    expect(d).toEqual({ ok: true, release: ["s-1"] });
  });
  it("TV versi lama / browser tanpa sidik: tidak diikat", () => {
    expect(decidePairing({ targetScreenId: "s", targetOutletId: "o", deviceId: null, bound: [], now: NOW })).toEqual({ ok: true, release: [] });
  });
  it("token yang dipakai TV lain ditolak; tanpa sidik tetap dilayani", () => {
    expect(deviceMatches(DEV, DEV)).toBe(true);
    expect(deviceMatches(DEV, "ffffffffffffffffffffffffffffffff")).toBe(false);
    expect(deviceMatches(null, DEV)).toBe(true);
    expect(deviceMatches(DEV, null)).toBe(true);
  });
  it("format sidik ketat (hex 32) — tidak bisa menyuntik LIKE", () => {
    expect(isDeviceId(DEV)).toBe(true);
    expect(isDeviceId('%"x')).toBe(false);
    expect(isDeviceId(undefined)).toBe(false);
  });
  it("sidik disimpan di tv_info tanpa menghapus info lain, dan bertahan saat relay menulis ulang", () => {
    const raw = withDeviceId(JSON.stringify({ nexbillApp: "1.2.2" }), DEV)!;
    expect(JSON.parse(raw)).toEqual({ nexbillApp: "1.2.2", deviceId: DEV });
    expect(deviceIdOf(raw)).toBe(DEV);
    expect(withDeviceId(raw, DEV)).toBeNull();
    expect(JSON.parse(withDeviceId(raw, null)!)).toEqual({ nexbillApp: "1.2.2" });
    expect(keepAppVersion({ brand: "TCL" }, raw)).toEqual({ brand: "TCL", nexbillApp: "1.2.2", deviceId: DEV });
  });
});
