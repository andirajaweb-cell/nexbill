import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformAnnouncements, notificationReads } from "@/db/schema";
import { and, eq, or, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Announcements this staff member hasn't dismissed yet AND that are flagged to show as a popup
 * (showAsPopup=true) — a narrower, richer-shaped sibling of the generic /api/notifications feed
 * (which also includes announcement items, but as the generic NotificationItem shape without
 * showAsPopup). Read-state is the SAME notificationReads table/key (`announcement:{id}`) as the
 * bell, so dismissing here also clears it from the bell dropdown and vice versa.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const rows = await db
      .select()
      .from(platformAnnouncements)
      .where(
        and(
          eq(platformAnnouncements.isActive, true),
          eq(platformAnnouncements.showAsPopup, true),
          or(isNull(platformAnnouncements.outletId), eq(platformAnnouncements.outletId, session.outletId))
        )
      );
    if (rows.length === 0) return NextResponse.json({ items: [] });

    const reads = await db
      .select({ notificationKey: notificationReads.notificationKey })
      .from(notificationReads)
      .where(eq(notificationReads.staffUserId, session.sub));
    const readKeys = new Set(reads.map((r) => r.notificationKey));

    const items = rows
      .filter((r) => !readKeys.has(`announcement:${r.id}`))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((r) => ({ id: r.id, title: r.title, message: r.message, severity: r.severity, imageUrl: r.imageUrl }));

    return NextResponse.json({ items });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
