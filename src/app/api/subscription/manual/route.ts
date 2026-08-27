import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { smartPlugOrders, subscriptionInvoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { buildSmartPlugManualPdf } from "@/lib/subscription/manual-pdf";
import { describeError } from "@/lib/api/error";

/**
 * Smart plug "buku manual" download gate — only unlocks once the outlet has at least one smart
 * plug order whose invoice is actually PAID (not just checked out — an unpaid "pending_payment"
 * cart order shouldn't unlock the manual). Joins to subscriptionInvoices.status rather than trusting
 * qty alone, since smartPlugOrders rows are inserted at checkout time regardless of payment status
 * (see checkoutCart in lib/subscription/service.ts).
 *
 * Serves the PDF built fresh by buildSmartPlugManualPdf() rather than a static file under /public,
 * since a public/ path would be downloadable by anyone who guesses the URL — this route is the only
 * gate.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const [order] = await db
      .select({ id: smartPlugOrders.id, manualDownloadedAt: smartPlugOrders.manualDownloadedAt })
      .from(smartPlugOrders)
      .innerJoin(subscriptionInvoices, eq(smartPlugOrders.subscriptionInvoiceId, subscriptionInvoices.id))
      .where(and(eq(smartPlugOrders.outletId, session.outletId), eq(subscriptionInvoices.status, "paid")))
      .limit(1);
    if (!order) {
      return NextResponse.json({ error: "Belum ada pembelian smart plug yang lunas — manual book baru tersedia setelah invoice-nya dibayar." }, { status: 403 });
    }
    if (!order.manualDownloadedAt) {
      await db.update(smartPlugOrders).set({ manualDownloadedAt: new Date().toISOString() }).where(eq(smartPlugOrders.id, order.id));
    }

    const pdf = await buildSmartPlugManualPdf();
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Buku-Manual-Smart-Plug-BARDI-NEXBILL.pdf"',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
