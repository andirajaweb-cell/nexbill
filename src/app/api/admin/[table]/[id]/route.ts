import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq, getTableColumns } from "drizzle-orm";
import { ADMIN_TABLES, hiddenColumnsFor } from "@/lib/admin/tables";
import { getSession, requireRole } from "@/lib/auth/session";
import { products, recipes } from "@/db/schema";
import { describeError } from "@/lib/api/error";

const ADMIN_ROLES = ["superuser"];

function authError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "Role kamu tidak punya akses Admin Data (khusus Superuser)." }, { status: 403 });
  return null;
}

/** Verifies row `id` in table `key` belongs to the caller's outlet before any mutation.
 *  Returns the existing row on success, or null (caller should respond 404) otherwise. */
async function findOwnedRow(key: string, id: string, outletId: string): Promise<Record<string, unknown> | null> {
  const def = ADMIN_TABLES[key];
  if (!def) return null;
  const cols = getTableColumns(def.table);

  if (key === "outlets") {
    if (id !== outletId) return null;
    const [row] = await db.select().from(def.table).where(eq(cols.id, id)).limit(1);
    return row ?? null;
  }
  if (key === "recipes") {
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
    if (!row) return null;
    const [product] = await db.select({ outletId: products.outletId }).from(products).where(eq(products.id, row.productId)).limit(1);
    return product && product.outletId === outletId ? row : null;
  }
  const [row] = await db.select().from(def.table).where(eq(cols.id, id)).limit(1);
  if (!row) return null;
  if ("outletId" in cols && row.outletId !== outletId) return null;
  return row;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const { table: key, id } = await params;
  try {
    await requireRole(ADMIN_ROLES);
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const def = ADMIN_TABLES[key];
    if (!def) return NextResponse.json({ error: "Tabel tidak dikenal." }, { status: 404 });

    // Same 404 whether the row doesn't exist or belongs to another outlet — don't leak
    // which is which to a caller probing IDs across tenants.
    const owned = await findOwnedRow(key, id, session.outletId);
    if (!owned) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const hidden = hiddenColumnsFor(key);
    const cols = getTableColumns(def.table);
    const values: Record<string, unknown> = {};
    for (const colKey of Object.keys(cols)) {
      if (hidden.includes(colKey)) continue;
      if (body[colKey] !== undefined) values[colKey] = body[colKey];
    }
    if ("updatedAt" in cols) values.updatedAt = new Date().toISOString();

    const updated = (await db.update(def.table).set(values).where(eq(cols.id, id)).returning()) as Record<string, unknown>[];
    if (!updated[0]) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Soft-deletes (flips isActive false) when the table has that column, so historical rows referencing it (orders, sessions, journals) don't dangle. Otherwise attempts a real DELETE and surfaces the FK error plainly if something still references it. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const { table: key, id } = await params;
  try {
    await requireRole(ADMIN_ROLES);
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const def = ADMIN_TABLES[key];
    if (!def) return NextResponse.json({ error: "Tabel tidak dikenal." }, { status: 404 });

    const owned = await findOwnedRow(key, id, session.outletId);
    if (!owned) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    const cols = getTableColumns(def.table);

    if (def.softDeleteColumn) {
      const softDeleted = (await db.update(def.table).set({ [def.softDeleteColumn]: false }).where(eq(cols.id, id)).returning()) as Record<string, unknown>[];
      if (!softDeleted[0]) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ ok: true, softDeleted: true, row: softDeleted[0] });
    }

    await db.delete(def.table).where(eq(cols.id, id));
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
