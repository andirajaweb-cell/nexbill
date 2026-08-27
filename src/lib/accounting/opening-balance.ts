import { db } from "@/db/client";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { postJournal, voidJournal } from "./journal";

/**
 * "Saldo Awal" (Opening Balance) — the standard way to migrate from a
 * previous system: instead of replaying years of old transactions, record
 * each account's balance AS OF the cutover date (the day this app takes
 * over) in a single journal entry. Balance sheet accounts (cash, bank,
 * piutang, hutang, aset, modal) need this; P&L accounts (revenue/expense)
 * normally don't, since P&L resets every period — but is allowed here too in
 * case the owner wants a specific period's revenue/expense reflected.
 *
 * Deliberately capped at ONE active opening_balance entry per outlet at a
 * time (see getExistingOpeningBalance) — a second batch would double-count
 * the starting balances. To correct a mistake, void the existing one first
 * (posts a clean reversal, preserves history) then post a new one.
 */

export interface OpeningBalanceLineInput {
  accountId: string;
  debit: number;
  credit: number;
}

export async function getExistingOpeningBalance(outletId: string) {
  // voidJournal() posts its reversal with the SAME sourceType as the original (see journal.ts)
  // and that reversal entry's own status is "posted" — so a naive status="posted" filter here
  // would find the reversal itself and treat a just-voided opening balance as still active,
  // permanently blocking re-entry. Reversal entries are always prefixed "[VOID] " in their
  // description (the one consistent marker voidJournal() leaves behind), so exclude those.
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.outletId, outletId), eq(journalEntries.sourceType, "opening_balance"), eq(journalEntries.status, "posted")));
  const entry = rows.find((r) => !r.description.startsWith("[VOID]"));
  if (!entry) return null;

  const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entry.id));
  const accountRows = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const accountMap = new Map(accountRows.map((a) => [a.id, a]));
  return {
    entry,
    lines: lines.map((l) => ({ ...l, accountCode: accountMap.get(l.accountId)?.code, accountName: accountMap.get(l.accountId)?.name })),
  };
}

export async function postOpeningBalance(outletId: string, cutoverDate: string, lines: OpeningBalanceLineInput[], staffUserId?: string) {
  const existing = await getExistingOpeningBalance(outletId);
  if (existing) throw new Error("Sudah ada Saldo Awal yang aktif untuk outlet ini. Void yang lama dulu sebelum posting yang baru, supaya tidak dobel hitung.");

  const usable = lines.filter((l) => (l.debit || 0) > 0 || (l.credit || 0) > 0);
  if (usable.length < 2) throw new Error("Isi minimal 2 baris akun dengan nominal.");
  for (const l of usable) {
    if ((l.debit || 0) > 0 && (l.credit || 0) > 0) throw new Error("Satu baris tidak boleh punya debit dan kredit sekaligus.");
    if ((l.debit || 0) < 0 || (l.credit || 0) < 0) throw new Error("Nilai debit/kredit tidak boleh negatif.");
  }

  const journalId = await postJournal({
    outletId,
    entryDate: cutoverDate,
    reference: "SALDO-AWAL",
    description: "Saldo Awal (Migrasi Data dari Aplikasi Lama)",
    sourceType: "opening_balance",
    staffUserId,
    lines: usable.map((l) => ({ accountId: l.accountId, debit: l.debit || 0, credit: l.credit || 0 })),
  });

  return journalId;
}

export async function voidOpeningBalance(outletId: string, staffUserId: string | undefined, reason: string) {
  const existing = await getExistingOpeningBalance(outletId);
  if (!existing) throw new Error("Tidak ada Saldo Awal aktif untuk di-void.");
  await voidJournal(existing.entry.id, reason);
}
