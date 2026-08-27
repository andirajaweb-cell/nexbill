import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedChartOfAccounts, ensureDepositBalanceChannelsSeeded } from "@/lib/accounting/coa";
import { ensureDefaultAccountMappings } from "@/lib/accounting/account-mapping";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

async function seedOutlet(outletId: string) {
  await seedChartOfAccounts(outletId);
  await ensureDefaultAccountMappings(outletId);
  await ensureDepositBalanceChannelsSeeded(outletId);
}

/**
 * Resolves the "current" outlet for the whole app. Every dashboard page calls this
 * on mount and passes the returned id to its own outletId-scoped fetches.
 *
 * SECURITY: this used to trust a plain, non-httpOnly `selected_outlet_id` cookie
 * that anyone could set to any outlet id via POST /api/outlets/select with zero
 * auth check — meaning any visitor could point their whole browser session at any
 * other tenant's data (every page in the app would then read/write that outlet).
 * With no cookie set, it fell back to "the first outlet row in the entire shared
 * database", so a fresh login with no cookie could land on a random other tenant's
 * outlet by default. This is now the single authoritative source: the outlet baked
 * into the signed session JWT, which cannot be forged or picked by the client.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const [row] = await db.select().from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    if (!row) return NextResponse.json({ error: "Outlet untuk akun ini tidak ditemukan." }, { status: 404 });
    await seedOutlet(row.id); // idempotent — cheap no-op once seeded
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
