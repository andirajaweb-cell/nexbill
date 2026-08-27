import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalUnits, rentalSessions, promos, bookings } from "@/db/schema";
import { eq, and, inArray, gt } from "drizzle-orm";
import { describeError } from "@/lib/api/error";

/**
 * Public, unauthenticated live availability feed for /book — for each active
 * unit: current status, and if occupied, how many minutes remain (when the
 * session has a fixed planned duration) so a visitor can see roughly when to
 * come back, without needing to call/ask staff.
 *
 * Note: `rentalUnits.status` has a "booked" enum value, but nothing in this
 * codebase ever actually sets it (units only ever go available/occupied/
 * maintenance) — so instead of relying on that dead value, "upcoming booking"
 * info is computed independently here from the `bookings` table.
 */
export async function GET(req: NextRequest) {
  try {
    const outletId = req.nextUrl.searchParams.get("outletId");
    if (!outletId) return NextResponse.json({ error: "outletId wajib diisi" }, { status: 400 });

    const units = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
    const activeSessions = await db
      .select()
      .from(rentalSessions)
      .where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"])));
    const sessionByUnitId = new Map(activeSessions.map((s) => [s.rentalUnitId, s]));

    const promoIds = [...new Set(activeSessions.map((s) => s.promoId).filter((id): id is string => !!id))];
    const promoRows = promoIds.length ? await db.select().from(promos).where(inArray(promos.id, promoIds)) : [];
    const promoById = new Map(promoRows.map((p) => [p.id, p]));

    // Nearest upcoming confirmed/pending booking per unit (next 12 hours) — informational only.
    const now = new Date();
    const lookahead = new Date(now.getTime() + 12 * 3600000);
    const upcoming = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.outletId, outletId), inArray(bookings.status, ["pending", "confirmed"]), gt(bookings.scheduledStart, now.toISOString())));
    const upcomingByUnitId = new Map<string, string>();
    for (const b of upcoming) {
      if (!b.rentalUnitId || new Date(b.scheduledStart) > lookahead) continue;
      const existing = upcomingByUnitId.get(b.rentalUnitId);
      if (!existing || b.scheduledStart < existing) upcomingByUnitId.set(b.rentalUnitId, b.scheduledStart);
    }

    const nowMs = now.getTime();
    const result = units.map((u) => {
      if (u.status === "maintenance") {
        return { id: u.id, name: u.name, consoleType: u.consoleType, tvType: u.tvType, hourlyRate: u.hourlyRate, status: "maintenance" as const, remainingMinutes: null, nextBookingAt: null };
      }

      const session = sessionByUnitId.get(u.id);
      if (session) {
        let effectivePauseMs = session.accumulatedPauseMs;
        if (session.status === "paused" && session.pausedAt) effectivePauseMs += nowMs - new Date(session.pausedAt).getTime();
        const elapsedMinutes = Math.max(0, (nowMs - new Date(session.startedAt).getTime() - effectivePauseMs) / 60000);
        const promo = session.promoId ? promoById.get(session.promoId) : null;
        const allowedMinutes = (promo?.durationMinutes ?? session.plannedMinutes ?? null) !== null ? (promo?.durationMinutes ?? session.plannedMinutes ?? 0) + session.extendedMinutes : null;
        const remainingMinutes = allowedMinutes !== null ? Math.max(0, Math.round(allowedMinutes - elapsedMinutes)) : null;
        return {
          id: u.id, name: u.name, consoleType: u.consoleType, tvType: u.tvType, hourlyRate: u.hourlyRate,
          status: "occupied" as const, remainingMinutes, nextBookingAt: null,
        };
      }

      return {
        id: u.id, name: u.name, consoleType: u.consoleType, tvType: u.tvType, hourlyRate: u.hourlyRate,
        status: "available" as const, remainingMinutes: null, nextBookingAt: upcomingByUnitId.get(u.id) ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
