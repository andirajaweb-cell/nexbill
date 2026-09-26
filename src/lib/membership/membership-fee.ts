import { db } from "@/db/client";
import { membershipPayments, membershipTiers, customers, cashBankAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nomorBerikutnya } from "@/lib/db/nomor-urut";
import { postJournal, voidJournal } from "@/lib/accounting/journal";
import { getMappedAccountId, getCashBankAccountIdForPaymentMethod } from "@/lib/accounting/account-mapping";
import { logAudit } from "@/lib/audit/log";
import { resolvePaymentFee, feeExpenseLine } from "@/lib/accounting/payment-fee";
import { computeMembershipExpiry } from "./tier-benefits";
import { getActivePaymentMethods } from "@/lib/payments/methods";

/**
 * Paid membership signups/renewals — "Jual Keanggotaan" on the Membership & CRM page. A customer
 * pays a tier's feeAmount to join/move to it immediately (no draft/approval state, same rationale
 * as Other Income: money's already in hand by the time this is called), which posts a real
 * double-entry journal (Dr Kas/Bank per channel, Cr 4645 Pendapatan Keanggotaan) and feeds shift
 * cash reconciliation exactly like otherIncomes does — see lib/shift/shift.ts closeShift().
 *
 * Deliberately only cash and QRIS (per the feature request) — both are "settle immediately, no
 * external gateway confirmation needed" channels, unlike e.g. a VA that has to wait for a webhook.
 */
/**
 * Any ACTIVE method from the outlet's own Pembayaran catalog (cash, QRIS, transfer, e-wallet, custom
 * channels). This used to be hardcoded to ["cash", "qris"], so a member paying by bank transfer
 * could not be recorded at all. Each key resolves to its cash/bank GL account through Account
 * Mapping (getCashBankAccountIdForPaymentMethod), exactly like POS/Rental payments.
 */
export type MembershipPaymentMethod = string;

async function assertActivePaymentMethod(outletId: string, method: string) {
  const methods = await getActivePaymentMethods(outletId);
  const found = methods.find((m) => m.key === method);
  if (!found || !found.isActive) throw new Error("Metode pembayaran tidak tersedia. Pilih metode yang aktif di halaman Pembayaran.");
}

const round = (n: number) => Math.round(n);

/** payment_number UNIQUE secara global — lihat lib/db/nomor-urut.ts untuk bug count(*)+1 yang digantikan. */
function generatePaymentNumber(): Promise<string> {
  return nomorBerikutnya(membershipPayments, membershipPayments.paymentNumber, "MBR");
}

export interface SellMembershipInput {
  outletId: string;
  customerId: string;
  membershipTierId: string;
  paymentMethod: MembershipPaymentMethod;
  staffUserId?: string;
  shiftId?: string | null;
}

/** Charges a customer the tier's configured feeAmount and immediately assigns them to it. The amount is always the tier's current feeAmount at the moment of sale — not caller-suppliable — so this can never under/over-charge relative to what's configured. */
export async function sellMembership(input: SellMembershipInput) {
  await assertActivePaymentMethod(input.outletId, input.paymentMethod);

  const [tier] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, input.membershipTierId)).limit(1);
  if (!tier || tier.outletId !== input.outletId) throw new Error("Membership tier tidak ditemukan.");
  if (!(tier.feeAmount > 0)) throw new Error(`Tier "${tier.name}" tidak memerlukan pembayaran keanggotaan (biaya belum diatur).`);

  const [customer] = await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
  if (!customer || customer.outletId !== input.outletId) throw new Error("Customer tidak ditemukan.");

  const amount = round(tier.feeAmount);

  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(input.outletId, input.paymentMethod);
  const [cashBankRow] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!cashBankRow) throw new Error("Akun kas/bank untuk metode pembayaran ini tidak ditemukan.");

  // QRIS (and any other channel with a configured feePercent) is deducted here too — see
  // lib/accounting/payment-fee.ts. Revenue is still recognized at the full tier fee; only the
  // cash/bank debit is reduced.
  const feeAmount = await resolvePaymentFee(input.outletId, input.paymentMethod, amount);
  const netAmount = amount - feeAmount;

  const paymentNumber = await generatePaymentNumber();

  const [row] = await db
    .insert(membershipPayments)
    .values({
      paymentNumber,
      outletId: input.outletId,
      customerId: input.customerId,
      membershipTierId: input.membershipTierId,
      amount,
      paymentMethod: input.paymentMethod,
      feeAmount,
      cashBankAccountId,
      status: "posted",
      staffUserId: input.staffUserId,
      shiftId: input.shiftId ?? null,
    })
    .returning();

  const revenueAccountId = await getMappedAccountId(input.outletId, "membership_fee", "signup", "4645");

  const journalId = await postJournal({
    outletId: input.outletId,
    reference: paymentNumber,
    description: `Iuran Keanggotaan — ${tier.name} (${customer.name ?? "Customer"})`,
    sourceType: "membership_fee",
    sourceId: row.id,
    staffUserId: input.staffUserId,
    lines: [
      { accountId: cashBankRow.accountId, debit: netAmount, credit: 0, description: `Uang masuk (${input.paymentMethod})` },
      ...feeExpenseLine(feeAmount, input.paymentMethod),
      { accountId: revenueAccountId, debit: 0, credit: amount, description: `Iuran Keanggotaan — ${tier.name}` },
    ],
  });

  await db.update(membershipPayments).set({ journalEntryId: journalId }).where(eq(membershipPayments.id, row.id));

  /*
   * Assign/upgrade the customer to this tier immediately — the whole point of paying — dan pasang
   * tanggal berakhirnya sesuai validityDays tier.
   *
   * Perpanjangan ditumpuk di atas sisa masa berlaku yang masih ada, bukan dimulai ulang dari hari
   * ini; alasannya ada di computeMembershipExpiry(). Sisa itu hanya diperhitungkan kalau member
   * memperpanjang tier YANG SAMA — pindah ke tier lain adalah keanggotaan baru, dan menambahkan
   * sisa hari tier lama ke tier baru yang harganya berbeda akan memberi masa berlaku yang tidak
   * pernah dibayar siapa pun.
   */
  const memperpanjangTierYangSama = customer.membershipTierId === tier.id;
  const membershipExpiresAt = computeMembershipExpiry(
    tier.validityDays,
    memperpanjangTierYangSama ? customer.membershipExpiresAt : null
  );
  await db.update(customers).set({ membershipTierId: tier.id, membershipExpiresAt }).where(eq(customers.id, input.customerId));

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId,
    action: "sell_membership",
    entityType: "membership_payment",
    entityId: row.id,
    after: { paymentNumber, tierName: tier.name, amount, paymentMethod: input.paymentMethod, customerId: input.customerId },
  });

  return { ...row, journalEntryId: journalId };
}

/** Reverses the journal and marks the payment void. Deliberately does NOT touch the customer's current tier — see file-level doc comment for why. */
export async function voidMembershipPayment(id: string, staffUserId: string, reason: string) {
  const [row] = await db.select().from(membershipPayments).where(eq(membershipPayments.id, id)).limit(1);
  if (!row) throw new Error("Pembayaran keanggotaan tidak ditemukan.");
  if (row.status === "void") throw new Error("Pembayaran ini sudah di-void sebelumnya.");

  if (row.journalEntryId) await voidJournal(row.journalEntryId, reason);

  const [updated] = await db
    .update(membershipPayments)
    .set({ status: "void", voidedBy: staffUserId, voidedAt: new Date().toISOString(), voidReason: reason })
    .where(eq(membershipPayments.id, id))
    .returning();

  await logAudit({ outletId: row.outletId, staffUserId, action: "void_membership_payment", entityType: "membership_payment", entityId: id, before: { status: row.status }, after: { status: "void", reason } });
  return updated;
}

export interface ListMembershipPaymentsFilter {
  outletId: string;
  customerId?: string;
}

export async function listMembershipPayments(filter: ListMembershipPaymentsFilter) {
  const conditions = [eq(membershipPayments.outletId, filter.outletId)];
  if (filter.customerId) conditions.push(eq(membershipPayments.customerId, filter.customerId));
  return db.select().from(membershipPayments).where(and(...conditions)).orderBy(desc(membershipPayments.createdAt));
}
