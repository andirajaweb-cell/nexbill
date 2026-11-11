import { db } from "@/db/client";
import { stockOpnames, stockOpnameItems, products, stockMovements, journalEntries, journalLines } from "@/db/schema";
import { and, eq, sql, inArray, isNull } from "drizzle-orm";
import { autoFillLowStockPurchaseOrders } from "@/lib/inventory/auto-po";
import { postInventoryAdjustmentJournal } from "@/lib/accounting/inventory-postings";
import { getMappedAccountId } from "@/lib/accounting/account-mapping";
import { getAccountIdByCode } from "@/lib/accounting/coa";
import { lockEntity, postJournal, voidJournal, type JournalSourceType } from "@/lib/accounting/journal";
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
    // Kunci + cek status DI DALAM transaksi. Dulu status hanya dicek di luar, jadi klik "Terapkan"
    // berulang saat proses masih jalan menerapkan opname yang sama berkali-kali (data nyata:
    // OPN-95606b26 diterapkan 6x — stok bergeser 6x lipat dan 6 jurnal koreksi tercatat).
    await lockEntity(tx, `stock_opname:${stockOpnameId}`);
    const [fresh] = await tx.select({ status: stockOpnames.status }).from(stockOpnames).where(eq(stockOpnames.id, stockOpnameId)).limit(1);
    if (!fresh || fresh.status === "completed") {
      throw Object.assign(new Error("Stock opname sudah selesai diproses."), { status: 409 });
    }
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
 * Memindahkan jurnal koreksi stok LAMA dari Laba Rugi ke akun Koreksi Persediaan (ekuitas):
 *  - selisih stock opname (5310 / mapping "opname_difference"), dan
 *  - "Penyesuaian Barang" Tambah/Kurangi/Set ke jumlah (5340 / mapping "adjustment").
 * Barang rusak/waste (5320) TIDAK dipindahkan — itu memang beban. Stok tidak berubah, hanya
 * jurnalnya: jurnal lama di-void (pembalik bertanggal sama), lalu dicatat ulang dengan akun lawan
 * diganti. Idempoten: jurnal yang sudah tidak menyentuh 5310/5340 dilewati.
 */
const REPOST_MARK = " — koreksi persediaan";
const MOVED_REASON = "Dipindahkan ke Koreksi Persediaan";

/**
 * Perbaikan data (2026-11-12): tombol pindahkan yang diklik beberapa kali bersamaan dulu bisa
 * mencatat ulang jurnal yang SAMA berkali-kali (contoh nyata: OPN-95606b26 tercatat 6x Rp1.371.404),
 * sehingga Ekuitas Saldo Awal jadi minus jutaan. Untuk tiap jurnal asal yang di-void karena
 * dipindahkan, hanya boleh ada SATU catatan ulang; sisanya di-void. Idempoten.
 */
export async function removeDuplicateCorrectionReposts(outletId: string): Promise<{ voided: number; amount: number }> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.outletId, outletId), eq(journalEntries.sourceType, "inventory_adjustment"), isNull(journalEntries.reversalOfEntryId)));
  const key = (sourceId: string | null, reference: string | null, description: string) => `${sourceId ?? ""}|${reference ?? ""}|${description}`;
  const expected = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "void" && (r.voidReason ?? "").startsWith(MOVED_REASON)) {
      const k = key(r.sourceId, r.reference, r.description);
      expected.set(k, (expected.get(k) ?? 0) + 1);
    }
  }
  const reposts = new Map<string, typeof rows>();
  for (const r of rows) {
    if (r.status !== "posted" || !r.description.includes(REPOST_MARK)) continue;
    const base = r.description.slice(0, r.description.indexOf(REPOST_MARK));
    const k = key(r.sourceId, r.reference, base);
    reposts.set(k, [...(reposts.get(k) ?? []), r]);
  }
  let voided = 0;
  let amount = 0;
  for (const [k, list] of reposts) {
    const keep = Math.max(1, expected.get(k) ?? 1);
    if (list.length <= keep) continue;
    const extras = [...list].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)).slice(keep);
    for (const e of extras) {
      const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, e.id));
      await voidJournal(e.id, "Duplikat pemindahan ke Koreksi Persediaan (klik ganda)");
      voided++;
      amount += lines.reduce((s, l) => s + l.debit, 0);
    }
  }
  return { voided, amount: Math.round(amount) };
}

export async function reclassifyOpnameJournals(outletId: string): Promise<{ moved: number; amount: number; skipped: number; duplicatesVoided: number }> {
  const correctionId = await getMappedAccountId(outletId, "product", "opname_correction", "3400");
  const legacyIds = new Set([
    await getMappedAccountId(outletId, "product", "opname_difference", "5310").catch(() => ""),
    await getAccountIdByCode(outletId, "5310").catch(() => ""),
    await getMappedAccountId(outletId, "product", "adjustment", "5340").catch(() => ""),
    await getAccountIdByCode(outletId, "5340").catch(() => ""),
  ].filter((id) => id && id !== correctionId));
  if (legacyIds.size === 0) {
    const dup = await removeDuplicateCorrectionReposts(outletId);
    return { moved: 0, amount: 0, skipped: 0, duplicatesVoided: dup.voided };
  }

  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.outletId, outletId),
        eq(journalEntries.sourceType, "inventory_adjustment"),
        eq(journalEntries.status, "posted"),
        isNull(journalEntries.reversalOfEntryId)
      )
    );

  let moved = 0;
  let amount = 0;
  let skipped = 0;
  for (const entry of entries) {
    const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entry.id));
    const legacy = lines.filter((l) => legacyIds.has(l.accountId));
    if (legacy.length === 0) {
      skipped++;
      continue;
    }
    const done = await db.transaction(async (tx) => {
      // Kunci + baca ulang DI DALAM transaksi: dua klik bersamaan dulu sama-sama melihat "posted",
      // void kedua diam-diam dilewati, lalu KEDUANYA mencatat ulang → jurnal ganda.
      await lockEntity(tx, `journal:${entry.id}`);
      const [fresh] = await tx.select({ status: journalEntries.status }).from(journalEntries).where(eq(journalEntries.id, entry.id)).limit(1);
      if (!fresh || fresh.status !== "posted") return false;
      await voidJournal(entry.id, `${MOVED_REASON} (koreksi stok tidak masuk Laba Rugi)`, tx);
      const locked = await isPeriodLocked(outletId, entry.entryDate, tx);
      await postJournal(
        {
          outletId,
          entryDate: locked ? new Date().toISOString() : entry.entryDate,
          reference: entry.reference ?? undefined,
          description: `${entry.description}${REPOST_MARK}${locked ? ` (asal periode ${entry.entryDate.slice(0, 7)})` : ""}`,
          sourceType: entry.sourceType as JournalSourceType,
          sourceId: entry.sourceId ?? undefined,
          staffUserId: entry.staffUserId ?? undefined,
          lines: lines.map((l) => ({
            accountId: legacyIds.has(l.accountId) ? correctionId : l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: legacyIds.has(l.accountId) ? "Koreksi persediaan" : (l.description ?? undefined),
          })),
        },
        tx
      );
      return true;
    });
    if (!done) {
      skipped++;
      continue;
    }
    moved++;
    amount += legacy.reduce((s, l) => s + l.debit - l.credit, 0);
  }
  const dup = await removeDuplicateCorrectionReposts(outletId);
  return { moved, amount: Math.round(amount), skipped, duplicatesVoided: dup.voided };
}
