import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { paymentMethods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Deleting a method only removes it from the picker going forward — historical
 * payments/other_incomes rows already stored the method key as free text, so
 * they're unaffected (no FK, nothing to cascade or block on).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus metode pembayaran." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);
    if (!existing) return NextResponse.json({ ok: true }); // already gone
    if (existing.outletId !== session.outletId) return NextResponse.json({ error: "Metode pembayaran tidak ditemukan." }, { status: 404 });
    if (existing.kind === "cash") {
      return NextResponse.json({ error: "Metode pembayaran Tunai (Cash) tidak bisa dihapus — dibutuhkan untuk hitung fisik kas saat tutup shift." }, { status: 400 });
    }
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
