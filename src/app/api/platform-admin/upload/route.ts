import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — a product photo, not a hi-res catalog shoot
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Generic image upload for platform-admin-managed content — currently just the etalase product
 * catalog (Smart Plug variants, jasa instalasi, konsol tambahan), gated by the SEPARATE
 * platform-admin auth system (requirePlatformAdmin), not outlet staff sessions. Stores to
 * Supabase Storage (bucket "platform-products"), kept as its own route so outlet staff
 * credentials can never reach it.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Foto produk maksimal 3MB." }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".png";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format foto tidak didukung (gunakan PNG/JPG/WEBP)." }, { status: 400 });

    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToSupabaseStorage("platform-products", filename, buffer, file.type || "image/*");

    return NextResponse.json({ url });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
