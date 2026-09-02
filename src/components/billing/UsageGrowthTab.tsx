"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MonthStat {
  month: string;
  orderCount: number;
  revenue: number;
}

const MONTH_LABEL_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_LABEL_ID[idx] ?? m} ${y.slice(2)}`;
}

/**
 * "Pertumbuhan Data" tab — NEXBILL's equivalent of Accurate.id's data-growth chart, scoped to
 * something actually meaningful for a POS/rental app: monthly transaction count + revenue trend,
 * from getMonthlyUsageStats() in lib/subscription/service.ts (6 months, zero-filled).
 */
export function UsageGrowthTab({ money }: { money: (idr: number) => string }) {
  const { t } = useDashboardLang();
  const [months, setMonths] = useState<MonthStat[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetchJsonObject<{ months: MonthStat[] }>("/api/subscription/usage-growth");
      setMonths(res?.months ?? []);
    })();
  }, []);

  const chartData = (months ?? []).map((m) => ({ ...m, label: formatMonth(m.month) }));
  const totalOrders = chartData.reduce((s, m) => s + m.orderCount, 0);
  const totalRevenue = chartData.reduce((s, m) => s + m.revenue, 0);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 font-semibold">
        <TrendingUp size={16} className="text-cyan-400" /> {t("billing.usage.title", "Pertumbuhan Data — Transaksi & Pendapatan 6 Bulan Terakhir")}
      </div>

      {months === null && <div className="text-sm text-neutral-500">{t("billing.loading", "Memuat data langganan...")}</div>}

      {months !== null && months.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-neutral-500">{t("billing.usage.totalOrders", "Total Transaksi (6 bulan)")}</div>
              <div className="text-xl font-bold text-cyan-300">{totalOrders.toLocaleString("id-ID")}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-neutral-500">{t("billing.usage.totalRevenue", "Total Pendapatan (6 bulan)")}</div>
              <div className="text-xl font-bold text-emerald-300">{money(totalRevenue)}</div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#737373" fontSize={12} />
                <YAxis yAxisId="left" stroke="#737373" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={12} tickFormatter={(v) => money(v)} />
                <Tooltip
                  contentStyle={{ background: "#0f1426", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) =>
                    name === "revenue" ? [money(Number(value ?? 0)), t("billing.usage.revenueLegend", "Pendapatan")] : [Number(value ?? 0), t("billing.usage.ordersLegend", "Transaksi")]
                  }
                />
                <Bar yAxisId="left" dataKey="orderCount" fill="#22d3ee" radius={[4, 4, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-cyan-400" /> {t("billing.usage.ordersLegend", "Transaksi")}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {t("billing.usage.revenueLegend", "Pendapatan")}</span>
          </div>
        </>
      )}

      {months !== null && months.length === 0 && (
        <div className="text-sm text-neutral-600">{t("billing.usage.empty", "Belum ada data transaksi untuk ditampilkan.")}</div>
      )}
    </Card>
  );
}
