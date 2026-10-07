import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import { deriveLocalSecrets } from "./local-control-secrets";
import type { RelayLocalConfigMessage } from "./local-control";

// NexbillAgent (public/downloads/nexbill-agent/android/index.js) is a standalone CommonJS file that
// outlets download as-is; its pure functions are exported for exactly this kind of test.
const require = createRequire(import.meta.url);
const agent = require("../../../public/downloads/nexbill-agent/android/index.js");

describe("NexbillAgent local control", () => {
  it("derives the same key and PIN as the server, so the cashier board and the PIN page work offline", () => {
    for (const token of ["abc", "0f3c9d2e-token", "x".repeat(64)]) expect(agent.deriveLocalSecrets(token)).toEqual(deriveLocalSecrets(token));
  });

  it("re-validates everything the hub sends and drops anything outside the LAN", () => {
    const msg: RelayLocalConfigMessage = {
      type: "local_config",
      outletName: "Outlet A",
      units: [
        { id: "u1", name: "Bilik 1", device: { kind: "android_tv", ip: "192.168.1.50", port: 5555, hdmiPort: 2 } },
        { id: "u2", name: "Bilik 2", device: { kind: "tasmota", ip: "192.168.1.70" } },
        { id: "u3", name: "Evil", device: { kind: "tasmota", ip: "8.8.8.8" } },
        { id: "u4", name: "Bad port", device: { kind: "android_tv", ip: "10.0.0.2", port: 99999, hdmiPort: null } },
      ],
      serverSessions: [{ unitId: "u1", endsAt: "2026-10-07T11:00:00.000Z", paused: false }],
      allowedOrigins: ["https://app.example.id", "javascript:alert(1)"],
      generatedAt: "2026-10-07T10:00:00.000Z",
    };
    const clean = agent.sanitizeLocalConfig(msg);
    expect(clean.units.map((u: { id: string }) => u.id)).toEqual(["u1", "u2"]);
    expect(clean.units[0].device).toEqual({ kind: "android_tv", ip: "192.168.1.50", port: 5555, hdmiPort: 2 });
    expect(clean.sessions).toEqual([{ unitId: "u1", endsAt: Date.parse("2026-10-07T11:00:00.000Z"), paused: false }]);
    expect(clean.allowedOrigins).toEqual(["https://app.example.id"]);
    expect(agent.sanitizeLocalConfig({ type: "local_config" })).toBeNull();
  });

  it("follows the server's sessions but keeps timers of offline sessions the server doesn't know yet", () => {
    const timers = {
      u1: { until: 1000, source: "server" }, // session ended on the server meanwhile
      u2: { until: 5000, source: "local" }, // started in Offline Mode, not synced yet
      u3: { until: 7000, source: "local" }, // synced: the server now owns it
    };
    const merged = agent.mergeServerSessions(timers, [{ unitId: "u3", endsAt: 9000, paused: false }, { unitId: "u4", endsAt: null, paused: true }], ["u1", "u2", "u3", "u4"]);
    expect(merged).toEqual({ u2: { until: 5000, source: "local" }, u3: { until: 9000, source: "server" }, u4: { until: null, source: "server" } });
  });

  it("only enforces server timers while the hub is unreachable", () => {
    const timers = { a: { until: 100, source: "server" }, b: { until: 100, source: "local" }, c: { until: 500, source: "local" }, d: { until: null, source: "local" } };
    expect(agent.dueTimers(timers, 200, true)).toEqual(["b"]);
    expect(agent.dueTimers(timers, 200, false)).toEqual(["a", "b"]);
  });

  it("parses Tasmota replies and validates commands from the browser", () => {
    expect(agent.parseTasmotaPower('{"POWER":"ON"}')).toBe("on");
    expect(agent.parseTasmotaPower('{"POWER1":"OFF"}')).toBe("off");
    expect(agent.parseTasmotaPower("<html>")).toBe("unknown");
    const now = Date.parse("2026-10-07T10:00:00Z");
    // Relative time: the cashier's phone, the server and the agent PC may disagree on the clock.
    expect(agent.parseUnitCommand({ power: "on", remainingMs: 3_600_000 }, now)).toEqual({ power: "on", until: now + 3_600_000 });
    expect(agent.parseUnitCommand({ remainingMs: null }, now)).toEqual({ until: null });
    expect(agent.parseUnitCommand({ power: "toggle" }, now).error).toBeTruthy();
    expect(agent.parseUnitCommand({ power: "on", remainingMs: 3 * 86_400_000 }, now).error).toBeTruthy();
    expect(agent.parseUnitCommand({}, now).error).toBeTruthy();
  });

  it("ships the local page in all six languages with the same keys", () => {
    const keys = Object.keys(agent.LOCAL_PAGE_TEXT.id).sort();
    for (const lang of ["en", "ms", "th", "fil", "vi"]) expect(Object.keys(agent.LOCAL_PAGE_TEXT[lang]).sort()).toEqual(keys);
    const html = agent.localPageHtml("en");
    expect(html).toContain("Local Control");
    expect(html).not.toMatch(/<script[^>]+src=/); // must work without internet: no external scripts
  });
});
