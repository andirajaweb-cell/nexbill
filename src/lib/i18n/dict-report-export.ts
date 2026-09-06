import { registerDict } from "./registry";

/**
 * Labels used by the standalone financial-report exporters (lib/reports/pdf-export.ts,
 * lib/reports/xlsx-export.ts, lib/reports/meta.ts) — these run server-side outside any React
 * component, so they read via translate(lang, key, fallback) rather than useDashboardLang()'s
 * `t`. Kept in a dedicated file (not dict-accounting.ts) since these strings are specific to the
 * exported document, not the on-screen Accounting page — many on-screen labels ARE reused here
 * directly by key (accounting.type.revenue, accounting.trialBalance.table.*, accounting.cf.*,
 * accounting.bs.*, accounting.common.debit/credit) so the download matches what's on screen.
 */
registerDict({
  "report.export.amountColumn": { id: "Jumlah", en: "Amount", ms: "Jumlah", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "report.export.totalRevenue": { id: "Total Pendapatan", en: "Total Revenue", ms: "Jumlah Pendapatan", th: "รายได้รวม", fil: "Kabuuang Revenue", vi: "Tổng doanh thu" },
  "report.export.totalExpense": { id: "Total Beban", en: "Total Expense", ms: "Jumlah Perbelanjaan", th: "ค่าใช้จ่ายรวม", fil: "Kabuuang Expense", vi: "Tổng chi phí" },
  "report.export.totalLiabilities": { id: "Total Liabilitas", en: "Total Liabilities", ms: "Jumlah Liabiliti", th: "หนี้สินรวม", fil: "Kabuuang Liabilities", vi: "Tổng nợ phải trả" },
  "report.export.summary": { id: "Ringkasan", en: "Summary", ms: "Ringkasan", th: "สรุป", fil: "Buod", vi: "Tóm tắt" },
  "report.export.category": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "report.export.date": { id: "Tanggal", en: "Date", ms: "Tarikh", th: "วันที่", fil: "Petsa", vi: "Ngày" },
  "report.export.in": { id: "Masuk", en: "In", ms: "Masuk", th: "รับ", fil: "Papasok", vi: "Vào" },
  "report.export.out": { id: "Keluar", en: "Out", ms: "Keluar", th: "จ่าย", fil: "Palabas", vi: "Ra" },
  "report.export.net": { id: "Bersih", en: "Net", ms: "Bersih", th: "สุทธิ", fil: "Net", vi: "Thuần" },
  "report.export.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "report.export.printedAt": { id: "Dicetak", en: "Printed", ms: "Dicetak", th: "พิมพ์เมื่อ", fil: "Na-print", vi: "In lúc" },
  "report.export.allTime": { id: "Sepanjang Waktu", en: "All Time", ms: "Sepanjang Masa", th: "ตลอดเวลา", fil: "Lahat ng Panahon", vi: "Toàn thời gian" },
  "report.export.asOfPrefix": { id: "Per", en: "As of", ms: "Setakat", th: "ณ วันที่", fil: "Hanggang", vi: "Tính đến" },
  "report.export.sincePrefix": { id: "Sejak", en: "Since", ms: "Sejak", th: "ตั้งแต่", fil: "Mula", vi: "Từ" },
  "report.export.defaultCompanyName": { id: "Perusahaan", en: "Company", ms: "Syarikat", th: "บริษัท", fil: "Kumpanya", vi: "Công ty" },
  "report.export.header.trialBalance": { id: "Neraca Saldo", en: "Trial Balance", ms: "Imbangan Duga", th: "งบทดลอง", fil: "Trial Balance", vi: "Bảng cân đối thử" },
  "report.export.header.profitLoss": { id: "Laporan Laba Rugi", en: "Profit & Loss Statement", ms: "Penyata Untung Rugi", th: "งบกำไรขาดทุน", fil: "Profit & Loss Statement", vi: "Báo cáo lãi lỗ" },
  "report.export.header.balanceSheet": { id: "Neraca (Balance Sheet)", en: "Balance Sheet", ms: "Kunci Kira-kira", th: "งบดุล", fil: "Balance Sheet", vi: "Bảng cân đối kế toán" },
  "report.export.header.cashFlow": { id: "Laporan Arus Kas", en: "Cash Flow Statement", ms: "Penyata Aliran Tunai", th: "งบกระแสเงินสด", fil: "Cash Flow Statement", vi: "Báo cáo lưu chuyển tiền tệ" },
});
