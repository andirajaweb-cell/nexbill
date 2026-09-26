import { db, type DbOrTx } from "@/db/client";
import { journalEntries, journalLines } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAccountIdByCode, assertPostableAccountIds } from "./coa";
import { isPeriodLocked, periodLabel } from "./periods";

export type JournalSourceType =
  | "rental"
  | "pos"
  | "purchase_invoice"
  | "purchase_payment"
  | "purchase_return"
  | "expense"
  | "refund"
  | "asset_purchase"
  | "asset_purchase_payment"
  | "historical_import"
  | "asset_disposal"
  | "depreciation"
  | "receivable_payment"
  | "manual"
  | "opening_balance"
  | "ppob"
  | "other_income"
  | "home_rental"
  | "membership_fee"
  | "cash_deposit"
  | "cash_transfer"
  | "inventory_adjustment";

export interface JournalLineInput {
  /** Either accountCode (COA code, resolved automatically) or a raw accountId. */
  accountCode?: string;
  accountId?: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface PostJournalInput {
  outletId: string;
  entryDate?: string;
  reference?: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  staffUserId?: string;
  /** Only voidJournal sets this: the entry this one reverses. */
  reversalOfEntryId?: string;
  lines: JournalLineInput[];
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface JournalBalanceCheck {
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

/**
 * Pure balance check for a resolved set of journal lines — no DB access, so it's the one piece of
 * postJournal's core invariant ("every Journal Entry must balance: total debit = total credit")
 * that's directly unit-testable without a database. Extracted for Task #63's test suite; postJournal
 * below uses this same function so the tested logic and the enforced logic can never drift apart.
 * The 1-rupiah tolerance absorbs floating-point rounding noise across many lines, not real
 * imbalance — see journal.test.ts for the boundary cases this is meant to (and isn't meant to) allow.
 */
export function computeJournalBalance(lines: { debit?: number; credit?: number }[]): JournalBalanceCheck {
  const totalDebit = round(lines.reduce((s, l) => s + round(l.debit ?? 0), 0));
  const totalCredit = round(lines.reduce((s, l) => s + round(l.credit ?? 0), 0));
  return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) <= 1 };
}

/**
 * Serializes concurrent work on ONE entity (an expense, a transfer, a journal being voided...) for
 * the rest of the caller's transaction: a second caller for the same key blocks here until the
 * first commits, then re-reads the entity and sees it already processed. This is the guard that
 * stops a double-clicked Approve/Bayar/Void from posting the same journal twice — a status check
 * done BEFORE the transaction can't do that, because both clicks read "not yet posted" before
 * either commits. Released automatically at commit/rollback. Must be called inside a transaction.
 */
export async function lockEntity(tx: DbOrTx, key: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}

/**
 * Pure: moves a sub-rupiah rounding residual (|debit − credit| ≤ 1, as allowed by
 * computeJournalBalance) onto the largest line of the short side, so the lines that get STORED
 * balance exactly. Without this, each journal could carry up to Rp1 of imbalance and those
 * residuals accumulated into a Neraca Saldo that never tied out ("TIDAK BALANCE" by a few rupiah).
 */
export function absorbRoundingResidual<T extends { debit: number; credit: number }>(lines: T[]): T[] {
  const { totalDebit, totalCredit } = computeJournalBalance(lines);
  const diff = round(totalDebit - totalCredit);
  if (diff === 0) return lines;
  const side: "debit" | "credit" = diff > 0 ? "credit" : "debit";
  let target = -1;
  lines.forEach((l, i) => {
    if (l[side] > 0 && (target === -1 || l[side] > lines[target][side])) target = i;
  });
  if (target === -1) return lines;
  return lines.map((l, i) => (i === target ? { ...l, [side]: round(l[side] + Math.abs(diff)) } : l));
}

/**
 * Post a balanced double-entry journal. Throws if debits != credits (within
 * a 1-rupiah rounding tolerance) — this is the single gate that keeps the
 * whole ledger internally consistent, so every caller in postings.ts routes
 * through here rather than writing journal_lines directly.
 *
 * Atomicity (Task #61): the journalEntries insert and the journalLines bulk insert below must
 * never partially succeed — a header row with no lines (or lines with no header) silently
 * corrupts the ledger (unbalanced by construction, but invisible until someone runs a Trial
 * Balance and finds it doesn't tie out). `dbc` lets a caller that already opened its own
 * `db.transaction()` (e.g. postSalesJournal doing payment updates + this + a receivable insert
 * as one all-or-nothing unit) pass its `tx` through so both inserts join that outer transaction;
 * if postJournal is called standalone (the still-common case — most postings.ts functions are
 * single-journal, e.g. postExpenseJournal/postAssetPurchase/postDepreciation), it opens its own
 * local transaction so the entry+lines pair is atomic even with no wrapping caller.
 */
export async function postJournal(input: PostJournalInput, dbc: DbOrTx = db): Promise<string> {
  const entryDate = input.entryDate ?? new Date().toISOString();

  // Task #62 (period locking): "accounting period yang sudah ditutup tidak boleh menerima
  // posting baru." Checked here — the single choke point every posting function in the app
  // routes through — so it's enforced everywhere with zero risk of some other posting path
  // forgetting the check. A backdated correction into a closed period must go through
  // reopenPeriod() first (owner/superuser only); the normal fix is to post the correction with
  // today's date instead, landing in the current open period.
  //
  // voidJournal() used to get that behaviour by never passing entryDate at all, so every reversal
  // fell through to today's date. That over-applied the rule: it also re-dated reversals whose
  // original period was perfectly open, which produced negative revenue lines in Laba Rugi (see
  // the long note in voidJournal). It now passes the original entry's date and only falls back to
  // today when that period is genuinely locked — same intent, correctly scoped.
  if (await isPeriodLocked(input.outletId, entryDate, dbc)) {
    throw new Error(
      `Periode ${periodLabel(entryDate.slice(0, 7))} sudah ditutup — tidak bisa posting jurnal baru ke periode ini ("${input.description}"). Buka kembali periode tersebut dulu jika benar-benar perlu, atau posting koreksi dengan tanggal hari ini.`
    );
  }

  const resolvedLines = await Promise.all(
    input.lines.map(async (line) => {
      const accountId = line.accountId ?? (await getAccountIdByCode(input.outletId, line.accountCode!, dbc));
      return {
        accountId,
        debit: round(line.debit ?? 0),
        credit: round(line.credit ?? 0),
        description: line.description,
      };
    })
  );

  // Guards lines that resolved via a raw accountId (e.g. cash/bank GL lookups)
  // rather than accountCode — getAccountIdByCode already checked the latter.
  await assertPostableAccountIds(resolvedLines.map((l) => l.accountId), dbc, input.outletId);

  const { totalDebit, totalCredit, balanced } = computeJournalBalance(resolvedLines);

  if (!balanced) {
    throw new Error(
      `Journal tidak balance: total debit ${totalDebit} != total kredit ${totalCredit} (${input.description})`
    );
  }
  const balancedLines = absorbRoundingResidual(resolvedLines);

  const write = async (exec: DbOrTx) => {
    const [entry] = await exec
      .insert(journalEntries)
      .values({
        outletId: input.outletId,
        entryDate,
        reference: input.reference,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        staffUserId: input.staffUserId,
        reversalOfEntryId: input.reversalOfEntryId,
        status: "posted",
      })
      .returning();

    // Bulk insert instead of one row per line — postJournal is the single hottest write path in
    // the app (every POS sale, rental checkout, expense/purchase payment, and historical import
    // row all route through here), so the sequential per-line await here was the same N+1 pattern
    // already fixed in coa.ts/account-mapping.ts, just on a much busier path.
    const rows = balancedLines
      .filter((line) => line.debit !== 0 || line.credit !== 0) // skip zero-amount lines
      .map((line, order) => ({
        journalEntryId: entry.id,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        lineOrder: order,
      }));
    if (rows.length > 0) await exec.insert(journalLines).values(rows);

    return entry.id;
  };

  if (dbc === db) return db.transaction((tx) => write(tx));
  return write(dbc);
}

/**
 * Tanggal yang harus dipakai jurnal pembalik, MURNI — tanpa database, agar aturannya bisa diuji
 * langsung. Dipisahkan karena aturan inilah yang dulu salah dan menghasilkan pendapatan negatif di
 * Laba Rugi; lihat catatan panjang di voidJournal di bawah.
 *
 * Aturannya: ikut tanggal jurnal asli, supaya keduanya saling meniadakan di periode yang sama.
 * Hanya kalau periode asal sudah ditutup barulah pembalik mundur ke tanggal hari ini — dengan
 * keterangan eksplisit, karena dalam kasus itu pendapatan negatif di periode berjalan memang tidak
 * terhindarkan dan pemilik berhak tahu asal-usulnya tanpa harus menebak.
 */
export function resolveReversalEntryDate(
  originalEntryDate: string,
  originalPeriodLocked: boolean,
  now: string = new Date().toISOString()
): { entryDate: string; lockedNote: string } {
  if (!originalPeriodLocked) return { entryDate: originalEntryDate, lockedNote: "" };
  return {
    entryDate: now,
    lockedNote: ` — periode asal (${periodLabel(originalEntryDate.slice(0, 7))}) sudah ditutup, pembalik dicatat di periode berjalan`,
  };
}

/**
 * Void a journal entry by posting the exact reverse — never mutates/deletes posted history.
 * Atomic (Task #61): the reversal entry (posted via postJournal above) and the status flip on
 * the original entry happen in one transaction, so a crash between the two can never leave a
 * reversal posted without its original marked void (computeTrialBalance would then double-count
 * neither, since void-status is just a label it deliberately still sums — but reports that DO
 * filter status='posted', like an audit export, would silently miss that this entry was reversed)
 * or an original marked void with no reversal actually on the books (a real double-loss of
 * revenue with no reversing entry to explain it).
 */
export async function voidJournal(journalEntryId: string, reason: string, dbc: DbOrTx = db) {
  const run = async (tx: DbOrTx) => {
    // Lock + re-read INSIDE the transaction. The status check used to happen before it, so two
    // concurrent voids of the same journal (double-clicked Batalkan, a retry) both saw "posted"
    // and both posted a reversal — reversing the entry twice and leaving the ledger wrong the
    // other way. Now the second caller waits, then sees "void" and does nothing.
    await lockEntity(tx, `journal:${journalEntryId}`);
    const [entry] = await tx.select().from(journalEntries).where(eq(journalEntries.id, journalEntryId)).limit(1);
    if (!entry || entry.status === "void") return;
    const lines = await tx.select().from(journalLines).where(eq(journalLines.journalEntryId, journalEntryId));

    /*
     * Pembalik memakai entryDate JURNAL ASLINYA, bukan tanggal hari ini.
     *
     * BUG YANG DIPERBAIKI DI SINI (2026-09-20). Sebelumnya `entryDate` tidak pernah diteruskan ke
     * postJournal, sehingga jatuh ke nilai default kolomnya (nowIso) — pembalik selalu bertanggal
     * hari ini. Untuk transaksi yang dibatalkan pada hari yang sama, kebetulan tidak ada yang
     * terlihat salah. Tapi begitu sebuah penjualan dari hari sebelumnya dibatalkan, hasilnya dua
     * laporan yang dua-duanya bohong:
     *
     *   - Laba Rugi hari asal tetap menampilkan pendapatan penuh, seolah pembatalan tidak pernah
     *     terjadi.
     *   - Laba Rugi hari ini menampilkan PENDAPATAN NEGATIF — baris seperti "Rental PS 3
     *     Rp-2.500" pada laporan 20/9/2026, yang secara akuntansi tidak punya arti sama sekali.
     *
     * Ini juga diam-diam membatalkan jaminan yang ditulis di doc comment computeTrialBalance
     * ("keduanya harus dijumlahkan agar saling meniadakan dengan bersih"): keduanya hanya bisa
     * saling meniadakan kalau berada dalam periode yang sama. Dengan tanggal asli dipakai di sini,
     * pembatalan menjadi tidak terlihat di laporan periode mana pun — yang memang semestinya,
     * karena transaksinya dianggap tidak pernah terjadi. Jejaknya tetap utuh di tab Jurnal, tempat
     * entri asli dan pembaliknya berdua tersimpan lengkap dengan alasannya.
     *
     * Pengecualiannya periode yang sudah ditutup (Tutup Periode): buku yang sudah dikunci tidak
     * boleh disisipi entri baru, jadi pembaliknya mundur ke tanggal hari ini — konvensi yang sama
     * persis dipakai postSalesJournal (postings.ts). Dalam kasus itu tanggalnya ditulis eksplisit
     * di deskripsi, supaya pendapatan negatif yang muncul di periode berjalan bisa langsung
     * ditelusuri ke periode asalnya alih-alih tampak seperti kesalahan.
     */
    const originalPeriodLocked = await isPeriodLocked(entry.outletId, entry.entryDate, tx);
    const { entryDate, lockedNote } = resolveReversalEntryDate(entry.entryDate, originalPeriodLocked);

    await postJournal(
      {
        outletId: entry.outletId,
        entryDate,
        reference: entry.reference ?? undefined,
        description: `[VOID] ${entry.description} — ${reason}${lockedNote}`,
        sourceType: entry.sourceType as JournalSourceType,
        sourceId: entry.sourceId ?? undefined,
        staffUserId: entry.staffUserId ?? undefined,
        reversalOfEntryId: entry.id,
        lines: lines.map((l) => ({ accountId: l.accountId, debit: l.credit, credit: l.debit, description: l.description ?? undefined })),
      },
      tx
    );

    await tx.update(journalEntries).set({ status: "void", voidedAt: new Date().toISOString(), voidReason: reason }).where(eq(journalEntries.id, journalEntryId));
  };

  if (dbc === db) return db.transaction((tx) => run(tx));
  return run(dbc);
}
