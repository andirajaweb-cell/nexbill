import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { membershipPayments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { voidMembershipPayment } from "@/lib/membership/membership-fee";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_membership")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membatalkan pembayaran keanggotaan." }, { status: 403 });
    }

    const [row] = await db.select().from(membershipPayments).where(eq(membershipPayments.id, id)).limit(1);
    if (!row || row.outletId !== session.outletId) return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.reason) return NextResponse.json({ error: "Alasan void wajib diisi." }, { status: 400 });

    const result = await voidMembershipPayment(id, session.sub, body.reason);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
