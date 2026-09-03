import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB — covers a short screen-recording clip, not just a photo
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov"]);

/**
 * Stores an image/video attached to a support-chat message (outlet side) to Supabase Storage
 * (bucket "support-chat") and returns its public URL — real, persistent object storage, unlike
 * the app's older public/uploads/... local-filesystem upload routes, which don't survive Vercel's
 * serverless runtime. See /api/platform-admin/support/upload for the mirrored admin-side route
 * (kept separate so outlet staff credentials can never touch the platform-admin path).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File maksimal 15MB." }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".bin";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: "Format file tidak didukung (gunakan gambar JPG/PNG/WEBP/GIF atau video MP4/WEBM/MOV)." }, { status: 400 });
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || (ext === ".mp4" || ext === ".webm" || ext === ".mov" ? "video/mp4" : "image/*");
    const url = await uploadToSupabaseStorage("support-chat", filename, buffer, contentType);

    return NextResponse.json({ url, type: contentType, name: file.name });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
