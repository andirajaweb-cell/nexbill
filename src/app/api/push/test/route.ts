import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { sendTestPush } from "@/lib/push/service";

/** Kirim notifikasi uji ke semua perangkat akun yang login. */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const delivered = await sendTestPush(session.sub, session.outletId);
    return NextResponse.json({ delivered });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
