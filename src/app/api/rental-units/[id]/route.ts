import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/** Edit a unit's name/console/TV/rate/note, or archive it (isActive: false) — soft-delete only, see schema comment on rentalUnits.isActive. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json();

    const [existing] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Unit tidak ditemukan." }, { status: 404 });

    if (body.isActive === false && existing.status === "occupied") {
      return NextResponse.json({ error: "Unit sedang dipakai — hentikan sesi dulu sebelum menonaktifkan unit." }, { status: 400 });
    }
    if (body.status === "maintenance" && existing.status === "occupied") {
      return NextResponse.json({ error: "Unit sedang dipakai — hentikan sesi dulu sebelum menandai maintenance." }, { status: 400 });
    }

    const { id: _ignoreId, outletId: _ignoreOutlet, createdAt: _ignoreCreated, ...rest } = body;
    const [row] = await db.update(rentalUnits).set(rest).where(eq(rentalUnits.id, id)).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
