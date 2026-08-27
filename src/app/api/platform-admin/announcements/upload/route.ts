import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "announcements");
const MAX_BYTES = 3 * 1024 * 1024; // 3MB — a compressed 16:9 banner image, not a hi-res photo
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Image upload for Pengumuman (Announcements) — 16:9 banner-style image shown in the popup modal
 * and notification list. Video is intentionally not supported here yet (see doc-comment on
 * platformAnnouncements in src/db/schema.ts) — local-filesystem storage is fine for a few-MB
 * image but not a safe pattern for video. Same local-disk + gated-by-platform-admin-session
 * pattern as /api/platform-admin/upload (etalase product photos).
 */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Gambar maksimal 3MB." }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".png";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format gambar tidak didukung (gunakan PNG/JPG/WEBP)." }, { status: 400 });

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({ url: `/uploads/announcements/${filename}` });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
