import { describe, it, expect } from "vitest";
import { sanitizeTvReport, mergeLocalInfoJson, parseStoredTvs, defaultTvDeviceName } from "./tv-discovery";

describe("sanitizeTvReport", () => {
  it("keeps valid LAN TVs, drops public IPs, bad ports and duplicates, trims text", () => {
    const out = sanitizeTvReport([
      { ip: "192.168.1.23", port: 5555, state: "ready", brand: "Xiaomi", model: "M".repeat(100) },
      { ip: "192.168.1.23", port: 5555, state: "found" },
      { ip: "8.8.8.8", port: 5555, state: "ready" },
      { ip: "192.168.1.30", port: 70000, state: "ready" },
      { ip: "192.168.1.31", port: "5555", state: "ready" },
      { ip: "10.0.0.5", port: 37155, state: "weird" },
      null,
    ]);
    expect(out.map((t) => `${t.ip}:${t.port}:${t.state}`)).toEqual(["192.168.1.23:5555:ready", "10.0.0.5:37155:found"]);
    expect(out[0].model).toHaveLength(60);
  });

  it("returns [] for non-arrays", () => {
    expect(sanitizeTvReport({ tvs: [] })).toEqual([]);
    expect(sanitizeTvReport(null)).toEqual([]);
  });
});

describe("local_info JSON merge", () => {
  it("adds tvs without dropping the Local Control addresses, and vice versa", () => {
    const withAddr = JSON.stringify({ addresses: ["192.168.1.5"], port: 8737 });
    const merged = mergeLocalInfoJson(withAddr, { tvs: [{ ip: "192.168.1.23", port: 5555, state: "ready" }], tvsAt: "2026-10-11T00:00:00Z" });
    expect(JSON.parse(merged)).toMatchObject({ addresses: ["192.168.1.5"], port: 8737, tvsAt: "2026-10-11T00:00:00Z" });
    const again = mergeLocalInfoJson(merged, { addresses: ["192.168.1.6"], port: 8737 });
    expect(parseStoredTvs(again).tvs).toHaveLength(1);
    expect(JSON.parse(again).addresses).toEqual(["192.168.1.6"]);
  });

  it("tolerates empty or broken stored JSON", () => {
    expect(JSON.parse(mergeLocalInfoJson("not json", { port: 1 }))).toEqual({ port: 1 });
    expect(parseStoredTvs(null)).toEqual({ tvs: [], reportedAt: null });
  });
});

describe("defaultTvDeviceName", () => {
  it("uses brand + model, falling back to the IP", () => {
    expect(defaultTvDeviceName({ ip: "192.168.1.23", brand: "Xiaomi", model: "MiTV P1" })).toBe("Xiaomi MiTV P1");
    expect(defaultTvDeviceName({ ip: "192.168.1.23" })).toBe("TV 192.168.1.23");
  });
});
