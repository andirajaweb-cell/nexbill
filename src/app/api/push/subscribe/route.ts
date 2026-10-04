import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { saveSubscription, removeSubscription } from "@/lib/push/service";

/** Simpan langganan push perangkat ini untuk akun yang login. Body: { subscription: PushSubscriptionJSON, isAndroidApp? }. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const sub = body.subscription ?? {};
    await saveSubscription({
      staffUserId: session.sub,
      outletId: session.outletId,
      endpoint: String(sub.endpoint ?? ""),
      p256dh: String(sub.keys?.p256dh ?? ""),
      auth: String(sub.keys?.auth ?? ""),
      userAgent: req.headers.get("user-agent"),
      isAndroidApp: !!body.isAndroidApp,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Hapus langganan push perangkat ini. Body: { endpoint }. */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (body.endpoint) await removeSubscription(session.sub, String(body.endpoint));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
