/**
 * One-off data repair: finds and voids duplicate sales/COGS journal entries created by the
 * TOCTOU race in postSalesJournal that this same change fixes (see the doc comment atop
 * postSalesJournal in src/lib/accounting/postings.ts) — two near-simultaneous calls to
 * postSalesJournal(orderId) for the same order (e.g. the overnight session-auto-stop sweep and a
 * cashier's manual payment confirmation landing within milliseconds of each other) could both
 * pass the "does a journal already exist" check before either had committed its INSERT, so both
 * posted. Confirmed in production for 2 specific orders via a manual SQL query before this fix
 * shipped; this script finds every such case across the whole table (not just those 2) and
 * reverses every duplicate past the first one with voidJournal — a proper debit/credit-reversed
 * correcting entry, never a hard delete, so the audit trail stays intact and the reversal shows
 * up in reports exactly like any other void.
 *
 * Scope, deliberately narrow: only journal_entries whose `reference` matches the EXACT pattern
 * postSalesJournal itself generates — `ORDER-{8 hex chars}` (the sales/revenue journal) or
 * `ORDER-{8 hex chars}-COGS` (its paired COGS journal) — AND that are currently `status =
 * 'posted'` AND share BOTH source_id and reference with at least one other such row. This is not
 * a generic "any duplicate (source_id, reference) pair" sweep on purpose: several other modules
 * deliberately reuse the same sourceId+reference across MULTIPLE distinct, legitimate postings for
 * one entity — most notably Home Rental (src/lib/home-rental/rentals.ts), which posts up to 5
 * separate journals (checkout, deposit, late fee, damage, deposit release) all sharing
 * sourceId=rental.id and reference=rental.rentalCode. A broader query would misidentify those as
 * "duplicates" and wrongly void real revenue. The ORDER-…/-COGS pattern is unique to
 * postSalesJournal's own idempotency key, so this can't collide with any other module's postings.
 *
 * Idempotent / safe to re-run: once a group's extras are voided, they're status='void', not
 * 'posted', so a second run finds nothing left to do for them.
 *
 * Usage:  npx tsx scripts/void-duplicate-sales-journals.ts
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { sql } from "drizzle-orm";
import { voidJournal } from "../src/lib/accounting/journal";

interface DupRow {
  id: string;
  source_id: string;
  reference: string;
  entry_date: string;
}

const REFERENCE_PATTERN = sql`reference ~ '^ORDER-[0-9a-f]{8}(-COGS)?$'`;

async function main() {
  const rows = (await db.execute(sql`
    SELECT id, source_id, reference, entry_date
    FROM journal_entries
    WHERE status = 'posted'
      AND source_id IS NOT NULL
      AND ${REFERENCE_PATTERN}
      AND (source_id, reference) IN (
        SELECT source_id, reference
        FROM journal_entries
        WHERE status = 'posted' AND ${REFERENCE_PATTERN}
        GROUP BY source_id, reference
        HAVING COUNT(*) > 1
      )
    ORDER BY source_id, reference, entry_date ASC
  `)) as unknown as DupRow[];

  if (rows.length === 0) {
    console.log("Tidak ada duplikat jurnal penjualan/HPP ditemukan.");
    return;
  }

  const byKey = new Map<string, DupRow[]>();
  for (const row of rows) {
    const key = `${row.source_id}::${row.reference}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(row);
  }

  console.log(`Ditemukan ${byKey.size} pasangan (order, reference) dengan jurnal duplikat (${rows.length} baris total).\n`);

  let voidedCount = 0;
  for (const [key, group] of byKey) {
    const [keep, ...extras] = group; // earliest entry_date kept as the canonical posting, rest voided
    console.log(`- ${key}: simpan ${keep.id} (${keep.entry_date}), batalkan ${extras.length} duplikat: ${extras.map((e) => e.id).join(", ")}`);
    for (const extra of extras) {
      await voidJournal(extra.id, "Duplikat posting otomatis (race condition postSalesJournal, sudah diperbaiki) — dibatalkan oleh script pembersihan");
      voidedCount++;
    }
  }

  console.log(`\nSelesai. ${voidedCount} jurnal duplikat dibatalkan lewat entri reversal (bukan dihapus) — riwayat lengkap tetap terlihat di halaman Jurnal.`);
}

main().catch((err) => {
  console.error("Pembersihan duplikat jurnal gagal:", err);
  process.exit(1);
});
