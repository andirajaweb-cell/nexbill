import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { supportKbAnswers } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { clearSavedAnswerCache } from "@/lib/support-bot/knowledge";

/** Ubah / nonaktifkan / hapus satu Jawaban Bot. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const set: Partial<typeof supportKbAnswers.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (typeof body.question === "string" && body.question.trim()) set.question = body.question.trim().slice(0, 1000);
    if (typeof body.answer === "string" && body.answer.trim()) set.answer = body.answer.trim().slice(0, 6000);
    if (typeof body.tags === "string") set.tags = body.tags.trim() ? body.tags.trim().slice(0, 200) : null;
    if (typeof body.isActive === "boolean") set.isActive = body.isActive;
    const [row] = await db.update(supportKbAnswers).set(set).where(eq(supportKbAnswers.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Jawaban tidak ditemukan." }, { status: 404 });
    clearSavedAnswerCache();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    await db.delete(supportKbAnswers).where(eq(supportKbAnswers.id, id));
    clearSavedAnswerCache();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
