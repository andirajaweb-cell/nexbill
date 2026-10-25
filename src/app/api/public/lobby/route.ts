import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bookings, outlets, promos, rentalSessions, rentalUnits } from "@/db/schema";
import { describeError } from "@/lib/api/error";
import { resolveOutletDisplayName } from "@/lib/outlets/membership";
import { buildLobbyCards } from "@/lib/lobby/board";
import { getLobbySettings } from "@/lib/lobby/server";

/**
 * PUBLIK — data papan lobi /lobi/[slug]. Outlet dicari HANYA dari slug (sama seperti /book/[slug]).
 * Yang dikirim sengaja minim: status unit dan waktu. Tidak ada nama pelanggan, tagihan, atau ID sesi.
 * Owner bisa mematikan papan ini (Billing Board › Papan lobi) — balasan lalu hanya { enabled:false }.
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Link papan tidak valid." }, { status: 400 });
    const [outlet] = await db.select({ id: outlets.id, logoUrl: outlets.logoUrl, slug: outlets.slug }).from(outlets).where(eq(outlets.slug, slug)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const settings = await getLobbySettings(outlet.id);
    const name = await resolveOutletDisplayName(outlet.id);
    if (!settings.enabled) return NextResponse.json({ enabled: false, outlet: { name, logoUrl: outlet.logoUrl } });

    const units = await db
      .select({ id: rentalUnits.id, name: rentalUnits.name, consoleType: rentalUnits.consoleType, status: rentalUnits.status })
      .from(rentalUnits)
      .where(and(eq(rentalUnits.outletId, outlet.id), eq(rentalUnits.isActive, true)));
    const sessions = await db
      .select({
        rentalUnitId: rentalSessions.rentalUnitId,
        status: rentalSessions.status,
        startedAt: rentalSessions.startedAt,
        pausedAt: rentalSessions.pausedAt,
        accumulatedPauseMs: rentalSessions.accumulatedPauseMs,
        plannedMinutes: rentalSessions.plannedMinutes,
        extendedMinutes: rentalSessions.extendedMinutes,
        promoId: rentalSessions.promoId,
      })
      .from(rentalSessions)
      .where(and(eq(rentalSessions.outletId, outlet.id), inArray(rentalSessions.status, ["running", "paused"])));
    const promoIds = [...new Set(sessions.map((s) => s.promoId).filter((x): x is string => !!x))];
    const promoRows = promoIds.length ? await db.select({ id: promos.id, durationMinutes: promos.durationMinutes }).from(promos).where(inArray(promos.id, promoIds)) : [];
    const promoMinutes = new Map(promoRows.filter((p) => p.durationMinutes != null).map((p) => [p.id, p.durationMinutes as number]));

    const now = new Date();
    const lookahead = now.getTime() + 12 * 3600_000;
    const upcoming = await db
      .select({ rentalUnitId: bookings.rentalUnitId, scheduledStart: bookings.scheduledStart })
      .from(bookings)
      .where(and(eq(bookings.outletId, outlet.id), inArray(bookings.status, ["pending", "confirmed"]), gt(bookings.scheduledStart, now.toISOString())));
    const nextBooking = new Map<string, string>();
    for (const b of upcoming) {
      if (!b.rentalUnitId || Date.parse(b.scheduledStart) > lookahead) continue;
      const cur = nextBooking.get(b.rentalUnitId);
      if (!cur || b.scheduledStart < cur) nextBooking.set(b.rentalUnitId, b.scheduledStart);
    }

    return NextResponse.json(
      {
        enabled: true,
        outlet: { name, logoUrl: outlet.logoUrl, slug: outlet.slug },
        announcement: settings.announcement,
        serverTime: now.toISOString(),
        units: buildLobbyCards(units, sessions, promoMinutes, nextBooking, now.getTime()),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
