import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformWaTemplates } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { DEFAULT_WA_TEMPLATES } from "@/lib/leads/wa-template";

/**
 * Pasang template bawaan yang BELUM ada (dicocokkan dari tahap + judul, tanpa beda huruf besar/kecil).
 * Template yang sudah diedit/dihapus admin tidak disentuh — kalau judulnya diganti, bawaan dengan
 * judul lama akan dipasang lagi sebagai template baru (itu disengaja: tombolnya eksplisit).
 */
export async function POST() {
  try {
    const session = await requirePlatformAdmin();
    const existing = await db.select({ stage: platformWaTemplates.stage, title: platformWaTemplates.title }).from(platformWaTemplates);
    const have = new Set(existing.map((r) => `${r.stage}|${r.title.trim().toLowerCase()}`));
    const toInsert = DEFAULT_WA_TEMPLATES.filter((t) => !have.has(`${t.stage}|${t.title.trim().toLowerCase()}`));
    if (toInsert.length) {
      await db.insert(platformWaTemplates).values(toInsert.map((t) => ({ ...t, isActive: true, createdBy: session.sub })));
    }
    return NextResponse.json({ inserted: toInsert.length });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
