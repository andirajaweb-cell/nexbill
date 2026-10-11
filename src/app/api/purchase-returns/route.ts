import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { createPurchaseReturn } from "@/lib/inventory/purchasing";
import { getSession } from "@/lib/auth/session";
import { forbidUnless } from "@/lib/auth/require-permission";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const denied = forbidUnless(session, ["manage_inventory_purchasing", "manage_supplier_purchase_history"], "Role kamu tidak punya izin membuat retur pembelian.");
  if (denied) return denied;
  const body = await req.json();
  try {
    return NextResponse.json(await createPurchaseReturn({ ...body, outletId: session.outletId }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
