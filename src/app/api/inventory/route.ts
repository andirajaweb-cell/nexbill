import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { stockMovements, products } from "@/db/schema";
import { eq, sql, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { receiveStockForItem } from "@/lib/inventory/stock";
import { autoFillLowStockPurchaseOrders } from "@/lib/inventory/auto-po";
import { postInventoryAdjustmentJournal } from "@/lib/accounting/inventory-postings";
import { onStockIn, onStockOut } from "@/lib/inventory/costing";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // stock_movements has no outletId column of its own — scope it via the linked product's outlet.
    const outletProducts = await db.select({ id: products.id }).from(products).where(eq(products.outletId, session.outletId));
    const outletProductIds = outletProducts.map((p) => p.id);
    const rows = outletProductIds.length
      ? await db.select().from(stockMovements).where(inArray(stockMovements.productId, outletProductIds)).orderBy(desc(stockMovements.createdAt)).limit(200)
      : [];
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Record a stock movement and update the product's stockQty. Backs the "Penyesuaian Barang"
 * tool on the Produk tab (Tambah Unit / Kurang Unit / Set ke Jumlah Tertentu — see
 * ProductAdjustmentModal in app/dashboard/inventory/page.tsx), which is deliberately a pure
 * quantity tool with no purchase-cost input: any stock movement that should affect HPP/harga
 * modal (costPrice) belongs in Belanja Supplier or Purchase Order → Terima Barang instead, both
 * of which already go through receiveStockForItem. `unitCost`/`purchase_in` are still accepted
 * here for any other caller that genuinely needs the old costed-restock behavior, but the
 * current UI never sends them anymore.
 *
 * After applying the movement, checks whether this product (or any other) just crossed its
 * minimum stock and, if so, auto-fills a draft PO for its preferred supplier — see
 * lib/inventory/auto-po.ts. Runs on every call rather than only on decreases since it's a cheap,
 * idempotent check and this route is only hit from manual admin/staff actions, never the
 * high-frequency POS checkout path.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const { productId, type, qty, note, staffUserId, unitCost } = await req.json();

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product || product.outletId !== session.outletId) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

    if (type === "purchase_in" && Number(unitCost) > 0) {
      await receiveStockForItem(productId, Math.abs(qty), Number(unitCost), `manual-restock-${Date.now()}`, note ?? "Restock manual", staffUserId);
      const [movement] = await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(1);
      await autoFillLowStockPurchaseOrders(session.outletId);
      return NextResponse.json(movement);
    }

    // purchase_in/sale_out/waste always have a fixed sign (waste is always a decrease, by
    // definition). "adjustment" is the one type whose qty arrives already signed by the caller —
    // positive for Tambah Unit or a Set-ke-Jumlah-Tertentu that increased stock, negative for
    // Kurang Unit (reason: Penyesuaian/Selisih) or a Set that decreased stock — which is what
    // lets a single "Kurang Unit" action send a negative delta straight through.
    const delta =
      type === "purchase_in" ? Math.abs(qty) : type === "sale_out" || type === "waste" ? -Math.abs(qty) : Number(qty);

    // Movement, stock change, and its Persediaan journal commit together. The journal used to be
    // missing entirely, so a Kurangi Unit for broken stock lowered the count but never booked the
    // loss, and Persediaan in the Neraca drifted away from the real stock value.
    const movement = await db.transaction(async (tx) => {
      // Adjustment/waste move FIFO layers inside postInventoryAdjustmentJournal below; the other
      // (journal-less) manual types must keep them in step here.
      let fifoUnitCost: number | null = null;
      if (type === "sale_out") fifoUnitCost = (await onStockOut(tx, { productId, qty: Math.abs(delta) }))?.unitCost ?? null;
      if (type === "purchase_in") await onStockIn(tx, { productId, qty: Math.abs(delta), source: "adjustment" });
      const [row] = await tx
        .insert(stockMovements)
        .values({ productId, type, qty: delta, note, staffUserId, unitCost: fifoUnitCost })
        .returning();

      await tx
        .update(products)
        .set({ stockQty: sql`${products.stockQty} + ${delta}` })
        .where(eq(products.id, productId));

      if (type === "adjustment" || type === "waste") {
        await postInventoryAdjustmentJournal(
          {
            outletId: session.outletId,
            reason: type === "waste" ? "damaged" : "adjustment",
            lines: [{ productId, qtyDelta: delta }],
            reference: `ADJ-${row.id.slice(0, 8)}`,
            description: `${type === "waste" ? "Barang rusak/waste" : "Penyesuaian stok"} — ${product.name} (${delta > 0 ? "+" : ""}${delta})${note ? `: ${note}` : ""}`,
            sourceId: row.id,
            staffUserId: session.sub,
          },
          tx
        );
      }
      return row;
    });

    await autoFillLowStockPurchaseOrders(session.outletId);

    return NextResponse.json(movement);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
