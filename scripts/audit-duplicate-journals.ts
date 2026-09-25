/**
 * Audit + perbaikan Neraca Saldo: jurnal ganda dan selisih pembulatan.
 *
 * Latar belakang (2026-09-25): beberapa fungsi posting dulu mengecek "sudah diposting?" SEBELUM
 * transaksi dan tanpa kunci, sehingga klik ganda / retry memposting jurnal yang sama berkali-kali
 * (terbukti: expense Listrik EXP-00161 Rp1.005.000 tercatat 5x). Penyebabnya sudah diperbaiki
 * (lockEntity di lib/accounting/journal.ts); script ini membereskan data yang TERLANJUR ganda.
 *
 * Yang diperiksa:
 *   A. Jurnal ganda — lebih dari satu jurnal "posted" (bukan pembalik [VOID]) untuk satu kejadian
 *      yang seharusnya hanya punya SATU jurnal:
 *        - expense            reference EXP-xxxxx (persetujuan) dan EXP-xxxxx-PAY (pelunasan hutang)
 *        - receivable_payment reference AR-<piutang>-<pembayaran>
 *        - depreciation       reference DEP-<aset>-<periode>
 *        - asset_disposal     reference DISPOSE-<aset>
 *        - cash_transfer      satu per permintaan pindah kas (source_id)
 *      Yang DISIMPAN: jurnal yang ditunjuk oleh baris sumbernya (expenses.journal_entry_id, dst.)
 *      bila ada, selain itu yang paling awal. Sisanya dibatalkan lewat voidJournal — entri
 *      pembalik, bukan dihapus, jadi jejak audit tetap utuh.
 *      Sengaja TIDAK menyentuh home_rental/pos/ppob: modul itu sah memakai source_id+reference yang
 *      sama untuk beberapa jurnal berbeda (lihat scripts/void-duplicate-sales-journals.ts untuk pos).
 *   B. Jurnal tidak seimbang — total debit ≠ kredit (sisa pembulatan ≤ Rp1 yang dulu diloloskan
 *      postJournal). Diperbaiki dengan menambahkan selisihnya ke baris terbesar di sisi yang kurang,
 *      persis seperti yang kini dilakukan postJournal (absorbRoundingResidual) untuk jurnal baru.
 *   C. Hanya laporan: invoice supplier yang dibayar melebihi nilainya (klik Bayar ganda dulu).
 *
 * Pemakaian (DEFAULT hanya membaca dan melapor, tidak mengubah apa pun):
 *   npx tsx scripts/audit-duplicate-journals.ts                      # semua outlet, laporan saja
 *   npx tsx scripts/audit-duplicate-journals.ts --outlet=<outletId>  # satu outlet
 *   npx tsx scripts/audit-duplicate-journals.ts --apply              # jalankan perbaikan A + B
 *
 * Aman dijalankan ulang: setelah --apply, jalankan lagi tanpa --apply — hasilnya harus kosong.
 * Jurnal di periode yang sudah Tutup Periode otomatis dibalik di periode berjalan (aturan voidJournal).
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { sql } from "drizzle-orm";
import { voidJournal } from "../src/lib/accounting/journal";
import { resyncOrderJournal } from "../src/lib/accounting/reconciliation-resync";

const APPLY = process.argv.includes("--apply");
const OUTLET = process.argv.find((a) => a.startsWith("--outlet="))?.slice("--outlet=".length);

interface DupRow {
  id: string;
  outlet_id: string;
  source_type: string;
  source_id: string;
  reference: string | null;
  description: string;
  entry_date: string;
  created_at: string;
  total: number;
  canonical_id: string | null;
  /** The source row was cancelled/voided — then NONE of its journals should stay posted. */
  source_cancelled: boolean;
  sales_created_at: string | null;
}

/**
 * Which journal of a duplicate group stays posted (null = none of them).
 *  - Source cancelled → none.
 *  - Sales/HPP of an order (ORDER-…) → the NEWEST: after a correction the newest repost is the one
 *    matching the order as it is now. An HPP journal is only kept if it was posted with the live
 *    sales journal (created at/after it); older ones belong to a superseded version of the order.
 *  - Anything else → the one the source row points at, else the earliest.
 */
function pickKeeper(group: DupRow[]): DupRow | null {
  const g0 = group[0];
  if (g0.source_cancelled) return null;
  if (g0.reference?.startsWith("ORDER-")) {
    const newest = group[group.length - 1];
    if (g0.reference.endsWith("-COGS") && (!newest.sales_created_at || newest.created_at < newest.sales_created_at)) return null;
    return newest;
  }
  return group.find((g) => g.id === g0.canonical_id) ?? g0;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const outletFilter = OUTLET ? sql`AND je.outlet_id = ${OUTLET}` : sql``;

async function findDuplicates(): Promise<DupRow[]> {
  // Satu "kunci kejadian" per jurnal. cash_transfer tidak punya reference, jadi kuncinya source_id saja.
  return (await db.execute(sql`
    WITH candidates AS (
      SELECT je.*,
             CASE WHEN je.source_type = 'cash_transfer' THEN je.source_id
                  ELSE je.source_id || '::' || je.reference END AS dup_key
      FROM journal_entries je
      WHERE je.status = 'posted'
        AND je.source_id IS NOT NULL
        AND je.description NOT LIKE '[VOID]%'
        AND (
              (je.source_type = 'expense'            AND je.reference ~ '^EXP-[0-9]+(-PAY)?$')
           OR (je.source_type = 'receivable_payment' AND je.reference LIKE 'AR-%')
           OR (je.source_type = 'depreciation'       AND je.reference LIKE 'DEP-%')
           OR (je.source_type = 'asset_disposal'     AND je.reference LIKE 'DISPOSE-%')
           OR (je.source_type = 'cash_transfer')
           -- Jurnal penjualan & HPP order. HPP lama tidak pernah dibatalkan oleh koreksi/"Sinkronkan
           -- Ulang Jurnal" sebelum 2026-09-20 (lihat order-journal-correction.ts), jadi satu order
           -- bisa punya beberapa jurnal HPP yang masih hidup.
           OR (je.source_type IN ('rental', 'pos') AND je.reference ~ '^ORDER-[0-9a-f]{8}(-COGS)?$')
        )
        ${outletFilter}
    ),
    dup_keys AS (
      SELECT dup_key FROM candidates GROUP BY dup_key HAVING COUNT(*) > 1
    )
    SELECT c.id, c.outlet_id, c.source_type, c.source_id, c.reference, c.description, c.entry_date, c.created_at,
           (SELECT COALESCE(SUM(jl.debit), 0) FROM journal_lines jl WHERE jl.journal_entry_id = c.id) AS total,
           CASE
             WHEN c.source_type = 'expense' AND c.reference LIKE '%-PAY' THEN (SELECT e.payment_journal_entry_id FROM expenses e WHERE e.id = c.source_id)
             WHEN c.source_type = 'expense'        THEN (SELECT e.journal_entry_id FROM expenses e WHERE e.id = c.source_id)
             WHEN c.source_type = 'cash_transfer'  THEN (SELECT t.journal_entry_id FROM cash_transfers t WHERE t.id = c.source_id)
             WHEN c.source_type = 'asset_disposal' THEN (SELECT a.disposal_journal_entry_id FROM fixed_assets a WHERE a.id = c.source_id)
             ELSE NULL
           END AS canonical_id,
           CASE
             WHEN c.source_type = 'expense'       THEN EXISTS (SELECT 1 FROM expenses e WHERE e.id = c.source_id AND e.status = 'cancelled')
             WHEN c.source_type = 'cash_transfer' THEN EXISTS (SELECT 1 FROM cash_transfers t WHERE t.id = c.source_id AND t.status = 'void')
             ELSE false
           END AS source_cancelled,
           -- Untuk jurnal HPP: kapan jurnal penjualan yang MASIH HIDUP untuk order ini dibuat. HPP yang
           -- sah diposting dalam transaksi yang sama, jadi dibuat pada/sesudah waktu itu.
           CASE WHEN c.reference LIKE '%-COGS' THEN (
             SELECT MAX(s.created_at) FROM journal_entries s
             WHERE s.source_id = c.source_id AND s.reference = replace(c.reference, '-COGS', '') AND s.status = 'posted'
           ) END AS sales_created_at,
           c.dup_key
    FROM candidates c
    WHERE c.dup_key IN (SELECT dup_key FROM dup_keys)
    ORDER BY c.dup_key, c.created_at ASC
  `)) as unknown as (DupRow & { dup_key: string })[];
}

async function findUnbalanced() {
  return (await db.execute(sql`
    SELECT je.id, je.outlet_id, je.reference, je.description, je.status,
           ROUND(SUM(jl.debit)::numeric, 2) AS debit, ROUND(SUM(jl.credit)::numeric, 2) AS credit
    FROM journal_entries je
    JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE 1 = 1 ${outletFilter}
    GROUP BY je.id
    HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) >= 0.005
    ORDER BY je.outlet_id, je.entry_date
  `)) as unknown as { id: string; outlet_id: string; reference: string | null; description: string; status: string; debit: string; credit: string }[];
}

async function findOverpaidPurchaseInvoices() {
  const filter = OUTLET ? sql`AND pi.outlet_id = ${OUTLET}` : sql``;
  return (await db.execute(sql`
    SELECT pi.id, pi.outlet_id, pi.invoice_number, pi.amount,
           (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.purchase_invoice_id = pi.id) AS paid,
           (SELECT COUNT(*) FROM purchase_payments pp WHERE pp.purchase_invoice_id = pi.id) AS payment_count
    FROM purchase_invoices pi
    WHERE pi.status <> 'cancelled' ${filter}
      AND (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.purchase_invoice_id = pi.id) > pi.amount + 1
  `)) as unknown as { id: string; outlet_id: string; invoice_number: string | null; amount: number; paid: number; payment_count: number }[];
}

interface LinkRow {
  id: string;
  outlet_id: string;
  source_type: string;
  source_id: string | null;
  description: string;
  status: string;
  created_at: string;
  reversal_of_entry_id: string | null;
  debit: number;
  credit: number;
}

/**
 * D. Links reversal entries posted before reversal_of_entry_id existed to the entry they reverse.
 * voidJournal writes "[VOID] <original description> — <reason>" with the same source_type/source_id
 * and every line mirrored, so a match needs: same outlet + source, a voided original whose
 * description is a prefix of the reversal's, mirrored totals, and the original created first. Each
 * original is used once (earliest first). Anything ambiguous stays unlinked — unlinked entries are
 * simply still summed as before, which is always safe.
 */
async function planReversalLinks() {
  const rows = (await db.execute(sql`
    SELECT je.id, je.outlet_id, je.source_type, je.source_id, je.description, je.status, je.created_at, je.reversal_of_entry_id,
           COALESCE(SUM(jl.debit), 0)::float AS debit, COALESCE(SUM(jl.credit), 0)::float AS credit
    FROM journal_entries je
    LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE (je.status = 'void' OR (je.description LIKE '[VOID] %' AND je.reversal_of_entry_id IS NULL))
      ${outletFilter}
    GROUP BY je.id
    ORDER BY je.created_at ASC
  `)) as unknown as LinkRow[];

  const alreadyLinked = new Set(
    ((await db.execute(sql`SELECT reversal_of_entry_id AS id FROM journal_entries WHERE reversal_of_entry_id IS NOT NULL`)) as unknown as { id: string }[]).map((r) => r.id)
  );
  const key = (r: { outlet_id: string; source_type: string; source_id: string | null }, desc: string) => `${r.outlet_id}|${r.source_type}|${r.source_id ?? ""}|${desc}`;
  const originals = new Map<string, LinkRow[]>();
  for (const r of rows) {
    if (r.status !== "void" || alreadyLinked.has(r.id)) continue;
    const k = key(r, r.description);
    if (!originals.has(k)) originals.set(k, []);
    originals.get(k)!.push(r);
  }
  const used = new Set<string>();
  const links: { reversalId: string; originalId: string }[] = [];
  let unmatched = 0;
  for (const r of rows) {
    if (!r.description.startsWith("[VOID] ") || r.reversal_of_entry_id) continue;
    const rest = r.description.slice("[VOID] ".length);
    // Every " — " is a possible boundary between the original description and the void reason; try the longest prefix first.
    const cuts: number[] = [];
    for (let i = rest.indexOf(" — "); i !== -1; i = rest.indexOf(" — ", i + 1)) cuts.push(i);
    let match: LinkRow | undefined;
    for (const cut of cuts.reverse()) {
      const candidates = originals.get(key(r, rest.slice(0, cut)));
      match = candidates?.find(
        (o) => !used.has(o.id) && o.created_at <= r.created_at && Math.abs(o.debit - r.credit) < 0.02 && Math.abs(o.credit - r.debit) < 0.02
      );
      if (match) break;
    }
    if (!match) { unmatched++; continue; }
    used.add(match.id);
    links.push({ reversalId: r.id, originalId: match.id });
  }
  return { links, unmatched };
}

/**
 * E. Orders whose journals still leave a balance in Piutang Usaha (1141) although the order is fully
 * paid (or cancelled). Cause: the receivable was booked at the FIRST payment against the total at
 * that moment, then the total changed and/or the final settlement was skipped (see
 * resyncIfReceivableStale). Fix = the app's own "Sinkronkan Ulang Jurnal" (resyncOrderJournal),
 * which rebuilds the order's journals from its current total and payments.
 * Orders that are genuinely still unpaid are listed separately and left alone.
 */
async function findStaleReceivables() {
  const filter = OUTLET ? sql`AND o.outlet_id = ${OUTLET}` : sql``;
  return (await db.execute(sql`
    WITH gap AS (
      SELECT o.id AS order_id,
             COALESCE(SUM(jl.debit - jl.credit), 0)::float AS gap
      FROM orders o
      JOIN journal_entries je ON je.status = 'posted' AND je.reversal_of_entry_id IS NULL AND (
             (je.source_id = o.id AND je.source_type IN ('rental', 'pos'))
          OR (je.source_type = 'receivable_payment' AND je.source_id IN (SELECT r.id FROM receivables r WHERE r.order_id = o.id)))
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id AND a.code = '1141'
      WHERE 1 = 1 ${filter}
      GROUP BY o.id
      HAVING ABS(COALESCE(SUM(jl.debit - jl.credit), 0)) > 0.5
    )
    SELECT o.id, o.outlet_id, o.status, o.total::float AS total, g.gap,
           (SELECT COALESCE(SUM(p.amount), 0)::float FROM payments p WHERE p.order_id = o.id AND p.status = 'success') AS paid,
           (SELECT string_agg(DISTINCT p.method, '+') FROM payments p WHERE p.order_id = o.id AND p.status = 'success') AS methods
    FROM gap g JOIN orders o ON o.id = g.order_id
    ORDER BY o.created_at
  `)) as unknown as { id: string; outlet_id: string; status: string; total: number; gap: number; paid: number; methods: string | null }[];
}

/**
 * F. "Revived" cancellations: a chain root → r1 → r2 where r2 reversed the REVERSAL r1, so the root
 * is effectively back on the books even though it is still labelled "void" (struck through in the
 * UI). Caused by the pre-2026-09-20 order-correction bug that also voided reversals. For an order's
 * sales/HPP journal that has since been reposted (another live journal of the same kind exists for
 * the same order), the root is a stale duplicate: Kas/pendapatan counted twice. Fix = void the chain
 * tail (r2) so the chain is odd again and nets to zero.
 */
async function findRevivedChains() {
  const filter = OUTLET ? sql`AND e.outlet_id = ${OUTLET}` : sql``;
  return (await db.execute(sql`
    WITH RECURSIVE chain (root, id, depth) AS (
      SELECT e.id, e.id, 0 FROM journal_entries e
      WHERE e.reversal_of_entry_id IS NULL
        AND EXISTS (SELECT 1 FROM journal_entries x WHERE x.reversal_of_entry_id = e.id)
        ${filter}
      UNION ALL
      SELECT chain.root, r.id, chain.depth + 1 FROM chain JOIN journal_entries r ON r.reversal_of_entry_id = chain.id
    ),
    roots AS (SELECT root, MAX(depth) AS max_depth FROM chain GROUP BY root HAVING MAX(depth) % 2 = 0)
    SELECT o.id AS root_id, o.outlet_id, o.source_type, o.source_id, o.reference, o.description, o.entry_date,
           (SELECT COALESCE(SUM(jl.debit), 0)::float FROM journal_lines jl WHERE jl.journal_entry_id = o.id) AS total,
           (SELECT c.id FROM chain c WHERE c.root = o.id ORDER BY c.depth DESC LIMIT 1) AS tail_id,
           roots.max_depth,
           CASE WHEN o.source_type IN ('rental', 'pos') THEN EXISTS (
             SELECT 1 FROM journal_entries l
             WHERE l.source_id = o.source_id AND l.id <> o.id AND l.status = 'posted'
               AND l.reversal_of_entry_id IS NULL AND l.description NOT LIKE '[VOID]%'
               AND (l.reference LIKE '%-COGS') = (o.reference LIKE '%-COGS')
           ) ELSE false END AS superseded
    FROM roots JOIN journal_entries o ON o.id = roots.root
    ORDER BY o.entry_date
  `)) as unknown as {
    root_id: string; outlet_id: string; source_type: string; source_id: string | null; reference: string | null;
    description: string; entry_date: string; total: number; tail_id: string; max_depth: number; superseded: boolean;
  }[];
}

/** Adds the residual to the largest line on the short side — same rule as absorbRoundingResidual. */
async function fixUnbalanced(journalId: string, debit: number, credit: number) {
  const diff = Math.round((debit - credit) * 100) / 100;
  const side = diff > 0 ? "credit" : "debit";
  const [line] = (await db.execute(sql`
    SELECT id FROM journal_lines
    WHERE journal_entry_id = ${journalId} AND ${sql.raw(side)} > 0
    ORDER BY ${sql.raw(side)} DESC LIMIT 1
  `)) as unknown as { id: string }[];
  if (!line) return false;
  await db.execute(sql`UPDATE journal_lines SET ${sql.raw(side)} = ROUND((${sql.raw(side)} + ${Math.abs(diff)})::numeric, 2) WHERE id = ${line.id}`);
  return true;
}

async function main() {
  console.log(`Mode: ${APPLY ? "PERBAIKI (--apply)" : "LAPORAN SAJA (tambahkan --apply untuk memperbaiki)"}${OUTLET ? ` · outlet ${OUTLET}` : " · semua outlet"}\n`);

  // ---------- A. Jurnal ganda
  const dups = (await findDuplicates()) as (DupRow & { dup_key: string })[];
  const groups = new Map<string, (DupRow & { dup_key: string })[]>();
  for (const r of dups) {
    if (!groups.has(r.dup_key)) groups.set(r.dup_key, []);
    groups.get(r.dup_key)!.push(r);
  }
  let extraTotal = 0;
  let voided = 0;
  console.log(`A. JURNAL GANDA: ${groups.size} kejadian punya lebih dari satu jurnal.`);
  for (const group of groups.values()) {
    const keep = pickKeeper(group);
    const extras = group.filter((g) => g.id !== keep?.id);
    const extraValue = extras.reduce((s, e) => s + Number(e.total), 0);
    extraTotal += extraValue;
    const g0 = group[0];
    console.log(
      `  - [${g0.source_type}] ${g0.reference ?? g0.source_id} · "${g0.description}" · ${group.length}x @ ${rupiah(Number(g0.total))} → ${extras.length} dibatalkan (kelebihan ${rupiah(extraValue)})${keep ? "" : " · tidak ada yang dipertahankan (sumber dibatalkan / HPP dari versi order lama)"} · outlet ${g0.outlet_id}`
    );
    if (APPLY) {
      for (const extra of extras) {
        await voidJournal(extra.id, "Jurnal ganda akibat klik ganda/retry (bug sudah diperbaiki 2026-09-25) — dibatalkan oleh audit-duplicate-journals");
        voided++;
      }
    }
  }
  console.log(`  Total nilai jurnal kelebihan: ${rupiah(extraTotal)}${APPLY ? ` · ${voided} jurnal dibatalkan` : ""}\n`);

  // ---------- B. Jurnal tidak seimbang
  const unbalanced = await findUnbalanced();
  console.log(`B. JURNAL TIDAK SEIMBANG: ${unbalanced.length} jurnal.`);
  let fixed = 0;
  for (const u of unbalanced) {
    const d = Number(u.debit);
    const c = Number(u.credit);
    const diff = Math.round((d - c) * 100) / 100;
    const big = Math.abs(diff) > 1;
    console.log(`  - ${u.reference ?? u.id} [${u.status}] · "${u.description}" · debit ${d} / kredit ${c} (selisih ${diff})${big ? " ⚠ lebih dari Rp1 — TIDAK diperbaiki otomatis, periksa manual" : ""}`);
    if (APPLY && !big && (await fixUnbalanced(u.id, d, c))) fixed++;
  }
  if (APPLY) console.log(`  ${fixed} jurnal diseimbangkan.`);
  console.log("");

  // ---------- D. Tautkan jurnal pembalik lama ke jurnal aslinya
  const { links, unmatched } = await planReversalLinks();
  console.log(`D. TAUTAN PEMBALIK LAMA: ${links.length} jurnal pembalik bisa ditautkan ke jurnal aslinya${unmatched ? `, ${unmatched} tidak menemukan pasangan pasti (dibiarkan — tetap dihitung seperti sebelumnya)` : ""}.`);
  console.log("  Setelah ditautkan, pasangan batal + pembalik tidak lagi menggelembungkan kolom Debit/Kredit Neraca Saldo (saldo tidak berubah).");
  if (APPLY) {
    for (const l of links) {
      await db.execute(sql`UPDATE journal_entries SET reversal_of_entry_id = ${l.originalId} WHERE id = ${l.reversalId} AND reversal_of_entry_id IS NULL`);
    }
    console.log(`  ${links.length} tautan disimpan.`);
  }
  console.log("");

  // ---------- E. Piutang yang seharusnya sudah nol
  const stale = await findStaleReceivables();
  const fixable = stale.filter((o) => o.status === "cancelled" || o.paid >= o.total - 0.5);
  const genuine = stale.filter((o) => !fixable.includes(o));
  const fixableGap = fixable.reduce((s, o) => s + o.gap, 0);
  console.log(`E. PIUTANG PADA ORDER YANG SUDAH LUNAS/BATAL: ${fixable.length} order, total sisa piutang ${rupiah(fixableGap)}.`);
  let resynced = 0;
  for (const o of fixable) {
    console.log(`  - order ${o.id.slice(0, 8)} [${o.status}] · total ${rupiah(o.total)} · dibayar ${rupiah(o.paid)} (${o.methods ?? "-"}) · sisa piutang di jurnal ${rupiah(o.gap)}`);
    if (APPLY) {
      const r = await resyncOrderJournal(o.id, undefined);
      if (r.repostError) console.log(`    ⚠ jurnal dibalik tapi gagal diposting ulang: ${r.repostError} — tekan "Sinkronkan Ulang Jurnal" di Rekonsiliasi`);
      else resynced++;
    }
  }
  if (APPLY) console.log(`  ${resynced} order disinkronkan ulang (jurnal lama dibalik, jurnal baru sesuai total & pembayaran terkini).`);
  if (genuine.length) {
    console.log(`  Piutang yang memang belum dibayar (dibiarkan): ${genuine.length} order, ${rupiah(genuine.reduce((s, o) => s + o.gap, 0))}.`);
    for (const o of genuine) console.log(`    · order ${o.id.slice(0, 8)} [${o.status}] · total ${rupiah(o.total)} · dibayar ${rupiah(o.paid)} · piutang ${rupiah(o.gap)}`);
  }
  console.log("");

  // ---------- F. Pembatalan yang terhidupkan kembali
  const revived = await findRevivedChains();
  const fixableRevived = revived.filter((r) => r.superseded);
  console.log(`F. JURNAL DIBATALKAN TAPI TERHITUNG LAGI: ${revived.length} jurnal (pembatalannya ikut dibatalkan oleh bug koreksi order lama).`);
  let restored = 0;
  for (const r of revived) {
    console.log(
      `  - [${r.source_type}] ${r.reference ?? r.root_id} · "${r.description}" · ${rupiah(Number(r.total))} · ${r.entry_date.slice(0, 10)}${r.superseded ? " → sudah ada jurnal pengganti, pembatalan dipulihkan" : " → TIDAK ada jurnal pengganti, dibiarkan (periksa manual)"}`
    );
    if (APPLY && r.superseded) {
      await voidJournal(r.tail_id, "Memulihkan pembatalan yang terhidupkan kembali oleh bug koreksi order lama (diperbaiki 2026-09-20) — audit-duplicate-journals bagian F");
      restored++;
    }
  }
  if (APPLY) console.log(`  ${restored} pembatalan dipulihkan.`);
  if (fixableRevived.length) console.log(`  Nilai yang terhitung dobel: ${rupiah(fixableRevived.reduce((sum, r) => sum + Number(r.total), 0))} (per jurnal, termasuk Kas & pendapatan/HPP-nya).`);
  console.log("");

  // ---------- C. Invoice supplier kelebihan bayar (laporan)
  const overpaid = await findOverpaidPurchaseInvoices();
  console.log(`C. INVOICE SUPPLIER KELEBIHAN BAYAR (laporan saja): ${overpaid.length}.`);
  for (const o of overpaid) {
    console.log(`  - ${o.invoice_number ?? o.id} · nilai ${rupiah(Number(o.amount))} · dibayar ${rupiah(Number(o.paid))} dalam ${o.payment_count} pembayaran · outlet ${o.outlet_id}`);
  }
  if (overpaid.length) console.log("  → Periksa di Belanja Supplier / Hutang: pembayaran ganda perlu dibatalkan manual.");

  console.log(APPLY ? "\nSelesai. Jalankan lagi TANPA --apply untuk memastikan hasil A dan B kosong." : "\nTidak ada yang diubah.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit gagal:", err);
    process.exit(1);
  });
