import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalDurationPresets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Hard delete, no "in use" guard needed — unlike Satuan (units.code is stored as free text on
 * historical products/recipeIngredients rows), a preset's `minutes` value is copied straight onto
 * rentalSessions.plannedMinutes the moment a session starts (see StartSessionInput in
 * lib/rental/sessions.ts) and never references this row afterward, so deleting a preset can never
 * orphan or relabel any past or currently-running session.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus preset durasi." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(rentalDurationPresets).where(eq(rentalDurationPresets.id, id)).limit(1);
    if (!existing) return NextResponse.json({ ok: true }); // already gone
    if (existing.outletId !== session.outletId) return NextResponse.json({ error: "Preset durasi tidak ditemukan." }, { status: 404 });

    await db.delete(rentalDurationPresets).where(eq(rentalDurationPresets.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
