import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { platformWaOutbox } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** { action: "retry" } — pesan gagal dikembalikan ke antrean. { action: "cancel" } — hapus pesan yang belum terkirim. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const { action } = await req.json().catch(() => ({ action: null }));
    if (action === "retry") {
      const [row] = await db
        .update(platformWaOutbox)
        .set({ status: "pending", error: null })
        .where(and(eq(platformWaOutbox.id, id), eq(platformWaOutbox.status, "failed")))
        .returning({ id: platformWaOutbox.id });
      if (!row) return NextResponse.json({ error: "Hanya pesan yang gagal yang bisa dikirim ulang." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (action === "cancel") {
      const [row] = await db
        .delete(platformWaOutbox)
        .where(and(eq(platformWaOutbox.id, id), inArray(platformWaOutbox.status, ["pending", "failed"])))
        .returning({ id: platformWaOutbox.id });
      if (!row) return NextResponse.json({ error: "Pesan sudah dikirim/sedang dikirim — tidak bisa dibatalkan." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
