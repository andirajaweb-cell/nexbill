import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, supportKbAnswers, supportMessages, supportThreads } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { isBotSender } from "@/lib/support-bot/autoreply-rules";
import { clearSavedAnswerCache } from "@/lib/support-bot/knowledge";
import { isMissingTable } from "@/lib/telegram/support-service";

/**
 * Jawaban Bot (Platform Admin): jawaban tim yang dipakai bot support untuk masalah berulang.
 * GET = daftar jawaban + usulan minggu ini (tiket selesai 7 hari terakhir yang dibalas manusia dan
 * belum dijadikan jawaban). POST = simpan jawaban baru.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    let answers: (typeof supportKbAnswers.$inferSelect)[] = [];
    let migration = true;
    try {
      answers = await db.select().from(supportKbAnswers).orderBy(desc(supportKbAnswers.updatedAt));
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      migration = false;
    }
    const used = new Set(answers.map((a) => a.sourceThreadId).filter(Boolean));

    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const threads = await db
      .select({ id: supportThreads.id, subject: supportThreads.subject, outletName: outlets.name, lastMessageAt: supportThreads.lastMessageAt })
      .from(supportThreads)
      .innerJoin(outlets, eq(outlets.id, supportThreads.outletId))
      .where(and(eq(supportThreads.status, "resolved"), isNotNull(supportThreads.lastMessageAt), gte(supportThreads.lastMessageAt, weekAgo)))
      .orderBy(desc(supportThreads.lastMessageAt))
      .limit(40);
    const ids = threads.map((t) => t.id).filter((id) => !used.has(id));
    const suggestions: { threadId: string; outletName: string; subject: string | null; question: string; answer: string }[] = [];
    if (ids.length > 0) {
      const msgs = await db
        .select({ threadId: supportMessages.threadId, sender: supportMessages.sender, senderName: supportMessages.senderName, body: supportMessages.body })
        .from(supportMessages)
        .where(inArray(supportMessages.threadId, ids))
        .orderBy(asc(supportMessages.createdAt));
      for (const t of threads) {
        if (!ids.includes(t.id)) continue;
        const list = msgs.filter((m) => m.threadId === t.id);
        const human = list.filter((m) => m.sender === "platform_admin" && !isBotSender(m.senderName) && m.body.trim());
        if (human.length === 0) continue;
        const question = list.find((m) => m.sender === "outlet" && m.body.trim())?.body ?? t.subject ?? "";
        suggestions.push({ threadId: t.id, outletName: t.outletName, subject: t.subject, question, answer: human.map((m) => m.body).join("\n\n") });
      }
    }
    return NextResponse.json({ migration, answers, suggestions });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!question || !answer) return NextResponse.json({ error: "Pertanyaan dan jawaban wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(supportKbAnswers)
      .values({
        question: question.slice(0, 1000),
        answer: answer.slice(0, 6000),
        tags: typeof body.tags === "string" && body.tags.trim() ? body.tags.trim().slice(0, 200) : null,
        sourceThreadId: typeof body.sourceThreadId === "string" && body.sourceThreadId ? body.sourceThreadId : null,
        createdBy: session.name,
      })
      .returning();
    clearSavedAnswerCache();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (isMissingTable(err)) return NextResponse.json({ error: "Jalankan migrasi 0037_telegram_support_bot.sql dulu." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
