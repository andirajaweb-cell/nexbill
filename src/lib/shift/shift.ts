import { db } from "@/db/client";
import { shifts, shiftCashCounts, shiftBalanceChecks, payments, orders, expenses, cashBankAccounts, otherIncomes, homeRentalRentals, depositBalanceChannels, membershipPayments } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { computeTrialBalance } from "@/lib/accounting/reports";
import { getCashBankAccountIdForPaymentMethod } from "@/lib/accounting/account-mapping";
import { CASH_DENOMINATIONS, BALANCE_TRACKED_METHODS, CHANNEL_LABEL } from "./denominations";

export async function openShift(outletId: string, staffUserId: string, openingCash: number) {
  const [existing] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.outletId, outletId), eq(shifts.staffUserId, staffUserId), eq(shifts.status, "open")));
  if (existing) throw new Error("Kamu masih punya shift yang belum ditutup.");

  const [shift] = await db.insert(shifts).values({ outletId, staffUserId, openingCash }).returning();
  return shift;
}

export interface CashCountInput {
  denomination: number;
  qty: number;
}

export interface BalanceCheckInput {
  channelKey: string; // payments.method value ("gopay"/"dana"/"bukupay"/"fastpay_h2h") or "ppob_fastpay_saldo"
  actualBalance: number;
}

/**
 * Which non-cash channels this shift needs a balance check for: every
 * BALANCE_TRACKED_METHODS channel that actually received a successful
 * payment during the shift, plus every owner-editable deposit-balance channel
 * unconditionally (the seeded Fastpay PPOB saldo, plus any custom ones the
 * owner added via /api/deposit-balance-channels — see depositBalanceChannels
 * table). These are shared company-wide floats any cashier could draw down
 * from, and their underlying transactions aren't reliably shift-tagged today,
 * so every one is checked every close rather than only when this specific
 * shift is detected to have touched it.
 */
export async function getRequiredBalanceChannels(shiftId: string): Promise<{ channelKey: string; label: string }[]> {
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift) return [];
  const shiftOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.shiftId, shiftId));
  const orderIds = shiftOrders.map((o) => o.id);
  const shiftPayments = orderIds.length
    ? await db.select().from(payments).where(and(inArray(payments.orderId, orderIds), eq(payments.status, "success")))
    : [];
  // Other Income received via a balance-tracked channel (GoPay/DANA/BukuPay/Fastpay) also has
  // to show up here — otherwise a cashier could receive it off a channel that never gets
  // checked this shift, closing the exact blind spot the balance-check verification exists for.
  const shiftOtherIncomes = await db.select().from(otherIncomes).where(and(eq(otherIncomes.shiftId, shiftId), eq(otherIncomes.status, "posted")));
  // Home Rental checkout payment + security deposit — both can land on a balance-tracked
  // channel (e.g. deposit taken via GoPay while the rental fee itself was cash), so both
  // columns have to be checked, same blind-spot rationale as Other Income above.
  const shiftHomeRentals = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.shiftId, shiftId));
  // Returns processed this shift also move non-cash channels (late fee / deposit release).
  const shiftHomeRentalReturns = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.returnShiftId, shiftId));

  const methodsUsed = new Set(
    [
      ...shiftPayments.map((p) => p.method as string),
      ...shiftOtherIncomes.map((o) => o.paymentMethod as string),
      ...shiftHomeRentals.map((r) => r.paymentMethod as string).filter(Boolean),
      ...shiftHomeRentals.map((r) => r.depositPaymentMethod as string).filter(Boolean),
      ...shiftHomeRentalReturns.map((r) => r.lateFeePaymentMethod as string).filter(Boolean),
      ...shiftHomeRentalReturns.map((r) => r.depositPaymentMethod as string).filter(Boolean),
    ].filter((m) => BALANCE_TRACKED_METHODS.has(m))
  );
  const channels: { channelKey: string; label: string }[] = Array.from(methodsUsed).map((key) => ({ channelKey: key, label: CHANNEL_LABEL[key] ?? key }));

  const depositChannels = await db
    .select()
    .from(depositBalanceChannels)
    .where(and(eq(depositBalanceChannels.outletId, shift.outletId), eq(depositBalanceChannels.isActive, true)));
  for (const dc of depositChannels) {
    channels.push({ channelKey: dc.channelKey, label: dc.label });
  }
  return channels;
}

/**
 * Close a shift with a full physical denomination count (blind — the
 * cashier submits their count/balance readings without ever being shown the
 * system's expected figures first; expected is computed here, server-side,
 * only at the moment of closing) plus non-cash channel balance verification.
 *
 * Cash: expected cash = opening float + cash payments received during the
 * shift − cash expenses paid out during the shift, same logic as before —
 * only now actualCash is derived from the denomination breakdown instead of
 * being a single typed-in number, and every denomination row is persisted
 * for audit (traceable to exactly which note/coin count was off).
 *
 * Non-cash: for every balance-tracked channel active this shift (see
 * getRequiredBalanceChannels), expectedBalance = the account's current
 * cumulative GL balance (these are running saldo balances, not per-shift
 * deltas — same treatment as the existing Fastpay PPOB saldo check), and
 * the cashier-entered actualBalance is compared against it.
 */
export async function closeShift(
  shiftId: string,
  input: { cashCounts: CashCountInput[]; balanceChecks: BalanceCheckInput[]; notes?: string }
) {
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift) throw new Error("Shift tidak ditemukan.");
  if (shift.status === "closed") throw new Error("Shift sudah ditutup.");

  // --- Validate & normalize the denomination count ---
  const countByDenom = new Map(input.cashCounts.map((c) => [c.denomination, Math.max(0, Math.floor(c.qty || 0))]));
  for (const denom of countByDenom.keys()) {
    if (!(CASH_DENOMINATIONS as readonly number[]).includes(denom)) {
      throw new Error(`Pecahan Rp${denom} tidak dikenal.`);
    }
  }
  const cashRows = CASH_DENOMINATIONS.map((denomination) => {
    const qty = countByDenom.get(denomination) ?? 0;
    return { denomination, qty, subtotal: denomination * qty };
  });
  const actualCash = cashRows.reduce((s, r) => s + r.subtotal, 0);

  const closedAt = new Date().toISOString();

  const shiftOrders = await db.select().from(orders).where(eq(orders.shiftId, shiftId));
  const orderIds = shiftOrders.map((o) => o.id);

  const cashPayments = orderIds.length
    ? await db.select().from(payments).where(and(inArray(payments.orderId, orderIds), eq(payments.method, "cash"), eq(payments.status, "success")))
    : [];
  // Cash received as Other Income (e.g. selling scrap gear, vendor commission paid in cash) sits
  // in the same physical drawer as order payments, so it has to count toward expected cash too —
  // otherwise every cash "other income" entry would show up as an unexplained overage at close.
  const shiftCashOtherIncomes = await db
    .select()
    .from(otherIncomes)
    .where(and(eq(otherIncomes.shiftId, shiftId), eq(otherIncomes.paymentMethod, "cash"), eq(otherIncomes.status, "posted")));
  // Cash collected for a paid membership signup/renewal — same drawer, same reasoning as
  // shiftCashOtherIncomes above. QRIS membership payments don't need an equivalent hookup: QRIS
  // is an "info_only" channel (settles straight to a bank/EDC account), never part of the
  // physical cash count or the balance-tracked-channel check in getRequiredBalanceChannels.
  const shiftCashMembershipPayments = await db
    .select()
    .from(membershipPayments)
    .where(and(eq(membershipPayments.shiftId, shiftId), eq(membershipPayments.paymentMethod, "cash"), eq(membershipPayments.status, "posted")));
  // Home Rental cash received this shift — checkout payment (rentalFee+fees) and the
  // security deposit are tracked in separate columns on the same row and can each be a
  // different method, so both are checked independently for "cash" before counting.
  const shiftHomeRentalsForCash = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.shiftId, shiftId));
  const homeRentalCashIn = shiftHomeRentalsForCash.reduce((s, r) => {
    const paidCash = r.paymentMethod === "cash" ? r.paidAmount : 0;
    const depositCash = r.depositPaymentMethod === "cash" ? r.depositAmount : 0;
    return s + paidCash + depositCash;
  }, 0);
  // Home Rental returns processed THIS shift (which may differ from the checkout shift —
  // a rental can be checked out one day and returned another) can also move cash: a late
  // fee collected in cash is money IN, a deposit released back to the customer in cash is
  // money OUT of this drawer, not the checkout shift's.
  const shiftHomeRentalsForReturn = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.returnShiftId, shiftId));
  const homeRentalLateFeeCashIn = shiftHomeRentalsForReturn.reduce((s, r) => (r.lateFeePaymentMethod === "cash" ? s + r.lateFee : s), 0);
  const homeRentalDepositCashOut = shiftHomeRentalsForReturn.reduce(
    (s, r) => (r.depositStatus === "released" && r.depositPaymentMethod === "cash" ? s + r.depositAmount : s),
    0
  );

  const cashIn =
    cashPayments.reduce((s, p) => s + p.amount, 0) +
    // Physical cash in the drawer is the NET amount (after any configured fee) — amount is the
    // gross/recognized-revenue figure, feeAmount is what a gateway/channel took, so amount-feeAmount
    // is what the cashier actually holds. Fee is normally 0 for cash channels, so this is a no-op
    // in practice, but stays correct if an outlet ever configures one. See lib/accounting/payment-fee.ts.
    shiftCashOtherIncomes.reduce((s, o) => s + (o.amount - (o.feeAmount ?? 0)), 0) +
    shiftCashMembershipPayments.reduce((s, m) => s + (m.amount - (m.feeAmount ?? 0)), 0) +
    homeRentalCashIn +
    homeRentalLateFeeCashIn;

  // Only status="paid" actually moved cash out of the drawer — draft/pending/rejected/cancelled
  // (including voided-back-to-cancelled) expenses never posted a journal against this till.
  const shiftExpenses = await db.select().from(expenses).where(and(eq(expenses.shiftId, shiftId), eq(expenses.status, "paid")));
  const cashExpenseAccounts = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.type, "cash"));
  const cashAccountIds = new Set(cashExpenseAccounts.map((a) => a.id));
  const cashOut =
    shiftExpenses.filter((e) => e.cashBankAccountId && cashAccountIds.has(e.cashBankAccountId)).reduce((s, e) => s + e.amount + (e.taxAmount ?? 0), 0) +
    homeRentalDepositCashOut;

  const expectedCash = shift.openingCash + cashIn - cashOut;
  const variance = actualCash - expectedCash;

  // --- Non-cash channel balance checks ---
  const requiredChannels = await getRequiredBalanceChannels(shiftId);
  const submitted = new Map(input.balanceChecks.map((b) => [b.channelKey, b.actualBalance]));
  const tb = await computeTrialBalance(shift.outletId, undefined, closedAt);
  const balanceByAccountId = new Map(tb.map((r) => [r.accountId, r.balance]));
  const depositChannelsByKey = new Map(
    (await db.select().from(depositBalanceChannels).where(eq(depositBalanceChannels.outletId, shift.outletId))).map((dc) => [dc.channelKey, dc])
  );

  const balanceCheckRows: { channelKey: string; label: string; cashBankAccountId: string | null; expectedBalance: number; actualBalance: number; variance: number }[] = [];
  for (const { channelKey, label } of requiredChannels) {
    const actualBalance = submitted.get(channelKey);
    if (actualBalance === undefined) {
      throw new Error(`Saldo aktual untuk channel "${label}" wajib diisi sebelum shift bisa ditutup.`);
    }
    let cashBankAccountId: string | null = null;
    let expectedBalance = 0;
    // Deposit-balance channels (Fastpay PPOB saldo + any custom ones) resolve
    // straight off their own row — accountId/cashBankAccountId are stored
    // there directly, calibrated when the channel was created/renamed, so no
    // name-string matching is involved.
    const depositChannel = depositChannelsByKey.get(channelKey);
    if (depositChannel) {
      cashBankAccountId = depositChannel.cashBankAccountId;
      expectedBalance = balanceByAccountId.get(depositChannel.accountId) ?? 0;
    } else {
      cashBankAccountId = await getCashBankAccountIdForPaymentMethod(shift.outletId, channelKey);
      const [row] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
      expectedBalance = row ? balanceByAccountId.get(row.accountId) ?? 0 : 0;
    }
    balanceCheckRows.push({ channelKey, label, cashBankAccountId, expectedBalance, actualBalance, variance: actualBalance - expectedBalance });
  }
  const nonCashVarianceTotal = balanceCheckRows.reduce((s, r) => s + Math.abs(r.variance), 0);

  // --- Persist everything ---
  if (cashRows.length) {
    await db.insert(shiftCashCounts).values(cashRows.map((r) => ({ shiftId, ...r })));
  }
  if (balanceCheckRows.length) {
    await db.insert(shiftBalanceChecks).values(balanceCheckRows.map((r) => ({ shiftId, ...r })));
  }

  const [updated] = await db
    .update(shifts)
    .set({ status: "closed", closedAt, expectedCash, actualCash, variance, nonCashVarianceTotal, notes: input.notes ?? shift.notes })
    .where(eq(shifts.id, shiftId))
    .returning();

  await logAudit({
    outletId: shift.outletId,
    staffUserId: shift.staffUserId,
    action: "close_shift",
    entityType: "shift",
    entityId: shiftId,
    after: { expectedCash, actualCash, variance, cashRows, balanceCheckRows, nonCashVarianceTotal },
  });

  return { shift: updated, cashIn, cashOut, ordersCount: shiftOrders.length, cashRows, balanceCheckRows };
}

export async function getCurrentShift(outletId: string, staffUserId: string) {
  const [shift] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.outletId, outletId), eq(shifts.staffUserId, staffUserId), eq(shifts.status, "open")));
  return shift ?? null;
}

export async function getShiftDetail(shiftId: string) {
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift) return null;
  const cashCounts = await db.select().from(shiftCashCounts).where(eq(shiftCashCounts.shiftId, shiftId));
  const balanceChecks = await db.select().from(shiftBalanceChecks).where(eq(shiftBalanceChecks.shiftId, shiftId));
  return { shift, cashCounts, balanceChecks };
}

/**
 * Permanently deletes one shift record from history — "Riwayat Shift" on the Shift & Kasir page.
 * Caller (API route) is responsible for the Owner/Superuser role gate; this only handles the
 * data/FK side.
 *
 * Refuses to delete a still-open shift: that row is the cashier's live active session (read by
 * getCurrentShift/openShift's "kamu masih punya shift yang belum ditutup" check) — deleting it
 * out from under them would let them open a second shift without ever closing the first, or
 * leave the register in an inconsistent state. Close it first, then delete from history if needed.
 *
 * shiftCashCounts/shiftBalanceChecks both carry a real FK to shifts.id (NO ACTION, no cascade —
 * see schema.ts) so they're cleared first. orders/expenses/otherIncomes/homeRentalRentals.shiftId
 * are plain text columns with no FK constraint (loosely tagged, per closeShift's own comments) —
 * deleting the shift just leaves their shiftId pointing at nothing, which is harmless for those
 * already-settled historical rows.
 */
export async function deleteShift(shiftId: string): Promise<{ deletedId: string }> {
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift) throw new Error("Shift tidak ditemukan.");
  if (shift.status !== "closed") {
    throw new Error("Tidak bisa menghapus shift yang masih berjalan — tutup shift ini dulu, baru bisa dihapus dari riwayat.");
  }

  await db.delete(shiftCashCounts).where(eq(shiftCashCounts.shiftId, shiftId));
  await db.delete(shiftBalanceChecks).where(eq(shiftBalanceChecks.shiftId, shiftId));
  await db.delete(shifts).where(eq(shifts.id, shiftId));

  await logAudit({
    outletId: shift.outletId,
    staffUserId: shift.staffUserId,
    action: "delete_shift",
    entityType: "shift",
    entityId: shiftId,
    before: shift,
  });

  return { deletedId: shiftId };
}
