"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Printer } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing";

interface InvoiceRow {
  id: string;
  status: string;
  type: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  method: string | null;
  cancelReason?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
}

const INVOICE_TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  subscription_fee: { key: "billing.invoiceType.subscriptionFee", fallback: "Biaya Langganan" },
  smart_plug_purchase: { key: "billing.invoiceType.smartPlugPurchase", fallback: "Pembelian Smart Plug" },
  setup_service: { key: "billing.invoiceType.setupService", fallback: "Jasa Setup Jarak Jauh" },
  extra_console: { key: "billing.invoiceType.extraConsole", fallback: "Konsol Tambahan" },
  cart_order: { key: "billing.invoiceType.cartOrder", fallback: "Belanja Langganan" },
  group_renewal: { key: "billing.invoiceType.groupRenewal", fallback: "Tagihan Gabungan Multi-Outlet" },
  ai_addon: { key: "billing.invoiceType.aiAddon", fallback: "AI Add-on" },
  deposit_topup: { key: "billing.invoiceType.depositTopup", fallback: "Top Up Saldo Deposit" },
};

const INVOICE_STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  unpaid: { key: "billing.invoiceStatus.unpaid", fallback: "Belum Bayar" },
  paid: { key: "billing.invoiceStatus.paid", fallback: "Lunas" },
  expired: { key: "billing.invoiceStatus.expired", fallback: "Kedaluwarsa (Otomatis)" },
  cancelled: { key: "billing.invoiceStatus.cancelled", fallback: "Dibatalkan" },
};

const INVOICE_STATUS_BADGE: Record<string, string> = {
  unpaid: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  paid: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  expired: "bg-white/5 text-neutral-400 border-white/10",
  cancelled: "bg-rose-500/10 text-rose-300 border-rose-400/30",
};

const STATUS_FILTERS = ["all", "unpaid", "paid", "expired", "cancelled"] as const;

/** Opens a minimal printable receipt in a new tab (window.open + doc.write) — no dedicated PDF
 * backend exists for platform-billing invoices, so this is the "Download/Cetak" affordance for
 * the Riwayat Faktur tab, mirroring Accurate.id's per-row invoice download without needing a new
 * API route. The user's own browser print dialog can then "Save as PDF". */
function printInvoice(inv: InvoiceRow, money: (idr: number) => string, t: (k: string, f?: string) => string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const typeLabel = INVOICE_TYPE_LABEL_KEYS[inv.type] ? t(INVOICE_TYPE_LABEL_KEYS[inv.type].key, INVOICE_TYPE_LABEL_KEYS[inv.type].fallback) : inv.type;
  const statusLabel = INVOICE_STATUS_LABEL_KEYS[inv.status] ? t(INVOICE_STATUS_LABEL_KEYS[inv.status].key, INVOICE_STATUS_LABEL_KEYS[inv.status].fallback) : inv.status;
  win.document.write(`
    <html>
      <head>
        <title>${inv.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .muted { color: #666; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
          td:last-child { text-align: right; }
          .total { font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>NEXBILL — ${inv.invoiceNumber}</h1>
        <div class="muted">${inv.description}</div>
        <table>
          <tr><td>${t("billing.invoices.lineType", "Jenis Tagihan")}</td><td>${typeLabel}</td></tr>
          <tr><td>${t("billing.invoices.lineStatus", "Status")}</td><td>${statusLabel}</td></tr>
          ${inv.createdAt ? `<tr><td>${t("billing.invoices.lineCreated", "Dibuat")}</td><td>${new Date(inv.createdAt).toLocaleString("id-ID")}</td></tr>` : ""}
          ${inv.paidAt ? `<tr><td>${t("billing.invoices.linePaid", "Dibayar")}</td><td>${new Date(inv.paidAt).toLocaleString("id-ID")}</td></tr>` : ""}
          <tr class="total"><td>${t("billing.cart.total", "Total")}</td><td>${money(inv.amount)}</td></tr>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

/**
 * "Riwayat Faktur" tab — full invoice history with status filter + per-row print/download,
 * mirroring Accurate.id's "Riwayat Faktur Billing" page. Reuses the same `invoices` array the
 * Dashboard tab already fetches (BillingResponse.invoices) rather than a second network round
 * trip — this list already includes every status (unpaid/paid/expired/cancelled).
 */
export function InvoiceHistoryTab({ invoices, money }: { invoices: InvoiceRow[]; money: (idr: number) => string }) {
  const { t } = useDashboardLang();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filtered = useMemo(() => (filter === "all" ? invoices : invoices.filter((i) => i.status === filter)), [invoices, filter]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-semibold">{t("billing.invoiceHistory.title", "Riwayat Faktur")}</div>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-xs rounded-lg px-2.5 py-1 border transition ${
                filter === f ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-neutral-400 hover:bg-white/5"
              }`}
            >
              {f === "all"
                ? t("billing.invoiceHistory.filterAll", "Semua")
                : INVOICE_STATUS_LABEL_KEYS[f]
                ? t(INVOICE_STATUS_LABEL_KEYS[f].key, INVOICE_STATUS_LABEL_KEYS[f].fallback)
                : f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <div className="text-sm text-neutral-600">{t("billing.invoiceHistory.empty", "Tidak ada faktur untuk filter ini.")}</div>}

      <div className="space-y-1.5">
        {filtered.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{inv.invoiceNumber}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${INVOICE_STATUS_BADGE[inv.status] ?? "border-white/10 text-neutral-400"}`}>
                  {INVOICE_STATUS_LABEL_KEYS[inv.status] ? t(INVOICE_STATUS_LABEL_KEYS[inv.status].key, INVOICE_STATUS_LABEL_KEYS[inv.status].fallback) : inv.status}
                </span>
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {INVOICE_TYPE_LABEL_KEYS[inv.type] ? t(INVOICE_TYPE_LABEL_KEYS[inv.type].key, INVOICE_TYPE_LABEL_KEYS[inv.type].fallback) : inv.type}
                {inv.createdAt ? ` · ${new Date(inv.createdAt).toLocaleDateString("id-ID")}` : ""}
                {inv.status === "expired" && inv.cancelReason ? ` · ${t("billing.invoiceHistory.autoExpiredNote", "kedaluwarsa otomatis 2x24 jam")}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-semibold">{money(inv.amount)}</span>
              <button
                type="button"
                title={t("billing.invoiceHistory.print", "Cetak / Unduh")}
                onClick={() => printInvoice(inv, money, t)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-neutral-400"
              >
                <Printer size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
