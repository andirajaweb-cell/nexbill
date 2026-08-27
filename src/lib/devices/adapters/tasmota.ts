import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";
import { publishCommand, requestState } from "../mqtt-client";

/**
 * Tasmota devices publish/subscribe under: cmnd/<topic>/POWER and stat/<topic>/POWER
 * `device.mqttTopic` = the Tasmota "Topic" configured on the plug (e.g. "plug_bilik1").
 */
export const tasmotaAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    assertTopic(device);
    await publishCommand(`cmnd/${device.mqttTopic}/POWER`, "ON");
  },

  async turnOff(device: DeviceRecord) {
    assertTopic(device);
    await publishCommand(`cmnd/${device.mqttTopic}/POWER`, "OFF");
  },

  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    assertTopic(device);
    try {
      const result = await requestState(
        `stat/${device.mqttTopic}/POWER`,
        `cmnd/${device.mqttTopic}/POWER`,
        ""
      );
      return result.trim().toUpperCase() === "ON" ? "on" : "off";
    } catch {
      return "unknown";
    }
  },
};

function assertTopic(device: DeviceRecord) {
  if (!device.mqttTopic) {
    throw new Error(`Device "${device.name}" tidak punya mqttTopic. Set di halaman Devices.`);
  }
}
