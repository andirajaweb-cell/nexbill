import { NextRequest, NextResponse } from "next/server";
import { voidOtherIncome } from "@/lib/accounting/other-income";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { otherIncomes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_other_income")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin void Pendapatan Lain-lain." }, { status: 403 });
    }

    const [existing] = await db.select().from(otherIncomes).where(eq(otherIncomes.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) {
      return NextResponse.json({ error: "Pendapatan lain-lain tidak ditemukan." }, { status: 404 });
    }

    const { reason } = await req.json();
    if (!reason) return NextResponse.json({ error: "Alasan void wajib diisi." }, { status: 400 });

    const result = await voidOtherIncome(id, session.sub, reason);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
