import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads, supportMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/** Lists this outlet's own support tickets with NEXBILL customer service — always scoped by session.outletId. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db
      .select()
      .from(supportThreads)
      .where(eq(supportThreads.outletId, session.outletId))
      .orderBy(desc(supportThreads.lastMessageAt), desc(supportThreads.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Opens a new support ticket (thread + first message) for the caller's own outlet. Body: { subject?, category, message }. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    }
    const category = ["keluhan", "saran", "kendala_teknis", "lainnya"].includes(body.category) ? body.category : "lainnya";
    const now = new Date().toISOString();

    const [thread] = await db
      .insert(supportThreads)
      .values({ outletId: session.outletId, subject: body.subject || null, category, lastMessageAt: now })
      .returning();
    const [message] = await db
      .insert(supportMessages)
      .values({ threadId: thread.id, sender: "outlet", senderName: session.name, body: body.message.trim() })
      .returning();

    return NextResponse.json({ thread, message });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
