import { DeviceAdapter, DeviceRecord, DevicePowerState } from "./types";
import { tasmotaAdapter } from "./adapters/tasmota";
import { httpGenericAdapter } from "./adapters/http-generic";
import { tuyaAdapter } from "./adapters/tuya";
import { sonoffAdapter } from "./adapters/sonoff";
import { androidTvAdapter } from "./adapters/android-tv";
import { androidTvRelayAdapter } from "./adapters/android-tv-relay";
import { db } from "@/db/client";
import { devices } from "@/db/schema";
import { eq } from "drizzle-orm";

const registry: Record<string, DeviceAdapter> = {
  tasmota_mqtt: tasmotaAdapter,
  http_generic: httpGenericAdapter,
  tuya: tuyaAdapter,
  sonoff_ewelink: sonoffAdapter,
  android_tv_adb: androidTvAdapter,
  android_tv_relay: androidTvRelayAdapter,
};

function adapterFor(device: DeviceRecord): DeviceAdapter {
  const adapter = registry[device.protocol];
  if (!adapter) throw new Error(`Protocol ${device.protocol} tidak dikenal.`);
  return adapter;
}

export async function turnDeviceOn(device: DeviceRecord) {
  await adapterFor(device).turnOn(device);
  await db
    .update(devices)
    .set({ lastKnownState: "on", lastSeenAt: new Date().toISOString() })
    .where(eq(devices.id, device.id));
}

export async function turnDeviceOff(device: DeviceRecord) {
  await adapterFor(device).turnOff(device);
  await db
    .update(devices)
    .set({ lastKnownState: "off", lastSeenAt: new Date().toISOString() })
    .where(eq(devices.id, device.id));
}

export async function getDeviceState(device: DeviceRecord): Promise<DevicePowerState> {
  const state = await adapterFor(device).getState(device);
  if (state !== "unknown") {
    await db
      .update(devices)
      .set({ lastKnownState: state, lastSeenAt: new Date().toISOString() })
      .where(eq(devices.id, device.id));
  }
  return state;
}

/** Convenience: fetch a device row by id and turn it on/off. Used by rental session start/stop. */
export async function setDevicePowerById(deviceId: string, on: boolean) {
  const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
  if (!device) throw new Error(`Device ${deviceId} tidak ditemukan.`);
  if (on) await turnDeviceOn(device as DeviceRecord);
  else await turnDeviceOff(device as DeviceRecord);
}

export type { DeviceRecord, DevicePowerState, DeviceAdapter };
