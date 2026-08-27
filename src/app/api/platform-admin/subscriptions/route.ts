import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, subscriptionInvoices } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** All subscription invoices across every outlet — the platform's own "penjualan langganan" ledger. */
export async function GET() {
  try {
    await requirePlatformAdmin();

    const allOutlets = await db.select({ id: outlets.id, name: outlets.name }).from(outlets);
    const outletById = new Map(allOutlets.map((o) => [o.id, o.name]));

    const invoices = await db.select().from(subscriptionInvoices);
    const rows = invoices
      .map((i) => ({ ...i, outletName: outletById.get(i.outletId) ?? "?" }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalPaid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
    const totalUnpaid = rows.filter((r) => r.status === "unpaid").reduce((s, r) => s + r.amount, 0);

    // Revenue grouped by month (based on paidAt) — powers a simple trend view without needing a chart lib.
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      if (r.status !== "paid" || !r.paidAt) continue;
      const month = r.paidAt.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + r.amount);
    }
    const revenueByMonth = Array.from(byMonth.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ invoices: rows, totalPaid, totalUnpaid, revenueByMonth });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
