import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Toggle a ticket's status (open/resolved) from the platform-admin inbox. Body: { status }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (body.status !== "open" && body.status !== "resolved") {
      return NextResponse.json({ error: "status harus 'open' atau 'resolved'." }, { status: 400 });
    }
    const [row] = await db.update(supportThreads).set({ status: body.status }).where(eq(supportThreads.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
