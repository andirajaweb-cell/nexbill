import { db } from "@/db/client";
import { paymentMethods } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { JournalLineInput } from "./journal";

/**
 * Merchant discount rate (MDR) handling — one place every money-IN posting path in the app reads
 * an outlet's configured per-channel fee percent (see paymentMethods.feePercent) and turns it into
 * a deducted fee amount + the matching journal line. Originally built for QRIS (which really does
 * cost the merchant ~0.7% per transaction in Indonesia) but deliberately generic: any channel with
 * a configured feePercent > 0 gets the same treatment, cash/other channels stay untouched at 0.
 *
 * The accounting pattern used everywhere this is called: revenue is still recognized at the full
 * GROSS amount (Cr Revenue), the cash/bank account actually only receives the NET amount
 * (Dr Kas/Bank = gross - fee), and the difference is booked as a real expense
 * (Dr 6540 Biaya Payment Gateway = fee) — so the P&L shows the true cost of accepting that
 * channel instead of silently overstating cash on hand.
 *
 * Adopted by (as of this feature):
 *  - POS/Rental orders (payments.feeAmount, set at payment-creation time by the gateway adapters
 *    — see payments/adapters/manual.ts and fastpay.ts's mock path — then consumed unchanged by
 *    the existing lib/accounting/postings.ts postSalesJournal/postReceivableSettlement).
 *  - Other Income (lib/accounting/other-income.ts createOtherIncome).
 *  - Membership Payment (lib/membership/membership-fee.ts sellMembership).
 *  - Home Rental checkout/deposit/return/damage-fee (lib/home-rental/rentals.ts).
 */

const FEE_EXPENSE_ACCOUNT_CODE = "6540"; // "Biaya payment gateway" — already seeded in coa.ts, already used by postings.ts

const feePercentCache = new Map<string, Map<string, number>>(); // outletId -> methodKey -> feePercent

export function invalidatePaymentFeeCache(outletId: string) {
  feePercentCache.delete(outletId);
}

/** Reads paymentMethods.feePercent for (outletId, method) — 0 if the channel has no row or no fee configured. */
export async function getPaymentFeePercent(outletId: string, method: string): Promise<number> {
  const key = method.toLowerCase();
  let cache = feePercentCache.get(outletId);
  if (!cache) {
    cache = new Map();
    feePercentCache.set(outletId, cache);
  }
  if (cache.has(key)) return cache.get(key)!;

  const [row] = await db
    .select({ feePercent: paymentMethods.feePercent })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.outletId, outletId), eq(paymentMethods.key, key)))
    .limit(1);
  const pct = row?.feePercent ?? 0;
  cache.set(key, pct);
  return pct;
}

/** Computes the fee amount for one transaction — rounded to the nearest rupiah, never negative. */
export async function resolvePaymentFee(outletId: string, method: string, grossAmount: number): Promise<number> {
  if (!(grossAmount > 0)) return 0;
  const pct = await getPaymentFeePercent(outletId, method);
  if (!(pct > 0)) return 0;
  return Math.round(grossAmount * (pct / 100));
}

/** The journal line to add alongside a reduced Kas/Bank debit — empty array when feeAmount is 0, so callers can always spread this in without an `if`. */
export function feeExpenseLine(feeAmount: number, method: string): JournalLineInput[] {
  if (!(feeAmount > 0)) return [];
  return [{ accountCode: FEE_EXPENSE_ACCOUNT_CODE, debit: feeAmount, credit: 0, description: `Biaya payment gateway (${method})` }];
}
