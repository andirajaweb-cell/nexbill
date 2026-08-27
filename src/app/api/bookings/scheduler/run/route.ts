import { NextRequest, NextResponse } from "next/server";
import { runBookingScheduler } from "@/lib/rental/scheduler";
import { describeError } from "@/lib/api/error";

/**
 * Runs one pass of the booking scheduler (auto-release, waitlist promotion,
 * reminder queuing) — meant to be hit periodically by scripts/booking-scheduler.ts
 * (see `npm run scheduler`) or an external cron, since this codebase has no
 * built-in job scheduler. No auth gate: this performs no destructive action a
 * human wouldn't also trigger just by the clock ticking, and running it early/
 * twice is harmless (every sub-step is idempotent).
 */
export async function POST(req: NextRequest) {
  try {
    const outletId = req.nextUrl.searchParams.get("outletId") ?? undefined;
    return NextResponse.json(await runBookingScheduler(outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
