import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { ensureOutletSlug } from "@/lib/outlets/slug";

/**
 * Data minimal untuk tombol "Bagikan link booking" di halaman Booking: slug halaman publik
 * /book/[slug], nama outlet, dan apakah booking online sedang diterima. Link ini memang publik,
 * jadi boleh dibaca semua peran — berbeda dengan /api/settings/outlet yang memuat data sensitif.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [row] = await db
      .select({ id: outlets.id, name: outlets.name, slug: outlets.slug, acceptOnlineBooking: outlets.acceptOnlineBooking })
      .from(outlets)
      .where(eq(outlets.id, session.outletId))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    const slug = row.slug ?? (await ensureOutletSlug(row.id));
    return NextResponse.json({ slug, name: row.name, acceptOnlineBooking: row.acceptOnlineBooking });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
