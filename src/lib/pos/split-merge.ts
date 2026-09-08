import { db } from "@/db/client";
import { orders, orderItems, rentalSessions, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Proportional slices of a whole order-level figure (total/discount/tax/serviceCharge) across N
 * parts, with the LAST part absorbing whatever's left over from flooring — same remainder-
 * absorption convention already used for `total` throughout this codebase (recomputeBillTotals,
 * computeTransactionList, etc.). Pure and exported so splitOrderEvenly's exact-reconciliation
 * guarantee (every slice sums back to `whole`) is unit-tested without needing a database.
 */
export function proportionalSlices(whole: number, parts: number): number[] {
  const base = Math.floor(whole / parts);
  const rem = whole - base * parts;
  return Array.from({ length: parts }, (_, i) => (i === parts - 1 ? base + rem : base));
}

/** Throws if the order is tied to a rental session that's still running/paused — split/merge should only happen once the session has stopped and the bill is finalized. */
async function assertSessionNotActive(rentalSessionId: string | null) {
  if (!rentalSessionId) return;
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, rentalSessionId)).limit(1);
  if (session && (session.status === "running" || session.status === "paused")) {
    throw new Error("Sesi rental untuk bill ini masih berjalan — hentikan sesi dulu sebelum split/merge.");
  }
}

/**
 * Split one bill evenly across N payers (e.g. a group of friends splitting
 * the rental cost). This splits the *amount*, not the physical items —
 * splitting individual F&B items N ways rarely makes sense for a receipt —
 * but it does preserve the bill's REVENUE CLASSIFICATION (Rental/F&B/Produk/
 * Aksesoris), grouped into at most one line per category, instead of
 * collapsing everything into a single generic line.
 *
 * BUG FIXED HERE: the old version gave every split share exactly one
 * itemType:"misc" line for its whole amount. revenueAccountIdForItem()
 * (lib/accounting/postings.ts) has no explicit routing for "misc" — it falls
 * through to the SAME "other:service_charge_tax" (COA 4650, "Pendapatan
 * Lainnya") account genuine service charge/tax revenue uses. That meant the
 * ENTIRE value of every split-bill share — even a bill that was 100% Rental
 * or F&B — got booked as "Pendapatan Lainnya" once paid, silently inflating
 * that account and understating Rental/F&B/Produk revenue on Laba Rugi (and,
 * before the Transaction Center rework, misclassifying it there too). Now
 * each split share gets one line per revenue category the original bill
 * actually had (proportional to that category's share of the original
 * subtotal), so it posts to the correct account exactly like an unsplit bill
 * would. discount/tax/serviceCharge are also now carried over proportionally
 * (previously zeroed out on every split share, silently dropping them).
 */
export async function splitOrderEvenly(orderId: string, parts: number) {
  if (parts < 2) throw new Error("Split minimal 2 bagian.");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status !== "open") throw new Error("Order sudah dibayar/dibatalkan, tidak bisa displit.");
  await assertSessionNotActive(order.rentalSessionId);

  const sourceItems = (await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))).filter((i) => i.kitchenStatus !== "cancelled");
  const productIds = Array.from(new Set(sourceItems.map((i) => i.productId).filter((id): id is string => !!id)));
  const productRows = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
  const categoryByProductId = new Map(productRows.map((p) => [p.id, p.category]));

  // Grouped by the SAME classification key revenueAccountIdForItem uses to route GL revenue —
  // itemType alone for rental/accessory/misc, itemType+category for product — so a bucket here
  // always resolves to the one true account an unsplit item of that kind would have used.
  interface Bucket { itemType: "rental" | "product" | "misc" | "accessory"; productId: string | null; label: string; total: number; }
  const buckets = new Map<string, Bucket>();
  for (const it of sourceItems) {
    const category = it.productId ? categoryByProductId.get(it.productId) : undefined;
    const key = it.itemType === "product" ? `product:${category ?? "none"}` : it.itemType;
    const label =
      it.itemType === "rental" ? "Rental" :
      it.itemType === "accessory" ? "Sewa Aksesoris" :
      it.itemType === "product" ? (category ? `Produk (${category})` : "Produk") :
      "Lainnya";
    const bucket = buckets.get(key) ?? { itemType: it.itemType as Bucket["itemType"], productId: it.itemType === "product" ? it.productId : null, label, total: 0 };
    bucket.total += it.lineTotal;
    buckets.set(key, bucket);
  }
  const bucketList = Array.from(buckets.values());
  // A bill with no line items at all (shouldn't normally happen) still needs somewhere for the
  // amount to land — falls back to one "Lainnya" bucket rather than silently producing zero items.
  if (bucketList.length === 0) bucketList.push({ itemType: "misc", productId: null, label: "Lainnya", total: order.total || 1 });
  const bucketTotalSum = bucketList.reduce((s, b) => s + b.total, 0) || 1; // guards a divide-by-zero if every item is somehow Rp0

  // Applied independently per field (see proportionalSlices' own doc comment) so each one's own
  // slices sum back to exactly the original figure.
  const totalSlices = proportionalSlices(order.total, parts);
  const discountSlices = proportionalSlices(order.discount, parts);
  const taxSlices = proportionalSlices(order.tax, parts);
  const serviceChargeSlices = proportionalSlices(order.serviceCharge, parts);

  const splitGroupId = randomUUID();
  const newOrders = [];
  for (let i = 0; i < parts; i++) {
    const shareTotal = totalSlices[i];
    const shareDiscount = discountSlices[i];
    const shareTax = taxSlices[i];
    const shareServiceCharge = serviceChargeSlices[i];
    // Inverts recomputeBillTotals' own formula (total = (subtotal - discount) + tax + serviceCharge)
    // to derive this share's subtotal — guaranteed to sum back to the original subtotal exactly
    // across all parts, since each of the four slices above already sums back to its own original
    // figure independently; no separate remainder handling needed for subtotal itself.
    const shareSubtotal = shareTotal + shareDiscount - shareTax - shareServiceCharge;

    const [newOrder] = await db
      .insert(orders)
      .values({
        outletId: order.outletId,
        customerId: order.customerId,
        // Only the first split part keeps the rentalSessionId link — carrying it onto
        // every part would leave N simultaneously "open" orders pointing at the same
        // session, breaking getOpenBillForSession's "at most one open bill per session"
        // invariant used by mid-session F&B additions and the live billing board.
        rentalSessionId: i === 0 ? order.rentalSessionId : null,
        status: "open",
        subtotal: shareSubtotal,
        discount: shareDiscount,
        tax: shareTax,
        serviceCharge: shareServiceCharge,
        total: shareTotal,
        staffUserId: order.staffUserId,
        shiftId: order.shiftId,
        splitGroupId,
        source: order.source,
      })
      .returning();

    // Distribute this part's subtotal across the same revenue buckets the original bill had, in
    // proportion to each bucket's share of the ORIGINAL subtotal. The last bucket in this part
    // absorbs the rounding remainder so this order's items still sum to EXACTLY shareSubtotal —
    // required for postJournal's debit=credit balance check once this order is eventually paid.
    let allocated = 0;
    for (let b = 0; b < bucketList.length; b++) {
      const bucket = bucketList[b];
      const isLastBucket = b === bucketList.length - 1;
      const bucketShare = isLastBucket ? shareSubtotal - allocated : Math.round((bucket.total * shareSubtotal) / bucketTotalSum);
      allocated += bucketShare;
      if (bucketShare === 0 && bucketList.length > 1) continue; // skip zero-value lines when more than one category is present
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: bucket.productId,
        description: `${bucket.label} (Split ${i + 1}/${parts} dari order ${order.id.slice(0, 8)})`,
        qty: 1,
        unitPrice: bucketShare,
        lineTotal: bucketShare,
        itemType: bucket.itemType,
      });
    }
    newOrders.push(newOrder);
  }

  await db.update(orders).set({ status: "cancelled", splitGroupId }).where(eq(orders.id, orderId));

  return newOrders;
}

/** Merge several open orders (e.g. two tables joining) into a single order carrying all their line items. */
export async function mergeOrders(orderIds: string[]) {
  if (orderIds.length < 2) throw new Error("Merge butuh minimal 2 order.");
  const sourceOrders = await db.select().from(orders).where(inArray(orders.id, orderIds));
  if (sourceOrders.some((o) => o.status !== "open")) throw new Error("Semua order yang di-merge harus berstatus open.");
  for (const o of sourceOrders) await assertSessionNotActive(o.rentalSessionId);

  const allItems = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

  const subtotal = sourceOrders.reduce((s, o) => s + o.subtotal, 0);
  const discount = sourceOrders.reduce((s, o) => s + o.discount, 0);
  const tax = sourceOrders.reduce((s, o) => s + o.tax, 0);
  const serviceCharge = sourceOrders.reduce((s, o) => s + o.serviceCharge, 0);
  const total = sourceOrders.reduce((s, o) => s + o.total, 0);

  // Carry the rentalSessionId over only if exactly one source order was tied to a
  // session — a merged order can't represent two different sessions at once (single FK),
  // so ambiguous cases (two units' bills merged together) leave it unset rather than
  // silently keeping just one and losing traceability to the other.
  const distinctSessionIds = [...new Set(sourceOrders.map((o) => o.rentalSessionId).filter((id): id is string => !!id))];
  const rentalSessionId = distinctSessionIds.length === 1 ? distinctSessionIds[0] : null;

  const [merged] = await db
    .insert(orders)
    .values({
      outletId: sourceOrders[0].outletId,
      customerId: sourceOrders[0].customerId,
      rentalSessionId,
      status: "open",
      subtotal,
      discount,
      tax,
      serviceCharge,
      total,
      staffUserId: sourceOrders[0].staffUserId,
      shiftId: sourceOrders[0].shiftId,
      mergedFromOrderIds: JSON.stringify(orderIds),
      source: sourceOrders[0].source,
    })
    .returning();

  for (const item of allItems) {
    await db.insert(orderItems).values({
      orderId: merged.id,
      productId: item.productId,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      itemType: item.itemType,
      kitchenStatus: item.kitchenStatus,
    });
  }

  await db.update(orders).set({ status: "cancelled" }).where(inArray(orders.id, orderIds));

  return merged;
}
