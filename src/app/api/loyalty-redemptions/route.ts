import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { redeemReward, listRedemptionsForCustomer } from "@/lib/membership/rewards";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const customerId = req.nextUrl.searchParams.get("customerId");
    if (!customerId) return NextResponse.json({ error: "customerId wajib diisi" }, { status: 400 });
    const rows = await listRedemptionsForCustomer(customerId, session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin memproses redeem reward." }, { status: 403 });
    }
    const { customerId, rewardId } = await req.json();
    if (!customerId || !rewardId) return NextResponse.json({ error: "customerId dan rewardId wajib diisi." }, { status: 400 });
    const result = await redeemReward(customerId, rewardId, session.sub ?? null, session.outletId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
