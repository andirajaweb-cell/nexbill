import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformWaTemplates } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { parseWaTemplateInput } from "@/lib/leads/wa-template";

const unauth = (err: unknown) => err instanceof Error && err.message === "UNAUTHENTICATED";

/** Ubah sebagian field template (tahap, unsur, judul, isi, urutan, aktif). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const parsed = parseWaTemplateInput(await req.json(), true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (Object.keys(parsed.value).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    const [row] = await db
      .update(platformWaTemplates)
      .set({ ...parsed.value, updatedAt: new Date().toISOString() })
      .where(eq(platformWaTemplates.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (unauth(err)) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [row] = await db.delete(platformWaTemplates).where(eq(platformWaTemplates.id, id)).returning({ id: platformWaTemplates.id });
    if (!row) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (unauth(err)) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
