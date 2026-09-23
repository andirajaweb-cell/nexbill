import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { createDeal, listDeals } from "@/lib/marketplace/service";

/** Semua kesepakatan yang menyangkut outlet ini, baik sebagai penjual maupun pembeli — `peran` di tiap baris menyebut yang mana. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listDeals(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Pembeli mengajukan penawaran atas sebuah barang. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin bertransaksi di Marketplace." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.listingId) return NextResponse.json({ error: "Barang tidak dipilih." }, { status: 400 });

    const row = await createDeal({
      listingId: body.listingId,
      buyerOutletId: session.outletId,
      qty: body.qty,
      agreedPrice: body.agreedPrice != null ? Number(body.agreedPrice) : undefined,
      buyerNote: body.buyerNote,
      staffUserId: session.sub,
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
