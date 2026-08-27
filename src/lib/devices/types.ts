export type DeviceProtocol =
  | "tasmota_mqtt"
  | "tuya"
  | "sonoff_ewelink"
  | "http_generic"
  | "android_tv_adb"
  | "android_tv_relay";
export type DevicePowerState = "on" | "off" | "unknown";

export interface DeviceRecord {
  id: string;
  outletId: string;
  name: string;
  protocol: DeviceProtocol;
  mqttTopic?: string | null;
  httpOnUrl?: string | null;
  httpOffUrl?: string | null;
  httpStatusUrl?: string | null;
  config?: string | null; // JSON string, provider-specific (tuya deviceId/switchCode, ewelink deviceid, etc.)
}

export interface DeviceAdapter {
  turnOn(device: DeviceRecord): Promise<void>;
  turnOff(device: DeviceRecord): Promise<void>;
  getState(device: DeviceRecord): Promise<DevicePowerState>;
}
