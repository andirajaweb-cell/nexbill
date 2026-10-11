import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { vouchers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { forbidUnless } from "@/lib/auth/require-permission";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(vouchers).where(eq(vouchers.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const denied = forbidUnless(session, ["manage_pricing_promo"], "Role kamu tidak punya izin membuat voucher.");
    if (denied) return denied;
    const body = await req.json();
    if (typeof body.code !== "string" || !body.code.trim()) return NextResponse.json({ error: "Kode voucher wajib diisi." }, { status: 400 });
    // Kolom sistem tidak boleh diisi dari body — terutama usedCount (pemakaian) dan id.
    const { outletId: _ignoredOutlet, id: _id, usedCount: _used, createdAt: _c, updatedAt: _u, ...rest } = body;
    const [row] = await db.insert(vouchers).values({ ...rest, outletId: session.outletId, code: body.code.trim().toUpperCase() }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
