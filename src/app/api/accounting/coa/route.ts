import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { invalidateAccountCache } from "@/lib/accounting/coa";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(accounts).where(eq(accounts.outletId, session.outletId)).orderBy(accounts.code);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Creates a new account — superuser/accountant only (manage_coa). Normal balance is auto-derived from type unless explicitly overridden. outletId always comes from the caller's own session, never from the request body, so a staff member can never write an account into another outlet's chart. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Chart of Accounts." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name || !body.type) {
      return NextResponse.json({ error: "code, name, dan type wajib diisi." }, { status: 400 });
    }
    const [dup] = await db.select().from(accounts).where(and(eq(accounts.code, body.code), eq(accounts.outletId, session.outletId))).limit(1);
    if (dup) {
      return NextResponse.json({ error: `Kode akun ${body.code} sudah dipakai.` }, { status: 400 });
    }

    const normalBalance = body.normalBalance ?? (body.type === "asset" || body.type === "expense" ? "debit" : "credit");
    const [row] = await db
      .insert(accounts)
      .values({
        outletId: session.outletId,
        code: body.code,
        name: body.name,
        type: body.type,
        normalBalance,
        parentId: body.parentId ?? null,
        isPostingAllowed: body.isPostingAllowed ?? true,
        costCenter: body.costCenter ?? null,
        taxCode: body.taxCode ?? null,
        isSystemAccount: false,
      })
      .returning();
    invalidateAccountCache(session.outletId);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
