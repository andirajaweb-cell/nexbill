/**
 * Order-level reconciliation between Transaction Center (transaction/Business Date basis) and
 * Accounting's General Ledger (posting/entryDate basis) for the same period. Built in response to
 * a real, reported gap that survived the Business Date fix (lib/rental/sessions.ts,
 * lib/accounting/postings.ts): summary-card totals alone can show "there's a Rp21.000 difference
 * somewhere in Rental" but can't say WHICH order caused it or WHY. This module classifies every
 * order into exactly one bucket so a genuine bug (a missing or un-reversed journal) is
 * distinguishable at a glance from an expected, by-design difference (an order that just hasn't
 * been paid yet).
 *
 * Kept DB-free and pure so it's directly unit-testable (see reconciliation.test.ts) — the API
 * route (app/api/accounting/reconciliation/route.ts) does all the fetching and hands plain arrays
 * in here.
 */
import { outletDateYmd } from "@/lib/time/outlet-time";

export interface ReconciliationTxInput {
  orderId: string;
  businessDate: string;
  status: "open" | "awaiting_payment" | "partial" | "paid" | "cancelled";
  total: number;
  type: "rental" | "fnb" | "product" | "ppob";
}

/** One row per order that has at least one posted sales-journal entry in this outlet's ledger,
 * regardless of which period that entry's entryDate falls in — the API route deliberately doesn't
 * pre-filter this by [from, to] itself, since an entryDate that has drifted outside the requested
 * window (relative to the order's Business Date) is exactly the case this tool exists to surface. */
export interface ReconciliationGlInput {
  orderId: string;
  entryDate: string;
  /** Sum of (credit - debit) across every revenue-type account line on this order's sales journal
   * — see the doc comment in the API route for why this should equal `order.total` exactly for a
   * correctly-posted order (discount is its own contra-revenue debit line, already netted in). */
  netRevenue: number;
}

export type ReconciliationStatus =
  | "match"
  | "pending_payment"
  | "date_mismatch"
  | "amount_mismatch"
  | "missing_gl"
  | "cancelled_with_gl";

export interface ReconciliationRow {
  orderId: string;
  type: ReconciliationTxInput["type"];
  status: ReconciliationTxInput["status"];
  businessDate: string;
  transactionsTotal: number;
  glEntryDate: string | null;
  glRevenue: number | null;
  reconciliationStatus: ReconciliationStatus;
}

export interface OrphanGlRow {
  orderId: string;
  glEntryDate: string;
  glRevenue: number;
}

export interface ReconciliationSummary {
  totalOrders: number;
  match: number;
  pendingPayment: number;
  dateMismatch: number;
  amountMismatch: number;
  missingGl: number;
  cancelledWithGl: number;
  orphanGl: number;
  /** Sum of glRevenue - transactionsTotal across every row where both sides exist — the exact
   * figure that should tie back to the summary-card gap the user is chasing (e.g. the reported
   * Rp21.000 in Rental) once dateMismatch/amountMismatch/missingGl/cancelledWithGl/orphanGl rows
   * are all accounted for. */
  netAmountDelta: number;
}

const AMOUNT_EPSILON = 1; // rupiah — guards float drift, not a real tolerance for a genuine mismatch

/**
 * Outlet-local ("Asia/Jakarta") calendar day for an ISO timestamp — NOT a naive
 * `iso.slice(0, 10)`. That naive slice compares UTC calendar days, which is wrong here for the
 * same reason `.getHours()` is wrong elsewhere in this codebase (see the doc comment on
 * outletDateYmd in lib/time/outlet-time.ts): a transaction at 03:46 WIB is stored as 20:46 UTC
 * the PREVIOUS day, so a businessDate and entryDate a few hours apart in the same WIB morning
 * used to get flagged as "date_mismatch" here purely from crossing the UTC midnight boundary,
 * even though no merchant would ever see them as different days. Found via a real reconciliation
 * run that showed 9 false-positive date_mismatch rows, every one of them in the 00:00-07:00 WIB
 * window.
 */
function dayOf(iso: string): string {
  return outletDateYmd(new Date(iso));
}

/**
 * Classifies every order Transaction Center considers part of this period (`transactions`)
 * against whatever the GL actually has posted for it (`glByOrderId`, keyed by orderId — NOT
 * pre-filtered to the period, see ReconciliationGlInput's doc comment), plus a separate scan of
 * GL entries that landed in-period for an order Transaction Center doesn't attribute to this
 * period at all (`orphanGl`).
 */
export function reconcileOrders(
  transactions: ReconciliationTxInput[],
  glByOrderId: Map<string, ReconciliationGlInput>,
  orphanGl: OrphanGlRow[]
): { rows: ReconciliationRow[]; orphans: OrphanGlRow[]; summary: ReconciliationSummary } {
  const rows: ReconciliationRow[] = transactions.map((t) => {
    const gl = glByOrderId.get(t.orderId) ?? null;

    if (t.status === "cancelled") {
      return {
        orderId: t.orderId,
        type: t.type,
        status: t.status,
        businessDate: t.businessDate,
        transactionsTotal: t.total,
        glEntryDate: gl?.entryDate ?? null,
        glRevenue: gl?.netRevenue ?? null,
        // A cancelled order should never carry live revenue — its journal should have been
        // reversed (voided) the moment it was cancelled. Finding one here means that reversal
        // either never happened or failed silently.
        reconciliationStatus: gl ? "cancelled_with_gl" : "match",
      };
    }

    const recognized = t.status === "paid" || t.status === "partial";

    if (!recognized) {
      // Open/awaiting_payment: Transaction Center counts it toward Gross Sales (it's a valid,
      // non-cancelled transaction) but Accounting correctly has nothing yet — postSalesJournal
      // only runs once a payment is recorded. Not a bug, but flagged distinctly from "match" so
      // it isn't silently conflated with a genuinely reconciled paid order.
      return {
        orderId: t.orderId,
        type: t.type,
        status: t.status,
        businessDate: t.businessDate,
        transactionsTotal: t.total,
        glEntryDate: gl?.entryDate ?? null,
        glRevenue: gl?.netRevenue ?? null,
        reconciliationStatus: gl ? "amount_mismatch" : "pending_payment", // a GL entry existing here at all would itself be a surprise
      };
    }

    if (!gl) {
      // Paid/partial in Transaction Center but the GL has NO revenue at all for this order —
      // postSalesJournal either never ran or threw and was swallowed (it's called best-effort,
      // see runPostPaymentSideEffects in lib/payments/index.ts). Real, revenue-losing bug.
      return {
        orderId: t.orderId,
        type: t.type,
        status: t.status,
        businessDate: t.businessDate,
        transactionsTotal: t.total,
        glEntryDate: null,
        glRevenue: null,
        reconciliationStatus: "missing_gl",
      };
    }

    const amountMatches = Math.abs(gl.netRevenue - t.total) < AMOUNT_EPSILON;
    const dateMatches = dayOf(gl.entryDate) === dayOf(t.businessDate);

    const reconciliationStatus: ReconciliationStatus = !amountMatches ? "amount_mismatch" : !dateMatches ? "date_mismatch" : "match";

    return {
      orderId: t.orderId,
      type: t.type,
      status: t.status,
      businessDate: t.businessDate,
      transactionsTotal: t.total,
      glEntryDate: gl.entryDate,
      glRevenue: gl.netRevenue,
      reconciliationStatus,
    };
  });

  // netAmountDelta is built to tie out EXACTLY to "Accounting's total for this period minus
  // Transaction Center's Gross Sales for this period" — the summary-card-level gap the user is
  // chasing — by mirroring what each side actually counts, per row:
  //   txContribution:  what Transaction Center's Gross Sales counts for this order (0 if
  //                    cancelled, t.total otherwise — cancelled orders never count toward Gross
  //                    Sales regardless of what the GL still shows for them).
  //   glContribution:  what Accounting counts for this order (0 if there's no GL entry at all —
  //                    covers both the expected "not paid yet" case and the buggy "missing_gl"
  //                    case identically, since from the GL's own point of view both look like
  //                    "nothing posted"; glRevenue otherwise).
  // A cancelled order whose journal was never reversed (cancelledWithGl) is exactly the case that
  // contributes a positive (Accounting-higher) delta here without any offsetting txContribution —
  // which is the shape of bug the reported "Rental" gap matches.
  let netAmountDelta = 0;
  for (const r of rows) {
    const txContribution = r.status === "cancelled" ? 0 : r.transactionsTotal;
    const glContribution = r.glRevenue ?? 0;
    netAmountDelta += glContribution - txContribution;
  }
  for (const o of orphanGl) netAmountDelta += o.glRevenue;

  const summary: ReconciliationSummary = {
    totalOrders: rows.length,
    match: rows.filter((r) => r.reconciliationStatus === "match").length,
    pendingPayment: rows.filter((r) => r.reconciliationStatus === "pending_payment").length,
    dateMismatch: rows.filter((r) => r.reconciliationStatus === "date_mismatch").length,
    amountMismatch: rows.filter((r) => r.reconciliationStatus === "amount_mismatch").length,
    missingGl: rows.filter((r) => r.reconciliationStatus === "missing_gl").length,
    cancelledWithGl: rows.filter((r) => r.reconciliationStatus === "cancelled_with_gl").length,
    orphanGl: orphanGl.length,
    netAmountDelta,
  };

  return { rows, orphans: orphanGl, summary };
}
