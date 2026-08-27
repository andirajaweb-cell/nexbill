import * as XLSX from "xlsx";
import { ReportMeta, rupiah } from "./meta";
import { flattenTrialBalanceTree, TrialBalanceRow } from "@/lib/accounting/reports";
import { CashFlowResult } from "@/lib/accounting/cashflow";

/** Letterhead rows shared by every exported report sheet: company name, address, report title, period, generated-at. Excel embedding of the actual logo image isn't supported by the community `xlsx` (SheetJS) build used here — the PDF export carries the visual logo instead. */
function letterheadRows(meta: ReportMeta): (string | number)[][] {
  const rows: (string | number)[][] = [
    [meta.companyName],
  ];
  if (meta.companyAddress) rows.push([meta.companyAddress]);
  rows.push([meta.reportTitle]);
  rows.push([`Periode: ${meta.periodLabel}`]);
  rows.push([`Dicetak: ${meta.generatedAtLabel}`]);
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
  const tree = flattenTrialBalanceTree(rawRows, showZero);
  const header = ["Kode", "Akun", "Debit", "Kredit", "Saldo"];
  const dataRows = tree.map((r) => [
    r.code,
    `${"    ".repeat(r.depth)}${r.name}${!r.isPostingAllowed ? " (Header)" : ""}`,
    r.debit || "",
    r.credit || "",
    r.balance || "",
  ]);
  const totalDebit = tree.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.debit, 0);
  const totalCredit = tree.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.credit, 0);
  const footer = ["", "Total", totalDebit, totalCredit, Math.abs(totalDebit - totalCredit) < 1 ? "Balance" : "TIDAK BALANCE"];

  const sheetData = [...letterheadRows(meta), header, ...dataRows, footer];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([header, ...dataRows], 5);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Neraca Saldo");
  return finalize(wb);
}

export function buildProfitLossXlsx(meta: ReportMeta, pl: any): Buffer {
  const header = ["Akun", "Jumlah"];
  const revRows = pl.revenue.filter((r: any) => r.balance !== 0).map((r: any) => [r.name, r.balance]);
  const expRows = pl.expense.filter((r: any) => r.balance !== 0).map((r: any) => [r.name, r.balance]);
  const sheetData = [
    ...letterheadRows(meta),
    ["Pendapatan"],
    header,
    ...revRows,
    ["Total Pendapatan", pl.totalRevenue],
    [],
    ["Beban"],
    header,
    ...expRows,
    ["Total Beban", pl.totalExpense],
    [],
    ["Laba Kotor", pl.grossProfit],
    ["Laba Bersih", pl.netProfit],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([header, ...revRows, ...expRows], 2);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Laba Rugi");
  return finalize(wb);
}

export function buildBalanceSheetXlsx(meta: ReportMeta, bs: any): Buffer {
  const header = ["Akun", "Jumlah"];
  const assetRows = bs.assets.filter((r: any) => r.balance !== 0).map((r: any) => [r.name, r.balance]);
  const liabRows = bs.liabilities.filter((r: any) => r.balance !== 0).map((r: any) => [r.name, r.balance]);
  const equityRows = bs.equity.filter((r: any) => r.balance !== 0).map((r: any) => [r.name, r.balance]);
  const sheetData = [
    ...letterheadRows(meta),
    ["Aset"],
    header,
    ...assetRows,
    ["Total Aset", bs.totalAssets],
    [],
    ["Liabilitas"],
    header,
    ...liabRows,
    ["Total Liabilitas", bs.totalLiabilities],
    [],
    ["Ekuitas"],
    header,
    ...equityRows,
    ["Laba Berjalan (belum ditutup)", bs.currentPeriodNetProfit],
    ["Total Liabilitas + Ekuitas", bs.totalLiabilities + bs.totalEquityWithRetainedEarnings],
    [],
    ["Status", bs.balances ? "Neraca Balance" : "TIDAK BALANCE — periksa jurnal"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([header, ...assetRows, ...liabRows, ...equityRows], 2);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Neraca");
  return finalize(wb);
}

export function buildCashFlowXlsx(meta: ReportMeta, cf: CashFlowResult): Buffer {
  const inHeader = ["Kategori", "Jumlah"];
  const inRows = cf.inByCategory.map((r) => [r.category, r.amount]);
  const outRows = cf.outByCategory.map((r) => [r.category, r.amount]);
  const dayHeader = ["Tanggal", "Kas Masuk", "Kas Keluar", "Bersih"];
  const dayRows = cf.byDay.map((d) => [new Date(d.date).toLocaleDateString("id-ID"), d.in, d.out, d.net]);
  const sheetData = [
    ...letterheadRows(meta),
    ["Ringkasan"],
    ["Kas Masuk", cf.totalIn],
    ["Kas Keluar", cf.totalOut],
    ["Arus Kas Bersih", cf.netCashFlow],
    [],
    ["Rincian Kas Masuk"],
    inHeader,
    ...inRows,
    [],
    ["Rincian Kas Keluar"],
    inHeader,
    ...outRows,
    [],
    ["Arus Kas Harian"],
    dayHeader,
    ...dayRows,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = autoWidth([dayHeader, ...dayRows, inHeader, ...inRows, ...outRows], 4);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Arus Kas");
  return finalize(wb);
}
