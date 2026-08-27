import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalAssets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const productId = req.nextUrl.searchParams.get("productId");
    const rows = await db
      .select()
      .from(homeRentalAssets)
      .where(productId ? and(eq(homeRentalAssets.outletId, outletId), eq(homeRentalAssets.productId, productId)) : eq(homeRentalAssets.outletId, outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Register a new physical unit (e.g. "PS5-003") under a product. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.productId) return NextResponse.json({ error: "Produk wajib dipilih." }, { status: 400 });
    if (!body.assetCode) return NextResponse.json({ error: "Kode aset (mis. PS5-001) wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(homeRentalAssets)
      .values({
        outletId: session.outletId,
        productId: body.productId,
        assetCode: body.assetCode,
        serialNumber: body.serialNumber ?? null,
        model: body.model ?? null,
        purchaseCost: Number(body.purchaseCost) || 0,
        currentValue: Number(body.currentValue) || Number(body.purchaseCost) || 0,
        condition: body.condition ?? "good",
        location: body.location ?? null,
        note: body.note ?? null,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
