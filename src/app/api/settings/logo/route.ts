import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "branding");
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — a logo, not a photo
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

/** Stores the company logo (used on exported Excel/PDF report letterheads) to public/uploads/branding and returns its URL — caller then PATCHes it onto outlets.logoUrl via /api/settings/outlet. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah pengaturan." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logo maksimal 2MB." }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".png";
    if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Format logo tidak didukung (gunakan PNG/JPG/WEBP/SVG)." }, { status: 400 });

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({ url: `/uploads/branding/${filename}` });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
