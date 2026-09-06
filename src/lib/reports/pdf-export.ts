import PDFDocument from "pdfkit";
import { ReportMeta } from "./meta";
import { flattenTrialBalanceTree, TrialBalanceRow } from "@/lib/accounting/reports";
import { CashFlowResult } from "@/lib/accounting/cashflow";
import { formatMoney, type OutletCurrency } from "@/lib/currency/format";
import { coaAccountNameForLang } from "@/lib/accounting/coa-data";
import { translate } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-accounting";
import "@/lib/i18n/dict-coa";
import "@/lib/i18n/dict-report-export";

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

/** Collects a pdfkit document's output stream into a single Buffer. pdfkit is stream-based (no synchronous "give me the bytes" API), so every builder below ends by piping through this. */
function finalize(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

/** Draws the shared letterhead (logo + company name/address, report title, period, generated-at) and returns the y position to start content at. */
function drawLetterhead(doc: PDFKit.PDFDocument, meta: ReportMeta): number {
  let y = PAGE_MARGIN;
  let textX = PAGE_MARGIN;
  if (meta.logoAbsPath) {
    try {
      doc.image(meta.logoAbsPath, PAGE_MARGIN, y, { fit: [50, 50] });
      textX = PAGE_MARGIN + 62;
    } catch {
      // Corrupt/unreadable logo file — render the letterhead without it rather than failing the whole report.
    }
  }
  doc.font("Helvetica-Bold").fontSize(14).text(meta.companyName, textX, y, { width: CONTENT_WIDTH - (textX - PAGE_MARGIN) });
  if (meta.companyAddress) {
    doc.font("Helvetica").fontSize(9).fillColor("#555").text(meta.companyAddress, textX, doc.y, { width: CONTENT_WIDTH - (textX - PAGE_MARGIN) });
  }
  doc.fillColor("#000");
  y = Math.max(doc.y, y + 50) + 10;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor("#ccc").stroke();
  y += 12;
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  doc.font("Helvetica-Bold").fontSize(13).text(meta.reportTitle, PAGE_MARGIN, y);
  y = doc.y + 2;
  doc.font("Helvetica").fontSize(9).fillColor("#555").text(`${t("accounting.common.periodPrefix", "Periode:")} ${meta.periodLabel}`, PAGE_MARGIN, y);
  y = doc.y;
  doc.text(`${t("report.export.printedAt", "Dicetak")}: ${meta.generatedAtLabel}`, PAGE_MARGIN, y);
  y = doc.y + 12;
  doc.fillColor("#000");
  return y;
}

interface Col { label: string; width: number; align?: "left" | "right"; }

/**
 * Minimal table renderer: draws a header row + data rows at fixed column
 * widths, auto-paginating (with a repeated header) when content runs past
 * the page — pdfkit's core has no built-in table widget, so this hand-rolls
 * the small subset needed for financial statement tables (left-aligned
 * label column, right-aligned amount columns).
 */
function drawTable(doc: PDFKit.PDFDocument, startY: number, cols: Col[], rows: (string | number)[][], opts?: { boldRows?: Set<number>; footer?: (string | number)[]; currency?: OutletCurrency }): number {
  let y = startY;
  const rowHeight = 16;
  const boldRows = opts?.boldRows ?? new Set<number>();
  const rupiah = (n: number) => formatMoney(n, opts?.currency);

  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(9);
    let x = PAGE_MARGIN;
    for (const c of cols) {
      doc.text(c.label, x, y, { width: c.width, align: c.align ?? "left" });
      x += c.width;
    }
    y += rowHeight;
    doc.moveTo(PAGE_MARGIN, y - 2).lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 2).strokeColor("#999").stroke();
  };

  const ensureSpace = () => {
    if (y > PAGE_HEIGHT - PAGE_MARGIN - rowHeight) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeader();
    }
  };

  drawHeader();
  rows.forEach((row, idx) => {
    ensureSpace();
    doc.font(boldRows.has(idx) ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    let x = PAGE_MARGIN;
    row.forEach((cell, i) => {
      const c = cols[i];
      const text = typeof cell === "number" ? rupiah(cell) : String(cell ?? "");
      doc.text(text, x, y, { width: c.width, align: c.align ?? "left" });
      x += c.width;
    });
    y += rowHeight;
  });

  if (opts?.footer) {
    ensureSpace();
    y += 4;
    doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor("#333").stroke();
    y += 4;
    doc.font("Helvetica-Bold").fontSize(9);
    let x = PAGE_MARGIN;
    opts.footer.forEach((cell, i) => {
      const c = cols[i];
      const text = typeof cell === "number" ? rupiah(cell) : String(cell ?? "");
      doc.text(text, x, y, { width: c.width, align: c.align ?? "left" });
      x += c.width;
    });
    y += rowHeight;
  }

  return y + 6;
}

function newDoc(): PDFKit.PDFDocument {
  return new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
}

export async function buildTrialBalancePdf(meta: ReportMeta, rawRows: TrialBalanceRow[], showZero: boolean): Promise<Buffer> {
  const doc = newDoc();
  let y = drawLetterhead(doc, meta);
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);

  const tree = flattenTrialBalanceTree(rawRows, showZero);
  const cols: Col[] = [
    { label: t("accounting.trialBalance.table.code", "Kode"), width: 55 },
    { label: t("accounting.trialBalance.table.account", "Akun"), width: 240 },
    { label: t("accounting.common.debit", "Debit"), width: 85, align: "right" },
    { label: t("accounting.common.credit", "Kredit"), width: 85, align: "right" },
    { label: t("accounting.trialBalance.table.balance", "Saldo"), width: 50, align: "right" },
  ];
  const boldRows = new Set<number>();
  const rows = tree.map((r, i) => {
    if (!r.isPostingAllowed) boldRows.add(i);
    return [r.code, `${"  ".repeat(r.depth)}${coaAccountNameForLang(meta.lang, r)}`, r.debit || 0, r.credit || 0, r.balance || 0];
  });
  const totalDebit = tree.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.debit, 0);
  const totalCredit = tree.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.credit, 0);
  drawTable(doc, y, cols, rows, {
    boldRows,
    currency: meta.currency,
    footer: ["", t("accounting.trialBalance.table.total", "Total"), totalDebit, totalCredit, Math.abs(totalDebit - totalCredit) < 1 ? t("accounting.common.balanceOk", "Balance ✓") : t("accounting.trialBalance.notBalanced", "TIDAK BALANCE")],
  });
  return finalize(doc);
}

export async function buildProfitLossPdf(meta: ReportMeta, pl: any): Promise<Buffer> {
  const doc = newDoc();
  let y = drawLetterhead(doc, meta);
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const rupiah = (n: number) => formatMoney(n, meta.currency);
  const cols: Col[] = [{ label: t("accounting.trialBalance.table.account", "Akun"), width: 380 }, { label: t("report.export.amountColumn", "Jumlah"), width: 135, align: "right" }];

  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.type.revenue", "Pendapatan"), PAGE_MARGIN, y);
  y = doc.y + 4;
  const revRows = pl.revenue.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  y = drawTable(doc, y, cols, revRows, { currency: meta.currency, footer: [t("report.export.totalRevenue", "Total Pendapatan"), pl.totalRevenue] });

  y += 6;
  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.type.expense", "Beban"), PAGE_MARGIN, y);
  y = doc.y + 4;
  const expRows = pl.expense.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  y = drawTable(doc, y, cols, expRows, { currency: meta.currency, footer: [t("report.export.totalExpense", "Total Beban"), pl.totalExpense] });

  y += 8;
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`${t("accounting.pl.grossProfit", "Laba Kotor")}: ${rupiah(pl.grossProfit)}`, PAGE_MARGIN, y);
  y = doc.y + 4;
  doc.text(`${t("accounting.pl.netProfit", "Laba Bersih")}: ${rupiah(pl.netProfit)}`, PAGE_MARGIN, y);

  return finalize(doc);
}

export async function buildBalanceSheetPdf(meta: ReportMeta, bs: any): Promise<Buffer> {
  const doc = newDoc();
  let y = drawLetterhead(doc, meta);
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const cols: Col[] = [{ label: t("accounting.trialBalance.table.account", "Akun"), width: 380 }, { label: t("report.export.amountColumn", "Jumlah"), width: 135, align: "right" }];

  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.bs.assetsHeading", "Aset"), PAGE_MARGIN, y);
  y = doc.y + 4;
  const assetRows = bs.assets.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]);
  y = drawTable(doc, y, cols, assetRows, { currency: meta.currency, footer: [t("accounting.bs.totalAssets", "Total Aset"), bs.totalAssets] });

  y += 6;
  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.bs.liabilitiesEquityHeading", "Liabilitas & Ekuitas"), PAGE_MARGIN, y);
  y = doc.y + 4;
  const liabEquityRows = [
    ...bs.liabilities.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]),
    ...bs.equity.filter((r: any) => r.balance !== 0).map((r: any) => [coaAccountNameForLang(meta.lang, r), r.balance]),
    [t("accounting.bs.currentPeriodProfit", "Laba Berjalan (belum ditutup)"), bs.currentPeriodNetProfit],
  ];
  y = drawTable(doc, y, cols, liabEquityRows, {
    currency: meta.currency,
    footer: [t("accounting.bs.totalLiabilitiesEquity", "Total Liabilitas + Ekuitas"), bs.totalLiabilities + bs.totalEquityWithRetainedEarnings],
  });

  y += 8;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(bs.balances ? "#059669" : "#dc2626");
  doc.text(bs.balances ? t("accounting.bs.balanced", "Neraca balance ✓") : t("accounting.bs.notBalanced", "TIDAK BALANCE — periksa jurnal"), PAGE_MARGIN, y);
  doc.fillColor("#000");

  return finalize(doc);
}

export async function buildCashFlowPdf(meta: ReportMeta, cf: CashFlowResult): Promise<Buffer> {
  const doc = newDoc();
  let y = drawLetterhead(doc, meta);
  const t = (key: string, fallback: string) => translate(meta.lang, key, fallback);
  const rupiah = (n: number) => formatMoney(n, meta.currency);
  const locale = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" }[meta.lang] ?? "id-ID";

  doc.font("Helvetica-Bold").fontSize(11).text(t("report.export.summary", "Ringkasan"), PAGE_MARGIN, y);
  y = doc.y + 4;
  doc.font("Helvetica").fontSize(9);
  doc.text(`${t("accounting.cf.cashIn", "Kas Masuk")}: ${rupiah(cf.totalIn)}`, PAGE_MARGIN, y); y = doc.y;
  doc.text(`${t("accounting.cf.cashOut", "Kas Keluar")}: ${rupiah(cf.totalOut)}`, PAGE_MARGIN, y); y = doc.y;
  doc.font("Helvetica-Bold").text(`${t("accounting.cf.netCashFlow", "Arus Kas Bersih")}: ${rupiah(cf.netCashFlow)}`, PAGE_MARGIN, y); y = doc.y + 10;

  const catCols: Col[] = [{ label: t("report.export.category", "Kategori"), width: 380 }, { label: t("report.export.amountColumn", "Jumlah"), width: 135, align: "right" }];
  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.cf.cashInDetail", "Rincian Kas Masuk"), PAGE_MARGIN, y);
  y = doc.y + 4;
  y = drawTable(doc, y, catCols, cf.inByCategory.map((r) => [r.category, r.amount]), { currency: meta.currency });

  y += 6;
  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.cf.cashOutDetail", "Rincian Kas Keluar"), PAGE_MARGIN, y);
  y = doc.y + 4;
  y = drawTable(doc, y, catCols, cf.outByCategory.map((r) => [r.category, r.amount]), { currency: meta.currency });

  y += 6;
  const dayCols: Col[] = [
    { label: t("report.export.date", "Tanggal"), width: 130 },
    { label: t("report.export.in", "Masuk"), width: 128, align: "right" },
    { label: t("report.export.out", "Keluar"), width: 128, align: "right" },
    { label: t("report.export.net", "Bersih"), width: 129, align: "right" },
  ];
  doc.font("Helvetica-Bold").fontSize(11).text(t("accounting.cf.dailyCashFlow", "Arus Kas Harian"), PAGE_MARGIN, y);
  y = doc.y + 4;
  drawTable(doc, y, dayCols, cf.byDay.map((d) => [new Date(d.date).toLocaleDateString(locale), d.in, d.out, d.net]), { currency: meta.currency });

  return finalize(doc);
}
