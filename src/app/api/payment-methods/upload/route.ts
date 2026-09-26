import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Uploads an outlet's static QRIS image (Pembayaran → Arahan untuk pelanggan) to the public
 * "payment-instructions" bucket and returns its URL. Public on purpose: a static QRIS is the same
 * code already printed on the counter sticker — it is meant to be seen by customers.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengatur metode pembayaran." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Gambar maksimal 3MB." }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase() || ".png";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format gambar tidak didukung (gunakan PNG/JPG/WEBP)." }, { status: 400 });

    const filename = `${session.outletId}/${crypto.randomUUID()}${ext}`;
    const url = await uploadToSupabaseStorage("payment-instructions", filename, Buffer.from(await file.arrayBuffer()), file.type || "image/png");
    return NextResponse.json({ url });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
