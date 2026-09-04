"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { Building2, Wallet, TrendingUp, AlertTriangle, Users, Database, ExternalLink } from "lucide-react";

// Supabase's own dashboard, not ours — Database Size, Egress, Cached Egress, and File Storage
// are billing-cycle usage quantities that only exist on Supabase's org-level Usage page. Their
// public Management API (the one reachable with a Personal Access Token) has no endpoint that
// returns these; the numbers are only servable via Supabase's internal dashboard API, which
// needs a live dashboard session rather than an API key and isn't safe to depend on. So instead
// of half-faking it, this links straight to the real page. "org/_/usage" is Supabase's own
// generic link pattern — the "_" resolves to whichever org the signed-in browser belongs to.
const SUPABASE_USAGE_URL = "https://supabase.com/dashboard/org/_/usage";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial", trial_expired: "Trial Habis", pending_payment: "Menunggu Bayar",
  active: "Aktif", grace: "Masa Tenggang", suspended: "Suspend", cancelled: "Batal",
  free_forever: "Gratis Selamanya",
};

interface Overview {
  totalOutlets: number;
  statusBreakdown: Record<string, number>;
  mrr: number;
  totalRevenueAllTime: number;
  recentPaid: any[];
  unpaidCount: number;
  unpaidTotal: number;
  activeUsers30d: number;
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
        <StatCard label="Active User (30 hari)" value={data ? String(data.activeUsers30d) : "—"} icon={Users} accent="#f472b6" />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="gm-heading font-semibold flex items-center gap-2"><Database size={16} className="text-cyan-300" /> Infrastruktur Supabase</h2>
            <p className="text-sm text-neutral-500 mt-1 max-w-xl">
              Database size, egress, cached egress, dan file storage adalah angka pemakaian billing dari Supabase sendiri —
              tidak tersedia lewat API publik mereka, jadi buka langsung di dashboard Supabase.
            </p>
          </div>
          <a
            href={SUPABASE_USAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-400/20 transition shrink-0"
          >
            Buka Usage Dashboard <ExternalLink size={14} />
          </a>
        </div>
      </Card>

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
