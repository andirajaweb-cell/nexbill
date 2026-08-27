import { NextRequest, NextResponse } from "next/server";
import { voidPpobTransaction } from "@/lib/ppob/engine";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { ppobTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_ppob")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membatalkan transaksi PPOB." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi PPOB tidak ditemukan." }, { status: 404 });
    const { reason } = await req.json();
    const result = await voidPpobTransaction(id, reason ?? "", session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
