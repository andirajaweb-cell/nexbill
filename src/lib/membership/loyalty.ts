import { db } from "@/db/client";
import { customers, membershipTiers, loyaltyTransactions, orders, rentalSessions, rentalUnits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPlayPoints } from "./play-points";

const POINTS_PER_RUPIAH = 1 / 10000; // 1 point per Rp10.000 spent, before tier multiplier

/**
 * After an order is paid: add spending + loyalty points to the customer,
 * and auto-upgrade their membership tier if they've crossed a threshold.
 * No-op if the order has no linked customer (walk-in / anonymous sale).
 *
 * If the order is a rental bill (order.rentalSessionId set), this ALSO awards a fixed
 * "main" bonus on top of the spending points — a flat per-console-type rate (see
 * lib/membership/play-points.ts, e.g. PS4=1, PS3=3, PS5=1.5 poin/sesi) rather than a Rupiah
 * conversion, logged as its own loyaltyTransactions row so it's distinguishable in the
 * customer's history from ordinary spending points. Inherits the same call-site idempotency as
 * the rest of this function (see settleOrderAfterPayment's order.status==="paid" guard in
 * lib/payments/index.ts) — never double-fires on a retried webhook.
 */
export async function applyLoyaltyAndSpending(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || !order.customerId) return;

  const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
  if (!customer) return;

  let multiplier = 1;
  if (customer.membershipTierId) {
    const [tier] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, customer.membershipTierId)).limit(1);
    multiplier = tier?.pointMultiplier ?? 1;
  }

  const spendingPoints = Math.round(order.total * POINTS_PER_RUPIAH * multiplier);

  let playPoints = 0;
  let playNote: string | null = null;
  if (order.rentalSessionId) {
    const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, order.rentalSessionId)).limit(1);
    if (session) {
      const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, session.rentalUnitId)).limit(1);
      if (unit) {
        const rate = await getPlayPoints(order.outletId, unit.consoleType);
        playPoints = rate * multiplier;
        playNote = `Main ${unit.consoleType.toUpperCase()} (${unit.name}) — +${playPoints} poin`;
      }
    }
  }

  const pointsEarned = spendingPoints + playPoints;
  const newTotalSpending = customer.totalSpending + order.total;

  // Find the highest tier the customer now qualifies for.
  const tiers = await db
    .select()
    .from(membershipTiers)
    .where(eq(membershipTiers.outletId, order.outletId))
    .orderBy(desc(membershipTiers.minSpending));
  const qualifiedTier = tiers.find((t) => newTotalSpending >= t.minSpending);

  await db
    .update(customers)
    .set({
      totalSpending: newTotalSpending,
      loyaltyPoints: customer.loyaltyPoints + pointsEarned,
      lastVisitAt: new Date().toISOString(),
      membershipTierId: qualifiedTier?.id ?? customer.membershipTierId,
    })
    .where(eq(customers.id, customer.id));

  if (spendingPoints > 0) {
    await db.insert(loyaltyTransactions).values({
      customerId: customer.id,
      type: "earn",
      points: spendingPoints,
      note: `Belanja order ${order.id.slice(0, 8)}`,
      refOrderId: order.id,
    });
  }
  if (playPoints > 0) {
    await db.insert(loyaltyTransactions).values({
      customerId: customer.id,
      type: "earn",
      points: playPoints,
      note: playNote,
      refOrderId: order.id,
    });
  }
}

/** Redeem loyalty points for a reward/discount — caller is responsible for applying the discount to the order. */
export async function redeemLoyaltyPoints(customerId: string, points: number, note: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) throw new Error("Customer tidak ditemukan.");
  if (customer.loyaltyPoints < points) throw new Error("Poin loyalty tidak cukup.");

  await db.update(customers).set({ loyaltyPoints: customer.loyaltyPoints - points }).where(eq(customers.id, customerId));
  await db.insert(loyaltyTransactions).values({ customerId, type: "redeem", points: -points, note });
}
