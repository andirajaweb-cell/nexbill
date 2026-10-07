import { describe, it, expect } from "vitest";
import { agentBaseUrls, buildLocalUnits, parseLocalInfo, parseTasmotaLocalIp, sessionEndsAtMs, withTasmotaLocalIp } from "./local-control";
import { deriveLocalSecrets } from "./local-control-secrets";

const tv = (agent: string, ip = "192.168.1.50") => JSON.stringify({ relayAgentId: agent, ip, port: 5555 });

describe("buildLocalUnits", () => {
  const units = [
    { id: "u1", name: "Bilik 1", deviceId: "d-tv" },
    { id: "u2", name: "Bilik 2", deviceId: "d-plug" },
    { id: "u3", name: "Bilik 3", deviceId: "d-plug-noip" },
    { id: "u4", name: "Bilik 4", deviceId: "d-tuya" },
    { id: "u5", name: "Bilik 5", deviceId: null },
    { id: "u6", name: "Bilik 6", deviceId: "d-tv-other" },
    { id: "u7", name: "Bilik 7", deviceId: "d-tv", isActive: false },
  ];
  const devices = [
    { id: "d-tv", protocol: "android_tv_relay", config: tv("agent-1") },
    { id: "d-tv-other", protocol: "android_tv_relay", config: tv("agent-2", "192.168.1.60") },
    { id: "d-plug", protocol: "tasmota_mqtt", config: JSON.stringify({ localIp: "192.168.1.70" }) },
    { id: "d-plug-noip", protocol: "tasmota_mqtt", config: null },
    { id: "d-tuya", protocol: "tuya", config: JSON.stringify({ deviceId: "x" }) },
  ];

  it("covers this agent's Android TVs and every Tasmota plug with a LAN IP", () => {
    const { covered, uncovered } = buildLocalUnits({ units, devices, screens: [{ rentalUnitId: "u1", hdmiPort: 2 }], agentId: "agent-1" });
    expect(covered).toEqual([
      { id: "u1", name: "Bilik 1", device: { kind: "android_tv", ip: "192.168.1.50", port: 5555, hdmiPort: 2 } },
      { id: "u2", name: "Bilik 2", device: { kind: "tasmota", ip: "192.168.1.70" } },
    ]);
    expect(Object.fromEntries(uncovered.map((u) => [u.id, u.reason]))).toEqual({ u3: "no_local_ip", u4: "cloud_only", u5: "no_device", u6: "other_agent" });
  });

  it("never hands the agent an address outside the local network", () => {
    const { covered, uncovered } = buildLocalUnits({
      units: [{ id: "u1", name: "A", deviceId: "d1" }, { id: "u2", name: "B", deviceId: "d2" }],
      devices: [
        { id: "d1", protocol: "android_tv_relay", config: tv("a", "8.8.8.8") },
        { id: "d2", protocol: "tasmota_mqtt", config: JSON.stringify({ localIp: "example.com" }) },
      ],
      screens: [],
      agentId: "a",
    });
    expect(covered).toEqual([]);
    expect(uncovered.map((u) => u.reason)).toEqual(["no_local_ip", "no_local_ip"]);
  });
});

describe("Tasmota local IP in devices.config", () => {
  it("adds, reads and removes localIp without touching other keys", () => {
    const cfg = withTasmotaLocalIp(JSON.stringify({ note: "x" }), "10.0.0.7");
    expect(parseTasmotaLocalIp(cfg)).toBe("10.0.0.7");
    expect(JSON.parse(cfg!)).toEqual({ note: "x", localIp: "10.0.0.7" });
    expect(withTasmotaLocalIp(withTasmotaLocalIp(null, "10.0.0.7"), null)).toBeNull();
    expect(parseTasmotaLocalIp("not json")).toBeNull();
  });
});

describe("sessionEndsAtMs", () => {
  const base = { startedAt: "2026-10-07T10:00:00.000Z", status: "running", accumulatedPauseMs: 5 * 60_000, plannedMinutes: 60, extendedMinutes: 30 };
  it("adds planned + extended minutes and the time spent paused", () => {
    expect(new Date(sessionEndsAtMs(base)!).toISOString()).toBe("2026-10-07T11:35:00.000Z");
  });
  it("has no end for open play or a paused session", () => {
    expect(sessionEndsAtMs({ ...base, plannedMinutes: null })).toBeNull();
    expect(sessionEndsAtMs({ ...base, status: "paused" })).toBeNull();
  });
});

describe("agent addresses", () => {
  it("tries this device first, then the agent's LAN addresses, dropping anything public", () => {
    const info = parseLocalInfo(JSON.stringify({ addresses: ["192.168.1.5", "1.2.3.4", 7], port: 8737 }));
    expect(agentBaseUrls(info)).toEqual(["http://127.0.0.1:8737", "http://192.168.1.5:8737"]);
    expect(agentBaseUrls(null)).toEqual(["http://127.0.0.1:8737"]);
  });
});

describe("deriveLocalSecrets", () => {
  it("is stable per token and differs between tokens", () => {
    const a = deriveLocalSecrets("token-a");
    expect(a).toEqual(deriveLocalSecrets("token-a"));
    expect(a.key).toMatch(/^[0-9a-f]{40}$/);
    expect(a.pin).toMatch(/^\d{6}$/);
    expect(deriveLocalSecrets("token-b").key).not.toBe(a.key);
  });
});
