import { db } from "@/db/client";
import { journalEntries, journalLines, ppobTransactions, accounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * One-time repair tool for the bug fixed in hardDeletePpobTransaction (see
 * lib/ppob/engine.ts): before that fix, hard-deleting a PPOB transaction that
 * had previously been voided or edited only removed its CURRENT journal
 * entry, leaving earlier entries — most dangerously a void's reversal entry,
 * which was never linked back via ppobTransactions.journalEntryId — orphaned
 * in journal_entries with no owning transaction left to explain them. An
 * orphaned reversal entry that lost its other half stops cancelling out and
 * quietly inflates or deflates whatever account it touches (this is exactly
 * how a shift's "Verifikasi Saldo Channel Non-Tunai" ended up expecting a
 * negative balance with no matching transaction in sight).
 *
 * An entry is "orphaned" here specifically as: sourceType = 'ppob' AND
 * sourceId set AND that id no longer exists in ppob_transactions. Every
 * legitimate ppob journal entry (original, void-reversal, or edit-correction)
 * carries the owning transaction's own id as sourceId — see postJournal
 * calls in voidJournal()/editPpobTransaction() — so once the transaction
 * itself is gone, EVERY entry under that id is dead weight, not just some of
 * them. Safe to delete in full; nothing else in the app reads a ppob journal
 * entry except through the owning ppob_transactions row (which no longer
 * exists) or through account-level trial balance rollups (which orphaning
 * this entry actually restores to correctness, since that's the entire bug).
 */
export interface OrphanedPpobEntry {
  journalEntryId: string;
  description: string;
  entryDate: string;
  status: string;
  sourceId: string;
  lines: { accountId: string; accountCode: string; accountName: string; debit: number; credit: number }[];
}

export async function findOrphanedPpobEntries(outletId: string): Promise<OrphanedPpobEntry[]> {
  const entries = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.outletId, outletId), eq(journalEntries.sourceType, "ppob")));
  if (entries.length === 0) return [];

  const liveTxIds = new Set((await db.select({ id: ppobTransactions.id }).from(ppobTransactions).where(eq(ppobTransactions.outletId, outletId))).map((r) => r.id));
  const orphaned = entries.filter((e) => e.sourceId && !liveTxIds.has(e.sourceId));
  if (orphaned.length === 0) return [];

  const accountRows = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const accountById = new Map(accountRows.map((a) => [a.id, a]));

  const allLines = await db
    .select()
    .from(journalLines)
    .where(inArray(journalLines.journalEntryId, orphaned.map((e) => e.id)));
  const linesByEntry = new Map<string, typeof allLines>();
  for (const l of allLines) {
    const list = linesByEntry.get(l.journalEntryId) ?? [];
    list.push(l);
    linesByEntry.set(l.journalEntryId, list);
  }

  return orphaned.map((e) => ({
    journalEntryId: e.id,
    description: e.description,
    entryDate: e.entryDate,
    status: e.status,
    sourceId: e.sourceId!,
    lines: (linesByEntry.get(e.id) ?? []).map((l) => {
      const acc = accountById.get(l.accountId);
      return { accountId: l.accountId, accountCode: acc?.code ?? "?", accountName: acc?.name ?? "?", debit: Number(l.debit), credit: Number(l.credit) };
    }),
  }));
}

/** Net debit-minus-credit each orphaned entry contributes per account — i.e. exactly the phantom amount currently distorting that account's balance. */
export function summarizeOrphanImpact(orphans: OrphanedPpobEntry[]): { accountCode: string; accountName: string; netAmount: number }[] {
  const byAccount = new Map<string, { accountCode: string; accountName: string; netAmount: number }>();
  for (const o of orphans) {
    for (const l of o.lines) {
      const cur = byAccount.get(l.accountId) ?? { accountCode: l.accountCode, accountName: l.accountName, netAmount: 0 };
      cur.netAmount += l.debit - l.credit;
      byAccount.set(l.accountId, cur);
    }
  }
  return Array.from(byAccount.values());
}

/** Deletes every orphaned entry found above (lines first, then the entry itself). Returns how many were removed. */
export async function cleanOrphanedPpobEntries(outletId: string): Promise<{ removedEntries: number }> {
  const orphans = await findOrphanedPpobEntries(outletId);
  if (orphans.length === 0) return { removedEntries: 0 };
  const ids = orphans.map((o) => o.journalEntryId);
  await db.delete(journalLines).where(inArray(journalLines.journalEntryId, ids));
  await db.delete(journalEntries).where(inArray(journalEntries.id, ids));
  return { removedEntries: ids.length };
}
