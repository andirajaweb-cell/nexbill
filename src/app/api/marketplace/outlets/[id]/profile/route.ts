import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { profilSatuOutlet, ulasanTerbaru } from "@/lib/marketplace/trust-service";

/**
 * Profil kepercayaan sebuah outlet LAIN, dibuka dari kartu etalase / kesepakatan. Hanya data
 * reputasi Marketplace — tidak ada alamat, kontak, rekening, atau data operasional outlet itu.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const [o] = await db.select({ name: outlets.name, city: outlets.city }).from(outlets).where(eq(outlets.id, id)).limit(1);
    if (!o) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    const [profil, ulasan] = await Promise.all([profilSatuOutlet(id), ulasanTerbaru(id, 10)]);
    return NextResponse.json({ name: o.name, city: o.city, profil, ulasan });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
