import { db, type DbOrTx } from "@/db/client";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  purchaseInvoices,
  purchaseInvoiceItems,
  purchasePayments,
  purchaseOrderItems,
  purchaseReturns,
  stockMovements,
  products,
  journalEntries,
  journalLines,
} from "@/db/schema";
import { voidJournal } from "@/lib/accounting/journal";
import { postPurchaseInvoiceJournal } from "@/lib/accounting/postings";
import { payPurchaseInvoice, prorateLandedCosts } from "@/lib/inventory/purchasing";
import { recomputeCostPriceExcludingRef } from "@/lib/inventory/cost-replay";
import { getCostMethod, onStockIn, onStockOut } from "@/lib/inventory/costing";
import { logAudit } from "@/lib/audit/log";

export interface ReconstructedInvoiceLine {
  productId: string;
  qty: number;
  /** null = never recorded (legacy invoice) — NOT the same as Rp0; the UI must show it as unknown. */
  unitCost: number | null;
  landedUnitCost: number | null;
}

/** The ongkos (transport/parkir/lain-lain) baked into an invoice's landed costs: Σ qty × (landed − unit). */
export function additionalCostOf(lines: { qty: number; unitCost: number; landedUnitCost: number }[]): number {
  const extra = lines.reduce((s, l) => s + l.qty * (l.landedUnitCost - l.unitCost), 0);
  return Math.max(0, Math.round(extra * 100) / 100);
}

/**
 * Reconstructs an invoice's line items for View/Edit. Prefers the canonical purchaseInvoiceItems
 * table (populated going forward by both recordSupplierPurchase and receivePurchaseOrder). For a
 * legacy invoice that predates that table, falls back to reverse-engineering from stockMovements
 * rows sharing this invoice's id as refOrderId (type purchase_in) — qty and landedUnitCost are
 * recoverable that way, but the original pre-proration unitCost is not, so it's approximated as
 * equal to landedUnitCost. Invoices from before stockMovements.unitCost existed (added 2026-09-12)
 * have no per-line cost at all — those come back as null, never 0: the purchase DID blend its real
 * cost into products.costPrice at the time, only the per-line breakdown was never stored, so
 * showing "Rp0 → HPP Rp0" misreported it as a free purchase. `isLegacy` tells the caller (UI + the
 * edit route) to degrade Edit to "not available for this invoice, only View/Delete" since we can't
 * reconstruct exactly what the user originally typed for legacy rows.
 */
export async function reconstructInvoiceLines(
  purchaseInvoiceId: string,
  dbc: DbOrTx = db
): Promise<{ lines: ReconstructedInvoiceLine[]; isLegacy: boolean; additionalCost: number | null }> {
  const canonical = await dbc.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, purchaseInvoiceId));
  if (canonical.length > 0) {
    return {
      lines: canonical.map((r) => ({ productId: r.productId, qty: r.qty, unitCost: r.unitCost, landedUnitCost: r.landedUnitCost })),
      isLegacy: false,
      additionalCost: additionalCostOf(canonical),
    };
  }

  const movements = await dbc
    .select()
    .from(stockMovements)
    .where(and(eq(stockMovements.refOrderId, purchaseInvoiceId), eq(stockMovements.type, "purchase_in")));

  return {
    lines: movements.map((m) => ({ productId: m.productId, qty: m.qty, unitCost: m.unitCost ?? null, landedUnitCost: m.unitCost ?? null })),
    isLegacy: true,
    additionalCost: null,
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
    // FIFO: take the units back out of this invoice's own layer first.
    await onStockOut(tx, { productId: line.productId, qty: Math.abs(line.qty), preferRefId: invoice.id });
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
  // Rata-rata only — on a FIFO outlet onStockOut above already re-derived harga modal from the
  // remaining layers, and an average replay would overwrite it with the wrong method.
  if ((await getCostMethod(invoice.outletId, tx)) !== "fifo") {
    for (const productId of affectedProductIds) {
      await recomputeCostPriceExcludingRef(productId, invoice.id, tx);
    }
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
    await onStockIn(tx, { productId: line.productId, qty: line.qty, unitCost: line.landedUnitCost, source: "purchase", refId: invoice.id, stockBefore: product.stockQty });

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
 *
 * Landed costs are recomputed HERE from unitCost + the invoice's ongkos (prorateLandedCosts), never
 * taken from the caller. The edit form used to send landedUnitCost = unitCost, which silently
 * dropped the original transport/parkir/lain-lain from the invoice total, Persediaan, and every
 * item's HPP the moment anyone corrected a single qty. `additionalCost` undefined = keep the ongkos
 * the invoice already had.
 */
export async function editPurchaseInvoiceLines(
  purchaseInvoiceId: string,
  inputLines: { productId: string; qty: number; unitCost: number }[],
  additionalCost: number | undefined,
  reason: string,
  staffUserId: string | undefined
) {
  if (!inputLines.length) throw new Error("Invoice harus punya minimal 1 item.");
  for (const l of inputLines) {
    if (!l.productId || !(Number(l.qty) > 0)) throw new Error("Qty item harus lebih dari 0.");
    if (!(Number(l.unitCost) >= 0)) throw new Error("Harga beli tidak boleh negatif.");
  }
  if (additionalCost !== undefined && !(Number(additionalCost) >= 0)) throw new Error("Ongkos tidak boleh negatif.");

  const { invoice, journalId, amount, priorPayment } = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${purchaseInvoiceId}))`);

    const [before] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
    if (!before) throw new Error("Invoice tidak ditemukan.");

    const { isLegacy, additionalCost: originalAdditionalCost } = await reconstructInvoiceLines(purchaseInvoiceId, tx);
    if (isLegacy) {
      throw new Error("Invoice ini dibuat sebelum fitur koreksi tersedia dan tidak bisa diedit langsung — hanya bisa dilihat atau dibatalkan.");
    }
    const { lineBreakdown } = prorateLandedCosts(
      inputLines.map((l) => ({ productId: l.productId, qty: Number(l.qty), unitCost: Number(l.unitCost) })),
      additionalCost !== undefined ? Number(additionalCost) : (originalAdditionalCost ?? 0)
    );
    const newLines: InvoiceLineInput[] = lineBreakdown.map((l) => ({ productId: l.productId, qty: l.qty, unitCost: l.unitCost, landedUnitCost: l.landedUnitCost }));

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

/**
 * TRUE hard delete — removes an already-cancelled purchase invoice's row, its purchaseInvoiceItems,
 * its stockMovements, its purchasePayments, and every journalEntries/journalLines row tied to it
 * (the original posting AND its [VOID] reversal) from the database entirely. Nothing is left behind
 * in the live tables — this is a deliberate exception to the never-hard-delete-financial-history
 * rule used everywhere else in this codebase (voidJournal, "failed" payment status, etc.), added
 * only because the user explicitly asked for it after being shown the tradeoff (see the two
 * AskUserQuestion confirmations this was built from — including the choice to remove the ledger
 * (journal) rows too, not just the invoice).
 *
 * Restricted to owner/superuser via permanently_delete_purchase_history (deliberately narrower
 * than manage_supplier_purchase_history's 4 roles — irreversible + touches the ledger).
 *
 * Guardrails:
 * - Only allowed when the invoice is ALREADY "cancelled" (i.e. voidPurchaseInvoice ran first) —
 *   its financial effects are already fully reversed/net-zero, so removing the now-inert rows
 *   doesn't change any balance. Refuses on any other status.
 * - Refuses if any purchaseReturns row still references this invoice (rare edge case) rather than
 *   silently deleting a return's parent out from under it.
 * - A full snapshot of everything being removed is written to audit_logs BEFORE deletion — that
 *   audit_logs row is NOT deleted, so "someone permanently deleted invoice X, here's exactly what
 *   was in it" remains discoverable even though the live invoice/journal rows are gone. This is a
 *   deliberate middle ground: the user asked for the ledger rows themselves gone, not for erasing
 *   that the deletion ever happened.
 */
export async function permanentlyDeletePurchaseInvoice(purchaseInvoiceId: string, staffUserId: string | undefined) {
  const { snapshot } = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${purchaseInvoiceId}))`);

    const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
    if (!invoice) throw new Error("Invoice tidak ditemukan.");
    if (invoice.status !== "cancelled") {
      throw new Error('Hanya invoice yang sudah "dibatalkan" (Hapus biasa) yang bisa dihapus permanen. Batalkan dulu, baru bisa dihapus permanen.');
    }

    const blockingReturns = await tx.select({ id: purchaseReturns.id }).from(purchaseReturns).where(eq(purchaseReturns.purchaseInvoiceId, purchaseInvoiceId));
    if (blockingReturns.length > 0) {
      throw new Error("Invoice ini punya retur pembelian terkait — tidak bisa dihapus permanen selama retur itu masih ada.");
    }

    const items = await tx.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, purchaseInvoiceId));
    const movements = await tx.select().from(stockMovements).where(eq(stockMovements.refOrderId, purchaseInvoiceId));
    const payments = await tx.select().from(purchasePayments).where(eq(purchasePayments.purchaseInvoiceId, purchaseInvoiceId));

    // Every journal entry tied to this invoice OR any of its payments — sourceId matches invoice.id
    // (the invoice's own Dr Persediaan/Cr Hutang posting AND its [VOID] reversal, since voidJournal
    // re-uses the same sourceId) or a payment's id (Dr Hutang/Cr Kas posting + its [VOID] reversal).
    const sourceIds = [purchaseInvoiceId, ...payments.map((p) => p.id)];
    const relatedJournalEntries = await tx.select().from(journalEntries).where(inArray(journalEntries.sourceId, sourceIds));
    const journalEntryIds = relatedJournalEntries.map((j) => j.id);

    if (journalEntryIds.length > 0) {
      await tx.delete(journalLines).where(inArray(journalLines.journalEntryId, journalEntryIds));
      await tx.delete(journalEntries).where(inArray(journalEntries.id, journalEntryIds));
    }
    if (payments.length > 0) {
      await tx.delete(purchasePayments).where(eq(purchasePayments.purchaseInvoiceId, purchaseInvoiceId));
    }
    if (movements.length > 0) {
      await tx.delete(stockMovements).where(eq(stockMovements.refOrderId, purchaseInvoiceId));
    }
    if (items.length > 0) {
      await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, purchaseInvoiceId));
    }
    await tx.delete(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId));

    return { snapshot: { invoice, items, movements, payments, journalEntries: relatedJournalEntries } };
  });

  // Deliberately AFTER the transaction commits, not before/inside — logAudit always writes via
  // the plain `db` connection (it has no tx-aware variant), so calling it inside the transaction
  // above would record "permanently deleted" even if the transaction then rolled back (e.g. the
  // returns guard firing) — the audit trail must never claim a deletion happened before it
  // actually, durably did.
  await logAudit({
    outletId: snapshot.invoice.outletId,
    staffUserId,
    action: "permanently_delete_purchase_invoice",
    entityType: "purchase_invoice",
    entityId: snapshot.invoice.id,
    before: snapshot,
    after: null,
  });

  return { deletedInvoiceId: purchaseInvoiceId };
}
