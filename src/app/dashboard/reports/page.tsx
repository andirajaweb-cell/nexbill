"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import "@/lib/i18n/dict-reports";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["Penjualan", "Rental", "Home Rental", "Inventori & HPP", "Pelanggan", "Beban"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL_KEYS: Record<Tab, { key: string; fallback: string }> = {
  "Penjualan": { key: "reports.tab.sales", fallback: "Penjualan" },
  "Rental": { key: "reports.tab.rental", fallback: "Rental" },
  "Home Rental": { key: "reports.tab.homeRental", fallback: "Home Rental" },
  "Inventori & HPP": { key: "reports.tab.inventory", fallback: "Inventori & HPP" },
  "Pelanggan": { key: "reports.tab.customers", fallback: "Pelanggan" },
  "Beban": { key: "reports.tab.expenses", fallback: "Beban" },
};

function DateRangePicker({ from, to, setFrom, setTo, onApply }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; onApply: () => void }) {
  const { t } = useDashboardLang();
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-neutral-500">{t("reports.dateFrom", "Dari Tanggal")}</label>
          <input type="date" className="block rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">{t("reports.dateTo", "Sampai Tanggal")}</label>
          <input type="date" className="block rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={onApply}>{t("reports.apply", "Terapkan")}</Button>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { t } = useDashboardLang();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Penjualan");

  useEffect(() => {
    fetchJsonObject("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("reports.title", "Laporan & Analitik")}</h1>
        <p className="text-sm text-neutral-500">{t("reports.subtitle", "Laporan operasional per periode — penjualan, rental, inventori/HPP, dan pelanggan.")}</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((tabId) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tabId ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
            {t(TAB_LABEL_KEYS[tabId].key, TAB_LABEL_KEYS[tabId].fallback)}
          </button>
        ))}
      </div>

      {!outletId ? null : tab === "Penjualan" ? (
        <SalesTab outletId={outletId} />
      ) : tab === "Rental" ? (
        <RentalTab outletId={outletId} />
      ) : tab === "Home Rental" ? (
        <HomeRentalTab outletId={outletId} />
      ) : tab === "Inventori & HPP" ? (
        <InventoryTab outletId={outletId} />
      ) : tab === "Pelanggan" ? (
        <CustomerTab outletId={outletId} />
      ) : (
        <ExpenseReportTab outletId={outletId} />
      )}
    </div>
  );
}

function SalesTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJsonObject(`/api/reports/sales?${params}`).then(setData);
  };
  useEffect(load, [outletId]);
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("reports.sales.totalRevenue", "Total Pendapatan")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(data.totalRevenue)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.sales.rentalRevenue", "Pendapatan Rental")}</div><div className="text-xl font-bold">{rupiah(data.revenueRental)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.sales.posRevenue", "Pendapatan POS / F&B")}</div><div className="text-xl font-bold">{rupiah(data.revenuePos)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.sales.paidOrders", "Jumlah Order Lunas")}</div><div className="text-xl font-bold">{data.ordersCount}</div></Card>
      </div>

      <Card style={{ height: 280 }}>
        <h2 className="font-medium mb-2 text-sm text-neutral-400">{t("reports.sales.dailyTrend", "Tren Pendapatan Harian")}</h2>
        {data.byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => rupiah(Number(v))} contentStyle={{ background: "#0d1326", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-neutral-500">{t("reports.noDataPeriod", "Tidak ada data pada periode ini.")}</p>}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-2">{t("reports.sales.byPaymentMethod", "Pendapatan per Metode Pembayaran")}</h2>
          {data.byPaymentMethod.map((m: any) => (
            <div key={m.method} className="flex justify-between text-sm py-1 capitalize"><span>{m.method.replace("_", " ")}</span><span>{rupiah(m.amount)}</span></div>
          ))}
          {data.byPaymentMethod.length === 0 && <p className="text-sm text-neutral-500">{t("reports.noData", "Tidak ada data.")}</p>}
        </Card>
        <Card>
          <h2 className="font-medium mb-2">{t("reports.sales.discountTaxService", "Diskon, Pajak & Service Charge")}</h2>
          <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.sales.totalDiscount", "Total Diskon")}</span><span>{rupiah(data.totalDiscount)}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.sales.totalTax", "Total Pajak")}</span><span>{rupiah(data.totalTax)}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.sales.totalServiceCharge", "Total Service Charge")}</span><span>{rupiah(data.totalServiceCharge)}</span></div>
        </Card>
      </div>
    </div>
  );
}

function RentalTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJsonObject(`/api/reports/rental?${params}`).then(setData);
  };
  useEffect(load, [outletId]);
  if (!data) return null;

  const minutesLabel = t("reports.minutesSuffix", "menit");

  return (
    <div className="space-y-4">
      <DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("reports.rental.totalRevenue", "Total Pendapatan Rental")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(data.totalRevenue)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.rental.totalSessions", "Total Sesi Selesai")}</div><div className="text-xl font-bold">{data.totalSessions}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.rental.avgDuration", "Rata-rata Durasi")}</div><div className="text-xl font-bold">{data.avgDurationMinutes} {minutesLabel}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.rental.unitCount", "Jumlah Unit PS")}</div><div className="text-xl font-bold">{data.unitCount}</div></Card>
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("reports.rental.revenuePerUnit", "Pendapatan per Unit PS")}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("reports.table.unit", "Unit")}</th><th>{t("reports.table.type", "Tipe")}</th><th className="text-right">{t("reports.table.sessions", "Sesi")}</th><th className="text-right">{t("reports.rental.avgDuration", "Rata-rata Durasi")}</th><th className="text-right">{t("reports.table.revenue", "Pendapatan")}</th></tr></thead>
          <tbody>
            {data.perUnit.map((u: any) => (
              <tr key={u.unitId} className="border-b border-neutral-900">
                <td className="py-2">{u.unitName}</td>
                <td className="uppercase text-neutral-400">{u.consoleType}</td>
                <td className="text-right">{u.sessionsCount}</td>
                <td className="text-right">{u.avgDurationMinutes} {minutesLabel}</td>
                <td className="text-right font-medium">{rupiah(u.revenue)}</td>
              </tr>
            ))}
            {data.perUnit.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-neutral-500">{t("reports.rental.noSessions", "Belum ada sesi selesai pada periode ini.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/** Home Rental ("sewa dibawa pulang") revenue report — separate from RentalTab above, which is the in-house PS booth-session business. Covers every revenue category the owner sells by: sewa 12/24 jam/mingguan, TV, accessory, delivery/pickup jarak, denda keterlambatan, penggantian kerusakan, dan diskon — same getHomeRentalReports bundle the Home Rental module's own Laporan tab uses. */
function HomeRentalTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJsonObject(`/api/reports/home-rental?${params}`).then(setData);
  };
  useEffect(load, [outletId]);
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("reports.homeRental.totalRevenue", "Total Pendapatan Home Rental")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(data.revenue.totalAmount)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.homeRental.transactions", "Transaksi")}</div><div className="text-xl font-bold">{data.revenue.transactionCount}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.homeRental.lateFee", "Denda Keterlambatan")}</div><div className="text-xl font-bold text-amber-400">{rupiah(data.lateFeeReport.total)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.homeRental.damageFee", "Penggantian Kerusakan")}</div><div className="text-xl font-bold text-red-400">{rupiah(data.damageReport.total)}</div></Card>
      </div>

      <Card>
        <h2 className="font-medium mb-2">{t("reports.homeRental.revenueByCategory", "Rincian Pendapatan per Kategori")}</h2>
        <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.homeRental.rentalFeeLabel", "Sewa (12 jam / 24 jam / mingguan / tambahan hari)")}</span><span>{rupiah(data.revenue.rentalFee)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.homeRental.deliveryFee", "Biaya Antar (Delivery)")}</span><span>{rupiah(data.revenue.deliveryFee)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.homeRental.pickupFee", "Biaya Jemput (Pickup)")}</span><span>{rupiah(data.revenue.pickupFee)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.homeRental.lateFee", "Denda Keterlambatan")}</span><span>{rupiah(data.lateFeeReport.total)} <span className="text-neutral-500">({data.lateFeeReport.count}x)</span></span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.homeRental.damageFee", "Penggantian Kerusakan")}</span><span>{rupiah(data.damageReport.total)} <span className="text-neutral-500">({data.damageReport.count}x)</span></span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-neutral-400">{t("reports.homeRental.discount", "Diskon")}</span><span className="text-red-400">-{rupiah(data.revenue.discountAmount)}</span></div>
      </Card>

      <Card>
        <h2 className="font-medium mb-3">{t("reports.homeRental.revenueByType", "Pendapatan per Tipe Produk (PS3/PS4/PS5/Playbox/TV/Accessory/Package)")}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("reports.table.type", "Tipe")}</th><th className="text-right">{t("reports.table.transactionCount", "Jumlah Transaksi")}</th><th className="text-right">{t("reports.table.revenue", "Pendapatan")}</th></tr></thead>
          <tbody>
            {data.byProductType.map((pt: any) => (
              <tr key={pt.type} className="border-b border-neutral-900">
                <td className="py-2 capitalize">{pt.type}</td>
                <td className="text-right">{pt.count}</td>
                <td className="text-right font-medium">{rupiah(pt.revenue)}</td>
              </tr>
            ))}
            {data.byProductType.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-neutral-500">{t("reports.homeRental.noTransactions", "Belum ada transaksi Home Rental pada periode ini.")}</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="font-medium mb-2">{t("reports.homeRental.deposit", "Deposit")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-neutral-500">{t("reports.homeRental.depositHeld", "Ditahan")}</div><div className="font-medium">{rupiah(data.depositReport.held)}</div></div>
          <div><div className="text-xs text-neutral-500">{t("reports.homeRental.depositReleased", "Dilepas")}</div><div className="font-medium">{rupiah(data.depositReport.released)}</div></div>
          <div><div className="text-xs text-neutral-500">{t("reports.homeRental.depositPartial", "Dipotong Sebagian")}</div><div className="font-medium">{rupiah(data.depositReport.partiallyDeducted)}</div></div>
          <div><div className="text-xs text-neutral-500">{t("reports.homeRental.depositForfeited", "Hangus")}</div><div className="font-medium">{rupiah(data.depositReport.forfeited)}</div></div>
        </div>
      </Card>
    </div>
  );
}

function InventoryTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJsonObject(`/api/reports/inventory?${params}`).then(setData);
  };
  useEffect(load, [outletId]);
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={load} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("reports.inventory.productRevenue", "Pendapatan Produk")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(data.totalRevenue)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.inventory.totalCogs", "Total HPP")}</div><div className="text-xl font-bold">{rupiah(data.totalCogs)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.inventory.grossMargin", "Margin Kotor")}</div><div className={`text-xl font-bold ${data.totalMargin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rupiah(data.totalMargin)}</div></Card>
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("reports.inventory.marginPerProduct", "Margin per Produk")}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("reports.table.product", "Produk")}</th><th className="text-right">{t("reports.table.qtySold", "Qty Terjual")}</th><th className="text-right">{t("reports.table.revenue", "Pendapatan")}</th><th className="text-right">{t("reports.table.cogs", "HPP")}</th><th className="text-right">{t("reports.table.margin", "Margin")}</th><th className="text-right">{t("reports.table.marginPercent", "Margin %")}</th></tr></thead>
          <tbody>
            {data.perProduct.map((p: any) => (
              <tr key={p.productId} className="border-b border-neutral-900">
                <td className="py-2">{p.name}</td>
                <td className="text-right">{p.qty}</td>
                <td className="text-right">{rupiah(p.revenue)}</td>
                <td className="text-right">{rupiah(p.cogs)}</td>
                <td className={`text-right font-medium ${p.margin >= 0 ? "" : "text-red-400"}`}>{rupiah(p.margin)}</td>
                <td className="text-right">{p.marginPercent}%</td>
              </tr>
            ))}
            {data.perProduct.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-neutral-500">{t("reports.inventory.noProductSales", "Belum ada penjualan produk pada periode ini.")}</td></tr>}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-2">{t("reports.inventory.waste", "Waste / Kerusakan Stok")}</h2>
          {data.waste.length > 0 ? data.waste.map((w: any) => (
            <div key={w.productId} className="flex justify-between text-sm py-1"><span>{w.name}</span><span className="text-red-400">{w.qty}</span></div>
          )) : <p className="text-sm text-neutral-500">{t("reports.inventory.noWaste", "Tidak ada catatan waste pada periode ini.")}</p>}
        </Card>
        <Card>
          <h2 className="font-medium mb-2">{t("reports.inventory.lowStockNow", "Stok Menipis (Saat Ini)")}</h2>
          {data.lowStock.length > 0 ? data.lowStock.map((p: any) => (
            <div key={p.id} className="flex justify-between text-sm py-1"><span>{p.name}</span><span className="text-amber-400">{p.stockQty} / {t("reports.inventory.minShort", "min")} {p.lowStockThreshold}</span></div>
          )) : <p className="text-sm text-neutral-500">{t("reports.inventory.allStockSafe", "Semua stok aman.")}</p>}
        </Card>
      </div>
    </div>
  );
}

function CustomerTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJsonObject(`/api/reports/customers?${params}`).then(setData);
  };
  useEffect(load, [outletId]);
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("reports.customer.totalRegistered", "Total Pelanggan Terdaftar")}</div><div className="text-xl font-bold">{data.totalCustomers}</div></Card>
        <Card>
          <div className="text-xs text-neutral-500 mb-1">{t("reports.customer.tierDistribution", "Distribusi Membership Tier")}</div>
          <div className="flex flex-wrap gap-2">
            {data.tierDistribution.map((tier: any) => (
              <span key={tier.tierName} className="text-xs rounded-full border border-neutral-700 px-2 py-1">{tier.tierName}: {tier.count}</span>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("reports.customer.topCustomers", "Top Pelanggan (Total Belanja Sepanjang Waktu)")}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("reports.table.name", "Nama")}</th><th>{t("reports.table.tier", "Tier")}</th><th className="text-right">{t("reports.table.totalSpending", "Total Belanja")}</th><th className="text-right">{t("reports.table.loyaltyPoints", "Poin Loyalti")}</th><th className="text-right">{t("reports.table.visitsPeriod", "Kunjungan (Periode)")}</th></tr></thead>
          <tbody>
            {data.topCustomers.map((c: any) => (
              <tr key={c.customerId} className="border-b border-neutral-900">
                <td className="py-2">{c.name}</td>
                <td className="text-neutral-400">{c.tierName}</td>
                <td className="text-right font-medium">{rupiah(c.totalSpendingAllTime)}</td>
                <td className="text-right">{c.loyaltyPoints}</td>
                <td className="text-right">{c.visitsInPeriod}</td>
              </tr>
            ))}
            {data.topCustomers.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-neutral-500">{t("reports.customer.noCustomers", "Belum ada pelanggan.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/** All 9 requested Expense report views (Detail, by Category/Account/Supplier/Payment Method/Branch/Cost Center, Expense vs Revenue, Trend) from one /api/reports/expenses call. */
function ExpenseReportTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJsonObject(`/api/reports/expenses?${params}`).then(setData);
  };
  useEffect(load, [outletId]);
  if (!data) return null;

  const Breakdown = ({ title, rows }: { title: string; rows: any[] }) => (
    <Card>
      <h2 className="font-medium mb-2">{title}</h2>
      {rows.length > 0 ? rows.map((r: any) => (
        <div key={r.label} className="flex justify-between text-sm py-1"><span>{r.label} <span className="text-neutral-500">({r.count})</span></span><span>{rupiah(r.amount)}</span></div>
      )) : <p className="text-sm text-neutral-500">{t("reports.noData", "Tidak ada data.")}</p>}
    </Card>
  );

  return (
    <div className="space-y-4">
      <DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={load} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("reports.expense.total", "Total Expense")}</div><div className="text-xl font-bold text-red-400">{rupiah(data.totalExpense)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.expense.totalRevenueSamePeriod", "Total Revenue (periode sama)")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(data.totalRevenue)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.expense.vsRevenue", "Expense vs Revenue")}</div><div className="text-xl font-bold">{data.expenseToRevenueRatioPercent != null ? `${data.expenseToRevenueRatioPercent}%` : "-"}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("reports.expense.netProfitSamePeriod", "Laba Bersih (periode sama)")}</div><div className={`text-xl font-bold ${data.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rupiah(data.netProfit)}</div></Card>
      </div>

      <Card style={{ height: 260 }}>
        <h2 className="font-medium mb-2 text-sm text-neutral-400">{t("reports.expense.trend", "Expense Trend")}</h2>
        {data.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => rupiah(Number(v))} contentStyle={{ background: "#0d1326", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 8 }} />
              <Bar dataKey="amount" fill="url(#expenseBarGradient)" radius={[3, 3, 0, 0]} />
              <defs>
                <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-neutral-500">{t("reports.noDataPeriod", "Tidak ada data pada periode ini.")}</p>}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Breakdown title={t("reports.expense.byCategory", "Expense by Category")} rows={data.byCategory} />
        <Breakdown title={t("reports.expense.byAccount", "Expense by Account (COA)")} rows={data.byAccount} />
        <Breakdown title={t("reports.expense.bySupplier", "Expense by Supplier / Payee")} rows={data.bySupplier} />
        <Breakdown title={t("reports.expense.byPaymentMethod", "Expense by Payment Method")} rows={data.byPaymentMethod} />
        <Breakdown title={t("reports.expense.byBranch", "Expense by Branch")} rows={data.byBranch} />
        <Breakdown title={t("reports.expense.byCostCenter", "Expense by Cost Center / Unit PS")} rows={data.byCostCenter} />
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("reports.expense.detail", "Expense Detail")}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("reports.table.no", "No.")}</th><th>{t("reports.table.date", "Tanggal")}</th><th>{t("reports.table.account", "Akun")}</th><th>{t("reports.table.description", "Deskripsi")}</th><th>{t("reports.table.supplierPayee", "Supplier/Payee")}</th><th className="text-right">{t("reports.table.nominal", "Nominal")}</th><th>{t("reports.table.status", "Status")}</th></tr></thead>
          <tbody>
            {data.detail.slice(0, 100).map((e: any) => (
              <tr key={e.id} className="border-b border-neutral-900">
                <td className="py-2 font-mono text-xs">{e.expenseNumber}</td>
                <td className="text-xs">{new Date(e.expenseDate).toLocaleDateString("id-ID")}</td>
                <td className="text-xs">{e.accountLabel}</td>
                <td className="text-xs max-w-[220px] truncate" title={e.description}>{e.description || e.category}</td>
                <td className="text-xs">{e.supplierLabel || "-"}</td>
                <td className="text-right">{rupiah(e.amount + (e.taxAmount ?? 0))}</td>
                <td className="text-xs capitalize">{e.status.replace("_", " ")}</td>
              </tr>
            ))}
            {data.detail.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-neutral-500">{t("reports.expense.noExpenses", "Belum ada expense pada periode ini.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
