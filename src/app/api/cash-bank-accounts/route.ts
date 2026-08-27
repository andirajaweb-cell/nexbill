import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { cashBankAccounts, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Includes the linked account's `code` so callers can match a specific system
    // account (e.g. PPOB saldo = code "1151") without depending on its display
    // name, which is now owner-renameable via /api/deposit-balance-channels.
    const rows = await db
      .select({
        id: cashBankAccounts.id,
        outletId: cashBankAccounts.outletId,
        name: cashBankAccounts.name,
        type: cashBankAccounts.type,
        accountId: cashBankAccounts.accountId,
        isDefault: cashBankAccounts.isDefault,
        code: accounts.code,
      })
      .from(cashBankAccounts)
      .leftJoin(accounts, eq(cashBankAccounts.accountId, accounts.id))
      .where(eq(cashBankAccounts.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
