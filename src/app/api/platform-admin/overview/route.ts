import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, subscriptions, subscriptionPlans, subscriptionInvoices } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

// Full unbounded scans of outlets/subscriptions/plans/invoices on every load — fine for a
// handful of outlets, increasingly not as the platform grows. This route calls cookies() (via
// requirePlatformAdmin), which makes Next treat it as fully dynamic — an `export const
// revalidate` here would be silently ignored, so this is a manual in-module cache instead (same
// pattern as refreshPermissionsCache in permissions-store.ts). This isn't per-tenant data — it's
// the platform admin's own cross-tenant summary — so a short stale window is a non-issue, and it
// caps how often the scan runs no matter how often the page is opened/polled.
const CACHE_TTL_MS = 30_000;
let cached: { body: Record<string, unknown>; at: number } | null = null;

const PAID_STATUSES = new Set(["active", "grace"]);

export async function GET() {
  try {
    await requirePlatformAdmin();

    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.body);
    }

    const allOutlets = await db.select().from(outlets);
    const allSubs = await db.select().from(subscriptions);
    const plans = await db.select().from(subscriptionPlans);
    const planById = new Map(plans.map((p) => [p.id, p]));

    const statusBreakdown: Record<string, number> = {
      trial: 0, trial_expired: 0, pending_payment: 0, active: 0, grace: 0, suspended: 0, cancelled: 0,
    };
    let mrr = 0;
    for (const s of allSubs) {
      statusBreakdown[s.status] = (statusBreakdown[s.status] ?? 0) + 1;
      if (PAID_STATUSES.has(s.status) && s.planId) {
        const plan = planById.get(s.planId);
        if (plan) mrr += plan.priceCurrent;
      }
    }
    // Outlets that never triggered getOrCreateSubscription() yet (e.g. provisioned but never
    // opened a gated page) have no subscriptions row at all — count them as an implicit "trial"
    // bucket too so the outlet total always reconciles with the status breakdown total.
    const outletsWithoutSub = allOutlets.length - allSubs.length;
    if (outletsWithoutSub > 0) statusBreakdown.trial += outletsWithoutSub;

    const allInvoices = await db.select().from(subscriptionInvoices);
    const paidInvoices = allInvoices.filter((i) => i.status === "paid");
    const totalRevenueAllTime = paidInvoices.reduce((s, i) => s + i.amount, 0);

    const outletById = new Map(allOutlets.map((o) => [o.id, o.name]));
    const recentPaid = [...paidInvoices]
      .sort((a, b) => new Date(b.paidAt ?? b.updatedAt).getTime() - new Date(a.paidAt ?? a.updatedAt).getTime())
      .slice(0, 10)
      .map((i) => ({ ...i, outletName: outletById.get(i.outletId) ?? "?" }));

    const unpaidCount = allInvoices.filter((i) => i.status === "unpaid").length;
    const unpaidTotal = allInvoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0);

    const body = {
      totalOutlets: allOutlets.length,
      statusBreakdown,
      mrr,
      totalRevenueAllTime,
      recentPaid,
      unpaidCount,
      unpaidTotal,
    };
    cached = { body, at: Date.now() };
    return NextResponse.json(body);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
