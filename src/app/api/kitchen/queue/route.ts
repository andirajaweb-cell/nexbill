import { NextRequest, NextResponse } from "next/server";
import { getKitchenQueue } from "@/lib/kitchen/queue";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here.
    return NextResponse.json(await getKitchenQueue(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
