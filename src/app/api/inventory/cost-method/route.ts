import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { findLayerDrift, listOutletLayers, reconcileLayers, switchCostMethod } from "@/lib/inventory/costing";

/** Metode penilaian persediaan outlet + lapisan FIFO yang tersisa (untuk tab Produk & Belanja Supplier). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [outlet] = await db
      .select({ method: outlets.inventoryCostMethod, since: outlets.inventoryCostMethodSince })
      .from(outlets)
      .where(eq(outlets.id, session.outletId))
      .limit(1);
    const method = outlet?.method === "fifo" ? "fifo" : "average";
    return NextResponse.json({
      method,
      since: outlet?.since ?? null,
      layers: method === "fifo" ? await listOutletLayers(session.outletId) : [],
      drift: method === "fifo" ? (await findLayerDrift(session.outletId)).length : 0,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Ganti metode ({ method: "average" | "fifo" }) atau samakan lapisan dengan stok ({ reconcile: true }).
 * Kebijakan akuntansi — hanya role yang boleh mengelola COA sekaligus inventori (Owner secara default).
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const role = session.role as StaffRole;
    if (!hasPermission(role, "manage_coa") || !hasPermission(role, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Hanya Owner yang bisa mengubah metode harga modal (kebijakan akuntansi)." }, { status: 403 });
    }
    const body = await req.json();
    if (body.reconcile) return NextResponse.json({ reconciled: await reconcileLayers(session.outletId) });
    return NextResponse.json(await switchCostMethod(session.outletId, body.method, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
