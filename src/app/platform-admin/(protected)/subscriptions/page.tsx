"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const TYPE_LABEL: Record<string, string> = {
  subscription_fee: "Biaya Langganan",
  smart_plug_purchase: "Pembelian Smart Plug",
  setup_service: "Jasa Setup",
  extra_console: "Konsol Tambahan",
};
const STATUS_BADGE: Record<string, string> = { paid: "success", unpaid: "pending", cancelled: "failed" };

interface SubscriptionInvoice {
  id: string;
  outletName: string;
  type: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  status: "paid" | "unpaid" | "cancelled";
}

interface Data {
  invoices: SubscriptionInvoice[];
  totalPaid: number;
  totalUnpaid: number;
  revenueByMonth: { month: string; amount: number }[];
}

export default function PlatformSubscriptionsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");

  useEffect(() => {
    fetchJsonObject<Data>("/api/platform-admin/subscriptions").then(setData);
  }, []);

  const visible = data ? (filter === "all" ? data.invoices : data.invoices.filter((i) => i.status === filter)) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Penjualan Langganan</h1>
        <p className="text-sm text-neutral-500 mt-1">Seluruh tagihan langganan dari semua outlet — biaya langganan bulanan, smart plug, setup, konsol tambahan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Total Lunas</div>
          <div className="gm-display text-xl font-bold text-emerald-300 mt-1">{data ? rupiah(data.totalPaid) : "—"}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Total Belum Lunas</div>
          <div className="gm-display text-xl font-bold text-amber-300 mt-1">{data ? rupiah(data.totalUnpaid) : "—"}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Jumlah Tagihan</div>
          <div className="gm-display text-xl font-bold text-cyan-300 mt-1">{data ? data.invoices.length : "—"}</div>
        </Card>
      </div>

      {data && data.revenueByMonth.length > 0 && (
        <Card>
          <h2 className="gm-heading font-semibold mb-3">Revenue per Bulan (Lunas)</h2>
          <div className="space-y-2">
            {data.revenueByMonth.map((r) => {
              const max = Math.max(...data.revenueByMonth.map((x) => x.amount), 1);
              return (
                <div key={r.month}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-neutral-400">{r.month}</span><span className="text-neutral-200 font-medium">{rupiah(r.amount)}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(2, (r.amount / max) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="gm-heading font-semibold">Daftar Tagihan</h2>
          <div className="flex gap-1">
            {(["all", "paid", "unpaid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs ${filter === f ? "bg-amber-500/20 text-amber-300" : "text-neutral-500 hover:text-neutral-200"}`}
              >
                {f === "all" ? "Semua" : f === "paid" ? "Lunas" : "Belum Lunas"}
              </button>
            ))}
          </div>
        </div>
        {!data ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-neutral-500">Tidak ada data.</p>
        ) : (
          <div className="space-y-1.5">
            {visible.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <div>
                  <div className="text-neutral-200">{inv.outletName} — {TYPE_LABEL[inv.type] ?? inv.type}</div>
                  <div className="text-[11px] text-neutral-500">{inv.invoiceNumber} · {inv.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-100">{rupiah(inv.amount)}</span>
                  <Badge status={STATUS_BADGE[inv.status] ?? "unknown"}>{inv.status === "paid" ? "Lunas" : inv.status === "unpaid" ? "Belum Lunas" : "Batal"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
