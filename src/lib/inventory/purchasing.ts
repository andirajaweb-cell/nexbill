import { db } from "@/db/client";
import {
  purchaseOrders,
  purchaseOrderItems,
  purchaseInvoices,
  purchasePayments,
  purchaseReturns,
  products,
  stockMovements,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postPurchaseInvoiceJournal, postPurchasePaymentJournal, postPurchaseReturnJournal } from "@/lib/accounting/postings";
import { getCashBankAccountIdForPaymentMethod } from "@/lib/accounting/account-mapping";
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
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
  if (!po) throw new Error("PO tidak ditemukan.");

  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

  let receivedAmount = 0;
  let anyPartial = false;

  for (const item of items) {
    const qtyToReceive = receivedQtyByItemId ? (receivedQtyByItemId[item.id] ?? 0) : item.qtyOrdered - item.qtyReceived;
    if (qtyToReceive <= 0) continue;

    await db
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
      staffUserId
    );

    receivedAmount += qtyToReceive * item.unitCost;
    if (item.qtyReceived + qtyToReceive < item.qtyOrdered) anyPartial = true;
  }

  const updatedItems = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
  const fullyReceived = updatedItems.every((i) => i.qtyReceived >= i.qtyOrdered);

  await db
    .update(purchaseOrders)
    .set({ status: fullyReceived ? "received" : "partially_received" })
    .where(eq(purchaseOrders.id, purchaseOrderId));

  let invoice = null;
  if (createInvoice && receivedAmount > 0) {
    const [inv] = await db
      .insert(purchaseInvoices)
      .values({
        outletId: po.outletId,
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        invoiceNumber,
        amount: receivedAmount,
        status: "unpaid",
      })
      .returning();
    await postPurchaseInvoiceJournal(inv.id);
    invoice = inv;
  }

  return { po, invoice, fullyReceived: fullyReceived && !anyPartial };
}

export async function payPurchaseInvoice(purchaseInvoiceId: string, amount: number, method: string, cashBankAccountId: string, staffUserId?: string) {
  const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");

  const [payment] = await db
    .insert(purchasePayments)
    .values({ purchaseInvoiceId, amount, method, cashBankAccountId, staffUserId })
    .returning();

  const journalEntryId = await postPurchasePaymentJournal(payment.id);

  const newPaidAmount = invoice.paidAmount + amount;
  await db
    .update(purchaseInvoices)
    .set({ paidAmount: newPaidAmount, status: newPaidAmount >= invoice.amount ? "paid" : "partial" })
    .where(eq(purchaseInvoices.id, purchaseInvoiceId));

  return { ...payment, journalEntryId };
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
  const [ret] = await db.insert(purchaseReturns).values(input).returning();

  await db.insert(stockMovements).values({
    productId: input.productId,
    type: "adjustment",
    qty: -Math.abs(input.qty),
    note: `Retur pembelian: ${input.reason ?? ""}`,
    staffUserId: undefined,
  });
  await db
    .update(products)
    .set({ stockQty: sql`${products.stockQty} - ${input.qty}` })
    .where(eq(products.id, input.productId));

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
  staffUserId?: string;
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

  const itemsSubtotal = input.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const additionalCostsTotal = Math.max(0, (input.transportCost ?? 0) + (input.parkingCost ?? 0) + (input.otherCost ?? 0));
  const grandTotal = itemsSubtotal + additionalCostsTotal;

  // Prorate the incidental costs across items by their share of the items
  // subtotal (falls back to an even split if the subtotal is somehow 0).
  const lineBreakdown = input.items.map((item) => {
    const lineSubtotal = item.qty * item.unitCost;
    const share = itemsSubtotal > 0 ? lineSubtotal / itemsSubtotal : 1 / input.items.length;
    const allocatedExtra = additionalCostsTotal * share;
    const landedLineCost = lineSubtotal + allocatedExtra;
    const landedUnitCost = landedLineCost / item.qty;
    return { ...item, lineSubtotal, allocatedExtra, landedLineCost, landedUnitCost };
  });

  const invoiceNumber = input.invoiceNumber ?? `BLJ-${Date.now().toString(36).toUpperCase()}`;

  const [invoice] = await db
    .insert(purchaseInvoices)
    .values({
      outletId: input.outletId,
      supplierId: input.supplierId,
      invoiceNumber,
      amount: grandTotal,
      status: "unpaid",
    })
    .returning();

  for (const line of lineBreakdown) {
    await receiveStockForItem(
      line.productId,
      line.qty,
      line.landedUnitCost,
      invoice.id,
      `Belanja supplier ${invoiceNumber}${additionalCostsTotal > 0 ? " (termasuk ongkos transport/parkir/lain-lain)" : ""}`,
      input.staffUserId
    );
  }

  // Dr 1200 Persediaan (grandTotal — goods + landed costs) / Cr 2000 Hutang Usaha.
  await postPurchaseInvoiceJournal(invoice.id);

  let payment = null;
  if (input.paidNow !== false) {
    const method = input.paymentMethod ?? "cash";
    const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(input.outletId, method);
    // Immediately settles the payable just posted above — net effect Dr 1200 / Cr Kas,Bank.
    payment = await payPurchaseInvoice(invoice.id, grandTotal, method, cashBankAccountId, input.staffUserId);
  }

  const [finalInvoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, invoice.id)).limit(1);

  return { invoice: finalInvoice, payment, itemsSubtotal, additionalCostsTotal, grandTotal, lineBreakdown };
}
