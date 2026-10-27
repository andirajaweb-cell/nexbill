import { describe, expect, it } from "vitest";
import { minutesSince, tvConnState } from "./connection-rules";

const NOW = Date.parse("2026-10-27T10:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("status sambungan NEXBILL TV", () => {
  it("online bila terlihat ≤ 30 detik lalu", () => {
    expect(tvConnState(ago(4000), NOW, true)).toBe("online");
    expect(tvConnState(ago(31_000), NOW, true)).toBe("offline");
    expect(tvConnState(null, NOW, true)).toBe("never");
    expect(tvConnState(ago(1000), NOW, false)).toBe("never");
  });
  it("menit sejak terakhir terlihat", () => {
    expect(minutesSince(ago(125_000), NOW)).toBe(2);
    expect(minutesSince(null, NOW)).toBeNull();
  });
});
