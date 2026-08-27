import { PaymentGateway, PaymentMethod, PaymentRequest } from "./types";
import { cashGateway } from "./adapters/cash";
import { fastpayGateway } from "./adapters/fastpay";
import { danaGateway, gopayGateway } from "./adapters/ewallet-via-fastpay";
import { bukupayGateway } from "./adapters/bukupay";
import { ipaymuCrossBorderGateway } from "./adapters/ipaymu-crossborder";
import { manualGateway } from "./adapters/manual";
import { db } from "@/db/client";
import { payments, orders, receivables } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { postSalesJournal, postReceivableSettlement } from "@/lib/accounting/postings";
import { applyLoyaltyAndSpending } from "@/lib/membership/loyalty";

const registry: Record<PaymentMethod, PaymentGateway> = {
  cash: cashGateway,
  qris: fastpayGateway, // plain QRIS also goes through Fastpay H2H
  fastpay_h2h: fastpayGateway,
  dana: danaGateway,
  gopay: gopayGateway,
  bukupay: bukupayGateway,
  transfer: manualGateway("transfer", "TRF"),
  card: manualGateway("card", "CARD"),
  // Cross-border NEXBILL Standard subscription checkout (see /platform-admin/market-risk +
  // lib/subscription/service.ts) — NOT used anywhere in the outlet-facing POS flow above.
  ipaymu_crossborder: ipaymuCrossBorderGateway,
};

export interface OrderPaymentSummary {
  order: typeof orders.$inferSelect;
  payments: (typeof payments.$inferSelect)[];
  paidTotal: number;
  remaining: number;
  fullyPaid: boolean;
}

/** Sum of successful payments against an order vs. its total — the basis for split/partial payment and the "partial" order status. */
export async function getOrderPaymentSummary(orderId: string): Promise<OrderPaymentSummary | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const allPayments = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const paidTotal = allPayments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, Math.round((order.total - paidTotal) * 100) / 100);

  return { order, payments: allPayments, paidTotal, remaining, fullyPaid: remaining <= 0.5 };
}

/**
 * Any of the 8 built-in methods resolves to its real gateway adapter above. A
 * custom method an owner added via the Pembayaran page (not in `registry`)
 * automatically falls back to the same generic manual/staff-confirmed gateway
 * that already backs "transfer" and "card" — no code change needed per new
 * channel, since there's no live API to call for a channel we don't know about.
 */
function resolveGateway(method: PaymentMethod): PaymentGateway {
  const known = registry[method];
  if (known) return known;
  const prefix = method.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "PAY";
  return manualGateway(method, prefix);
}

export async function initiatePayment(req: PaymentRequest) {
  const gateway = resolveGateway(req.method);
  if (req.amount <= 0) throw new Error("Jumlah pembayaran harus lebih dari 0.");

  const summary = await getOrderPaymentSummary(req.orderId);
  if (!summary) throw new Error("Order tidak ditemukan.");
  if (req.amount > summary.remaining + 0.5) {
    throw new Error(`Jumlah pembayaran (${req.amount}) melebihi sisa tagihan (${summary.remaining}).`);
  }

  const result = await gateway.createPayment({ ...req, outletId: summary.order.outletId });

  const [row] = await db
    .insert(payments)
    .values({
      orderId: req.orderId,
      method: req.method,
      amount: req.amount,
      status: result.status,
      providerRef: result.providerRef,
      qrString: result.qrString,
      qrImageUrl: result.qrImageUrl,
      feeAmount: result.feeAmount ?? 0,
      rawResponse: JSON.stringify(result.rawResponse ?? {}),
      expiresAt: result.expiresAt,
    })
    .returning();

  return row;
}

/**
 * Runs once, the moment an order's cumulative successful payments first cover its
 * total (or the first payment already fully covers it — the common instant-pay
 * case): posts the accounting journal (aggregating cash across every split
 * payment, and a Piutang Usaha line if there's still a shortfall — see
 * postSalesJournal) and applies membership loyalty points. Best-effort — a bug
 * here must never make the cashier's payment confirmation itself fail, so
 * failures are logged rather than thrown. Check server logs / the Journal page
 * if numbers look off.
 */
async function runPostPaymentSideEffects(orderId: string) {
  try {
    await postSalesJournal(orderId);
  } catch (err) {
    console.error(`Gagal posting jurnal untuk order ${orderId}:`, err);
  }
  try {
    await applyLoyaltyAndSpending(orderId);
  } catch (err) {
    console.error(`Gagal update loyalty/membership untuk order ${orderId}:`, err);
  }
}

/**
 * Recomputes an order's status from its successful payments after one just
 * settled, and routes the accounting side effect to the right place:
 *
 * - No existing receivable + now fully paid (the common case: one payment
 *   covers the whole order) → posts the full sales journal + loyalty, exactly
 *   as before.
 * - No existing receivable + still short of the total → this is the FIRST
 *   partial payment: revenue is recognized in full right now via
 *   postSalesJournal, which books the shortfall to Piutang Usaha and creates
 *   the receivable (order status becomes "partial").
 * - An existing receivable for this order → revenue was already recognized;
 *   this payment (whatever its size) settles that receivable via
 *   postReceivableSettlement instead of touching revenue again. Loyalty only
 *   fires once the order is fully paid off.
 *
 * Idempotent throughout: markPaymentSuccess/markPaymentByProviderRef only
 * call this once per payment (their own status-transition guard), and
 * postSalesJournal/postReceivableSettlement have their own guards against
 * double-posting, so a stray retry/duplicate webhook is always safe.
 */
export async function settleOrderAfterPayment(orderId: string, paymentId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status === "paid") return;

  const successPayments = await db.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
  const paidTotal = successPayments.reduce((s, p) => s + p.amount, 0);
  const fullyPaid = paidTotal >= order.total - 0.5;
  const newStatus = fullyPaid ? "paid" : paidTotal > 0 ? "partial" : order.status;

  if (newStatus !== order.status) {
    await db.update(orders).set({ status: newStatus }).where(eq(orders.id, orderId));
  }

  const [existingReceivable] = await db.select().from(receivables).where(eq(receivables.orderId, orderId)).limit(1);

  if (existingReceivable) {
    const [justSucceeded] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (justSucceeded) {
      try {
        await postReceivableSettlement(existingReceivable.id, justSucceeded);
      } catch (err) {
        console.error(`Gagal posting pelunasan piutang untuk order ${orderId}:`, err);
      }
    }
    if (fullyPaid) {
      try {
        await applyLoyaltyAndSpending(orderId);
      } catch (err) {
        console.error(`Gagal update loyalty/membership untuk order ${orderId}:`, err);
      }
    }
    return;
  }

  if (fullyPaid) {
    await runPostPaymentSideEffects(orderId);
  } else if (newStatus === "partial") {
    try {
      await postSalesJournal(orderId);
    } catch (err) {
      console.error(`Gagal posting jurnal (sebagian/piutang) untuk order ${orderId}:`, err);
    }
  }
}

/**
 * Records a payment collected as an ADVANCE DEPOSIT against an order whose
 * real final total isn't known yet — specifically, "bayar di muka" when a
 * rental session starts (see StartSessionInput.prepay in
 * lib/rental/sessions.ts). The order's total at that point is just a
 * placeholder estimate (see upsertRentalLineItem), not the real invoice
 * amount, so unlike initiatePayment() this deliberately:
 *  - skips the "amount can't exceed remaining balance" check (there's no
 *    reliable "remaining" yet), and
 *  - never triggers settleOrderAfterPayment (no premature "paid" status
 *    flip, no journal posted against the wrong/estimated total).
 * Settlement is deferred until stopRentalSession sets the real total and
 * explicitly re-evaluates it — see the settleOrderAfterPayment call there.
 * The payment row itself is real from the moment it's created/confirmed and
 * counts toward paidTotal in getOrderPaymentSummary immediately.
 */
export async function recordDeposit(req: PaymentRequest) {
  if (req.amount <= 0) throw new Error("Jumlah DP harus lebih dari 0.");
  const gateway = resolveGateway(req.method);
  const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, req.orderId)).limit(1);
  const result = await gateway.createPayment({ ...req, outletId: order?.outletId });

  const [row] = await db
    .insert(payments)
    .values({
      orderId: req.orderId,
      method: req.method,
      amount: req.amount,
      status: result.status,
      providerRef: result.providerRef,
      qrString: result.qrString,
      qrImageUrl: result.qrImageUrl,
      feeAmount: result.feeAmount ?? 0,
      rawResponse: JSON.stringify(result.rawResponse ?? {}),
      expiresAt: result.expiresAt,
    })
    .returning();
  return row;
}

/** Confirms a still-pending deposit (e.g. cash DP, or a QRIS DP once scanned) — deliberately does NOT call settleOrderAfterPayment, same reasoning as recordDeposit(). */
export async function confirmDeposit(paymentId: string) {
  const [existing] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!existing) return null;
  if (existing.status === "success") return existing;
  const [updated] = await db
    .update(payments)
    .set({ status: "success", paidAt: new Date().toISOString() })
    .where(eq(payments.id, paymentId))
    .returning();
  return updated;
}

/** Idempotent: replaying this for an already-successful payment (double-click, retried webhook) is a safe no-op. */
export async function markPaymentSuccess(paymentId: string) {
  const [existing] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!existing) return null;
  if (existing.status === "success") return existing;

  const [payment] = await db
    .update(payments)
    .set({ status: "success", paidAt: new Date().toISOString() })
    .where(eq(payments.id, paymentId))
    .returning();

  if (payment) await settleOrderAfterPayment(payment.orderId, payment.id);
  return payment;
}

/** Idempotent: a payment already in a terminal state (success/failed) ignores a replayed webhook. */
export async function markPaymentByProviderRef(providerRef: string, status: "success" | "failed") {
  const [payment] = await db.select().from(payments).where(eq(payments.providerRef, providerRef)).limit(1);
  if (!payment) return null;
  if (payment.status === "success" || payment.status === "failed") return payment;

  const [updated] = await db
    .update(payments)
    .set({ status, paidAt: status === "success" ? new Date().toISOString() : null })
    .where(eq(payments.id, payment.id))
    .returning();

  if (status === "success" && updated) await settleOrderAfterPayment(updated.orderId, updated.id);
  return updated;
}

export * from "./types";
