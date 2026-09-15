/**
 * Standalone Android TV device heartbeat — polls every 3 minutes and runs one pass of
 * runDeviceHeartbeat() (see src/lib/devices/heartbeat.ts for the full "why"). This codebase has
 * no built-in server-side cron (Next.js runs single-process via `next start`), so this mirrors
 * the existing scripts/booking-scheduler.ts pattern exactly: a small long-running Node process
 * you start alongside the web app.
 *
 * Run with:  npm run device:heartbeat
 *
 * Purely a read/health-check sweep (calls each Android TV device's getState, which incidentally
 * refreshes lastKnownState/lastSeenAt on success — see heartbeat.ts) — never turns anything on or
 * off, never touches rental sessions or billing. Safe to run continuously, and safe to NOT run at
 * all (the Devices page and rental session start/stop keep working exactly as before; you just
 * lose the proactive "last seen"/stale warning and the router idle-timeout keepalive benefit).
 */
import "dotenv/config";
import { runDeviceHeartbeat } from "../src/lib/devices/heartbeat";

const POLL_INTERVAL_MS = 3 * 60_000;

async function tick() {
  try {
    const result = await runDeviceHeartbeat();
    if (result.unreachable.length) {
      console.log(
        `[device-heartbeat] ${result.ranAt} — checked ${result.checked} TV, ${result.unreachable.length} tidak merespon: ` +
          result.unreachable.map((u) => `${u.name} (${u.error})`).join(", ")
      );
    }
  } catch (err) {
    console.error("[device-heartbeat] Gagal menjalankan sweep:", err);
  }
}

console.log(`[device-heartbeat] Berjalan, polling setiap ${POLL_INTERVAL_MS / 1000} detik...`);
tick();
setInterval(tick, POLL_INTERVAL_MS);
