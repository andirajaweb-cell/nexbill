import PDFDocument from "pdfkit";
import { db } from "@/db/client";
import { staffUsers, outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildReportMeta } from "@/lib/reports/meta";
import { denominationLabel } from "./denominations";
import { formatMoney, currencyForCountry, type OutletCurrency } from "@/lib/currency/format";
import { formatDateTime, type DateFormatStyle } from "@/lib/format/date";
import { translate, type LangCode } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-shift";
import type { getShiftDetail } from "./shift";

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function finalize(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

interface Col {
  label: string;
  width: number;
  align?: "left" | "right";
  /** How to render a numeric cell in this column — "currency" (default) applies the outlet's
   * money format (e.g. "Rp10.000"); "plain" renders the raw number with no currency symbol, for
   * counts like "how many Rp50.000 notes" which are a quantity, not an amount of money. Getting
   * this wrong is exactly how a note count ended up printing as "Rp63" instead of "63". */
  format?: "currency" | "plain";
}

function formatCell(cell: string | number, col: Col, currency: OutletCurrency): string {
  if (typeof cell !== "number") return String(cell ?? "");
  return col.format === "plain" ? cell.toLocaleString(currency.locale) : formatMoney(cell, currency);
}

function drawTable(doc: PDFKit.PDFDocument, startY: number, cols: Col[], rows: (string | number)[][], currency: OutletCurrency, footer?: (string | number)[]): number {
  let y = startY;
  const rowHeight = 15;
  doc.font("Helvetica-Bold").fontSize(9);
  let x = PAGE_MARGIN;
  for (const c of cols) {
    doc.text(c.label, x, y, { width: c.width, align: c.align ?? "left" });
    x += c.width;
  }
  y += rowHeight;
  doc.moveTo(PAGE_MARGIN, y - 2).lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 2).strokeColor("#999").stroke();

  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    x = PAGE_MARGIN;
    row.forEach((cell, i) => {
      const c = cols[i];
      doc.text(formatCell(cell, c, currency), x, y, { width: c.width, align: c.align ?? "left" });
      x += c.width;
    });
    y += rowHeight;
  }

  if (footer) {
    y += 3;
    doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor("#333").stroke();
    y += 4;
    doc.font("Helvetica-Bold").fontSize(9);
    x = PAGE_MARGIN;
    footer.forEach((cell, i) => {
      const c = cols[i];
      doc.text(formatCell(cell, c, currency), x, y, { width: c.width, align: c.align ?? "left" });
      x += c.width;
    });
    y += rowHeight;
  }

  return y + 8;
}

/**
 * "Berita Acara Tutup Kasir" — the formal, signable closing report: full
 * denomination breakdown, cash reconciliation, non-cash channel checks, and
 * blank signature lines for the cashier + a verifying manager/owner. Meant
 * to be printed and physically signed as durable evidence of the count,
 * which is the point — a signed paper trail is much harder to dispute or
 * fabricate after the fact than a number in a database alone.
 */
export async function buildShiftClosingPdf(detail: NonNullable<Awaited<ReturnType<typeof getShiftDetail>>>, lang: LangCode = "id"): Promise<Buffer> {
  const { shift, cashCounts, balanceChecks, incomeByMethod, ppobCashIn, ppobCashOut, cashDropTotal, cashTransferIn, cashTransferOut } = detail;
  const t = (key: string, fallback: string) => translate(lang, key, fallback);
  const [staff] = await db.select().from(staffUsers).where(eq(staffUsers.id, shift.staffUserId)).limit(1);
  const [outlet] = await db.select({ outletCountry: outlets.outletCountry, dateFormat: outlets.dateFormat }).from(outlets).where(eq(outlets.id, shift.outletId)).limit(1);
  const currency = currencyForCountry(outlet?.outletCountry);
  const dateFormat = (outlet?.dateFormat ?? "dmy") as DateFormatStyle;
  const rupiah = (n: number) => formatMoney(n, currency);
  const meta = await buildReportMeta(shift.outletId, t("shift.pdf.title", "Berita Acara Tutup Kasir (Shift Closing Report)"), shift.openedAt, shift.closedAt ?? undefined);

  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
  let y = PAGE_MARGIN;
  let textX = PAGE_MARGIN;
  if (meta.logoAbsPath) {
    try {
      doc.image(meta.logoAbsPath, PAGE_MARGIN, y, { fit: [50, 50] });
      textX = PAGE_MARGIN + 62;
    } catch {
      // corrupt/unreadable logo — render without it
    }
  }
  doc.font("Helvetica-Bold").fontSize(14).text(meta.companyName, textX, y, { width: CONTENT_WIDTH - (textX - PAGE_MARGIN) });
  if (meta.companyAddress) doc.font("Helvetica").fontSize(9).fillColor("#555").text(meta.companyAddress, textX, doc.y);
  doc.fillColor("#000");
  y = Math.max(doc.y, y + 50) + 10;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor("#ccc").stroke();
  y += 12;
  doc.font("Helvetica-Bold").fontSize(13).text(meta.reportTitle, PAGE_MARGIN, y);
  y = doc.y + 10;

  doc.font("Helvetica").fontSize(9);
  const infoLeft = [
    [t("shift.pdf.cashier", "Kasir"), staff?.name ?? shift.staffUserId],
    [t("shift.pdf.opened", "Dibuka"), formatDateTime(shift.openedAt, dateFormat)],
    [t("shift.pdf.closed", "Ditutup"), shift.closedAt ? formatDateTime(shift.closedAt, dateFormat) : "-"],
  ];
  const infoRight = [
    [t("shift.pdf.openingCash", "Modal Awal"), rupiah(shift.openingCash)],
    [t("shift.pdf.status", "Status"), shift.status === "closed" ? t("shift.pdf.statusClosed", "Ditutup") : t("shift.pdf.statusRunning", "Berjalan")],
  ];
  let iy = y;
  for (const [label, value] of infoLeft) {
    doc.font("Helvetica-Bold").text(`${label}:`, PAGE_MARGIN, iy, { continued: true, width: 100 });
    doc.font("Helvetica").text(` ${value}`);
    iy = doc.y;
  }
  iy = y;
  for (const [label, value] of infoRight) {
    doc.font("Helvetica-Bold").text(`${label}:`, PAGE_MARGIN + 280, iy, { continued: true, width: 100 });
    doc.font("Helvetica").text(` ${value}`);
    iy = doc.y;
  }
  y = Math.max(y + infoLeft.length * 13, iy) + 12;

  doc.font("Helvetica-Bold").fontSize(11).text(t("shift.pdf.cashDetailHeading", "Rincian Hitung Fisik Kas (Per Pecahan)"), PAGE_MARGIN, y);
  y = doc.y + 4;
  const cashCols: Col[] = [
    { label: t("shift.pdf.colDenomination", "Pecahan"), width: 150 },
    { label: t("shift.pdf.colSheetCount", "Jumlah Lembar/Keping"), width: 150, align: "right", format: "plain" },
    { label: t("shift.pdf.colSubtotal", "Subtotal"), width: 155, align: "right" },
  ];
  const cashRows = cashCounts
    .sort((a, b) => b.denomination - a.denomination)
    .map((c) => [denominationLabel(c.denomination, currency), c.qty, c.subtotal]);
  const totalActualCash = cashCounts.reduce((s, c) => s + c.subtotal, 0);
  y = drawTable(doc, y, cashCols, cashRows, currency, [t("shift.pdf.totalPhysicalCash", "Total Kas Fisik (Aktual)"), "", totalActualCash]);

  y += 4;
  doc.font("Helvetica-Bold").fontSize(11).text(t("shift.pdf.reconciliationHeading", "Rekonsiliasi Kas Tunai"), PAGE_MARGIN, y);
  y = doc.y + 4;
  doc.font("Helvetica").fontSize(9);
  const varianceLabel = t("shift.pdf.variance", "Selisih");
  const cashSummary: [string, number | null][] = [
    [t("shift.pdf.openingCash", "Modal Awal"), shift.openingCash],
    [t("shift.pdf.expectedCashFormula", "Ekspektasi Kas (Modal + Masuk − Keluar)"), shift.expectedCash],
    [t("shift.pdf.actualCashResult", "Kas Aktual (Hasil Hitung Fisik)"), shift.actualCash],
    [varianceLabel, shift.variance],
  ];
  for (const [label, value] of cashSummary) {
    const isVariance = label === varianceLabel;
    doc.font(isVariance ? "Helvetica-Bold" : "Helvetica");
    if (isVariance && value != null) {
      doc.fillColor(Math.abs(value) < 1 ? "#059669" : value < 0 ? "#dc2626" : "#d97706");
    }
    doc.text(`${label}: ${value != null ? rupiah(value) : "-"}`, PAGE_MARGIN, y);
    doc.fillColor("#000");
    y = doc.y + 2;
  }

  if ((ppobCashIn ?? 0) > 0 || (ppobCashOut ?? 0) > 0) {
    doc.font("Helvetica").fontSize(8).fillColor("#555").text(
      `${t("shift.pdf.ppobCashNote", "Termasuk dari transaksi PPOB (tarik tunai/top up/bayar tagihan dll):")} ${t("shift.ppobCashInShort", "masuk")} ${rupiah(ppobCashIn ?? 0)}, ${t("shift.ppobCashOutShort", "keluar")} ${rupiah(ppobCashOut ?? 0)}`,
      PAGE_MARGIN,
      y,
      { width: CONTENT_WIDTH }
    );
    doc.fillColor("#000");
    y = doc.y + 2;
  }
  if ((cashDropTotal ?? 0) > 0) {
    doc.font("Helvetica").fontSize(8).fillColor("#555").text(
      `${t("shift.pdf.cashDropNote", "Termasuk Setoran Kas (dipindahkan ke Kas Besar/Prive/dll) sebesar")} ${rupiah(cashDropTotal ?? 0)}`,
      PAGE_MARGIN,
      y,
      { width: CONTENT_WIDTH }
    );
    doc.fillColor("#000");
    y = doc.y + 2;
  }
  if ((cashTransferIn ?? 0) > 0 || (cashTransferOut ?? 0) > 0) {
    doc.font("Helvetica").fontSize(8).fillColor("#555").text(
      `${t("shift.pdf.cashTransferNote", "Termasuk Pindah Kas:")} ${t("shift.ppobCashInShort", "masuk")} ${rupiah(cashTransferIn ?? 0)}, ${t("shift.ppobCashOutShort", "keluar")} ${rupiah(cashTransferOut ?? 0)}`,
      PAGE_MARGIN,
      y,
      { width: CONTENT_WIDTH }
    );
    doc.fillColor("#000");
    y = doc.y + 4;
  }

  if (incomeByMethod.length) {
    y += 8;
    doc.font("Helvetica-Bold").fontSize(11).text(t("shift.pdf.incomeByMethodHeading", "Rincian Uang Masuk per Metode Pembayaran"), PAGE_MARGIN, y);
    y = doc.y + 4;
    const incomeCols: Col[] = [
      { label: t("shift.pdf.colMethod", "Metode"), width: 310 },
      { label: t("shift.pdf.colAmount", "Jumlah"), width: 145, align: "right" },
    ];
    const incomeRows = incomeByMethod.map((r) => [r.label, r.amount]);
    const totalIncome = incomeByMethod.reduce((s, r) => s + r.amount, 0);
    y = drawTable(doc, y, incomeCols, incomeRows, currency, [t("shift.pdf.totalIncome", "Total Uang Masuk"), totalIncome]);
  }

  if (balanceChecks.length) {
    y += 8;
    doc.font("Helvetica-Bold").fontSize(11).text(t("shift.pdf.nonCashHeading", "Verifikasi Saldo Channel Non-Tunai"), PAGE_MARGIN, y);
    y = doc.y + 4;
    const balCols: Col[] = [
      { label: t("shift.pdf.colChannel", "Channel"), width: 160 },
      { label: t("shift.pdf.colExpected", "Ekspektasi"), width: 130, align: "right" },
      { label: t("shift.pdf.colActualInput", "Aktual (Input Kasir)"), width: 105, align: "right" },
      { label: t("shift.pdf.variance", "Selisih"), width: 60, align: "right" },
    ];
    const balRows = balanceChecks.map((b) => [b.label, b.expectedBalance, b.actualBalance, b.variance]);
    y = drawTable(doc, y, balCols, balRows, currency, [t("shift.pdf.totalNonCashVariance", "Total Selisih Non-Tunai"), "", "", shift.nonCashVarianceTotal ?? 0]);
  }

  if (shift.notes) {
    y += 4;
    doc.font("Helvetica-Bold").fontSize(10).text(t("shift.pdf.notes", "Catatan:"), PAGE_MARGIN, y);
    y = doc.y + 2;
    doc.font("Helvetica").fontSize(9).text(shift.notes, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
    y = doc.y;
  }

  y += 30;
  if (y > 700) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  const sigColWidth = CONTENT_WIDTH / 2 - 10;
  doc.font("Helvetica").fontSize(9);
  doc.text(t("shift.pdf.signOffCashier", "Dihitung dan diserahkan oleh (Kasir):"), PAGE_MARGIN, y, { width: sigColWidth });
  doc.text(t("shift.pdf.signOffManager", "Diverifikasi oleh (Manager/Owner):"), PAGE_MARGIN + sigColWidth + 20, y, { width: sigColWidth });
  y += 55;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + sigColWidth, y).strokeColor("#333").stroke();
  doc.moveTo(PAGE_MARGIN + sigColWidth + 20, y).lineTo(PAGE_MARGIN + sigColWidth * 2 + 20, y).strokeColor("#333").stroke();
  y += 4;
  doc.text(`( ${staff?.name ?? "........................."} )`, PAGE_MARGIN, y, { width: sigColWidth, align: "center" });
  doc.text("( ......................................... )", PAGE_MARGIN + sigColWidth + 20, y, { width: sigColWidth, align: "center" });

  return finalize(doc);
}
