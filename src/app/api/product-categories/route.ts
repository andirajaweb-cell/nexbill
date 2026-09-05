import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveProductCategories, slugifyCategoryCode } from "@/lib/inventory/categories";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await getActiveProductCategories(session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Upsert: pass `id` to edit (label/isActive/sortOrder only — `code` is permanent once created,
 * since it's what's stored on products.category forever). Omit `id` to create a new category —
 * the code is auto-derived from the label and de-duped against existing codes for this outlet.
 * Mirrors the Satuan (units) upsert pattern in /api/units.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengatur kategori produk." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.label?.trim()) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });

    if (body.id) {
      const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, body.id)).limit(1);
      if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
      const [updated] = await db
        .update(productCategories)
        .set({
          label: body.label.trim(),
          isActive: body.isActive ?? existing.isActive,
          sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : existing.sortOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(productCategories.id, body.id))
        .returning();
      return NextResponse.json(updated);
    }

    const siblings = await db.select().from(productCategories).where(eq(productCategories.outletId, session.outletId));
    const existingCodes = new Set(siblings.map((c) => c.code));
    let code = slugifyCategoryCode(body.label);
    let suffix = 2;
    while (existingCodes.has(code)) {
      code = `${slugifyCategoryCode(body.label)}_${suffix}`;
      suffix++;
    }
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), -1);

    const [created] = await db
      .insert(productCategories)
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
