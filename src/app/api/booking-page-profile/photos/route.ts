import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { outletPublicPhotos } from "@/db/schema";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";
import { MAX_PUBLIC_PHOTO_BYTES, MAX_PUBLIC_PHOTOS } from "@/lib/booking/public-profile-core";
import { requireBookingProfileEditor } from "@/lib/booking/profile-access";

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Foto outlet untuk halaman booking. POST multipart { file, caption? } · PATCH { id, caption?, sortOrder? } · DELETE ?id= */
export async function POST(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(outletPublicPhotos).where(eq(outletPublicPhotos.outletId, session.outletId));
    if (n >= MAX_PUBLIC_PHOTOS) return NextResponse.json({ error: `Maksimal ${MAX_PUBLIC_PHOTOS} foto — hapus salah satu dulu.` }, { status: 400 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_PUBLIC_PHOTO_BYTES) return NextResponse.json({ error: "Foto maksimal 3MB." }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format foto tidak didukung (gunakan JPG/PNG/WEBP)." }, { status: 400 });
    const url = await uploadToSupabaseStorage("branding", `outlet-photos/${crypto.randomUUID()}${ext}`, Buffer.from(await file.arrayBuffer()), file.type || "image/jpeg");
    const caption = String(form.get("caption") ?? "").trim().slice(0, 80) || null;
    const [row] = await db.insert(outletPublicPhotos).values({ outletId: session.outletId, url, caption, sortOrder: n }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const body = await req.json().catch(() => ({}));
    const set: Partial<typeof outletPublicPhotos.$inferInsert> = {};
    if (typeof body?.caption === "string") set.caption = body.caption.trim().slice(0, 80) || null;
    if (Number.isInteger(body?.sortOrder)) set.sortOrder = body.sortOrder;
    if (!Object.keys(set).length) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    const [row] = await db.update(outletPublicPhotos).set(set).where(and(eq(outletPublicPhotos.id, String(body?.id ?? "")), eq(outletPublicPhotos.outletId, session.outletId))).returning();
    if (!row) return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const id = req.nextUrl.searchParams.get("id") ?? "";
    const rows = await db.delete(outletPublicPhotos).where(and(eq(outletPublicPhotos.id, id), eq(outletPublicPhotos.outletId, session.outletId))).returning();
    if (!rows.length) return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
