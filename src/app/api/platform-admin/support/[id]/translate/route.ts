import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads, outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { translateReply } from "@/lib/ai/translate";
import type { LangCode } from "@/lib/i18n/registry";

/**
 * Translates a draft reply (written in Bahasa Indonesia) into the ticket's outlet's declared
 * preferredLang (Settings > Business & Tax) — see outlets.preferredLang in schema.ts. Body:
 * { body: string }. Returns { translated, targetLang, targetLabel } so the UI can show which
 * language it translated into before the admin sends it. Does NOT send/save the message — the
 * admin reviews/edits the translated text first, then POSTs it to .../messages like any reply.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json({ error: "Teks draft wajib diisi." }, { status: 400 });
    }

    const [row] = await db
      .select({ preferredLang: outlets.preferredLang })
      .from(supportThreads)
      .innerJoin(outlets, eq(supportThreads.outletId, outlets.id))
      .where(eq(supportThreads.id, id))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });

    const targetLang = (row.preferredLang || "id") as LangCode;
    const translated = await translateReply(body.body.trim(), targetLang);
    return NextResponse.json({ translated, targetLang });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
