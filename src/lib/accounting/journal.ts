import { db, type DbOrTx } from "@/db/client";
import { journalEntries, journalLines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAccountIdByCode, assertPostableAccountIds } from "./coa";

export type JournalSourceType =
  | "rental"
  | "pos"
  | "purchase_invoice"
  | "purchase_payment"
  | "purchase_return"
  | "expense"
  | "refund"
  | "asset_purchase"
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
  | "cash_transfer";

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
  lines: JournalLineInput[];
}

const round = (n: number) => Math.round(n * 100) / 100;

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
  await assertPostableAccountIds(resolvedLines.map((l) => l.accountId), dbc);

  const totalDebit = round(resolvedLines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round(resolvedLines.reduce((s, l) => s + l.credit, 0));

  if (Math.abs(totalDebit - totalCredit) > 1) {
    throw new Error(
      `Journal tidak balance: total debit ${totalDebit} != total kredit ${totalCredit} (${input.description})`
    );
  }

  const write = async (exec: DbOrTx) => {
    const [entry] = await exec
      .insert(journalEntries)
      .values({
        outletId: input.outletId,
        entryDate: input.entryDate ?? new Date().toISOString(),
        reference: input.reference,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        staffUserId: input.staffUserId,
        status: "posted",
      })
      .returning();

    // Bulk insert instead of one row per line — postJournal is the single hottest write path in
    // the app (every POS sale, rental checkout, expense/purchase payment, and historical import
    // row all route through here), so the sequential per-line await here was the same N+1 pattern
    // already fixed in coa.ts/account-mapping.ts, just on a much busier path.
    const rows = resolvedLines
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
  const [entry] = await dbc.select().from(journalEntries).where(eq(journalEntries.id, journalEntryId)).limit(1);
  if (!entry || entry.status === "void") return;

  const lines = await dbc.select().from(journalLines).where(eq(journalLines.journalEntryId, journalEntryId));

  const run = async (tx: DbOrTx) => {
    await postJournal(
      {
        outletId: entry.outletId,
        reference: entry.reference ?? undefined,
        description: `[VOID] ${entry.description} — ${reason}`,
        sourceType: entry.sourceType as JournalSourceType,
        sourceId: entry.sourceId ?? undefined,
        staffUserId: entry.staffUserId ?? undefined,
        lines: lines.map((l) => ({ accountId: l.accountId, debit: l.credit, credit: l.debit, description: l.description ?? undefined })),
      },
      tx
    );

    await tx.update(journalEntries).set({ status: "void", voidedAt: new Date().toISOString(), voidReason: reason }).where(eq(journalEntries.id, journalEntryId));
  };

  if (dbc === db) return db.transaction((tx) => run(tx));
  return run(dbc);
}
