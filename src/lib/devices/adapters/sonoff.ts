import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";

/**
 * STUB — Sonoff eWeLink cloud control via eWeLink Open API.
 * Requires an eWeLink developer app (App ID/Secret) + OAuth token for the account,
 * and the device's eWeLink `deviceid`. Store in `device.config` as JSON.
 * Implement using eWeLink's REST API (https://coolkit-technologies.github.io/eWeLink-API/).
 */
export const sonoffAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    throw notConfigured(device);
  },
  async turnOff(device: DeviceRecord) {
    throw notConfigured(device);
  },
  async getState(): Promise<DevicePowerState> {
    return "unknown";
  },
};

function notConfigured(device: DeviceRecord) {
  return new Error(
    `eWeLink adapter untuk device "${device.name}" belum dikonfigurasi. Isi App ID/Secret + token di src/lib/devices/adapters/sonoff.ts.`
  );
}
