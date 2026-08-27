import { db } from "@/db/client";
import { referralPartners, referralConversions, referralCommissions, referralPayouts, outlets, subscriptionInvoices } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

const round = (n: number) => Math.round(n);

export type ReferralPartnerRow = typeof referralPartners.$inferSelect;
export type ReferralConversionRow = typeof referralConversions.$inferSelect;
export type ReferralCommissionRow = typeof referralCommissions.$inferSelect;

/** Default recurring commission rate per tier — used only when a partner is first created or upgraded; each partner's own commissionPercent is what actually gets used at accrual time (see schema comment on referralPartners.commissionPercent). */
export const TIER_DEFAULT_PERCENT: Record<ReferralPartnerRow["tier"], number> = {
  customer: 20,
  affiliate: 27,
  master_partner: 35,
};

/** One-time discount granted to a new outlet that signs up through a valid referral code — applied to the first subscription_fee invoice only (see startCheckout in lib/subscription/service.ts). */
export const REFEREE_SIGNUP_DISCOUNT_PERCENT = 20;

/**
 * Referral commission payout cadence: NEXBILL processes payouts once a week, every Monday — not
 * continuously on demand. This does NOT make payouts automatic (see recordReferralPayout below —
 * still a manual action by platform-admin ops, per the original "Saldo/kredit, dicairkan manual
 * oleh tim NEXBILL" decision); it's a cadence rule on top of that manual process, so ops knows
 * when to run it and partners know when to expect their balance to move. getNextPayoutDate() is
 * shown on both the outlet referral dashboard and the platform-admin referrals page so this rule
 * is visible everywhere balances/payouts are shown, not just written down here.
 */
export const PAYOUT_DAY_OF_WEEK = 1; // 0 = Sunday, 1 = Monday, per JS Date#getDay()
export const PAYOUT_CADENCE_LABEL = "Setiap hari Senin (1x per minggu)";

/** Next occurrence of the payout day (today counts if today already IS that day) — returns an ISO date string ("YYYY-MM-DD"). */
export function getNextPayoutDate(from: Date = new Date()): string {
  const d = new Date(from);
  const daysUntil = (PAYOUT_DAY_OF_WEEK - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().slice(0, 10);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids look-alike confusion when shared verbally
function randomCodeSuffix(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

function slugPrefixFromName(name: string) {
  const cleaned = (name || "NEXBILL").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (cleaned || "NEXBILL").slice(0, 5);
}

/** Generates a unique referral code, e.g. "ANDIF3K2Q" — retries on the rare collision. */
async function generateUniqueReferralCode(outletName: string): Promise<string> {
  const prefix = slugPrefixFromName(outletName);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `${prefix}${randomCodeSuffix(attempt < 4 ? 4 : 6)}`;
    const [existing] = await db.select({ id: referralPartners.id }).from(referralPartners).where(eq(referralPartners.code, code)).limit(1);
    if (!existing) return code;
  }
  // Astronomically unlikely fallback — fully random, no name prefix.
  return randomCodeSuffix(10);
}

/**
 * Every outlet gets a referral partner row automatically — no opt-in step (per the "semua
 * outlet otomatis" decision). Lazily created on first read, same pattern as
 * getOrCreateSubscription in lib/subscription/service.ts.
 */
export async function getOrCreateReferralPartner(outletId: string): Promise<ReferralPartnerRow> {
  const [existing] = await db.select().from(referralPartners).where(eq(referralPartners.outletId, outletId)).limit(1);
  if (existing) return existing;

  const [outlet] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const code = await generateUniqueReferralCode(outlet?.name ?? "NEXBILL");
  const [created] = await db
    .insert(referralPartners)
    .values({ outletId, code, tier: "customer", commissionPercent: TIER_DEFAULT_PERCENT.customer })
    .returning();
  return created;
}

/** Looks up an active partner by code — used both at /daftar signup time and for any future public validation endpoint. */
export async function resolveReferralCode(code: string): Promise<ReferralPartnerRow | null> {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return null;
  const [partner] = await db.select().from(referralPartners).where(and(eq(referralPartners.code, clean), eq(referralPartners.isActive, true))).limit(1);
  return partner ?? null;
}

/**
 * Attaches a brand-new outlet to the referral program at signup time (called right after
 * provisionOutlet in /api/onboarding/register). Records the referredBy* columns on the outlet
 * and inserts the referralConversions row. A no-op (returns null) for an invalid/expired code,
 * or if the referrer and referee are literally the same outlet (self-referral guard) — signup
 * still succeeds either way, it just doesn't earn anyone a discount/commission.
 */
export async function attachReferralOnSignup(refereeOutletId: string, rawCode: string | undefined | null) {
  if (!rawCode) return null;
  const partner = await resolveReferralCode(rawCode);
  if (!partner) return null;
  if (partner.outletId === refereeOutletId) return null; // can't refer yourself

  await db
    .update(outlets)
    .set({ referredByCode: partner.code, referredByPartnerId: partner.id })
    .where(eq(outlets.id, refereeOutletId));

  const [conversion] = await db
    .insert(referralConversions)
    .values({ referralPartnerId: partner.id, refereeOutletId, codeUsed: partner.code, status: "trial" })
    .returning();

  await db
    .update(referralPartners)
    .set({ totalReferrals: partner.totalReferrals + 1 })
    .where(eq(referralPartners.id, partner.id));

  return conversion;
}

/**
 * Called from startCheckout (lib/subscription/service.ts) right before creating the outlet's
 * very first subscription_fee invoice. Returns the discounted unit price when this outlet was
 * referred and hasn't already had the discount applied; otherwise returns the original price
 * unchanged. Marks refereeDiscountApplied so it can never be granted twice.
 */
export async function applyRefereeSignupDiscount(outletId: string, originalUnitPrice: number): Promise<number> {
  const [outlet] = await db.select({ referredByPartnerId: outlets.referredByPartnerId }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (!outlet?.referredByPartnerId) return originalUnitPrice;

  const [conversion] = await db.select().from(referralConversions).where(eq(referralConversions.refereeOutletId, outletId)).limit(1);
  if (!conversion || conversion.refereeDiscountApplied) return originalUnitPrice;

  const discounted = round(originalUnitPrice * (1 - REFEREE_SIGNUP_DISCOUNT_PERCENT / 100));
  await db
    .update(referralConversions)
    .set({ refereeDiscountApplied: true, refereeDiscountPercent: REFEREE_SIGNUP_DISCOUNT_PERCENT })
    .where(eq(referralConversions.id, conversion.id));
  return discounted;
}

/**
 * Credits the referring outlet's commission balance for one paid subscription_fee invoice.
 * Called from confirmInvoicePayment (lib/subscription/service.ts) on every subscription_fee
 * invoice transition to "paid" — first checkout AND every renewal, for as long as the referred
 * outlet stays subscribed. Idempotent: a sourceInvoiceId can only ever produce one
 * referralCommissions row (unique constraint + existence check below), so a replayed/duplicate
 * call is a safe no-op. No-ops entirely for an outlet that wasn't referred.
 */
export async function accrueReferralCommission(invoice: typeof subscriptionInvoices.$inferSelect) {
  if (invoice.type !== "subscription_fee") return null;

  const [outlet] = await db.select({ referredByPartnerId: outlets.referredByPartnerId }).from(outlets).where(eq(outlets.id, invoice.outletId)).limit(1);
  if (!outlet?.referredByPartnerId) return null;

  const [alreadyAccrued] = await db.select({ id: referralCommissions.id }).from(referralCommissions).where(eq(referralCommissions.sourceInvoiceId, invoice.id)).limit(1);
  if (alreadyAccrued) return null;

  const [partner] = await db.select().from(referralPartners).where(eq(referralPartners.id, outlet.referredByPartnerId)).limit(1);
  if (!partner || !partner.isActive) return null;

  const [conversion] = await db.select().from(referralConversions).where(eq(referralConversions.refereeOutletId, invoice.outletId)).limit(1);
  if (!conversion) return null;

  const amount = round(invoice.amount * (partner.commissionPercent / 100));
  if (amount <= 0) return null;

  const [commission] = await db
    .insert(referralCommissions)
    .values({
      referralPartnerId: partner.id,
      referralConversionId: conversion.id,
      sourceInvoiceId: invoice.id,
      sourceInvoiceAmount: invoice.amount,
      commissionPercent: partner.commissionPercent,
      amount,
    })
    .returning();

  await db
    .update(referralPartners)
    .set({ totalCommissionEarned: partner.totalCommissionEarned + amount, balanceAvailable: partner.balanceAvailable + amount })
    .where(eq(referralPartners.id, partner.id));

  if (conversion.status !== "active") {
    await db.update(referralConversions).set({ status: "active" }).where(eq(referralConversions.id, conversion.id));
  }

  return commission;
}

/** Platform-admin-only: records a manual payout and debits the partner's available balance. Balance is clamped at 0 rather than allowed to go negative on a fat-fingered overpay. */
export async function recordReferralPayout(partnerId: string, amount: number, opts: { method?: string; note?: string; platformAdminId?: string }) {
  const [partner] = await db.select().from(referralPartners).where(eq(referralPartners.id, partnerId)).limit(1);
  if (!partner) throw new Error("Partner referral tidak ditemukan.");
  const payAmount = round(Math.max(0, amount));
  if (payAmount <= 0) throw new Error("Jumlah payout harus lebih dari 0.");
  if (payAmount > partner.balanceAvailable) throw new Error(`Saldo tersedia hanya Rp${partner.balanceAvailable.toLocaleString("id-ID")}.`);

  const [payout] = await db
    .insert(referralPayouts)
    .values({ referralPartnerId: partnerId, amount: payAmount, method: opts.method, note: opts.note, paidByPlatformAdminId: opts.platformAdminId })
    .returning();

  await db
    .update(referralPartners)
    .set({ balanceAvailable: Math.max(0, partner.balanceAvailable - payAmount) })
    .where(eq(referralPartners.id, partnerId));

  return payout;
}

/** Full summary for an outlet's own /dashboard/referral page: partner info, code/link, list of who they referred, and commission history. */
export async function getReferralDashboard(outletId: string) {
  const partner = await getOrCreateReferralPartner(outletId);
  const conversions = await db.select().from(referralConversions).where(eq(referralConversions.referralPartnerId, partner.id)).orderBy(desc(referralConversions.createdAt));
  const refereeIds = conversions.map((c) => c.refereeOutletId);
  const nameMap = new Map<string, string>();
  if (refereeIds.length > 0) {
    const rows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, refereeIds));
    for (const r of rows) nameMap.set(r.id, r.name);
  }

  const commissions = await db.select().from(referralCommissions).where(eq(referralCommissions.referralPartnerId, partner.id)).orderBy(desc(referralCommissions.createdAt)).limit(50);
  const payouts = await db.select().from(referralPayouts).where(eq(referralPayouts.referralPartnerId, partner.id)).orderBy(desc(referralPayouts.createdAt)).limit(50);

  const [bank] = await db
    .select({ bankCountry: outlets.bankCountry, bankName: outlets.bankName, bankSwiftCode: outlets.bankSwiftCode, bankAccountNumber: outlets.bankAccountNumber, bankAccountHolderName: outlets.bankAccountHolderName })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);
  const bankInfoComplete = !!(bank?.bankName && bank?.bankAccountNumber && bank?.bankAccountHolderName);

  return {
    partner,
    referrals: conversions.map((c) => ({ ...c, refereeOutletName: nameMap.get(c.refereeOutletId) ?? "-" })),
    commissions,
    payouts,
    payoutCadenceLabel: PAYOUT_CADENCE_LABEL,
    nextPayoutDate: getNextPayoutDate(),
    bank: bank ?? null,
    bankInfoComplete,
  };
}
