import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, subscriptions, subscriptionInvoices } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Platform-level growth/performance — outlet signups over time, churn signal, top outlets by lifetime spend with NEXBILL. */
export async function GET() {
  try {
    await requirePlatformAdmin();

    const allOutlets = await db.select().from(outlets);
    const allSubs = await db.select().from(subscriptions);
    const invoices = await db.select().from(subscriptionInvoices);

    const subByOutletId = new Map(allSubs.map((s) => [s.outletId, s]));

    // Signups per month (outlets.createdAt) — cumulative growth curve.
    const signupsByMonth = new Map<string, number>();
    for (const o of allOutlets) {
      const month = o.createdAt.slice(0, 7);
      signupsByMonth.set(month, (signupsByMonth.get(month) ?? 0) + 1);
    }
    const growth = Array.from(signupsByMonth.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));

    // Lifetime paid amount per outlet -> top spenders.
    const paidByOutlet = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status !== "paid") continue;
      paidByOutlet.set(inv.outletId, (paidByOutlet.get(inv.outletId) ?? 0) + inv.amount);
    }
    const topOutlets = allOutlets
      .map((o) => ({
        id: o.id,
        name: o.name,
        status: subByOutletId.get(o.id)?.status ?? "trial",
        lifetimeRevenue: paidByOutlet.get(o.id) ?? 0,
        createdAt: o.createdAt,
      }))
      .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue)
      .slice(0, 15);

    const activeCount = allSubs.filter((s) => s.status === "active" || s.status === "grace").length;
    const churnedCount = allSubs.filter((s) => s.status === "suspended" || s.status === "cancelled").length;
    const trialCount = allSubs.filter((s) => s.status === "trial").length + (allOutlets.length - allSubs.length);
    const conversionRate = allOutlets.length > 0 ? Math.round((activeCount / allOutlets.length) * 1000) / 10 : 0;

    return NextResponse.json({ growth, topOutlets, activeCount, churnedCount, trialCount, conversionRate });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
