import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { decideRentalApproval } from "@/lib/home-rental/risk";
import { db } from "@/db/client";
import { homeRentalRentals } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Approve or reject a booking that Risk Control flagged as high-risk (approvalStatus="pending") — same permission tier (approve_requests) as void/refund approvals elsewhere in the app. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "approve_requests")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menyetujui/menolak booking berisiko." }, { status: 403 });
    }
    const [existingRental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!existingRental || existingRental.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    if (body.decision !== "approved" && body.decision !== "rejected") {
      return NextResponse.json({ error: 'decision harus "approved" atau "rejected".' }, { status: 400 });
    }
    const row = await decideRentalApproval(id, body.decision, session.sub, body.note);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
