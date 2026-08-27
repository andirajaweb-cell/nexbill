import { db } from "@/db/client";
import { otherIncomes, cashBankAccounts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { postJournal, voidJournal } from "./journal";
import { getMappedAccountId, getCashBankAccountIdForPaymentMethod } from "./account-mapping";
import { logAudit } from "@/lib/audit/log";
import type { PaymentMethod } from "@/lib/payments/types";
import { resolvePaymentFee, feeExpenseLine } from "./payment-fee";

/**
 * "Pendapatan Lain-lain" (Other Income) — money received that isn't from
 * selling the core products (Rental/F&B/PPOB/POS). See schema.ts for the
 * full rationale on why this posts immediately (no draft/approval state
 * machine like expenses.ts) and how it plugs into shift cash reconciliation
 * (shift/shift.ts).
 */

export type OtherIncomeCategory =
  | "vendor_commission"
  | "asset_rental"
  | "asset_sale"
  | "sponsorship"
  | "penalty_compensation"
  | "bank_interest_cashback"
  | "other";

export const OTHER_INCOME_CATEGORY_LABEL: Record<OtherIncomeCategory, string> = {
  vendor_commission: "Komisi / Kerjasama Vendor",
  asset_rental: "Sewa Tempat/Aset ke Pihak Lain",
  asset_sale: "Penjualan Aset/Barang Bekas",
  sponsorship: "Sponsorship / Kerjasama Event",
  penalty_compensation: "Denda / Ganti Rugi dari Pelanggan",
  bank_interest_cashback: "Bunga Bank / Cashback / Promo",
  other: "Lain-lain",
};

export const OTHER_INCOME_CATEGORY_OPTIONS: { value: OtherIncomeCategory; label: string }[] = (
  Object.keys(OTHER_INCOME_CATEGORY_LABEL) as OtherIncomeCategory[]
).map((value) => ({ value, label: OTHER_INCOME_CATEGORY_LABEL[value] }));

/** Mirrors the "other_income" mapping module's defaults (see account-mapping.ts DEFAULT_MAPPING_SEED). */
const CATEGORY_FALLBACK_CODE: Record<OtherIncomeCategory, string> = {
  vendor_commission: "4710",
  asset_rental: "4720",
  asset_sale: "4730",
  sponsorship: "4740",
  penalty_compensation: "4750",
  bank_interest_cashback: "4760",
  other: "4770",
};

const round = (n: number) => Math.round(n);

export interface CreateOtherIncomeInput {
  outletId: string;
  category: OtherIncomeCategory;
  description?: string;
  payerName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  costCenterId?: string;
  attachmentUrl?: string;
  incomeDate?: string;
  staffUserId?: string;
  shiftId?: string | null;
}

async function generateIncomeNumber(outletId: string): Promise<string> {
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(otherIncomes)
    .where(eq(otherIncomes.outletId, outletId))) as { count: number }[];
  return `INC-${String(count + 1).padStart(5, "0")}`;
}

/** Records one Other Income entry and posts its journal (Dr Kas/Bank per channel, Cr Pendapatan Lain-lain per category) in one shot — no separate submit/approve step, money's already in hand. */
export async function createOtherIncome(input: CreateOtherIncomeInput) {
  if (!(input.amount > 0)) throw new Error("Nominal harus lebih dari 0.");
  const amount = round(input.amount);

  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(input.outletId, input.paymentMethod);
  const [cashBankRow] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!cashBankRow) throw new Error("Akun kas/bank untuk metode pembayaran ini tidak ditemukan.");

  // Deducted at the configured rate (e.g. QRIS MDR) — see lib/accounting/payment-fee.ts. Revenue
  // is still recognized at the full gross amount; only the cash/bank debit is reduced by the fee.
  const feeAmount = await resolvePaymentFee(input.outletId, input.paymentMethod, amount);
  const netAmount = amount - feeAmount;

  const incomeNumber = await generateIncomeNumber(input.outletId);
  const label = input.description?.trim() || OTHER_INCOME_CATEGORY_LABEL[input.category];

  const [row] = await db
    .insert(otherIncomes)
    .values({
      incomeNumber,
      outletId: input.outletId,
      category: input.category,
      description: input.description,
      payerName: input.payerName,
      amount,
      paymentMethod: input.paymentMethod,
      feeAmount,
      cashBankAccountId,
      attachmentUrl: input.attachmentUrl,
      costCenterId: input.costCenterId,
      status: "posted",
      staffUserId: input.staffUserId,
      shiftId: input.shiftId ?? null,
      incomeDate: input.incomeDate ?? new Date().toISOString(),
    })
    .returning();

  const revenueAccountId = await getMappedAccountId(input.outletId, "other_income", input.category, CATEGORY_FALLBACK_CODE[input.category]);

  const journalId = await postJournal({
    outletId: input.outletId,
    reference: incomeNumber,
    description: `Pendapatan Lain-lain — ${label}`,
    sourceType: "other_income",
    sourceId: row.id,
    staffUserId: input.staffUserId,
    lines: [
      { accountId: cashBankRow.accountId, debit: netAmount, credit: 0, description: `Uang masuk (${input.paymentMethod})` },
      ...feeExpenseLine(feeAmount, input.paymentMethod),
      { accountId: revenueAccountId, debit: 0, credit: amount, description: OTHER_INCOME_CATEGORY_LABEL[input.category] },
    ],
  });

  await db.update(otherIncomes).set({ journalEntryId: journalId }).where(eq(otherIncomes.id, row.id));

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId,
    action: "create_other_income",
    entityType: "other_income",
    entityId: row.id,
    after: { incomeNumber, category: input.category, amount, paymentMethod: input.paymentMethod },
  });

  return { ...row, journalEntryId: journalId };
}

/** Reverses an Other Income entry: voids the posted journal (exact reverse, history preserved) and flips status to "void" — never hard-deletes. */
export async function voidOtherIncome(id: string, staffUserId: string, reason: string) {
  const [row] = await db.select().from(otherIncomes).where(eq(otherIncomes.id, id)).limit(1);
  if (!row) throw new Error("Pendapatan lain-lain tidak ditemukan.");
  if (row.status === "void") throw new Error("Entri ini sudah di-void sebelumnya.");

  if (row.journalEntryId) await voidJournal(row.journalEntryId, reason);

  const [updated] = await db
    .update(otherIncomes)
    .set({ status: "void", voidedBy: staffUserId, voidedAt: new Date().toISOString(), voidReason: reason })
    .where(eq(otherIncomes.id, id))
    .returning();

  await logAudit({ outletId: row.outletId, staffUserId, action: "void_other_income", entityType: "other_income", entityId: id, before: { status: row.status }, after: { status: "void", reason } });
  return updated;
}

export interface ListOtherIncomeFilter {
  outletId: string;
  from?: string;
  to?: string;
  category?: string;
  status?: string;
}

export async function listOtherIncomes(filter: ListOtherIncomeFilter) {
  const conditions = [eq(otherIncomes.outletId, filter.outletId)];
  if (filter.category) conditions.push(eq(otherIncomes.category, filter.category as OtherIncomeCategory));
  if (filter.status) conditions.push(eq(otherIncomes.status, filter.status as "posted" | "void"));

  const rows = await db
    .select()
    .from(otherIncomes)
    .where(and(...conditions))
    .orderBy(desc(otherIncomes.incomeDate));

  const filtered = rows.filter((r) => (!filter.from || r.incomeDate >= filter.from) && (!filter.to || r.incomeDate <= filter.to));
  const totalPosted = filtered.filter((r) => r.status === "posted").reduce((s, r) => s + r.amount, 0);
  return { rows: filtered, totalPosted };
}
