import { NextRequest, NextResponse } from "next/server";
import { products } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { forbidUnless } from "@/lib/auth/require-permission";
import { describeError, errorStatus } from "@/lib/api/error";
import { setStockTracking } from "@/lib/inventory/stock-tracking";

/** Saklar "Lacak stok" per produk. Body { tracked: boolean }. Lihat lib/inventory/stock-tracking.ts. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow(products, id, "Produk tidak ditemukan.");
    const denied = forbidUnless(session, ["manage_inventory_purchasing"], "Role kamu tidak punya izin mengubah pelacakan stok.");
    if (denied) return denied;
    const body = await req.json().catch(() => ({}));
    if (typeof body?.tracked !== "boolean") return NextResponse.json({ error: "Parameter tracked wajib true/false." }, { status: 400 });
    const result = await setStockTracking(id, body.tracked, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
