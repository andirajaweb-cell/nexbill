import { NextResponse } from "next/server";
import { runDeviceHeartbeat } from "@/lib/devices/heartbeat";
import { describeError } from "@/lib/api/error";

/**
 * Runs one pass of the Android TV device heartbeat (see lib/devices/heartbeat.ts) — meant to be
 * hit periodically by scripts/device-heartbeat.ts (`npm run device:heartbeat`) or an external
 * cron, mirroring the exact same pattern as /api/bookings/scheduler/run. No auth gate: this
 * performs no destructive action a human wouldn't also trigger just by opening the Devices page
 * (it only reads device power state), and running it early/twice/concurrently is harmless — every
 * check is independent and idempotent.
 */
export async function POST() {
  try {
    return NextResponse.json(await runDeviceHeartbeat());
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
