"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { Building2, Wallet, TrendingUp, AlertTriangle } from "lucide-react";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial", trial_expired: "Trial Habis", pending_payment: "Menunggu Bayar",
  active: "Aktif", grace: "Masa Tenggang", suspended: "Suspend", cancelled: "Batal",
};

interface Overview {
  totalOutlets: number;
  statusBreakdown: Record<string, number>;
  mrr: number;
  totalRevenueAllTime: number;
  recentPaid: any[];
  unpaidCount: number;
  unpaidTotal: number;
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ComponentType<{ size?: number }>; accent: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
          <div className="gm-display text-xl font-bold mt-1" style={{ color: accent }}>{value}</div>
        </div>
        <div className="rounded-lg border p-2" style={{ borderColor: accent + "40", color: accent, background: accent + "1a" }}>
          <Icon size={16} />
        </div>
      </div>
    </Card>
  );
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetchJsonObject<Overview>("/api/platform-admin/overview").then(setData);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Ringkasan Platform</h1>
        <p className="text-sm text-neutral-500 mt-1">Data lintas semua outlet/tenant NEXBILL — tidak terlihat oleh akun outlet manapun.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Outlet Terdaftar" value={data ? String(data.totalOutlets) : "—"} icon={Building2} accent="#22d3ee" />
        <StatCard label="MRR (Estimasi)" value={data ? rupiah(data.mrr) : "—"} icon={TrendingUp} accent="#34d399" />
        <StatCard label="Total Revenue Sepanjang Waktu" value={data ? rupiah(data.totalRevenueAllTime) : "—"} icon={Wallet} accent="#a855f7" />
        <StatCard label="Tagihan Belum Lunas" value={data ? `${data.unpaidCount} (${rupiah(data.unpaidTotal)})` : "—"} icon={AlertTriangle} accent="#fbbf24" />
      </div>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Status Langganan Semua Outlet</h2>
        {data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(data.statusBreakdown).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-white/10 p-3">
                <div className="text-[11px] text-neutral-500">{STATUS_LABEL[status] ?? status}</div>
                <div className="text-lg font-semibold text-neutral-100">{count}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Memuat...</p>
        )}
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Pembayaran Terbaru</h2>
        {data && data.recentPaid.length > 0 ? (
          <div className="space-y-1.5 text-sm">
            {data.recentPaid.map((inv) => (
              <div key={inv.id} className="flex justify-between border-b border-white/5 pb-1.5 last:border-0">
                <span className="text-neutral-300">{inv.outletName} — {inv.description}</span>
                <span className="text-emerald-300 font-medium">{rupiah(inv.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{data ? "Belum ada pembayaran." : "Memuat..."}</p>
        )}
      </Card>
    </div>
  );
}
