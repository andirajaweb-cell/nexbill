"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const STATUS_LABEL: Record<string, string> = {
  trial: "Percobaan",
  trial_expired: "Percobaan Berakhir",
  pending_payment: "Menunggu Bayar",
  active: "Aktif",
  grace: "Tenggang",
  suspended: "Ditangguhkan",
  cancelled: "Dibatalkan",
};
const STATUS_BADGE: Record<string, string> = {
  trial: "pending",
  trial_expired: "failed",
  pending_payment: "pending",
  active: "success",
  grace: "pending",
  suspended: "failed",
  cancelled: "failed",
};

interface Row {
  outletId: string;
  outletName: string;
  subscriptionStatus: string;
  totalRevenue: number;
  totalExpense: number;
  grossProfit: number;
  netProfit: number;
}
interface Data {
  month: string;
  from: string;
  to: string;
  rows: Row[];
  totals: { totalRevenue: number; totalExpense: number; grossProfit: number; netProfit: number };
}

export default function PlatformAccountingPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (m: string) => {
    setLoading(true);
    fetchJsonObject<Data>(`/api/platform-admin/accounting?month=${m}`)
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(month); }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="gm-display text-2xl font-bold text-amber-300">Accounting per Outlet</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Performa akuntansi bisnis setiap outlet/merchant (bukan tagihan langganan ke NEXBILL) — dihitung langsung dari Chart of Account &amp; jurnal masing-masing outlet, terisolasi penuh per outlet.
          </p>
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Periode</label>
          <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs text-neutral-500">Total Pendapatan (semua outlet)</div>
            <div className="text-lg font-semibold text-cyan-300 mt-1">{rupiah(data.totals.totalRevenue)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500">Total Beban (semua outlet)</div>
            <div className="text-lg font-semibold text-rose-300 mt-1">{rupiah(data.totals.totalExpense)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500">Laba Kotor</div>
            <div className="text-lg font-semibold text-neutral-100 mt-1">{rupiah(data.totals.grossProfit)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500">Laba Bersih</div>
            <div className={`text-lg font-semibold mt-1 ${data.totals.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{rupiah(data.totals.netProfit)}</div>
          </Card>
        </div>
      )}

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Performa per Outlet — {data?.month}</h2>
        {loading || !data ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : data.rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada outlet terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-white/10">
                  <th className="py-2 pr-3">Outlet</th>
                  <th className="py-2 pr-3">Status Langganan</th>
                  <th className="py-2 pr-3 text-right">Pendapatan</th>
                  <th className="py-2 pr-3 text-right">Beban</th>
                  <th className="py-2 pr-3 text-right">Laba Kotor</th>
                  <th className="py-2 pr-3 text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.outletId} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 text-neutral-200">{r.outletName}</td>
                    <td className="py-2 pr-3">
                      <Badge status={STATUS_BADGE[r.subscriptionStatus] ?? "unknown"}>{STATUS_LABEL[r.subscriptionStatus] ?? r.subscriptionStatus}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right text-cyan-300">{rupiah(r.totalRevenue)}</td>
                    <td className="py-2 pr-3 text-right text-rose-300">{rupiah(r.totalExpense)}</td>
                    <td className="py-2 pr-3 text-right text-neutral-300">{rupiah(r.grossProfit)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${r.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{rupiah(r.netProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-neutral-600 mt-3">
          Angka dihitung dari akun bertipe revenue/expense pada Chart of Account milik masing-masing outlet, untuk periode {data ? new Date(data.from).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "-"} — akun, mapping, dan jurnal setiap outlet sepenuhnya terpisah satu sama lain.
        </p>
      </Card>
    </div>
  );
}
