import { db } from "@/db/client";
import { cashDeposits, cashBankAccounts, staffUsers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { postJournal, voidJournal } from "@/lib/accounting/journal";
import { logAudit } from "@/lib/audit/log";
import type { StaffRole } from "@/lib/auth/permissions";

export type CashDepositPurpose = "kas_besar" | "saldo_deposit_virtual" | "kas_kecil" | "prive" | "dividen";

/** Roles a cash pickup can legitimately be handed to — the mandatory "receiver" field only ever
 * offers staff with one of these roles, per the feature's whole point: every pickup is traceable
 * to a specific accountable person, not just "diserahkan ke atasan". */
export const CASH_DEPOSIT_RECEIVER_ROLES: StaffRole[] = ["owner", "superuser", "manager", "supervisor", "accountant"];

/** Equity account code a prive/dividen pickup posts against — see coa-data.ts 3130/3131. Internal-transfer purposes (kas_besar/saldo_deposit_virtual/kas_kecil) instead credit another cashBankAccounts row's own linked account, resolved from the row itself, not a fixed code. */
const EQUITY_ACCOUNT_CODE: Record<"prive" | "dividen", string> = {
  prive: "3130",
  dividen: "3131",
};

const round = (n: number) => Math.round(n * 100) / 100;

export interface CreateCashDepositInput {
  outletId: string;
  shiftId?: string | null;
  amount: number;
  purposeType: CashDepositPurpose;
  sourceCashBankAccountId: string;
  /** Required for kas_besar/saldo_deposit_virtual/kas_kecil, ignored for prive/dividen. */
  destinationCashBankAccountId?: string | null;
  receivedByStaffUserId: string;
  recordedByStaffUserId?: string;
  notes?: string | null;
}

/**
 * Records a cash pickup and posts its journal in one step — never left half-done, since an
 * amount "taken from the till" with no matching journal entry is exactly the kind of gap this
 * feature exists to close.
 *
 * Internal transfer (kas_besar/saldo_deposit_virtual/kas_kecil): Dr [destination cash pool] /
 * Cr [source cash pool] — both stay on the balance sheet as assets, net worth unchanged, this is
 * just cash moving from one recorded pool to another.
 *
 * Owner draw (prive) or dividend (dividen): Dr 3130/3131 (equity) / Cr [source cash pool] — the
 * cash has genuinely left the business's recorded cash system into the owner's pocket, so it
 * reduces owner equity instead of just relocating between two asset accounts.
 */
export async function createCashDeposit(input: CreateCashDepositInput) {
  if (!(input.amount > 0)) throw new Error("Jumlah setoran harus lebih dari 0.");

  const [source] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.sourceCashBankAccountId)).limit(1);
  if (!source || source.outletId !== input.outletId) throw new Error("Akun sumber kas tidak ditemukan.");

  const [receiver] = await db.select().from(staffUsers).where(eq(staffUsers.id, input.receivedByStaffUserId)).limit(1);
  if (!receiver || receiver.outletId !== input.outletId) throw new Error("Staf penerima tidak ditemukan.");
  if (!CASH_DEPOSIT_RECEIVER_ROLES.includes(receiver.role as StaffRole)) {
    throw new Error("Penerima setoran kas harus Owner, Manager, Supervisor, atau Accounting.");
  }

  const isInternalTransfer = input.purposeType === "kas_besar" || input.purposeType === "saldo_deposit_virtual" || input.purposeType === "kas_kecil";
  let destination: typeof cashBankAccounts.$inferSelect | undefined;
  if (isInternalTransfer) {
    if (!input.destinationCashBankAccountId) throw new Error("Pilih akun kas tujuan.");
    [destination] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.destinationCashBankAccountId)).limit(1);
    if (!destination || destination.outletId !== input.outletId) throw new Error("Akun kas tujuan tidak ditemukan.");
    if (destination.id === source.id) throw new Error("Akun tujuan tidak boleh sama dengan akun sumber.");
  }

  const amount = round(input.amount);
  const label = `Setoran Kas (${input.purposeType}) diterima oleh ${receiver.name}`;
  const debitLine = isInternalTransfer
    ? { accountId: destination!.accountId, debit: amount, credit: 0, description: label }
    : { accountCode: EQUITY_ACCOUNT_CODE[input.purposeType as "prive" | "dividen"], debit: amount, credit: 0, description: label };

  const journalId = await postJournal({
    outletId: input.outletId,
    description: label,
    sourceType: "cash_deposit",
    staffUserId: input.recordedByStaffUserId,
    lines: [debitLine, { accountId: source.accountId, debit: 0, credit: amount, description: label }],
  });

  const [row] = await db
    .insert(cashDeposits)
    .values({
      outletId: input.outletId,
      shiftId: input.shiftId ?? null,
      amount,
      purposeType: input.purposeType,
      sourceCashBankAccountId: source.id,
      destinationCashBankAccountId: destination?.id ?? null,
      receivedByStaffUserId: input.receivedByStaffUserId,
      recordedByStaffUserId: input.recordedByStaffUserId ?? null,
      notes: input.notes ?? null,
      journalEntryId: journalId,
    })
    .returning();

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.recordedByStaffUserId,
    action: "create_cash_deposit",
    entityType: "cash_deposit",
    entityId: row.id,
    after: row,
  });

  return row;
}

export async function listCashDeposits(outletId: string, shiftId?: string) {
  const conditions = [eq(cashDeposits.outletId, outletId)];
  if (shiftId) conditions.push(eq(cashDeposits.shiftId, shiftId));

  const rows = await db.select().from(cashDeposits).where(and(...conditions)).orderBy(desc(cashDeposits.createdAt));
  const accountRows = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId));
  const accountNameById = new Map(accountRows.map((a) => [a.id, a.name]));
  const staffRows = await db.select().from(staffUsers).where(eq(staffUsers.outletId, outletId));
  const staffNameById = new Map(staffRows.map((s) => [s.id, s.name]));

  return rows.map((r) => ({
    ...r,
    sourceAccountName: accountNameById.get(r.sourceCashBankAccountId) ?? "-",
    destinationAccountName: r.destinationCashBankAccountId ? accountNameById.get(r.destinationCashBankAccountId) ?? "-" : null,
    receivedByName: staffNameById.get(r.receivedByStaffUserId) ?? "-",
    recordedByName: r.recordedByStaffUserId ? staffNameById.get(r.recordedByStaffUserId) ?? "-" : "-",
  }));
}

/** Reverses an already-posted cash deposit via the standard voidJournal reversal-entry pattern (see lib/accounting/journal.ts) — never deletes, keeps the original row + a canceling journal entry for audit. */
export async function voidCashDeposit(id: string, reason: string, staffUserId?: string) {
  const [row] = await db.select().from(cashDeposits).where(eq(cashDeposits.id, id)).limit(1);
  if (!row) throw new Error("Setoran kas tidak ditemukan.");
  if (row.status === "void") throw new Error("Setoran ini sudah dibatalkan sebelumnya.");

  if (row.journalEntryId) {
    await voidJournal(row.journalEntryId, reason);
  }

  const [updated] = await db
    .update(cashDeposits)
    .set({ status: "void", voidReason: reason, voidedAt: new Date().toISOString() })
    .where(eq(cashDeposits.id, id))
    .returning();

  await logAudit({ outletId: row.outletId, staffUserId, action: "void_cash_deposit", entityType: "cash_deposit", entityId: id, before: { status: row.status }, after: { status: "void", reason } });
  return updated;
}
