import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { recordReferralPayout } from "@/lib/referral/service";
import { describeError } from "@/lib/api/error";

/** Records a manual payout (NEXBILL ops transfers money out-of-band, e.g. bank transfer/e-wallet, then logs it here) — debits the partner's balanceAvailable. There is no automated disbursement. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Jumlah payout wajib diisi dan lebih dari 0." }, { status: 400 });

    const payout = await recordReferralPayout(id, amount, { method: body.method, note: body.note, platformAdminId: admin.sub });
    return NextResponse.json(payout);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
