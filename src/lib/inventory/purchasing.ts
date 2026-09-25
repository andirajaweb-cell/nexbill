import { db } from "@/db/client";
import {
  purchaseOrders,
  purchaseOrderItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  purchasePayments,
  purchaseReturns,
  products,
  stockMovements,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postPurchaseInvoiceJournal, postPurchasePaymentJournal, postPurchaseReturnJournal } from "@/lib/accounting/postings";
import { getCashBankAccountIdForPaymentMethod } from "@/lib/accounting/account-mapping";
import { lockEntity } from "@/lib/accounting/journal";
import { receiveStockForItem } from "@/lib/inventory/stock";

export interface CreatePurchaseOrderInput {
  outletId: string;
  supplierId: string;
  poNumber?: string;
  expectedDate?: string;
  notes?: string;
  items: { productId: string; qtyOrdered: number; unitCost: number }[];
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const totalAmount = input.items.reduce((s, i) => s + i.qtyOrdered * i.unitCost, 0);

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      outletId: input.outletId,
      supplierId: input.supplierId,
      poNumber: input.poNumber,
      expectedDate: input.expectedDate,
      notes: input.notes,
      totalAmount,
      status: "ordered",
    })
    .returning();

  for (const item of input.items) {
    await db.insert(purchaseOrderItems).values({ purchaseOrderId: po.id, ...item });
  }

  return po;
}

/**
 * Receive a purchase order (full or partial): bumps product stock, logs a
 * purchase_in stock movement per item, and — if `createInvoice` — creates
 * the Accounts Payable invoice and posts its journal (Dr Inventory / Cr AP)
 * for whatever was actually received.
 */
export async function receivePurchaseOrder(
  purchaseOrderId: string,
  receivedQtyByItemId: Record<string, number> | null,
  createInvoice: boolean,
  invoiceNumber?: string,
  staffUserId?: string
) {
  // Everything that mutates — received quantities, stock-in for each line, the PO's own status,
  // and the invoice with its lines — commits as one unit. Receiving a multi-line PO used to write
  // each of those separately, so a failure partway through could leave qtyReceived bumped for the
  // first items, stock added for some, and the PO still showing its old status: a state no screen
  // in the app can explain and nothing detects.
  //
  // postPurchaseInvoiceJournal stays outside for the same reason as in recordSupplierPurchase —
  // it opens its own transaction. It is idempotent and re-reads the invoice by id, so running it
  // after this commits is safe.
  const result = await db.transaction(async (tx) => {
    const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
    if (!po) throw new Error("PO tidak ditemukan.");

    const items = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

    let receivedAmount = 0;
    let anyPartial = false;
    const receivedLines: { productId: string; qty: number; unitCost: number; landedUnitCost: number }[] = [];

    for (const item of items) {
      const qtyToReceive = receivedQtyByItemId ? (receivedQtyByItemId[item.id] ?? 0) : item.qtyOrdered - item.qtyReceived;
      if (qtyToReceive <= 0) continue;

      await tx
        .update(purchaseOrderItems)
        .set({ qtyReceived: item.qtyReceived + qtyToReceive })
        .where(eq(purchaseOrderItems.id, item.id));

      // Was previously a manual stockMovements insert + stockQty update that skipped costPrice
      // entirely — receiving via PO never touched HPP/harga modal, unlike Belanja Supplier's
      // recordSupplierPurchase (below) which always goes through this same helper. Routing both
      // through receiveStockForItem keeps every stock-in path consistent: same weighted-average
      // cost rollup, same stockMovements/stockQty bookkeeping, no matter which screen received it.
      await receiveStockForItem(
        item.productId,
        qtyToReceive,
        item.unitCost,
        po.id,
        `Penerimaan PO ${po.poNumber ?? po.id.slice(0, 8)}`,
        staffUserId,
        tx
      );

      receivedAmount += qtyToReceive * item.unitCost;
      if (item.qtyReceived + qtyToReceive < item.qtyOrdered) anyPartial = true;

      // Stashed here, inserted below once we know the invoice id (a PO receipt may span several
      // invoices over time, so purchaseInvoiceItems must be tied to this specific invoice, not the
      // PO or the item). See the schema doc comment on purchaseInvoiceItems for why this exists
      // alongside purchaseOrderItems.
      receivedLines.push({ productId: item.productId, qty: qtyToReceive, unitCost: item.unitCost, landedUnitCost: item.unitCost });
    }

    const updatedItems = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
    const fullyReceived = updatedItems.every((i) => i.qtyReceived >= i.qtyOrdered);

    await tx
      .update(purchaseOrders)
      .set({ status: fullyReceived ? "received" : "partially_received" })
      .where(eq(purchaseOrders.id, purchaseOrderId));

    let invoice = null;
    if (createInvoice && receivedAmount > 0) {
      const [inv] = await tx
        .insert(purchaseInvoices)
        .values({
          outletId: po.outletId,
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
          invoiceNumber,
          amount: receivedAmount,
          status: "unpaid",
          staffUserId,
        })
        .returning();
      for (const line of receivedLines) {
        await tx.insert(purchaseInvoiceItems).values({
          purchaseInvoiceId: inv.id,
          productId: line.productId,
          qty: line.qty,
          unitCost: line.unitCost,
          landedUnitCost: line.landedUnitCost,
        });
      }
      invoice = inv;
    }

    return { po, invoice, fullyReceived: fullyReceived && !anyPartial };
  });

  if (result.invoice) await postPurchaseInvoiceJournal(result.invoice.id);

  return result;
}

/**
 * Pay (part of) a supplier invoice. Payment row, its journal, and the invoice's paidAmount commit
 * together under a lock on the invoice, with the remaining balance re-read after the lock.
 *
 * Before this, a double-clicked Bayar created two payments and two Dr Hutang / Cr Kas journals for
 * one bill (and the second write of paidAmount was computed from a stale read), and nothing stopped
 * paying more than the invoice was worth — Hutang Supplier went negative in the Neraca.
 */
export async function payPurchaseInvoice(purchaseInvoiceId: string, amount: number, method: string, cashBankAccountId: string, staffUserId?: string) {
  if (!(amount > 0)) throw new Error("Nominal pembayaran harus lebih dari 0.");
  return db.transaction(async (tx) => {
    await lockEntity(tx, `purchase_invoice:${purchaseInvoiceId}`);
    const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
    if (!invoice) throw new Error("Invoice tidak ditemukan.");
    if (invoice.status === "cancelled") throw new Error("Invoice ini sudah dibatalkan.");
    const remaining = Math.round((invoice.amount - invoice.paidAmount) * 100) / 100;
    if (amount - remaining > 1) {
      throw new Error(`Pembayaran melebihi sisa hutang invoice ini (sisa Rp${Math.max(0, remaining).toLocaleString("id-ID")}).`);
    }

    const [payment] = await tx
      .insert(purchasePayments)
      .values({ purchaseInvoiceId, amount, method, cashBankAccountId, staffUserId })
      .returning();

    const journalEntryId = await postPurchasePaymentJournal(payment.id, tx);

    const newPaidAmount = invoice.paidAmount + amount;
    await tx
      .update(purchaseInvoices)
      .set({ paidAmount: newPaidAmount, status: newPaidAmount >= invoice.amount - 1 ? "paid" : "partial" })
      .where(eq(purchaseInvoices.id, purchaseInvoiceId));

    return { ...payment, journalEntryId };
  });
}

export async function createPurchaseReturn(input: {
  outletId: string;
  purchaseInvoiceId?: string;
  supplierId: string;
  productId: string;
  qty: number;
  unitCost: number;
  reason?: string;
}) {
  // Return record + stock-out commit together: without this, a failure between them left goods
  // recorded as returned to the supplier while the stock was still counted as on hand.
  //
  // NOTE on `type: "adjustment"`: stockMovements has no dedicated purchase-return type (the enum
  // is purchase_in / sale_out / adjustment / waste), so a return is indistinguishable from a
  // manual stock correction in the movement history except by its note text. Adding a proper type
  // would touch every report that filters on it, so it is left alone deliberately rather than
  // changed in passing.
  const ret = await db.transaction(async (tx) => {
    const [row] = await tx.insert(purchaseReturns).values(input).returning();

    await tx.insert(stockMovements).values({
      productId: input.productId,
      type: "adjustment",
      qty: -Math.abs(input.qty),
      note: `Retur pembelian: ${input.reason ?? ""}`,
      staffUserId: undefined,
    });
    await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} - ${input.qty}` })
      .where(eq(products.id, input.productId));

    return row;
  });

  // Outside the transaction — postPurchaseReturnJournal opens its own, same as the other posting
  // helpers, and re-reads the return by id so it is safe to run once the rows above are committed.
  await postPurchaseReturnJournal(ret.id);
  return ret;
}

export interface SupplierPurchaseItemInput {
  productId: string;
  qty: number;
  unitCost: number; // price paid to the supplier per unit, before landed-cost proration
}

export interface RecordSupplierPurchaseInput {
  outletId: string;
  supplierId: string;
  invoiceNumber?: string;
  items: SupplierPurchaseItemInput[];
  transportCost?: number;
  parkingCost?: number;
  otherCost?: number;
  /** Most "belanja" trips are paid cash on the spot — defaults to true. Pass false to book it as payable (hutang) instead. */
  paidNow?: boolean;
  paymentMethod?: string;
  /** Explicit kas/bank source the user picked in the dropdown (see cashBankAccounts) — when given, used as-is instead of
   *  auto-resolving one from paymentMethod via getCashBankAccountIdForPaymentMethod. Lets a shop with several cash drawers
   *  or bank accounts record which one actually paid for this purchase, instead of always guessing "the" cash account. */
  cashBankAccountId?: string;
  staffUserId?: string;
}

/**
 * Prorates incidental costs (transport/parking/other) across purchase lines by each line's share of
 * the items subtotal (even split if the subtotal is 0), giving each line its landed unit cost — the
 * value that blends into products.costPrice (HPP). Shared by recordSupplierPurchase and the invoice
 * Edit flow (editPurchaseInvoiceLines) so a corrected invoice keeps its ongkos exactly the way the
 * original purchase allocated it.
 */
export function prorateLandedCosts<T extends { qty: number; unitCost: number }>(items: T[], additionalCostsTotal: number) {
  const extra = Math.max(0, additionalCostsTotal);
  const itemsSubtotal = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const lineBreakdown = items.map((item) => {
    const lineSubtotal = item.qty * item.unitCost;
    const share = itemsSubtotal > 0 ? lineSubtotal / itemsSubtotal : 1 / items.length;
    const allocatedExtra = extra * share;
    const landedLineCost = lineSubtotal + allocatedExtra;
    const landedUnitCost = landedLineCost / item.qty;
    return { ...item, lineSubtotal, allocatedExtra, landedLineCost, landedUnitCost };
  });
  return { itemsSubtotal, additionalCostsTotal: extra, grandTotal: itemsSubtotal + extra, lineBreakdown };
}

/**
 * Quick supplier purchase for finished/resale F&B products (bottled drinks,
 * packaged snacks — items with no recipe/BOM, bought ready-to-sell rather than
 * as ingredients). Unlike the formal PO → receive flow, this is a single-step
 * "already happened" purchase: it records the items, prorates transport/
 * parking/other incidental costs into each item's landed unit cost, updates
 * products.costPrice with a stock-weighted average (so HPP/COGS at sale time
 * — see computeItemCogs — reflects true landed cost, not just the supplier's
 * sticker price), and posts the accounting journal (Dr Persediaan / Cr Kas or
 * Hutang) by reusing the existing purchase-invoice/payment journal functions.
 */
export async function recordSupplierPurchase(input: RecordSupplierPurchaseInput) {
  if (!input.items.length) throw new Error("Belanja harus punya minimal 1 item.");
  for (const item of input.items) {
    if (item.qty <= 0) throw new Error("Qty item harus lebih dari 0.");
    if (item.unitCost < 0) throw new Error("Harga beli tidak boleh negatif.");
  }

  const additionalCostsTotal = Math.max(0, (input.transportCost ?? 0) + (input.parkingCost ?? 0) + (input.otherCost ?? 0));
  const { itemsSubtotal, grandTotal, lineBreakdown } = prorateLandedCosts(input.items, additionalCostsTotal);

  const invoiceNumber = input.invoiceNumber ?? `BLJ-${Date.now().toString(36).toUpperCase()}`;

  // Invoice + every line's stock-in + every line row commit together or not at all.
  //
  // Before this was a transaction, each step committed on its own: a purchase whose SECOND item
  // referenced a product that no longer existed left the invoice saved, the first item's stock
  // already added, and nothing for the rest — while the invoice still appeared in the Belanja
  // Supplier list looking perfectly normal. That is precisely the shape of "stok tidak bertambah
  // padahal belanja tercatat", and it was silent.
  //
  // Journal posting and payment stay OUTSIDE this block on purpose: postPurchaseInvoiceJournal
  // opens its own db.transaction, and nesting one inside another would turn it into a savepoint
  // whose rollback semantics are not what either function assumes. Both are separately idempotent
  // and both re-read the invoice by id, so running them after this commits is safe — and by then
  // the invoice and its stock are already consistent with each other.
  const invoice = await db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(purchaseInvoices)
      .values({
        outletId: input.outletId,
        supplierId: input.supplierId,
        invoiceNumber,
        amount: grandTotal,
        status: "unpaid",
        staffUserId: input.staffUserId,
      })
      .returning();

    for (const line of lineBreakdown) {
      await receiveStockForItem(
        line.productId,
        line.qty,
        line.landedUnitCost,
        inv.id,
        `Belanja supplier ${invoiceNumber}${additionalCostsTotal > 0 ? " (termasuk ongkos transport/parkir/lain-lain)" : ""}`,
        input.staffUserId,
        tx
      );
      await tx.insert(purchaseInvoiceItems).values({
        purchaseInvoiceId: inv.id,
        productId: line.productId,
        qty: line.qty,
        unitCost: line.unitCost,
        landedUnitCost: line.landedUnitCost,
      });
    }

    return inv;
  });

  // Dr 1200 Persediaan (grandTotal — goods + landed costs) / Cr 2000 Hutang Usaha.
  await postPurchaseInvoiceJournal(invoice.id);

  let payment = null;
  if (input.paidNow !== false) {
    const method = input.paymentMethod ?? "cash";
    const cashBankAccountId = input.cashBankAccountId || (await getCashBankAccountIdForPaymentMethod(input.outletId, method));
    // Immediately settles the payable just posted above — net effect Dr 1200 / Cr Kas,Bank.
    payment = await payPurchaseInvoice(invoice.id, grandTotal, method, cashBankAccountId, input.staffUserId);
  }

  const [finalInvoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, invoice.id)).limit(1);

  return { invoice: finalInvoice, payment, itemsSubtotal, additionalCostsTotal, grandTotal, lineBreakdown };
}
