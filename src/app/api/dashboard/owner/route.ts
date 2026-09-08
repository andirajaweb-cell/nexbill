import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  orders, orderItems, payments, expenses, rentalUnits, rentalSessions,
  products, customers, receivables, purchaseInvoices,
  bookings, cashBankAccounts, outlets,
} from "@/db/schema";
import { sql, eq, and, inArray } from "drizzle-orm";
import { computeProfitLoss, computeTrialBalance } from "@/lib/accounting/reports";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";
import { outletHour, outletDayStartUtc } from "@/lib/time/outlet-time";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";

/**
 * Buckets a COA revenue account code into this dashboard's own revenue-by-source breakdown —
 * finer-grained than glRevenueBucket (lib/reports/transactions.ts) since this widget shows
 * regular-vs-member rental and add-ons as separate rows, and PPOB revenue split out on its own
 * (glRevenueBucket collapses these together into one "rental" bucket for Transaction Center's
 * simpler 4-way Rental/F&B/Produk/PPOB view). See the account ranges in lib/accounting/coa-data.ts
 * and the seed rows in lib/accounting/account-mapping.ts DEFAULT_MAPPING_SEED.
 */
function dashboardRevenueBucket(code: string): "rentalReguler" | "rentalMember" | "addon" | "fnb" | "produk" | "ppob" | "lainLain" | "homeRental" | "other" {
  if (code === "4180") return "rentalMember";
  if (code.startsWith("41")) return "rentalReguler";
  if (code.startsWith("435") || code === "4530") return "addon"; // non-member (4351-4354) + member (4530) add-on rental
  if (code.startsWith("42") || code === "4510") return "fnb"; // base F&B (42xx) + member F&B (4510)
  if ((code.startsWith("43") && !code.startsWith("435")) || code === "4520") return "produk"; // retail merchandise/accessory (43xx excl. 435x) + member product (4520)
  if (code.startsWith("44")) return "ppob"; // PPOB revenue == providerFee + feeAdmin, per buildPpobJournalLines in lib/ppob/engine.ts
  if (code.startsWith("46")) return "lainLain"; // service charge/tax/misc catch-all (postSalesJournal uses 4650)
  if (code.startsWith("48")) return "homeRental"; // Home Rental (Sewa Dibawa Pulang) — a fully separate module, doesn't come from orders/orderItems at all
  return "other"; // 47xx Other Income (its own dashboard), 49xx Contra Revenue (discount — netted into lainLain separately, see below)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId, this endpoint
    // used to serve revenue/cash/AR-AP for any outlet passed on the query string.
    const outletId = session.outletId;

    const dateParam = req.nextUrl.searchParams.get("date");
    // outletDayStartUtc(), not `new Date(); .setHours(0, 0, 0, 0)` — this route runs server-side,
    // and .setHours() resets hours in the SERVER PROCESS's own timezone (UTC on most hosts), not
    // Asia/Jakarta. That mismatch silently shifted "Hari Ini" here 7 hours later than the Laba
    // Rugi report's "Hari Ini" (computed client-side in the merchant's own browser timezone via
    // PeriodPicker.tsx), dropping the outlet's 00:00-07:00 WIB transactions from this dashboard's
    // totals — see the doc comment on outletDayStartUtc() for the full explanation.
    const dayStart = outletDayStartUtc(dateParam ? new Date(dateParam) : new Date());
    const dayStartIso = dayStart.toISOString();
    const dayEndIso = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date();

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ---- Wave 1: independent queries this route needs, run concurrently ----
    // This route used to run ~20 db calls one after another — every await here waited for the
    // previous round-trip through the Supabase pooler to finish before starting the next, even
    // though most of these queries don't actually depend on each other. Polled every 30s by
    // every open dashboard tab (see dashboard/page.tsx), that serial chain was the single
    // biggest latency source on first paint after login. Grouped into Promise.all "waves" below
    // instead: everything in a wave only depends on results from an earlier wave, never a
    // sibling in the same one — so within each wave the DB round-trips happen concurrently.
    const [
      paidOrdersToday,
      outletRow,
      expensesToday,
      cashAccounts,
      paidCashExpensesToday,
      units,
      sessionsToday,
      recentOrders,
      newMembersToday,
      activeCustomersRows,
      bookingsToday,
      lowStockProducts,
      openReceivables,
      openPurchaseInvoices,
      openPayableExpenses,
      bankAccounts,
      trialBalance,
      pl,
      ppobEnabled,
      homeRentalEnabled,
    ] = await Promise.all([
      db.select().from(orders).where(sql`${orders.outletId} = ${outletId} AND ${orders.status} = 'paid' AND ${orders.createdAt} >= ${dayStartIso}`),
      db.select({ salesTargetMonthly: outlets.salesTargetMonthly }).from(outlets).where(eq(outlets.id, outletId)).limit(1),
      db.select().from(expenses).where(sql`${expenses.outletId} = ${outletId} AND ${expenses.status} IN ('approved','paid') AND ${expenses.expenseDate} >= ${dayStartIso}`),
      db.select().from(cashBankAccounts).where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.type, "cash"))),
      db.select().from(expenses).where(sql`${expenses.outletId} = ${outletId} AND ${expenses.status} = 'paid' AND ${expenses.paidAt} >= ${dayStartIso}`),
      db.select().from(rentalUnits).where(eq(rentalUnits.outletId, outletId)),
      db.select().from(rentalSessions).where(sql`${rentalSessions.outletId} = ${outletId} AND ${rentalSessions.startedAt} >= ${dayStartIso}`),
      db.select({ createdAt: orders.createdAt }).from(orders).where(sql`${orders.outletId} = ${outletId} AND ${orders.status} = 'paid' AND ${orders.createdAt} >= ${thirtyDaysAgo}`),
      db.select().from(customers).where(sql`${customers.outletId} = ${outletId} AND ${customers.createdAt} >= ${dayStartIso}`),
      db.select().from(customers).where(sql`${customers.outletId} = ${outletId} AND ${customers.lastVisitAt} >= ${thirtyDaysAgo}`),
      db.select().from(bookings).where(sql`${bookings.outletId} = ${outletId} AND ${bookings.scheduledStart} >= ${dayStartIso} AND ${bookings.scheduledStart} < ${dayEndIso} AND ${bookings.status} != 'cancelled'`),
      db.select({ id: products.id, name: products.name, stockQty: products.stockQty, lowStockThreshold: products.lowStockThreshold }).from(products).where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold} AND ${products.isActive} = true`),
      db.select().from(receivables).where(sql`${receivables.outletId} = ${outletId} AND ${receivables.status} NOT IN ('paid','written_off')`),
      db.select().from(purchaseInvoices).where(sql`${purchaseInvoices.outletId} = ${outletId} AND ${purchaseInvoices.status} != 'paid'`),
      db.select().from(expenses).where(sql`${expenses.outletId} = ${outletId} AND ${expenses.recordAsPayable} = true AND ${expenses.status} = 'approved'`),
      db.select().from(cashBankAccounts).where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.type, "bank"))),
      // Saldo Kas/Rekening is a balance-sheet figure — it has to stay a true all-time running
      // balance (every rupiah in/out since day one), NOT bounded to today/this-month, or the
      // number shown would be wrong (a partial-period net movement, not an actual balance).
      // The indexes added to journal_entries/journal_lines (src/db/schema.ts) are what actually
      // fixes this getting slower as history grows — this is a join+groupBy that now hits those
      // indexes instead of a full sequential scan, not a shortcut around correctness.
      computeTrialBalance(outletId),
      computeProfitLoss(outletId, dayStartIso, undefined),
      // Whether this outlet actually uses these optional modules — the revenue breakdown below
      // only shows the PPOB / Home Rental rows to outlets that turned them on (see Feature
      // Management in Settings), instead of every outlet seeing a permanent "Rp0" row for a
      // module they never use. See lib/home-rental/feature-flags.ts.
      isFeatureEnabled(outletId, "PPOB_ENABLED"),
      isFeatureEnabled(outletId, "HOME_RENTAL_ENABLED"),
    ]);

    const orderIdsToday = paidOrdersToday.map((o) => o.id);

    // ---- Revenue today, sourced from the General Ledger (the same computeProfitLoss("Hari Ini")
    // this route's own grossProfit/netProfit below already use) instead of re-deriving it from
    // raw orders/orderItems filtered by orders.createdAt. Those two are NOT the same "today": a
    // rental session started yesterday (or a bill amended mid-stay) but paid/settled today posts
    // its revenue to the GL with today's entryDate — correctly included in grossProfit/netProfit
    // (already GL-sourced via `pl`) and in Accounting > Laba Rugi's "Hari Ini" — but an
    // orders.createdAt-filtered query for "today" excludes it entirely, since the order itself was
    // created yesterday. That's exactly what made this dashboard's "Pendapatan Hari Ini" (and its
    // revenue-by-source breakdown) disagree with its own "Laba Kotor"/"Estimasi Laba Bersih" cards
    // on the very same page — the identical root cause, and identical fix, already applied to
    // Transaction Center's summary cards (see glRevenueBucket in lib/reports/transactions.ts).
    // dashboardRevenueBucket below is that same idea with finer buckets (regular vs member rental,
    // add-ons split out, PPOB) to match what this dashboard's breakdown widget displays.
    const revenueBySource = { rentalReguler: 0, rentalMember: 0, addon: 0, homeRental: 0, fnb: 0, produk: 0, ppob: 0, lainLain: 0 };
    for (const r of pl.revenue) {
      if (!r.isPostingAllowed) continue;
      const bucket = dashboardRevenueBucket(r.code);
      if (bucket === "other") continue; // 47xx Other Income (its own dashboard/report), 49xx Contra Revenue (netted into lainLain below instead)
      revenueBySource[bucket] += r.balance;
    }
    // Nets the day's discount out of the catch-all bucket so the buckets' own sum ties back
    // exactly to pl.totalRevenue (already net of discount) — same netting pattern used for
    // Transaction Center's summary cards in lib/reports/transactions.ts.
    revenueBySource.lainLain -= pl.totalDiscount;

    const revenueBySourceTotal = Object.values(revenueBySource).reduce((s, v) => s + v, 0);
    const omzet = pl.totalRevenue;
    const revenueRental = revenueBySource.rentalReguler + revenueBySource.rentalMember + revenueBySource.addon;
    const revenueFnb = revenueBySource.fnb;
    const revenueProduk = revenueBySource.produk;

    // ---- Wave 2: only depends on paidOrdersToday (wave 1) — itemsToday/cashPaymentsToday still
    // drive operational (not financial-summary) widgets below: top products sold today and cash
    // physically received today, both legitimately scoped to "orders created today" rather than
    // "revenue recognized today" (an item rung up on an order created today is today's operational
    // activity regardless of which day its cash ultimately gets journaled). No longer needs
    // rentalSessions/customers for a member-vs-regular split — that now comes straight from the
    // GL above (accounts 4180/4530/4510/4520), removing what was a hand-rolled re-derivation of
    // logic the accounting engine (postings.ts) already owns.
    const [itemsToday, cashPaymentsToday] = await Promise.all([
      orderIdsToday.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIdsToday)) : Promise.resolve([]),
      orderIdsToday.length ? db.select().from(payments).where(and(inArray(payments.orderId, orderIdsToday), eq(payments.method, "cash"), eq(payments.status, "success"))) : Promise.resolve([]),
    ]);

    // ---- Target penjualan (BEP) — manual monthly figure set by superuser in Settings, split
    // into a daily figure at read time by dividing by the number of days in the current month.
    // Null means no target configured; the dashboard widget hides the BEP row in that case. ----
    const salesTargetMonthly = outletRow[0]?.salesTargetMonthly ?? null;
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const salesTargetDaily = salesTargetMonthly != null ? salesTargetMonthly / daysInCurrentMonth : null;

    // ---- Pengeluaran hari ini (beban yang sudah diakui: approved/paid, accrual basis) vs Kas keluar (khusus akun kas fisik, hanya yang benar-benar sudah dibayar hari ini) ----
    // status filter matters now that expenses go through draft/pending_approval/rejected/cancelled —
    // those never posted a journal so must not count as real spend (a voided expense also ends up
    // "cancelled" here even though it's paid=false-again, so this naturally excludes it too).
    const pengeluaranHariIni = expensesToday.reduce((s, e) => s + e.amount + (e.taxAmount ?? 0), 0);

    const cashAccountIds = new Set(cashAccounts.map((a) => a.id));
    const kasKeluar = paidCashExpensesToday
      .filter((e) => e.cashBankAccountId && cashAccountIds.has(e.cashBankAccountId))
      .reduce((s, e) => s + e.amount + (e.taxAmount ?? 0), 0);

    const cashIn = cashPaymentsToday.reduce((s, p) => s + p.amount, 0);

    // ---- Saldo Kas / Saldo Rekening — authoritative running balance from the GL (all-time, nets out voids automatically) ----
    const cashGlAccountIds = new Set(cashAccounts.map((a) => a.accountId));
    const bankGlAccountIds = new Set(bankAccounts.map((a) => a.accountId));
    const saldoKas = trialBalance.filter((r) => cashGlAccountIds.has(r.accountId)).reduce((s, r) => s + r.balance, 0);
    const saldoRekening = trialBalance.filter((r) => bankGlAccountIds.has(r.accountId)).reduce((s, r) => s + r.balance, 0);

    // ---- PS unit status counts ----
    const unitCounts = {
      total: units.length,
      available: units.filter((u) => u.status === "available").length,
      occupied: units.filter((u) => u.status === "occupied").length,
      booked: units.filter((u) => u.status === "booked").length,
      maintenance: units.filter((u) => u.status === "maintenance").length,
    };

    // ---- Utilization rate today: billable minutes used / (unit count x minutes elapsed today) ----
    const minutesElapsedToday = Math.max(1, (now.getTime() - dayStart.getTime()) / 60000);
    let usedMinutes = 0;
    for (const s of sessionsToday) {
      const start = new Date(s.startedAt).getTime();
      const end = s.endedAt ? new Date(s.endedAt).getTime() : now.getTime();
      let pauseMs = s.accumulatedPauseMs;
      if (s.status === "paused" && s.pausedAt) pauseMs += now.getTime() - new Date(s.pausedAt).getTime();
      usedMinutes += Math.max(0, (end - start - pauseMs) / 60000);
    }
    const utilizationRatePercent = unitCounts.total > 0
      ? Math.min(100, Math.round((usedMinutes / (unitCounts.total * minutesElapsedToday)) * 1000) / 10)
      : 0;

    // ---- Revenue per unit today + unit paling produktif ----
    const finishedSessionsToday = sessionsToday.filter((s) => s.status === "finished");
    const unitById = new Map(units.map((u) => [u.id, u.name]));
    const revenueByUnit = new Map<string, number>();
    for (const s of finishedSessionsToday) {
      revenueByUnit.set(s.rentalUnitId, (revenueByUnit.get(s.rentalUnitId) ?? 0) + (s.totalAmount ?? 0));
    }
    const revenuePerUnit = Array.from(revenueByUnit.entries())
      .map(([unitId, revenue]) => ({ unitId, unitName: unitById.get(unitId) ?? "?", revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    const mostProductiveUnit = revenuePerUnit[0] ?? null;

    // ---- Game paling banyak dimainkan hari ini (lightweight — no full Game Management catalog yet) ----
    const gameCounts = new Map<string, number>();
    for (const s of sessionsToday) {
      if (!s.gameName) continue;
      gameCounts.set(s.gameName, (gameCounts.get(s.gameName) ?? 0) + 1);
    }
    const topGames = Array.from(gameCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const topGame = topGames[0] ?? null;

    // ---- Top products today (by qty sold, F&B/device items only — rental line items have no productId) ----
    const productAgg = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of itemsToday) {
      if (!item.productId) continue;
      const key = item.productId;
      const cur = productAgg.get(key) ?? { name: item.description, qty: 0, revenue: 0 };
      cur.qty += item.qty;
      cur.revenue += item.lineTotal;
      productAgg.set(key, cur);
    }
    const topProducts = Array.from(productAgg.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // ---- Busy / quiet hours (last 30 days, all paid orders grouped by hour-of-day) ----
    // outletHour() (not .getHours()) — createdAt is a genuine UTC instant, and plain .getHours()
    // reads it back in the SERVER's own timezone, not the outlet's, which is exactly what made
    // this chart's hours not match reality whenever the app happens to run on a host set to UTC.
    // See src/lib/time/outlet-time.ts for the full explanation.
    const hourCounts = new Array(24).fill(0);
    for (const o of recentOrders) {
      const h = outletHour(new Date(o.createdAt));
      hourCounts[h]++;
    }
    const busyHours = hourCounts.map((count, hour) => ({ hour, count }));
    const busiestHour = busyHours.reduce((max, h) => (h.count > max.count ? h : max), busyHours[0]);
    const hoursWithActivity = busyHours.filter((h) => h.count > 0);
    const quietestHour = hoursWithActivity.length
      ? hoursWithActivity.reduce((min, h) => (h.count < min.count ? h : min), hoursWithActivity[0])
      : null;

    // ---- Customers: served today (distinct, from paid orders) + new members registered today ----
    const distinctCustomerIdsToday = new Set(paidOrdersToday.map((o) => o.customerId).filter((id): id is string => !!id));

    // ---- AR / AP outstanding ----
    // See src/lib/accounting/ar-ap.ts for the full consolidated AR/AP view with
    // aging — this is just the dashboard's single-number summary card, kept in
    // sync with the same two AP sources (purchase invoices + payable expenses).
    const receivablesOutstanding = openReceivables.reduce((s, r) => s + (r.amount - r.paidAmount), 0);
    const supplierPayablesOutstanding = openPurchaseInvoices.reduce((s, p) => s + (p.amount - p.paidAmount), 0);
    const expensePayablesOutstanding = openPayableExpenses.reduce((s, e) => s + e.amount + (e.taxAmount ?? 0), 0);
    const payablesOutstanding = supplierPayablesOutstanding + expensePayablesOutstanding;

    return NextResponse.json({
      date: dayStartIso,
      omzet,
      revenueRental,
      revenueFnb,
      revenueProduk,
      revenueBySource,
      revenueBySourceTotal,
      // Which optional-module breakdown rows this outlet actually wants surfaced — see Settings >
      // Feature Management. The dashboard UI hides the PPOB / Home Rental rows entirely (not just
      // shows Rp0) when the corresponding module is OFF for this outlet.
      enabledModules: { ppob: ppobEnabled, homeRental: homeRentalEnabled },
      salesTargetMonthly,
      salesTargetDaily,
      pengeluaranHariIni,
      grossProfit: pl.grossProfit,
      netProfit: pl.netProfit,
      transactionsCount: paidOrdersToday.length,
      customersServedTodayCount: distinctCustomerIdsToday.size,
      newMembersTodayCount: newMembersToday.length,
      cashIn,
      kasKeluar,
      saldoKas,
      saldoRekening,
      units: unitCounts,
      bookingsTodayCount: bookingsToday.length,
      utilizationRatePercent,
      revenuePerUnit,
      mostProductiveUnit,
      topGame,
      topGames,
      topProducts,
      busyHours,
      busiestHour,
      quietestHour,
      activeCustomersCount: activeCustomersRows.length,
      lowStockProducts,
      receivablesOutstanding,
      payablesOutstanding,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
