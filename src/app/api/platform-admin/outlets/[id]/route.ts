import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, subscriptions, subscriptionPlans, subscriptionInvoices, staffUsers, rentalUnits, orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/**
 * Single-outlet drill-down for the platform superuser — everything scoped to one outletId,
 * mirroring what an outlet's own dashboard would show, but read via the platform-admin session
 * instead of that outlet's own staff session. This is the one legitimate cross-tenant read path
 * in the whole app; every outlet-facing API route still scopes strictly to session.outletId and
 * can never reach another tenant's rows.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id: outletId } = await params;

    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.outletId, outletId)).limit(1);
    const plan = sub?.planId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1))[0] ?? null : null;

    const staff = await db
      .select({ id: staffUsers.id, name: staffUsers.name, email: staffUsers.email, role: staffUsers.role, isActive: staffUsers.isActive })
      .from(staffUsers)
      .where(eq(staffUsers.outletId, outletId));

    const units = await db.select({ id: rentalUnits.id, name: rentalUnits.name, status: rentalUnits.status }).from(rentalUnits).where(eq(rentalUnits.outletId, outletId));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentPaidOrders = await db
      .select()
      .from(orders)
      .where(sql`${orders.outletId} = ${outletId} AND ${orders.status} = 'paid' AND ${orders.createdAt} >= ${thirtyDaysAgo}`);
    const omzet30d = recentPaidOrders.reduce((s, o) => s + o.total, 0);

    const invoices = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.outletId, outletId));
    const lifetimePaidToNexbill = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const unpaidToNexbill = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0);

    return NextResponse.json({
      outlet,
      subscription: sub ?? null,
      plan,
      staff,
      units,
      unitStatusCounts: {
        available: units.filter((u) => u.status === "available").length,
        occupied: units.filter((u) => u.status === "occupied").length,
        booked: units.filter((u) => u.status === "booked").length,
        maintenance: units.filter((u) => u.status === "maintenance").length,
      },
      omzet30d,
      transactionsCount30d: recentPaidOrders.length,
      lifetimePaidToNexbill,
      unpaidToNexbill,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Platform-admin edit + archive/restore for any outlet — the customer-service counterpart to
 * the tenant's own PATCH /api/outlets/[id] (src/app/api/outlets/[id]/route.ts). No
 * canManageOutlet/home-outlet guard here since a platform admin isn't a staffUsers row scoped to
 * any single outlet in the first place — requirePlatformAdmin() is the only gate, by design
 * (this route can reach ANY tenant's outlet, which is exactly the point of a support tool).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requirePlatformAdmin();

    const body = await req.json();
    const values: Record<string, unknown> = {};
    if ("name" in body) {
      if (!body.name || !String(body.name).trim()) return NextResponse.json({ error: "Nama outlet wajib diisi." }, { status: 400 });
      values.name = String(body.name).trim();
    }
    if ("address" in body) values.address = body.address || null;
    if ("phone" in body) values.phone = body.phone || null;
    if ("isActive" in body) values.isActive = Boolean(body.isActive);
    if (Object.keys(values).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    values.updatedAt = new Date().toISOString();

    const [updated] = await db.update(outlets).set(values).where(eq(outlets.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
