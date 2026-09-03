import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — ID photos, no need for more
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Stores a KTP/Kartu Pelajar/KTP Orang Tua photo to Supabase Storage (bucket "home-rental") and
 * returns its public URL to save on the rental row. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File maksimal 5MB." }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format file tidak didukung (gunakan JPG/PNG/WEBP)." }, { status: 400 });

    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToSupabaseStorage("home-rental", filename, buffer, file.type || "image/*");

    return NextResponse.json({ url });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
