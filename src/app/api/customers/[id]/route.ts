import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { customers, orders, loyaltyTransactions, rentalSessions, rentalUnits, membershipTiers } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    // Legacy rows with a null outletId are visible to any logged-in outlet (see GET /api/customers) —
    // anything with a real outletId must match the caller's own.
    if (!customer || (customer.outletId && customer.outletId !== session.outletId)) {
      return NextResponse.json({ error: "Customer tidak ditemukan" }, { status: 404 });
    }

    const orderHistory = await db.select().from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)).limit(50);
    const rentalHistoryRaw = await db.select().from(rentalSessions).where(eq(rentalSessions.customerId, id)).orderBy(desc(rentalSessions.startedAt)).limit(50);
    const loyaltyHistory = await db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.customerId, id)).orderBy(desc(loyaltyTransactions.createdAt)).limit(50);
    const tier = customer.membershipTierId
      ? (await db.select().from(membershipTiers).where(eq(membershipTiers.id, customer.membershipTierId)).limit(1))[0]
      : null;

    // Attach unit name to each rental session so the customer profile can show
    // "PS5 - Bilik 3" instead of a raw rentalUnitId.
    const unitIds = [...new Set(rentalHistoryRaw.map((r) => r.rentalUnitId))];
    const units = unitIds.length ? await db.select().from(rentalUnits).where(inArray(rentalUnits.id, unitIds)) : [];
    const unitNameById = Object.fromEntries(units.map((u) => [u.id, u.name]));
    const rentalHistory = rentalHistoryRaw.map((r) => ({ ...r, unitName: unitNameById[r.rentalUnitId] ?? null }));

    return NextResponse.json({ customer, tier, orderHistory, rentalHistory, loyaltyHistory });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
