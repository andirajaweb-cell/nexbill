import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { beriUlasan } from "@/lib/marketplace/trust-service";

/** Rating 1–5 + ulasan singkat untuk pihak lawan, setelah kesepakatan selesai. Sekali per pihak. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin bertransaksi di Marketplace." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    return NextResponse.json(await beriUlasan(id, session.outletId, body.rating, body.comment, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
