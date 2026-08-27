import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { computeProfitLoss } from "@/lib/accounting/reports";
import { describeError } from "@/lib/api/error";

/**
 * Cross-outlet monthly accounting performance — the one legitimate cross-tenant READ of each
 * outlet's own Chart of Accounts / journal data (same trust tier as the outlet drill-down route,
 * see its comment), gated by requirePlatformAdmin (a wholly separate auth system from outlet
 * staff sessions). For the requested month, computes computeProfitLoss(outletId, monthStart,
 * monthEnd) per outlet — the exact same P&L engine each outlet's own /dashboard/accounting page
 * uses — so a superuser can compare real business performance (revenue/expense/profit) across
 * every registered outlet/merchant without ever touching another outlet's login.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const month = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const [y, m] = month.split("-").map(Number);
    // journalEntries.entryDate is always stored as a full ISO timestamp (see journal.ts), never a
    // bare date — so from/to must be full start-of-day/end-of-day ISO timestamps too, matching the
    // convention resolvePeriodPreset() uses on the outlet-facing accounting page. A bare "YYYY-MM-DD"
    // `to` would lexicographically exclude every entry on the last day of the month (its full
    // timestamp string sorts AFTER the bare date), silently undercounting the month's totals.
    const from = new Date(y, m - 1, 1, 0, 0, 0, 0).toISOString();
    const to = new Date(y, m, 0, 23, 59, 59, 999).toISOString();

    const allOutlets = await db.select().from(outlets);
    const allSubs = await db.select().from(subscriptions);
    const subByOutletId = new Map(allSubs.map((s) => [s.outletId, s]));

    const rows = await Promise.all(
      allOutlets.map(async (o) => {
        const pl = await computeProfitLoss(o.id, from, to);
        return {
          outletId: o.id,
          outletName: o.name,
          subscriptionStatus: subByOutletId.get(o.id)?.status ?? "trial",
          totalRevenue: pl.totalRevenue,
          totalExpense: pl.totalExpense,
          grossProfit: pl.grossProfit,
          netProfit: pl.netProfit,
        };
      })
    );
    rows.sort((a, b) => b.netProfit - a.netProfit);

    const totals = rows.reduce(
      (acc, r) => ({
        totalRevenue: acc.totalRevenue + r.totalRevenue,
        totalExpense: acc.totalExpense + r.totalExpense,
        grossProfit: acc.grossProfit + r.grossProfit,
        netProfit: acc.netProfit + r.netProfit,
      }),
      { totalRevenue: 0, totalExpense: 0, grossProfit: 0, netProfit: 0 }
    );

    return NextResponse.json({ month, from, to, rows, totals });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
