import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { subscriptionInvoices, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { confirmInvoicePayment, getOutletBillingContact } from "@/lib/subscription/service";
import { sendEmail, invoicePaidEmail } from "@/lib/notifications/email";
import { describeError } from "@/lib/api/error";

/**
 * Confirms a platform-billing invoice as paid — cash marked received at the
 * counter, or a QRIS deposit confirmed once the transfer lands (same
 * self-service trust level as this app's existing confirm-cash/confirm-deposit
 * routes; there's no live payment-gateway webhook wired to subscriptionInvoices
 * yet, and no platform-admin approval panel built yet either — see the
 * technical-flow write-up for that follow-up). Sends the "pembayaran diterima"
 * email (with manual book link for smart-plug purchases) once confirmed.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa konfirmasi pembayaran langganan." }, { status: 403 });
    }
    const { id } = await params;
    const [target] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, id)).limit(1);
    // See pay/route.ts — a "group_renewal" invoice belongs to every member outlet sharing its
    // billingGroupId, not just the anchor outlet its own outletId points at.
    let owns = target?.outletId === session.outletId;
    if (!owns && target?.billingGroupId) {
      const [callerSub] = await db.select({ billingGroupId: subscriptions.billingGroupId }).from(subscriptions).where(eq(subscriptions.outletId, session.outletId)).limit(1);
      owns = callerSub?.billingGroupId === target.billingGroupId;
    }
    if (!target || !owns) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });

    const invoice = await confirmInvoicePayment(id);

    const [row] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, id)).limit(1);
    if (row) {
      const { email, outletName } = await getOutletBillingContact(row.outletId);
      if (email) {
        const manualUrl = row.type === "smart_plug_purchase" ? `${process.env.APP_BASE_URL ?? ""}/api/subscription/manual` : undefined;
        const tpl = invoicePaidEmail(outletName, row.invoiceNumber, row.amount, manualUrl);
        await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
        await db.update(subscriptionInvoices).set({ emailSentAt: new Date().toISOString() }).where(eq(subscriptionInvoices.id, id));
      }
    }

    return NextResponse.json(invoice);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
