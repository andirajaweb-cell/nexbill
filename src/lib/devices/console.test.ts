import { describe, expect, it } from "vitest";
import {
  deviceConsoleTabFromSlug,
  deviceHealth,
  deviceKind,
  elapsedParts,
  filterDevices,
  isTvStale,
  sortDevicesForConsole,
  summarizeDeviceConsole,
  visibleDeviceConsoleTabs,
  type ConsoleDevice,
} from "./console";

const NOW = Date.parse("2026-11-12T10:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

const dev = (over: Partial<ConsoleDevice>): ConsoleDevice => ({ id: "d", name: "Plug", protocol: "tasmota_mqtt", lastKnownState: "off", lastSeenAt: null, ...over });

describe("sub-halaman", () => {
  it("membaca ?tab= termasuk alias Indonesia", () => {
    expect(deviceConsoleTabFromSlug("units")).toBe("units");
    expect(deviceConsoleTabFromSlug(" Koneksi ")).toBe("connection");
    expect(deviceConsoleTabFromSlug("apa-saja")).toBeNull();
    expect(deviceConsoleTabFromSlug(null)).toBeNull();
  });

  it("Tambah Perangkat hanya untuk pengelola", () => {
    expect(visibleDeviceConsoleTabs(true)).toContain("add");
    expect(visibleDeviceConsoleTabs(false)).not.toContain("add");
    expect(visibleDeviceConsoleTabs(false)).toEqual(["panel", "units", "connection", "guide"]);
  });
});

describe("jenis & kesehatan perangkat", () => {
  it("TV = protokol android_tv_*, sisanya smart plug", () => {
    expect(deviceKind("android_tv_relay")).toBe("tv");
    expect(deviceKind("android_tv_adb")).toBe("tv");
    expect(deviceKind("tuya")).toBe("plug");
    expect(deviceKind("tasmota_mqtt")).toBe("plug");
  });

  it("TV basi setelah 6 menit tanpa respons, atau belum pernah terlihat", () => {
    expect(isTvStale(ago(5), NOW)).toBe(false);
    expect(isTvStale(ago(7), NOW)).toBe(true);
    expect(isTvStale(null, NOW)).toBe(true);
    expect(isTvStale("bukan tanggal", NOW)).toBe(true);
  });

  it("TV yang tidak merespons = perlu perhatian walau status terakhir 'on'", () => {
    expect(deviceHealth(dev({ protocol: "android_tv_relay", lastKnownState: "on", lastSeenAt: ago(30) }), NOW)).toBe("attention");
    expect(deviceHealth(dev({ protocol: "android_tv_relay", lastKnownState: "on", lastSeenAt: ago(1) }), NOW)).toBe("on");
  });

  it("smart plug tidak punya heartbeat — mengikuti status terakhir", () => {
    expect(deviceHealth(dev({ lastKnownState: "on" }), NOW)).toBe("on");
    expect(deviceHealth(dev({ lastKnownState: "off" }), NOW)).toBe("off");
    expect(deviceHealth(dev({ lastKnownState: "unknown" }), NOW)).toBe("unknown");
  });
});

describe("ringkasan", () => {
  const devices = [
    dev({ id: "a", name: "Plug 1", lastKnownState: "on" }),
    dev({ id: "b", name: "Plug 2", lastKnownState: "off" }),
    dev({ id: "c", name: "TV 1", protocol: "android_tv_relay", lastKnownState: "on", lastSeenAt: ago(2) }),
    dev({ id: "e", name: "TV 2", protocol: "android_tv_relay", lastKnownState: "off", lastSeenAt: ago(60) }),
    dev({ id: "f", name: "Plug 3", lastKnownState: "unknown" }),
  ];

  it("menghitung per jenis & per kesehatan — jumlahnya selalu sama dengan total", () => {
    const s = summarizeDeviceConsole(devices, [], [], NOW);
    expect(s).toMatchObject({ total: 5, tv: 2, plug: 3, on: 2, off: 1, attention: 1, unknown: 1 });
    expect(s.on + s.off + s.attention + s.unknown).toBe(s.total);
  });

  it("unit nonaktif tidak dihitung; perangkat yang sudah dihapus tidak dianggap terhubung", () => {
    const units = [
      { deviceId: "a", isActive: true },
      { deviceId: "sudah-dihapus", isActive: true },
      { deviceId: null },
      { deviceId: "b", isActive: false },
    ];
    const s = summarizeDeviceConsole(devices, units, [{ status: "online" }, { status: "offline" }], NOW);
    expect(s.unitsTotal).toBe(3);
    expect(s.unitsLinked).toBe(1);
    expect(s.agentsTotal).toBe(2);
    expect(s.agentsOnline).toBe(1);
  });
});

describe("filter & urutan", () => {
  const devices = [
    dev({ id: "a", name: "Plug Bilik 10", lastKnownState: "off" }),
    dev({ id: "b", name: "Plug Bilik 2", lastKnownState: "on" }),
    dev({ id: "c", name: "TV VIP", protocol: "android_tv_relay", lastKnownState: "on", lastSeenAt: ago(90) }),
  ];

  it("menyaring per jenis, status, dan kata kunci (termasuk teks tambahan)", () => {
    expect(filterDevices(devices, { kind: "tv" }, undefined, NOW).map((d) => d.id)).toEqual(["c"]);
    expect(filterDevices(devices, { state: "on" }, undefined, NOW).map((d) => d.id)).toEqual(["b"]);
    expect(filterDevices(devices, { state: "attention" }, undefined, NOW).map((d) => d.id)).toEqual(["c"]);
    expect(filterDevices(devices, { q: "bilik 2" }, undefined, NOW).map((d) => d.id)).toEqual(["b"]);
    expect(filterDevices(devices, { q: "192.168.1.9" }, (d) => (d.id === "a" ? "192.168.1.9" : ""), NOW).map((d) => d.id)).toEqual(["a"]);
    expect(filterDevices(devices, {}, undefined, NOW)).toHaveLength(3);
  });

  it("perlu perhatian di depan, lalu menyala, lalu mati; nama diurutkan alami", () => {
    expect(sortDevicesForConsole(devices, NOW).map((d) => d.id)).toEqual(["c", "b", "a"]);
    const names = sortDevicesForConsole([dev({ id: "1", name: "Plug 10" }), dev({ id: "2", name: "Plug 2" })], NOW).map((d) => d.name);
    expect(names).toEqual(["Plug 2", "Plug 10"]);
  });
});

describe("elapsedParts", () => {
  it("meringkas selisih waktu", () => {
    expect(elapsedParts(ago(0), NOW)).toEqual({ value: 0, unit: "now" });
    expect(elapsedParts(ago(12), NOW)).toEqual({ value: 12, unit: "minute" });
    expect(elapsedParts(ago(150), NOW)).toEqual({ value: 2, unit: "hour" });
    expect(elapsedParts(ago(60 * 24 * 3 + 5), NOW)).toEqual({ value: 3, unit: "day" });
    expect(elapsedParts(null, NOW)).toBeNull();
  });
});
