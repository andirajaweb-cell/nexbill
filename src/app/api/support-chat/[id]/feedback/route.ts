import { NextRequest, NextResponse, after } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, supportMessages, supportThreads } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { autoReplySupportThread } from "@/lib/support-bot/dashboard-autoreply";
import { rateableMessageId } from "@/lib/support-bot/autoreply-rules";
import { botText } from "@/lib/telegram/bot-text";

export const maxDuration = 60;

const LABEL = { ok: "btnOk", no: "btnNo", team: "btnTeam" } as const;

/**
 * Tombol penilaian di bawah jawaban bot (Customer Service): ✅ Sudah terbantu · ❌ Belum terselesaikan ·
 * 👤 Bicara dengan tim. Body: { messageId, kind }. Hanya jawaban bot terakhir di tiket terbuka milik outlet
 * ini yang bisa dinilai (sekali). Pilihan dicatat sebagai pesan outlet, lalu bot menindaklanjuti:
 * ok → terima kasih + tiket selesai, no → naik satu tingkat (FAQ → AI → staf), team → staf.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const kind = body.kind === "ok" || body.kind === "no" || body.kind === "team" ? (body.kind as keyof typeof LABEL) : null;
    if (!kind || typeof body.messageId !== "string") return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });

    const [thread] = await db
      .select({ id: supportThreads.id, outletId: supportThreads.outletId, status: supportThreads.status, lang: outlets.preferredLang })
      .from(supportThreads)
      .innerJoin(outlets, eq(outlets.id, supportThreads.outletId))
      .where(eq(supportThreads.id, id))
      .limit(1);
    if (!thread || thread.outletId !== session.outletId) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const msgs = await db
      .select({ id: supportMessages.id, sender: supportMessages.sender, senderName: supportMessages.senderName })
      .from(supportMessages)
      .where(eq(supportMessages.threadId, id))
      .orderBy(asc(supportMessages.createdAt));
    if (rateableMessageId(msgs, thread.status) !== body.messageId) return NextResponse.json({ error: "Jawaban ini sudah dinilai." }, { status: 409 });

    const now = new Date().toISOString();
    const [message] = await db
      .insert(supportMessages)
      .values({ threadId: id, sender: "outlet", senderName: session.name, body: botText(thread.lang, LABEL[kind]) })
      .returning();
    await db.update(supportThreads).set({ lastMessageAt: now, outletLastReadAt: now }).where(eq(supportThreads.id, id));

    after(() => autoReplySupportThread(id, { feedback: kind }));
    return NextResponse.json(message);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
