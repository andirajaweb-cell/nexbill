import { db } from "@/db/client";
import { loyaltyRewards, loyaltyRedemptions, vouchers, customers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { redeemLoyaltyPoints } from "./loyalty";

function generateRedemptionCode(): string {
  const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `RDM-${digits}`;
}

/**
 * Redeem a customer's points for a catalog reward:
 *  - Deducts points via the existing redeemLoyaltyPoints (throws if the customer doesn't have
 *    enough — no partial redemptions).
 *  - For type "play_discount", also mints a real, customer-scoped `vouchers` row (single use,
 *    isActive) — this is what actually makes the discount apply automatically the next time
 *    staff types the redemption code into a Rental or POS checkout (see validateVoucher's
 *    customerId scoping in lib/pos/vouchers.ts). Nothing extra to wire per-checkout-screen.
 *  - For type "partner_brand" there's nothing to auto-apply (the reward is redeemed outside the
 *    app, e.g. a partner brand's own store) — the code is just proof-of-redemption staff can
 *    read off the customer's Membership CRM page.
 *
 * `expectedOutletId` (always the caller's session.outletId) is required and validated against
 * both the reward and the customer — without this a redemption could be issued for one outlet's
 * reward against another outlet's customer.
 */
export async function redeemReward(customerId: string, rewardId: string, staffUserId: string | null | undefined, expectedOutletId: string) {
  const [reward] = await db.select().from(loyaltyRewards).where(eq(loyaltyRewards.id, rewardId)).limit(1);
  if (!reward) throw new Error("Reward tidak ditemukan.");
  if (!reward.isActive) throw new Error("Reward ini sudah tidak aktif.");
  if (reward.outletId !== expectedOutletId) throw new Error("Reward tidak ditemukan.");

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) throw new Error("Customer tidak ditemukan.");
  if (customer.outletId !== expectedOutletId) throw new Error("Customer tidak ditemukan.");

  // Deducts points (throws "Poin loyalty tidak cukup." if short) and logs the redeem transaction.
  await redeemLoyaltyPoints(customerId, reward.pointsCost, `Redeem reward: ${reward.name}`);

  const code = generateRedemptionCode();
  let voucherId: string | null = null;

  if (reward.type === "play_discount") {
    const [voucher] = await db
      .insert(vouchers)
      .values({
        outletId: reward.outletId,
        code,
        type: reward.discountType ?? "percent",
        value: reward.discountValue ?? 0,
        usageLimit: 1,
        usedCount: 0,
        isActive: true,
        customerId,
      })
      .returning();
    voucherId = voucher.id;
  }

  const [redemption] = await db
    .insert(loyaltyRedemptions)
    .values({
      outletId: reward.outletId,
      customerId,
      rewardId,
      pointsSpent: reward.pointsCost,
      code,
      voucherId,
      status: "issued",
      staffUserId: staffUserId ?? null,
    })
    .returning();

  return { redemption, reward };
}

export async function listRedemptionsForCustomer(customerId: string, outletId: string) {
  return db
    .select()
    .from(loyaltyRedemptions)
    .where(and(eq(loyaltyRedemptions.customerId, customerId), eq(loyaltyRedemptions.outletId, outletId)))
    .orderBy(desc(loyaltyRedemptions.createdAt));
}

/** Staff manually marks a partner_brand redemption as picked up/used — play_discount redemptions self-mark as used the moment their backing voucher is consumed at checkout, so this is really only needed for the partner_brand kind. */
export async function markRedemptionUsed(redemptionId: string) {
  const [row] = await db
    .update(loyaltyRedemptions)
    .set({ status: "used", usedAt: new Date().toISOString() })
    .where(eq(loyaltyRedemptions.id, redemptionId))
    .returning();
  if (!row) throw new Error("Redemption tidak ditemukan.");
  return row;
}
