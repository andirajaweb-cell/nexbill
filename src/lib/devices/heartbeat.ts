import { db } from "@/db/client";
import { devices } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getDeviceState, type DeviceRecord } from "./index";

/**
 * Periodic health-check sweep for Android TV devices (ADB-based control only — see the protocol
 * filter below) — added 2026-09-15 in response to a real support pattern: an Android TV's WiFi
 * radio can go idle/sleep during standby (if the TV's own "Networked Standby"/"Quick Start"
 * setting is off) or a router can silently reap an idle ADB TCP connection, and until this sweep
 * existed nothing noticed until a cashier actually tried to start a rental session on that TV.
 *
 * This calls the exact same getDeviceState() used elsewhere (lib/devices/index.ts) — which
 * already re-runs `adb connect` before every check (see adb-shell.ts's ensureConnected) — so a
 * healthy TV's ADB session gets touched every sweep, which incidentally also keeps it "warm"
 * against router idle-timeout reaping. lastKnownState/lastSeenAt on the devices row is what the
 * Devices page reads to show a "last seen" / stale warning per device.
 *
 * Deliberately scoped to ONLY android_tv_adb/android_tv_relay:
 *  - Tasmota MQTT devices are always subscribed to the broker already (push, not poll) — nothing
 *    for a sweep to usefully check.
 *  - Tuya devices must NOT be swept this often: Tuya's own IoT Core Trial tier caps API calls at
 *    26,000/month platform (or per-outlet since 2026-09-15 — see outlets.tuyaAccessId's doc
 *    comment in schema.ts) — polling every device every few minutes would burn through that
 *    budget fast and risk outages that have nothing to do with the actual rental workload. If
 *    Tuya health-checking is ever wanted, it needs its own much-slower cadence and quota
 *    accounting, not this sweep.
 *  - HTTP Generik/eWeLink are either self-managed by the device owner or not actually functional
 *    yet (see sonoff.ts's doc comment) — not this sweep's job either.
 */
const HEARTBEAT_PROTOCOLS = ["android_tv_adb", "android_tv_relay"] as const;

export interface DeviceHeartbeatResult {
  ranAt: string;
  checked: number;
  unreachable: { deviceId: string; outletId: string; name: string; error: string }[];
}

export async function runDeviceHeartbeat(): Promise<DeviceHeartbeatResult> {
  // devices.protocol's Drizzle column type is narrower than DeviceProtocol (the DB enum list
  // predates android_tv_adb/android_tv_relay being added — see the comment on that column in
  // schema.ts; there's no real SQL CHECK constraint, so this is a type-level-only mismatch, same
  // `as any` cast used for the identical reason in lib/subscription/service.ts's assertDeviceAllowed).
  const rows = await db.select().from(devices).where(inArray(devices.protocol, HEARTBEAT_PROTOCOLS as any));

  const unreachable: DeviceHeartbeatResult["unreachable"] = [];

  // allSettled, not all — one TV timing out (10s cap inside adb-shell.ts) must never stop the rest
  // of the sweep from running, and a single outlet's dead relay agent shouldn't delay every other
  // outlet's TVs behind it.
  //
  // Note: both androidTvAdapter.getState and androidTvRelayAdapter.getState deliberately swallow
  // their own errors and resolve to "unknown" rather than throwing (see adb-shell.ts's
  // adbGetState and android-tv-relay.ts's dispatch catch) — so the try/catch below is just a
  // defensive backstop for a future adapter that might not follow that convention. The real
  // "unreachable" signal is the RETURN VALUE: getDeviceState() only touches lastSeenAt when the
  // state comes back "on"/"off" (see its own guard in index.ts), so an unreachable TV's
  // lastSeenAt simply stops advancing — which is exactly what the Devices page's staleness
  // warning (see page.tsx) keys off of. A single "unknown" here isn't necessarily a real outage
  // (a TV can be legitimately mid-boot for a few seconds) — it's lastSeenAt going stale across
  // several sweeps that actually means something.
  await Promise.allSettled(
    rows.map(async (row) => {
      const device = row as DeviceRecord;
      try {
        const state = await getDeviceState(device);
        if (state === "unknown") {
          unreachable.push({ deviceId: row.id, outletId: row.outletId, name: row.name, error: "Tidak merespon saat heartbeat." });
        }
      } catch (err: unknown) {
        unreachable.push({
          deviceId: row.id,
          outletId: row.outletId,
          name: row.name,
          error: err instanceof Error ? err.message : "Gagal menghubungi perangkat.",
        });
      }
    })
  );

  return { ranAt: new Date().toISOString(), checked: rows.length, unreachable };
}
