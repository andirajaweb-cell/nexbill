import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { helpMenu } from "@/lib/support-bot/knowledge";
import { STARTER_TOPICS } from "@/lib/support-bot/starter-answers";

/**
 * "Pertanyaan populer" di Customer Service: topik → pertanyaan dari Jawaban Bot (yang aktif). Memilih
 * pertanyaan membuat tiket yang langsung dijawab bot tingkat 1. Jawaban berbahasa Indonesia, jadi daftar
 * hanya dikirim untuk outlet berbahasa Indonesia.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [o] = await db.select({ lang: outlets.preferredLang }).from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    if ((o?.lang ?? "id") !== "id") return NextResponse.json({ topics: [] });
    const items = await helpMenu();
    const topics = STARTER_TOPICS.map((topic) => ({ topic, items: items.filter((x) => x.topic === topic).map((x) => ({ key: x.key, question: x.question })) })).filter((t) => t.items.length > 0);
    return NextResponse.json({ topics });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
