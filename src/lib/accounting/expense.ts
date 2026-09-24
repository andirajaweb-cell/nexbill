import { db } from "@/db/client";
import { expenses, accounts, outlets, cashBankAccounts, recurringExpenseTemplates, staffUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nomorBerikutnya } from "@/lib/db/nomor-urut";
import { postJournal } from "./journal";
import { EXPENSE_PAYABLE_ACCOUNT_CODE } from "./coa";
import { isPeriodLocked } from "./periods";
import { logAudit } from "@/lib/audit/log";
import type { StaffRole } from "@/lib/auth/permissions";
import { hasPermission, canReviewRequestOf, roleLabel } from "@/lib/auth/permissions";
import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Approval-hierarchy check shared by approveExpense/rejectExpense — on top of the
 * approve_expenses permission gate, the approver must outrank whoever submitted the expense,
 * per the 6-tier level structure in permissions.ts. Owner/Superuser are exempt (they have no
 * superior inside the outlet — see canReviewRequestOf for the full rationale). An expense with
 * no staffUserId (shouldn't normally happen) skips the check.
 */
async function assertCanReviewExpense(expense: typeof expenses.$inferSelect, reviewerRole: StaffRole) {
  if (!expense.staffUserId) return;
  const [requester] = await db.select({ role: staffUsers.role }).from(staffUsers).where(eq(staffUsers.id, expense.staffUserId)).limit(1);
  if (!requester) return;
  if (!canReviewRequestOf(reviewerRole, requester.role as StaffRole)) {
    throw new Error(`Role kamu (${roleLabel(reviewerRole)}) tidak bisa menyetujui/menolak expense dari role yang levelnya setara atau lebih tinggi (${roleLabel(requester.role as StaffRole)}). Minta Owner yang menyetujui.`);
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

/** expense_number UNIQUE secara global — lihat lib/db/nomor-urut.ts untuk bug count(*)+1 yang digantikan. */
function generateExpenseNumber(): Promise<string> {
  return nomorBerikutnya(expenses, expenses.expenseNumber, "EXP");
}

async function assertExpenseAccount(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) throw new Error("Akun COA untuk expense tidak ditemukan.");
  if (account.type !== "expense") throw new Error(`Akun "${account.name}" bukan akun beban (type=${account.type}) — pilih akun COA bertipe expense.`);
  /*
   * Akun Header (mis. 5300 INVENTORY ADJUSTMENT) hanya pengelompok di laporan — jurnal harus masuk
   * ke salah satu akun turunannya. Dicek DI SINI, sebelum baris expense dibuat: dulu pengecekan ini
   * baru terjadi saat jurnal diposting di submitExpense(), sehingga expense-nya sudah telanjur
   * tersimpan sebagai draft yatim, dan pesannya tidak menyebut akun mana yang seharusnya dipilih.
   */
  if (!account.isPostingAllowed) {
    const turunan = await db
      .select({ code: accounts.code, name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.parentId, account.id), eq(accounts.isActive, true), eq(accounts.isPostingAllowed, true)))
      .orderBy(accounts.code);
    const saran = turunan.length ? ` Pilih salah satu: ${turunan.map((a) => `${a.code} ${a.name}`).join(", ")}.` : "";
    throw new Error(`"${account.code} ${account.name}" adalah akun Header (judul kelompok), bukan akun untuk mencatat biaya.${saran}`);
  }
  return account;
}

async function getCashBankGlAccountId(cashBankAccountId: string): Promise<string> {
  const [row] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row) throw new Error(`Akun kas/bank ${cashBankAccountId} tidak ditemukan.`);
  return row.accountId;
}

/**
 * Mengubah string kosong menjadi undefined untuk kolom yang merujuk tabel lain.
 *
 * BUG YANG DIPERBAIKI DI SINI (2026-09-22). Dropdown opsional di form Pengeluaran memakai
 * `<option value="">` untuk pilihan "tidak ada" — itu cara standar dan benar di HTML. Tapi nilai
 * yang terkirim adalah string KOSONG, bukan null, dan Postgres memperlakukannya sebagai id
 * sungguhan yang harus dicari. Hasilnya:
 *
 *     insert or update on table "expenses" violates foreign key constraint
 *     "expenses_supplier_id_suppliers_id_fk"
 *
 * Pesan yang tidak berarti apa pun bagi pemilik outlet, muncul hanya karena satu kolom OPSIONAL
 * dibiarkan kosong — persis seperti yang seharusnya boleh dilakukan.
 *
 * Dinormalkan di sini, bukan di form, karena inilah gerbang tunggal yang dilewati SEMUA pembuat
 * expense: form manual, Cash Out Cepat, dan generator recurring. Memperbaikinya di satu form hanya
 * akan menyisakan lubang yang sama di jalur lain.
 */
export const nullIfBlank = (v: string | null | undefined): string | undefined => {
  const trimmed = typeof v === "string" ? v.trim() : v;
  return trimmed ? trimmed : undefined;
};

export async function createExpense(input: CreateExpenseInput) {
  if (input.amount <= 0) throw new Error("Nominal expense harus lebih dari 0.");
  await assertExpenseAccount(input.accountId);

  // Dinormalkan SEBELUM pemeriksaan di bawah — tanpa ini, cashBankAccountId berisi "" lolos dari
  // pemeriksaan `!input.cashBankAccountId`... justru tidak, "" memang falsy. Tapi ketiga kolom lain
  // tidak punya pemeriksaan sama sekali, dan itulah yang menembus sampai ke database.
  input = {
    ...input,
    supplierId: nullIfBlank(input.supplierId),
    costCenterId: nullIfBlank(input.costCenterId),
    rentalUnitId: nullIfBlank(input.rentalUnitId),
    cashBankAccountId: nullIfBlank(input.cashBankAccountId),
    staffUserId: nullIfBlank(input.staffUserId),
    shiftId: nullIfBlank(input.shiftId),
    recurringTemplateId: nullIfBlank(input.recurringTemplateId),
  };

  if (!input.recordAsPayable && !input.cashBankAccountId) {
    throw new Error("Pilih akun kas/bank untuk expense yang dibayar langsung, atau centang 'Catat sebagai hutang' jika belum dibayar.");
  }

  const expenseNumber = await generateExpenseNumber();
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

  /*
   * Jurnal dicatat pada TANGGAL PENGELUARANNYA, bukan tanggal disetujui.
   *
   * BUG YANG DIPERBAIKI DI SINI (2026-09-21). Kedua panggilan postJournal di bawah tidak pernah
   * meneruskan entryDate, jadi keduanya jatuh ke nilai bawaan kolomnya (nowIso) — hari ini. Selama
   * expense dicatat dan disetujui di hari yang sama, tidak ada yang terlihat salah. Tapi begitu
   * pemilik mencatat biaya bulan lalu, atau menyetujui draft yang sudah menunggu beberapa hari,
   * biayanya mendarat di Laba Rugi bulan berjalan — bukan bulan tempat biaya itu sebenarnya
   * terjadi. Laba bulan lalu jadi terlihat lebih besar dari yang sebenarnya, dan bulan ini lebih
   * kecil; dua-duanya salah, dan tidak ada apa pun di layar yang menandainya.
   *
   * Ini juga yang membuat kolom Tanggal Pengeluaran di form menjadi setelan kosong: pemilik boleh
   * mengisinya mundur, tapi jurnalnya tetap tercatat hari ini.
   *
   * Sama seperti postSalesJournal: kalau periode tujuan sudah ditutup (Tutup Periode), tanggalnya
   * mundur ke hari ini — buku yang sudah dikunci tidak boleh disisipi entri baru.
   */
  const expenseDate = expense.expenseDate ?? new Date().toISOString();
  const entryDate = (await isPeriodLocked(expense.outletId, expenseDate)) ? new Date().toISOString() : expenseDate;

  if (expense.recordAsPayable) {
    const journalId = await postJournal({
      outletId: expense.outletId,
      entryDate,
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
    entryDate,
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

/**
 * Maksimum periode yang boleh disusulkan satu template dalam sekali jalan.
 *
 * Bukan batas bisnis, melainkan rem pengaman: kalau sebuah template pernah salah diisi dengan
 * nextDueDate bertahun-tahun ke belakang, tanpa batas ini satu klik akan membuat ratusan draft
 * expense sekaligus. Dua tahun bulanan sudah jauh melampaui ketertinggalan yang wajar; sisanya
 * dilaporkan lewat `templatesMasihTertinggal` supaya ketahuan, bukan dikerjakan diam-diam.
 */
const MAX_CATCH_UP_PERIODS = 24;

/**
 * Buat draft expense untuk setiap template recurring aktif yang sudah jatuh tempo — TERMASUK
 * menyusul periode-periode yang terlewat.
 *
 * DUA BUG YANG DIPERBAIKI DI SINI (2026-09-20):
 *
 * 1. Dulu hanya SATU instance dibuat per template per klik, lalu nextDueDate dimajukan satu
 *    periode. Template bulanan yang tertinggal tiga bulan menghasilkan satu draft dan tetap
 *    tertinggal dua bulan — dan tidak ada apa pun di layar yang memberi tahu bahwa masih ada yang
 *    kurang. Pemilik menekan tombolnya, melihat "1 draft expense dibuat", lalu wajar menyimpulkan
 *    pekerjaannya selesai. Biaya rutin yang diam-diam tidak tercatat membuat Laba Rugi terlihat
 *    lebih untung daripada kenyataan — kesalahan yang arahnya paling berbahaya.
 *
 * 2. Perbandingan jatuh tempo memakai `new Date().toISOString().slice(0, 10)`, yaitu tanggal UTC.
 *    Antara pukul 00.00–07.00 WIB, tanggal UTC masih kemarin, jadi template yang jatuh tempo HARI
 *    INI ikut terlewat. Rental PS justru ramai di jam-jam itu, sehingga inilah jam saat pemilik
 *    paling mungkin membuka halaman ini.
 *
 * Yang TIDAK berubah, dan memang disengaja: hasilnya tetap berstatus "draft". Biaya rutin seperti
 * gaji dan listrik nominalnya bisa berbeda tiap periode, jadi harus dilihat dan di-Submit manusia
 * sebelum masuk jurnal. Draft belum memposting jurnal apa pun, jadi belum muncul di Laba Rugi —
 * itu perilaku yang benar, bukan bug.
 */
export async function generateDueRecurringExpenses(outletId: string) {
  // Kalender WIB, bukan UTC — lihat bug #2 di atas dan doc comment outletDateYmd().
  const today = outletDateYmd(new Date());
  const due = await db
    .select()
    .from(recurringExpenseTemplates)
    .where(and(eq(recurringExpenseTemplates.outletId, outletId), eq(recurringExpenseTemplates.isActive, true)));

  const advance = (iso: string, frequency: string) => {
    const next = new Date(iso);
    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  };

  const generated: string[] = [];
  const templatesMasihTertinggal: { templateId: string; nama: string; jatuhTempoBerikutnya: string }[] = [];

  for (const tpl of due) {
    let cursor = tpl.nextDueDate;
    let dibuat = 0;

    // Terus menyusul selama tanggalnya masih di masa lalu (atau hari ini), sampai rem pengaman.
    while (outletDateYmd(new Date(cursor)) <= today && dibuat < MAX_CATCH_UP_PERIODS) {
      const periodLabel = new Date(cursor).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
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
        dueDate: cursor,
        // expenseDate memakai tanggal PERIODENYA, bukan hari ini — supaya biaya bulan lalu yang
        // baru disusulkan tetap jatuh di Laba Rugi bulan lalu setelah disetujui, bukan menumpuk di
        // bulan berjalan.
        expenseDate: cursor,
        isRecurringInstance: true,
        recurringTemplateId: tpl.id,
      });
      generated.push(expense.id);
      dibuat++;
      cursor = advance(cursor, tpl.frequency);
    }

    if (dibuat === 0) continue;

    await db
      .update(recurringExpenseTemplates)
      .set({ nextDueDate: cursor, lastGeneratedAt: new Date().toISOString() })
      .where(eq(recurringExpenseTemplates.id, tpl.id));

    // Kena rem pengaman dan masih tertinggal — dilaporkan supaya pemilik tahu harus menekan lagi,
    // alih-alih mengira semuanya sudah beres.
    if (dibuat >= MAX_CATCH_UP_PERIODS && outletDateYmd(new Date(cursor)) <= today) {
      templatesMasihTertinggal.push({ templateId: tpl.id, nama: tpl.name, jatuhTempoBerikutnya: cursor });
    }
  }

  return { generated, templatesMasihTertinggal };
}
