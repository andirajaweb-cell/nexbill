import { NextRequest, NextResponse } from "next/server";
import { validateVoucher } from "@/lib/pos/vouchers";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const { code, subtotal, customerId } = await req.json();
  const result = await validateVoucher(session.outletId, code, subtotal, customerId);
  return NextResponse.json(result);
}
