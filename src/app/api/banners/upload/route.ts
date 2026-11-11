import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";
import { bannerFileProblem } from "@/lib/booking/banner-rules";

/**
 * Upload gambar Banner Iklan (bucket "branding"). Dulu memakai endpoint logo, sehingga pesan
 * errornya "Logo maksimal 2MB" dan SVG ikut diterima. Sekarang PNG/JPG/WEBP, maksimal 3MB.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola banner." }, { status: 403 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    const problem = bannerFileProblem(file.name, file.size);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg").toLowerCase();
    const filename = `banners/${session.outletId}/${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToSupabaseStorage("branding", filename, buffer, file.type || "image/jpeg");
    return NextResponse.json({ url });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
