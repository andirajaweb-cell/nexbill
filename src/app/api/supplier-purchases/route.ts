import { NextRequest, NextResponse } from "next/server";
import { recordSupplierPurchase } from "@/lib/inventory/purchasing";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/** Quick "belanja supplier" purchase — see recordSupplierPurchase for the landed-cost/HPP logic. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json();
    if (!body.supplierId) return NextResponse.json({ error: "Supplier wajib dipilih." }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Minimal 1 item belanja." }, { status: 400 });
    }
    const result = await recordSupplierPurchase({ ...body, outletId: session.outletId });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
