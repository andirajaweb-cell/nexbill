import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — receipts/photos, no need for more
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf"]);

/** Stores a bukti pembayaran/nota attachment to Supabase Storage (bucket "expenses") and returns
 * its public URL to save on the expense row. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File maksimal 5MB." }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".bin";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format file tidak didukung (gunakan JPG/PNG/WEBP/PDF)." }, { status: 400 });

    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToSupabaseStorage("expenses", filename, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ url });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
