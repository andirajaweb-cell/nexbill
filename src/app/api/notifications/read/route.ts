import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import type { StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Marks one notification (body: { key }) or every currently-visible one
 * (body: { all: true }) as read for the caller. "all" re-derives the current
 * key list server-side from getNotifications() rather than trusting a
 * client-supplied array, so a stale/tampered request can't mark keys the
 * caller was never shown (or that belong to a different outlet).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body?.all) {
      const { items } = await getNotifications(session.outletId, session.sub, session.role as StaffRole);
      await markAllNotificationsRead(session.outletId, session.sub, items.filter((i) => !i.read).map((i) => i.key));
    } else if (typeof body?.key === "string" && body.key.length > 0) {
      await markNotificationRead(session.outletId, session.sub, body.key);
    } else {
      return NextResponse.json({ error: "Sertakan 'key' atau 'all: true'." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
