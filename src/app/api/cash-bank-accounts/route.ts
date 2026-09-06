import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { cashBankAccounts, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";
import { computeTrialBalance } from "@/lib/accounting/reports";

export async function GET(req: NextRequest) {
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
        includeInShiftFloat: cashBankAccounts.includeInShiftFloat,
        code: accounts.code,
      })
      .from(cashBankAccounts)
      .leftJoin(accounts, eq(cashBankAccounts.accountId, accounts.id))
      .where(eq(cashBankAccounts.outletId, session.outletId));

    // Optional live balance per pool (?withBalance=1) — used by Shift's "Modal Awal" suggestion
    // and the Setoran Kas form, both of which need to show what's actually recorded in each cash
    // pool right now rather than making the cashier guess. Skipped by default since most callers
    // (e.g. dropdowns elsewhere) only need the account list, not a trial-balance computation.
    if (req.nextUrl.searchParams.get("withBalance")) {
      const tb = await computeTrialBalance(session.outletId);
      const balanceByAccountId = new Map(tb.map((r) => [r.accountId, r.balance]));
      return NextResponse.json(rows.map((r) => ({ ...r, balance: balanceByAccountId.get(r.accountId) ?? 0 })));
    }

    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
