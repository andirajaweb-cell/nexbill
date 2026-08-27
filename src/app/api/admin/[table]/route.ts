import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq, getTableColumns, inArray } from "drizzle-orm";
import type { PgTable, AnyPgColumn } from "drizzle-orm/pg-core";
import { ADMIN_TABLES, hiddenColumnsFor } from "@/lib/admin/tables";
import { getSession, requireRole } from "@/lib/auth/session";
import { products, recipes } from "@/db/schema";
import { describeError } from "@/lib/api/error";

const ADMIN_ROLES = ["superuser"];

function columnMeta(table: PgTable, hidden: string[]) {
  const cols = getTableColumns(table);
  return Object.entries(cols)
    .filter(([key]) => !hidden.includes(key))
    .map(([key, col]: [string, AnyPgColumn]) => ({
      key,
      dataType: col.dataType as string, // "string" | "number" | "boolean"
      enumValues: (col.enumValues as string[] | undefined) ?? null,
      notNull: Boolean(col.notNull),
      hasDefault: Boolean(col.hasDefault),
    }));
}

function authError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "Role kamu tidak punya akses Admin Data (khusus Superuser)." }, { status: 403 });
  return null;
}

/** Every table exposed here is scoped to the caller's own outlet — never cross-tenant.
 *  - Tables with an `outletId` column: filtered directly.
 *  - "outlets": IS the tenant row itself, filtered by `id`.
 *  - "recipes": has no outletId of its own, scoped indirectly via its product's outlet. */
async function outletProductIds(outletId: string): Promise<string[]> {
  const rows = await db.select({ id: products.id }).from(products).where(eq(products.outletId, outletId));
  return rows.map((r) => r.id);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table: key } = await params;
  try {
    await requireRole(ADMIN_ROLES);
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const def = ADMIN_TABLES[key];
    if (!def) return NextResponse.json({ error: "Tabel tidak dikenal." }, { status: 404 });

    const cols = getTableColumns(def.table);
    let rows: Record<string, unknown>[];
    if (key === "outlets") {
      rows = await db.select().from(def.table).where(eq(cols.id, session.outletId));
    } else if (key === "recipes") {
      const ids = await outletProductIds(session.outletId);
      rows = ids.length ? await db.select().from(recipes).where(inArray(recipes.productId, ids)) : [];
    } else if ("outletId" in cols) {
      rows = await db.select().from(def.table).where(eq(cols.outletId, session.outletId));
    } else {
      rows = await db.select().from(def.table);
    }

    return NextResponse.json({
      label: def.label,
      disableCreate: Boolean(def.disableCreate),
      columns: columnMeta(def.table, hiddenColumnsFor(key)),
      rows,
    });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table: key } = await params;
  try {
    await requireRole(ADMIN_ROLES);
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const def = ADMIN_TABLES[key];
    if (!def) return NextResponse.json({ error: "Tabel tidak dikenal." }, { status: 404 });
    if (def.disableCreate) return NextResponse.json({ error: "Tambah data untuk tabel ini punya alur khusus — gunakan halaman terkait, bukan Admin Data." }, { status: 400 });

    const body = await req.json();
    const hidden = hiddenColumnsFor(key);
    const cols = getTableColumns(def.table);
    const values: Record<string, unknown> = {};
    for (const colKey of Object.keys(cols)) {
      if (hidden.includes(colKey)) continue;
      if (body[colKey] !== undefined) values[colKey] = body[colKey];
    }
    if ("outletId" in cols) values.outletId = session.outletId; // never trust a client-supplied outletId

    if (key === "recipes") {
      // No outletId column here — verify the chosen product actually belongs to this outlet
      // instead, so a recipe can't be attached to another tenant's product.
      const productId = values.productId as string | undefined;
      if (!productId) return NextResponse.json({ error: "productId wajib diisi." }, { status: 400 });
      const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
      const ownedIds = await outletProductIds(session.outletId);
      if (!product || !ownedIds.includes(product.id)) {
        return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
      }
    }

    const inserted = (await db.insert(def.table).values(values).returning()) as Record<string, unknown>[];
    return NextResponse.json(inserted[0]);
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
