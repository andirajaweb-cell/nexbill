import { NextRequest, NextResponse } from "next/server";
import { editPpobTransaction, hardDeletePpobTransaction } from "@/lib/ppob/engine";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { ppobTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Edit and hard-delete for PPOB transactions — both restricted to the exact
 * "superuser" role, same convention as the transactions-page hard delete
 * and the full data reset feature. Regular "manage_ppob" holders can still
 * only add new entries and Batalkan (void, which preserves the row) via the
 * existing routes — this is the one level up from that.
 */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "superuser" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya akun Superuser/Owner yang bisa mengedit transaksi PPOB." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi PPOB tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const result = await editPpobTransaction(id, body, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "superuser" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya akun Superuser/Owner yang bisa menghapus transaksi PPOB." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi PPOB tidak ditemukan." }, { status: 404 });
    const result = await hardDeletePpobTransaction(id, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
