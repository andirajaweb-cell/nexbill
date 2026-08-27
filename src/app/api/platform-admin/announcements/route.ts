import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformAnnouncements, outlets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/**
 * Broadcast announcements the platform team sends down to outlet/merchant staff — see the
 * doc-comment on `platformAnnouncements` in src/db/schema.ts for the popup/notification design.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db.select().from(platformAnnouncements).orderBy(desc(platformAnnouncements.createdAt));
    const allOutlets = await db.select({ id: outlets.id, name: outlets.name }).from(outlets);
    const outletName = new Map(allOutlets.map((o) => [o.id, o.name]));
    return NextResponse.json({
      announcements: rows.map((r) => ({ ...r, outletName: r.outletId ? outletName.get(r.outletId) ?? "(outlet dihapus)" : null })),
      outlets: allOutlets,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json();
    if (!body.title?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: "Judul dan isi pesan wajib diisi." }, { status: 400 });
    }
    if (!["info", "warning", "critical"].includes(body.severity)) {
      return NextResponse.json({ error: "Severity tidak valid." }, { status: 400 });
    }
    if (body.outletId) {
      const [row] = await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.id, body.outletId)).limit(1);
      if (!row) return NextResponse.json({ error: "Outlet tujuan tidak ditemukan." }, { status: 400 });
    }
    const [created] = await db
      .insert(platformAnnouncements)
      .values({
        title: body.title.trim(),
        message: body.message.trim(),
        imageUrl: body.imageUrl || null,
        severity: body.severity,
        outletId: body.outletId || null,
        showAsPopup: body.showAsPopup ?? true,
        isActive: true,
        createdBy: session.sub,
      })
      .returning();
    return NextResponse.json(created);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
