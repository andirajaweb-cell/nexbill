import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { subscriptionInvoices, smartPlugOrders, subscriptionPlans } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getSubscriptionSummary, computeTvComposition, ensureDefaultPlan, listStorefrontProducts } from "@/lib/subscription/service";
import { getBillingGroupForOutlet } from "@/lib/subscription/billing-group";
import { resolveBillingCurrencyForOutlet } from "@/lib/market-risk/currency";
import { describeError } from "@/lib/api/error";

/** Everything the Billing/Langganan dashboard page needs in one call: current subscription state, gate flags, invoice history, smart plug fulfillment, and the active plan catalog (for the checkout form). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    await ensureDefaultPlan();
    const summary = await getSubscriptionSummary(session.outletId);
    const billingGroupId = summary.subscription.billingGroupId;
    // A "group_renewal" invoice's own outletId only points at the group's anchor outlet (see
    // ensureGroupRenewalInvoiceExists in service.ts) — a non-anchor member outlet would never
    // see it here without also matching on billingGroupId, even though paying it renews their
    // subscription too.
    const invoices = await db
      .select()
      .from(subscriptionInvoices)
      .where(billingGroupId ? or(eq(subscriptionInvoices.outletId, session.outletId), eq(subscriptionInvoices.billingGroupId, billingGroupId)) : eq(subscriptionInvoices.outletId, session.outletId))
      .orderBy(desc(subscriptionInvoices.createdAt));
    // Joined with invoice status so the Billing page can gate "buku manual" download on an actually
    // PAID smart plug purchase, not just a checked-out (possibly still-unpaid) order — see
    // /api/subscription/manual/route.ts, which enforces the same check server-side.
    const plugOrders = (
      await db
        .select({ order: smartPlugOrders, invoiceStatus: subscriptionInvoices.status })
        .from(smartPlugOrders)
        .innerJoin(subscriptionInvoices, eq(smartPlugOrders.subscriptionInvoiceId, subscriptionInvoices.id))
        .where(eq(smartPlugOrders.outletId, session.outletId))
    ).map((r) => ({ ...r.order, invoiceStatus: r.invoiceStatus }));
    const composition = await computeTvComposition(session.outletId);
    const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
    const products = await listStorefrontProducts();
    const billingGroup = billingGroupId ? await getBillingGroupForOutlet(session.outletId) : null;
    // "biaya langganan Rp249.000 untuk Indonesia, USD/lainnya untuk mancanegara" — see
    // resolveBillingCurrencyForOutlet(). null code means IDR/no conversion (the common case).
    const billingCurrency = await resolveBillingCurrencyForOutlet(session.outletId);

    return NextResponse.json({ ...summary, invoices, plugOrders, composition, plans, products, billingGroup, billingCurrency });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
