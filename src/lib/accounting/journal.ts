import { db } from "@/db/client";
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
  | "membership_fee";

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
 */
export async function postJournal(input: PostJournalInput): Promise<string> {
  const resolvedLines = await Promise.all(
    input.lines.map(async (line) => {
      const accountId = line.accountId ?? (await getAccountIdByCode(input.outletId, line.accountCode!));
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
  await assertPostableAccountIds(resolvedLines.map((l) => l.accountId));

  const totalDebit = round(resolvedLines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round(resolvedLines.reduce((s, l) => s + l.credit, 0));

  if (Math.abs(totalDebit - totalCredit) > 1) {
    throw new Error(
      `Journal tidak balance: total debit ${totalDebit} != total kredit ${totalCredit} (${input.description})`
    );
  }

  const [entry] = await db
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
  if (rows.length > 0) await db.insert(journalLines).values(rows);

  return entry.id;
}

/** Void a journal entry by posting the exact reverse — never mutates/deletes posted history. */
export async function voidJournal(journalEntryId: string, reason: string) {
  const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, journalEntryId)).limit(1);
  if (!entry || entry.status === "void") return;

  const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, journalEntryId));

  await postJournal({
    outletId: entry.outletId,
    reference: entry.reference ?? undefined,
    description: `[VOID] ${entry.description} — ${reason}`,
    sourceType: entry.sourceType as JournalSourceType,
    sourceId: entry.sourceId ?? undefined,
    staffUserId: entry.staffUserId ?? undefined,
    lines: lines.map((l) => ({ accountId: l.accountId, debit: l.credit, credit: l.debit, description: l.description ?? undefined })),
  });

  await db.update(journalEntries).set({ status: "void", voidedAt: new Date().toISOString(), voidReason: reason }).where(eq(journalEntries.id, journalEntryId));
}
