import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads, supportMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Lists messages in any outlet's ticket — cross-tenant read, gated by requirePlatformAdmin. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const rows = await db.select().from(supportMessages).where(eq(supportMessages.threadId, id)).orderBy(asc(supportMessages.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Platform admin replies to an outlet's ticket. Body: { body }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const [thread] = await db.select().from(supportThreads).where(eq(supportThreads.id, id)).limit(1);
    if (!thread) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const [message] = await db
      .insert(supportMessages)
      .values({ threadId: id, sender: "platform_admin", senderName: session.name, body: body.body.trim() })
      .returning();
    await db.update(supportThreads).set({ lastMessageAt: now }).where(eq(supportThreads.id, id));

    return NextResponse.json(message);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
