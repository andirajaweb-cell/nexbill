import { describe, expect, it } from "vitest";
import { appVersionFromUserAgent, appVersionOf, keepAppVersion, withAppVersion } from "./app-marker";

describe("penanda aplikasi NEXBILL TV", () => {
  it("versi dibaca dari User-Agent aplikasi saja", () => {
    expect(appVersionFromUserAgent("NexbillTvApp/1.2.2")).toBe("1.2.2");
    expect(appVersionFromUserAgent("Mozilla/5.0 (Linux; Android 11) Chrome/120")).toBeNull();
    expect(appVersionFromUserAgent(null)).toBeNull();
  });
  it("ditulis sekali per versi, kunci info TV lain dipertahankan", () => {
    const relayInfo = JSON.stringify({ brand: "Xiaomi", model: "P1" });
    const next = withAppVersion(relayInfo, "1.2.2");
    expect(JSON.parse(next!)).toEqual({ brand: "Xiaomi", model: "P1", nexbillApp: "1.2.2" });
    expect(withAppVersion(next, "1.2.2")).toBeNull();
    expect(withAppVersion(next, null)).toBeNull();
    expect(appVersionOf(next)).toBe("1.2.2");
    expect(appVersionOf("bukan json")).toBeNull();
    expect(JSON.parse(withAppVersion("rusak", "1.2.2")!)).toEqual({ nexbillApp: "1.2.2" });
  });
  it("info TV baru dari relay tidak menghapus penanda aplikasi", () => {
    expect(keepAppVersion({ brand: "TCL" }, JSON.stringify({ nexbillApp: "1.2.2" }))).toEqual({ brand: "TCL", nexbillApp: "1.2.2" });
    expect(keepAppVersion({ brand: "TCL" }, null)).toEqual({ brand: "TCL" });
  });
});
