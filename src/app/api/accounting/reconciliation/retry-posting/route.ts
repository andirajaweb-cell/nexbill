import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { resyncOrderJournal } from "@/lib/accounting/reconciliation-resync";
import { describeError } from "@/lib/api/error";

/**
 * "Sinkronkan Ulang Jurnal" action on any "Perlu Diperiksa" row in the Rekonsiliasi tab —
 * missing_gl, amount_mismatch, date_mismatch, or cancelled_with_gl (see reconcileOrders in
 * lib/reports/reconciliation.ts for what each means). Route path kept as retry-posting for
 * backward compatibility (originally only handled missing_gl via a plain postSalesJournal call);
 * now delegates to resyncOrderJournal (lib/accounting/reconciliation-resync.ts), which safely
 * voids+reposts instead of relying on postSalesJournal's idempotency guard to silently no-op when
 * a (stale/wrong) journal entry already exists — the bug a naive "just call postSalesJournal
 * again" button would have for every status except missing_gl.
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

    const result = await resyncOrderJournal(orderId, session.sub);
    if (result.repostError) {
      return NextResponse.json({ posted: false, error: `Jurnal lama sudah dibatalkan, tapi posting ulang gagal: ${result.repostError}. Coba lagi — order ini sekarang akan tampil sebagai "Belum Terposting" sampai berhasil.` });
    }
    if (!result.reposted) {
      // Cancelled order — resync intentionally stops after voiding, never reposts (see
      // resyncOrderJournal's own doc comment).
      return NextResponse.json({ posted: true, note: "Order ini berstatus dibatalkan — jurnal dibatalkan tanpa posting ulang (order dibatalkan seharusnya tidak punya revenue)." });
    }
    return NextResponse.json({ posted: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
