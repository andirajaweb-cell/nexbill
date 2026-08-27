import { db } from "@/db/client";
import { ppobTransactions, cashBankAccounts, journalEntries, journalLines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { postJournal, voidJournal, JournalLineInput } from "@/lib/accounting/journal";
import { computeTrialBalance } from "@/lib/accounting/reports";
import { getMappedAccountId } from "@/lib/accounting/account-mapping";
import { logAudit } from "@/lib/audit/log";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";

/** Which PPOB revenue account a category's fee+margin lands in — mirrors the "ppob" mapping module's defaults (see account-mapping.ts DEFAULT_MAPPING_SEED). */
const PPOB_REVENUE_FALLBACK_CODE: Record<PpobCategory, string> = {
  pulsa: "4410",
  token_listrik: "4430",
  ewallet_topup: "4460",
  transfer: "4480",
  tarik_tunai: "4480",
  lainnya: "4480",
};

const round = (n: number) => Math.round(n * 100) / 100;

export type PpobCategory = "ewallet_topup" | "token_listrik" | "pulsa" | "transfer" | "tarik_tunai" | "lainnya";

export interface CreatePpobInput {
  outletId: string;
  category: PpobCategory;
  product: string;
  serviceRef?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  nominal: number;
  modal: number;
  providerFee: number;
  feeAdmin: number; // margin — shop's own profit, independent of providerFee
  fundingCashBankAccountId: string;
  receivingCashBankAccountId: string;
  staffUserId?: string | null;
  shiftId?: string | null;
  notes?: string | null;
}

/**
 * Shared journal-line builder used by both posting a new PPOB transaction and
 * re-posting a corrected one after an edit — see postPpobTransaction's doc
 * comment for the accounting rationale (gross-up of provider fee + margin).
 * funding/receiving are cashBankAccounts rows ({ id, accountId }).
 */
async function buildPpobJournalLines(
  outletId: string,
  category: PpobCategory,
  label: string,
  modal: number,
  providerFee: number,
  feeAdmin: number,
  uangMasuk: number,
  funding: { id: string; accountId: string },
  receiving: { id: string; accountId: string }
): Promise<JournalLineInput[]> {
  const lines: JournalLineInput[] = [];

  if (funding.id === receiving.id) {
    const net = round(uangMasuk - (modal + providerFee)); // == feeAdmin, but derived to be robust to rounding
    if (net > 0) lines.push({ accountId: funding.accountId, debit: net, credit: 0, description: `Margin bersih ${label}` });
    else if (net < 0) lines.push({ accountId: funding.accountId, debit: 0, credit: -net, description: `Margin bersih ${label}` });
  } else {
    lines.push({ accountId: receiving.accountId, debit: uangMasuk, credit: 0, description: `Uang masuk ${label}` });
    lines.push({ accountId: funding.accountId, debit: 0, credit: round(modal + providerFee), description: `Modal + biaya provider ${label}` });
  }

  if (providerFee !== 0) {
    const feeAccountId = await getMappedAccountId(outletId, "ppob", "provider_fee", "6570");
    lines.push({ accountId: feeAccountId, debit: providerFee, credit: 0, description: `Beban biaya Fastpay (provider) ${label}` });
  }
  const revenueLine = round(providerFee + feeAdmin);
  if (revenueLine !== 0) {
    const revenueAccountId = await getMappedAccountId(outletId, "ppob", category, PPOB_REVENUE_FALLBACK_CODE[category]);
    lines.push({ accountId: revenueAccountId, debit: 0, credit: revenueLine, description: `Pendapatan PPOB ${label}` });
  }
  return lines;
}

/**
 * Records one PPOB transaction (top-up e-wallet, token listrik, pulsa, transfer,
 * tarik tunai, dst.) and posts the matching journal in one shot. This module
 * doesn't call any real Fastpay API — the cashier executes the actual top-
 * up/token/transfer over at Fastpay themselves; this only books what happened.
 *
 * Three separate money components, all independently editable:
 *   modal (N)        — cost of the underlying product (face value paid out)
 *   providerFee (F)   — the REAL cost Fastpay (the principal/provider) charges the
 *                        shop per fastpay.co.id/blog/layanan-fee's Fee Outlet
 *                        schedule (Basic tier) — booked as an EXPENSE, not revenue
 *   feeAdmin (M)      — the shop's own margin/profit, set independently (not from
 *                        that schedule at all — configurable per product)
 *   uangMasuk (U)     — N + F + M, what the customer actually pays
 *
 * Journal (funding != receiving, the common case — e.g. funding = Saldo Fastpay,
 * receiving = Cash for a top-up; reversed for tarik tunai):
 *   Dr [akun penerima]         U
 *   Cr [akun sumber modal]     N + F   (Fastpay takes both the product cost AND its fee from the same balance)
 *   Dr 6350 Beban Biaya Layanan PPOB (Fastpay)   F
 *   Cr 4300 Pendapatan PPOB    F + M   (gross: reimbursed provider fee + real margin — nets to M after the 6350 expense)
 * This is a standard gross-up: revenue and expense are both shown in full so the
 * P&L makes Fastpay's cut visible, and they cancel down to true profit M.
 *
 * If funding and receiving are the SAME account, lines 1+2 collapse into a single
 * net line (debiting just the margin M) so the journal doesn't show a debit and
 * credit of the same account for no reason — the 6350/4300 pair stays as-is.
 * When providerFee is 0 (e.g. pulsa/e-wallet, which Fastpay doesn't publish a
 * fixed fee for — see price-rules.ts) this degrades exactly to the simpler
 * modal/margin-only journal from before providerFee existed.
 */
export async function postPpobTransaction(input: CreatePpobInput) {
  // Module master switch — see Settings > Feature Management. Checked here (not just hidden in
  // the sidebar/page) so a superuser turning PPOB OFF actually blocks new transactions from any
  // caller, not just the one that happens to render the nav link.
  if (!(await isFeatureEnabled(input.outletId, "PPOB_ENABLED"))) {
    throw new Error("Modul PPOB sedang dinonaktifkan untuk outlet ini. Aktifkan lagi di Settings > Feature Management.");
  }

  const modal = round(input.modal);
  const providerFee = round(input.providerFee);
  const feeAdmin = round(input.feeAdmin);
  const uangMasuk = round(modal + providerFee + feeAdmin);

  const [funding] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.fundingCashBankAccountId)).limit(1);
  const [receiving] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.receivingCashBankAccountId)).limit(1);
  if (!funding) throw new Error("Akun sumber modal tidak ditemukan.");
  if (!receiving) throw new Error("Akun penerima uang masuk tidak ditemukan.");

  const [row] = await db
    .insert(ppobTransactions)
    .values({
      outletId: input.outletId,
      category: input.category,
      product: input.product,
      serviceRef: input.serviceRef ?? null,
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? null,
      nominal: input.nominal,
      modal,
      providerFee,
      feeAdmin,
      uangMasuk,
      fundingCashBankAccountId: input.fundingCashBankAccountId,
      receivingCashBankAccountId: input.receivingCashBankAccountId,
      staffUserId: input.staffUserId ?? null,
      shiftId: input.shiftId ?? null,
      notes: input.notes ?? null,
      status: "success",
    })
    .returning();

  const label = `PPOB ${input.product}${input.serviceRef ? " - " + input.serviceRef : ""}`;
  const lines = await buildPpobJournalLines(input.outletId, input.category, label, modal, providerFee, feeAdmin, uangMasuk, funding, receiving);

  let journalId: string | null = null;
  if (lines.length > 0) {
    journalId = await postJournal({
      outletId: input.outletId,
      description: `Transaksi ${label} (${input.category})`,
      sourceType: "ppob",
      sourceId: row.id,
      staffUserId: input.staffUserId ?? undefined,
      lines,
    });
    await db.update(ppobTransactions).set({ journalEntryId: journalId }).where(eq(ppobTransactions.id, row.id));
  }

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId ?? undefined,
    action: "create_ppob_transaction",
    entityType: "ppob_transaction",
    entityId: row.id,
    after: { product: input.product, category: input.category, nominal: input.nominal, modal, providerFee, feeAdmin, uangMasuk },
  });

  return { ...row, journalEntryId: journalId };
}

/** Reverses a PPOB transaction: voids the posted journal (exact reverse entry, history preserved) and flips status to "reversed" — never hard-deletes, same convention as refund/void elsewhere in this app. */
export async function voidPpobTransaction(id: string, reason: string, staffUserId?: string) {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");
  if (row.status === "reversed") throw new Error("Transaksi ini sudah dibatalkan/reversed sebelumnya.");

  if (row.journalEntryId) {
    await voidJournal(row.journalEntryId, reason);
  }

  const [updated] = await db
    .update(ppobTransactions)
    .set({ status: "reversed", reversedReason: reason, reversedAt: new Date().toISOString() })
    .where(eq(ppobTransactions.id, id))
    .returning();

  await logAudit({ outletId: row.outletId, staffUserId, action: "void_ppob_transaction", entityType: "ppob_transaction", entityId: id, before: { status: row.status }, after: { status: "reversed", reason } });
  return updated;
}

export interface EditPpobInput {
  category?: PpobCategory;
  product?: string;
  serviceRef?: string | null;
  customerName?: string | null;
  nominal?: number;
  modal?: number;
  providerFee?: number;
  feeAdmin?: number;
  fundingCashBankAccountId?: string;
  receivingCashBankAccountId?: string;
  notes?: string | null;
}

/**
 * Corrects a PPOB transaction's figures after the fact — reserved for Owner
 * (enforced in the API route, not here). Rather than mutating the row's
 * money fields while leaving the already-posted journal stale, this voids
 * the original journal entry (preserved for audit, same as elsewhere) and
 * posts a fresh one off the corrected numbers, then updates the row itself
 * so PPOB reports/lists show the corrected figures going forward.
 */
export async function editPpobTransaction(id: string, input: EditPpobInput, staffUserId?: string) {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");
  if (row.status === "reversed") throw new Error("Transaksi yang sudah dibatalkan tidak bisa diedit — buat transaksi baru kalau perlu koreksi.");

  const category = input.category ?? (row.category as PpobCategory);
  const product = input.product ?? row.product;
  const serviceRef = input.serviceRef !== undefined ? input.serviceRef : row.serviceRef;
  const customerName = input.customerName !== undefined ? input.customerName : row.customerName;
  const nominal = input.nominal ?? row.nominal;
  const modal = round(input.modal ?? row.modal);
  const providerFee = round(input.providerFee ?? row.providerFee);
  const feeAdmin = round(input.feeAdmin ?? row.feeAdmin);
  const fundingCashBankAccountId = input.fundingCashBankAccountId ?? row.fundingCashBankAccountId;
  const receivingCashBankAccountId = input.receivingCashBankAccountId ?? row.receivingCashBankAccountId;
  const notes = input.notes !== undefined ? input.notes : row.notes;
  const uangMasuk = round(modal + providerFee + feeAdmin);

  const [funding] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, fundingCashBankAccountId)).limit(1);
  const [receiving] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, receivingCashBankAccountId)).limit(1);
  if (!funding) throw new Error("Akun sumber modal tidak ditemukan.");
  if (!receiving) throw new Error("Akun penerima uang masuk tidak ditemukan.");

  if (row.journalEntryId) {
    await voidJournal(row.journalEntryId, "Dikoreksi (edit transaksi PPOB oleh Owner)");
  }

  const label = `PPOB ${product}${serviceRef ? " - " + serviceRef : ""}`;
  const lines = await buildPpobJournalLines(row.outletId, category, label, modal, providerFee, feeAdmin, uangMasuk, funding, receiving);

  let journalId: string | null = null;
  if (lines.length > 0) {
    journalId = await postJournal({
      outletId: row.outletId,
      description: `Transaksi ${label} (${category}) — dikoreksi`,
      sourceType: "ppob",
      sourceId: row.id,
      staffUserId,
      lines,
    });
  }

  const [updated] = await db
    .update(ppobTransactions)
    .set({
      category, product, serviceRef, customerName, nominal, modal, providerFee, feeAdmin, uangMasuk,
      fundingCashBankAccountId, receivingCashBankAccountId, notes, journalEntryId: journalId, status: "success",
    })
    .where(eq(ppobTransactions.id, id))
    .returning();

  await logAudit({ outletId: row.outletId, staffUserId, action: "edit_ppob_transaction", entityType: "ppob_transaction", entityId: id, before: row, after: updated });
  return updated;
}

/**
 * Genuinely deletes a PPOB transaction and its journal entry — reserved for
 * Owner (enforced in the API route). Unlike voidPpobTransaction (reverses
 * and keeps the row for audit trail), this removes it completely.
 */
export async function hardDeletePpobTransaction(id: string, staffUserId?: string) {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");

  if (row.journalEntryId) {
    await db.delete(journalLines).where(eq(journalLines.journalEntryId, row.journalEntryId));
    await db.delete(journalEntries).where(eq(journalEntries.id, row.journalEntryId));
  }
  await db.delete(ppobTransactions).where(eq(ppobTransactions.id, id));

  await logAudit({ outletId: row.outletId, staffUserId, action: "delete_ppob_transaction", entityType: "ppob_transaction", entityId: id, before: row });
  return { id };
}

/** Current balance of the Fastpay PPOB deposit account (COA 1151), computed the same way as every other balance in this app — via the trial balance, which already nets out voided entries correctly. */
export async function getFastpaySaldoBalance(outletId: string): Promise<number> {
  const tb = await computeTrialBalance(outletId);
  return tb.find((r) => r.code === "1151")?.balance ?? 0;
}
