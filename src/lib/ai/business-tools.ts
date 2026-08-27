import Anthropic from "@anthropic-ai/sdk";
import { computeSalesReport, computeRentalReport, computeInventoryReport, computeCustomerReport } from "@/lib/reports/operational";
import { computeExpenseReport, computeExpenseDashboard } from "@/lib/reports/expense";
import { computeProfitLoss, computeBalanceSheet, computeTrialBalance } from "@/lib/accounting/reports";
import { computeCashFlow } from "@/lib/accounting/cashflow";
import { db } from "@/db/client";
import { fixedAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Read-only business-data tools for the internal AI assistant — distinct from
 * src/lib/ai/tools.ts (the customer-facing WA/IG bot's tools, which can also
 * *write*, e.g. create_preorder). Every tool here is a thin wrapper around an
 * existing report/accounting function, scoped to whichever outlet the
 * assistant conversation belongs to, and never mutates data — this assistant
 * answers "berapa/bagaimana" questions, it doesn't take actions.
 */

const periodProps = {
  from: { type: "string", description: "Tanggal mulai, format ISO (YYYY-MM-DD). Opsional — kosongkan untuk sepanjang waktu." },
  to: { type: "string", description: "Tanggal akhir, format ISO (YYYY-MM-DD). Opsional." },
};

export const businessToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_sales_report",
    description: "Ringkasan penjualan: total revenue rental vs POS/F&B, jumlah order, diskon, pajak, service charge, tren harian, dan breakdown per metode pembayaran, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_rental_report",
    description: "Performa rental per unit PS: jumlah sesi, revenue, rata-rata durasi per unit, dan total utilisasi, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_inventory_report",
    description: "Laporan inventori & HPP: qty terjual, revenue, HPP, margin per produk, barang waste, dan produk dengan stok menipis, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_customer_report",
    description: "Top pelanggan berdasarkan total belanja, jumlah kunjungan dalam periode, dan distribusi tier membership.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_expense_report",
    description: "Laporan biaya/expense lengkap: total per kategori, per akun COA, per supplier, per metode pembayaran, per cost center, rasio expense terhadap revenue, dan tren, untuk suatu periode. Hanya expense berstatus approved/paid yang dihitung (draft/pending/rejected/cancelled tidak dihitung karena belum terposting ke jurnal).",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_expense_dashboard",
    description: "Ringkasan expense saat ini: total hari ini, bulan ini, outstanding (hutang belum dibayar), jumlah & nominal pending approval, dan expense yang jatuh tempo dalam 3 hari.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_profit_loss",
    description: "Laporan Laba Rugi (Profit & Loss): total revenue, total expense per akun, gross profit, net profit, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_balance_sheet",
    description: "Neraca (Balance Sheet) per tanggal tertentu: total aset, kewajiban (hutang), dan ekuitas (termasuk laba ditahan periode berjalan).",
    input_schema: { type: "object", properties: { asOf: { type: "string", description: "Tanggal 'per tanggal' (YYYY-MM-DD), opsional — default hari ini." } } },
  },
  {
    name: "get_cash_flow",
    description: "Arus kas (Cash Flow): total kas masuk, kas keluar, arus kas bersih, breakdown per kategori, dan tren harian, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_fixed_assets_summary",
    description: "Ringkasan aset tetap (fixed asset): daftar aset aktif, harga perolehan, akumulasi penyusutan, dan nilai buku saat ini.",
    input_schema: { type: "object", properties: {} },
  },
];

export async function executeBusinessTool(name: string, input: any, outletId: string): Promise<string> {
  switch (name) {
    case "get_sales_report":
      return JSON.stringify(await computeSalesReport(outletId, input.from, input.to));
    case "get_rental_report":
      return JSON.stringify(await computeRentalReport(outletId, input.from, input.to));
    case "get_inventory_report":
      return JSON.stringify(await computeInventoryReport(outletId, input.from, input.to));
    case "get_customer_report":
      return JSON.stringify(await computeCustomerReport(outletId, input.from, input.to));
    case "get_expense_report":
      return JSON.stringify(await computeExpenseReport(outletId, input.from, input.to));
    case "get_expense_dashboard":
      return JSON.stringify(await computeExpenseDashboard(outletId));
    case "get_profit_loss":
      return JSON.stringify(await computeProfitLoss(outletId, input.from, input.to));
    case "get_balance_sheet":
      return JSON.stringify(await computeBalanceSheet(outletId, input.asOf));
    case "get_cash_flow":
      return JSON.stringify(await computeCashFlow(outletId, input.from, input.to));
    case "get_fixed_assets_summary": {
      const rows = await db.select().from(fixedAssets).where(eq(fixedAssets.outletId, outletId));
      return JSON.stringify(
        rows.map((a) => ({
          name: a.name, category: a.category, status: a.status,
          acquisitionCost: a.acquisitionCost, accumulatedDepreciation: a.accumulatedDepreciation,
          bookValue: a.acquisitionCost - a.accumulatedDepreciation,
        }))
      );
    }
    default:
      return JSON.stringify({ error: `Unknown tool ${name}` });
  }
}

/** Exposed for the AI Insights engine (trend/forecast/anomaly), which needs the same trial-balance access without going through the chat tool loop. */
export { computeTrialBalance };
