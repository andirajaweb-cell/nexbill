import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformAnnouncements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Toggle isActive (the kill switch) or edit title/message — never deleted outright while it might still be referenced by a staff member's notificationReads row, so history stays coherent. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["title", "message", "imageUrl", "severity", "showAsPopup", "isActive"]) {
      if (body[key] !== undefined) values[key] = body[key];
    }
    const [row] = await db.update(platformAnnouncements).set(values).where(eq(platformAnnouncements.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Pengumuman tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    await db.delete(platformAnnouncements).where(eq(platformAnnouncements.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
