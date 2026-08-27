import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformCosts, platformPurchases, subscriptionInvoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/**
 * Manual COGS ledger for running NEXBILL itself, netted against subscription revenue for a rough
 * monthly margin. "Cost" here is two things combined: recurring/pay-as-you-go service bills
 * (platformCosts — hosting, Vercel, Supabase, Tuya, OpenAI, Claude, etc.) AND product procurement
 * spend (platformPurchases — what NEXBILL paid suppliers for smart plugs/other hardware), grouped
 * by month (platformCosts.periodMonth, platformPurchases.purchaseDate sliced to "YYYY-MM").
 */
export async function GET() {
  try {
    await requirePlatformAdmin();

    const costs = await db.select().from(platformCosts);
    const sorted = [...costs].sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
    const purchases = await db.select().from(platformPurchases);

    const invoices = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.status, "paid"));
    const revenueByMonth = new Map<string, number>();
    for (const inv of invoices) {
      if (!inv.paidAt) continue;
      const month = inv.paidAt.slice(0, 7);
      revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + inv.amount);
    }
    const costByMonth = new Map<string, number>();
    for (const c of costs) costByMonth.set(c.periodMonth, (costByMonth.get(c.periodMonth) ?? 0) + c.amount);
    for (const p of purchases) {
      const month = p.purchaseDate.slice(0, 7);
      costByMonth.set(month, (costByMonth.get(month) ?? 0) + p.totalCost);
    }

    const months = Array.from(new Set([...revenueByMonth.keys(), ...costByMonth.keys()])).sort();
    const margin = months.map((month) => {
      const revenue = revenueByMonth.get(month) ?? 0;
      const cost = costByMonth.get(month) ?? 0;
      return { month, revenue, cost, margin: revenue - cost };
    });

    return NextResponse.json({ costs: sorted, margin });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json();
    if (!body.periodMonth || !body.category || !body.description || body.amount == null) {
      return NextResponse.json({ error: "periodMonth, category, description, amount wajib diisi." }, { status: 400 });
    }
    const [row] = await db
      .insert(platformCosts)
      .values({
        periodMonth: body.periodMonth,
        category: body.category,
        description: body.description,
        amount: Number(body.amount),
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
