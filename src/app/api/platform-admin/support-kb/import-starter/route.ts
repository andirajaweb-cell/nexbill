import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportKbAnswers } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { clearSavedAnswerCache } from "@/lib/support-bot/knowledge";
import { STARTER_ANSWERS } from "@/lib/support-bot/starter-answers";
import { starterKeyOf, starterTag } from "@/lib/support-bot/starter-tags";
import { isMissingTable } from "@/lib/telegram/support-service";

/**
 * Impor Jawaban Bot bawaan ke daftar (support_kb_answers) supaya bisa diubah/dinonaktifkan admin.
 * Hanya yang belum pernah diimpor (berdasarkan tag starter:<key>) — aman ditekan berulang kali.
 */
export async function POST() {
  try {
    const session = await requirePlatformAdmin();
    const existing = await db.select({ tags: supportKbAnswers.tags }).from(supportKbAnswers);
    const have = new Set(existing.map((r) => starterKeyOf(r.tags)).filter((k): k is string => !!k));
    const rows = STARTER_ANSWERS.filter((a) => !have.has(a.key)).map((a) => ({
      question: a.question,
      answer: a.answer,
      tags: starterTag(a.key, a.topic),
      createdBy: `${session.name} (impor bawaan)`,
    }));
    if (rows.length) await db.insert(supportKbAnswers).values(rows);
    clearSavedAnswerCache();
    return NextResponse.json({ inserted: rows.length, total: STARTER_ANSWERS.length });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (isMissingTable(err)) return NextResponse.json({ error: "Jalankan migrasi 0037_telegram_support_bot.sql dulu." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
