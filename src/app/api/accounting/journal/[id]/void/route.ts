import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { journalEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { voidJournal } from "@/lib/accounting/journal";
import { describeError } from "@/lib/api/error";

/** Voids a journal entry (posts the exact reversing entry, flips status — never deletes). Restricted to manual entries only from this route; auto-posted entries (rental/pos/expense/ppob/...) should be reversed through their own module's void/refund flow so the source row's own status stays in sync, not directly here. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "post_manual_journal")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membatalkan jurnal." }, { status: 403 });
    }

    const { id } = await params;
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!entry || entry.outletId !== session.outletId) return NextResponse.json({ error: "Jurnal tidak ditemukan." }, { status: 404 });
    if (entry.sourceType !== "manual") {
      return NextResponse.json({ error: "Hanya jurnal manual yang bisa dibatalkan dari sini — jurnal otomatis dibatalkan lewat modul asalnya (void/refund transaksi terkait)." }, { status: 400 });
    }
    if (entry.status === "void") return NextResponse.json({ error: "Jurnal ini sudah dibatalkan sebelumnya." }, { status: 400 });

    const body = await _req.json().catch(() => ({}));
    await voidJournal(id, body.reason || "Dibatalkan manual oleh staff");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
