import { db } from "@/db/client";
import { paymentMethods } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { PAYMENT_METHOD_LABEL } from "./labels";

/** Starter catalog — the 8 built-in channels, seeded once per outlet with the same
 * `kind` categorization the app already used in code (see shift/denominations.ts
 * history): "cash" gets the physical count flow, gopay/dana/bukupay/fastpay_h2h
 * are balance_tracked (own app saldo to verify at shift close), the rest are
 * info_only (settle straight to a bank/EDC account, no separate balance check). */
const STARTER_KIND: Record<string, "cash" | "balance_tracked" | "info_only"> = {
  cash: "cash",
  qris: "info_only",
  fastpay_h2h: "info_only",
  dana: "balance_tracked",
  gopay: "balance_tracked",
  bukupay: "balance_tracked",
  transfer: "info_only",
  card: "info_only",
};
const STARTER_ORDER = ["cash", "qris", "fastpay_h2h", "dana", "gopay", "bukupay", "transfer", "card"];

/** Starter merchant-fee % — only QRIS/Fastpay H2H default to a nonzero rate (typical Indonesian
 * QRIS MDR ~0.7%), matching what fastpay.ts's mock mode already simulated before this feature
 * existed. Every other starter channel defaults to 0 (unchanged behavior). This is only a
 * starting point — real negotiated rates vary per merchant/bank/PJSP, so outlets should confirm
 * and adjust theirs on the Pembayaran page. See lib/accounting/payment-fee.ts. */
const STARTER_FEE_PERCENT: Record<string, number> = {
  qris: 0.7,
  fastpay_h2h: 0.7,
};

/** Idempotent — only inserts once per outlet; after that the owner's own add/edit/delete is authoritative. */
export async function ensurePaymentMethods(outletId: string) {
  const existing = await db.select().from(paymentMethods).where(eq(paymentMethods.outletId, outletId));
  if (existing.length > 0) return;
  for (let i = 0; i < STARTER_ORDER.length; i++) {
    const key = STARTER_ORDER[i];
    await db.insert(paymentMethods).values({
      outletId,
      key,
      label: PAYMENT_METHOD_LABEL[key as keyof typeof PAYMENT_METHOD_LABEL] ?? key,
      kind: STARTER_KIND[key] ?? "info_only",
      isActive: true,
      feePercent: STARTER_FEE_PERCENT[key] ?? 0,
      sortOrder: i,
    });
  }
}

/** Active methods for an outlet, in display order — what checkout pickers (POS/Rental/Other Income) should render. */
export async function getActivePaymentMethods(outletId: string) {
  await ensurePaymentMethods(outletId);
  return db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.outletId, outletId))
    .orderBy(asc(paymentMethods.sortOrder));
}

/** Turns a label into a stable, url/db-safe key — lowercase, ascii, underscores. Collision-checked by the caller. */
export function slugifyMethodKey(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "metode"
  );
}
