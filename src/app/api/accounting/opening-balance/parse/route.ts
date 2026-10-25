import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { templateLangFor } from "@/lib/accounting/historical-import-columns";
import { parseOpeningBalanceWorkbook } from "@/lib/accounting/opening-balance-sheet";
import { canMigrateOpeningBalance, loadOutletAccounts } from "@/lib/accounting/opening-balance-access";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Baca file Excel Saldo Awal → baris untuk formulir Saldo Awal. TIDAK memposting apa pun: pemilik
 * memeriksa hasilnya di formulir lalu menekan "Posting Saldo Awal" (POST /api/accounting/opening-balance).
 * Akun dicocokkan hanya dengan Chart of Accounts outlet sesi login.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canMigrateOpeningBalance(session.role)) {
      return NextResponse.json({ error: "Impor Saldo Awal khusus Owner/Superuser." }, { status: 403 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "File Excel wajib diunggah." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File terlalu besar (maks. 5 MB)." }, { status: 400 });
    const lang = templateLangFor(String(form.get("lang") ?? "id"));
    const accounts = await loadOutletAccounts(session.outletId, lang);
    const result = parseOpeningBalanceWorkbook(Buffer.from(await file.arrayBuffer()), accounts, lang);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
