import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { templateLangFor } from "@/lib/accounting/historical-import-columns";
import { buildOpeningBalanceWorkbook } from "@/lib/accounting/opening-balance-sheet";
import { canMigrateOpeningBalance, loadOutletAccounts } from "@/lib/accounting/opening-balance-access";

/** Template Excel Saldo Awal berisi semua akun postable outlet sesi (Accounting › Migrasi Data). */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canMigrateOpeningBalance(session.role)) {
      return NextResponse.json({ error: "Template Saldo Awal khusus Owner/Superuser." }, { status: 403 });
    }
    const lang = templateLangFor(req.nextUrl.searchParams.get("lang") ?? "id");
    const accounts = await loadOutletAccounts(session.outletId, lang);
    const buffer = buildOpeningBalanceWorkbook(accounts, lang);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${lang === "id" ? "template-saldo-awal.xlsx" : "opening-balance-template.xlsx"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
