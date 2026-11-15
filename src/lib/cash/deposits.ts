import { db } from "@/db/client";
import { cashDeposits, cashBankAccounts, staffUsers, shifts } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { postJournal, voidJournal, lockEntity } from "@/lib/accounting/journal";
import { isPeriodLocked } from "@/lib/accounting/periods";
import { assertCashEditAllowed, changedCashEditFields, correctionEntryDate, lockedCashEditFields, needsRepost } from "./edit-rules";
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
  /** Tanggal setoran (ISO, lihat ymdToEntryIso). Kosong = sekarang. Dipakai untuk jurnal & riwayat. */
  entryDate?: string;
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

  const entryDate = input.entryDate ?? new Date().toISOString();
  const journalId = await postJournal({
    outletId: input.outletId,
    entryDate,
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
      // Tanggal transaksi (bisa mundur) — riwayat & laporan memakai tanggal ini.
      createdAt: entryDate,
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
  const closedShiftIds = await closedShiftIdsOf(rows.map((r) => r.shiftId));

  return rows.map((r) => ({
    ...r,
    /** Shift tautannya sudah ditutup → jumlah/akun sumber/tanggal tidak bisa diedit (lihat edit-rules). */
    shiftClosed: !!r.shiftId && closedShiftIds.has(r.shiftId),
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

/** Id shift (dari daftar) yang statusnya sudah "closed". */
export async function closedShiftIdsOf(shiftIds: (string | null)[]): Promise<Set<string>> {
  const ids = Array.from(new Set(shiftIds.filter((x): x is string => !!x)));
  if (ids.length === 0) return new Set();
  const rows = await db.select({ id: shifts.id, status: shifts.status }).from(shifts).where(inArray(shifts.id, ids));
  return new Set(rows.filter((r) => r.status === "closed").map((r) => r.id));
}

export interface EditCashDepositInput {
  amount?: number;
  purposeType?: CashDepositPurpose;
  sourceCashBankAccountId?: string;
  destinationCashBankAccountId?: string | null;
  receivedByStaffUserId?: string;
  notes?: string | null;
  /** Tanggal baru (ISO, lihat ymdToEntryIso). Kosong = tanggal tetap. */
  entryDate?: string | null;
  /** Shift untuk tanggal baru — dipakai hanya bila tanggal benar-benar diganti. */
  shiftId?: string | null;
}

const PURPOSES: CashDepositPurpose[] = ["kas_besar", "saldo_deposit_virtual", "kas_kecil", "prive", "dividen"];

/**
 * Mengoreksi Setoran Kas yang sudah diposting (izin void_cash_deposit, dicek di route). Jurnal
 * lama TIDAK ditimpa: dibatalkan lewat voidJournal (pembalik di tanggal aslinya) lalu jurnal baru
 * diposting dari angka yang dikoreksi — jejak audit lengkap, sama seperti koreksi PPOB. Baris
 * setoran tetap satu (id sama) sehingga riwayat tidak dobel. Bila hanya catatan yang berubah,
 * tidak ada jurnal yang disentuh.
 */
export async function editCashDeposit(id: string, input: EditCashDepositInput, staffUserId?: string) {
  const [row] = await db.select().from(cashDeposits).where(eq(cashDeposits.id, id)).limit(1);
  if (!row) throw new Error("Setoran kas tidak ditemukan.");
  if (row.status !== "posted") throw new Error("Setoran yang sudah dibatalkan tidak bisa diedit — catat setoran baru bila perlu.");

  const purposeType = input.purposeType ?? (row.purposeType as CashDepositPurpose);
  if (!PURPOSES.includes(purposeType)) throw new Error("Peruntukan setoran tidak valid.");
  const amount = round(input.amount ?? row.amount);
  if (!(amount > 0)) throw new Error("Jumlah setoran harus lebih dari 0.");
  const isInternalTransfer = purposeType === "kas_besar" || purposeType === "saldo_deposit_virtual" || purposeType === "kas_kecil";
  const sourceId = input.sourceCashBankAccountId ?? row.sourceCashBankAccountId;
  const destinationId = isInternalTransfer ? (input.destinationCashBankAccountId !== undefined ? input.destinationCashBankAccountId : row.destinationCashBankAccountId) : null;
  const receiverId = input.receivedByStaffUserId ?? row.receivedByStaffUserId;
  const notes = input.notes !== undefined ? (input.notes?.trim() || null) : row.notes;
  const newDate = input.entryDate || row.createdAt;

  const changed = changedCashEditFields(
    { amount: row.amount, createdAt: row.createdAt, sourceCashBankAccountId: row.sourceCashBankAccountId, destinationCashBankAccountId: row.destinationCashBankAccountId, purposeType: row.purposeType, receivedByStaffUserId: row.receivedByStaffUserId, notes: row.notes },
    { amount, createdAt: newDate, sourceCashBankAccountId: sourceId, destinationCashBankAccountId: destinationId, purposeType, receivedByStaffUserId: receiverId, notes }
  );
  if (changed.length === 0) return row;
  const shiftClosed = (await closedShiftIdsOf([row.shiftId])).size > 0;
  assertCashEditAllowed(changed, lockedCashEditFields("deposit", shiftClosed));

  const [source] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, sourceId)).limit(1);
  if (!source || source.outletId !== row.outletId) throw new Error("Akun sumber kas tidak ditemukan.");
  const [receiver] = await db.select().from(staffUsers).where(eq(staffUsers.id, receiverId)).limit(1);
  if (!receiver || receiver.outletId !== row.outletId) throw new Error("Staf penerima tidak ditemukan.");
  if (!CASH_DEPOSIT_RECEIVER_ROLES.includes(receiver.role as StaffRole)) throw new Error("Penerima setoran kas harus Owner, Manager, Supervisor, atau Accounting.");
  let destination: typeof cashBankAccounts.$inferSelect | undefined;
  if (isInternalTransfer) {
    if (!destinationId) throw new Error("Pilih akun kas tujuan.");
    [destination] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, destinationId)).limit(1);
    if (!destination || destination.outletId !== row.outletId) throw new Error("Akun kas tujuan tidak ditemukan.");
    if (destination.id === source.id) throw new Error("Akun tujuan tidak boleh sama dengan akun sumber.");
  }

  const dateChanged = changed.includes("date");
  const entryDate = correctionEntryDate({
    dateChanged,
    newDate,
    originalDate: row.createdAt,
    originalPeriodLocked: !dateChanged && (await isPeriodLocked(row.outletId, row.createdAt)),
  });

  const updated = await db.transaction(async (tx) => {
    // Lock + re-read: dua edit/void bersamaan tidak boleh sama-sama membatalkan jurnal yang sama
    // lalu masing-masing memposting jurnal baru.
    await lockEntity(tx, `cash_deposit:${id}`);
    const [fresh] = await tx.select().from(cashDeposits).where(eq(cashDeposits.id, id)).limit(1);
    if (!fresh || fresh.status !== "posted") throw new Error("Setoran ini sudah dibatalkan atau diubah di tempat lain — muat ulang halaman.");

    let journalEntryId = fresh.journalEntryId;
    if (needsRepost(changed)) {
      if (fresh.journalEntryId) await voidJournal(fresh.journalEntryId, "Dikoreksi (edit setoran kas)", tx);
      const label = `Setoran Kas (${purposeType}) diterima oleh ${receiver.name}`;
      const debitLine = isInternalTransfer
        ? { accountId: destination!.accountId, debit: amount, credit: 0, description: label }
        : { accountCode: EQUITY_ACCOUNT_CODE[purposeType as "prive" | "dividen"], debit: amount, credit: 0, description: label };
      journalEntryId = await postJournal(
        {
          outletId: row.outletId,
          entryDate,
          description: `${label} — dikoreksi`,
          sourceType: "cash_deposit",
          sourceId: id,
          staffUserId,
          lines: [debitLine, { accountId: source.accountId, debit: 0, credit: amount, description: label }],
        },
        tx
      );
    }

    const [saved] = await tx
      .update(cashDeposits)
      .set({
        amount,
        purposeType,
        sourceCashBankAccountId: source.id,
        destinationCashBankAccountId: destination?.id ?? null,
        receivedByStaffUserId: receiver.id,
        notes,
        journalEntryId,
        ...(dateChanged ? { createdAt: newDate, shiftId: input.shiftId ?? null } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cashDeposits.id, id))
      .returning();
    return saved;
  });

  await logAudit({ outletId: row.outletId, staffUserId, action: "edit_cash_deposit", entityType: "cash_deposit", entityId: id, before: row, after: { ...updated, changed } });
  return updated;
}
