import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { correctRentalCharge } from "@/lib/rental/rental-charge-correction";
import { describeError } from "@/lib/api/error";

/**
 * Corrects a rental transaction's billed AMOUNT (the itemType="rental" line) after the fact — e.g.
 * a session billed wrong because a promo's package price drifted mid-session (see the doc comment
 * on rentalSessions.promoPackagePrice in db/schema.ts for the bug this recovers from). Exact-role
 * check (owner/superuser only), same pattern as PATCH /api/transactions/[id]/payments/[paymentId]
 * and the other high-risk Transaction Center actions on this page.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa mengoreksi nominal transaksi rental." }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const newAmount = Number(body.amount);
    const orderItemId = String(body.orderItemId ?? "");
    if (!orderItemId) return NextResponse.json({ error: "Baris item yang dikoreksi wajib disertakan." }, { status: 400 });
    if (!Number.isFinite(newAmount) || newAmount < 0) return NextResponse.json({ error: "Nominal koreksi wajib diisi dan tidak boleh negatif." }, { status: 400 });

    const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });

    const result = await correctRentalCharge(orderId, orderItemId, newAmount, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
