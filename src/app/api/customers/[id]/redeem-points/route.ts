import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redeemLoyaltyPoints } from "@/lib/membership/loyalty";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { points, note } = await req.json();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [customer] = await db.select({ outletId: customers.outletId }).from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer || (customer.outletId && customer.outletId !== session.outletId)) {
      return NextResponse.json({ error: "Customer tidak ditemukan" }, { status: 404 });
    }
    await redeemLoyaltyPoints(id, points, note ?? "Redeem manual");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
