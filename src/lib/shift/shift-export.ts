import PDFDocument from "pdfkit";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildReportMeta, rupiah } from "@/lib/reports/meta";
import { denominationLabel } from "./denominations";
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
}

function drawTable(doc: PDFKit.PDFDocument, startY: number, cols: Col[], rows: (string | number)[][], footer?: (string | number)[]): number {
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
      const text = typeof cell === "number" ? rupiah(cell) : String(cell ?? "");
      doc.text(text, x, y, { width: c.width, align: c.align ?? "left" });
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
      const text = typeof cell === "number" ? rupiah(cell) : String(cell ?? "");
      doc.text(text, x, y, { width: c.width, align: c.align ?? "left" });
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
export async function buildShiftClosingPdf(detail: NonNullable<Awaited<ReturnType<typeof getShiftDetail>>>): Promise<Buffer> {
  const { shift, cashCounts, balanceChecks } = detail;
  const [staff] = await db.select().from(staffUsers).where(eq(staffUsers.id, shift.staffUserId)).limit(1);
  const meta = await buildReportMeta(shift.outletId, "Berita Acara Tutup Kasir (Shift Closing Report)", shift.openedAt, shift.closedAt ?? undefined);

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
    ["Kasir", staff?.name ?? shift.staffUserId],
    ["Dibuka", new Date(shift.openedAt).toLocaleString("id-ID")],
    ["Ditutup", shift.closedAt ? new Date(shift.closedAt).toLocaleString("id-ID") : "-"],
  ];
  const infoRight = [
    ["Modal Awal", rupiah(shift.openingCash)],
    ["Status", shift.status === "closed" ? "Ditutup" : "Berjalan"],
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

  doc.font("Helvetica-Bold").fontSize(11).text("Rincian Hitung Fisik Kas (Per Pecahan)", PAGE_MARGIN, y);
  y = doc.y + 4;
  const cashCols: Col[] = [
    { label: "Pecahan", width: 150 },
    { label: "Jumlah Lembar/Keping", width: 150, align: "right" },
    { label: "Subtotal", width: 155, align: "right" },
  ];
  const cashRows = cashCounts
    .sort((a, b) => b.denomination - a.denomination)
    .map((c) => [denominationLabel(c.denomination), c.qty, c.subtotal]);
  const totalActualCash = cashCounts.reduce((s, c) => s + c.subtotal, 0);
  y = drawTable(doc, y, cashCols, cashRows, ["Total Kas Fisik (Aktual)", "", totalActualCash]);

  y += 4;
  doc.font("Helvetica-Bold").fontSize(11).text("Rekonsiliasi Kas Tunai", PAGE_MARGIN, y);
  y = doc.y + 4;
  doc.font("Helvetica").fontSize(9);
  const cashSummary: [string, number | null][] = [
    ["Modal Awal", shift.openingCash],
    ["Ekspektasi Kas (Modal + Masuk − Keluar)", shift.expectedCash],
    ["Kas Aktual (Hasil Hitung Fisik)", shift.actualCash],
    ["Selisih", shift.variance],
  ];
  for (const [label, value] of cashSummary) {
    const isVariance = label === "Selisih";
    doc.font(isVariance ? "Helvetica-Bold" : "Helvetica");
    if (isVariance && value != null) {
      doc.fillColor(Math.abs(value) < 1 ? "#059669" : value < 0 ? "#dc2626" : "#d97706");
    }
    doc.text(`${label}: ${value != null ? rupiah(value) : "-"}`, PAGE_MARGIN, y);
    doc.fillColor("#000");
    y = doc.y + 2;
  }

  if (balanceChecks.length) {
    y += 8;
    doc.font("Helvetica-Bold").fontSize(11).text("Verifikasi Saldo Channel Non-Tunai", PAGE_MARGIN, y);
    y = doc.y + 4;
    const balCols: Col[] = [
      { label: "Channel", width: 160 },
      { label: "Ekspektasi", width: 130, align: "right" },
      { label: "Aktual (Input Kasir)", width: 105, align: "right" },
      { label: "Selisih", width: 60, align: "right" },
    ];
    const balRows = balanceChecks.map((b) => [b.label, b.expectedBalance, b.actualBalance, b.variance]);
    y = drawTable(doc, y, balCols, balRows, ["Total Selisih Non-Tunai", "", "", shift.nonCashVarianceTotal ?? 0]);
  }

  if (shift.notes) {
    y += 4;
    doc.font("Helvetica-Bold").fontSize(10).text("Catatan:", PAGE_MARGIN, y);
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
  doc.text("Dihitung dan diserahkan oleh (Kasir):", PAGE_MARGIN, y, { width: sigColWidth });
  doc.text("Diverifikasi oleh (Manager/Owner):", PAGE_MARGIN + sigColWidth + 20, y, { width: sigColWidth });
  y += 55;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + sigColWidth, y).strokeColor("#333").stroke();
  doc.moveTo(PAGE_MARGIN + sigColWidth + 20, y).lineTo(PAGE_MARGIN + sigColWidth * 2 + 20, y).strokeColor("#333").stroke();
  y += 4;
  doc.text(`( ${staff?.name ?? "........................."} )`, PAGE_MARGIN, y, { width: sigColWidth, align: "center" });
  doc.text("( ......................................... )", PAGE_MARGIN + sigColWidth + 20, y, { width: sigColWidth, align: "center" });

  return finalize(doc);
}
