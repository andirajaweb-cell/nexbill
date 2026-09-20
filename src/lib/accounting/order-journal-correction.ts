import { type DbOrTx } from "@/db/client";
import { journalEntries, receivables } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { voidJournal } from "./journal";

export interface OrderJournalReversalResult {
  /** True if there was a posted sales journal entry for this order (reference `ORDER-{id8}`) —
   * tells the caller whether postSalesJournal needs to be called again after commit to rebuild it. */
  hadSalesEntry: boolean;
  /** Snapshot of the receivable row (if any) that was voided+deleted, for the caller's audit log. */
  reversedReceivable: (typeof receivables.$inferSelect & { settlementEntryIds: string[] }) | null;
}

/**
 * Shared reversal step for correctPayment (lib/accounting/payment-correction.ts),
 * correctRentalCharge (lib/rental/rental-charge-correction.ts), and deleteOrderItem
 * (lib/pos/item-correction.ts) — voids everything that needs to be voided BEFORE the caller changes
 * payments.method/amount, the rental line item amount, or removes an item, and (outside this
 * transaction) reposts via postSalesJournal. Handles the two cases those functions need:
 *
 * 1) No receivable ever existed for this order (the common case): voids EVERY still-live journal
 *    entry this order owns — the combined sales entry (reference `ORDER-{id8}`), its COGS companion
 *    (`ORDER-{id8}-COGS`), and any duplicate left behind by the historical double-posting race —
 *    via exact offsetting reversals, then renames every row still carrying the plain `ORDER-{id8}`
 *    reference so postSalesJournal's own idempotency guard (a plain `reference` lookup that ignores
 *    status) won't match and silently no-op instead of reposting. See the long note at the top of
 *    the query below for the two bugs that scoping used to have and what each one broke.
 *
 * 2) A receivable exists for this order (a partial payment / running tab, whether still open or
 *    long since fully settled): voiding ONLY the original sales entry would corrupt the Piutang
 *    Usaha (1141) account balance — that entry's Dr Piutang Usaha line gets reversed to zero, but
 *    any LATER postReceivableSettlement entries that paid it down (Cr Piutang Usaha) would still
 *    stand, driving the account negative by exactly the settled amount. So this also finds and
 *    voids every settlement entry tied to the receivable (sourceType "receivable_payment", sourceId
 *    = receivable.id), then DELETES the receivable row itself (its role is now fully superseded —
 *    every journal entry that ever referenced it has been voided, so the row represents nothing
 *    real anymore; the caller is responsible for audit-logging the returned snapshot before it's
 *    gone). Deliberately safe to do: the underlying `payments` rows that actually collected the
 *    cash are NEVER touched here, only the journal/receivable BOOKKEEPING of what they were applied
 *    to — so when the caller reposts via postSalesJournal afterward, it naturally recomputes
 *    shortfall against every still-"success" payment on the order (regardless of whether it
 *    originally went through initiatePayment or postReceivableSettlement), and creates a fresh
 *    receivable only if a real shortfall still exists against the CORRECTED total.
 */
export async function reverseOrderJournalForCorrection(tx: DbOrTx, orderId: string, reason: string): Promise<OrderJournalReversalResult> {
  const reference = `ORDER-${orderId.slice(0, 8)}`;
  const supersededSuffix = `-VOID-${Date.now()}`;

  /*
   * SEMUA jurnal order ini yang masih hidup — bukan satu, dan bukan hanya yang reference-nya persis
   * `ORDER-{id8}`.
   *
   * BUG YANG DIPERBAIKI DI SINI (2026-09-20). Versi sebelumnya:
   *
   *     .where(and(eq(sourceId, orderId), eq(reference, `ORDER-${id8}`), eq(status, "posted")))
   *     .limit(1)
   *
   * meleset di dua arah sekaligus, dan keduanya membuat "Sinkronkan Ulang Jurnal" gagal permanen —
   * tombolnya berjalan tanpa error, tapi barisnya tetap Beda Nominal berapa kali pun ditekan:
   *
   *  1. `.limit(1)` hanya membatalkan SATU entri. Doc comment postSalesJournal sendiri mencatat
   *     pernah ada race yang memposting jurnal penjualan dua kali untuk satu order (diperbaiki
   *     belakangan dengan advisory lock, tapi data yang terlanjur terbentuk tetap ada). Pada order
   *     seperti itu: satu entri dibatalkan, satu lagi tetap hidup, lalu repost menambah yang baru —
   *     nominalnya tidak akan pernah cocok, dan menekan tombolnya lagi mengulang siklus yang sama.
   *
   *  2. Penyaring `reference` yang persis sama melewatkan jurnal HPP, yang diposting
   *     postSalesJournal dengan reference `ORDER-{id8}-COGS` (postings.ts). Jurnal HPP lama tidak
   *     pernah dibatalkan, sementara repost selalu membuat yang baru — jadi setiap koreksi dan
   *     setiap klik sinkronisasi MENGGANDAKAN HPP di Laba Rugi. Ini tidak terlihat di tab
   *     Rekonsiliasi (query-nya hanya menjumlahkan akun bertipe revenue), sehingga bisa menumpuk
   *     diam-diam sampai Laba Kotor terlihat jauh lebih kecil dari yang sebenarnya.
   *
   * Penyaring yang dipakai sekarang — sourceId + sourceType rental/pos + status posted — menangkap
   * jurnal penjualan DAN jurnal HPP, berapa pun jumlahnya. Entri yang sudah pernah dibatalkan
   * otomatis tersaring lewat status. Jurnal PEMBALIK sengaja dikecualikan lewat awalan "[VOID] "
   * pada deskripsinya: membalik sebuah pembalik sama saja menghidupkan kembali entri aslinya —
   * persis kerusakan yang fungsi ini ada untuk mencegah.
   *
   * Jurnal pelunasan piutang (sourceType "receivable_payment") tetap ditangani terpisah di bawah,
   * karena sourceId-nya adalah id receivable, bukan id order.
   */
  const liveEntries = await tx
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.sourceId, orderId),
        inArray(journalEntries.sourceType, ["rental", "pos"]),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.description} not like '[VOID]%'`
      )
    );

  for (const entry of liveEntries) {
    await voidJournal(entry.id, reason, tx);
  }

  /*
   * Ganti nama SETIAP entri yang reference-nya persis `ORDER-{id8}` — apa pun statusnya.
   *
   * Penjaga idempotensi postSalesJournal (postings.ts) mencari `sourceId + reference` TANPA melihat
   * status, jadi entri asli yang sudah void maupun jurnal pembaliknya sama-sama bisa membuat repost
   * diam-diam tidak jalan. Dikerjakan setelah seluruh pembalikan di atas selesai supaya pembalik
   * yang baru dibuat (voidJournal mewarisi reference entri aslinya) ikut terganti namanya juga —
   * versi lama mencarinya satu per satu dan bisa salah menandai entri yang keliru ketika ada lebih
   * dari satu entri dengan reference yang sama.
   */
  const sameReferenceEntries = await tx
    .select({ id: journalEntries.id, status: journalEntries.status })
    .from(journalEntries)
    .where(and(eq(journalEntries.sourceId, orderId), eq(journalEntries.reference, reference)));

  // Indeks ditambahkan supaya beberapa entri yang diganti nama dalam satu panggilan tidak berakhir
  // dengan reference yang identik — tidak ada unique constraint yang melarangnya, tapi reference
  // yang kembar membuat penelusuran audit belakangan jadi ambigu tanpa alasan.
  let renameIndex = 0;
  for (const entry of sameReferenceEntries) {
    const suffix = entry.status === "posted" ? `${supersededSuffix}-REV` : supersededSuffix;
    const unique = sameReferenceEntries.length > 1 ? `-${renameIndex}` : "";
    renameIndex++;
    await tx.update(journalEntries).set({ reference: `${reference}${suffix}${unique}` }).where(eq(journalEntries.id, entry.id));
  }

  const salesEntry = liveEntries.find((e) => e.reference === reference) ?? null;

  const [receivable] = await tx.select().from(receivables).where(eq(receivables.orderId, orderId)).limit(1);
  let reversedReceivable: OrderJournalReversalResult["reversedReceivable"] = null;
  if (receivable) {
    const settlementEntries = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceId, receivable.id), eq(journalEntries.sourceType, "receivable_payment"), eq(journalEntries.status, "posted")));
    for (const entry of settlementEntries) {
      await voidJournal(entry.id, reason, tx);
    }
    reversedReceivable = { ...receivable, settlementEntryIds: settlementEntries.map((e) => e.id) };
    // Fully superseded now — every journal entry that ever referenced it (its own creation, via the
    // sales entry above, and every settlement above) has been voided. Deleting it (rather than
    // leaving a stale "open"/"paid" row nobody will ever look at again) lets the caller's fresh
    // postSalesJournal repost create a clean new receivable if — and only if — a real shortfall
    // still exists against the corrected total.
    await tx.delete(receivables).where(eq(receivables.id, receivable.id));
  }

  return { hadSalesEntry: !!salesEntry, reversedReceivable };
}
