import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { correctPayment } from "@/lib/accounting/payment-correction";
import { describeError } from "@/lib/api/error";

/**
 * Corrects a settled payment's METHOD and/or NOMINAL on an already-recorded transaction — e.g. a
 * cashier who tapped "QRIS" but actually took cash, or a payment amount that no longer matches the
 * order's total after a rental/item correction changed it. Exact-role check (owner/superuser only),
 * same pattern as the other high-risk Transaction Center actions on this same page ("Tandai Lunas",
 * hard-delete — see the `isSuperuser` const in dashboard/transactions/page.tsx and the matching
 * checks in /api/orders/[id]/route.ts DELETE and /api/orders/[id]/settle/route.ts, which this must
 * stay in sync with) rather than a grantable Permission — this rewrites posted accounting history
 * via a void+repost, which the user's own request scoped to owner/superuser specifically, not a
 * delegable per-role permission.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa mengoreksi pembayaran transaksi." }, { status: 403 });
    }

    const { id: orderId, paymentId } = await params;
    const body = await req.json().catch(() => ({}));
    const newMethod = typeof body.method === "string" ? body.method.trim() : undefined;
    const newAmount = body.amount !== undefined ? Number(body.amount) : undefined;
    if (!newMethod && newAmount === undefined) return NextResponse.json({ error: "Metode atau nominal baru wajib diisi." }, { status: 400 });
    if (newAmount !== undefined && (!Number.isFinite(newAmount) || newAmount < 0)) {
      return NextResponse.json({ error: "Nominal koreksi wajib angka dan tidak boleh negatif." }, { status: 400 });
    }

    // Scope check: the order and the payment must both belong to the caller's own outlet —
    // never trust the URL params alone for cross-outlet isolation.
    const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    const [payment] = await db.select({ id: payments.id, orderId: payments.orderId }).from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment || payment.orderId !== orderId) return NextResponse.json({ error: "Pembayaran tidak ditemukan pada transaksi ini." }, { status: 404 });

    const result = await correctPayment(orderId, paymentId, { newMethod: newMethod || undefined, newAmount }, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
