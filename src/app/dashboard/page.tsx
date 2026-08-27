"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import {
  Wallet, TrendingUp, TrendingDown, Coins, Receipt, Users, UserPlus, CalendarClock,
  Gamepad2, CheckCircle2, Wrench, Gauge, Landmark, PiggyBank, ArrowDownToLine, ArrowUpFromLine,
  ShoppingBag, Trophy, PackageX, Sparkles,
} from "lucide-react";

interface OwnerDashboard {
  date: string;
  omzet: number;
  revenueRental: number;
  revenueFnb: number;
  revenueProduk: number;
  revenueBySource: { rentalReguler: number; rentalMember: number; addon: number; fnb: number; produk: number; ppob: number; lainLain: number };
  revenueBySourceTotal: number;
  salesTargetMonthly: number | null;
  salesTargetDaily: number | null;
  pengeluaranHariIni: number;
  grossProfit: number;
  netProfit: number;
  transactionsCount: number;
  customersServedTodayCount: number;
  newMembersTodayCount: number;
  cashIn: number;
  kasKeluar: number;
  saldoKas: number;
  saldoRekening: number;
  units: { total: number; available: number; occupied: number; booked: number; maintenance: number };
  bookingsTodayCount: number;
  utilizationRatePercent: number;
  revenuePerUnit: { unitId: string; unitName: string; revenue: number }[];
  mostProductiveUnit: { unitId: string; unitName: string; revenue: number } | null;
  topGame: { name: string; count: number } | null;
  topGames: { name: string; count: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  busyHours: { hour: number; count: number }[];
  busiestHour: { hour: number; count: number } | null;
  quietestHour: { hour: number; count: number } | null;
  activeCustomersCount: number;
  lowStockProducts: { id: string; name: string; stockQty: number; lowStockThreshold: number }[];
  receivablesOutstanding: number;
  payablesOutstanding: number;
}

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const jamLabel = (h: { hour: number; count: number } | null) => (h ? `${String(h.hour).padStart(2, "0")}:00 (${h.count}x)` : "—");

type Glow = "cyan" | "emerald" | "purple" | "amber" | "rose" | "blue";
const GLOW_STYLES: Record<Glow, { icon: string; ring: string; value: string }> = {
  cyan: { icon: "bg-cyan-500/10 text-cyan-300 border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.35)]", ring: "hover:border-cyan-400/30 hover:shadow-[0_0_18px_rgba(34,211,238,0.12)]", value: "text-cyan-300" },
  emerald: { icon: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.35)]", ring: "hover:border-emerald-400/30 hover:shadow-[0_0_18px_rgba(52,211,153,0.12)]", value: "text-emerald-300" },
  purple: { icon: "bg-purple-500/10 text-purple-300 border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.35)]", ring: "hover:border-purple-400/30 hover:shadow-[0_0_18px_rgba(168,85,247,0.12)]", value: "text-purple-300" },
  amber: { icon: "bg-amber-500/10 text-amber-300 border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.3)]", ring: "hover:border-amber-400/30 hover:shadow-[0_0_18px_rgba(251,191,36,0.12)]", value: "text-amber-300" },
  rose: { icon: "bg-rose-500/10 text-rose-300 border-rose-400/30 shadow-[0_0_10px_rgba(244,63,94,0.35)]", ring: "hover:border-rose-400/30 hover:shadow-[0_0_18px_rgba(244,63,94,0.12)]", value: "text-rose-300" },
  blue: { icon: "bg-blue-500/10 text-blue-300 border-blue-400/30 shadow-[0_0_10px_rgba(59,130,246,0.35)]", ring: "hover:border-blue-400/30 hover:shadow-[0_0_18px_rgba(59,130,246,0.12)]", value: "text-blue-300" },
};

function StatCard({ label, value, glow = "cyan", sub, icon: Icon }: { label: string; value: string; glow?: Glow; sub?: string; icon: React.ComponentType<{ size?: number }> }) {
  const s = GLOW_STYLES[glow];
  return (
    <Card className={`transition ${s.ring}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
          <div className={`gm-display text-xl sm:text-2xl font-bold mt-1 truncate ${s.value}`}>{value}</div>
          {sub && <div className="text-[11px] text-neutral-500 mt-1">{sub}</div>}
        </div>
        <div className={`shrink-0 rounded-lg border p-2 ${s.icon}`}>
          <Icon size={16} />
        </div>
      </div>
    </Card>
  );
}

const REVENUE_SOURCE_ROWS: { key: keyof OwnerDashboard["revenueBySource"]; labelKey: string; barClass: string; subKey?: string }[] = [
  { key: "rentalReguler", labelKey: "card.rowRentalReguler", barClass: "bg-cyan-400" },
  { key: "rentalMember", labelKey: "card.rowRentalMember", barClass: "bg-emerald-400" },
  { key: "addon", labelKey: "card.rowAddon", barClass: "bg-blue-400" },
  { key: "fnb", labelKey: "card.rowFnb", barClass: "bg-purple-400" },
  { key: "produk", labelKey: "card.rowProduk", barClass: "bg-amber-400" },
  { key: "ppob", labelKey: "card.rowPpob", barClass: "bg-pink-400", subKey: "card.rowPpobSub" },
  { key: "lainLain", labelKey: "card.rowLainLain", barClass: "bg-neutral-400" },
];

/** Horizontal-bar revenue-by-source breakdown — mirrors what the accounting engine (postings.ts)
 * actually routes each order item to today (rental split member/reguler, F&B, retail product,
 * add-on rentals, PPOB margin only — not the pass-through nominal, service charge/tax). */
function RevenueBreakdownCard({ data }: { data: OwnerDashboard | null }) {
  const { t } = useDashboardLang();
  const rows = data ? REVENUE_SOURCE_ROWS.map((r) => ({ ...r, amount: data.revenueBySource[r.key] })) : [];
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount));
  const hasTarget = data && data.salesTargetDaily != null;
  const bepPercent = hasTarget && data!.salesTargetDaily! > 0 ? Math.round((data!.revenueBySourceTotal / data!.salesTargetDaily!) * 1000) / 10 : 0;
  const bepGap = hasTarget ? Math.max(0, data!.salesTargetDaily! - data!.revenueBySourceTotal) : 0;
  const bepReached = hasTarget && data!.revenueBySourceTotal >= data!.salesTargetDaily!;
  return (
    <Card>
      <h2 className="gm-heading font-semibold mb-3 flex items-center gap-2"><Coins size={14} className="text-emerald-300" /> {t("card.revenueBreakdown")}</h2>
      {data ? (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-300">{t(r.labelKey)}</span>
                <span className="font-medium text-neutral-100">{rupiah(r.amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full ${r.barClass}`} style={{ width: `${Math.max(2, (r.amount / maxAmount) * 100)}%` }} />
              </div>
              {r.subKey && r.amount > 0 && <div className="text-[10px] text-neutral-600 mt-0.5">{t(r.subKey)}</div>}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10 text-sm">
            <span className="gm-heading font-semibold text-neutral-200">{t("card.totalRevenue")}</span>
            <span className="gm-display font-bold text-cyan-300">{rupiah(data.revenueBySourceTotal)}</span>
          </div>

          {hasTarget && (
            <div className="pt-2.5 mt-1 border-t border-dashed border-white/10">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="gm-heading font-semibold text-neutral-300">{t("card.bepTarget")}</span>
                <span className="font-medium text-neutral-100">{rupiah(data.salesTargetDaily!)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${bepReached ? "bg-emerald-400" : "bg-amber-400"}`}
                  style={{ width: `${Math.min(100, Math.max(bepPercent > 0 ? 2 : 0, bepPercent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className={bepReached ? "text-emerald-300 font-medium" : "text-amber-300 font-medium"}>
                  {bepPercent}% {bepReached ? t("card.bepReachedSuffix") : t("card.bepPercentSuffix")}
                </span>
                {!bepReached && <span className="text-neutral-500">{t("card.bepShort")} {rupiah(bepGap)}</span>}
              </div>
              <div className="text-[10px] text-neutral-600 mt-1">
                {t("card.monthlyTargetNote").replace("{x}", rupiah(data.salesTargetMonthly!))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{t("card.loading")}</p>
      )}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="gm-heading flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 mt-2">
      <span className="h-3 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-purple-400" />
      {children}
    </h2>
  );
}

export default function OwnerDashboardPage() {
  const { t } = useDashboardLang();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [data, setData] = useState<OwnerDashboard | null>(null);

  const load = (oid: string) => fetchJsonObject<OwnerDashboard>(`/api/dashboard/owner?outletId=${oid}`).then(setData);

  useEffect(() => {
    fetchJsonObject<{ id: string }>("/api/outlets/default").then((o) => { if (o) { setOutletId(o.id); load(o.id); } });
  }, []);

  useEffect(() => {
    if (!outletId) return;
    const interval = setInterval(() => load(outletId), 30000);
    return () => clearInterval(interval);
  }, [outletId]);

  const busyHoursChartData = data?.busyHours.map((b) => ({ jam: `${b.hour}:00`, transaksi: b.count })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gm-display text-2xl sm:text-3xl font-bold">
            <span className="gm-gradient-title">CONTROL CENTER</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">{t("dash.subtitle")}</p>
        </div>
        {data && <Badge status="available">{t("dash.live")}</Badge>}
      </div>

      <SectionTitle>{t("section.revenueProfit")}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("stat.todayRevenue")} value={data ? rupiah(data.omzet) : "—"} glow="emerald" icon={Wallet} sub={data ? `${data.transactionsCount} transaksi lunas` : undefined} />
        <StatCard label={t("stat.rentalRevenue")} value={data ? rupiah(data.revenueRental) : "—"} glow="cyan" icon={Gamepad2} />
        <StatCard label={t("stat.fnbRevenue")} value={data ? rupiah(data.revenueFnb) : "—"} glow="purple" icon={ShoppingBag} />
        <StatCard label={t("stat.otherProductRevenue")} value={data ? rupiah(data.revenueProduk) : "—"} glow="blue" icon={Coins} sub={t("stat.otherProductSub")} />
        <StatCard label={t("stat.todayExpense")} value={data ? rupiah(data.pengeluaranHariIni) : "—"} glow="rose" icon={Receipt} />
        <StatCard label={t("stat.grossProfit")} value={data ? rupiah(data.grossProfit) : "—"} glow="amber" icon={TrendingUp} />
        <StatCard label={t("stat.netProfitEst")} value={data ? rupiah(data.netProfit) : "—"} glow={data && data.netProfit < 0 ? "rose" : "emerald"} icon={data && data.netProfit < 0 ? TrendingDown : TrendingUp} />
      </div>

      <RevenueBreakdownCard data={data} />

      <SectionTitle>{t("section.transactionsCustomers")}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("stat.transactionCount")} value={data ? String(data.transactionsCount) : "—"} glow="cyan" icon={Receipt} />
        <StatCard label={t("stat.customersToday")} value={data ? String(data.customersServedTodayCount) : "—"} glow="blue" icon={Users} />
        <StatCard label={t("stat.newMembersToday")} value={data ? String(data.newMembersTodayCount) : "—"} glow="emerald" icon={UserPlus} />
        <StatCard label={t("stat.bookingsToday")} value={data ? String(data.bookingsTodayCount) : "—"} glow="purple" icon={CalendarClock} />
      </div>

      <SectionTitle>{t("section.psUnitStatus")}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label={t("stat.psPlaying")} value={data ? String(data.units.occupied) : "—"} glow="amber" icon={Gamepad2} />
        <StatCard label={t("stat.psAvailable")} value={data ? String(data.units.available) : "—"} glow="emerald" icon={CheckCircle2} />
        <StatCard label={t("stat.psBooked")} value={data ? String(data.units.booked) : "—"} glow="purple" icon={CalendarClock} />
        <StatCard label={t("stat.psMaintenance")} value={data ? String(data.units.maintenance) : "—"} glow={data && data.units.maintenance > 0 ? "rose" : "cyan"} icon={Wrench} />
        <StatCard label={t("stat.utilizationRate")} value={data ? `${data.utilizationRatePercent}%` : "—"} glow="cyan" icon={Gauge} sub={data ? `${data.units.occupied}/${data.units.total} unit terpakai` : undefined} />
      </div>

      <SectionTitle>{t("section.cashFinance")}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={t("stat.cashIn")} value={data ? rupiah(data.cashIn) : "—"} glow="emerald" icon={ArrowDownToLine} />
        <StatCard label={t("stat.cashOut")} value={data ? rupiah(data.kasKeluar) : "—"} glow="rose" icon={ArrowUpFromLine} />
        <StatCard label={t("stat.cashBalance")} value={data ? rupiah(data.saldoKas) : "—"} glow="cyan" icon={PiggyBank} />
        <StatCard label={t("stat.bankBalance")} value={data ? rupiah(data.saldoRekening) : "—"} glow="blue" icon={Landmark} />
        <StatCard label={t("stat.receivables")} value={data ? rupiah(data.receivablesOutstanding) : "—"} glow="amber" icon={Receipt} />
        <StatCard label={t("stat.payables")} value={data ? rupiah(data.payablesOutstanding) : "—"} glow="purple" icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="gm-heading font-semibold mb-3 flex items-center gap-2"><Sparkles size={14} className="text-cyan-300" /> {t("card.busyQuiet")}</h2>
          {busyHoursChartData.some((b) => b.transaksi > 0) ? (
            <>
              <div className="flex gap-6 mb-3 text-sm">
                <div><span className="text-neutral-500">{t("card.busyHour")} </span><span className="font-medium text-emerald-300">{jamLabel(data?.busiestHour ?? null)}</span></div>
                <div><span className="text-neutral-500">{t("card.quietHour")} </span><span className="font-medium text-amber-300">{jamLabel(data?.quietestHour ?? null)}</span></div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={busyHoursChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="jam" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#0d1326", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="transaksi" fill="url(#ownerBarGradient)" radius={[3, 3, 0, 0]} />
                  <defs>
                    <linearGradient id="ownerBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-sm text-neutral-500">{t("card.notEnoughData")}</p>
          )}
        </Card>

        <Card>
          <h2 className="gm-heading font-semibold mb-3 flex items-center gap-2"><Trophy size={14} className="text-amber-300" /> {t("card.revenuePerUnit")}</h2>
          {data && data.mostProductiveUnit && (
            <div className="text-xs text-neutral-500 mb-2">
              {t("card.mostProductiveUnit")} <span className="text-emerald-300 font-medium">{data.mostProductiveUnit.unitName}</span> ({rupiah(data.mostProductiveUnit.revenue)})
            </div>
          )}
          {data && data.revenuePerUnit.length > 0 ? (
            <ul className="space-y-2">
              {data.revenuePerUnit.map((u) => (
                <li key={u.unitId} className="flex justify-between text-sm border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-neutral-300">{u.unitName}</span>
                  <span className="font-medium text-cyan-300">{rupiah(u.revenue)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">{t("card.noCompletedSession")}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h2 className="gm-heading font-semibold mb-3 flex items-center gap-2"><ShoppingBag size={14} className="text-purple-300" /> {t("card.topProducts")}</h2>
          {data && data.topProducts.length > 0 ? (
            <ul className="space-y-2">
              {data.topProducts.map((p, i) => (
                <li key={i} className="flex justify-between text-sm border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-neutral-300">{p.name}</span>
                  <span className="text-neutral-400">{p.qty}x · {rupiah(p.revenue)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">{t("card.noProductSales")}</p>
          )}
        </Card>

        <Card>
          <h2 className="gm-heading font-semibold mb-3 flex items-center gap-2"><Gamepad2 size={14} className="text-cyan-300" /> {t("card.topGames")}</h2>
          {data && data.topGames.length > 0 ? (
            <ul className="space-y-2">
              {data.topGames.slice(0, 5).map((g, i) => (
                <li key={i} className="flex justify-between text-sm border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-neutral-300">{g.name}</span>
                  <span className="text-neutral-400">{g.count} {t("card.sessionsCount")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">{t("card.noGameData")}</p>
          )}
        </Card>

        <Card>
          <h2 className="gm-heading font-semibold mb-3 flex items-center gap-2"><PackageX size={14} className="text-amber-300" /> {t("card.lowStock")}</h2>
          {data && data.lowStockProducts.length > 0 ? (
            <ul className="space-y-2">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between text-sm border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-neutral-300">{p.name}</span>
                  <span className="text-amber-300 font-medium">{p.stockQty} / {t("card.minLabel")} {p.lowStockThreshold}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">{t("card.allStockSafe")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
