import { NextRequest, NextResponse } from "next/server";
import { generateHistoricalImportTemplate, type HistoricalCategory } from "@/lib/accounting/historical-import";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

const FILE_NAME: Record<HistoricalCategory, string> = {
  penjualan: "template-impor-penjualan-historis.xlsx",
  pembelian: "template-impor-pembelian-historis.xlsx",
  pendapatan_lain: "template-impor-pendapatan-lain-historis.xlsx",
  pengeluaran: "template-impor-pengeluaran-historis.xlsx",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const category = req.nextUrl.searchParams.get("category") as HistoricalCategory | null;
    if (!category || !FILE_NAME[category]) return NextResponse.json({ error: "Kategori tidak dikenali." }, { status: 400 });

    const buffer = generateHistoricalImportTemplate(category);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${FILE_NAME[category]}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
