import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads, supportMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

async function getOwnedThread(id: string, outletId: string) {
  const [thread] = await db.select().from(supportThreads).where(eq(supportThreads.id, id)).limit(1);
  if (!thread || thread.outletId !== outletId) return null;
  return thread;
}

/** Lists messages in one of the caller's own outlet's support tickets. Viewing counts as reading — bumps outletLastReadAt so this thread drops out of the unread badge/list. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const thread = await getOwnedThread(id, session.outletId);
    if (!thread) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const rows = await db.select().from(supportMessages).where(eq(supportMessages.threadId, id)).orderBy(asc(supportMessages.createdAt));
    // Skip the write once already caught up — this route is polled every few seconds while a
    // ticket is open, so without this guard every single poll tick would issue an UPDATE even
    // when there's nothing new to mark read.
    const alreadyRead = !thread.lastMessageAt || (thread.outletLastReadAt && new Date(thread.outletLastReadAt) >= new Date(thread.lastMessageAt));
    if (!alreadyRead) {
      await db.update(supportThreads).set({ outletLastReadAt: new Date().toISOString() }).where(eq(supportThreads.id, id));
    }
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Outlet staff replies on their own ticket — reopens it if it was marked resolved. Body: { body, attachmentUrl?, attachmentType?, attachmentName? } — body may be empty if an attachment is included. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const thread = await getOwnedThread(id, session.outletId);
    if (!thread) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const messageText = typeof body.body === "string" ? body.body.trim() : "";
    const hasAttachment = typeof body.attachmentUrl === "string" && body.attachmentUrl.trim().length > 0;
    if (!messageText && !hasAttachment) {
      return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const [message] = await db
      .insert(supportMessages)
      .values({
        threadId: id,
        sender: "outlet",
        senderName: session.name,
        body: messageText,
        attachmentUrl: hasAttachment ? body.attachmentUrl : null,
        attachmentType: hasAttachment ? body.attachmentType || null : null,
        attachmentName: hasAttachment ? body.attachmentName || null : null,
      })
      .returning();
    // outletLastReadAt bumped alongside lastMessageAt — the outlet replying is itself an act of
    // having read the thread up to this point, so it shouldn't show as unread to them afterward.
    await db.update(supportThreads).set({ lastMessageAt: now, outletLastReadAt: now, status: "open" }).where(eq(supportThreads.id, id));

    return NextResponse.json(message);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
