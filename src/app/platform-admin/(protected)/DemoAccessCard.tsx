"use client";
import { useEffect, useState } from "react";
import { MonitorPlay, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import type { DemoAccessStats } from "@/lib/auth/demo-stats";

interface DemoAccess {
  emails: string[];
  accounts: { id: string; email: string; role: string; isActive: boolean; outletName: string | null; subscriptionStatus: string | null; aiAddonActive: boolean | null }[];
  missing: string[];
  allTime: number;
  stats: DemoAccessStats;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Akun demo publik (kredensial di landing page): status akun + berapa kali dipakai. */
export function DemoAccessCard() {
  const [data, setData] = useState<DemoAccess | null>(null);
  useEffect(() => {
    fetchJsonObject<DemoAccess>("/api/platform-admin/demo-access").then(setData);
  }, []);
  const s = data?.stats;
  const max = Math.max(1, ...(s?.daily.map((d) => d.count) ?? [1]));

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <h2 className="gm-heading font-semibold flex items-center gap-2"><MonitorPlay size={16} className="text-cyan-300" /> Akun Demo Publik</h2>
        <span className="text-xs text-neutral-500">Login lewat kredensial demo di nexbill.id · hari = kalender WIB</span>
      </div>

      {!data ? (
        <p className="text-sm text-neutral-500">Memuat...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ["Hari ini", s!.today, `${s!.uniqueToday} pengunjung unik`],
              ["7 hari", s!.last7Days, ""],
              ["30 hari (sebulan)", s!.last30Days, `${s!.unique30Days} pengunjung unik`],
              ["Sepanjang waktu", data.allTime, ""],
              ["Login terakhir", fmt(s!.lastLoginAt), ""],
            ].map(([label, value, sub]) => (
              <div key={String(label)} className="rounded-lg border border-white/10 p-3">
                <div className="text-[11px] text-neutral-500">{label}</div>
                <div className="text-lg font-semibold text-neutral-100">{value}</div>
                {sub ? <div className="text-[10px] text-neutral-500">{sub}</div> : null}
              </div>
            ))}
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 mb-1">Login per hari — 30 hari terakhir</div>
            <div className="flex items-end gap-[3px] h-20">
              {s!.daily.map((d) => (
                <div key={d.date} className="flex-1 bg-cyan-500/60 rounded-t hover:bg-cyan-400" style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }} title={`${d.date}: ${d.count} login`} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-neutral-500 mb-1">Perangkat (30 hari)</div>
              {s!.topDevices.length ? s!.topDevices.map((d) => <div key={d.device} className="flex justify-between"><span className="text-neutral-300">{d.device}</span><span>{d.count}</span></div>) : <div className="text-neutral-600">Belum ada login.</div>}
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Negara (30 hari)</div>
              {s!.topCountries.length ? s!.topCountries.map((c) => <div key={c.country} className="flex justify-between"><span className="text-neutral-300">{c.country}</span><span>{c.count}</span></div>) : <div className="text-neutral-600">—</div>}
            </div>
          </div>

          <div className="space-y-1 text-xs border-t border-white/10 pt-3">
            {data.accounts.map((a) => {
              const ok = a.subscriptionStatus === "free_forever" && a.isActive;
              return (
                <div key={a.id} className={`flex flex-wrap items-center gap-2 ${ok ? "text-emerald-300" : "text-amber-300"}`}>
                  {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  <span className="font-mono">{a.email}</span>
                  <span className="text-neutral-500">· {a.outletName ?? "-"} · {a.role} · langganan {a.subscriptionStatus ?? "?"}{a.aiAddonActive ? " · AI aktif" : ""}</span>
                  {!ok && <span>— jalankan scripts/setup-demo-account.ts supaya akses penuh tanpa trial</span>}
                </div>
              );
            })}
            {data.missing.map((e) => (
              <div key={e} className="flex items-center gap-2 text-amber-300">
                <AlertTriangle size={13} /> <span className="font-mono">{e}</span> belum terdaftar — daftar di /daftar lalu jalankan scripts/setup-demo-account.ts
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
