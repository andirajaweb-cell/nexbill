import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { uploadToSupabaseStorage } from "@/lib/storage/supabase-storage";
import { BUCKET_FOTO_MARKETPLACE } from "@/lib/marketplace/photos";

/*
 * Batas 4 MB, bukan 5 MB seperti unggahan lain: Vercel menolak body di atas ~4,5 MB sebelum rute ini
 * sempat berjalan, dan pesan penolakannya tidak bisa kita terjemahkan. Layar Marketplace sudah
 * mengecilkan foto kamera (maks. 1600 px, JPEG) sebelum mengunggah, jadi dalam praktik ukurannya
 * jauh di bawah ini.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const TIPE_DIIZINKAN: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

/**
 * Menyimpan satu foto barang Marketplace ke Supabase Storage (bucket "marketplace", publik) dan
 * mengembalikan URL-nya. Foto baru melekat ke barang saat barang dipasang — rute ini sendiri tidak
 * menyentuh basis data. Nama berkas diawali ID outlet supaya berkas milik tiap outlet mudah dilacak.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin memasang barang di Marketplace." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Foto maksimal 4 MB." }, { status: 400 });

    const ext = TIPE_DIIZINKAN[file.type];
    if (!ext) return NextResponse.json({ error: "Format foto tidak didukung (gunakan JPG, PNG, atau WEBP)." }, { status: 400 });

    const filename = `${session.outletId}/${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToSupabaseStorage(BUCKET_FOTO_MARKETPLACE, filename, buffer, file.type);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
