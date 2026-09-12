import { db, type DbOrTx } from "@/db/client";
import { eq, and, sql } from "drizzle-orm";
import { purchaseInvoices, purchaseInvoiceItems, purchasePayments, purchaseOrderItems, stockMovements, products } from "@/db/schema";
import { voidJournal } from "@/lib/accounting/journal";
import { postPurchaseInvoiceJournal } from "@/lib/accounting/postings";
import { payPurchaseInvoice } from "@/lib/inventory/purchasing";
import { recomputeCostPriceExcludingRef } from "@/lib/inventory/cost-replay";
import { logAudit } from "@/lib/audit/log";

export interface ReconstructedInvoiceLine {
  productId: string;
  qty: number;
  unitCost: number;
  landedUnitCost: number;
}

/**
 * Reconstructs an invoice's line items for View/Edit. Prefers the canonical purchaseInvoiceItems
 * table (populated going forward by both recordSupplierPurchase and receivePurchaseOrder). For a
 * legacy invoice that predates that table, falls back to reverse-engineering from stockMovements
 * rows sharing this invoice's id as refOrderId (type purchase_in) — qty and landedUnitCost are
 * recoverable that way, but the original pre-proration unitCost is not, so it's approximated as
 * equal to landedUnitCost. `isLegacy` tells the caller (UI + the edit route) to degrade Edit to
 * "not available for this invoice, only View/Delete" since we can't reconstruct exactly what the
 * user originally typed for legacy rows.
 */
export async function reconstructInvoiceLines(purchaseInvoiceId: string, dbc: DbOrTx = db): Promise<{ lines: ReconstructedInvoiceLine[]; isLegacy: boolean }> {
  const canonical = await dbc.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, purchaseInvoiceId));
  if (canonical.length > 0) {
    return {
      lines: canonical.map((r) => ({ productId: r.productId, qty: r.qty, unitCost: r.unitCost, landedUnitCost: r.landedUnitCost })),
      isLegacy: false,
    };
  }

  const movements = await dbc
    .select()
    .from(stockMovements)
    .where(and(eq(stockMovements.refOrderId, purchaseInvoiceId), eq(stockMovements.type, "purchase_in")));

  return {
    lines: movements.map((m) => ({ productId: m.productId, qty: m.qty, unitCost: m.unitCost ?? 0, landedUnitCost: m.unitCost ?? 0 })),
    isLegacy: true,
  };
}

/**
 * Reverses everything a purchase invoice did — stock, blended cost, journals, and (if PO-linked)
 * the PO's own receiving progress — as one atomic step inside the caller's transaction. Used by
 * both Delete (reverse only, invoice ends up "cancelled") and Edit (reverse, then the caller
 * re-applies fresh values under the same invoice id — see applyInvoiceLines below). Never
 * hard-deletes anything: inserts offsetting stock movements and voids journals via voidJournal
 * rather than removing rows, so the full before/after history stays intact for audit purposes.
 *
 * Does NOT flip the invoice's own status — the caller decides (Delete sets "cancelled";
 * Edit leaves it alone because applyInvoiceLines immediately re-applies new effects to it).
 */
export async function reverseInvoiceEffects(purchaseInvoiceId: string, reason: string, staffUserId: string | undefined, tx: DbOrTx) {
  const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");
  if (invoice.status === "cancelled") throw new Error("Invoice ini sudah dibatalkan sebelumnya.");

  const { lines } = await reconstructInvoiceLines(purchaseInvoiceId, tx);

  const affectedProductIds = new Set<string>();
  for (const line of lines) {
    if (line.qty <= 0) continue;
    await tx.insert(stockMovements).values({
      productId: line.productId,
      type: "adjustment",
      qty: -Math.abs(line.qty),
      unitCost: line.landedUnitCost,
      note: `Pembatalan/koreksi invoice pembelian ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)} — ${reason}`,
      refOrderId: invoice.id,
      staffUserId,
    });
    await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} - ${Math.abs(line.qty)}` })
      .where(eq(products.id, line.productId));
    affectedProductIds.add(line.productId);
  }

  // Recompute costPrice for every affected product, excluding THIS invoice's movements
  // (original purchase_in + the reversal adjustment just inserted, both tagged refOrderId =
  // invoice.id) entirely from the replay — see recomputeCostPriceExcludingRef's doc comment.
  for (const productId of affectedProductIds) {
    await recomputeCostPriceExcludingRef(productId, invoice.id, tx);
  }

  if (invoice.journalEntryId) {
    await voidJournal(invoice.journalEntryId, reason, tx);
  }
  const payments = await tx.select().from(purchasePayments).where(eq(purchasePayments.purchaseInvoiceId, purchaseInvoiceId));
  for (const p of payments) {
    if (p.journalEntryId) await voidJournal(p.journalEntryId, reason, tx);
  }

  // Roll back the PO's own receiving progress if this invoice came from a formal PO receipt —
  // otherwise the PO would keep showing qty received that this invoice's reversal no longer
  // supports.
  if (invoice.purchaseOrderId) {
    for (const line of lines) {
      if (line.qty <= 0) continue;
      await tx
        .update(purchaseOrderItems)
        .set({ qtyReceived: sql`GREATEST(0, ${purchaseOrderItems.qtyReceived} - ${Math.abs(line.qty)})` })
        .where(and(eq(purchaseOrderItems.purchaseOrderId, invoice.purchaseOrderId), eq(purchaseOrderItems.productId, line.productId)));
    }
  }

  // The canonical line items belong to this specific posting of the invoice — clear them so
  // applyInvoiceLines (edit path) can insert the fresh set, or so a cancelled invoice simply has
  // none (reconstructInvoiceLines then falls back to the now-negative-taggged stock movements,
  // which is fine since a cancelled invoice's lines are only ever shown for audit reference).
  await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, purchaseInvoiceId));

  return { invoice, lines };
}

export interface InvoiceLineInput {
  productId: string;
  qty: number;
  unitCost: number;
  landedUnitCost: number;
}

/**
 * Re-applies a fresh set of line items to an EXISTING invoice id (used right after
 * reverseInvoiceEffects in the Edit flow) — inserts new stock movements/blends cost the same way
 * recordSupplierPurchase does, writes the canonical purchaseInvoiceItems rows, updates the
 * invoice's amount, and re-posts its journal. The invoice keeps its original id, invoiceNumber,
 * and createdAt, so from the user's point of view this reads as "the same invoice, corrected" —
 * the void-then-reapply is purely an internal correctness mechanism, never surfaced as two
 * separate invoices.
 */
export async function applyInvoiceLines(purchaseInvoiceId: string, lines: InvoiceLineInput[], amount: number, staffUserId: string | undefined, tx: DbOrTx) {
  const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");

  for (const line of lines) {
    if (line.qty <= 0) throw new Error("Qty item harus lebih dari 0.");
    if (line.unitCost < 0 || line.landedUnitCost < 0) throw new Error("Harga beli tidak boleh negatif.");

    const [product] = await tx.select().from(products).where(eq(products.id, line.productId)).limit(1);
    if (!product) throw new Error("Produk tidak ditemukan.");
    const existingQty = Math.max(0, product.stockQty);
    const existingValue = existingQty * (product.costPrice ?? 0);
    const incomingValue = line.qty * line.landedUnitCost;
    const newQty = existingQty + line.qty;
    const newCostPrice = newQty > 0 ? (existingValue + incomingValue) / newQty : line.landedUnitCost;

    await tx.insert(stockMovements).values({
      productId: line.productId,
      type: "purchase_in",
      qty: line.qty,
      unitCost: line.landedUnitCost,
      note: `Belanja supplier ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)} (dikoreksi)`,
      refOrderId: invoice.id,
      staffUserId,
    });
    await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${line.qty}`, costPrice: Math.round(newCostPrice * 100) / 100 })
      .where(eq(products.id, line.productId));

    await tx.insert(purchaseInvoiceItems).values({
      purchaseInvoiceId: invoice.id,
      productId: line.productId,
      qty: line.qty,
      unitCost: line.unitCost,
      landedUnitCost: line.landedUnitCost,
    });
  }

  await tx.update(purchaseInvoices).set({ amount, paidAmount: 0, status: "unpaid" }).where(eq(purchaseInvoices.id, purchaseInvoiceId));

  const journalId = await postPurchaseInvoiceJournal(invoice.id);
  return { invoice, journalId };
}

/**
 * Void (Delete) a purchase invoice: reverses all its effects and marks it "cancelled". Restricted
 * to manage_supplier_purchase_history at the route level. Payments already made against it are
 * left as history rows with their journals voided — never deleted — but no longer paid/owed
 * anywhere since the invoice itself is cancelled.
 */
export async function voidPurchaseInvoice(purchaseInvoiceId: string, reason: string, staffUserId: string | undefined) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${purchaseInvoiceId}))`);
    const before = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
    const { invoice } = await reverseInvoiceEffects(purchaseInvoiceId, reason, staffUserId, tx);
    await tx.update(purchaseInvoices).set({ status: "cancelled" }).where(eq(purchaseInvoices.id, purchaseInvoiceId));

    await logAudit({
      outletId: invoice.outletId,
      staffUserId,
      action: "cancel_purchase_invoice",
      entityType: "purchase_invoice",
      entityId: invoice.id,
      before: before[0],
      after: { status: "cancelled", reason },
    });

    return invoice;
  });
}

/**
 * Edit a purchase invoice's line items in place (the user-chosen UX: same fields, same invoice —
 * see the Edit-approach decision in this feature's design). Internally implemented as an atomic
 * reverse-then-reapply within one transaction: the old stock/cost/journal/PO effects are fully
 * rolled back, then the new values are freshly applied — all-or-nothing, so a failure partway
 * leaves the original invoice completely untouched rather than half-corrected.
 *
 * Blocked for legacy invoices with no purchaseInvoiceItems rows (reconstructInvoiceLines
 * `isLegacy: true`) — we can't be sure we're reversing exactly what was originally entered, so
 * those only get View/Delete, never Edit; the route layer enforces this before calling here.
 */
export async function editPurchaseInvoiceLines(purchaseInvoiceId: string, newLines: InvoiceLineInput[], reason: string, staffUserId: string | undefined) {
  if (!newLines.length) throw new Error("Invoice harus punya minimal 1 item.");

  const { invoice, journalId, amount, priorPayment } = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${purchaseInvoiceId}))`);

    const [before] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
    if (!before) throw new Error("Invoice tidak ditemukan.");

    const { isLegacy } = await reconstructInvoiceLines(purchaseInvoiceId, tx);
    if (isLegacy) {
      throw new Error("Invoice ini dibuat sebelum fitur koreksi tersedia dan tidak bisa diedit langsung — hanya bisa dilihat atau dibatalkan.");
    }

    // Capture what was already paid BEFORE reversing — reverseInvoiceEffects voids the payment
    // journal(s) but (deliberately) leaves the purchasePayments rows themselves untouched as
    // history. Since applyInvoiceLines below resets the invoice to unpaid/paidAmount=0, we replay
    // an equivalent payment afterwards (outside this transaction — see the payPurchaseInvoice call
    // below, and why it can't safely run inside this same transaction) so an invoice that was
    // already paid comes back out the other side of an edit still paid, rather than silently
    // reverting to "unpaid" while a stale, journal-voided payment row sits unexplained in history.
    const existingPayments = await tx.select().from(purchasePayments).where(eq(purchasePayments.purchaseInvoiceId, purchaseInvoiceId));
    const priorPaidTotal = existingPayments.reduce((s, p) => s + p.amount, 0);
    const lastPayment = existingPayments[existingPayments.length - 1];

    await reverseInvoiceEffects(purchaseInvoiceId, `Diedit: ${reason}`, staffUserId, tx);

    const amount = newLines.reduce((s, l) => s + l.qty * l.landedUnitCost, 0);
    const { invoice, journalId } = await applyInvoiceLines(purchaseInvoiceId, newLines, amount, staffUserId, tx);

    await logAudit({
      outletId: invoice.outletId,
      staffUserId,
      action: "edit_purchase_invoice",
      entityType: "purchase_invoice",
      entityId: invoice.id,
      before,
      after: { amount, lines: newLines, reason },
    });

    return {
      invoice,
      journalId,
      amount,
      priorPayment: priorPaidTotal > 0 && lastPayment ? { amount: priorPaidTotal, method: lastPayment.method, cashBankAccountId: lastPayment.cashBankAccountId } : null,
    };
  });

  // Deliberately OUTSIDE the transaction above: payPurchaseInvoice runs its own db.transaction
  // internally (see lib/inventory/purchasing.ts) and would read stale/uncommitted data if nested
  // inside the one above. Composing it as a follow-up step matches how recordSupplierPurchase
  // itself already calls receiveStockForItem → postPurchaseInvoiceJournal → payPurchaseInvoice as
  // sequential (not nested-transactional) steps elsewhere in this codebase.
  if (priorPayment) {
    await payPurchaseInvoice(invoice.id, Math.min(priorPayment.amount, amount), priorPayment.method, priorPayment.cashBankAccountId, staffUserId);
  }

  return { invoice, journalId };
}
