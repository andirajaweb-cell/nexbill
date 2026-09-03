import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB — covers a short screen-recording clip, not just a photo
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov"]);

/**
 * Stores an image/video attached to a support-chat reply from the platform-admin side — same
 * "support-chat" Supabase Storage bucket as the outlet-side /api/support-chat/upload (both sides'
 * attachments live in the same thread), gated separately by requirePlatformAdmin so outlet staff
 * credentials can never reach this route, matching the split already used for the plain-file
 * upload routes elsewhere in the app.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();

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
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
