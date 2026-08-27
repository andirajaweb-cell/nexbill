"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const STATUS_BADGE: Record<string, string> = { active: "success", grace: "pending", trial: "pending", trial_expired: "failed", suspended: "failed", cancelled: "failed", pending_payment: "pending" };
const STATUS_LABEL: Record<string, string> = { active: "Aktif", grace: "Tenggang", trial: "Trial", trial_expired: "Trial Habis", suspended: "Suspend", cancelled: "Batal", pending_payment: "Menunggu Bayar" };

interface Data {
  growth: { month: string; count: number }[];
  topOutlets: { id: string; name: string; status: string; lifetimeRevenue: number; createdAt: string }[];
  activeCount: number;
  churnedCount: number;
  trialCount: number;
  conversionRate: number;
}

export default function PlatformPerformancePage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetchJsonObject<Data>("/api/platform-admin/performance").then(setData); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Performance Platform</h1>
        <p className="text-sm text-neutral-500 mt-1">Pertumbuhan outlet, tingkat konversi trial ke berbayar, dan outlet dengan kontribusi revenue tertinggi.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-[11px] uppercase text-neutral-500">Outlet Aktif Bayar</div><div className="gm-display text-xl font-bold text-emerald-300 mt-1">{data ? data.activeCount : "—"}</div></Card>
        <Card><div className="text-[11px] uppercase text-neutral-500">Outlet Trial</div><div className="gm-display text-xl font-bold text-cyan-300 mt-1">{data ? data.trialCount : "—"}</div></Card>
        <Card><div className="text-[11px] uppercase text-neutral-500">Churned/Suspend</div><div className="gm-display text-xl font-bold text-rose-300 mt-1">{data ? data.churnedCount : "—"}</div></Card>
        <Card><div className="text-[11px] uppercase text-neutral-500">Tingkat Konversi</div><div className="gm-display text-xl font-bold text-amber-300 mt-1">{data ? `${data.conversionRate}%` : "—"}</div></Card>
      </div>

      {data && data.growth.length > 0 && (
        <Card>
          <h2 className="gm-heading font-semibold mb-3">Pertumbuhan Outlet per Bulan (Signup Baru)</h2>
          <div className="space-y-2">
            {data.growth.map((g) => {
              const max = Math.max(...data.growth.map((x) => x.count), 1);
              return (
                <div key={g.month}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-neutral-400">{g.month}</span><span className="text-neutral-200 font-medium">{g.count} outlet</span></div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(2, (g.count / max) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Top Outlet berdasarkan Revenue Langganan</h2>
        {!data ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : data.topOutlets.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada data.</p>
        ) : (
          <div className="space-y-1.5">
            {data.topOutlets.map((o, i) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-600 w-5">{i + 1}.</span>
                  <span className="text-neutral-200">{o.name}</span>
                  <Badge status={STATUS_BADGE[o.status] ?? "unknown"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                </div>
                <span className="font-medium text-emerald-300">{rupiah(o.lifetimeRevenue)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
