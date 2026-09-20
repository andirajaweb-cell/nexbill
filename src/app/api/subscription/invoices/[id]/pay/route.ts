import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { initiateInvoicePayment } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { subscriptionInvoices, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

// "cash" deliberately absent since 2026-09-16 — NEXBILL's own subscription billing is an online
// service, so cash was never a real channel for an outlet paying US (the POS side's cash payments
// are a different system entirely, see lib/payments/index.ts). Invoices already carrying method
// "cash" stay confirmable via the sibling /confirm route.
const VALID_METHODS = new Set(["qris", "va_bca", "va_bni", "va_mandiri", "va_bri", "va_permata", "ipaymu_crossborder", "ipaymu_hosted"]);

/** Initiates payment on one platform-billing invoice (cash, QRIS, or bank VA) — mirrors the
 * customer-facing bayar-dimuka flow, but money flows the other direction (outlet -> NEXBILL). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa membayar tagihan langganan." }, { status: 403 });
    }
    const { id } = await params;
    const [target] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, id)).limit(1);
    // A "group_renewal" invoice's outletId only points at the group's anchor outlet, but every
    // member outlet sharing that billingGroupId is entitled to pay it — see billing-group.ts.
    let owns = target?.outletId === session.outletId;
    if (!owns && target?.billingGroupId) {
      const [callerSub] = await db.select({ billingGroupId: subscriptions.billingGroupId }).from(subscriptions).where(eq(subscriptions.outletId, session.outletId)).limit(1);
      owns = callerSub?.billingGroupId === target.billingGroupId;
    }
    if (!target || !owns) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
    const { method } = await req.json();
    if (!VALID_METHODS.has(method)) {
      return NextResponse.json({ error: "Metode pembayaran harus QRIS, virtual account (BCA/BNI/Mandiri/BRI/Permata), e-wallet/retail, atau kartu lintas negara." }, { status: 400 });
    }
    const invoice = await initiateInvoicePayment(id, method);
    return NextResponse.json(invoice);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
