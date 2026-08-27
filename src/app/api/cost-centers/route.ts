import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { costCenters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(costCenters).where(eq(costCenters.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat cost center." }, { status: 403 });
    }
    const { name, code } = await req.json();
    if (!name) return NextResponse.json({ error: "name wajib diisi." }, { status: 400 });
    const [row] = await db.insert(costCenters).values({ outletId: session.outletId, name, code }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
