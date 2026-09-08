import { describe, it, expect } from "vitest";
import { reconcileOrders, type ReconciliationTxInput, type ReconciliationGlInput, type OrphanGlRow } from "./reconciliation";

const tx = (over: Partial<ReconciliationTxInput> = {}): ReconciliationTxInput => ({
  orderId: "order-1",
  businessDate: "2026-09-08T10:00:00.000Z",
  status: "paid",
  total: 100_000,
  type: "rental",
  ...over,
});

describe("reconcileOrders", () => {
  it("a paid order with a same-day, same-amount GL entry is a match", () => {
    const t = tx();
    const gl = new Map<string, ReconciliationGlInput>([[t.orderId, { orderId: t.orderId, entryDate: "2026-09-08T10:00:05.000Z", netRevenue: 100_000 }]]);
    const { rows, summary } = reconcileOrders([t], gl, []);
    expect(rows[0].reconciliationStatus).toBe("match");
    expect(summary.match).toBe(1);
    expect(summary.netAmountDelta).toBe(0);
  });

  it("an open/awaiting_payment order with no GL entry is pending_payment, not a mismatch", () => {
    const t = tx({ status: "open" });
    const { rows, summary } = reconcileOrders([t], new Map(), []);
    expect(rows[0].reconciliationStatus).toBe("pending_payment");
    expect(summary.pendingPayment).toBe(1);
    // Expected, by-design gap: Transaction Center counts it (Gross Sales), Accounting doesn't yet.
    expect(summary.netAmountDelta).toBe(-100_000);
  });

  it("a paid order whose GL entryDate lands on a different calendar day than its businessDate is date_mismatch", () => {
    const t = tx({ businessDate: "2026-09-08T23:58:00.000Z" });
    const gl = new Map<string, ReconciliationGlInput>([[t.orderId, { orderId: t.orderId, entryDate: "2026-09-09T00:15:00.000Z", netRevenue: 100_000 }]]);
    const { rows, summary } = reconcileOrders([t], gl, []);
    expect(rows[0].reconciliationStatus).toBe("date_mismatch");
    expect(summary.dateMismatch).toBe(1);
    // Same-day amounts agree, so this alone doesn't move the net rupiah delta.
    expect(summary.netAmountDelta).toBe(0);
  });

  it("a paid order whose GL revenue doesn't match its total is amount_mismatch", () => {
    const t = tx();
    const gl = new Map<string, ReconciliationGlInput>([[t.orderId, { orderId: t.orderId, entryDate: "2026-09-08T10:00:05.000Z", netRevenue: 80_000 }]]);
    const { rows, summary } = reconcileOrders([t], gl, []);
    expect(rows[0].reconciliationStatus).toBe("amount_mismatch");
    expect(summary.amountMismatch).toBe(1);
    expect(summary.netAmountDelta).toBe(-20_000);
  });

  it("a paid order with NO GL entry at all is missing_gl — a real, revenue-losing bug", () => {
    const t = tx();
    const { rows, summary } = reconcileOrders([t], new Map(), []);
    expect(rows[0].reconciliationStatus).toBe("missing_gl");
    expect(summary.missingGl).toBe(1);
    expect(summary.netAmountDelta).toBe(-100_000);
  });

  it("a cancelled order with a live (un-reversed) GL entry is cancelled_with_gl — exactly the bug shape that makes Accounting look HIGHER than Transactions", () => {
    const t = tx({ status: "cancelled" });
    const gl = new Map<string, ReconciliationGlInput>([[t.orderId, { orderId: t.orderId, entryDate: "2026-09-08T10:00:05.000Z", netRevenue: 100_000 }]]);
    const { rows, summary } = reconcileOrders([t], gl, []);
    expect(rows[0].reconciliationStatus).toBe("cancelled_with_gl");
    expect(summary.cancelledWithGl).toBe(1);
    // Cancelled orders never count toward Gross Sales, but this one's GL revenue is still live —
    // Accounting counts +100,000 that Transaction Center counts 0 of.
    expect(summary.netAmountDelta).toBe(100_000);
  });

  it("a cancelled order with no GL entry (the normal case) is a match and contributes nothing", () => {
    const t = tx({ status: "cancelled" });
    const { rows, summary } = reconcileOrders([t], new Map(), []);
    expect(rows[0].reconciliationStatus).toBe("match");
    expect(summary.netAmountDelta).toBe(0);
  });

  it("orphan GL entries (posted in-period for an order Transaction Center doesn't attribute to this period at all) count fully toward the delta", () => {
    const orphans: OrphanGlRow[] = [{ orderId: "order-99", glEntryDate: "2026-09-08T12:00:00.000Z", glRevenue: 44_000 }];
    const { orphans: returnedOrphans, summary } = reconcileOrders([], new Map(), orphans);
    expect(returnedOrphans).toHaveLength(1);
    expect(summary.orphanGl).toBe(1);
    expect(summary.netAmountDelta).toBe(44_000);
  });

  it("netAmountDelta sums correctly across a realistic mixed batch — a full end-to-end sanity check", () => {
    const t1 = tx({ orderId: "a", status: "paid", total: 100_000 }); // match
    const t2 = tx({ orderId: "b", status: "open", total: 10_000 }); // pending_payment
    const t3 = tx({ orderId: "c", status: "cancelled", total: 50_000 }); // cancelled_with_gl (bug)
    const gl = new Map<string, ReconciliationGlInput>([
      ["a", { orderId: "a", entryDate: "2026-09-08T10:00:05.000Z", netRevenue: 100_000 }],
      ["c", { orderId: "c", entryDate: "2026-09-08T09:00:00.000Z", netRevenue: 50_000 }],
    ]);
    const orphans: OrphanGlRow[] = [{ orderId: "orphan-1", glEntryDate: "2026-09-08T11:00:00.000Z", glRevenue: 44_000 }];
    const { summary } = reconcileOrders([t1, t2, t3], gl, orphans);
    // match(0) + pending_payment(-10,000) + cancelled_with_gl(+50,000) + orphan(+44,000) = +84,000
    expect(summary.netAmountDelta).toBe(84_000);
  });
});
