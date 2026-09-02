import { db } from "@/db/client";
import { expenses, accounts, outlets, cashBankAccounts, recurringExpenseTemplates, staffUsers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { postJournal } from "./journal";
import { EXPENSE_PAYABLE_ACCOUNT_CODE } from "./coa";
import { logAudit } from "@/lib/audit/log";
import type { StaffRole } from "@/lib/auth/permissions";
import { hasPermission, canApproveForRole, roleLabel } from "@/lib/auth/permissions";

/**
 * Approval-hierarchy check shared by approveExpense/rejectExpense — on top of the
 * approve_expenses permission gate, the approver must be strictly more senior (lower
 * ROLE_LEVEL) than whoever submitted the expense, per the 6-tier level structure in
 * permissions.ts. An expense with no staffUserId (shouldn't normally happen) skips the check.
 */
async function assertCanReviewExpense(expense: typeof expenses.$inferSelect, reviewerRole: StaffRole) {
  if (!expense.staffUserId) return;
  const [requester] = await db.select({ role: staffUsers.role }).from(staffUsers).where(eq(staffUsers.id, expense.staffUserId)).limit(1);
  if (!requester) return;
  if (!canApproveForRole(reviewerRole, requester.role as StaffRole)) {
    throw new Error(`Role kamu (${roleLabel(reviewerRole)}) tidak bisa menyetujui/menolak expense dari role yang levelnya setara atau lebih tinggi (${roleLabel(requester.role as StaffRole)}).`);
  }
}

const round = (n: number) => Math.round(n);

/**
 * Full Expense Management engine — the single entry point that turns an
 * expense into real double-entry accounting. Every status transition that
 * moves money (approve/auto-approve, pay, void) posts through postJournal()/
 * voidJournal() from ./journal.ts — nothing here writes journalLines directly.
 *
 * State machine:
 *   draft --submit--> pending_approval --approve--> approved --pay--> paid
 *   draft --submit (<= threshold, auto)--------------------------> approved/paid
 *   pending_approval --reject--> rejected
 *   draft/pending_approval --cancel--> cancelled (nothing was posted yet)
 *   approved/paid --void--> cancelled (reversal journal posted, voided* stamped)
 */

export interface CreateExpenseInput {
  outletId: string;
  accountId: string;
  category: string;
  description?: string;
  payeeName?: string;
  supplierId?: string;
  qty?: number;
  amount: number;
  taxAmount?: number;
  paymentMethod?: "cash" | "bank" | "transfer" | "qris";
  cashBankAccountId?: string;
  recordAsPayable?: boolean;
  costCenterId?: string;
  rentalUnitId?: string;
  dueDate?: string;
  attachmentUrl?: string;
  expenseDate?: string;
  staffUserId?: string;
  shiftId?: string;
  isRecurringInstance?: boolean;
  recurringTemplateId?: string;
}

async function generateExpenseNumber(outletId: string): Promise<string> {
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(eq(expenses.outletId, outletId))) as { count: number }[];
  return `EXP-${String(count + 1).padStart(5, "0")}`;
}

async function assertExpenseAccount(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) throw new Error("Akun COA untuk expense tidak ditemukan.");
  if (account.type !== "expense") throw new Error(`Akun "${account.name}" bukan akun beban (type=${account.type}) — pilih akun COA bertipe expense.`);
  return account;
}

async function getCashBankGlAccountId(cashBankAccountId: string): Promise<string> {
  const [row] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row) throw new Error(`Akun kas/bank ${cashBankAccountId} tidak ditemukan.`);
  return row.accountId;
}

export async function createExpense(input: CreateExpenseInput) {
  if (input.amount <= 0) throw new Error("Nominal expense harus lebih dari 0.");
  await assertExpenseAccount(input.accountId);
  if (!input.recordAsPayable && !input.cashBankAccountId) {
    throw new Error("Pilih akun kas/bank untuk expense yang dibayar langsung, atau centang 'Catat sebagai hutang' jika belum dibayar.");
  }

  const expenseNumber = await generateExpenseNumber(input.outletId);
  const [expense] = await db
    .insert(expenses)
    .values({
      expenseNumber,
      outletId: input.outletId,
      accountId: input.accountId,
      category: input.category,
      description: input.description,
      payeeName: input.payeeName,
      supplierId: input.supplierId,
      qty: input.qty ?? 1,
      amount: input.amount,
      taxAmount: input.taxAmount ?? 0,
      paymentMethod: input.paymentMethod,
      cashBankAccountId: input.recordAsPayable ? undefined : input.cashBankAccountId,
      recordAsPayable: Boolean(input.recordAsPayable),
      costCenterId: input.costCenterId,
      rentalUnitId: input.rentalUnitId,
      dueDate: input.dueDate,
      attachmentUrl: input.attachmentUrl,
      expenseDate: input.expenseDate ?? new Date().toISOString(),
      staffUserId: input.staffUserId,
      shiftId: input.shiftId,
      isRecurringInstance: Boolean(input.isRecurringInstance),
      recurringTemplateId: input.recurringTemplateId,
      status: "draft",
    })
    .returning();

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId,
    action: "create_expense",
    entityType: "expense",
    entityId: expense.id,
    after: { expenseNumber, category: input.category, amount: input.amount },
  });

  return expense;
}

/** The actual posting step, shared by the auto-approve (under threshold) and manual approve paths. */
async function postAndAdvance(expenseId: string, actorId?: string) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  const total = round(expense.amount + (expense.taxAmount ?? 0));

  if (expense.recordAsPayable) {
    const journalId = await postJournal({
      outletId: expense.outletId,
      reference: expense.expenseNumber,
      description: expense.description || `Beban ${expense.category} (hutang)`,
      sourceType: "expense",
      sourceId: expense.id,
      staffUserId: actorId ?? expense.staffUserId ?? undefined,
      lines: [
        { accountId: expense.accountId, debit: total, credit: 0, description: expense.category },
        { accountCode: EXPENSE_PAYABLE_ACCOUNT_CODE, debit: 0, credit: total, description: "Hutang expense" },
      ],
    });
    await db
      .update(expenses)
      .set({ status: "approved", journalEntryId: journalId, approvedBy: actorId, approvedAt: new Date().toISOString() })
      .where(eq(expenses.id, expenseId));
    return "approved" as const;
  }

  if (!expense.cashBankAccountId) throw new Error("Expense ini belum punya akun kas/bank untuk pembayaran.");
  const cashBankGlAccountId = await getCashBankGlAccountId(expense.cashBankAccountId);
  const journalId = await postJournal({
    outletId: expense.outletId,
    reference: expense.expenseNumber,
    description: expense.description || `Beban ${expense.category}`,
    sourceType: "expense",
    sourceId: expense.id,
    staffUserId: actorId ?? expense.staffUserId ?? undefined,
    lines: [
      { accountId: expense.accountId, debit: total, credit: 0, description: expense.category },
      { accountId: cashBankGlAccountId, debit: 0, credit: total, description: `Pembayaran (${expense.paymentMethod ?? "cash"})` },
    ],
  });
  const now = new Date().toISOString();
  await db
    .update(expenses)
    .set({ status: "paid", journalEntryId: journalId, approvedBy: actorId, approvedAt: now, paidBy: actorId, paidAt: now })
    .where(eq(expenses.id, expenseId));
  return "paid" as const;
}

/** Submit a draft (or resubmit a rejected) expense — auto-approves+posts under the outlet's threshold, otherwise queues for approval. */
export async function submitExpense(expenseId: string, staffUserId?: string) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  if (!["draft", "rejected"].includes(expense.status)) throw new Error(`Expense berstatus "${expense.status}" tidak bisa disubmit.`);

  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, expense.outletId)).limit(1);
  const threshold = outlet?.expenseApprovalThreshold ?? 500000;
  const total = expense.amount + (expense.taxAmount ?? 0);

  if (total > threshold) {
    await db
      .update(expenses)
      .set({ status: "pending_approval", submittedAt: new Date().toISOString(), rejectedBy: null, rejectedAt: null, rejectReason: null })
      .where(eq(expenses.id, expenseId));
    await logAudit({ outletId: expense.outletId, staffUserId, action: "submit_expense", entityType: "expense", entityId: expenseId, after: { status: "pending_approval", total } });
    return { status: "pending_approval" as const };
  }

  await db.update(expenses).set({ submittedAt: new Date().toISOString() }).where(eq(expenses.id, expenseId));
  const status = await postAndAdvance(expenseId, staffUserId);
  await logAudit({ outletId: expense.outletId, staffUserId, action: "auto_approve_expense", entityType: "expense", entityId: expenseId, after: { status, total } });
  return { status };
}

export async function approveExpense(expenseId: string, approverId: string, role: StaffRole) {
  if (!hasPermission(role, "approve_expenses")) throw new Error("Role kamu tidak punya izin menyetujui expense.");
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  if (expense.status !== "pending_approval") throw new Error(`Expense berstatus "${expense.status}" tidak sedang menunggu approval.`);
  await assertCanReviewExpense(expense, role);

  const status = await postAndAdvance(expenseId, approverId);
  await logAudit({ outletId: expense.outletId, staffUserId: approverId, action: "approve_expense", entityType: "expense", entityId: expenseId, after: { status } });
  return { status };
}

export async function rejectExpense(expenseId: string, approverId: string, role: StaffRole, reason: string) {
  if (!hasPermission(role, "approve_expenses")) throw new Error("Role kamu tidak punya izin menolak expense.");
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  if (expense.status !== "pending_approval") throw new Error(`Expense berstatus "${expense.status}" tidak sedang menunggu approval.`);
  await assertCanReviewExpense(expense, role);

  await db
    .update(expenses)
    .set({ status: "rejected", rejectedBy: approverId, rejectedAt: new Date().toISOString(), rejectReason: reason })
    .where(eq(expenses.id, expenseId));
  await logAudit({ outletId: expense.outletId, staffUserId: approverId, action: "reject_expense", entityType: "expense", entityId: expenseId, after: { reason } });
  return { status: "rejected" as const };
}

/** Settle an expense that was recorded as payable (hutang) — Dr Accounts Payable / Cr Kas-Bank. */
export async function payExpense(expenseId: string, staffUserId: string, method: "cash" | "bank" | "transfer" | "qris", cashBankAccountId: string) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  if (expense.status !== "approved") throw new Error(`Expense berstatus "${expense.status}" tidak bisa dibayar (harus "approved" dulu).`);
  if (!expense.recordAsPayable) throw new Error("Expense ini bukan hutang — sudah lunas sejak approval.");

  const total = round(expense.amount + (expense.taxAmount ?? 0));
  const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId);

  const journalId = await postJournal({
    outletId: expense.outletId,
    reference: `${expense.expenseNumber}-PAY`,
    description: `Pelunasan hutang — ${expense.description || expense.category}`,
    sourceType: "expense",
    sourceId: expense.id,
    staffUserId,
    lines: [
      { accountCode: EXPENSE_PAYABLE_ACCOUNT_CODE, debit: total, credit: 0, description: "Pelunasan hutang expense" },
      { accountId: cashBankGlAccountId, debit: 0, credit: total, description: `Pembayaran (${method})` },
    ],
  });

  const [updated] = await db
    .update(expenses)
    .set({ status: "paid", paymentJournalEntryId: journalId, paidBy: staffUserId, paidAt: new Date().toISOString(), paymentMethod: method, cashBankAccountId })
    .where(eq(expenses.id, expenseId))
    .returning();

  await logAudit({ outletId: expense.outletId, staffUserId, action: "pay_expense", entityType: "expense", entityId: expenseId, after: { method, total } });
  return updated;
}

/** Cancel a not-yet-posted expense (draft/pending_approval) — nothing to reverse since no journal exists yet. */
export async function cancelExpense(expenseId: string, staffUserId: string, reason: string) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  if (!["draft", "pending_approval"].includes(expense.status)) {
    throw new Error(`Expense berstatus "${expense.status}" sudah terposting ke jurnal — gunakan Void, bukan Cancel.`);
  }
  const [updated] = await db
    .update(expenses)
    .set({ status: "cancelled", cancelReason: reason })
    .where(eq(expenses.id, expenseId))
    .returning();
  await logAudit({ outletId: expense.outletId, staffUserId, action: "cancel_expense", entityType: "expense", entityId: expenseId, after: { reason } });
  return updated;
}

/** Reverse an already-posted (approved/paid) expense — posts the exact opposite journal(s), never deletes/mutates history. */
export async function voidExpense(expenseId: string, staffUserId: string, role: StaffRole, reason: string) {
  if (!hasPermission(role, "void_expense")) throw new Error("Role kamu tidak punya izin void expense.");
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) throw new Error("Expense tidak ditemukan.");
  if (!["approved", "paid"].includes(expense.status)) throw new Error(`Expense berstatus "${expense.status}" tidak ada jurnal untuk di-void.`);

  const { voidJournal } = await import("./journal");
  if (expense.journalEntryId) await voidJournal(expense.journalEntryId, reason);
  if (expense.paymentJournalEntryId) await voidJournal(expense.paymentJournalEntryId, reason);

  const [updated] = await db
    .update(expenses)
    .set({ status: "cancelled", voidedBy: staffUserId, voidedAt: new Date().toISOString(), voidReason: reason })
    .where(eq(expenses.id, expenseId))
    .returning();

  await logAudit({ outletId: expense.outletId, staffUserId, action: "void_expense", entityType: "expense", entityId: expenseId, after: { reason } });
  return updated;
}

/** Generate a new draft expense for every active recurring template whose nextDueDate has arrived (or passed). */
export async function generateDueRecurringExpenses(outletId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const due = await db
    .select()
    .from(recurringExpenseTemplates)
    .where(and(eq(recurringExpenseTemplates.outletId, outletId), eq(recurringExpenseTemplates.isActive, true)));

  const generated: string[] = [];
  for (const tpl of due) {
    if (tpl.nextDueDate.slice(0, 10) > today) continue;

    const periodLabel = new Date(tpl.nextDueDate).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const expense = await createExpense({
      outletId: tpl.outletId,
      accountId: tpl.accountId,
      category: tpl.category,
      description: `${tpl.name} — ${periodLabel}`,
      payeeName: tpl.payeeName ?? undefined,
      supplierId: tpl.supplierId ?? undefined,
      amount: tpl.amount,
      taxAmount: tpl.taxAmount,
      recordAsPayable: tpl.recordAsPayable,
      costCenterId: tpl.costCenterId ?? undefined,
      rentalUnitId: tpl.rentalUnitId ?? undefined,
      dueDate: tpl.nextDueDate,
      expenseDate: tpl.nextDueDate,
      isRecurringInstance: true,
      recurringTemplateId: tpl.id,
    });
    generated.push(expense.id);

    const next = new Date(tpl.nextDueDate);
    if (tpl.frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (tpl.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);

    await db
      .update(recurringExpenseTemplates)
      .set({ nextDueDate: next.toISOString(), lastGeneratedAt: new Date().toISOString() })
      .where(eq(recurringExpenseTemplates.id, tpl.id));
  }

  return generated;
}
