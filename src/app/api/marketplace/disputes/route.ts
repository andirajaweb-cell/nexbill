import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { aduanUntukOutlet, ajukanAduan } from "@/lib/marketplace/trust-service";

/** Aduan yang menyangkut outlet ini — sebagai pelapor maupun terlapor. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await aduanUntukOutlet(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Mengajukan aduan atas satu kesepakatan. Diputuskan manual oleh platform-admin. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin bertransaksi di Marketplace." }, { status: 403 });
    }
    const body = await req.json();
    const row = await ajukanAduan(
      { dealId: body.dealId, outletId: session.outletId, category: body.category, description: body.description, evidenceUrls: body.evidenceUrls },
      session.sub
    );
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
