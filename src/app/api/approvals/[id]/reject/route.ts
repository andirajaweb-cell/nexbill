import { NextRequest, NextResponse } from "next/server";
import { rejectRequest } from "@/lib/pos/void";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { approvalRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!hasPermission(session.role as StaffRole, "approve_requests")) {
    return NextResponse.json({ error: "Role kamu tidak punya izin menolak permintaan." }, { status: 403 });
  }
  const [existing] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
  if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
  const { note } = await req.json();
  try {
    return NextResponse.json(await rejectRequest(id, session.sub, session.role as StaffRole, note));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
