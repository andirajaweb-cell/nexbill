import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalDurationPresets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRentalDurationPresets } from "@/lib/rental/duration-presets";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await getRentalDurationPresets(session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Upsert: pass `id` to edit (minutes/label/isActive/sortOrder). Omit `id` to create a new preset.
 * Mirrors the Satuan (/api/units) upsert pattern — see its doc comment.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengatur durasi rental." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.label?.trim()) return NextResponse.json({ error: "Nama durasi wajib diisi." }, { status: 400 });
    const minutes = Number(body.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return NextResponse.json({ error: "Durasi (menit) harus lebih dari 0." }, { status: 400 });

    if (body.id) {
      const [existing] = await db.select().from(rentalDurationPresets).where(eq(rentalDurationPresets.id, body.id)).limit(1);
      if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Preset durasi tidak ditemukan." }, { status: 404 });
      const [updated] = await db
        .update(rentalDurationPresets)
        .set({
          minutes,
          label: body.label.trim(),
          isActive: body.isActive ?? existing.isActive,
          sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : existing.sortOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rentalDurationPresets.id, body.id))
        .returning();
      return NextResponse.json(updated);
    }

    const siblings = await db.select().from(rentalDurationPresets).where(eq(rentalDurationPresets.outletId, session.outletId));
    if (siblings.some((p) => p.minutes === minutes)) {
      return NextResponse.json({ error: `Sudah ada preset dengan durasi ${minutes} menit.` }, { status: 400 });
    }
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), -1);

    const [created] = await db
      .insert(rentalDurationPresets)
      .values({
        outletId: session.outletId,
        minutes,
        label: body.label.trim(),
        isActive: body.isActive ?? true,
        sortOrder: maxOrder + 1,
      })
      .returning();
    return NextResponse.json(created);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
