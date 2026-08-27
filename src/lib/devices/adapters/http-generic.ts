import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";

/**
 * Generic adapter for any smart plug exposing local HTTP endpoints
 * (e.g. Shelly: http://<ip>/relay/0?turn=on / turn=off, or a custom ESP32 firmware).
 * Configure httpOnUrl / httpOffUrl / httpStatusUrl per device in the Devices page.
 */
export const httpGenericAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    if (!device.httpOnUrl) throw new Error(`Device "${device.name}" tidak punya httpOnUrl.`);
    await fetch(device.httpOnUrl, { method: "GET" });
  },

  async turnOff(device: DeviceRecord) {
    if (!device.httpOffUrl) throw new Error(`Device "${device.name}" tidak punya httpOffUrl.`);
    await fetch(device.httpOffUrl, { method: "GET" });
  },

  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    if (!device.httpStatusUrl) return "unknown";
    try {
      const res = await fetch(device.httpStatusUrl);
      const text = (await res.text()).toLowerCase();
      if (text.includes("on") || text.includes("true") || text.includes('"ison":true')) return "on";
      if (text.includes("off") || text.includes("false")) return "off";
      return "unknown";
    } catch {
      return "unknown";
    }
  },
};
