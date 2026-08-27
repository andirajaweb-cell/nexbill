import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  orders, orderItems, payments, expenses, rentalUnits, rentalSessions,
  products, customers, receivables, purchaseInvoices,
  bookings, cashBankAccounts, ppobTransactions, outlets,
} from "@/db/schema";
import { sql, eq, and, inArray } from "drizzle-orm";
import { computeProfitLoss, computeTrialBalance } from "@/lib/accounting/reports";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

const FNB_CATEGORIES = new Set(["food", "drink", "coffee", "snack", "dessert"]);

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId, this endpoint
    // used to serve revenue/cash/AR-AP for any outlet passed on the query string.
    const outletId = session.outletId;

    const dateParam = req.nextUrl.searchParams.get("date");
    const dayStart = dateParam ? new Date(dateParam) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayStartIso = dayStart.toISOString();
    const dayEndIso = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date();

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ---- Revenue today (split rental vs POS/F&B by whether the order is tied to a rental session) ----
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
      ppobToday,
      bankAccounts,
      trialBalance,
      pl,
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
      db.select({ feeAdmin: ppobTransactions.feeAdmin }).from(ppobTransactions).where(sql`${ppobTransactions.outletId} = ${outletId} AND ${ppobTransactions.createdAt} >= ${dayStartIso}`),
      db.select().from(cashBankAccounts).where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.type, "bank"))),
      // Saldo Kas/Rekening is a balance-sheet figure — it has to stay a true all-time running
      // balance (every rupiah in/out since day one), NOT bounded to today/this-month, or the
      // number shown would be wrong (a partial-period net movement, not an actual balance).
      // The indexes added to journal_entries/journal_lines (src/db/schema.ts) are what actually
      // fixes this getting slower as history grows — this is a join+groupBy that now hits those
      // indexes instead of a full sequential scan, not a shortcut around correctness.
      computeTrialBalance(outletId),
      computeProfitLoss(outletId, dayStartIso, undefined),
    ]);

    const revenueRental = paidOrdersToday.filter((o) => o.rentalSessionId).reduce((s, o) => s + o.total, 0);
    const revenuePos = paidOrdersToday.filter((o) => !o.rentalSessionId).reduce((s, o) => s + o.total, 0);
    const omzet = revenueRental + revenuePos;

    const orderIdsToday = paidOrdersToday.map((o) => o.id);
    const rentalSessionIdsToday = Array.from(new Set(paidOrdersToday.map((o) => o.rentalSessionId).filter((id): id is string => !!id)));

    // ---- Wave 2: only depends on paidOrdersToday (wave 1) ----
    const [itemsToday, cashPaymentsToday, sessionsForOrdersToday] = await Promise.all([
      orderIdsToday.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIdsToday)) : Promise.resolve([]),
      orderIdsToday.length ? db.select().from(payments).where(and(inArray(payments.orderId, orderIdsToday), eq(payments.method, "cash"), eq(payments.status, "success"))) : Promise.resolve([]),
      rentalSessionIdsToday.length ? db.select().from(rentalSessions).where(inArray(rentalSessions.id, rentalSessionIdsToday)) : Promise.resolve([]),
    ]);

    // ---- Revenue F&B vs "produk lain" (sewa alat/lain-lain), split by item-level product category ----
    // NOTE: this is item-level subtotal (qty x unitPrice) before order-level tax/discount/service-charge
    // allocation, so revenueFnb + revenueProduk won't exactly equal revenuePos when those apply — it's a
    // category breakdown, not a re-derivation of the exact paid total.
    const itemProductIds = Array.from(new Set(itemsToday.map((i) => i.productId).filter((id): id is string => !!id)));
    const itemProducts = itemProductIds.length
      ? await db.select({ id: products.id, category: products.category }).from(products).where(inArray(products.id, itemProductIds))
      : [];
    const categoryByProductId = new Map(itemProducts.map((p) => [p.id, p.category]));

    let revenueFnb = 0;
    let revenueProduk = 0;
    for (const item of itemsToday) {
      if (!item.productId) continue; // rental line items have no productId, already counted in revenueRental
      const category = categoryByProductId.get(item.productId);
      if (category && FNB_CATEGORIES.has(category)) revenueFnb += item.lineTotal;
      else revenueProduk += item.lineTotal;
    }

    // ---- Full revenue-by-source breakdown (mirrors the accounting engine's routing in
    // postings.ts: rental split member/reguler by session.customerId membership, accessory
    // add-ons kept separate from the base rental charge, F&B vs retail product by category,
    // plus PPOB margin — which lives in a completely separate table, not orders/orderItems). ----
    const sessionByIdToday = new Map(sessionsForOrdersToday.map((s) => [s.id, s]));
    const customerIdsForSessionsToday = Array.from(new Set(sessionsForOrdersToday.map((s) => s.customerId).filter((id): id is string => !!id)));
    const sessionCustomersToday = customerIdsForSessionsToday.length
      ? await db.select({ id: customers.id, membershipTierId: customers.membershipTierId }).from(customers).where(inArray(customers.id, customerIdsForSessionsToday))
      : [];
    const isMemberByCustomerId = new Map(sessionCustomersToday.map((c) => [c.id, !!c.membershipTierId]));
    const orderByIdToday = new Map(paidOrdersToday.map((o) => [o.id, o]));

    const revenueBySource = { rentalReguler: 0, rentalMember: 0, addon: 0, fnb: 0, produk: 0, ppob: 0, lainLain: 0 };
    for (const item of itemsToday) {
      if (item.itemType === "rental") {
        const order = orderByIdToday.get(item.orderId);
        const session = order?.rentalSessionId ? sessionByIdToday.get(order.rentalSessionId) : null;
        const isMember = session?.customerId ? !!isMemberByCustomerId.get(session.customerId) : false;
        if (isMember) revenueBySource.rentalMember += item.lineTotal;
        else revenueBySource.rentalReguler += item.lineTotal;
      } else if (item.itemType === "accessory") {
        revenueBySource.addon += item.lineTotal;
      } else if (item.itemType === "product" && item.productId) {
        const category = categoryByProductId.get(item.productId);
        if (category && FNB_CATEGORIES.has(category)) revenueBySource.fnb += item.lineTotal;
        else revenueBySource.produk += item.lineTotal;
      } else {
        revenueBySource.lainLain += item.lineTotal;
      }
    }
    // Service charge + tax post to the same "Lain-lain" bucket as postSalesJournal (postings.ts).
    revenueBySource.lainLain += paidOrdersToday.reduce((s, o) => s + (o.serviceCharge ?? 0) + (o.tax ?? 0), 0);
    revenueBySource.ppob = ppobToday.reduce((s, t) => s + (t.feeAdmin ?? 0), 0);

    const revenueBySourceTotal = Object.values(revenueBySource).reduce((s, v) => s + v, 0);

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
    const hourCounts = new Array(24).fill(0);
    for (const o of recentOrders) {
      const h = new Date(o.createdAt).getHours();
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
