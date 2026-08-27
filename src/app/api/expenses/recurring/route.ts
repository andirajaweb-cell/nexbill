import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { recurringExpenseTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(recurringExpenseTemplates).where(eq(recurringExpenseTemplates.outletId, session.outletId)).orderBy(desc(recurringExpenseTemplates.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Create a recurring template — listrik, internet, sewa, gaji, dst. First `nextDueDate` is provided by the caller (when the next bill is actually due). */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat recurring expense." }, { status: 403 });
    }
    const body = await req.json();
    const { name, accountId, category, amount, nextDueDate } = body;
    if (!name || !accountId || !category || !amount || !nextDueDate) {
      return NextResponse.json({ error: "name, accountId, category, amount, nextDueDate wajib diisi." }, { status: 400 });
    }
    const [row] = await db.insert(recurringExpenseTemplates).values({ ...body, outletId: session.outletId }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
