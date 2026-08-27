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

/** Lists messages in one of the caller's own outlet's support tickets. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const thread = await getOwnedThread(id, session.outletId);
    if (!thread) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const rows = await db.select().from(supportMessages).where(eq(supportMessages.threadId, id)).orderBy(asc(supportMessages.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Outlet staff replies on their own ticket — reopens it if it was marked resolved. Body: { body }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const thread = await getOwnedThread(id, session.outletId);
    if (!thread) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const [message] = await db
      .insert(supportMessages)
      .values({ threadId: id, sender: "outlet", senderName: session.name, body: body.body.trim() })
      .returning();
    await db.update(supportThreads).set({ lastMessageAt: now, status: "open" }).where(eq(supportThreads.id, id));

    return NextResponse.json(message);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
