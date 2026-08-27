import { db } from "@/db/client";
import { orders, orderItems, outlets, products, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deductStockForItem } from "@/lib/inventory/stock";
import { validateVoucher, consumeVoucher } from "@/lib/pos/vouchers";

export interface BillItemInput {
  productId?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
}

/**
 * Create the single unified bill for a rental session, called the moment the
 * session starts. F&B items get appended to this same order throughout the
 * session (see addItemsToBill) instead of spawning separate invoices, and
 * stopRentalSession finalizes it by inserting the rental charge line rather
 * than creating a new order.
 */
export async function openBillForSession(params: {
  outletId: string;
  customerId?: string | null;
  rentalSessionId: string;
  staffUserId?: string | null;
  shiftId?: string | null;
}) {
  const [order] = await db
    .insert(orders)
    .values({
      outletId: params.outletId,
      customerId: params.customerId,
      rentalSessionId: params.rentalSessionId,
      status: "open",
      subtotal: 0,
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      total: 0,
      staffUserId: params.staffUserId,
      shiftId: params.shiftId,
      source: "pos",
    })
    .returning();
  return order;
}

export async function getOpenBillForSession(rentalSessionId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.rentalSessionId, rentalSessionId), eq(orders.status, "open")))
    .limit(1);
  return order ?? null;
}

/** Recompute subtotal/tax/service-charge/total from current (non-cancelled) items + the bill's persisted discount/tax/service-charge settings. */
export async function recomputeBillTotals(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Bill tidak ditemukan.");

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const activeItems = items.filter((i) => i.kitchenStatus !== "cancelled");
  const subtotal = activeItems.reduce((s, i) => s + i.lineTotal, 0);

  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, order.outletId)).limit(1);
  const taxableBase = Math.max(0, subtotal - order.discount);
  const tax = order.applyTax ? Math.round((taxableBase * (outlet?.taxPercent ?? 0)) / 100) : 0;
  const serviceCharge = order.applyServiceCharge ? Math.round((taxableBase * (outlet?.serviceChargePercent ?? 0)) / 100) : 0;
  const total = Math.max(0, taxableBase + tax + serviceCharge);

  const [updated] = await db.update(orders).set({ subtotal, tax, serviceCharge, total }).where(eq(orders.id, orderId)).returning();
  return updated;
}

function kitchenStatusForCategory(category?: string | null): "new" | "served" {
  return category === "food" || category === "drink" || category === "snack" ? "new" : "served";
}

/** Add F&B (or any product) items to an already-open bill mid-session — no new invoice, stock deducts immediately. */
export async function addItemsToBill(orderId: string, items: BillItemInput[], staffUserId?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Bill tidak ditemukan.");
  if (order.status !== "open") throw new Error("Bill sudah ditutup, tidak bisa menambah item baru.");

  for (const item of items) {
    if (item.qty <= 0) throw new Error("Qty item harus lebih dari 0.");
    const lineTotal = item.qty * item.unitPrice;
    let kitchenStatus: "new" | "served" = "served";
    if (item.productId) {
      const [product] = await db.select({ category: products.category }).from(products).where(eq(products.id, item.productId)).limit(1);
      kitchenStatus = kitchenStatusForCategory(product?.category);
    }
    await db.insert(orderItems).values({
      orderId,
      productId: item.productId ?? null,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal,
      itemType: "product",
      kitchenStatus,
    });
    if (item.productId) {
      await deductStockForItem(item.productId, item.qty, orderId, staffUserId ?? undefined);
    }
  }

  return recomputeBillTotals(orderId);
}

/** Insert (first time) or update (on extend-then-stop-again edge cases) the rental charge line — called from stopRentalSession. */
export async function upsertRentalLineItem(orderId: string, params: { description: string; amount: number }) {
  const [existing] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.itemType, "rental")))
    .limit(1);

  if (existing) {
    await db
      .update(orderItems)
      .set({ description: params.description, qty: 1, unitPrice: params.amount, lineTotal: params.amount })
      .where(eq(orderItems.id, existing.id));
  } else {
    await db.insert(orderItems).values({
      orderId,
      productId: null,
      description: params.description,
      qty: 1,
      unitPrice: params.amount,
      lineTotal: params.amount,
      itemType: "rental",
      kitchenStatus: "served",
    });
  }

  return recomputeBillTotals(orderId);
}

/** Apply discount/voucher/tax/service-charge at checkout time (after the rental has stopped, before payment). */
export async function updateBillCheckoutOptions(
  orderId: string,
  opts: { discount?: number; voucherCode?: string | null; applyTax?: boolean; applyServiceCharge?: boolean }
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Bill tidak ditemukan.");

  let discount = opts.discount ?? order.discount;
  let voucherId = order.voucherId;

  if (opts.voucherCode) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const subtotalNow = items.filter((i) => i.kitchenStatus !== "cancelled").reduce((s, i) => s + i.lineTotal, 0);
    const validation = await validateVoucher(order.outletId, opts.voucherCode, subtotalNow, order.customerId);
    if (!validation.valid) throw new Error(validation.reason);
    voucherId = validation.voucher!.id;
    discount = (opts.discount ?? 0) + validation.discountAmount;
    await consumeVoucher(voucherId);
  }

  await db
    .update(orders)
    .set({
      discount,
      voucherId,
      applyTax: opts.applyTax ?? order.applyTax,
      applyServiceCharge: opts.applyServiceCharge ?? order.applyServiceCharge,
    })
    .where(eq(orders.id, orderId));

  return recomputeBillTotals(orderId);
}

export interface BillBreakdown {
  order: typeof orders.$inferSelect;
  items: (typeof orderItems.$inferSelect)[];
  rentalSubtotal: number;
  fnbSubtotal: number;
  miscSubtotal: number;
  accessorySubtotal: number;
  fnbItemCount: number;
  payments: (typeof payments.$inferSelect)[];
  paidTotal: number;
  balanceDue: number;
}

/** Full bill view used by the invoice screen and the live billing board — subtotals split by Rental vs F&B vs accessory vs misc, plus payment/split-payment status. */
export async function getBillBreakdown(orderId: string): Promise<BillBreakdown | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const activeItems = items.filter((i) => i.kitchenStatus !== "cancelled");

  const rentalSubtotal = activeItems.filter((i) => i.itemType === "rental").reduce((s, i) => s + i.lineTotal, 0);
  const fnbSubtotal = activeItems.filter((i) => i.itemType === "product").reduce((s, i) => s + i.lineTotal, 0);
  const miscSubtotal = activeItems.filter((i) => i.itemType === "misc").reduce((s, i) => s + i.lineTotal, 0);
  const accessorySubtotal = activeItems.filter((i) => i.itemType === "accessory").reduce((s, i) => s + i.lineTotal, 0);
  const fnbItemCount = activeItems.filter((i) => i.itemType === "product").length;

  const orderPayments = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const paidTotal = orderPayments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, Math.round((order.total - paidTotal) * 100) / 100);

  return { order, items, rentalSubtotal, fnbSubtotal, miscSubtotal, accessorySubtotal, fnbItemCount, payments: orderPayments, paidTotal, balanceDue };
}
