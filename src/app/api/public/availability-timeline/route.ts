import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalUnits, rentalSessions, promos, bookings } from "@/db/schema";
import { eq, and, inArray, lt, gt } from "drizzle-orm";
import { describeError } from "@/lib/api/error";

/**
 * Public, unauthenticated per-unit availability timeline for /book — like a
 * scaled-down read-only Billing Board for customers: for each unit, a list
 * of "busy" blocks (currently-running session + pinned bookings) over the
 * next `hours` hours, so a visitor can see at a glance which hours are free
 * on which unit instead of only the instantaneous status.
 *
 * Floating ("any" console type, no rentalUnitId) bookings aren't plotted on
 * a specific unit's bar — which physical unit they'll land on isn't decided
 * until check-in — but they're still surfaced (grouped by consoleType) so
 * the picture isn't misleadingly rosier than reality.
 */
export async function GET(req: NextRequest) {
  try {
    const outletId = req.nextUrl.searchParams.get("outletId");
    if (!outletId) return NextResponse.json({ error: "outletId wajib diisi" }, { status: 400 });
    const hoursParam = Number(req.nextUrl.searchParams.get("hours") ?? 12);
    const hours = Math.min(24, Math.max(1, Number.isFinite(hoursParam) ? hoursParam : 12));

    const windowStart = new Date();
    const windowEnd = new Date(windowStart.getTime() + hours * 3600000);

    const units = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
    const activeSessions = await db
      .select()
      .from(rentalSessions)
      .where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"])));
    const sessionByUnitId = new Map(activeSessions.map((s) => [s.rentalUnitId, s]));

    const promoIds = [...new Set(activeSessions.map((s) => s.promoId).filter((id): id is string => !!id))];
    const promoRows = promoIds.length ? await db.select().from(promos).where(inArray(promos.id, promoIds)) : [];
    const promoById = new Map(promoRows.map((p) => [p.id, p]));

    // Pinned bookings overlapping the window (floating ones handled separately below).
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.outletId, outletId),
          inArray(bookings.status, ["pending", "confirmed"]),
          lt(bookings.scheduledStart, windowEnd.toISOString()),
          gt(bookings.scheduledEnd, windowStart.toISOString())
        )
      );

    const nowMs = windowStart.getTime();
    const result = units.map((u) => {
      const busyBlocks: { start: string; end: string; kind: "session" | "booking"; label: string; openEnded?: boolean }[] = [];

      if (u.status !== "maintenance") {
        const session = sessionByUnitId.get(u.id);
        if (session) {
          let effectivePauseMs = session.accumulatedPauseMs;
          if (session.status === "paused" && session.pausedAt) effectivePauseMs += nowMs - new Date(session.pausedAt).getTime();
          const elapsedMinutes = Math.max(0, (nowMs - new Date(session.startedAt).getTime() - effectivePauseMs) / 60000);
          const promo = session.promoId ? promoById.get(session.promoId) : null;
          const allowedMinutes = (promo?.durationMinutes ?? session.plannedMinutes ?? null) !== null ? (promo?.durationMinutes ?? session.plannedMinutes ?? 0) + session.extendedMinutes : null;
          if (allowedMinutes !== null) {
            const remainingMinutes = Math.max(0, allowedMinutes - elapsedMinutes);
            const end = new Date(nowMs + remainingMinutes * 60000);
            busyBlocks.push({ start: windowStart.toISOString(), end: (end > windowEnd ? windowEnd : end).toISOString(), kind: "session", label: "Sedang bermain" });
          } else {
            // Open-ended session (no planned duration) — we genuinely don't know when it'll end.
            busyBlocks.push({ start: windowStart.toISOString(), end: windowEnd.toISOString(), kind: "session", label: "Sedang bermain (durasi terbuka)", openEnded: true });
          }
        }
      }

      for (const b of overlappingBookings) {
        if (b.rentalUnitId !== u.id) continue;
        const start = new Date(b.scheduledStart) < windowStart ? windowStart : new Date(b.scheduledStart);
        const end = new Date(b.scheduledEnd) > windowEnd ? windowEnd : new Date(b.scheduledEnd);
        busyBlocks.push({ start: start.toISOString(), end: end.toISOString(), kind: "booking", label: b.status === "confirmed" ? "Sudah dibooking" : "Booking (menunggu konfirmasi)" });
      }

      busyBlocks.sort((a, b) => a.start.localeCompare(b.start));
      return { id: u.id, name: u.name, consoleType: u.consoleType, status: u.status, busyBlocks };
    });

    const floatingBookings = overlappingBookings
      .filter((b) => !b.rentalUnitId && b.consoleType)
      .map((b) => ({ consoleType: b.consoleType as string, scheduledStart: b.scheduledStart, scheduledEnd: b.scheduledEnd, status: b.status }));

    return NextResponse.json({ windowStart: windowStart.toISOString(), windowEnd: windowEnd.toISOString(), units: result, floatingBookings });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
