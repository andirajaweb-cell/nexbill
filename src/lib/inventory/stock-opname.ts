import { db } from "@/db/client";
import { stockOpnames, stockOpnameItems, products, stockMovements, journalEntries, journalLines } from "@/db/schema";
import { and, eq, sql, inArray, isNull } from "drizzle-orm";
import { autoFillLowStockPurchaseOrders } from "@/lib/inventory/auto-po";
import { postInventoryAdjustmentJournal } from "@/lib/accounting/inventory-postings";
import { getMappedAccountId } from "@/lib/accounting/account-mapping";
import { postJournal, voidJournal, type JournalSourceType } from "@/lib/accounting/journal";
import { isPeriodLocked } from "@/lib/accounting/periods";
import { isStockTracked } from "./stock-tracking-rules";

// PARALLEL_CHUNK_SIZE used to live here, bounding how many stock updates ran per Promise.all
// batch. completeStockOpname now applies them sequentially inside a single transaction instead —
// a transaction holds one connection, so batching across it gained nothing while making a partial
// failure possible. See that function's comment for why correctness won over the speed.

export interface CreateStockOpnameInput {
  outletId: string;
  warehouseId?: string;
  staffUserId?: string;
  items: { productId: string; actualQty: number }[];
}

/** Snapshot current system stock vs. counted actual stock — differences are applied when the opname is completed. */
export async function createStockOpname(input: CreateStockOpnameInput) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw Object.assign(new Error("Belum ada produk yang dihitung."), { status: 400 });
  for (const item of input.items) {
    if (!Number.isInteger(item.actualQty) || item.actualQty < 0) {
      throw Object.assign(new Error("Hasil hitung fisik harus bilangan bulat 0 atau lebih."), { status: 400 });
    }
  }
  const [opname] = await db
    .insert(stockOpnames)
    .values({ outletId: input.outletId, warehouseId: input.warehouseId, staffUserId: input.staffUserId, status: "draft" })
    .returning();

  // Was one SELECT + one INSERT per counted product, sequentially — a full-catalog physical
  // count did 2x the SKU count in round trips. Now one batch SELECT (inArray) to snapshot
  // current system stock, then a single bulk INSERT for every counted line.
  const productIds = input.items.map((i) => i.productId);
  const productRows = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
  const stockQtyById = new Map(productRows.map((p) => [p.id, p.stockQty]));
  const untracked = productRows.filter((p) => !isStockTracked(p));
  if (untracked.length > 0) {
    throw Object.assign(new Error(`Produk tidak dilacak stoknya tidak ikut stock opname: ${untracked.map((p) => p.name).join(", ")}.`), { status: 400 });
  }
  if (productRows.length !== new Set(productIds).size || productRows.some((p) => p.outletId !== input.outletId)) {
    throw Object.assign(new Error("Ada produk yang tidak ditemukan di outlet ini."), { status: 400 });
  }

  const rows = input.items.map((item) => {
    const systemQty = stockQtyById.get(item.productId) ?? 0;
    return {
      stockOpnameId: opname.id,
      productId: item.productId,
      systemQty,
      actualQty: item.actualQty,
      differenceQty: item.actualQty - systemQty,
    };
  });
  if (rows.length > 0) await db.insert(stockOpnameItems).values(rows);

  return opname;
}

/** Apply the counted differences to actual stock (adjustment stock movements) and lock the opname. */
export async function completeStockOpname(stockOpnameId: string) {
  const [opname] = await db.select().from(stockOpnames).where(eq(stockOpnames.id, stockOpnameId)).limit(1);
  if (!opname) throw new Error("Stock opname tidak ditemukan.");
  if (opname.status === "completed") throw new Error("Stock opname sudah selesai diproses.");

  const items = await db.select().from(stockOpnameItems).where(eq(stockOpnameItems.stockOpnameId, stockOpnameId));
  const changed = items.filter((i) => i.differenceQty !== 0);

  /*
   * Movements, every per-product adjustment, and the opname's own "completed" flag all commit as
   * one unit — and that flag is what makes this safe to retry.
   *
   * The previous version applied each piece separately, which created a genuinely dangerous
   * failure mode: if it died partway through the per-product updates, some products had already
   * been adjusted but the opname was still marked in-progress. The guard at the top of this
   * function only rejects an opname already marked "completed", so a staff member simply clicking
   * "Selesaikan" again would sail past it and apply the SAME differences a second time to the
   * products that had succeeded. A stock count that silently double-corrects is worse than one
   * that fails outright, because nothing about the result looks wrong.
   *
   * The per-product updates run sequentially here rather than chunked-parallel as before: a
   * transaction runs on a single connection, so Promise.all across it buys nothing and risks
   * interleaving. Stock opname is an occasional operation over a catalog of at most a few hundred
   * products — correctness is worth far more than the milliseconds this gives up.
   */
  const updatedOpname = await db.transaction(async (tx) => {
    // stockMovements rows are independent of each other — one bulk insert instead of N.
    if (changed.length > 0) {
      await tx.insert(stockMovements).values(
        changed.map((item) => ({
          productId: item.productId,
          // Selalu "adjustment": dulu kekurangan dicatat sebagai "waste", sehingga selisih hitung
          // ikut muncul sebagai barang rusak di Laporan Inventori.
          type: "adjustment" as const,
          qty: item.differenceQty,
          note: `Stock opname ${new Date(opname.opnameDate).toLocaleDateString("id-ID")}`,
          staffUserId: opname.staffUserId,
        }))
      );
    }

    // Each product has its own delta, so this can't collapse into a single statement without a
    // hand-rolled SQL CASE.
    for (const item of changed) {
      await tx
        .update(products)
        .set({ stockQty: sql`${products.stockQty} + ${item.differenceQty}` })
        .where(eq(products.id, item.productId));
    }

    // Nilai selisih (harga modal) dikoreksi ke Persediaan dalam transaksi yang sama, lawannya akun
    // ekuitas "Koreksi Persediaan" (bawaan 3400) — sejak 2026-11-11 TIDAK masuk Laba Rugi (lihat
    // CONTRA.opname di inventory-postings.ts). Periode tertutup membuat postJournal gagal sehingga
    // seluruh opname dibatalkan, bukan setengah jalan.
    await postInventoryAdjustmentJournal(
      {
        outletId: opname.outletId,
        reason: "opname",
        lines: changed.map((item) => ({ productId: item.productId, qtyDelta: item.differenceQty })),
        reference: `OPN-${opname.id.slice(0, 8)}`,
        description: `Selisih stock opname ${new Date(opname.opnameDate).toLocaleDateString("id-ID")}`,
        sourceId: opname.id,
        staffUserId: opname.staffUserId ?? undefined,
      },
      tx
    );

    const [row] = await tx.update(stockOpnames).set({ status: "completed" }).where(eq(stockOpnames.id, stockOpnameId)).returning();
    return row;
  });

  // A physical count can easily reveal a product is lower than the system thought — check
  // whether anything just crossed its minimum stock now that the correction is applied.
  await autoFillLowStockPurchaseOrders(opname.outletId);

  return { opname: updatedOpname, itemsApplied: items.filter((i) => i.differenceQty !== 0).length };
}

/**
 * Memindahkan jurnal selisih stock opname LAMA (yang dulu dibebankan ke 5310 Kerugian Stock Opname
 * / akun mapping "opname_difference") ke akun Koreksi Persediaan (ekuitas). Stok tidak berubah —
 * hanya jurnalnya: jurnal lama di-void (pembalik bertanggal sama), lalu dicatat ulang dengan akun
 * lawan diganti. Idempoten: jurnal yang sudah memakai akun koreksi dilewati.
 */
export async function reclassifyOpnameJournals(outletId: string): Promise<{ moved: number; amount: number; skipped: number }> {
  const opnames = await db
    .select({ id: stockOpnames.id })
    .from(stockOpnames)
    .where(and(eq(stockOpnames.outletId, outletId), eq(stockOpnames.status, "completed")));
  if (opnames.length === 0) return { moved: 0, amount: 0, skipped: 0 };

  const correctionId = await getMappedAccountId(outletId, "product", "opname_correction", "3400");
  const inventoryId = await getMappedAccountId(outletId, "product", "inventory", "1161");
  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.outletId, outletId),
        eq(journalEntries.sourceType, "inventory_adjustment"),
        eq(journalEntries.status, "posted"),
        isNull(journalEntries.reversalOfEntryId),
        inArray(journalEntries.sourceId, opnames.map((o) => o.id))
      )
    );

  let moved = 0;
  let amount = 0;
  let skipped = 0;
  for (const entry of entries) {
    const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entry.id));
    const contra = lines.filter((l) => l.accountId !== inventoryId && l.accountId !== correctionId);
    if (contra.length === 0) {
      skipped++;
      continue;
    }
    await db.transaction(async (tx) => {
      await voidJournal(entry.id, "Dipindahkan ke Koreksi Persediaan (stock opname tidak masuk Laba Rugi)", tx);
      const locked = await isPeriodLocked(outletId, entry.entryDate, tx);
      await postJournal(
        {
          outletId,
          entryDate: locked ? new Date().toISOString() : entry.entryDate,
          reference: entry.reference ?? undefined,
          description: `${entry.description} — koreksi persediaan${locked ? ` (asal periode ${entry.entryDate.slice(0, 7)})` : ""}`,
          sourceType: entry.sourceType as JournalSourceType,
          sourceId: entry.sourceId ?? undefined,
          staffUserId: entry.staffUserId ?? undefined,
          lines: lines.map((l) => ({
            accountId: l.accountId === inventoryId ? l.accountId : correctionId,
            debit: l.debit,
            credit: l.credit,
            description: l.accountId === inventoryId ? (l.description ?? undefined) : "Koreksi persediaan (stock opname)",
          })),
        },
        tx
      );
    });
    moved++;
    amount += contra.reduce((s, l) => s + l.debit - l.credit, 0);
  }
  return { moved, amount: Math.round(amount), skipped };
}
