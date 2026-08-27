import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, outlets, rentalUnits, subscriptions } from "@/db/schema";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getAccessibleOutlets } from "@/lib/outlets/membership";
import { describeError } from "@/lib/api/error";

/**
 * Lightweight cross-outlet summary for the "Ringkasan Semua Outlet" page — one row per outlet
 * this account is linked to (see outletMemberships / lib/outlets/membership.ts), NOT every
 * outlet on the platform (that's the platform-admin directory, a different, NEXBILL-internal
 * view). Kept deliberately thin (today's omzet + unit status counts + subscription status)
 * rather than reusing the full /api/dashboard/owner computation per outlet — that route does
 * a couple dozen queries for ONE outlet's full detail dashboard, which doesn't scale linearly
 * across N outlets in a single page load.
 *
 * includeInactive: true — this page doubles as the branch management hub (add/edit/archive),
 * so archived outlets need to show up here too (dimmed, with a reactivate action), unlike the
 * TopBar/Sidebar switch-outlet dropdown which only ever offers active ones.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const accessible = await getAccessibleOutlets(session.sub, { includeInactive: true });
    if (accessible.length === 0) return NextResponse.json({ outlets: [] });
    const outletIds = accessible.map((o) => o.id);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayStartIso = dayStart.toISOString();

    const [paidOrdersToday, allUnits, allSubs, outletRows] = await Promise.all([
      db
        .select({ outletId: orders.outletId, total: orders.total })
        .from(orders)
        .where(and(inArray(orders.outletId, outletIds), eq(orders.status, "paid"), gte(orders.createdAt, dayStartIso))),
      db.select({ outletId: rentalUnits.outletId, status: rentalUnits.status }).from(rentalUnits).where(inArray(rentalUnits.outletId, outletIds)),
      db.select().from(subscriptions).where(inArray(subscriptions.outletId, outletIds)),
      db.select({ id: outlets.id, logoUrl: outlets.logoUrl }).from(outlets).where(inArray(outlets.id, outletIds)),
    ]);

    const omzetByOutlet = new Map<string, number>();
    for (const o of paidOrdersToday) omzetByOutlet.set(o.outletId, (omzetByOutlet.get(o.outletId) ?? 0) + o.total);

    const unitCountsByOutlet = new Map<string, { total: number; available: number; occupied: number; maintenance: number }>();
    for (const u of allUnits) {
      const cur = unitCountsByOutlet.get(u.outletId) ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
      cur.total++;
      if (u.status === "available") cur.available++;
      else if (u.status === "occupied") cur.occupied++;
      else if (u.status === "maintenance") cur.maintenance++;
      unitCountsByOutlet.set(u.outletId, cur);
    }

    const subByOutlet = new Map(allSubs.map((s) => [s.outletId, s]));
    const logoByOutlet = new Map(outletRows.map((o) => [o.id, o.logoUrl]));

    const result = accessible.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      address: o.address,
      phone: o.phone,
      isActive: o.isActive,
      isHome: o.isHome,
      logoUrl: logoByOutlet.get(o.id) ?? null,
      omzetToday: omzetByOutlet.get(o.id) ?? 0,
      units: unitCountsByOutlet.get(o.id) ?? { total: 0, available: 0, occupied: 0, maintenance: 0 },
      subscriptionStatus: subByOutlet.get(o.id)?.status ?? "trial",
      billingGroupId: subByOutlet.get(o.id)?.billingGroupId ?? null,
    }));

    return NextResponse.json({
      outlets: result,
      totalOmzetToday: result.reduce((s, o) => s + o.omzetToday, 0),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
