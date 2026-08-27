import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { units } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveUnits, slugifyUnitCode } from "@/lib/inventory/units";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await getActiveUnits(session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Upsert: pass `id` to edit (label/isActive/sortOrder only — `code` is
 * permanent once created, since it's what's stored on products.unit and
 * recipeIngredients.unit forever). Omit `id` to create a new unit — the code
 * is auto-derived from the label and de-duped against existing codes for
 * this outlet. Mirrors the payment-methods upsert pattern.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengatur satuan." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.label?.trim()) return NextResponse.json({ error: "Nama satuan wajib diisi." }, { status: 400 });

    if (body.id) {
      const [existing] = await db.select().from(units).where(eq(units.id, body.id)).limit(1);
      if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Satuan tidak ditemukan." }, { status: 404 });
      const [updated] = await db
        .update(units)
        .set({
          label: body.label.trim(),
          isActive: body.isActive ?? existing.isActive,
          sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : existing.sortOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(units.id, body.id))
        .returning();
      return NextResponse.json(updated);
    }

    const siblings = await db.select().from(units).where(eq(units.outletId, session.outletId));
    const existingCodes = new Set(siblings.map((u) => u.code));
    let code = slugifyUnitCode(body.label);
    let suffix = 2;
    while (existingCodes.has(code)) {
      code = `${slugifyUnitCode(body.label)}_${suffix}`;
      suffix++;
    }
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), -1);

    const [created] = await db
      .insert(units)
      .values({
        outletId: session.outletId,
        code,
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
