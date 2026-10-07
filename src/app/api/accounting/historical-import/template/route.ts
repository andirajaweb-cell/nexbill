import { NextRequest, NextResponse } from "next/server";
import { generateHistoricalImportTemplate, type HistoricalCategory } from "@/lib/accounting/historical-import";
import { templateLangFor, type TemplateLang } from "@/lib/accounting/historical-import-columns";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

const FILE_NAME: Record<HistoricalCategory, Record<TemplateLang, string>> = {
  penjualan: { id: "template-impor-penjualan-historis.xlsx", en: "historical-sales-import-template.xlsx" },
  pembelian: { id: "template-impor-pembelian-historis.xlsx", en: "historical-purchases-import-template.xlsx" },
  pendapatan_lain: { id: "template-impor-pendapatan-lain-historis.xlsx", en: "historical-other-income-import-template.xlsx" },
  pengeluaran: { id: "template-impor-pengeluaran-historis.xlsx", en: "historical-expenses-import-template.xlsx" },
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const category = req.nextUrl.searchParams.get("category") as HistoricalCategory | null;
    if (!category || !FILE_NAME[category]) return NextResponse.json({ error: "Kategori tidak dikenali." }, { status: 400 });

    // ?lang= is the dashboard language; Indonesian gets the Indonesian template, every other
    // language the English one. No param (old links) keeps the Indonesian template.
    const lang = templateLangFor(req.nextUrl.searchParams.get("lang") ?? "id");
    const buffer = await generateHistoricalImportTemplate(session.outletId, category, lang);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${FILE_NAME[category][lang]}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
