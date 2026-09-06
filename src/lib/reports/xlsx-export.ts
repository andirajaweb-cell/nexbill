import * as XLSX from "xlsx";
import { ReportMeta } from "./meta";
import { flattenTrialBalanceTree, TrialBalanceRow } from "@/lib/accounting/reports";
import { CashFlowResult } from "@/lib/accounting/cashflow";
import { coaAccountNameForLang } from "@/lib/accounting/coa-data";
import { translate } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-accounting";
import "@/lib/i18n/dict-coa";
import "@/lib/i18n/dict-report-export";

/** Letterhead rows shared by every exported report sheet: company name, address, report title, period, generated-at. Excel embedding of the actual logo image isn't supported by the community `xlsx` (SheetJS) build used here — the PDF export carries the visual logo instead. */
function letterheadRows(meta: ReportMeta): (string | number)[][] {
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const rows: (string | number)[][] = [
    [meta.companyName],
  ];
  if (meta.companyAddress) rows.push([meta.companyAddress]);
  rows.push([meta.reportTitle]);
  rows.push([`${t("accounting.common.periodPrefix", "Periode:")} ${meta.periodLabel}`]);
  rows.push([`${t("report.export.printedAt", "Dicetak")}: ${meta.generatedAtLabel}`]);
  rows.push([]);
  return rows;
}

function finalize(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function autoWidth(rows: (string | number)[][], cols: number): { wch: number }[] {
  const widths = new Array(cols).fill(8);
  for (const row of rows) {
    row.forEach((cell, i) => {
      if (i < cols) widths[i] = Math.max(widths[i], String(cell ?? "").length + 2, 10);
    });
  }
  return widths.map((w) => ({ wch: Math.min(w, 60) }));
}

export function buildTrialBalanceXlsx(meta: ReportMeta, rawRows: TrialBalanceRow[], showZero: boolean): Buffer {
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const tree = flattenTrialBalanceTree(rawRows, showZero);
  const header = [t("accounting.trialBalance.table.code", "Kode"), t("accounting.trialBalance.table.account", "Akun"), t("accounting.common.debit", "Debit"), t("accounting.common.credit", "Kredit"), t("accounting.trialBalance.table.balance", "Saldo")];
  const headerBadge = t("accounting.coa.headerBadge", "Header");
  const dataRows = tree.map((r) => [
    r.code,
    `${"    ".repeat(r.depth)}${coaAccountNameForLang(meta.lang, r)}${!r.isPostingAllowed ? ` (${headerBadge})` : ""}`,
    r.debit || "",
    r.credit || "",
    r.balance || "",
  ]);
  const totalDebit = tree.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.debit, 0);
  const totalCredit = tree.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.credit, 0);
  const footer = ["", t("accounting.trialBalance.table.total", "Total"), totalDebit, totalCredit, Math.abs(totalDebit - totalCredit) < 1 ? t("accounting.common.balanceOk", "Balance ✓") : t("accounting.trialBalance.notBalanced", "TIDAK BALANCE")];

  const sheetData = [...letterheadRows(meta), header, ...dataRows, footer];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([header, ...dataRows], 5);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, t("report.export.header.trialBalance", "Neraca Saldo").slice(0, 31));
  return finalize(wb);
}

export function buildProfitLossXlsx(meta: ReportMeta, pl: any): Buffer {
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const header = [t("accounting.trialBalance.table.account", "Akun"), t("report.export.amountColumn", "Jumlah")];
  const revRows = pl.revenue.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  const expRows = pl.expense.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  const sheetData = [
    ...letterheadRows(meta),
    [t("accounting.type.revenue", "Pendapatan")],
    header,
    ...revRows,
    [t("report.export.totalRevenue", "Total Pendapatan"), pl.totalRevenue],
    [],
    [t("accounting.type.expense", "Beban")],
    header,
    ...expRows,
    [t("report.export.totalExpense", "Total Beban"), pl.totalExpense],
    [],
    [t("accounting.pl.grossProfit", "Laba Kotor"), pl.grossProfit],
    [t("accounting.pl.netProfit", "Laba Bersih"), pl.netProfit],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([header, ...revRows, ...expRows], 2);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, t("report.export.header.profitLoss", "Laba Rugi").slice(0, 31));
  return finalize(wb);
}

export function buildBalanceSheetXlsx(meta: ReportMeta, bs: any): Buffer {
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const header = [t("accounting.trialBalance.table.account", "Akun"), t("report.export.amountColumn", "Jumlah")];
  const assetRows = bs.assets.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  const liabRows = bs.liabilities.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  const equityRows = bs.equity.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  const sheetData = [
    ...letterheadRows(meta),
    [t("accounting.bs.assetsHeading", "Aset")],
    header,
    ...assetRows,
    [t("accounting.bs.totalAssets", "Total Aset"), bs.totalAssets],
    [],
    [t("accounting.type.liability", "Liabilitas")],
    header,
    ...liabRows,
    [t("report.export.totalLiabilities", "Total Liabilitas"), bs.totalLiabilities],
    [],
    [t("accounting.type.equity", "Ekuitas")],
    header,
    ...equityRows,
    [t("accounting.bs.currentPeriodProfit", "Laba Berjalan (belum ditutup)"), bs.currentPeriodNetProfit],
    [t("accounting.bs.totalLiabilitiesEquity", "Total Liabilitas + Ekuitas"), bs.totalLiabilities + bs.totalEquityWithRetainedEarnings],
    [],
    [t("report.export.status", "Status"), bs.balances ? t("accounting.bs.balanced", "Neraca Balance") : t("accounting.bs.notBalanced", "TIDAK BALANCE — periksa jurnal")],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([header, ...assetRows, ...liabRows, ...equityRows], 2);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, t("report.export.header.balanceSheet", "Neraca").slice(0, 31));
  return finalize(wb);
}

export function buildCashFlowXlsx(meta: ReportMeta, cf: CashFlowResult): Buffer {
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const locale = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" }[meta.lang] ?? "id-ID";
  const inHeader = [t("report.export.category", "Kategori"), t("report.export.amountColumn", "Jumlah")];
  const inRows = cf.inByCategory.map((r) => [r.category, r.amount]);
  const outRows = cf.outByCategory.map((r) => [r.category, r.amount]);
  const dayHeader = [t("report.export.date", "Tanggal"), t("accounting.cf.cashIn", "Kas Masuk"), t("accounting.cf.cashOut", "Kas Keluar"), t("report.export.net", "Bersih")];
  const dayRows = cf.byDay.map((d) => [new Date(d.date).toLocaleDateString(locale), d.in, d.out, d.net]);
  const sheetData = [
    ...letterheadRows(meta),
    [t("report.export.summary", "Ringkasan")],
    [t("accounting.cf.cashIn", "Kas Masuk"), cf.totalIn],
    [t("accounting.cf.cashOut", "Kas Keluar"), cf.totalOut],
    [t("accounting.cf.netCashFlow", "Arus Kas Bersih"), cf.netCashFlow],
    [],
    [t("accounting.cf.cashInDetail", "Rincian Kas Masuk")],
    inHeader,
    ...inRows,
    [],
    [t("accounting.cf.cashOutDetail", "Rincian Kas Keluar")],
    inHeader,
    ...outRows,
    [],
    [t("accounting.cf.dailyCashFlow", "Arus Kas Harian")],
    dayHeader,
    ...dayRows,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([dayHeader, ...dayRows, inHeader, ...inRows, ...outRows], 4);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, t("report.export.header.cashFlow", "Arus Kas").slice(0, 31));
  return finalize(wb);
}
