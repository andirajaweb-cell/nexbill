"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject, fetchJsonArray } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payments/labels";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-home-rental";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["Dashboard", "Booking", "Peta Tanggal", "Katalog Produk", "Aset", "Paket", "Risk & Approval", "Kebijakan", "Laporan"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL_KEYS: Record<Tab, { key: string; fallback: string }> = {
  "Dashboard": { key: "homeRental.tab.dashboard", fallback: "Dashboard" },
  "Booking": { key: "homeRental.tab.booking", fallback: "Booking" },
  "Peta Tanggal": { key: "homeRental.tab.dateMap", fallback: "Peta Tanggal" },
  "Katalog Produk": { key: "homeRental.tab.productCatalog", fallback: "Katalog Produk" },
  "Aset": { key: "homeRental.tab.assets", fallback: "Aset" },
  "Paket": { key: "homeRental.tab.packages", fallback: "Paket" },
  "Risk & Approval": { key: "homeRental.tab.riskApproval", fallback: "Risk & Approval" },
  "Kebijakan": { key: "homeRental.tab.policy", fallback: "Kebijakan" },
  "Laporan": { key: "homeRental.tab.reports", fallback: "Laporan" },
};

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  ps3: "PlayStation 3", ps4: "PlayStation 4", ps5: "PlayStation 5", playbook: "Playbox", tv32: 'TV 32"', tv40: 'TV 40"', tv43: 'TV 43"', accessory: "Accessory",
};
const PRODUCT_TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  ps3: { key: "homeRental.productType.ps3", fallback: "PlayStation 3" },
  ps4: { key: "homeRental.productType.ps4", fallback: "PlayStation 4" },
  ps5: { key: "homeRental.productType.ps5", fallback: "PlayStation 5" },
  playbook: { key: "homeRental.productType.playbook", fallback: "Playbox" },
  tv32: { key: "homeRental.productType.tv32", fallback: 'TV 32"' },
  tv40: { key: "homeRental.productType.tv40", fallback: 'TV 40"' },
  tv43: { key: "homeRental.productType.tv43", fallback: 'TV 43"' },
  accessory: { key: "homeRental.productType.accessory", fallback: "Accessory" },
};
const ASSET_STATUS_LABEL: Record<string, string> = {
  available: "Available", reserved: "Reserved", preparing: "Preparing", rented_out: "Rented Out", out_for_delivery: "Out for Delivery",
  returning: "Returning", inspection: "Inspection", damaged: "Damaged", missing: "Missing", repair: "Repair", retired: "Retired",
};
const ASSET_STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  available: { key: "homeRental.assetStatus.available", fallback: "Available" },
  reserved: { key: "homeRental.assetStatus.reserved", fallback: "Reserved" },
  preparing: { key: "homeRental.assetStatus.preparing", fallback: "Preparing" },
  rented_out: { key: "homeRental.assetStatus.rentedOut", fallback: "Rented Out" },
  out_for_delivery: { key: "homeRental.assetStatus.outForDelivery", fallback: "Out for Delivery" },
  returning: { key: "homeRental.assetStatus.returning", fallback: "Returning" },
  inspection: { key: "homeRental.assetStatus.inspection", fallback: "Inspection" },
  damaged: { key: "homeRental.assetStatus.damaged", fallback: "Damaged" },
  missing: { key: "homeRental.assetStatus.missing", fallback: "Missing" },
  repair: { key: "homeRental.assetStatus.repair", fallback: "Repair" },
  retired: { key: "homeRental.assetStatus.retired", fallback: "Retired" },
};
const ASSET_STATUS_BADGE: Record<string, string> = {
  available: "available", reserved: "pending", preparing: "pending", rented_out: "occupied", out_for_delivery: "occupied",
  returning: "pending", inspection: "pending", damaged: "failed", missing: "failed", repair: "maintenance", retired: "unknown",
};
const RENTAL_STATUS_LABEL: Record<string, string> = { booked: "Booked", active: "Active", returned: "Returned", cancelled: "Cancelled", no_show: "No-Show" };
const RENTAL_STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  booked: { key: "homeRental.rentalStatus.booked", fallback: "Booked" },
  active: { key: "homeRental.rentalStatus.active", fallback: "Active" },
  returned: { key: "homeRental.rentalStatus.returned", fallback: "Returned" },
  cancelled: { key: "homeRental.rentalStatus.cancelled", fallback: "Cancelled" },
  no_show: { key: "homeRental.rentalStatus.noShow", fallback: "No-Show" },
};
const RENTAL_STATUS_BADGE: Record<string, string> = { booked: "pending", active: "occupied", returned: "success", cancelled: "failed", no_show: "failed" };
const RISK_LEVEL_LABEL: Record<string, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi" };
const RISK_LEVEL_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  low: { key: "homeRental.riskLevel.low", fallback: "Rendah" },
  medium: { key: "homeRental.riskLevel.medium", fallback: "Sedang" },
  high: { key: "homeRental.riskLevel.high", fallback: "Tinggi" },
};
const RISK_LEVEL_BADGE: Record<string, string> = { low: "success", medium: "pending", high: "failed" };
// Customer Risk Score categories (see lib/home-rental/risk.ts computeRiskScore) — score is a
// TRUST score (higher = safer): 80-100 Aman, 60-79 Perlu Perhatian, 40-59 Risiko, <40 Tolak.
const RISK_CATEGORY_LABEL: Record<string, string> = { aman: "🟢 Aman", perhatian: "🟡 Perlu Perhatian", risiko: "🟠 Risiko", tolak: "🔴 Tolak" };
const RISK_CATEGORY_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  aman: { key: "homeRental.riskCategory.aman", fallback: "🟢 Aman" },
  perhatian: { key: "homeRental.riskCategory.perhatian", fallback: "🟡 Perlu Perhatian" },
  risiko: { key: "homeRental.riskCategory.risiko", fallback: "🟠 Risiko" },
  tolak: { key: "homeRental.riskCategory.tolak", fallback: "🔴 Tolak" },
};
const RISK_CATEGORY_BADGE: Record<string, string> = { aman: "success", perhatian: "pending", risiko: "maintenance", tolak: "failed" };
const RISK_CATEGORY_ADVICE: Record<string, string> = {
  aman: "Sangat aman — bisa deposit ringan.",
  perhatian: "Aman dengan deposit standar.",
  risiko: "Deposit lebih besar / pertimbangkan matang-matang sebelum menyewakan.",
  tolak: "Sebaiknya jangan disewakan.",
};
const RISK_CATEGORY_ADVICE_KEYS: Record<string, { key: string; fallback: string }> = {
  aman: { key: "homeRental.riskAdvice.aman", fallback: "Sangat aman — bisa deposit ringan." },
  perhatian: { key: "homeRental.riskAdvice.perhatian", fallback: "Aman dengan deposit standar." },
  risiko: { key: "homeRental.riskAdvice.risiko", fallback: "Deposit lebih besar / pertimbangkan matang-matang sebelum menyewakan." },
  tolak: { key: "homeRental.riskAdvice.tolak", fallback: "Sebaiknya jangan disewakan." },
};
const VERIFICATION_STATUS_LABEL: Record<string, string> = { unverified: "Belum Diverifikasi", verified: "Terverifikasi", flagged: "Ditandai Meragukan" };
const VERIFICATION_STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  unverified: { key: "homeRental.verificationStatus.unverified", fallback: "Belum Diverifikasi" },
  verified: { key: "homeRental.verificationStatus.verified", fallback: "Terverifikasi" },
  flagged: { key: "homeRental.verificationStatus.flagged", fallback: "Ditandai Meragukan" },
};

interface FeatureFlagRow { key: string; effectiveEnabled: boolean; }

export default function HomeRentalPage() {
  const { t } = useDashboardLang();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [outletId, setOutletId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const canManage = hasPermission(role, "manage_home_rental");

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  useEffect(() => {
    fetchJsonObject<{ flags: FeatureFlagRow[] }>("/api/feature-flags").then((d) => setEnabled(!!d?.flags.find((f) => f.key === "HOME_RENTAL_ENABLED")?.effectiveEnabled));
  }, []);

  if (enabled === false) {
    return (
      <Card className="space-y-2">
        <h1 className="gm-display text-xl font-bold gm-gradient-title">Home Rental</h1>
        <p className="text-sm text-neutral-400">{t("homeRental.disabledNotice", "Home Rental / Sewa Dibawa Pulang sedang nonaktif.")}</p>
        {isSuperRole(user?.role) ? (
          <p className="text-sm text-neutral-500">
            {t("homeRental.disabledEnablePrefix", "Aktifkan di ")}
            <Link href="/dashboard/settings" className="text-emerald-400 underline">{t("homeRental.disabledEnableLinkText", "Pengaturan > Feature Management")}</Link>
            {t("homeRental.disabledEnableSuffix", ".")}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">{t("homeRental.disabledContactAdmin", "Hubungi Owner/Superuser untuk mengaktifkannya.")}</p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("homeRental.pageTitle", "Home Rental — Sewa Dibawa Pulang")}</h1>
        <p className="text-sm text-neutral-500">{t("homeRental.pageSubtitle", "Booking, checkout, katalog produk & aset fisik, dan paket untuk rental konsol/TV yang dibawa pulang pelanggan.")}</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tb ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>{t(TAB_LABEL_KEYS[tb].key, TAB_LABEL_KEYS[tb].fallback)}</button>
        ))}
      </div>

      {!outletId ? null : tab === "Dashboard" ? (
        <DashboardTab outletId={outletId} />
      ) : tab === "Booking" ? (
        <BookingTab outletId={outletId} canManage={canManage} canApprove={hasPermission(role, "approve_requests")} />
      ) : tab === "Peta Tanggal" ? (
        <RentalCalendarTab outletId={outletId} />
      ) : tab === "Katalog Produk" ? (
        <ProductsTab outletId={outletId} canManage={canManage} />
      ) : tab === "Aset" ? (
        <AssetsTab outletId={outletId} canManage={canManage} />
      ) : tab === "Paket" ? (
        <PackagesTab outletId={outletId} canManage={canManage} />
      ) : tab === "Risk & Approval" ? (
        <RiskTab outletId={outletId} canManage={canManage} canApprove={hasPermission(role, "approve_requests")} />
      ) : tab === "Kebijakan" ? (
        <PolicyTab outletId={outletId} canManage={canManage} />
      ) : (
        <ReportsTab outletId={outletId} />
      )}
    </div>
  );
}

function DocUploadField({ label, url, uploading, onFile, onClear }: { label: string; url: string; uploading: boolean; onFile: (f: File) => void; onClear: () => void }) {
  const { t } = useDashboardLang();
  return (
    <div className="flex items-center gap-2">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
          <img src={url} alt={label} className="w-8 h-8 object-cover rounded border border-neutral-700" /> {t("homeRental.doc.view", "Lihat")}
        </a>
      ) : (
        <label className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer underline">
          {uploading ? t("homeRental.doc.uploading", "Mengunggah...") : t("homeRental.doc.uploadPrefix", "Upload {label}").replace("{label}", label)}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      {url && <button className="text-xs text-rose-400 hover:underline" onClick={onClear}>{t("homeRental.doc.remove", "Hapus")}</button>}
    </div>
  );
}

/** 1-5 star picker/display — used for the cashier's return-time customer rating and everywhere that rating is shown back (Risk & Approval "Penilaian Terakhir" + transaction history). */
function StarRating({ value, onChange, readOnly, size = "sm" }: { value: number; onChange?: (v: number) => void; readOnly?: boolean; size?: "xs" | "sm" | "md" }) {
  const sizeClass = size === "xs" ? "text-xs" : size === "md" ? "text-xl" : "text-base";
  return (
    <div className={`flex gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`leading-none ${n <= value ? "text-amber-400" : "text-neutral-700"} ${readOnly ? "cursor-default" : "hover:text-amber-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card className="space-y-1">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-2xl font-bold gm-display ${tone ?? "text-neutral-100"}`}>{value}</div>
    </Card>
  );
}

function DashboardTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [summary, setSummary] = useState<any>(null);
  const [printedRules, setPrintedRules] = useState<any[]>([]);
  useEffect(() => { fetchJsonObject(`/api/home-rental/dashboard?outletId=${outletId}`).then(setSummary); }, [outletId]);
  useEffect(() => { fetchJsonArray("/api/home-rental/policy?category=printed_rule").then(setPrintedRules); }, [outletId]);
  if (!summary) return <div className="text-sm text-neutral-500">{t("homeRental.common.loading", "Memuat...")}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label={t("homeRental.stat.activeRental", "Active Rental")} value={summary.activeRental} tone="text-emerald-400" />
        <StatCard label={t("homeRental.stat.availableAsset", "Available Asset")} value={summary.availableAsset} tone="text-cyan-400" />
        <StatCard label={t("homeRental.stat.reservedPending", "Reserved / Pending Pickup")} value={summary.reserved} tone="text-amber-400" />
        <StatCard label={t("homeRental.stat.dueToday", "Due Today")} value={summary.dueToday} tone="text-amber-400" />
        <StatCard label={t("homeRental.stat.overduePendingReturn", "Overdue / Pending Return")} value={summary.overdue} tone="text-rose-400" />
        <StatCard label={t("homeRental.stat.inspection", "Inspection")} value={summary.inspection} />
        <StatCard label={t("homeRental.stat.damageCase", "Damage Case")} value={summary.damageCase} />
        <StatCard label={t("homeRental.stat.missingAsset", "Missing Asset")} value={summary.missingAsset} tone="text-rose-400" />
        <StatCard label={t("homeRental.stat.securityDepositHeld", "Security Deposit Held")} value={rupiah(summary.securityDepositHeld)} tone="text-cyan-400" />
        <StatCard label={t("homeRental.stat.outstandingPayment", "Outstanding Payment")} value={rupiah(summary.outstandingPayment)} tone="text-rose-400" />
      </div>
      {printedRules.length > 0 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t("homeRental.dashboard.printedRulesTitle", "Aturan Rental (cetak & pasang di kasir)")}</h3>
            <span className="text-[10px] text-neutral-600">{t("homeRental.dashboard.editInPolicyTab", "Edit di tab Kebijakan")}</span>
          </div>
          <ol className="text-xs text-neutral-400 space-y-1 list-decimal list-inside">
            {printedRules.map((r) => (
              <li key={r.id}>
                <span className="text-neutral-300">{r.label}</span>
                {r.note && <span className="text-neutral-500"> — {r.note}</span>}
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Card>
        <p className="text-xs text-neutral-500">
          {t("homeRental.dashboard.inspectionComingSoon", 'Inspection dan Damage Case akan aktif di fase berikutnya (lihat toggle "Segera" di Settings > Feature Management).')}
        </p>
      </Card>
    </div>
  );
}

const RENTAL_TIMELINE_STATUS_COLOR: Record<string, string> = {
  booked: "bg-amber-500/40 border-amber-500/60",
  active: "bg-emerald-500/40 border-emerald-500/60",
  returned: "bg-neutral-700/40 border-neutral-600/60",
  cancelled: "bg-rose-900/20 border-rose-900/40",
  no_show: "bg-rose-900/20 border-rose-900/40",
};

function dateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** "Peta Tanggal Sewa" — a monthly calendar (which days have bookings) and a per-product timeline (which product is booked on which dates), both driven by the same rentals list. No external charting library — plain CSS grid, consistent with the rest of this file. */
function RentalCalendarTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [view, setView] = useState<"calendar" | "timeline">("calendar");
  const [rentals, setRentals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [timelineStart, setTimelineStart] = useState(() => dateOnly(new Date().toISOString()));

  useEffect(() => {
    fetchJsonArray(`/api/home-rental/rentals?outletId=${outletId}`).then(setRentals);
    fetchJsonArray(`/api/home-rental/products?outletId=${outletId}`).then(setProducts);
    fetchJsonArray(`/api/home-rental/packages?outletId=${outletId}`).then(setPackages);
  }, [outletId]);

  const activeRentals = rentals.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const itemName = (r: any) => (r.packageId ? packages.find((p) => p.id === r.packageId)?.name : products.find((p) => p.id === r.productId)?.name) ?? "—";

  const overlapsDay = (r: any, day: Date) => {
    const start = dateOnly(r.scheduledStart);
    const end = dateOnly(r.scheduledEnd);
    return day >= start && day <= end;
  };

  // --- Calendar grid for `month` ---
  const firstOfMonth = month;
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const gridDays: (Date | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const WEEKDAY_LABEL = [
    t("homeRental.calendar.weekday.sun", "Min"), t("homeRental.calendar.weekday.mon", "Sen"), t("homeRental.calendar.weekday.tue", "Sel"),
    t("homeRental.calendar.weekday.wed", "Rab"), t("homeRental.calendar.weekday.thu", "Kam"), t("homeRental.calendar.weekday.fri", "Jum"), t("homeRental.calendar.weekday.sat", "Sab"),
  ];
  const selectedDayRentals = selectedDay ? activeRentals.filter((r) => overlapsDay(r, selectedDay!)) : [];

  // --- Timeline: rows = products, columns = 14-day window from timelineStart ---
  const TIMELINE_DAYS = 14;
  const timelineDays = Array.from({ length: TIMELINE_DAYS }, (_, i) => addDays(timelineStart, i));
  const rentalsForProduct = (productId: string) => activeRentals.filter((r) => r.productId === productId || (r.packageId && packages.find((p) => p.id === r.packageId)?.items?.some((it: any) => it.productId === productId)));

  return (
    <div className="space-y-4">
      <div className="flex gap-1 text-xs">
        <button onClick={() => setView("calendar")} className={`px-2 py-1 rounded ${view === "calendar" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>{t("homeRental.calendar.viewMonthly", "Kalender Bulanan")}</button>
        <button onClick={() => setView("timeline")} className={`px-2 py-1 rounded ${view === "timeline" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>{t("homeRental.calendar.viewTimeline", "Timeline per Produk")}</button>
      </div>

      {view === "calendar" ? (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <button className="text-xs text-neutral-400 hover:text-neutral-200" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>&larr; {t("homeRental.calendar.prevMonth", "Sebelumnya")}</button>
              <div className="font-medium text-sm">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</div>
              <button className="text-xs text-neutral-400 hover:text-neutral-200" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>{t("homeRental.calendar.nextMonth", "Berikutnya")} &rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
              {WEEKDAY_LABEL.map((w) => <div key={w} className="py-1">{w}</div>)}
              {gridDays.map((d, idx) => {
                if (!d) return <div key={idx} />;
                const count = activeRentals.filter((r) => overlapsDay(r, d)).length;
                const isToday = sameDay(d, new Date());
                const isSelected = selectedDay && sameDay(d, selectedDay);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(d)}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 ${isSelected ? "border-emerald-500 bg-emerald-500/10" : isToday ? "border-cyan-500/60" : "border-neutral-800"} ${count > 0 ? "hover:bg-white/5" : ""}`}
                  >
                    <span className={`text-xs ${isToday ? "text-cyan-400" : "text-neutral-300"}`}>{d.getDate()}</span>
                    {count > 0 && <span className="text-[10px] px-1 rounded-full bg-emerald-500/20 text-emerald-400">{count}</span>}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="space-y-2">
            <div className="text-xs font-medium text-neutral-400">{selectedDay ? selectedDay.toLocaleDateString("id-ID", { dateStyle: "full" }) : t("homeRental.calendar.clickDateHint", "Klik tanggal untuk lihat booking")}</div>
            {selectedDayRentals.map((r) => (
              <div key={r.id} className="text-sm border-b border-neutral-900 pb-1">
                <div className="font-medium">{r.rentalCode} <Badge status={RENTAL_STATUS_BADGE[r.status] ?? "unknown"}>{RENTAL_STATUS_LABEL_KEYS[r.status] ? t(RENTAL_STATUS_LABEL_KEYS[r.status].key, RENTAL_STATUS_LABEL_KEYS[r.status].fallback) : r.status}</Badge></div>
                <div className="text-neutral-500 text-xs">{r.customerName || "—"} · {itemName(r)}</div>
              </div>
            ))}
            {selectedDay && selectedDayRentals.length === 0 && <p className="text-xs text-neutral-500">{t("homeRental.calendar.noBookingOnDate", "Tidak ada booking di tanggal ini.")}</p>}
          </Card>
        </div>
      ) : (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <button className="text-xs text-neutral-400 hover:text-neutral-200" onClick={() => setTimelineStart(addDays(timelineStart, -TIMELINE_DAYS))}>&larr; {t("homeRental.calendar.prevDays", "{n} hari sebelumnya").replace("{n}", String(TIMELINE_DAYS))}</button>
            <div className="font-medium text-sm">{timelineDays[0].toLocaleDateString("id-ID", { dateStyle: "medium" })} — {timelineDays[TIMELINE_DAYS - 1].toLocaleDateString("id-ID", { dateStyle: "medium" })}</div>
            <button className="text-xs text-neutral-400 hover:text-neutral-200" onClick={() => setTimelineStart(addDays(timelineStart, TIMELINE_DAYS))}>{t("homeRental.calendar.nextDays", "{n} hari berikutnya").replace("{n}", String(TIMELINE_DAYS))} &rarr;</button>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${140 + TIMELINE_DAYS * 40}px` }}>
              <div className="grid" style={{ gridTemplateColumns: `140px repeat(${TIMELINE_DAYS}, 40px)` }}>
                <div />
                {timelineDays.map((d, i) => (
                  <div key={i} className={`text-center text-[10px] py-1 ${sameDay(d, new Date()) ? "text-cyan-400" : "text-neutral-500"}`}>{d.getDate()}</div>
                ))}
                {products.filter((p) => p.isActive).map((p) => (
                  <Fragment key={p.id}>
                    <div className="text-xs text-neutral-400 py-1 pr-2 truncate">{p.name}</div>
                    {timelineDays.map((d, i) => {
                      const match = rentalsForProduct(p.id).find((r) => overlapsDay(r, d));
                      return (
                        <div key={i} className="p-0.5">
                          <div title={match ? `${match.rentalCode} — ${match.customerName || "—"} (${RENTAL_STATUS_LABEL_KEYS[match.status] ? t(RENTAL_STATUS_LABEL_KEYS[match.status].key, RENTAL_STATUS_LABEL_KEYS[match.status].fallback) : match.status})` : ""} className={`h-6 rounded border ${match ? RENTAL_TIMELINE_STATUS_COLOR[match.status] ?? "bg-neutral-700/40 border-neutral-600/60" : "border-neutral-900"}`} />
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500/60 inline-block" /> {t("homeRental.calendar.legendBooked", "Booked")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500/60 inline-block" /> {t("homeRental.calendar.legendActive", "Active")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-neutral-700/40 border border-neutral-600/60 inline-block" /> {t("homeRental.calendar.legendReturned", "Returned")}</span>
          </div>
          {products.filter((p) => p.isActive).length === 0 && <p className="text-xs text-neutral-500">{t("homeRental.calendar.noActiveProducts", "Belum ada produk aktif.")}</p>}
        </Card>
      )}
    </div>
  );
}

/** Duration-tiered rate fields shared by both Product and Package forms — see lib/home-rental/pricing.ts computeRentalFee for how these combine. All besides "Tarif per Hari" are optional; leaving them empty keeps the old "tarif harian x jumlah hari" behavior. */
function RateFieldset({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const { t } = useDashboardLang();
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.rate.daily", "Tarif per Hari / 24 Jam (Rp)")}</div>
        <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} /></label>
      <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.rate.overnight", "Tarif ~12 Jam / Semalam (Rp, opsional)")}</div>
        <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.overnightRate ?? ""} onChange={(e) => setForm({ ...form, overnightRate: e.target.value })} /></label>
      <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.rate.weekly", "Tarif Mingguan / 7 Hari (Rp, opsional)")}</div>
        <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.weeklyRate ?? ""} onChange={(e) => setForm({ ...form, weeklyRate: e.target.value })} /></label>
      <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.rate.extraDay", "Tarif Tambahan Hari ke-2 dst (Rp, opsional)")}</div>
        <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.extraDayRate ?? ""} onChange={(e) => setForm({ ...form, extraDayRate: e.target.value })} /></label>
    </div>
  );
}

const EMPTY_PRODUCT_FORM = { name: "", type: "ps5", dailyRate: 0, overnightRate: "", weeklyRate: "", extraDayRate: "", deliveryFee: 0, pickupFee: 0, defaultDepositAmount: 0, description: "" };

function ProductsTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const { t } = useDashboardLang();
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_PRODUCT_FORM);
  const [editing, setEditing] = useState<any>(null);

  const load = () => fetchJsonArray(`/api/home-rental/products?outletId=${outletId}`).then(setProducts);
  useEffect(() => { load(); }, [outletId]);

  const submit = async () => {
    if (!form.name) return showAlert(t("homeRental.product.nameRequired", "Nama produk wajib diisi."));
    const res = await fetch("/api/home-rental/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(EMPTY_PRODUCT_FORM);
    setShowForm(false);
    load();
  };

  const toggleActive = async (p: any) => {
    const res = await fetch(`/api/home-rental/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const submitEdit = async () => {
    const res = await fetch(`/api/home-rental/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("homeRental.common.closeForm", "Tutup Form") : t("homeRental.product.newButton", "+ Produk Baru")}</Button>
      )}
      {showForm && (
        <Card className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.nameLabel", "Nama Produk")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("homeRental.product.namePlaceholder", "mis. PlayStation 5")} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.typeLabel", "Tipe")}</div>
              <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(PRODUCT_TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
              </select></label>
          </div>
          <RateFieldset form={form} setForm={setForm} />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.depositDefault", "Deposit Default (Rp)")}</div>
              <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.defaultDepositAmount} onChange={(e) => setForm({ ...form, defaultDepositAmount: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.deliveryFee", "Biaya Antar (Rp, flat — kosongkan kalau pakai tarif jarak di Kebijakan)")}</div>
              <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.pickupFee", "Biaya Jemput (Rp)")}</div>
              <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.pickupFee} onChange={(e) => setForm({ ...form, pickupFee: e.target.value })} /></label>
          </div>
          <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.descriptionLabel", "Deskripsi")}</div>
            <textarea className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <Button onClick={submit}>{t("homeRental.product.saveButton", "Simpan Produk")}</Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((p) => (
          <Card key={p.id} className={`space-y-2 ${!p.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="font-medium">{p.name}</div>
              <Badge status={p.isActive ? "success" : "unknown"}>{p.isActive ? t("homeRental.common.active", "Aktif") : t("homeRental.common.inactive", "Nonaktif")}</Badge>
            </div>
            <div className="text-xs text-neutral-500">{PRODUCT_TYPE_LABEL_KEYS[p.type] ? t(PRODUCT_TYPE_LABEL_KEYS[p.type].key, PRODUCT_TYPE_LABEL_KEYS[p.type].fallback) : p.type}</div>
            <div className="text-sm">{rupiah(p.dailyRate)}{t("homeRental.product.perDay", "/hari")}{p.defaultDepositAmount > 0 && <span className="text-neutral-500"> · {t("homeRental.product.depositPrefix", "Deposit {amount}").replace("{amount}", rupiah(p.defaultDepositAmount))}</span>}</div>
            <div className="text-[11px] text-neutral-500 space-x-2">
              {p.overnightRate > 0 && <span>{rupiah(p.overnightRate)}{t("homeRental.product.per12h", "/12 jam")}</span>}
              {p.weeklyRate > 0 && <span>{rupiah(p.weeklyRate)}{t("homeRental.product.perWeek", "/minggu")}</span>}
              {p.extraDayRate > 0 && <span>+{rupiah(p.extraDayRate)}{t("homeRental.product.extraDaySuffix", "/hari tambahan")}</span>}
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => toggleActive(p)}>{p.isActive ? t("homeRental.product.deactivate", "Nonaktifkan") : t("homeRental.product.activate", "Aktifkan")}</Button>
                <button className="text-xs text-cyan-400 hover:underline" onClick={() => setEditing({ ...p, overnightRate: p.overnightRate ?? "", weeklyRate: p.weeklyRate ?? "", extraDayRate: p.extraDayRate ?? "" })}>{t("homeRental.product.editRate", "Edit Tarif")}</button>
              </div>
            )}
          </Card>
        ))}
        {products.length === 0 && <p className="text-sm text-neutral-500">{t("homeRental.product.emptyState", "Belum ada produk. Tambah produk dulu sebelum registrasi aset fisik.")}</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-md w-full space-y-3 my-8">
            <h3 className="font-medium">{t("homeRental.product.editRateModalTitle", "Edit Tarif — {name}").replace("{name}", editing.name)}</h3>
            <RateFieldset form={editing} setForm={setEditing} />
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.depositDefault", "Deposit Default (Rp)")}</div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editing.defaultDepositAmount} onChange={(e) => setEditing({ ...editing, defaultDepositAmount: e.target.value })} /></label>
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.deliveryFeeShort", "Biaya Antar (Rp, flat)")}</div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editing.deliveryFee} onChange={(e) => setEditing({ ...editing, deliveryFee: e.target.value })} /></label>
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.pickupFee", "Biaya Jemput (Rp)")}</div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editing.pickupFee} onChange={(e) => setEditing({ ...editing, pickupFee: e.target.value })} /></label>
            </div>
            <div className="flex gap-2">
              <Button onClick={submitEdit}>{t("homeRental.common.save", "Simpan")}</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>{t("homeRental.common.cancel", "Batal")}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AssetsTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const { t } = useDashboardLang();
  const [assets, setAssets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ productId: "", assetCode: "", serialNumber: "", model: "", purchaseCost: 0, condition: "good", location: "" });

  const load = () => {
    fetchJsonArray(`/api/home-rental/assets?outletId=${outletId}`).then(setAssets);
    fetchJsonArray(`/api/home-rental/products?outletId=${outletId}`).then(setProducts);
  };
  useEffect(() => { load(); }, [outletId]);

  const submit = async () => {
    if (!form.productId) return showAlert(t("homeRental.asset.selectProductFirst", "Pilih produk dulu."));
    if (!form.assetCode) return showAlert(t("homeRental.asset.codeRequired", "Kode aset wajib diisi (mis. PS5-001)."));
    const res = await fetch("/api/home-rental/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ productId: "", assetCode: "", serialNumber: "", model: "", purchaseCost: 0, condition: "good", location: "" });
    setShowForm(false);
    load();
  };

  const setStatus = async (a: any, status: string) => {
    const statusLabel = ASSET_STATUS_LABEL_KEYS[status] ? t(ASSET_STATUS_LABEL_KEYS[status].key, ASSET_STATUS_LABEL_KEYS[status].fallback) : status;
    if (!(await showConfirm(t("homeRental.asset.confirmStatusChange", 'Ubah status {code} menjadi "{status}"?').replace("{code}", a.assetCode).replace("{status}", statusLabel)))) return;
    const res = await fetch(`/api/home-rental/assets/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="space-y-4">
      {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("homeRental.common.closeForm", "Tutup Form") : t("homeRental.asset.newButton", "+ Aset Fisik Baru")}</Button>}
      {showForm && (
        <Card className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.asset.productLabel", "Produk")}</div>
              <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">{t("homeRental.common.selectProduct", "Pilih produk...")}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.asset.codeLabel", "Kode Aset")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value })} placeholder={t("homeRental.asset.codePlaceholder", "mis. PS5-001")} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.asset.serialLabel", "Serial Number")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.asset.modelLabel", "Model")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.asset.purchaseCostLabel", "Harga Beli (Rp)")}</div>
              <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.asset.locationLabel", "Lokasi")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("homeRental.asset.locationPlaceholder", "mis. Gudang A")} /></label>
          </div>
          <Button onClick={submit}>{t("homeRental.asset.saveButton", "Simpan Aset")}</Button>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
              <th className="py-2 pr-3">{t("homeRental.asset.tableCode", "Kode Aset")}</th><th className="py-2 pr-3">{t("homeRental.asset.tableProduct", "Produk")}</th><th className="py-2 pr-3">{t("homeRental.asset.tableSerial", "Serial")}</th>
              <th className="py-2 pr-3">{t("homeRental.asset.tableCondition", "Kondisi")}</th><th className="py-2 pr-3">{t("homeRental.asset.tableLocation", "Lokasi")}</th><th className="py-2 pr-3">{t("homeRental.asset.tableStatus", "Status")}</th>
              {canManage && <th className="py-2 pr-3">{t("homeRental.asset.tableAction", "Aksi")}</th>}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-neutral-900">
                <td className="py-2 pr-3 font-medium">{a.assetCode}</td>
                <td className="py-2 pr-3 text-neutral-400">{productName(a.productId)}</td>
                <td className="py-2 pr-3 text-neutral-500">{a.serialNumber || "—"}</td>
                <td className="py-2 pr-3 text-neutral-400 capitalize">{a.condition}</td>
                <td className="py-2 pr-3 text-neutral-500">{a.location || "—"}</td>
                <td className="py-2 pr-3"><Badge status={ASSET_STATUS_BADGE[a.status] ?? "unknown"}>{ASSET_STATUS_LABEL_KEYS[a.status] ? t(ASSET_STATUS_LABEL_KEYS[a.status].key, ASSET_STATUS_LABEL_KEYS[a.status].fallback) : a.status}</Badge></td>
                {canManage && (
                  <td className="py-2 pr-3">
                    {a.status === "available" && <button className="text-xs text-amber-400 hover:underline mr-2" onClick={() => setStatus(a, "repair")}>{t("homeRental.asset.repairAction", "Repair")}</button>}
                    {a.status === "available" && <button className="text-xs text-rose-400 hover:underline mr-2" onClick={() => setStatus(a, "missing")}>{t("homeRental.asset.missingAction", "Hilang")}</button>}
                    {a.status === "rented_out" && <button className="text-xs text-amber-400 hover:underline mr-2" onClick={() => setStatus(a, "damaged")}>{t("homeRental.asset.markDamaged", "Tandai Rusak")}</button>}
                    {a.status === "rented_out" && <button className="text-xs text-rose-400 hover:underline mr-2" onClick={() => setStatus(a, "missing")}>{t("homeRental.asset.markMissing", "Tandai Hilang")}</button>}
                    {["repair", "missing", "damaged"].includes(a.status) && <button className="text-xs text-emerald-400 hover:underline" onClick={() => setStatus(a, "available")}>{t("homeRental.asset.markAvailableAgain", "Tersedia Lagi")}</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {assets.length === 0 && <p className="text-sm text-neutral-500 mt-2">{t("homeRental.asset.emptyState", "Belum ada aset fisik terdaftar.")}</p>}
      </div>
    </div>
  );
}

const EMPTY_PACKAGE_FORM = { name: "", dailyRate: 0, overnightRate: "", weeklyRate: "", extraDayRate: "", deliveryFee: 0, pickupFee: 0, defaultDepositAmount: 0 };

function PackagesTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const { t } = useDashboardLang();
  const [packages, setPackages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_PACKAGE_FORM);
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([{ productId: "", quantity: 1 }]);
  const [editing, setEditing] = useState<any>(null);

  const load = () => {
    fetchJsonArray(`/api/home-rental/packages?outletId=${outletId}`).then(setPackages);
    fetchJsonArray(`/api/home-rental/products?outletId=${outletId}`).then(setProducts);
  };
  useEffect(() => { load(); }, [outletId]);

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "?";

  const submit = async () => {
    if (!form.name) return showAlert(t("homeRental.package.nameRequired", "Nama paket wajib diisi."));
    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) return showAlert(t("homeRental.package.needOneProduct", "Pilih minimal 1 produk untuk paket ini."));
    const res = await fetch("/api/home-rental/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, items: validItems }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(EMPTY_PACKAGE_FORM);
    setItems([{ productId: "", quantity: 1 }]);
    setShowForm(false);
    load();
  };

  const submitEdit = async () => {
    const res = await fetch(`/api/home-rental/packages/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("homeRental.common.closeForm", "Tutup Form") : t("homeRental.package.newButton", "+ Paket Baru")}</Button>}
      {showForm && (
        <Card className="space-y-3">
          <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.package.nameLabel", "Nama Paket")}</div>
            <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("homeRental.package.namePlaceholder", "mis. PS5 + TV 43")} /></label>
          <RateFieldset form={form} setForm={setForm} />
          <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.depositDefault", "Deposit Default (Rp)")}</div>
            <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.defaultDepositAmount} onChange={(e) => setForm({ ...form, defaultDepositAmount: e.target.value })} /></label>
          <div className="space-y-2">
            <div className="text-xs text-neutral-500">{t("homeRental.package.componentsLabel", "Komponen Paket")}</div>
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <select className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={it.productId} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, productId: e.target.value } : x))}>
                  <option value="">{t("homeRental.common.selectProduct", "Pilih produk...")}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min={1} className="w-20 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={it.quantity} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x))} />
              </div>
            ))}
            <Button variant="secondary" onClick={() => setItems([...items, { productId: "", quantity: 1 }])}>{t("homeRental.package.addComponent", "+ Tambah Komponen")}</Button>
          </div>
          <Button onClick={submit}>{t("homeRental.package.saveButton", "Simpan Paket")}</Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {packages.map((p) => (
          <Card key={p.id} className="space-y-2">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm">{rupiah(p.dailyRate)}{t("homeRental.product.perDay", "/hari")}</div>
            <div className="text-[11px] text-neutral-500 space-x-2">
              {p.overnightRate > 0 && <span>{rupiah(p.overnightRate)}{t("homeRental.product.per12h", "/12 jam")}</span>}
              {p.weeklyRate > 0 && <span>{rupiah(p.weeklyRate)}{t("homeRental.product.perWeek", "/minggu")}</span>}
              {p.extraDayRate > 0 && <span>+{rupiah(p.extraDayRate)}{t("homeRental.product.extraDaySuffix", "/hari tambahan")}</span>}
            </div>
            <div className="text-xs text-neutral-500">{(p.items ?? []).map((i: any) => `${productName(i.productId)} x${i.quantity}`).join(", ")}</div>
            {canManage && <button className="text-xs text-cyan-400 hover:underline" onClick={() => setEditing({ ...p, overnightRate: p.overnightRate ?? "", weeklyRate: p.weeklyRate ?? "", extraDayRate: p.extraDayRate ?? "" })}>{t("homeRental.product.editRate", "Edit Tarif")}</button>}
          </Card>
        ))}
        {packages.length === 0 && <p className="text-sm text-neutral-500">{t("homeRental.package.emptyState", "Belum ada paket.")}</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-md w-full space-y-3 my-8">
            <h3 className="font-medium">{t("homeRental.package.editRateModalTitle", "Edit Tarif — {name}").replace("{name}", editing.name)}</h3>
            <RateFieldset form={editing} setForm={setEditing} />
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.product.depositDefault", "Deposit Default (Rp)")}</div>
              <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editing.defaultDepositAmount} onChange={(e) => setEditing({ ...editing, defaultDepositAmount: e.target.value })} /></label>
            <div className="flex gap-2">
              <Button onClick={submitEdit}>{t("homeRental.common.save", "Simpan")}</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>{t("homeRental.common.cancel", "Batal")}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function BookingTab({ outletId, canManage, canApprove }: { outletId: string; canManage: boolean; canApprove: boolean }) {
  const { t } = useDashboardLang();
  const [rentals, setRentals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [pickMode, setPickMode] = useState<"product" | "package">("product");
  const emptyForm = {
    customerName: "", phone: "", address: "", productId: "", packageId: "", scheduledStart: "", scheduledEnd: "", deliveryMethod: "pickup_by_customer", deliveryAddress: "", distanceKm: "",
    customerIdentityNumber: "", customerIdentityImageUrl: "",
    studentIdNumber: "", studentIdImageUrl: "",
    parentName: "", parentIdentityNumber: "", parentIdentityImageUrl: "",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [items, setItems] = useState<{ name: string; quantity: number; note: string }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<any>(null);
  const [checkoutForm, setCheckoutForm] = useState<any>({ paymentMethod: "cash", depositPaymentMethod: "cash" });
  const [returnFor, setReturnFor] = useState<any>(null);
  const [returnForm, setReturnForm] = useState<any>({ lateFee: 0, lateFeePaymentMethod: "cash", checklistOk: false, rating: 0, ratingNote: "", damageFee: 0, damageNote: "", damageFeePaymentMethod: "cash" });
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [detailFor, setDetailFor] = useState<any>(null);
  const [methods, setMethods] = useState(PAYMENT_METHOD_OPTIONS); // starts with the static 8 as a safe default, replaced once the outlet's live catalog loads

  const load = () => {
    fetchJsonArray(`/api/home-rental/rentals?outletId=${outletId}`).then(setRentals);
    fetchJsonArray(`/api/home-rental/products?outletId=${outletId}`).then(setProducts);
    fetchJsonArray(`/api/home-rental/packages?outletId=${outletId}`).then(setPackages);
  };
  useEffect(() => {
    load();
    // Owner-editable payment methods (Pengaturan/Pembayaran) — same source POS and Rental use,
    // so checkout/deposit/late-fee at Home Rental always match what's actually configured for
    // this outlet instead of a hardcoded static list.
    fetchJsonArray(`/api/payment-methods?outletId=${outletId}`).then((rows) => {
      const active = rows.filter((m: any) => m.isActive);
      if (active.length > 0) setMethods(active.map((m: any) => ({ value: m.key, label: m.label })));
    });
  }, [outletId]);

  const uploadDoc = async (field: string, file: File | null) => {
    if (!file) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/home-rental/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm((f: any) => ({ ...f, [field]: data.url }));
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    if (returnFor) fetchJsonArray(`/api/home-rental/rentals/${returnFor.id}/items`).then(setReturnItems);
    else setReturnItems([]);
  }, [returnFor]);

  const submitBooking = async () => {
    if (!form.scheduledStart || !form.scheduledEnd) return showAlert(t("homeRental.booking.alertScheduleRequired", "Tanggal mulai & selesai wajib diisi."));
    if (pickMode === "product" && !form.productId) return showAlert(t("homeRental.booking.alertSelectProduct", "Pilih produk."));
    if (pickMode === "package" && !form.packageId) return showAlert(t("homeRental.booking.alertSelectPackage", "Pilih paket."));
    const body = {
      ...form,
      productId: pickMode === "product" ? form.productId : null,
      packageId: pickMode === "package" ? form.packageId : null,
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      distanceKm: form.deliveryMethod === "delivery" && form.distanceKm !== "" ? Number(form.distanceKm) : null,
      items: items.filter((i) => i.name.trim()),
    };
    const res = await fetch("/api/home-rental/rentals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(emptyForm);
    setItems([]);
    setShowForm(false);
    load();
    showAlert(t("homeRental.booking.createdToast", "Booking {code} dibuat. Lanjutkan ke Checkout saat pelanggan datang/aset dikirim.").replace("{code}", data.rentalCode));
  };

  const submitCheckout = async () => {
    const res = await fetch(`/api/home-rental/rentals/${checkoutFor.id}/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checkoutForm) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setCheckoutFor(null);
    load();
    showAlert(t("homeRental.booking.checkoutSuccessToast", "Checkout berhasil — aset dialokasikan, pembayaran & deposit tercatat."));
  };

  const submitReturn = async () => {
    if (!returnForm.checklistOk) return showAlert(t("homeRental.booking.alertChecklistFirst", "Konfirmasi dulu checklist perlengkapan sudah diperiksa."));
    if (!returnForm.rating) return showAlert(t("homeRental.booking.alertRatingRequired", "Berikan penilaian bintang (1-5) untuk pengembalian ini."));
    if (returnForm.damageFee > (returnFor?.depositAmount ?? 0) && !returnForm.damageFeePaymentMethod) {
      return showAlert(t("homeRental.booking.alertDamageFeeExceedsDeposit", "Biaya kerusakan melebihi deposit — pilih metode pembayaran sisa tagihan dulu."));
    }
    const res = await fetch(`/api/home-rental/rentals/${returnFor.id}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(returnForm) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setReturnFor(null);
    load();
    showAlert(t("homeRental.booking.returnSuccessToast", "Return berhasil — aset kembali Available, deposit dilepas, penilaian tersimpan ke Risk & Approval."));
  };

  const cancelBooking = async (r: any) => {
    if (!(await showConfirm(t("homeRental.booking.confirmCancel", "Batalkan booking {code}?").replace("{code}", r.rentalCode)))) return;
    const res = await fetch(`/api/home-rental/rentals/${r.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const decideApproval = async (r: any, decision: "approved" | "rejected") => {
    const confirmMsg = decision === "approved"
      ? t("homeRental.booking.confirmApprove", "Setujui booking berisiko tinggi {code}?").replace("{code}", r.rentalCode)
      : t("homeRental.booking.confirmReject", "Tolak (batalkan) booking {code}?").replace("{code}", r.rentalCode);
    if (!(await showConfirm(confirmMsg))) return;
    const res = await fetch(`/api/home-rental/rentals/${r.id}/approval`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-4">
      {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("homeRental.common.closeForm", "Tutup Form") : t("homeRental.booking.newButton", "+ Booking Baru")}</Button>}

      {showForm && (
        <Card className="space-y-3">
          <div className="flex gap-2 text-xs">
            <button onClick={() => setPickMode("product")} className={`px-2 py-1 rounded ${pickMode === "product" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>{t("homeRental.booking.singleProduct", "Produk Tunggal")}</button>
            <button onClick={() => setPickMode("package")} className={`px-2 py-1 rounded ${pickMode === "package" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>{t("homeRental.booking.package", "Paket")}</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.customerName", "Nama Pelanggan")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.phone", "No. HP")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="space-y-1 block sm:col-span-2"><div className="text-xs text-neutral-500">{t("homeRental.booking.address", "Alamat")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            {pickMode === "product" ? (
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.productLabel", "Produk")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">{t("homeRental.common.selectProduct", "Pilih produk...")}</option>
                  {products.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} — {rupiah(p.dailyRate)}{t("homeRental.product.perDay", "/hari")}</option>)}
                </select></label>
            ) : (
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.packageLabel", "Paket")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>
                  <option value="">{t("homeRental.booking.selectPackage", "Pilih paket...")}</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.name} — {rupiah(p.dailyRate)}{t("homeRental.product.perDay", "/hari")}</option>)}
                </select></label>
            )}
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.deliveryMethodLabel", "Metode Pengambilan")}</div>
              <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.deliveryMethod} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}>
                <option value="pickup_by_customer">{t("homeRental.booking.pickupByCustomer", "Ambil Sendiri di Toko")}</option>
                <option value="delivery">{t("homeRental.booking.delivery", "Diantar")}</option>
              </select></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.startLabel", "Mulai")}</div>
              <input type="datetime-local" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.endLabel", "Selesai (Rencana Kembali)")}</div>
              <input type="datetime-local" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} /></label>
            {form.deliveryMethod === "delivery" && (
              <>
                <label className="space-y-1 block sm:col-span-2"><div className="text-xs text-neutral-500">{t("homeRental.booking.deliveryAddress", "Alamat Pengantaran")}</div>
                  <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} /></label>
                <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.distanceKm", "Jarak dari Toko (km, opsional)")}</div>
                  <input type="number" min={0} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} placeholder={t("homeRental.booking.distancePlaceholder", "Kosongkan untuk pakai biaya antar flat produk")} /></label>
              </>
            )}
          </div>

          <div className="border-t border-neutral-800 pt-3 space-y-3">
            <div className="text-xs font-medium text-neutral-400">{t("homeRental.booking.identityDocsHeading", "Dokumen Identitas")}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-neutral-500">{t("homeRental.booking.customerIdNumber", "No. KTP Pelanggan")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.customerIdentityNumber} onChange={(e) => setForm({ ...form, customerIdentityNumber: e.target.value })} />
                <DocUploadField label={t("homeRental.doc.customerIdPhoto", "Foto KTP Pelanggan")} url={form.customerIdentityImageUrl} uploading={uploading === "customerIdentityImageUrl"} onFile={(f) => uploadDoc("customerIdentityImageUrl", f)} onClear={() => setForm({ ...form, customerIdentityImageUrl: "" })} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-500">{t("homeRental.booking.studentIdNumberOptional", "No. Kartu Pelajar (opsional)")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.studentIdNumber} onChange={(e) => setForm({ ...form, studentIdNumber: e.target.value })} />
                <DocUploadField label={t("homeRental.doc.studentIdPhoto", "Foto Kartu Pelajar")} url={form.studentIdImageUrl} uploading={uploading === "studentIdImageUrl"} onFile={(f) => uploadDoc("studentIdImageUrl", f)} onClear={() => setForm({ ...form, studentIdImageUrl: "" })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-xs text-neutral-500">{t("homeRental.booking.minorNote", "Untuk penyewa di bawah umur — data orang tua/wali (opsional)")}</div>
              </div>
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.parentName", "Nama Orang Tua/Wali")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></label>
              <div className="space-y-1">
                <div className="text-xs text-neutral-500">{t("homeRental.booking.parentIdNumber", "No. KTP Orang Tua/Wali")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.parentIdentityNumber} onChange={(e) => setForm({ ...form, parentIdentityNumber: e.target.value })} />
                <DocUploadField label={t("homeRental.doc.parentIdPhoto", "Foto KTP Orang Tua")} url={form.parentIdentityImageUrl} uploading={uploading === "parentIdentityImageUrl"} onFile={(f) => uploadDoc("parentIdentityImageUrl", f)} onClear={() => setForm({ ...form, parentIdentityImageUrl: "" })} />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-3 space-y-2">
            <div className="text-xs font-medium text-neutral-400">{t("homeRental.booking.itemsHeading", "Rincian Barang / Perlengkapan yang Disewa")}</div>
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <input className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.booking.itemNamePlaceholder", "mis. Kabel HDMI, Charger, Controller ekstra")} value={it.name} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                <input type="number" min={1} className="w-16 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={it.quantity} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x))} />
                <input className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.booking.itemNotePlaceholder", "Catatan (opsional)")} value={it.note} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, note: e.target.value } : x))} />
                <button className="text-xs text-rose-400 hover:underline" onClick={() => setItems(items.filter((_, i) => i !== idx))}>{t("homeRental.common.delete", "Hapus")}</button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setItems([...items, { name: "", quantity: 1, note: "" }])}>{t("homeRental.booking.addItemButton", "+ Tambah Barang")}</Button>
          </div>

          <Button onClick={submitBooking}>{t("homeRental.booking.createButton", "Buat Booking")}</Button>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
              <th className="py-2 pr-3">{t("homeRental.booking.tableCode", "Kode")}</th><th className="py-2 pr-3">{t("homeRental.booking.tableCustomer", "Pelanggan")}</th><th className="py-2 pr-3">{t("homeRental.booking.tableProductPackage", "Produk/Paket")}</th>
              <th className="py-2 pr-3">{t("homeRental.booking.tableSchedule", "Jadwal")}</th><th className="py-2 pr-3">{t("homeRental.booking.tableTotal", "Total")}</th><th className="py-2 pr-3">{t("homeRental.booking.tableStatus", "Status")}</th><th className="py-2 pr-3">{t("homeRental.booking.tableDetail", "Detail")}</th>
              {canManage && <th className="py-2 pr-3">{t("homeRental.booking.tableAction", "Aksi")}</th>}
            </tr>
          </thead>
          <tbody>
            {rentals.map((r) => (
              <tr key={r.id} className="border-b border-neutral-900">
                <td className="py-2 pr-3 font-medium">{r.rentalCode}</td>
                <td className="py-2 pr-3 text-neutral-400">{r.customerName || "—"}</td>
                <td className="py-2 pr-3 text-neutral-400">
                  {r.packageId ? packages.find((p) => p.id === r.packageId)?.name : products.find((p) => p.id === r.productId)?.name ?? "—"}
                </td>
                <td className="py-2 pr-3 text-neutral-500 text-xs">
                  {new Date(r.scheduledStart).toLocaleDateString("id-ID")} → {new Date(r.scheduledEnd).toLocaleDateString("id-ID")}
                </td>
                <td className="py-2 pr-3">{rupiah(r.totalAmount)}{r.depositAmount > 0 && <span className="text-neutral-500"> (+dep {rupiah(r.depositAmount)})</span>}</td>
                <td className="py-2 pr-3 space-x-1">
                  <Badge status={RENTAL_STATUS_BADGE[r.status] ?? "unknown"}>{RENTAL_STATUS_LABEL_KEYS[r.status] ? t(RENTAL_STATUS_LABEL_KEYS[r.status].key, RENTAL_STATUS_LABEL_KEYS[r.status].fallback) : r.status}</Badge>
                  {r.approvalStatus === "pending" && <Badge status="failed">{t("homeRental.booking.pendingApproval", "Menunggu Approval")}</Badge>}
                </td>
                <td className="py-2 pr-3">
                  <button className="text-xs text-neutral-400 hover:text-neutral-200 hover:underline" onClick={() => setDetailFor(r)}>{t("homeRental.booking.viewFill", "Lihat/Isi")}</button>
                </td>
                {canManage && (
                  <td className="py-2 pr-3 space-x-2">
                    {r.status === "booked" && r.approvalStatus === "pending" && canApprove && (
                      <>
                        <button className="text-xs text-emerald-400 hover:underline" onClick={() => decideApproval(r, "approved")}>{t("homeRental.booking.approve", "Setujui")}</button>
                        <button className="text-xs text-rose-400 hover:underline" onClick={() => decideApproval(r, "rejected")}>{t("homeRental.booking.reject", "Tolak")}</button>
                      </>
                    )}
                    {r.status === "booked" && r.approvalStatus === "pending" && !canApprove && <span className="text-xs text-neutral-600">{t("homeRental.booking.waitingOwnerManager", "Menunggu Owner/Manager")}</span>}
                    {r.status === "booked" && r.approvalStatus !== "pending" && <button className="text-xs text-emerald-400 hover:underline" onClick={() => { setCheckoutFor(r); setCheckoutForm({ paymentMethod: "cash", depositPaymentMethod: "cash" }); }}>{t("homeRental.booking.checkout", "Checkout")}</button>}
                    {r.status === "booked" && <button className="text-xs text-rose-400 hover:underline" onClick={() => cancelBooking(r)}>{t("homeRental.booking.cancelAction", "Batalkan")}</button>}
                    {r.status === "active" && <button className="text-xs text-cyan-400 hover:underline" onClick={() => { setReturnFor(r); setReturnForm({ lateFee: 0, lateFeePaymentMethod: "cash", checklistOk: false, rating: 0, ratingNote: "", damageFee: 0, damageNote: "", damageFeePaymentMethod: "cash" }); }}>{t("homeRental.booking.returnAction", "Return")}</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rentals.length === 0 && <p className="text-sm text-neutral-500 mt-2">{t("homeRental.booking.emptyState", "Belum ada booking Home Rental.")}</p>}
      </div>

      {checkoutFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full space-y-3">
            <h3 className="font-medium">{t("homeRental.checkout.title", "Checkout {code}").replace("{code}", checkoutFor.rentalCode)}</h3>
            <p className="text-xs text-neutral-500">{t("homeRental.checkout.totalLine", "Total: {total}").replace("{total}", rupiah(checkoutFor.totalAmount))}{checkoutFor.depositAmount > 0 && t("homeRental.checkout.plusDepositSuffix", " + Deposit {amount}").replace("{amount}", rupiah(checkoutFor.depositAmount))}</p>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.checkout.paymentMethodLabel", "Metode Pembayaran")}</div>
              <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={checkoutForm.paymentMethod} onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}>
                {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select></label>
            {checkoutFor.depositAmount > 0 && (
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.checkout.depositPaymentMethodLabel", "Metode Pembayaran Deposit")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={checkoutForm.depositPaymentMethod} onChange={(e) => setCheckoutForm({ ...checkoutForm, depositPaymentMethod: e.target.value })}>
                  {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select></label>
            )}
            <div className="flex gap-2">
              <Button onClick={submitCheckout}>{t("homeRental.checkout.confirmButton", "Konfirmasi Checkout")}</Button>
              <Button variant="secondary" onClick={() => setCheckoutFor(null)}>{t("homeRental.common.cancel", "Batal")}</Button>
            </div>
          </Card>
        </div>
      )}

      {returnFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-sm w-full space-y-3 my-8">
            <h3 className="font-medium">{t("homeRental.return.title", "Return {code}").replace("{code}", returnFor.rentalCode)}</h3>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.return.lateFeeLabel", "Denda Keterlambatan (Rp, opsional)")}</div>
              <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={returnForm.lateFee} onChange={(e) => setReturnForm({ ...returnForm, lateFee: Number(e.target.value) || 0 })} /></label>
            {returnForm.lateFee > 0 && (
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.return.lateFeeMethodLabel", "Metode Pembayaran Denda")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={returnForm.lateFeePaymentMethod} onChange={(e) => setReturnForm({ ...returnForm, lateFeePaymentMethod: e.target.value })}>
                  {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select></label>
            )}
            {returnFor.depositAmount > 0 && <p className="text-xs text-neutral-500">{t("homeRental.return.depositWillBeReleased", "Deposit {amount} akan dilepas penuh ke pelanggan via {method}.").replace("{amount}", rupiah(returnFor.depositAmount)).replace("{method}", returnFor.depositPaymentMethod ?? "cash")}</p>}

            <div className="border-t border-neutral-800 pt-2 space-y-1.5">
              <div className="text-xs font-medium text-neutral-400">{t("homeRental.return.checklistHeading", "Checklist Perlengkapan")}</div>
              {returnItems.length > 0 ? (
                <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                  {returnItems.map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-2">
                      <span className="text-neutral-400">{it.name} x{it.quantity}</span>
                      <span className={it.conditionOk ? "text-emerald-400" : "text-rose-400"}>{it.conditionOk ? t("homeRental.return.conditionOk", "Kondisi OK") : t("homeRental.return.needsAttention", "Perlu Perhatian")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-600">{t("homeRental.return.noItemsRecorded", "Tidak ada perlengkapan tercatat untuk rental ini.")}</p>
              )}
              <label className="flex items-start gap-2 text-xs pt-1">
                <input type="checkbox" className="mt-0.5" checked={returnForm.checklistOk} onChange={(e) => setReturnForm({ ...returnForm, checklistOk: e.target.checked })} />
                <span>{t("homeRental.return.checklistConfirmLabel", "Saya (kasir) sudah memeriksa seluruh perlengkapan/checklist di atas sebelum barang diterima kembali.")}</span>
              </label>
            </div>

            <div className="border-t border-neutral-800 pt-2 space-y-1.5">
              <div className="text-xs font-medium text-neutral-400">{t("homeRental.return.damageFeeHeading", "Biaya Kerusakan / Penggantian (Rp, opsional)")}</div>
              <input type="number" min={0} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={returnForm.damageFee} onChange={(e) => setReturnForm({ ...returnForm, damageFee: Number(e.target.value) || 0 })} />
              {returnForm.damageFee > 0 && (
                <>
                  <textarea
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
                    rows={2}
                    placeholder={t("homeRental.return.damageNotePlaceholder", "Catatan kerusakan (mis. analog kiri rusak, kabel HDMI hilang)")}
                    value={returnForm.damageNote}
                    onChange={(e) => setReturnForm({ ...returnForm, damageNote: e.target.value })}
                  />
                  {returnFor.depositAmount > 0 ? (
                    returnForm.damageFee > returnFor.depositAmount ? (
                      <>
                        <p className="text-xs text-amber-400">{t("homeRental.return.damageDeductsAllDepositNote", "Deposit {deposit} habis dipotong — sisa {remaining} ditagih tunai.").replace("{deposit}", rupiah(returnFor.depositAmount)).replace("{remaining}", rupiah(returnForm.damageFee - returnFor.depositAmount))}</p>
                        <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.return.damageRemainingMethodLabel", "Metode Pembayaran Sisa Kerusakan")}</div>
                          <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={returnForm.damageFeePaymentMethod} onChange={(e) => setReturnForm({ ...returnForm, damageFeePaymentMethod: e.target.value })}>
                            {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select></label>
                      </>
                    ) : (
                      <p className="text-xs text-neutral-500">{t("homeRental.return.damageDeductedFromDepositNote", "Dipotong dari deposit {deposit} — sisa deposit {remaining} tetap dilepas ke pelanggan.").replace("{deposit}", rupiah(returnFor.depositAmount)).replace("{remaining}", rupiah(returnFor.depositAmount - returnForm.damageFee))}</p>
                    )
                  ) : (
                    <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.return.damageMethodLabel", "Metode Pembayaran Kerusakan")}</div>
                      <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={returnForm.damageFeePaymentMethod} onChange={(e) => setReturnForm({ ...returnForm, damageFeePaymentMethod: e.target.value })}>
                        {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select></label>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-2 space-y-1.5">
              <div className="text-xs font-medium text-neutral-400">{t("homeRental.return.ratingHeading", "Penilaian Customer (wajib) — masuk ke Risk & Approval")}</div>
              <StarRating value={returnForm.rating} onChange={(v) => setReturnForm({ ...returnForm, rating: v })} size="md" />
              <textarea
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
                rows={2}
                placeholder={t("homeRental.return.ratingNotePlaceholder", "Catatan penilaian (opsional) — mis. kooperatif, barang kembali rapi, dsb.")}
                value={returnForm.ratingNote}
                onChange={(e) => setReturnForm({ ...returnForm, ratingNote: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submitReturn} disabled={!returnForm.checklistOk || !returnForm.rating}>{t("homeRental.return.confirmButton", "Konfirmasi Return")}</Button>
              <Button variant="secondary" onClick={() => setReturnFor(null)}>{t("homeRental.common.cancel", "Batal")}</Button>
            </div>
          </Card>
        </div>
      )}

      {detailFor && <RentalDetailModal rental={detailFor} canManage={canManage} onClose={() => setDetailFor(null)} />}
    </div>
  );
}

const IDENTITY_DOC_FIELDS: { key: string; numberKey: string; label: string }[] = [
  { key: "customerIdentityImageUrl", numberKey: "customerIdentityNumber", label: "KTP Pelanggan" },
  { key: "studentIdImageUrl", numberKey: "studentIdNumber", label: "Kartu Pelajar" },
  { key: "parentIdentityImageUrl", numberKey: "parentIdentityNumber", label: "KTP Orang Tua/Wali" },
];

/** Detail/verification panel for one rental — Dokumen (view + attach ID photos), Perlengkapan (itemized packing list CRUD), and the staff Verifikasi checklist (KTP/Kartu Pelajar/KTP Ortu/GetContact). */
function RentalDetailModal({ rental, canManage, onClose }: { rental: any; canManage: boolean; onClose: () => void }) {
  const { t } = useDashboardLang();
  const [tab, setTab] = useState<"dokumen" | "perlengkapan" | "verifikasi">("dokumen");
  const [current, setCurrent] = useState<any>(rental);
  const [docForm, setDocForm] = useState<any>({
    customerIdentityNumber: rental.customerIdentityNumber || "", customerIdentityImageUrl: rental.customerIdentityImageUrl || "",
    studentIdNumber: rental.studentIdNumber || "", studentIdImageUrl: rental.studentIdImageUrl || "",
    parentName: rental.parentName || "", parentIdentityNumber: rental.parentIdentityNumber || "", parentIdentityImageUrl: rental.parentIdentityImageUrl || "",
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, note: "" });
  const [verifyForm, setVerifyForm] = useState<any>({
    verifiedKtp: !!rental.verifiedKtp, verifiedStudentId: !!rental.verifiedStudentId, verifiedParentId: !!rental.verifiedParentId,
    verifiedGetContact: !!rental.verifiedGetContact, getContactResultName: rental.getContactResultName || "", verificationNote: rental.verificationNote || "",
  });

  const loadItems = () => fetchJsonArray(`/api/home-rental/rentals/${rental.id}/items`).then(setItems);
  useEffect(() => { loadItems(); }, [rental.id]);

  const uploadDoc = async (field: string, file: File | null) => {
    if (!file) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/home-rental/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setDocForm((f: any) => ({ ...f, [field]: data.url }));
    } finally {
      setUploading(null);
    }
  };

  const saveDocs = async () => {
    const res = await fetch(`/api/home-rental/rentals/${rental.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(docForm) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setCurrent(data);
    showAlert(t("homeRental.detail.docsSavedToast", "Dokumen tersimpan."));
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return showAlert(t("homeRental.detail.itemNameRequired", "Nama barang wajib diisi."));
    const res = await fetch(`/api/home-rental/rentals/${rental.id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newItem) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setNewItem({ name: "", quantity: 1, note: "" });
    loadItems();
  };

  const removeItem = async (itemId: string) => {
    await fetch(`/api/home-rental/rentals/${rental.id}/items/${itemId}`, { method: "DELETE" });
    loadItems();
  };

  const toggleItemCondition = async (item: any) => {
    await fetch(`/api/home-rental/rentals/${rental.id}/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conditionOk: !item.conditionOk }) });
    loadItems();
  };

  // Point 6 of the Customer Risk Control spec: "jangan hanya menulis PS4 lengkap" — every piece
  // needs its own numbered checklist line. This seeds the outlet's own editable checklist_item
  // policy (Kebijakan tab, see lib/home-rental/policy.ts) in one click so staff check off each
  // piece instead of typing a free-text list from scratch every time.
  const seedStandardChecklist = async () => {
    const template = await fetchJsonArray<any>("/api/home-rental/policy?category=checklist_item");
    for (const item of template) {
      await fetch(`/api/home-rental/rentals/${rental.id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: item.label, quantity: 1 }) });
    }
    loadItems();
  };

  const saveVerification = async () => {
    const res = await fetch(`/api/home-rental/rentals/${rental.id}/verify`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(verifyForm) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setCurrent(data);
    showAlert(t("homeRental.detail.checklistSavedToast", "Checklist verifikasi tersimpan."));
  };

  const allVerified = current.verifiedKtp && current.verifiedGetContact && (!docForm.studentIdImageUrl || current.verifiedStudentId) && (!docForm.parentIdentityImageUrl || current.verifiedParentId);

  const DETAIL_TAB_LABEL_KEYS: Record<"dokumen" | "perlengkapan" | "verifikasi", { key: string; fallback: string }> = {
    dokumen: { key: "homeRental.detail.tabDokumen", fallback: "dokumen" },
    perlengkapan: { key: "homeRental.detail.tabPerlengkapan", fallback: "perlengkapan" },
    verifikasi: { key: "homeRental.detail.tabVerifikasi", fallback: "verifikasi" },
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t("homeRental.detail.title", "Detail {code} — {customer}").replace("{code}", rental.rentalCode).replace("{customer}", rental.customerName || "—")}</h3>
          {allVerified ? <Badge status="success">{t("homeRental.detail.verified", "Terverifikasi")}</Badge> : <Badge status="pending">{t("homeRental.detail.incomplete", "Belum Lengkap")}</Badge>}
        </div>
        <div className="flex gap-1 border-b border-neutral-800 text-xs">
          {(["dokumen", "perlengkapan", "verifikasi"] as const).map((dt) => (
            <button key={dt} onClick={() => setTab(dt)} className={`px-3 py-2 capitalize ${tab === dt ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500"}`}>{t(DETAIL_TAB_LABEL_KEYS[dt].key, DETAIL_TAB_LABEL_KEYS[dt].fallback)}</button>
          ))}
        </div>

        {tab === "dokumen" && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-neutral-500">{t("homeRental.booking.customerIdNumber", "No. KTP Pelanggan")}</div>
                <input disabled={!canManage} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60" value={docForm.customerIdentityNumber} onChange={(e) => setDocForm({ ...docForm, customerIdentityNumber: e.target.value })} />
                {canManage && <DocUploadField label={t("homeRental.doc.customerIdPhoto", "Foto KTP Pelanggan")} url={docForm.customerIdentityImageUrl} uploading={uploading === "customerIdentityImageUrl"} onFile={(f) => uploadDoc("customerIdentityImageUrl", f)} onClear={() => setDocForm({ ...docForm, customerIdentityImageUrl: "" })} />}
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-500">{t("homeRental.detail.studentIdNumber", "No. Kartu Pelajar")}</div>
                <input disabled={!canManage} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60" value={docForm.studentIdNumber} onChange={(e) => setDocForm({ ...docForm, studentIdNumber: e.target.value })} />
                {canManage && <DocUploadField label={t("homeRental.doc.studentIdPhoto", "Foto Kartu Pelajar")} url={docForm.studentIdImageUrl} uploading={uploading === "studentIdImageUrl"} onFile={(f) => uploadDoc("studentIdImageUrl", f)} onClear={() => setDocForm({ ...docForm, studentIdImageUrl: "" })} />}
              </div>
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.booking.parentName", "Nama Orang Tua/Wali")}</div>
                <input disabled={!canManage} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60" value={docForm.parentName} onChange={(e) => setDocForm({ ...docForm, parentName: e.target.value })} /></label>
              <div className="space-y-1">
                <div className="text-xs text-neutral-500">{t("homeRental.booking.parentIdNumber", "No. KTP Orang Tua/Wali")}</div>
                <input disabled={!canManage} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60" value={docForm.parentIdentityNumber} onChange={(e) => setDocForm({ ...docForm, parentIdentityNumber: e.target.value })} />
                {canManage && <DocUploadField label={t("homeRental.doc.parentIdPhoto", "Foto KTP Orang Tua")} url={docForm.parentIdentityImageUrl} uploading={uploading === "parentIdentityImageUrl"} onFile={(f) => uploadDoc("parentIdentityImageUrl", f)} onClear={() => setDocForm({ ...docForm, parentIdentityImageUrl: "" })} />}
              </div>
            </div>
            {canManage && <Button onClick={saveDocs}>{t("homeRental.detail.saveDocsButton", "Simpan Dokumen")}</Button>}
          </div>
        )}

        {tab === "perlengkapan" && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">{t("homeRental.detail.checklistIntro", 'Checklist barang/perlengkapan yang keluar — jangan hanya tulis "PS4 lengkap", cek satu per satu.')}</p>
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm border-b border-neutral-900 py-1 gap-2">
                <label className="flex items-center gap-2 flex-1 min-w-0">
                  {canManage ? (
                    <input type="checkbox" checked={it.conditionOk} onChange={() => toggleItemCondition(it)} />
                  ) : (
                    <span className={it.conditionOk ? "text-emerald-400" : "text-rose-400"}>{it.conditionOk ? "✓" : "✗"}</span>
                  )}
                  <span className="truncate">{it.name} <span className="text-neutral-500">x{it.quantity}</span>{it.note && <span className="text-neutral-600 text-xs"> — {it.note}</span>}</span>
                </label>
                {canManage && <button className="text-xs text-rose-400 hover:underline shrink-0" onClick={() => removeItem(it.id)}>{t("homeRental.common.delete", "Hapus")}</button>}
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-neutral-500">{t("homeRental.detail.noItemsRecorded", "Belum ada barang/perlengkapan tercatat.")}</p>}
            {canManage && (
              <>
                {items.length === 0 && <button className="text-xs text-cyan-400 hover:underline" onClick={seedStandardChecklist}>{t("homeRental.detail.seedChecklistButton", "+ Isi Checklist Standar (Body, Serial, HDMI, Power, Controller, dst.)")}</button>}
                <div className="flex gap-2 pt-2">
                  <input className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.detail.itemNamePlaceholder", "Nama barang")} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                  <input type="number" min={1} className="w-16 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) || 1 })} />
                  <input className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.common.notes", "Catatan")} value={newItem.note} onChange={(e) => setNewItem({ ...newItem, note: e.target.value })} />
                  <Button variant="secondary" onClick={addItem}>{t("homeRental.detail.addButton", "+ Tambah")}</Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "verifikasi" && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500">{t("homeRental.detail.verificationIntro", "Checklist verifikasi staf sebelum aset diserahkan ke pelanggan.")}</p>
            <label className="flex items-center gap-2 text-sm"><input disabled={!canManage} type="checkbox" checked={verifyForm.verifiedKtp} onChange={(e) => setVerifyForm({ ...verifyForm, verifiedKtp: e.target.checked })} /> {t("homeRental.detail.verifyKtp", "KTP pelanggan sudah dicek & cocok dengan wajah/data")}</label>
            <label className="flex items-center gap-2 text-sm"><input disabled={!canManage} type="checkbox" checked={verifyForm.verifiedStudentId} onChange={(e) => setVerifyForm({ ...verifyForm, verifiedStudentId: e.target.checked })} /> {t("homeRental.detail.verifyStudentId", "Kartu Pelajar sudah dicek (jika ada)")}</label>
            <label className="flex items-center gap-2 text-sm"><input disabled={!canManage} type="checkbox" checked={verifyForm.verifiedParentId} onChange={(e) => setVerifyForm({ ...verifyForm, verifiedParentId: e.target.checked })} /> {t("homeRental.detail.verifyParentId", "KTP Orang Tua/Wali sudah dicek (jika di bawah umur)")}</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm"><input disabled={!canManage} type="checkbox" checked={verifyForm.verifiedGetContact} onChange={(e) => setVerifyForm({ ...verifyForm, verifiedGetContact: e.target.checked })} /> {t("homeRental.detail.verifyGetContact", "Nomor HP sudah dicek via aplikasi GetContact")}</label>
              {verifyForm.verifiedGetContact && (
                <input disabled={!canManage} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60 ml-6" style={{ width: "calc(100% - 1.5rem)" }} placeholder={t("homeRental.detail.getContactNamePlaceholder", "Nama yang muncul di GetContact")} value={verifyForm.getContactResultName} onChange={(e) => setVerifyForm({ ...verifyForm, getContactResultName: e.target.value })} />
              )}
            </div>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.detail.verificationNoteLabel", "Catatan Verifikasi")}</div>
              <textarea disabled={!canManage} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60" rows={2} value={verifyForm.verificationNote} onChange={(e) => setVerifyForm({ ...verifyForm, verificationNote: e.target.value })} /></label>
            {current.verifiedAt && <p className="text-xs text-neutral-600">{t("homeRental.detail.lastVerifiedAt", "Terakhir diverifikasi: {date}").replace("{date}", new Date(current.verifiedAt).toLocaleString("id-ID"))}</p>}
            {canManage && <Button onClick={saveVerification}>{t("homeRental.detail.saveChecklistButton", "Simpan Checklist")}</Button>}
          </div>
        )}

        <Button variant="secondary" onClick={onClose}>{t("homeRental.common.close", "Tutup")}</Button>
      </Card>
    </div>
  );
}

const IDENTITY_TYPE_LABEL: Record<string, string> = { ktp: "KTP", sim: "SIM", passport: "Paspor", other: "Lainnya" };
const IDENTITY_TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  ktp: { key: "homeRental.identityType.ktp", fallback: "KTP" },
  sim: { key: "homeRental.identityType.sim", fallback: "SIM" },
  passport: { key: "homeRental.identityType.passport", fallback: "Paspor" },
  other: { key: "homeRental.identityType.other", fallback: "Lainnya" },
};

function RiskTab({ outletId, canManage, canApprove }: { outletId: string; canManage: boolean; canApprove: boolean }) {
  const { t } = useDashboardLang();
  // Aturan Kerusakan is now the outlet's own editable "damage_rule" policy (see Kebijakan tab /
  // lib/home-rental/policy.ts) instead of a hardcoded list — reference only, not auto-charged.
  const [damageRules, setDamageRules] = useState<any[]>([]);
  useEffect(() => { fetchJsonArray("/api/home-rental/policy?category=damage_rule").then(setDamageRules); }, [outletId]);
  // Privacy requirement: this is a shared cross-outlet fraud/risk data bank, so it is deliberately
  // NOT a browsable list — /api/home-rental/risk returns [] with no query, and only returns the
  // matching customer(s) once staff actually search for one (see that route's comment). `results`
  // holds 0-8 candidate matches; `selected` is the one customer currently being reviewed in detail.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [checkForm, setCheckForm] = useState({ phone: "", customerName: "", identityType: "ktp", identityNumber: "", address: "" });
  const [editForm, setEditForm] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  // Transaction history for the selected customer — cross-outlet (see /api/home-rental/risk/history),
  // capped to 20/30/50 most recent, same privacy gate as the risk search itself (only loads once a
  // single customer is selected, never a bulk browse).
  const [history, setHistory] = useState<any[]>([]);
  const [historyLimit, setHistoryLimit] = useState(20);

  useEffect(() => {
    if (!selected?.phone) { setHistory([]); return; }
    fetchJsonArray(`/api/home-rental/risk/history?phone=${encodeURIComponent(selected.phone)}&limit=${historyLimit}`).then(setHistory);
  }, [selected?.phone, historyLimit]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSelected(null); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      fetchJsonArray(`/api/home-rental/risk?q=${encodeURIComponent(query.trim())}`)
        .then((rows) => { setResults(rows); if (rows.length === 1) setSelected(rows[0]); else setSelected(null); })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const refreshSelected = async (phone: string) => {
    const rows = await fetchJsonArray<any>(`/api/home-rental/risk?phone=${encodeURIComponent(phone)}`);
    if (rows[0]) setSelected(rows[0]);
  };

  const checkRisk = async () => {
    if (!checkForm.phone) return showAlert(t("homeRental.risk.phoneRequired", "Isi nomor HP dulu."));
    const res = await fetch("/api/home-rental/risk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checkForm) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setCheckForm({ phone: "", customerName: "", identityType: "ktp", identityNumber: "", address: "" });
    setQuery(data.phone);
  };

  const openEdit = (p: any) => {
    setEditForm({
      customerName: p.customerName || "", identityType: p.identityType || "ktp", identityNumber: p.identityNumber || "",
      address: p.address || "", idPhotoUrl: p.idPhotoUrl || "", selfieWithIdUrl: p.selfieWithIdUrl || "",
      waVerified: !!p.waVerified, addressVerified: !!p.addressVerified, depositRefused: !!p.depositRefused,
      verificationStatus: p.verificationStatus || "unverified",
      emergencyContactName: p.emergencyContactName || "", emergencyContactPhone: p.emergencyContactPhone || "", notes: p.notes || "",
    });
  };

  const uploadDoc = async (field: "idPhotoUrl" | "selfieWithIdUrl", file: File | null) => {
    if (!file) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/home-rental/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setEditForm((f: any) => ({ ...f, [field]: data.url }));
    } finally {
      setUploading(null);
    }
  };

  const submitEdit = async () => {
    const res = await fetch(`/api/home-rental/risk/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setEditForm(null);
    refreshSelected(data.phone);
  };

  const toggleBlacklist = async (p: any) => {
    const isBlacklisted = !p.isBlacklisted;
    const reason = isBlacklisted ? window.prompt(t("homeRental.risk.blacklistReasonPrompt", "Alasan blacklist (opsional):")) ?? undefined : undefined;
    if (isBlacklisted && !(await showConfirm(t("homeRental.risk.confirmBlacklist", "Blacklist nomor {phone}? Nomor ini tidak akan bisa booking Home Rental lagi selama diblokir.").replace("{phone}", p.phone)))) return;
    const res = await fetch(`/api/home-rental/risk/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlacklisted, blacklistReason: reason }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    refreshSelected(data.phone);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <p className="text-xs text-neutral-500">{t("homeRental.risk.scoreExplainPrefix", "Customer Risk Score dihitung dari kelengkapan identitas, verifikasi alamat/WA, dan riwayat sewa (telat, no-show, aset rusak/hilang) — bukan data rekening bank. Booking dari nomor kategori ")}<b>{t("homeRental.risk.riskWord", "Risiko")}</b>/<b>{t("homeRental.risk.tolakWord", "Tolak")}</b>{t("homeRental.risk.scoreExplainSuffix", " menunggu approval Owner/Manager sebelum Checkout.")}</p>
        <p className="text-xs text-cyan-300/80">{t("homeRental.risk.privacyNote", "Data ini bank data risiko/fraud lintas-outlet seluruh merchant NEXBILL se-Indonesia — tapi untuk menjaga privasi, tidak ditampilkan sebagai daftar. Cari No. HP/Nama/No. KTP untuk melihat SATU customer yang dituju. Ubah/blacklist hanya bisa untuk data milik outlet sendiri.")}</p>
        <input
          className="w-full sm:w-96 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
          placeholder={t("homeRental.risk.searchPlaceholder", "Cari No. HP / Nama / No. KTP untuk melihat 1 customer...")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canManage && (
          <details className="text-xs">
            <summary className="cursor-pointer text-cyan-400 hover:underline">{t("homeRental.risk.checkRegisterNewSummary", "+ Cek/Daftarkan Customer Baru")}</summary>
            <div className="grid sm:grid-cols-5 gap-2 mt-2">
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.risk.phonePlaceholder", "No. HP")} value={checkForm.phone} onChange={(e) => setCheckForm({ ...checkForm, phone: e.target.value })} />
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.risk.namePlaceholder", "Nama")} value={checkForm.customerName} onChange={(e) => setCheckForm({ ...checkForm, customerName: e.target.value })} />
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.risk.idNumberPlaceholder", "No. KTP")} value={checkForm.identityNumber} onChange={(e) => setCheckForm({ ...checkForm, identityNumber: e.target.value })} />
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("homeRental.risk.addressPlaceholder", "Alamat")} value={checkForm.address} onChange={(e) => setCheckForm({ ...checkForm, address: e.target.value })} />
              <Button variant="secondary" onClick={checkRisk}>{t("homeRental.risk.checkRegisterButton", "Cek / Daftarkan")}</Button>
            </div>
          </details>
        )}
      </Card>

      {searching && <p className="text-xs text-neutral-500">{t("homeRental.risk.searching", "Mencari...")}</p>}

      {!searching && query.trim() && results.length === 0 && (
        <p className="text-sm text-neutral-500">{t("homeRental.risk.noCustomerFound", 'Tidak ada customer dengan data itu. Kalau ini customer baru, gunakan "Cek/Daftarkan Customer Baru" di atas.')}</p>
      )}

      {!selected && results.length > 1 && (
        <Card className="space-y-1">
          <p className="text-xs text-neutral-500">{t("homeRental.risk.multipleMatches", "Beberapa kemungkinan cocok — pilih satu:")}</p>
          {results.map((p) => (
            <button key={p.id} type="button" className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-white/5 flex items-center justify-between gap-2" onClick={() => setSelected(p)}>
              <span>{p.customerName || t("homeRental.risk.noNameFallback", "(tanpa nama)")} — {p.phone} <span className="text-neutral-500">{p.outletName}</span></span>
              <Badge status={RISK_CATEGORY_BADGE[p.riskCategory] ?? "unknown"}>{RISK_CATEGORY_LABEL_KEYS[p.riskCategory] ? t(RISK_CATEGORY_LABEL_KEYS[p.riskCategory].key, RISK_CATEGORY_LABEL_KEYS[p.riskCategory].fallback) : p.riskCategory}</Badge>
            </button>
          ))}
        </Card>
      )}

      {selected && (
        <Card className="space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="font-medium">{selected.customerName || t("homeRental.risk.noNameFallback", "(tanpa nama)")} — {selected.phone}</div>
              <div className="text-xs text-neutral-500">{selected.identityNumber ? `${IDENTITY_TYPE_LABEL_KEYS[selected.identityType] ? t(IDENTITY_TYPE_LABEL_KEYS[selected.identityType].key, IDENTITY_TYPE_LABEL_KEYS[selected.identityType].fallback) : "ID"} ${selected.identityNumber}` : t("homeRental.risk.identityNotFilled", "Identitas belum diisi")} · {selected.outletName}{selected.isOwnOutlet && <span className="ml-1 text-[9px] text-cyan-300 border border-cyan-400/30 rounded px-1 py-0.5">{t("homeRental.risk.myOutletTag", "Outlet Saya")}</span>}</div>
              {selected.address && <div className="text-xs text-neutral-500">{t("homeRental.risk.addressLine", "Alamat: {address}").replace("{address}", selected.address)}</div>}
            </div>
            <div className="text-right space-y-1">
              <Badge status={RISK_CATEGORY_BADGE[selected.riskCategory] ?? "unknown"}>{RISK_CATEGORY_LABEL_KEYS[selected.riskCategory] ? t(RISK_CATEGORY_LABEL_KEYS[selected.riskCategory].key, RISK_CATEGORY_LABEL_KEYS[selected.riskCategory].fallback) : selected.riskCategory}</Badge>
              <div className="text-xs text-neutral-500">{t("homeRental.risk.scoreOutOf100", "Skor {score}/100").replace("{score}", String(selected.riskScore))}</div>
              {selected.isBlacklisted && <div><Badge status="failed">{t("homeRental.risk.blocked", "Diblokir")}</Badge></div>}
            </div>
          </div>
          <p className="text-xs text-neutral-400">{RISK_CATEGORY_ADVICE_KEYS[selected.riskCategory] ? t(RISK_CATEGORY_ADVICE_KEYS[selected.riskCategory].key, RISK_CATEGORY_ADVICE_KEYS[selected.riskCategory].fallback) : RISK_CATEGORY_ADVICE[selected.riskCategory]}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.identityComplete", "Identitas Lengkap")}</div><div>{selected.customerName && selected.identityNumber && selected.idPhotoUrl && selected.selfieWithIdUrl && selected.address ? `✅ ${t("homeRental.risk.yes", "Ya")}` : `❌ ${t("homeRental.risk.notYet", "Belum")}`}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.addressVerified", "Alamat Terverifikasi")}</div><div>{selected.addressVerified ? `✅ ${t("homeRental.risk.yes", "Ya")}` : `❌ ${t("homeRental.risk.notYet", "Belum")}`}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.waActive", "WA Aktif")}</div><div>{selected.waVerified ? `✅ ${t("homeRental.risk.yes", "Ya")}` : `❌ ${t("homeRental.risk.notYet", "Belum")}`}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.verificationStatusLabel", "Status Verifikasi")}</div><div>{VERIFICATION_STATUS_LABEL_KEYS[selected.verificationStatus] ? t(VERIFICATION_STATUS_LABEL_KEYS[selected.verificationStatus].key, VERIFICATION_STATUS_LABEL_KEYS[selected.verificationStatus].fallback) : selected.verificationStatus}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.totalRentals", "Total Sewa")}</div><div>{selected.totalRentals}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.lateNoShow", "Telat / No-Show")}</div><div>{selected.lateReturnCount} / {selected.noShowCount}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.damagedMissing", "Rusak / Hilang")}</div><div>{selected.damagedAssetCount} / {selected.missingAssetCount}</div></div>
            <div className="rounded-lg bg-white/5 px-2.5 py-2"><div className="text-neutral-500">{t("homeRental.risk.outstanding", "Tunggakan")}</div><div>{selected.outstandingAmount > 0 ? rupiah(selected.outstandingAmount) : "—"}</div></div>
          </div>

          <div className="rounded-lg bg-white/5 px-2.5 py-2 space-y-1">
            <div className="text-xs text-neutral-500">{t("homeRental.risk.lastAssessmentHeading", "Penilaian Terakhir (saat Return)")}</div>
            {selected.lastAssessmentAt ? (
              <>
                <div className="flex items-center gap-2">
                  <StarRating value={selected.lastAssessmentRating ?? 0} readOnly />
                  <span className="text-xs text-neutral-500">{new Date(selected.lastAssessmentAt).toLocaleString("id-ID")}</span>
                </div>
                <div className="text-xs text-neutral-400">{t("homeRental.risk.checklistLine", "Checklist: {status}").replace("{status}", selected.lastAssessmentChecklistOk ? `✅ ${t("homeRental.risk.checklistFullyChecked", "Diperiksa lengkap")}` : `❌ ${t("homeRental.risk.checklistNotConfirmed", "Belum dikonfirmasi")}`)}</div>
                {selected.lastAssessmentNote && <div className="text-xs text-neutral-500">{t("homeRental.risk.noteLine", "Catatan: {note}").replace("{note}", selected.lastAssessmentNote)}</div>}
              </>
            ) : (
              <p className="text-xs text-neutral-600">{t("homeRental.risk.noAssessmentYet", "Belum ada penilaian — muncul otomatis setelah rental pertama di-return.")}</p>
            )}
          </div>

          {selected.notes && <p className="text-xs text-neutral-400">{t("homeRental.risk.noteLine", "Catatan: {note}").replace("{note}", selected.notes)}</p>}

          <div className="flex gap-3">
            {canManage && selected.isOwnOutlet && <button className="text-xs text-cyan-400 hover:underline" onClick={() => openEdit(selected)}>{t("homeRental.risk.editIdentityLink", "Edit Identitas & Verifikasi")}</button>}
            {canApprove && selected.isOwnOutlet && (
              <button className={`text-xs hover:underline ${selected.isBlacklisted ? "text-emerald-400" : "text-rose-400"}`} onClick={() => toggleBlacklist(selected)}>
                {selected.isBlacklisted ? t("homeRental.risk.unblock", "Buka Blokir") : t("homeRental.risk.blacklist", "Blacklist")}
              </button>
            )}
            {!selected.isOwnOutlet && <span className="text-[10px] text-neutral-600">{t("homeRental.risk.otherOutletNote", "Data milik outlet lain — hanya bisa dilihat sebagai referensi, tidak bisa diubah.")}</span>}
          </div>
        </Card>
      )}

      {selected && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium">{t("homeRental.risk.recentHistoryHeading", "Riwayat Transaksi Terakhir")}</h3>
            <select
              className="text-xs bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1"
              value={historyLimit}
              onChange={(e) => setHistoryLimit(Number(e.target.value))}
            >
              <option value={20}>{t("homeRental.risk.last20", "20 transaksi terakhir")}</option>
              <option value={30}>{t("homeRental.risk.last30", "30 transaksi terakhir")}</option>
              <option value={50}>{t("homeRental.risk.last50", "50 transaksi terakhir")}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-800">
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableCode", "Kode")}</th>
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableOutlet", "Outlet")}</th>
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableItem", "Barang")}</th>
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableSchedule", "Jadwal")}</th>
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableStatus", "Status")}</th>
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableChecklist", "Checklist")}</th>
                  <th className="py-1.5 pr-3">{t("homeRental.risk.tableRating", "Penilaian")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-neutral-900">
                    <td className="py-1.5 pr-3 font-medium">{h.rentalCode}</td>
                    <td className="py-1.5 pr-3 text-neutral-400">{h.outletName}{h.isOwnOutlet && <span className="ml-1 text-[9px] text-cyan-300">{t("homeRental.risk.meTag", "(saya)")}</span>}</td>
                    <td className="py-1.5 pr-3 text-neutral-400">{h.itemName}</td>
                    <td className="py-1.5 pr-3 text-neutral-500">{new Date(h.scheduledStart).toLocaleDateString("id-ID")} → {new Date(h.scheduledEnd).toLocaleDateString("id-ID")}</td>
                    <td className="py-1.5 pr-3"><Badge status={RENTAL_STATUS_BADGE[h.status] ?? "unknown"}>{RENTAL_STATUS_LABEL_KEYS[h.status] ? t(RENTAL_STATUS_LABEL_KEYS[h.status].key, RENTAL_STATUS_LABEL_KEYS[h.status].fallback) : h.status}</Badge></td>
                    <td className="py-1.5 pr-3">{h.status === "returned" ? (h.returnChecklistOk ? "✅" : "❌") : "—"}</td>
                    <td className="py-1.5 pr-3">{h.returnRating ? <StarRating value={h.returnRating} readOnly size="xs" /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <p className="text-xs text-neutral-500 mt-1">{t("homeRental.risk.noHistory", "Belum ada transaksi tercatat untuk nomor ini.")}</p>}
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("homeRental.risk.damageRulesHeading", "Aturan Kerusakan & Tanggung Jawab")}</h3>
          {canManage && <span className="text-[10px] text-neutral-600">{t("homeRental.dashboard.editInPolicyTab", "Edit di tab Kebijakan")}</span>}
        </div>
        <div className="text-xs space-y-1">
          {damageRules.map((d) => (
            <div key={d.id} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
              <span className="text-neutral-300 font-medium sm:w-56 shrink-0">{d.label}</span>
              <span className="text-neutral-500">{d.note}</span>
            </div>
          ))}
          {damageRules.length === 0 && <p className="text-neutral-500">{t("homeRental.risk.noDamageRules", "Belum ada aturan kerusakan diatur.")}</p>}
        </div>
      </Card>

      {editForm && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-md w-full space-y-3 my-8">
            <h3 className="font-medium">{t("homeRental.risk.editModalTitle", "Edit Identitas & Verifikasi — {phone}").replace("{phone}", selected.phone)}</h3>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.fullNameLabel", "Nama Lengkap")}</div>
              <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} /></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.homeAddressLabel", "Alamat Tempat Tinggal")}</div>
              <textarea className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" rows={2} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.identityTypeLabel", "Tipe Identitas")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editForm.identityType} onChange={(e) => setEditForm({ ...editForm, identityType: e.target.value })}>
                  {Object.entries(IDENTITY_TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
                </select></label>
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.idNumberLabel", "No. KTP/SIM")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editForm.identityNumber} onChange={(e) => setEditForm({ ...editForm, identityNumber: e.target.value })} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DocUploadField label={t("homeRental.doc.idPhoto", "Foto KTP/SIM")} url={editForm.idPhotoUrl} uploading={uploading === "idPhotoUrl"} onFile={(f) => uploadDoc("idPhotoUrl", f)} onClear={() => setEditForm({ ...editForm, idPhotoUrl: "" })} />
              <DocUploadField label={t("homeRental.doc.selfieWithId", "Foto Pegang KTP")} url={editForm.selfieWithIdUrl} uploading={uploading === "selfieWithIdUrl"} onFile={(f) => uploadDoc("selfieWithIdUrl", f)} onClear={() => setEditForm({ ...editForm, selfieWithIdUrl: "" })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.emergencyContactLabel", "Kontak Darurat")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editForm.emergencyContactName} onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })} /></label>
              <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.emergencyPhoneLabel", "No. HP Kontak Darurat")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={editForm.waVerified} onChange={(e) => setEditForm({ ...editForm, waVerified: e.target.checked })} /> {t("homeRental.risk.waVerifiedCheckbox", "Nomor WA aktif dikonfirmasi")}</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={editForm.addressVerified} onChange={(e) => setEditForm({ ...editForm, addressVerified: e.target.checked })} /> {t("homeRental.risk.addressVerifiedCheckbox", "Alamat terverifikasi (jelas, dalam radius ±10-15km)")}</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={editForm.depositRefused} onChange={(e) => setEditForm({ ...editForm, depositRefused: e.target.checked })} /> {t("homeRental.risk.depositRefusedCheckbox", "Customer menolak bayar deposit")}</label>
            </div>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.risk.verificationStatusLabel", "Status Verifikasi")}</div>
              <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={editForm.verificationStatus} onChange={(e) => setEditForm({ ...editForm, verificationStatus: e.target.value })}>
                {Object.entries(VERIFICATION_STATUS_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
              </select></label>
            <label className="space-y-1 block"><div className="text-xs text-neutral-500">{t("homeRental.common.notes", "Catatan")}</div>
              <textarea className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></label>
            <div className="flex gap-2">
              <Button onClick={submitEdit}>{t("homeRental.common.save", "Simpan")}</Button>
              <Button variant="secondary" onClick={() => setEditForm(null)}>{t("homeRental.common.cancel", "Batal")}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const POLICY_PRODUCT_TYPE_LABEL: Record<string, string> = { any: "Semua Tipe", ...PRODUCT_TYPE_LABEL };
const POLICY_PRODUCT_TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  any: { key: "homeRental.productType.any", fallback: "Semua Tipe" },
  ...PRODUCT_TYPE_LABEL_KEYS,
};

/**
 * Generic editable list for one Home Rental policy category (Kebijakan tab) — Customer Risk
 * Score weights, deposit loyalty tiers, late-fee tiers, damage rules, standard checklist, printed
 * rules. Every outlet gets sane defaults seeded server-side on first load (see
 * lib/home-rental/policy.ts) and can freely edit/add/deactivate/delete rows from here — this
 * component just renders whichever columns are relevant to the category via the `show*` props.
 */
function PolicyRuleSection({
  outletId, canManage, category, title, description,
  showProductType, showThreshold, thresholdLabel, showNumeric, numericLabel, numericStep, numericPlaceholder,
  showChargeFullDay, showNote, notePlaceholder,
}: {
  outletId: string; canManage: boolean; category: string; title: string; description?: string;
  showProductType?: boolean; showThreshold?: boolean; thresholdLabel?: string;
  showNumeric?: boolean; numericLabel?: string; numericStep?: number; numericPlaceholder?: string;
  showChargeFullDay?: boolean; showNote?: boolean; notePlaceholder?: string;
}) {
  const { t } = useDashboardLang();
  const [rules, setRules] = useState<any[]>([]);
  const emptyNew = { label: "", productType: "any", numericValue: 0, threshold: "", chargeFullDay: false, note: "" };
  const [newRule, setNewRule] = useState<any>(emptyNew);

  const load = () => fetchJsonArray(`/api/home-rental/policy?category=${category}${canManage ? "&includeInactive=1" : ""}`).then(setRules);
  useEffect(() => { load(); }, [outletId, category, canManage]);

  const addRule = async () => {
    if (!newRule.label.trim()) return showAlert(t("homeRental.policy.labelRequired", "Label wajib diisi."));
    const res = await fetch("/api/home-rental/policy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, ...newRule, threshold: newRule.threshold === "" ? null : Number(newRule.threshold), sortOrder: rules.length }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setNewRule(emptyNew);
    load();
  };

  const patchRule = async (id: string, patch: any) => {
    const res = await fetch(`/api/home-rental/policy/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const deleteRule = async (id: string) => {
    if (!(await showConfirm(t("homeRental.policy.confirmDelete", "Hapus aturan ini? Kalau cuma mau nonaktifkan sementara, matikan toggle Aktif saja.")))) return;
    await fetch(`/api/home-rental/policy/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="text-xs text-neutral-500">{description}</p>}
      <div className="space-y-1.5">
        {rules.map((r) => (
          <div key={r.id} className={`flex flex-wrap items-center gap-1.5 text-xs border-b border-neutral-900 py-1.5 ${!r.isActive ? "opacity-40" : ""}`}>
            {canManage ? (
              <input className="flex-1 min-w-[160px] rounded bg-neutral-800 border border-neutral-700 px-2 py-1" defaultValue={r.label} onBlur={(e) => e.target.value !== r.label && patchRule(r.id, { label: e.target.value })} />
            ) : (
              <span className="flex-1 min-w-[160px]">{r.label}</span>
            )}
            {showProductType && (canManage ? (
              <select className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1" defaultValue={r.productType ?? "any"} onChange={(e) => patchRule(r.id, { productType: e.target.value })}>
                {Object.entries(POLICY_PRODUCT_TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
              </select>
            ) : <span className="text-neutral-500">{POLICY_PRODUCT_TYPE_LABEL_KEYS[r.productType] ? t(POLICY_PRODUCT_TYPE_LABEL_KEYS[r.productType].key, POLICY_PRODUCT_TYPE_LABEL_KEYS[r.productType].fallback) : r.productType}</span>)}
            {showThreshold && (canManage ? (
              <input type="number" className="w-24 rounded bg-neutral-800 border border-neutral-700 px-2 py-1" defaultValue={r.threshold ?? ""} placeholder={thresholdLabel} onBlur={(e) => patchRule(r.id, { threshold: e.target.value === "" ? null : Number(e.target.value) })} />
            ) : <span className="text-neutral-500">{thresholdLabel}: {r.threshold ?? "—"}</span>)}
            {showNumeric && (canManage ? (
              <input type="number" step={numericStep ?? 1} className="w-24 rounded bg-neutral-800 border border-neutral-700 px-2 py-1" defaultValue={r.numericValue} placeholder={numericPlaceholder} onBlur={(e) => patchRule(r.id, { numericValue: Number(e.target.value) })} />
            ) : <span className={r.numericValue < 0 ? "text-rose-400" : "text-emerald-400"}>{numericLabel}: {r.numericValue}</span>)}
            {showChargeFullDay && (canManage ? (
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!r.chargeFullDay} onChange={(e) => patchRule(r.id, { chargeFullDay: e.target.checked })} /> {t("homeRental.policy.extraDayCheckbox", "1 hari tambahan")}</label>
            ) : r.chargeFullDay ? <span className="text-amber-400">{t("homeRental.policy.extraDayCheckbox", "1 hari tambahan")}</span> : null)}
            {showNote && (canManage ? (
              <input className="flex-1 min-w-[180px] rounded bg-neutral-800 border border-neutral-700 px-2 py-1" defaultValue={r.note ?? ""} placeholder={notePlaceholder ?? t("homeRental.common.notes", "Catatan")} onBlur={(e) => patchRule(r.id, { note: e.target.value })} />
            ) : r.note ? <span className="text-neutral-500 flex-1 min-w-[180px]">{r.note}</span> : null)}
            {canManage && (
              <>
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.isActive} onChange={(e) => patchRule(r.id, { isActive: e.target.checked })} /> {t("homeRental.policy.activeCheckbox", "Aktif")}</label>
                <button className="text-rose-400 hover:underline" onClick={() => deleteRule(r.id)}>{t("homeRental.common.delete", "Hapus")}</button>
              </>
            )}
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-neutral-500">{t("homeRental.policy.noRules", "Belum ada aturan.")}</p>}
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          <input className="flex-1 min-w-[160px] rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-xs" placeholder={t("homeRental.policy.newRuleLabelPlaceholder", "Label aturan baru")} value={newRule.label} onChange={(e) => setNewRule({ ...newRule, label: e.target.value })} />
          {showProductType && (
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-xs" value={newRule.productType} onChange={(e) => setNewRule({ ...newRule, productType: e.target.value })}>
              {Object.entries(POLICY_PRODUCT_TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
            </select>
          )}
          {showThreshold && <input type="number" className="w-24 rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-xs" placeholder={thresholdLabel} value={newRule.threshold} onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })} />}
          {showNumeric && <input type="number" step={numericStep ?? 1} className="w-28 rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-xs" placeholder={numericPlaceholder ?? numericLabel} value={newRule.numericValue} onChange={(e) => setNewRule({ ...newRule, numericValue: Number(e.target.value) })} />}
          {showChargeFullDay && (
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newRule.chargeFullDay} onChange={(e) => setNewRule({ ...newRule, chargeFullDay: e.target.checked })} /> {t("homeRental.policy.extraDayCheckbox", "1 hari tambahan")}</label>
          )}
          {showNote && <input className="flex-1 min-w-[180px] rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-xs" placeholder={notePlaceholder ?? "Catatan"} value={newRule.note} onChange={(e) => setNewRule({ ...newRule, note: e.target.value })} />}
          <Button variant="secondary" className="text-xs" onClick={addRule}>+ Tambah</Button>
        </div>
      )}
    </Card>
  );
}

function PolicyTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const { t } = useDashboardLang();
  return (
    <div className="space-y-4">
      <Card className="space-y-1">
        <h2 className="text-sm font-medium">{t("homeRental.policy.pageHeading", "Kebijakan Rental Dibawa Pulang")}</h2>
        <p className="text-xs text-neutral-500">
          {t("homeRental.policy.pageIntro", "Ini aturan default yang membantu — setiap outlet bebas mengedit, menambah, menonaktifkan, atau menghapus sesuai kebijakan sendiri. Angka di sini otomatis dipakai untuk menghitung Customer Risk Score dan saran deposit/denda keterlambatan.")}
        </p>
      </Card>
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="risk_weight"
        title={t("homeRental.policy.riskWeightTitle", "Bobot Skor Risiko Customer (Customer Risk Score)")}
        description={t("homeRental.policy.riskWeightDesc", "Poin per faktor. Total faktor positif default = 100. Nonaktifkan atau ubah poin sesuai kebijakan outlet.")}
        showNumeric numericLabel={t("homeRental.policy.riskWeightNumericLabel", "Poin")} numericPlaceholder={t("homeRental.policy.riskWeightNumericPlaceholder", "Poin (+/-)")}
      />
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="deposit_loyalty_tier"
        title={t("homeRental.policy.depositLoyaltyTitle", "Deposit Loyalty (Customer Lama)")}
        description={t("homeRental.policy.depositLoyaltyDesc", "Diskon deposit untuk customer dengan riwayat sewa lancar — nilai adalah fraksi dari deposit dasar produk/paket (mis. 0.65 = 65% dari deposit dasar).")}
        showThreshold thresholdLabel={t("homeRental.policy.depositLoyaltyThresholdLabel", "Min. Riwayat Sewa Lancar")}
        showNumeric numericLabel={t("homeRental.policy.depositLoyaltyNumericLabel", "Fraksi Deposit")} numericStep={0.05} numericPlaceholder="0.65"
      />
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="late_fee_tier"
        title={t("homeRental.policy.lateFeeTierTitle", "Tarif Keterlambatan")}
        description={t("homeRental.policy.lateFeeTierDesc", "Per tipe produk & rentang jam telat. Centang '1 hari tambahan' untuk tier terakhir (dihitung dari tarif harian produk, bukan nominal tetap).")}
        showProductType
        showThreshold thresholdLabel={t("homeRental.policy.lateFeeThresholdLabel", "Maks. Jam Telat")}
        showNumeric numericLabel={t("homeRental.policy.lateFeeNumericLabel", "Denda (Rp)")} numericStep={1000} numericPlaceholder={t("homeRental.policy.lateFeeNumericPlaceholder", "Denda Rp")}
        showChargeFullDay
      />
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="delivery_distance_tier"
        title={t("homeRental.policy.deliveryDistanceTitle", "Biaya Antar-Jemput per Jarak")}
        description={t("homeRental.policy.deliveryDistanceDesc", "Dipakai otomatis saat booking Delivery kalau kasir mengisi jarak (km) — kosongkan 'Maks. Jarak' pada baris terakhir untuk tier tanpa batas atas.")}
        showThreshold thresholdLabel={t("homeRental.policy.deliveryDistanceThresholdLabel", "Maks. Jarak (km)")}
        showNumeric numericLabel={t("homeRental.policy.deliveryDistanceNumericLabel", "Biaya (Rp)")} numericStep={1000} numericPlaceholder={t("homeRental.policy.deliveryDistanceNumericPlaceholder", "Biaya Rp")}
      />
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="damage_rule"
        title={t("homeRental.policy.damageRuleTitle", "Aturan Kerusakan & Tanggung Jawab")}
        description={t("homeRental.policy.damageRuleDesc", "Referensi untuk staf saat menilai kerusakan — bukan pemotongan deposit otomatis.")}
        showNote notePlaceholder={t("homeRental.policy.damageRuleNotePlaceholder", "Tindakan/tanggung jawab")}
      />
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="checklist_item"
        title={t("homeRental.policy.checklistItemTitle", "Checklist Standar Serah Terima")}
        description={t("homeRental.policy.checklistItemDesc", "Dipakai tombol 'Isi Checklist Standar' saat mengisi Perlengkapan booking.")}
      />
      <PolicyRuleSection
        outletId={outletId} canManage={canManage} category="printed_rule"
        title={t("homeRental.policy.printedRuleTitle", "Aturan yang Ditampilkan/Dicetak untuk Customer")}
        description={t("homeRental.policy.printedRuleDesc", "Muncul di kartu 'Aturan Rental' pada Dashboard Home Rental.")}
      />
    </div>
  );
}

function ReportsTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - days * 86400000).toISOString();
    fetchJsonObject(`/api/home-rental/reports?outletId=${outletId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(setReport);
  }, [outletId, days]);

  if (!report) return <div className="text-sm text-neutral-500">{t("homeRental.reports.loading", "Memuat laporan...")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 text-xs">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`px-2 py-1 rounded ${days === d ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>{t("homeRental.reports.daysButton", "{n} Hari").replace("{n}", String(d))}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label={t("homeRental.reports.rentalRevenue", "Rental Revenue")} value={rupiah(report.revenue.rentalFee)} tone="text-emerald-400" />
        <StatCard label={t("homeRental.reports.deliveryPickupFee", "Delivery/Pickup Fee")} value={rupiah(report.revenue.deliveryFee + report.revenue.pickupFee)} />
        <StatCard label={t("homeRental.reports.lateFeeRevenue", "Late Fee Revenue")} value={rupiah(report.lateFeeReport.total)} tone="text-amber-400" />
        <StatCard label={t("homeRental.reports.damageCompensation", "Penggantian Kerusakan")} value={rupiah(report.damageReport.total)} tone="text-rose-400" />
        <StatCard label={t("homeRental.reports.totalReceived", "Total Diterima")} value={rupiah(report.revenue.paidAmount)} tone="text-cyan-400" />
        <StatCard label={t("homeRental.reports.transactions", "Transaksi")} value={report.revenue.transactionCount} />
        <StatCard label={t("homeRental.reports.depositHeld", "Deposit Ditahan")} value={rupiah(report.depositReport.held)} tone="text-cyan-400" />
        <StatCard label={t("homeRental.reports.depositReleased", "Deposit Dilepas")} value={rupiah(report.depositReport.released)} />
        <StatCard label={t("homeRental.reports.cancellationRate", "Cancellation Rate")} value={`${Math.round(report.cancellationReport.cancellationRate * 100)}%`} tone="text-rose-400" />
        <StatCard label={t("homeRental.reports.noShowRate", "No-Show Rate")} value={`${Math.round(report.cancellationReport.noShowRate * 100)}%`} tone="text-rose-400" />
      </div>

      <Card className="space-y-1.5">
        <h3 className="font-medium text-sm">{t("homeRental.reports.revenueBreakdownHeading", "Rincian Pendapatan — semua kategori sewa masuk di sini & ke Akuntansi")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">{t("homeRental.reports.rentalRow", "Sewa (12 jam/24 jam/mingguan/dst)")}</span><span>{rupiah(report.revenue.rentalFee)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">{t("homeRental.reports.deliveryRow", "Antar (Delivery)")}</span><span>{rupiah(report.revenue.deliveryFee)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">{t("homeRental.reports.pickupRow", "Jemput (Pickup)")}</span><span>{rupiah(report.revenue.pickupFee)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">{t("homeRental.reports.lateFeeRow", "Denda Keterlambatan")}</span><span>{rupiah(report.lateFeeReport.total)} <span className="text-neutral-600">({report.lateFeeReport.count}x)</span></span></div>
          <div className="flex justify-between"><span className="text-neutral-500">{t("homeRental.reports.damageRow", "Penggantian Kerusakan")}</span><span>{rupiah(report.damageReport.total)} <span className="text-neutral-600">({report.damageReport.count}x)</span></span></div>
          <div className="flex justify-between"><span className="text-neutral-500">{t("homeRental.reports.discountRow", "Diskon")}</span><span className="text-rose-400">-{rupiah(report.revenue.discountAmount)}</span></div>
        </div>
        <p className="text-[11px] text-neutral-600">{t("homeRental.reports.revenueFooterNote", "Setiap kategori posting ke akun COA-nya sendiri (Home Rental — PS3/PS4/PS5/Playbox/TV/Accessory/Package/Delivery/Late Fee/Penggantian Kerusakan) — lihat Accounting > Chart of Accounts & Laba Rugi.")}</p>
      </Card>

      <Card className="space-y-2">
        <h3 className="font-medium text-sm">{t("homeRental.reports.activeDueOverdueHeading", "Aktif / Jatuh Tempo / Overdue")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
              <th className="py-2 pr-3">{t("homeRental.reports.tableCode", "Kode")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableCustomer", "Pelanggan")}</th><th className="py-2 pr-3">{t("homeRental.reports.tablePlannedReturn", "Rencana Kembali")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableStatus", "Status")}</th>
            </tr></thead>
            <tbody>
              {report.activeList.map((r: any) => (
                <tr key={r.id} className="border-b border-neutral-900">
                  <td className="py-2 pr-3 font-medium">{r.rentalCode}</td>
                  <td className="py-2 pr-3 text-neutral-400">{r.customerName || "—"} {r.phone && <span className="text-neutral-600">({r.phone})</span>}</td>
                  <td className="py-2 pr-3 text-neutral-500 text-xs">{new Date(r.scheduledEnd).toLocaleString("id-ID")}</td>
                  <td className="py-2 pr-3">{r.isOverdue ? <Badge status="failed">{t("homeRental.reports.overdueBadge", "Overdue {n}d").replace("{n}", String(r.daysOverdue))}</Badge> : <Badge status="pending">{t("homeRental.reports.activeBadge", "Aktif")}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.activeList.length === 0 && <p className="text-sm text-neutral-500 mt-2">{t("homeRental.reports.noActiveRentals", "Tidak ada rental aktif.")}</p>}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <h3 className="font-medium text-sm">{t("homeRental.reports.byProductTypeHeading", "Rental per Tipe Produk")}</h3>
          {report.byProductType.map((pt: any) => (
            <div key={pt.type} className="flex justify-between text-sm"><span className="text-neutral-400 capitalize">{pt.type}</span><span>{pt.count}x · {rupiah(pt.revenue)}</span></div>
          ))}
          {report.byProductType.length === 0 && <p className="text-xs text-neutral-500">{t("homeRental.reports.noDataYet", "Belum ada data.")}</p>}
        </Card>
        <Card className="space-y-2">
          <h3 className="font-medium text-sm">{t("homeRental.reports.packagePerformanceHeading", "Performa Paket")}</h3>
          {report.packagePerformance.map((p: any) => (
            <div key={p.packageId} className="flex justify-between text-sm"><span className="text-neutral-400">{p.packageName}</span><span>{p.count}x · {rupiah(p.revenue)}</span></div>
          ))}
          {report.packagePerformance.length === 0 && <p className="text-xs text-neutral-500">{t("homeRental.reports.noDataYet", "Belum ada data.")}</p>}
        </Card>
      </div>

      <Card className="space-y-2">
        <h3 className="font-medium text-sm">{t("homeRental.reports.assetUtilizationHeading", "Utilisasi Aset")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
              <th className="py-2 pr-3">{t("homeRental.reports.tableAssetCode", "Kode Aset")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableProduct", "Produk")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableDaysRented", "Hari Disewa")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableUtilization", "Utilisasi")}</th>
            </tr></thead>
            <tbody>
              {report.assetUtilization.slice(0, 15).map((a: any) => (
                <tr key={a.assetId} className="border-b border-neutral-900">
                  <td className="py-2 pr-3 font-medium">{a.assetCode}</td>
                  <td className="py-2 pr-3 text-neutral-400">{a.productName}</td>
                  <td className="py-2 pr-3 text-neutral-400">{a.daysRentedInPeriod}</td>
                  <td className="py-2 pr-3 text-neutral-400">{Math.round(a.utilizationRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.assetUtilization.length === 0 && <p className="text-sm text-neutral-500 mt-2">{t("homeRental.reports.noAssetsYet", "Belum ada aset.")}</p>}
        </div>
      </Card>

      <Card className="space-y-2">
        <h3 className="font-medium text-sm">{t("homeRental.reports.customerHistoryHeading", "Riwayat Pelanggan (dengan Level Risiko)")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
              <th className="py-2 pr-3">{t("homeRental.reports.tablePhone", "No. HP")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableName", "Nama")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableRentalCount", "Jumlah Sewa")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableTotalSpend", "Total Belanja")}</th><th className="py-2 pr-3">{t("homeRental.reports.tableRisk", "Risiko")}</th>
            </tr></thead>
            <tbody>
              {report.customerHistory.slice(0, 15).map((c: any) => (
                <tr key={c.phone} className="border-b border-neutral-900">
                  <td className="py-2 pr-3 font-medium">{c.phone}</td>
                  <td className="py-2 pr-3 text-neutral-400">{c.customerName || "—"}</td>
                  <td className="py-2 pr-3 text-neutral-400">{c.rentalCount}</td>
                  <td className="py-2 pr-3 text-neutral-400">{rupiah(c.totalSpend)}</td>
                  <td className="py-2 pr-3"><Badge status={RISK_LEVEL_BADGE[c.riskLevel] ?? "unknown"}>{RISK_LEVEL_LABEL_KEYS[c.riskLevel] ? t(RISK_LEVEL_LABEL_KEYS[c.riskLevel].key, RISK_LEVEL_LABEL_KEYS[c.riskLevel].fallback) : c.riskLevel}</Badge>{c.isBlacklisted && <span className="ml-1"><Badge status="failed">{t("homeRental.reports.blacklistBadge", "Blacklist")}</Badge></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.customerHistory.length === 0 && <p className="text-sm text-neutral-500 mt-2">{t("homeRental.reports.noCustomerDataYet", "Belum ada data pelanggan.")}</p>}
        </div>
      </Card>
    </div>
  );
}
