import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOrderPaymentSummary, initiatePayment, markPaymentSuccess } from "@/lib/payments";
import { describeError } from "@/lib/api/error";

/**
 * Manually settles an order stuck as "Menunggu Bayar"/"Sebagian" from the Transactions page —
 * e.g. a rental bill dismissed via "Tutup (bayar nanti di POS)" and never actually paid anywhere,
 * or a QRIS/gateway payment whose webhook never landed. Restricted to the Superuser role specifically
 * (exact string match, same pattern as hard-delete transaction and full data reset below) — this
 * is a manual accounting override, not a normal checkout action kasir/staff should have access to.
 *
 * First confirms any payment(s) already sitting "pending" against this order (mirrors the
 * "Tandai Diterima" override used on the Rental page's live checkout panel). If a balance still
 * remains after that — most commonly because no payment was ever initiated at all — it books one
 * fresh payment for the remainder via the requested method (defaults to cash) and confirms it
 * immediately, since this endpoint's whole purpose is "Superuser is manually recording that this was
 * actually paid."
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "superuser" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya akun Superuser/Owner yang bisa menandai transaksi lunas." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const method = body?.method || "cash";

    let summary = await getOrderPaymentSummary(id);
    if (!summary || summary.order.outletId !== session.outletId) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
    if (summary.order.status === "paid") return NextResponse.json({ error: "Order sudah lunas." }, { status: 400 });
    if (summary.order.status === "cancelled") return NextResponse.json({ error: "Order sudah dibatalkan." }, { status: 400 });

    for (const p of summary.payments) {
      if (p.status === "pending") await markPaymentSuccess(p.id);
    }

    summary = await getOrderPaymentSummary(id);
    if (summary && summary.remaining > 0.5) {
      const payment = await initiatePayment({
        orderId: id,
        amount: summary.remaining,
        method,
        description: `Pelunasan manual oleh Superuser — order ${id}`,
      });
      await markPaymentSuccess(payment.id);
    }

    const finalSummary = await getOrderPaymentSummary(id);
    return NextResponse.json({ ok: true, order: finalSummary?.order });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
