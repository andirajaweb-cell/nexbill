import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";

/**
 * Generic adapter for any smart plug exposing local HTTP endpoints
 * (e.g. Shelly: http://<ip>/relay/0?turn=on / turn=off, or a custom ESP32 firmware).
 * Configure httpOnUrl / httpOffUrl / httpStatusUrl per device in the Devices page.
 */
// Bounded so a device that's powered off/disconnected from the network fails fast (a few
// seconds) instead of the request hanging until the OS's own TCP connect timeout (which can be
// 20-30s) — this is what actually made Start/End Session feel slow, not the rest of the checkout
// logic. See also android-tv-relay.ts and tuya.ts for the same fix on their own fetch calls.
const DEVICE_HTTP_TIMEOUT_MS = 5000;

export const httpGenericAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    if (!device.httpOnUrl) throw new Error(`Device "${device.name}" tidak punya httpOnUrl.`);
    await fetch(device.httpOnUrl, { method: "GET", signal: AbortSignal.timeout(DEVICE_HTTP_TIMEOUT_MS) });
  },

  async turnOff(device: DeviceRecord) {
    if (!device.httpOffUrl) throw new Error(`Device "${device.name}" tidak punya httpOffUrl.`);
    await fetch(device.httpOffUrl, { method: "GET", signal: AbortSignal.timeout(DEVICE_HTTP_TIMEOUT_MS) });
  },

  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    if (!device.httpStatusUrl) return "unknown";
    try {
      const res = await fetch(device.httpStatusUrl, { signal: AbortSignal.timeout(DEVICE_HTTP_TIMEOUT_MS) });
      const text = (await res.text()).toLowerCase();
      if (text.includes("on") || text.includes("true") || text.includes('"ison":true')) return "on";
      if (text.includes("off") || text.includes("false")) return "off";
      return "unknown";
    } catch {
      return "unknown";
    }
  },
};
