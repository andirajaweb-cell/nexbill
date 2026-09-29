import { describe, expect, it } from "vitest";
import { unitButuhSmartPlug } from "./smart-plug-need";

const devices = [
  { id: "plug-1", protocol: "tuya" },
  { id: "plug-2", protocol: "tasmota_mqtt" },
  { id: "tv-1", protocol: "android_tv_relay" },
];

const unit = (id: string, tvType: string | null, deviceId: string | null, isActive = true) => ({ id, name: id, tvType, deviceId, isActive });

describe("unitButuhSmartPlug", () => {
  it("TV Android tidak pernah butuh smart plug", () => {
    expect(unitButuhSmartPlug([unit("a", "android_tv", null), unit("b", "android_tv", "tv-1")], devices)).toEqual([]);
  });

  it("TV non-Android tanpa perangkat butuh smart plug", () => {
    const hasil = unitButuhSmartPlug([unit("s", "smart_tv", null), unit("g", "analog_tv", null)], devices);
    expect(hasil.map((u) => u.id)).toEqual(["s", "g"]);
  });

  it("TV non-Android yang sudah terhubung smart plug dianggap beres", () => {
    expect(unitButuhSmartPlug([unit("s", "smart_tv", "plug-1"), unit("g", "analog_tv", "plug-2")], devices)).toEqual([]);
  });

  it("TV non-Android yang terhubung ke perangkat Android TV tetap butuh smart plug", () => {
    expect(unitButuhSmartPlug([unit("s", "smart_tv", "tv-1")], devices).map((u) => u.id)).toEqual(["s"]);
  });

  it("perangkat yang sudah dihapus (deviceId menggantung) tetap butuh smart plug", () => {
    expect(unitButuhSmartPlug([unit("s", "smart_tv", "hilang")], devices).map((u) => u.id)).toEqual(["s"]);
  });

  it("unit yang diarsipkan diabaikan", () => {
    expect(unitButuhSmartPlug([unit("s", "smart_tv", null, false)], devices)).toEqual([]);
  });
});
