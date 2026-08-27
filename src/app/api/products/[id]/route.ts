import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRow(products, id, "Produk tidak ditemukan.");
    const body = await req.json();
    // outletId is intentionally never accepted from the body — a product can't be reassigned
    // to a different outlet through this route.
    delete body.outletId;
    const [row] = await db.update(products).set(body).where(eq(products.id, id)).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
