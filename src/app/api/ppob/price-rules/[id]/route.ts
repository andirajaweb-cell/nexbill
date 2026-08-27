import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { ppobPriceRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_ppob")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus aturan harga PPOB." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(ppobPriceRules).where(eq(ppobPriceRules.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Aturan harga tidak ditemukan." }, { status: 404 });
    await db.delete(ppobPriceRules).where(eq(ppobPriceRules.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
