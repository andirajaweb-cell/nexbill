import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { createPurchaseReturn } from "@/lib/inventory/purchasing";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const body = await req.json();
  try {
    return NextResponse.json(await createPurchaseReturn({ ...body, outletId: session.outletId }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
