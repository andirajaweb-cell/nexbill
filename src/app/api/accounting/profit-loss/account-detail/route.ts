import { NextRequest, NextResponse } from "next/server";
import { getAccountLedgerDetail } from "@/lib/accounting/reports";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * P&L drill-down: given the same accountId shown in a Laba Rugi row, returns every journal line
 * that rolled up into that row's balance for the same period — lets an owner audit a total (e.g.
 * "Rental PS 3: Rp593.750") down to the exact orders/journal entries behind it, instead of just
 * trusting an aggregate number. See getAccountLedgerDetail's own doc comment for the Header
 * (recursive descendant) and void-entry-inclusion behavior.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const accountId = req.nextUrl.searchParams.get("accountId");
    if (!accountId) return NextResponse.json({ error: "accountId wajib diisi." }, { status: 400 });
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;

    const includeCancelled = req.nextUrl.searchParams.get("includeCancelled") === "1";
    const lines = await getAccountLedgerDetail(session.outletId, accountId, from, to, includeCancelled);
    return NextResponse.json({ lines });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
