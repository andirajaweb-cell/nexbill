import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { syncInvoicePaymentStatus } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { subscriptionInvoices, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * "Cek Status Pembayaran" button on the Billing page — was previously a dead route (the frontend's
 * doSync() has always called this exact path, but no route file existed here until now, so it
 * 404'd unconditionally). Same ownership-check pattern as pay/route.ts and confirm/route.ts —
 * duplicated rather than shared because each route's params/response shape is slightly different.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa mengecek status pembayaran langganan." }, { status: 403 });
    }
    const { id } = await params;
    const [target] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, id)).limit(1);
    let owns = target?.outletId === session.outletId;
    if (!owns && target?.billingGroupId) {
      const [callerSub] = await db.select({ billingGroupId: subscriptions.billingGroupId }).from(subscriptions).where(eq(subscriptions.outletId, session.outletId)).limit(1);
      owns = callerSub?.billingGroupId === target.billingGroupId;
    }
    if (!target || !owns) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });

    const result = await syncInvoicePaymentStatus(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
