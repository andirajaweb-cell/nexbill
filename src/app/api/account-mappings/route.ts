import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accountMappings, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { invalidateMappingCache } from "@/lib/accounting/account-mapping";
import { describeError } from "@/lib/api/error";

/** Lists every mapping row for the caller's own outlet, joined with the target account's code/name so the UI doesn't need a second round-trip. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db
      .select({
        id: accountMappings.id,
        outletId: accountMappings.outletId,
        module: accountMappings.module,
        transactionKey: accountMappings.transactionKey,
        accountId: accountMappings.accountId,
        label: accountMappings.label,
        isActive: accountMappings.isActive,
        accountCode: accounts.code,
        accountName: accounts.name,
      })
      .from(accountMappings)
      .innerJoin(accounts, eq(accountMappings.accountId, accounts.id))
      .where(eq(accountMappings.outletId, session.outletId))
      .orderBy(accountMappings.module, accountMappings.transactionKey);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Creates a new mapping row (or updates the existing one for the same module+transactionKey, so the UI can just "save" without worrying about duplicates). outletId always comes from the caller's own session — never trusted from the request body — and the target accountId is verified to belong to that same outlet, so a staff member can never point their mapping at another outlet's account or write into another outlet's mapping table. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Account Mapping." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.module || !body.transactionKey || !body.accountId) {
      return NextResponse.json({ error: "module, transactionKey, dan accountId wajib diisi." }, { status: 400 });
    }
    const transactionKey = String(body.transactionKey).toLowerCase();

    const [targetAccount] = await db.select().from(accounts).where(eq(accounts.id, body.accountId)).limit(1);
    if (!targetAccount || targetAccount.outletId !== session.outletId) {
      return NextResponse.json({ error: "Akun tujuan tidak ditemukan di outlet ini." }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(accountMappings)
      .where(and(eq(accountMappings.outletId, session.outletId), eq(accountMappings.module, body.module), eq(accountMappings.transactionKey, transactionKey)))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(accountMappings)
        .set({ accountId: body.accountId, label: body.label ?? existing.label, isActive: body.isActive ?? true, updatedAt: new Date().toISOString() })
        .where(eq(accountMappings.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(accountMappings)
        .values({ outletId: session.outletId, module: body.module, transactionKey, accountId: body.accountId, label: body.label ?? null, isActive: body.isActive ?? true })
        .returning();
    }
    invalidateMappingCache(session.outletId);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
