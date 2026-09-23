import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { createListing, listPublicListings, listMyListings } from "@/lib/marketplace/service";

/**
 * Etalase Marketplace Antar-Outlet.
 *
 * GET ?scope=mine mengembalikan barang milik outlet sendiri; tanpa itu, etalase outlet LAIN.
 * Keduanya sengaja satu endpoint: sumber kebenarannya sama, dan memisahkannya jadi dua rute hanya
 * akan menggandakan pemeriksaan sesi yang sama persis.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    if (searchParams.get("scope") === "mine") {
      return NextResponse.json(await listMyListings(session.outletId));
    }
    return NextResponse.json(
      await listPublicListings(session.outletId, {
        category: searchParams.get("kategori") ?? undefined,
        search: searchParams.get("cari") ?? undefined,
      })
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin memasang barang di Marketplace." }, { status: 403 });
    }

    const body = await req.json();
    const row = await createListing({
      outletId: session.outletId,
      title: body.title,
      description: body.description,
      category: body.category,
      condition: body.condition,
      qty: body.qty,
      price: Number(body.price),
      negotiable: body.negotiable,
      city: body.city,
      contactPhone: body.contactPhone,
      imageUrl: body.imageUrl,
      staffUserId: session.sub,
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
