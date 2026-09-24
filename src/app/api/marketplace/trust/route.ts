import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { profilSatuOutlet, ambilBarisTrust, rekeningDariBaris, simpanRekening, ulasanTerbaru } from "@/lib/marketplace/trust-service";
import { rekeningBaruDiganti } from "@/lib/marketplace/trust";

/**
 * Tab "Keamanan & Rekening" milik outlet sendiri: profil kepercayaan (seperti yang dilihat outlet
 * lain), rekening penerima, status penangguhan, dan ulasan terbaru.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [profil, baris, ulasan] = await Promise.all([profilSatuOutlet(session.outletId), ambilBarisTrust(session.outletId), ulasanTerbaru(session.outletId)]);
    return NextResponse.json({
      profil,
      rekening: rekeningDariBaris(baris),
      rekeningBaru: rekeningBaruDiganti(baris?.bankUpdatedAt),
      suspended: baris?.suspended ?? false,
      suspendedReason: baris?.suspendedReason ?? null,
      warningCount: baris?.warningCount ?? 0,
      ulasan,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Menyimpan rekening penerima pembayaran Marketplace. */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah rekening Marketplace." }, { status: 403 });
    }
    const body = await req.json();
    const rekening = await simpanRekening(session.outletId, { bankName: body.bankName, accountNumber: body.accountNumber, holder: body.holder }, session.sub);
    return NextResponse.json({ rekening });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
