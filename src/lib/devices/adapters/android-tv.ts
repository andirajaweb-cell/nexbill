import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";
import { makeTarget, adbWake, adbSleep, adbGetState } from "../adb-shell";

/**
 * Android TV / Google TV control over the local network via ADB (Android
 * Debug Bridge) — used for TVs like the TCL Google TV / Android TV OS units
 * (identified by the Play Store icon on the home screen). Only power
 * on/off is implemented (input keyevent WAKEUP/SLEEP), matching how the
 * Tuya smart-plug devices are used elsewhere in this system.
 *
 * This is the DIRECT variant — it shells out to `adb` on THIS server, so it
 * only works when the server running the app is on the same local network
 * as the TV (i.e. self-hosted at the outlet). If the app is hosted off-site
 * (cloud), use the "android_tv_relay" protocol instead — see
 * adapters/android-tv-relay.ts and scripts/relay-hub.ts / relay-agent.ts.
 *
 * Requirements (one-time, per server + per TV — not something this code can
 * do on its own, Android enforces a manual approval step):
 *  1. Android SDK Platform Tools installed on THIS server (the machine
 *     running `npm run dev` / `npm start`), with `adb` reachable — either on
 *     PATH, or point at it via the device's "Path adb.exe" field.
 *     Download: https://developer.android.com/tools/releases/platform-tools
 *  2. On the TV: Settings > Device Preferences (or System) > About > tap the
 *     build/version row 7x to unlock Developer options > Developer options >
 *     enable "Network debugging". Note the IP address shown there.
 *  3. From THIS server, run once in a terminal: `adb connect <TV_IP>:5555`
 *     — a popup appears ON THE TV asking to allow debugging. Tick "Always
 *     allow from this computer" and confirm. After that this adapter can
 *     reconnect automatically with no further prompts.
 *
 * Device config JSON (set via the Devices page, no code changes needed):
 *   { "ip": "192.168.1.50", "port": 5555, "adbPath": "adb" }
 */

interface AndroidTvConfig {
  ip?: string;
  port?: number;
  adbPath?: string;
}

function parseConfig(device: DeviceRecord): AndroidTvConfig {
  if (!device.config) return {};
  try {
    return JSON.parse(device.config);
  } catch {
    return {};
  }
}

function requireTarget(device: DeviceRecord) {
  const cfg = parseConfig(device);
  if (!cfg.ip) {
    throw new Error(`Device "${device.name}" belum diisi alamat IP TV.`);
  }
  return makeTarget(cfg.ip, cfg.port, cfg.adbPath);
}

export const androidTvAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    await adbWake(requireTarget(device));
  },

  async turnOff(device: DeviceRecord) {
    await adbSleep(requireTarget(device));
  },

  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    try {
      return await adbGetState(requireTarget(device));
    } catch {
      return "unknown";
    }
  },
};
