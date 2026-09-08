import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, journalEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { postSalesJournal } from "@/lib/accounting/postings";
import { describeError } from "@/lib/api/error";

/**
 * Manually re-triggers postSalesJournal for one order — the "Post Ulang" action on a
 * "missing_gl" row in the Rekonsiliasi tab (see reconciliation.ts: a paid/partial order with NO
 * GL revenue at all). postSalesJournal is normally called best-effort straight after payment
 * (see runPostPaymentSideEffects in lib/payments/index.ts) and swallows its own errors, only
 * logging to the server console — which means a merchant has no way to see WHY it failed, let
 * alone retry it, without someone pulling hosting logs. This route surfaces the real error (or
 * confirms nothing was actually postable) directly in the UI instead.
 *
 * Safe to call on an already-posted or not-yet-paid order: postSalesJournal's own idempotency
 * guard (existing journalEntries row for this order+reference) and its "no successful payments
 * yet" guard both make this a harmless no-op rather than a duplicate post or a crash.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "post_manual_journal")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin posting jurnal." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;
    if (!orderId) return NextResponse.json({ error: "orderId wajib diisi." }, { status: 400 });

    const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.outletId !== session.outletId) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });

    try {
      await postSalesJournal(orderId);
    } catch (err) {
      // The real failure reason, surfaced for the first time — previously only console.error on
      // the server. Report but don't 500: the merchant still needs to see this message rendered.
      return NextResponse.json({ posted: false, error: describeError(err) });
    }

    const reference = `ORDER-${orderId.slice(0, 8)}`;
    const [posted] = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceId, orderId), eq(journalEntries.reference, reference)))
      .limit(1);

    if (!posted) {
      // No error thrown, but still nothing posted — the "no successful payment yet" no-op path.
      return NextResponse.json({ posted: false, error: "Order ini belum punya pembayaran sukses tercatat, jadi belum ada yang bisa diposting." });
    }
    return NextResponse.json({ posted: true, journalEntryId: posted.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
