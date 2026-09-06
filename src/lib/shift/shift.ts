import { db } from "@/db/client";
import { shifts, shiftCashCounts, shiftBalanceChecks, payments, orders, expenses, cashBankAccounts, otherIncomes, homeRentalRentals, depositBalanceChannels, membershipPayments, outlets, approvalRequests } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { computeTrialBalance } from "@/lib/accounting/reports";
import { getCashBankAccountIdForPaymentMethod } from "@/lib/accounting/account-mapping";
import { getCashDenominations, BALANCE_TRACKED_METHODS, CHANNEL_LABEL } from "./denominations";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments/labels";
import { currencyForCountry } from "@/lib/currency/format";
import { computeShiftRiskFlags } from "./fraud-detection";

/** Resolves which set of physical note/coin denominations a shift's own outlet counts in — see denominations.ts's DENOMINATIONS_BY_CURRENCY doc comment. */
async function getOutletCashDenominations(outletId: string): Promise<readonly number[]> {
  const [outlet] = await db.select({ outletCountry: outlets.outletCountry }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return getCashDenominations(currencyForCountry(outlet?.outletCountry).code);
}

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

export interface IncomeByMethodRow {
  method: string;
  label: string;
  amount: number;
}

/**
 * Breaks down all money received this shift by payment method — e.g. how much came in as cash
 * vs QRIS vs GoPay, etc. — instead of the single lump "Kas Masuk" figure closeShift() has always
 * computed (which only ever summed the "cash" method). Reuses the exact same income sources
 * cashIn already reads (order payments, cash-drawer-affecting Other Income, membership payments,
 * Home Rental checkout + deposit, Home Rental return late fees) but groups by method instead of
 * filtering to "cash" only, so QRIS/GoPay/DANA/etc. each get their own total. Recomputed on read
 * (not persisted on the shifts row) since the underlying rows are already permanently tagged with
 * shiftId and don't change after the fact — same reasoning as why cashIn/cashOut themselves were
 * never persisted as their own columns.
 */
export async function computeIncomeByMethod(shiftId: string): Promise<IncomeByMethodRow[]> {
  const shiftOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.shiftId, shiftId));
  const orderIds = shiftOrders.map((o) => o.id);
  const allPayments = orderIds.length
    ? await db.select().from(payments).where(and(inArray(payments.orderId, orderIds), eq(payments.status, "success")))
    : [];
  const shiftOtherIncomes = await db.select().from(otherIncomes).where(and(eq(otherIncomes.shiftId, shiftId), eq(otherIncomes.status, "posted")));
  const shiftMembershipPayments = await db.select().from(membershipPayments).where(and(eq(membershipPayments.shiftId, shiftId), eq(membershipPayments.status, "posted")));
  const shiftHomeRentals = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.shiftId, shiftId));
  const shiftHomeRentalReturns = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.returnShiftId, shiftId));

  const totals = new Map<string, number>();
  const add = (method: string | null | undefined, amount: number) => {
    if (!method || !amount) return;
    totals.set(method, (totals.get(method) ?? 0) + amount);
  };

  for (const p of allPayments) add(p.method, p.amount);
  for (const o of shiftOtherIncomes) add(o.paymentMethod, o.amount - (o.feeAmount ?? 0));
  for (const m of shiftMembershipPayments) add(m.paymentMethod, m.amount - (m.feeAmount ?? 0));
  for (const r of shiftHomeRentals) {
    add(r.paymentMethod, r.paidAmount);
    add(r.depositPaymentMethod, r.depositAmount);
  }
  for (const r of shiftHomeRentalReturns) {
    add(r.lateFeePaymentMethod, r.lateFee);
  }

  return Array.from(totals.entries())
    .map(([method, amount]) => ({ method, label: PAYMENT_METHOD_LABEL[method as keyof typeof PAYMENT_METHOD_LABEL] ?? method, amount }))
    .sort((a, b) => b.amount - a.amount);
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
  const cashDenominations = await getOutletCashDenominations(shift.outletId);
  const countByDenom = new Map(input.cashCounts.map((c) => [c.denomination, Math.max(0, Math.floor(c.qty || 0))]));
  for (const denom of countByDenom.keys()) {
    if (!cashDenominations.includes(denom)) {
      throw new Error(`Pecahan ${denom} tidak dikenal.`);
    }
  }
  const cashRows = cashDenominations.map((denomination) => {
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

  // --- Anti-fraud review check (see lib/shift/fraud-detection.ts) — computed BEFORE persisting so
  // the flags can be snapshotted onto the same row in one write, using the outlet's own configured
  // thresholds (Pengaturan > Preferensi). Never blocks the close itself — a cashier can always end
  // their shift; a flagged shift instead gets an approval_requests row for Owner/Manager sign-off,
  // same review mechanism already used for void/refund approvals.
  const risk = await computeShiftRiskFlags({
    shiftId,
    outletId: shift.outletId,
    staffUserId: shift.staffUserId,
    openedAt: shift.openedAt,
    closedAt,
    cashVariance: variance,
    nonCashVarianceTotal,
  });

  // --- Persist everything ---
  if (cashRows.length) {
    await db.insert(shiftCashCounts).values(cashRows.map((r) => ({ shiftId, ...r })));
  }
  if (balanceCheckRows.length) {
    await db.insert(shiftBalanceChecks).values(balanceCheckRows.map((r) => ({ shiftId, ...r })));
  }

  const [updated] = await db
    .update(shifts)
    .set({
      status: "closed",
      closedAt,
      expectedCash,
      actualCash,
      variance,
      nonCashVarianceTotal,
      notes: input.notes ?? shift.notes,
      riskFlags: JSON.stringify(risk.flags),
    })
    .where(eq(shifts.id, shiftId))
    .returning();

  await logAudit({
    outletId: shift.outletId,
    staffUserId: shift.staffUserId,
    action: "close_shift",
    entityType: "shift",
    entityId: shiftId,
    after: { expectedCash, actualCash, variance, cashRows, balanceCheckRows, nonCashVarianceTotal, riskFlags: risk.flags },
  });

  if (risk.flags.length > 0) {
    await db.insert(approvalRequests).values({
      outletId: shift.outletId,
      type: "shift_close_review",
      refType: "shift",
      refId: shiftId,
      requestedBy: shift.staffUserId,
      reason: risk.flags.map((f) => f.label).join(" | "),
    });
  }

  const incomeByMethod = await computeIncomeByMethod(shiftId);

  return { shift: updated, cashIn, cashOut, ordersCount: shiftOrders.length, cashRows, balanceCheckRows, riskFlags: risk.flags, incomeByMethod };
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
  const incomeByMethod = await computeIncomeByMethod(shiftId);
  return { shift, cashCounts, balanceChecks, incomeByMethod };
}

/**
 * Owner/Superuser correction for an already-closed shift's history — lets them fix a miscounted
 * denomination, a mistyped non-cash channel balance, an opening float that was entered wrong, or
 * add/amend notes, AFTER the shift is closed (closeShift itself stays a one-way blind count; this
 * is the deliberate "we found a mistake afterward" escape hatch, gated to Owner/Superuser only by
 * the caller). Only a closed shift has cash counts/balance checks to correct in the first place —
 * an open shift's numbers aren't final yet, so this refuses those (use closeShift normally).
 *
 * Recompute rules, chosen to only touch what actually changed rather than re-deriving everything
 * from scratch (which would require re-running closeShift's whole cashIn/cashOut/trial-balance
 * query set against "as of now" data that may have moved on since the original close):
 *  - cashCounts replaced wholesale when provided → actualCash recomputed as their sum, variance
 *    recomputed against the (possibly also-updated) expectedCash below.
 *  - openingCash, if changed, shifts expectedCash by the same delta (expectedCash was
 *    openingCash + cashIn − cashOut at close time; cashIn/cashOut for a closed shift don't change
 *    after the fact, so adding the same delta keeps it correct without re-deriving them).
 *  - balanceChecks: only actualBalance is editable per channel — expectedBalance stays exactly
 *    what it was at close time (a historical snapshot of the account's balance then, which by
 *    definition can't be "corrected" after the fact), so only that row's variance (and the
 *    shift-wide nonCashVarianceTotal) recomputes.
 */
export async function updateShiftDetail(
  shiftId: string,
  input: {
    openingCash?: number;
    notes?: string;
    cashCounts?: CashCountInput[];
    balanceChecks?: BalanceCheckInput[];
    // When true, re-derives each channel's expectedBalance from a fresh trial balance (same
    // computation closeShift used originally) instead of keeping the value frozen at close time.
    // Normally expectedBalance is intentionally locked forever — a closed shift's numbers
    // shouldn't silently drift. The one legitimate exception is when the STORED number itself was
    // wrong because of a data bug (e.g. the orphaned-journal-entry bug fixed in
    // hardDeletePpobTransaction — see lib/accounting/orphan-cleanup.ts) rather than a real
    // transaction: once the underlying ledger is corrected, this lets Owner/Superuser refresh
    // this one shift's frozen figure to match, instead of it showing a stale phantom number
    // forever with no way to clear it short of deleting the whole shift record.
    recomputeExpectedBalances?: boolean;
  }
) {
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift) throw new Error("Shift tidak ditemukan.");
  if (shift.status !== "closed") throw new Error("Hanya shift yang sudah ditutup yang bisa dikoreksi di sini.");

  const before = { ...shift };
  const patch: Partial<typeof shifts.$inferInsert> = {};

  let actualCash = shift.actualCash;
  if (input.cashCounts) {
    const cashDenominations = await getOutletCashDenominations(shift.outletId);
    const countByDenom = new Map(input.cashCounts.map((c) => [c.denomination, Math.max(0, Math.floor(c.qty || 0))]));
    for (const denom of countByDenom.keys()) {
      if (!cashDenominations.includes(denom)) {
        throw new Error(`Pecahan ${denom} tidak dikenal.`);
      }
    }
    const cashRows = cashDenominations.map((denomination) => {
      const qty = countByDenom.get(denomination) ?? 0;
      return { denomination, qty, subtotal: denomination * qty };
    });
    actualCash = cashRows.reduce((s, r) => s + r.subtotal, 0);
    await db.delete(shiftCashCounts).where(eq(shiftCashCounts.shiftId, shiftId));
    await db.insert(shiftCashCounts).values(cashRows.map((r) => ({ shiftId, ...r })));
    patch.actualCash = actualCash;
  }

  let expectedCash = shift.expectedCash;
  if (input.openingCash !== undefined && input.openingCash !== shift.openingCash) {
    const delta = input.openingCash - shift.openingCash;
    expectedCash = (shift.expectedCash ?? 0) + delta;
    patch.openingCash = input.openingCash;
    patch.expectedCash = expectedCash;
  }

  if ((input.cashCounts && actualCash !== null) || (input.openingCash !== undefined && expectedCash !== null)) {
    patch.variance = (actualCash ?? 0) - (expectedCash ?? 0);
  }

  let balanceCheckRows: (typeof shiftBalanceChecks.$inferSelect)[] | null = null;
  if (input.balanceChecks && input.balanceChecks.length) {
    const existing = await db.select().from(shiftBalanceChecks).where(eq(shiftBalanceChecks.shiftId, shiftId));
    const updates = new Map(input.balanceChecks.map((b) => [b.channelKey, b.actualBalance]));

    // Recompute expectedBalance fresh instead of trusting the frozen value — see the
    // recomputeExpectedBalances doc comment above. Bounded at this shift's own closedAt, exactly
    // like the original closeShift() computation, so re-running this doesn't pull in activity
    // from AFTER this shift (which belongs to whatever shift closed next).
    let freshBalanceByAccountId: Map<string, number> | null = null;
    let freshDepositChannelsByKey: Map<string, typeof depositBalanceChannels.$inferSelect> | null = null;
    if (input.recomputeExpectedBalances && shift.closedAt) {
      const tb = await computeTrialBalance(shift.outletId, undefined, shift.closedAt);
      freshBalanceByAccountId = new Map(tb.map((r) => [r.accountId, r.balance]));
      freshDepositChannelsByKey = new Map(
        (await db.select().from(depositBalanceChannels).where(eq(depositBalanceChannels.outletId, shift.outletId))).map((dc) => [dc.channelKey, dc])
      );
    }

    for (const row of existing) {
      if (!updates.has(row.channelKey)) continue;
      const actualBalance = updates.get(row.channelKey)!;
      let expectedBalance = row.expectedBalance;
      if (freshBalanceByAccountId && freshDepositChannelsByKey) {
        const depositChannel = freshDepositChannelsByKey.get(row.channelKey);
        if (depositChannel) {
          expectedBalance = freshBalanceByAccountId.get(depositChannel.accountId) ?? 0;
        } else if (row.cashBankAccountId) {
          const [cba] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, row.cashBankAccountId)).limit(1);
          expectedBalance = cba ? freshBalanceByAccountId.get(cba.accountId) ?? 0 : row.expectedBalance;
        }
      }
      await db
        .update(shiftBalanceChecks)
        .set({ actualBalance, expectedBalance, variance: actualBalance - expectedBalance })
        .where(eq(shiftBalanceChecks.id, row.id));
    }
    balanceCheckRows = await db.select().from(shiftBalanceChecks).where(eq(shiftBalanceChecks.shiftId, shiftId));
    patch.nonCashVarianceTotal = balanceCheckRows.reduce((s, r) => s + Math.abs(r.variance), 0);
  }

  if (input.notes !== undefined) patch.notes = input.notes;

  const [updated] = Object.keys(patch).length
    ? await db.update(shifts).set(patch).where(eq(shifts.id, shiftId)).returning()
    : [shift];

  await logAudit({
    outletId: shift.outletId,
    staffUserId: shift.staffUserId,
    action: "edit_shift",
    entityType: "shift",
    entityId: shiftId,
    before,
    after: updated,
  });

  const cashCounts = await db.select().from(shiftCashCounts).where(eq(shiftCashCounts.shiftId, shiftId));
  return { shift: updated, cashCounts, balanceChecks: balanceCheckRows ?? (await db.select().from(shiftBalanceChecks).where(eq(shiftBalanceChecks.shiftId, shiftId))) };
}

/**
 * Permanently deletes one shift record from history — "Riwayat Shift" on the Shift & Kasir page.
 * Caller (API route) is responsible for the Owner/Superuser role gate; this only handles the
 * data/FK side.
 *
 * Deleting a still-open shift IS allowed (Owner/Superuser only, per the caller's role gate) —
 * this used to be refused unconditionally, but an outlet can end up with a stuck/orphaned open
 * shift (a cashier's device died mid-shift, a duplicate/erroneous row, staff who left without
 * ever closing out) that can never legitimately be closed, and Owner/Superuser needs a way to
 * clean it up from history regardless. The frontend shows an extra-strong confirmation
 * specifically for this case (see deleteShiftAction in shift/page.tsx) since it has real
 * side effects: the cashier who "owns" that open shift (if anyone still does) will see it vanish
 * and simply be prompted to open a new one next time they load the page (getCurrentShift just
 * finds nothing), and any orders/expenses/etc. already tagged with this shiftId lose that
 * association — same as deleting a closed shift (see below), just for transactions that haven't
 * been reconciled by a close yet.
 *
 * shiftCashCounts/shiftBalanceChecks both carry a real FK to shifts.id (NO ACTION, no cascade —
 * see schema.ts) so they're cleared first. orders/expenses/otherIncomes/homeRentalRentals.shiftId
 * are plain text columns with no FK constraint (loosely tagged, per closeShift's own comments) —
 * deleting the shift just leaves their shiftId pointing at nothing, which is harmless for those
 * already-settled historical rows (and tolerated, if slightly messier, for a still-open one).
 */
export async function deleteShift(shiftId: string): Promise<{ deletedId: string }> {
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift) throw new Error("Shift tidak ditemukan.");

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
