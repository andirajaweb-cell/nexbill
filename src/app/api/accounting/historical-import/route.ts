import { NextRequest, NextResponse } from "next/server";
import { importHistoricalRows, type HistoricalCategory } from "@/lib/accounting/historical-import";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

const CAN_MIGRATE = ["superuser", "owner"];
const VALID_CATEGORIES: HistoricalCategory[] = ["penjualan", "pembelian", "pendapatan_lain", "pengeluaran"];

/** Superuser/Owner only — bulk-injecting historical financial history is a high-trust, one-time operation, not routine day-to-day data entry. outletId always comes from the caller's own session, never the uploaded form data, so this can only ever import history into the caller's own outlet. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!CAN_MIGRATE.includes(session.role)) {
      return NextResponse.json({ error: "Role kamu tidak punya izin impor data historis (khusus Superuser/Owner)." }, { status: 403 });
    }

    const form = await req.formData();
    const category = form.get("category");
    const file = form.get("file");
    if (!category || typeof category !== "string" || !VALID_CATEGORIES.includes(category as HistoricalCategory)) {
      return NextResponse.json({ error: "Kategori tidak dikenali." }, { status: 400 });
    }
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "File Excel wajib diupload." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const summary = await importHistoricalRows(session.outletId, category as HistoricalCategory, Buffer.from(arrayBuffer), session.sub);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
