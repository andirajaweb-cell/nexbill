import { db } from "@/db/client";
import { cashTransfers, cashBankAccounts, staffUsers, approvalRequests } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { postJournal, voidJournal } from "@/lib/accounting/journal";
import { logAudit } from "@/lib/audit/log";
import type { StaffRole } from "@/lib/auth/permissions";

const round = (n: number) => Math.round(n * 100) / 100;

export interface RequestCashTransferInput {
  outletId: string;
  shiftId?: string | null;
  amount: number;
  sourceCashBankAccountId: string;
  destinationCashBankAccountId: string;
  notes?: string | null;
  requestedByStaffUserId: string;
  requesterRole: StaffRole;
}

/**
 * "Pindah Kas" — pure internal transfer between two of the outlet's own cash pools. Unlike
 * cashDeposits (Setoran Kas), this never posts immediately: it always goes through the standard
 * approvalRequests queue first (per the user's explicit choice, mirroring void/refund), so the
 * cashTransfers row starts at status "pending_approval" with no journalEntryId — the actual
 * journal only gets posted by executeCashTransfer() when an Owner/Manager approves (see the
 * "cash_transfer" branch in approveRequest, lib/pos/void.ts).
 */
export async function requestCashTransfer(input: RequestCashTransferInput) {
  if (!(input.amount > 0)) throw new Error("Jumlah pindah kas harus lebih dari 0.");
  if (input.sourceCashBankAccountId === input.destinationCashBankAccountId) {
    throw new Error("Akun tujuan tidak boleh sama dengan akun sumber.");
  }

  const [source] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.sourceCashBankAccountId)).limit(1);
  if (!source || source.outletId !== input.outletId) throw new Error("Akun kas sumber tidak ditemukan.");
  const [destination] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.destinationCashBankAccountId)).limit(1);
  if (!destination || destination.outletId !== input.outletId) throw new Error("Akun kas tujuan tidak ditemukan.");

  const amount = round(input.amount);

  const [transfer] = await db
    .insert(cashTransfers)
    .values({
      outletId: input.outletId,
      shiftId: input.shiftId ?? null,
      amount,
      sourceCashBankAccountId: source.id,
      destinationCashBankAccountId: destination.id,
      notes: input.notes ?? null,
      requestedByStaffUserId: input.requestedByStaffUserId,
      status: "pending_approval",
    })
    .returning();

  await db.insert(approvalRequests).values({
    outletId: input.outletId,
    type: "cash_transfer",
    refType: "cash_transfer",
    refId: transfer.id,
    requestedBy: input.requestedByStaffUserId,
    reason: input.notes ?? undefined,
  });

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.requestedByStaffUserId,
    action: "request_cash_transfer",
    entityType: "cash_transfer",
    entityId: transfer.id,
    after: transfer,
  });

  return transfer;
}

/** Called from approveRequest() once an Owner/Manager approves the pending approvalRequests row — actually posts the journal (Dr destination pool / Cr source pool, both stay on the balance sheet as assets) and flips the cashTransfers row to "posted". */
export async function executeCashTransfer(transferId: string, reviewerId: string) {
  const [transfer] = await db.select().from(cashTransfers).where(eq(cashTransfers.id, transferId)).limit(1);
  if (!transfer) throw new Error("Permintaan pindah kas tidak ditemukan.");
  if (transfer.status !== "pending_approval") throw new Error("Permintaan pindah kas ini sudah diproses.");

  const [source] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, transfer.sourceCashBankAccountId)).limit(1);
  const [destination] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, transfer.destinationCashBankAccountId)).limit(1);
  if (!source || !destination) throw new Error("Akun kas sumber/tujuan pada permintaan ini sudah tidak ada.");

  const label = `Pindah Kas: ${source.name} → ${destination.name}`;
  const journalId = await postJournal({
    outletId: transfer.outletId,
    description: transfer.notes ? `${label} (${transfer.notes})` : label,
    sourceType: "cash_transfer",
    sourceId: transfer.id,
    staffUserId: reviewerId,
    lines: [
      { accountId: destination.accountId, debit: transfer.amount, credit: 0, description: label },
      { accountId: source.accountId, debit: 0, credit: transfer.amount, description: label },
    ],
  });

  const [updated] = await db
    .update(cashTransfers)
    .set({ status: "posted", journalEntryId: journalId })
    .where(eq(cashTransfers.id, transferId))
    .returning();

  await logAudit({ outletId: transfer.outletId, staffUserId: reviewerId, action: "approve_cash_transfer", entityType: "cash_transfer", entityId: transferId, after: updated });
  return updated;
}

/** Called from rejectRequest() — marks the cashTransfers row itself rejected so it stops showing as pending; no journal was ever posted so there's nothing to reverse. */
export async function rejectCashTransferRecord(transferId: string, reviewerId: string, note?: string) {
  const [transfer] = await db.select().from(cashTransfers).where(eq(cashTransfers.id, transferId)).limit(1);
  if (!transfer) throw new Error("Permintaan pindah kas tidak ditemukan.");
  if (transfer.status !== "pending_approval") return transfer; // already resolved — no-op

  const [updated] = await db
    .update(cashTransfers)
    .set({ status: "rejected", rejectReason: note ?? null })
    .where(eq(cashTransfers.id, transferId))
    .returning();

  await logAudit({ outletId: transfer.outletId, staffUserId: reviewerId, action: "reject_cash_transfer", entityType: "cash_transfer", entityId: transferId, after: updated });
  return updated;
}

export async function listCashTransfers(outletId: string, shiftId?: string) {
  const conditions = [eq(cashTransfers.outletId, outletId)];
  if (shiftId) conditions.push(eq(cashTransfers.shiftId, shiftId));

  const rows = await db.select().from(cashTransfers).where(and(...conditions)).orderBy(desc(cashTransfers.createdAt));
  const accountRows = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId));
  const accountNameById = new Map(accountRows.map((a) => [a.id, a.name]));
  const staffRows = await db.select().from(staffUsers).where(eq(staffUsers.outletId, outletId));
  const staffNameById = new Map(staffRows.map((s) => [s.id, s.name]));

  // Every transfer request has a matching "cash_transfer" approvalRequests row (see
  // requestCashTransfer) — surface its id so the UI's Setujui/Tolak buttons know which approval
  // record to act on (same pattern as shift_close_review in /api/shifts/route.ts).
  const pendingIds = rows.filter((r) => r.status === "pending_approval").map((r) => r.id);
  const approvalByTransferId = new Map<string, { id: string }>();
  if (pendingIds.length > 0) {
    const approvals = await db
      .select({ id: approvalRequests.id, refId: approvalRequests.refId })
      .from(approvalRequests)
      .where(and(eq(approvalRequests.type, "cash_transfer"), inArray(approvalRequests.refId, pendingIds), eq(approvalRequests.status, "pending")));
    for (const a of approvals) approvalByTransferId.set(a.refId, { id: a.id });
  }

  return rows.map((r) => ({
    ...r,
    sourceAccountName: accountNameById.get(r.sourceCashBankAccountId) ?? "-",
    destinationAccountName: accountNameById.get(r.destinationCashBankAccountId) ?? "-",
    requestedByName: staffNameById.get(r.requestedByStaffUserId) ?? "-",
    approvalRequestId: approvalByTransferId.get(r.id)?.id ?? null,
  }));
}

/** Reverses an already-posted transfer via the standard voidJournal reversal-entry pattern — never deletes, keeps the original row + a canceling journal entry for audit. Only meaningful once status is "posted" (a pending/rejected request never had a journal to reverse). */
export async function voidCashTransfer(id: string, reason: string, staffUserId?: string) {
  const [row] = await db.select().from(cashTransfers).where(eq(cashTransfers.id, id)).limit(1);
  if (!row) throw new Error("Pindah kas tidak ditemukan.");
  if (row.status !== "posted") throw new Error("Hanya pindah kas yang sudah diposting yang bisa dibatalkan.");

  if (row.journalEntryId) await voidJournal(row.journalEntryId, reason);

  const [updated] = await db
    .update(cashTransfers)
    .set({ status: "void", voidReason: reason, voidedAt: new Date().toISOString() })
    .where(eq(cashTransfers.id, id))
    .returning();

  await logAudit({ outletId: row.outletId, staffUserId, action: "void_cash_transfer", entityType: "cash_transfer", entityId: id, before: { status: row.status }, after: { status: "void", reason } });
  return updated;
}
