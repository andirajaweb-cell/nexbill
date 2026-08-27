import { NextRequest, NextResponse } from "next/server";
import { computeTrialBalance, computeProfitLoss, computeBalanceSheet } from "@/lib/accounting/reports";
import { computeCashFlow } from "@/lib/accounting/cashflow";
import { buildReportMeta } from "@/lib/reports/meta";
import { buildTrialBalanceXlsx, buildProfitLossXlsx, buildBalanceSheetXlsx, buildCashFlowXlsx } from "@/lib/reports/xlsx-export";
import { buildTrialBalancePdf, buildProfitLossPdf, buildBalanceSheetPdf, buildCashFlowPdf } from "@/lib/reports/pdf-export";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

type ReportType = "trial-balance" | "profit-loss" | "balance-sheet" | "cash-flow";

const REPORT_TITLE: Record<ReportType, string> = {
  "trial-balance": "Neraca Saldo",
  "profit-loss": "Laporan Laba Rugi",
  "balance-sheet": "Neraca (Balance Sheet)",
  "cash-flow": "Laporan Arus Kas",
};

const FILE_PREFIX: Record<ReportType, string> = {
  "trial-balance": "neraca-saldo",
  "profit-loss": "laba-rugi",
  "balance-sheet": "neraca",
  "cash-flow": "arus-kas",
};

/**
 * Unified export endpoint for all four financial reports, both formats:
 * GET ?outletId=&type=trial-balance|profit-loss|balance-sheet|cash-flow&format=xlsx|pdf&from=&to=&showZero=
 * For balance-sheet, `to` is used as the as-of date (matching the UI's DownloadButtons call, which
 * passes the as-of date through the `to` prop since balance sheet is a point-in-time report, not a range).
 * outletId always comes from the caller's own session — never trusted from the query string, so
 * a logged-in staff member can only ever export their own outlet's reports.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const type = req.nextUrl.searchParams.get("type") as ReportType | null;
    const format = req.nextUrl.searchParams.get("format");
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    const showZero = req.nextUrl.searchParams.get("showZero") === "1";

    if (!type || !REPORT_TITLE[type]) return NextResponse.json({ error: "type tidak valid." }, { status: 400 });
    if (format !== "xlsx" && format !== "pdf") return NextResponse.json({ error: "format harus xlsx atau pdf." }, { status: 400 });

    const periodFrom = type === "balance-sheet" ? undefined : from;
    const meta = await buildReportMeta(outletId, REPORT_TITLE[type], periodFrom, to);

    let buffer: Buffer;
    if (type === "trial-balance") {
      const rows = await computeTrialBalance(outletId, from, to);
      buffer = format === "xlsx" ? buildTrialBalanceXlsx(meta, rows, showZero) : await buildTrialBalancePdf(meta, rows, showZero);
    } else if (type === "profit-loss") {
      const pl = await computeProfitLoss(outletId, from, to);
      buffer = format === "xlsx" ? buildProfitLossXlsx(meta, pl) : await buildProfitLossPdf(meta, pl);
    } else if (type === "balance-sheet") {
      const bs = await computeBalanceSheet(outletId, to);
      buffer = format === "xlsx" ? buildBalanceSheetXlsx(meta, bs) : await buildBalanceSheetPdf(meta, bs);
    } else {
      const cf = await computeCashFlow(outletId, from, to);
      buffer = format === "xlsx" ? buildCashFlowXlsx(meta, cf) : await buildCashFlowPdf(meta, cf);
    }

    const ext = format === "xlsx" ? "xlsx" : "pdf";
    const contentType = format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    const dateTag = new Date().toISOString().slice(0, 10);
    const filename = `${FILE_PREFIX[type]}-${dateTag}.${ext}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
