import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { ppobPriceRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensurePpobPriceRules } from "@/lib/ppob/price-rules";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here.
    await ensurePpobPriceRules(session.outletId);
    const rows = await db.select().from(ppobPriceRules).where(eq(ppobPriceRules.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Upsert: pass `id` to update an existing rule, omit it to create a new one — same convention as most admin-editable master data in this app. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_ppob")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengatur harga PPOB." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.category || !body.product) return NextResponse.json({ error: "Kategori dan produk wajib diisi." }, { status: 400 });

    if (body.id) {
      const [existing] = await db.select().from(ppobPriceRules).where(eq(ppobPriceRules.id, body.id)).limit(1);
      // 404 (not 403) if it's missing OR belongs to a different outlet — never trust body.outletId for scoping.
      if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Aturan harga tidak ditemukan." }, { status: 404 });
      const [updated] = await db
        .update(ppobPriceRules)
        .set({
          category: body.category,
          product: body.product,
          providerFee: Number(body.providerFee ?? 0),
          defaultMargin: Number(body.defaultMargin ?? 0),
          notes: body.notes ?? null,
          isActive: body.isActive ?? true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ppobPriceRules.id, body.id))
        .returning();
      if (!updated) return NextResponse.json({ error: "Aturan harga tidak ditemukan." }, { status: 404 });
      return NextResponse.json(updated);
    }

    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const [created] = await db
      .insert(ppobPriceRules)
      .values({
        outletId: session.outletId,
        category: body.category,
        product: body.product,
        providerFee: Number(body.providerFee ?? 0),
        defaultMargin: Number(body.defaultMargin ?? 0),
        notes: body.notes ?? null,
      })
      .returning();
    return NextResponse.json(created);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
