"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Info, Search, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProcessingOverlay } from "@/components/ui/ProcessingOverlay";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { usePaymentMethods } from "@/lib/payments/use-payment-methods";
import { showAlert, showPrompt } from "@/lib/ui/dialog";
import { useProsesTunggal } from "@/lib/ui/use-proses-tunggal";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { coaAccountName } from "@/lib/accounting/coa-data";
import { outletDateYmd } from "@/lib/time/outlet-time";
import "@/lib/i18n/dict-other-income";
import "@/lib/i18n/dict-coa";

/**
 * Pendapatan Lain-lain — uang masuk di luar penjualan inti. Setiap entri langsung menjadi jurnal
 * (lib/accounting/other-income.ts): Dr Kas/Bank sesuai metode (Account Mapping modul payment),
 * Cr akun 47xx sesuai kategori (Account Mapping modul other_income), bertanggal sesuai Tanggal
 * diterima. Otomatis ikut di Jurnal, Neraca Saldo, Laba Rugi (bagian Pendapatan lain-lain), Neraca,
 * Arus Kas, CALK, Audit, dan tutup shift (tunai hari ini).
 */

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

const CATEGORY_LABEL_KEY: Record<string, { key: string; fallback: string; hint: string }> = {
  vendor_commission: { key: "otherIncome.category.vendorCommission", fallback: "Komisi / Kerjasama Vendor", hint: "Komisi titip jual voucher, bagi hasil mesin/vending, fee kerjasama." },
  asset_rental: { key: "otherIncome.category.assetRental", fallback: "Sewa Tempat/Aset ke Pihak Lain", hint: "Sewa lahan parkir, sewa ruangan untuk acara, sewa etalase." },
  asset_sale: { key: "otherIncome.category.assetSale", fallback: "Penjualan Aset/Barang Bekas", hint: "Barang bekas/rongsokan yang TIDAK terdaftar di menu Aset (kardus, botol, perabot lama)." },
  sponsorship: { key: "otherIncome.category.sponsorship", fallback: "Sponsorship / Kerjasama Event", hint: "Dana sponsor turnamen/event dari brand." },
  penalty_compensation: { key: "otherIncome.category.penaltyCompensation", fallback: "Denda / Ganti Rugi dari Pelanggan", hint: "Ganti rugi stik rusak, denda keterlambatan di luar tagihan sewa." },
  bank_interest_cashback: { key: "otherIncome.category.bankInterestCashback", fallback: "Bunga Bank / Cashback / Promo", hint: "Bunga tabungan, cashback e-wallet/kartu, hadiah promo." },
  other: { key: "otherIncome.category.other", fallback: "Lain-lain", hint: "Pendapatan non-inti lain yang tidak masuk kategori di atas." },
};

type Preset = "today" | "7d" | "this_month" | "last_month" | "custom";
interface Row {
  id: string;
  incomeNumber: string;
  category: string;
  description: string | null;
  payerName: string | null;
  amount: number;
  feeAmount: number;
  paymentMethod: string;
  status: "posted" | "void";
  incomeDate: string;
  shiftId: string | null;
  attachmentUrl: string | null;
  voidReason: string | null;
}
interface AccountRef { code: string; name: string }
interface ListResponse {
  rows: Row[];
  totalPosted: number;
  accounts?: { categories: Record<string, AccountRef | null>; methods: Record<string, AccountRef | null> };
}

function presetRange(p: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = outletDateYmd(new Date());
  const [y, m] = today.split("-").map(Number);
  const ymd = (d: Date) => outletDateYmd(d);
  if (p === "today") return { from: today, to: today };
  if (p === "7d") return { from: ymd(new Date(Date.now() - 6 * 86400000)), to: today };
  if (p === "this_month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (p === "last_month") {
    const first = new Date(Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1));
    const last = new Date(Date.UTC(y, m - 1, 0));
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }
  return { from: customFrom || today, to: customTo || today };
}
const wibStart = (ymd: string) => new Date(`${ymd}T00:00:00+07:00`).toISOString();
const wibEnd = (ymd: string) => new Date(`${ymd}T23:59:59.999+07:00`).toISOString();

export default function OtherIncomePage() {
  const { t } = useDashboardLang();
  const catLabel = (cat: string) => (CATEGORY_LABEL_KEY[cat] ? t(CATEGORY_LABEL_KEY[cat].key, CATEGORY_LABEL_KEY[cat].fallback) : cat);
  const { user } = useAuth();
  const canManage = hasPermission((user?.role ?? "cashier") as StaffRole, "manage_other_income");
  const { methods } = usePaymentMethods();
  const methodLabel = useMemo(() => Object.fromEntries(methods.map((m) => [m.value, m.label])), [methods]);

  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);

  const { from, to } = presetRange(preset, customFrom, customTo);
  const methodKeys = methods.map((m) => m.value).join(",");

  const load = () => {
    const params = new URLSearchParams({ from: wibStart(from), to: wibEnd(to), accounts: methodKeys });
    fetchJsonObject<ListResponse>(`/api/other-income?${params}`).then((d) => d && setData(d));
  };
  useEffect(load, [from, to, methodKeys]);

  const acct = (ref: AccountRef | null | undefined) => (ref ? `${ref.code} ${coaAccountName(t, ref)}` : "—");

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = (data?.rows ?? []).filter((r) => {
    if (catFilter && r.category !== catFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (!tokens.length) return true;
    const hay = [r.incomeNumber, r.description, r.payerName, catLabel(r.category), methodLabel[r.paymentMethod], String(Math.round(r.amount))].filter(Boolean).join(" ").toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });

  const posted = visible.filter((r) => r.status === "posted");
  const total = posted.reduce((s, r) => s + r.amount, 0);
  const cash = posted.filter((r) => r.paymentMethod === "cash").reduce((s, r) => s + r.amount, 0);
  const fees = posted.reduce((s, r) => s + (r.feeAmount ?? 0), 0);
  const categoryTotals = new Map<string, number>();
  for (const r of posted) categoryTotals.set(r.category, (categoryTotals.get(r.category) ?? 0) + r.amount);
  const byCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);

  const doVoid = async (r: Row) => {
    const reason = (await showPrompt(t("otherIncome.voidPrompt2", "Batalkan {no} ({amount})? Jurnalnya dibalik (tercatat, tidak dihapus). Tulis alasannya:").replace("{no}", r.incomeNumber).replace("{amount}", rupiah(r.amount)), { tone: "danger", required: true, multiline: true, confirmLabel: "Batalkan" })) ?? "";
    if (!reason.trim()) return;
    setVoiding(r.id);
    try {
      const res = await fetch(`/api/other-income/${r.id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      load();
    } finally {
      setVoiding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("otherIncome.title", "Pendapatan Lain-lain")}</h1>
        <p className="text-sm text-neutral-500">
          {t("otherIncome.subtitle2", "Uang masuk di luar penjualan rental, F&B, produk, dan PPOB — komisi vendor, sewa tempat, barang bekas, sponsorship, denda/ganti rugi, bunga bank/cashback.")}
        </p>
      </div>

      <Card className="border-sky-500/25 bg-sky-500/5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-300">1</span> {t("otherIncome.flow1", "Pilih jenis pendapatan")}
          <ArrowRight size={12} className="text-neutral-600" />
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-300">2</span> {t("otherIncome.flow2", "Isi tanggal diterima & nominal")}
          <ArrowRight size={12} className="text-neutral-600" />
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-300">3</span> {t("otherIncome.flow3", "Pilih diterima lewat apa")}
          <ArrowRight size={12} className="text-neutral-600" />
          <span className="text-emerald-300">{t("otherIncome.flow4", "Otomatis masuk Jurnal, Laba Rugi (Pendapatan lain-lain), Neraca, Arus Kas & tutup shift")}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-neutral-500">{t("otherIncome.totalPeriod", "Total Periode Ini")}</div>
          <div className="text-lg font-semibold mt-1 text-emerald-400">{rupiah(total)}</div>
          <div className="text-[11px] text-neutral-500">{posted.length} {t("otherIncome.entries", "entri")}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-neutral-500">{t("otherIncome.cashIn", "Tunai (masuk laci kasir)")}</div>
          <div className="text-lg font-semibold mt-1">{rupiah(cash)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-neutral-500">{t("otherIncome.nonCashIn", "Non-tunai (bank/QRIS/e-wallet)")}</div>
          <div className="text-lg font-semibold mt-1">{rupiah(total - cash)}</div>
          {fees > 0 && <div className="text-[11px] text-neutral-500">{t("otherIncome.feesNote", "potongan MDR {fee}").replace("{fee}", rupiah(fees))}</div>}
        </Card>
        <Card className="p-3">
          <div className="text-xs text-neutral-500">{t("otherIncome.topCategory", "Terbesar")}</div>
          <div className="text-sm font-medium mt-1">{byCategory[0] ? catLabel(byCategory[0][0]) : "—"}</div>
          {byCategory[0] && <div className="text-[11px] text-neutral-500">{rupiah(byCategory[0][1])}</div>}
        </Card>
      </div>

      {canManage ? (
        <EntryForm methods={methods} accounts={data?.accounts} onCreated={load} />
      ) : (
        <div className="text-xs text-neutral-500 italic">{t("otherIncome.noPermission", "Role kamu tidak punya izin mencatat Pendapatan Lain-lain — hubungi Owner/Manager kalau perlu akses ini.")}</div>
      )}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1">
            {([
              ["today", t("otherIncome.today", "Hari Ini")],
              ["7d", t("otherIncome.last7", "7 Hari")],
              ["this_month", t("otherIncome.thisMonth", "Bulan Ini")],
              ["last_month", t("otherIncome.lastMonth", "Bulan Lalu")],
              ["custom", t("otherIncome.custom", "Pilih Tanggal")],
            ] as [Preset, string][]).map(([p, label]) => (
              <button key={p} onClick={() => setPreset(p)} className={`rounded-lg px-3 py-1.5 text-xs ${preset === p ? "bg-emerald-500/20 text-emerald-300" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"}`}>
                {label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <>
              <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-xs text-neutral-500">—</span>
              <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">{t("otherIncome.allCategories", "Semua kategori")}</option>
            {Object.keys(CATEGORY_LABEL_KEY).map((k) => <option key={k} value={k}>{catLabel(k)}</option>)}
          </select>
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t("otherIncome.allStatus", "Semua status")}</option>
            <option value="posted">{t("otherIncome.statusPosted", "Posted")}</option>
            <option value="void">{t("otherIncome.statusVoid", "Dibatalkan")}</option>
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 pl-8 pr-2 py-1.5 text-xs" placeholder={t("otherIncome.search", "Cari no., deskripsi, pemberi, nominal...")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="text-[11px] text-neutral-500">
          {t("otherIncome.periodShown", "Periode {from} s/d {to} · {n} entri").replace("{from}", new Date(`${from}T12:00:00+07:00`).toLocaleDateString("id-ID")).replace("{to}", new Date(`${to}T12:00:00+07:00`).toLocaleDateString("id-ID")).replace("{n}", String(visible.length))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-800 text-xs">
                <th className="py-2">{t("otherIncome.table.date", "Tanggal")}</th>
                <th>{t("otherIncome.table.number", "No.")}</th>
                <th>{t("otherIncome.table.category", "Kategori → Akun")}</th>
                <th>{t("otherIncome.table.description", "Deskripsi")}</th>
                <th className="text-right">{t("otherIncome.table.amount", "Nominal")}</th>
                <th>{t("otherIncome.table.method", "Diterima lewat → Akun")}</th>
                <th>{t("otherIncome.table.status", "Status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={`border-b border-neutral-900 align-top ${r.status === "void" ? "opacity-50" : ""}`}>
                  <td className="py-2 whitespace-nowrap text-xs">
                    {new Date(r.incomeDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    {r.shiftId && <div className="text-[10px] text-sky-400">{t("otherIncome.inShift", "masuk shift")}</div>}
                  </td>
                  <td className="text-xs font-mono text-neutral-400">{r.incomeNumber}</td>
                  <td className="text-xs">
                    {catLabel(r.category)}
                    <div className="text-[10px] text-neutral-500">{acct(data?.accounts?.categories[r.category])}</div>
                  </td>
                  <td className="text-xs text-neutral-300 max-w-[220px]">
                    {r.description ?? "—"}
                    {r.payerName && <div className="text-[10px] text-neutral-500">{t("otherIncome.fromPrefix", "dari")} {r.payerName}</div>}
                    {r.status === "void" && r.voidReason && <div className="text-[10px] text-rose-400">{t("otherIncome.voidReason", "Dibatalkan")}: {r.voidReason}</div>}
                  </td>
                  <td className={`text-right text-xs font-medium ${r.status === "void" ? "line-through" : "text-emerald-400"}`}>
                    {rupiah(r.amount)}
                    {r.feeAmount > 0 && <div className="text-[10px] font-normal text-neutral-500">MDR −{rupiah(r.feeAmount)}</div>}
                  </td>
                  <td className="text-xs">
                    {methodLabel[r.paymentMethod] ?? r.paymentMethod}
                    <div className="text-[10px] text-neutral-500">{acct(data?.accounts?.methods[r.paymentMethod])}</div>
                  </td>
                  <td><Badge status={r.status === "posted" ? "success" : "failed"}>{r.status === "posted" ? t("otherIncome.statusPosted", "Posted") : t("otherIncome.statusVoid", "Dibatalkan")}</Badge></td>
                  <td className="text-right whitespace-nowrap">
                    {r.attachmentUrl && <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="mr-2 text-[11px] text-sky-400 underline">{t("otherIncome.proof", "bukti")}</a>}
                    {canManage && r.status === "posted" && (
                      <Button variant="ghost" className="text-xs text-red-400" disabled={voiding === r.id} onClick={() => doVoid(r)}>
                        {voiding === r.id ? t("otherIncome.processing", "Memproses...") : t("otherIncome.voidAction", "Batalkan")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="text-center text-neutral-500 py-6">{data ? t("otherIncome.empty", "Belum ada entri pendapatan lain-lain pada periode ini.") : t("otherIncome.loading", "Memuat...")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {byCategory.length > 0 && (
          <div className="border-t border-neutral-800 pt-2">
            <div className="text-xs font-medium text-neutral-400 mb-1">{t("otherIncome.byCategory", "Rekap per kategori (sama dengan baris 47xx di Laba Rugi periode ini)")}</div>
            <div className="grid gap-1 sm:grid-cols-2 text-xs">
              {byCategory.map(([cat, amt]) => (
                <div key={cat} className="flex justify-between gap-2">
                  <span>{catLabel(cat)} <span className="text-neutral-500">· {acct(data?.accounts?.categories[cat])}</span></span>
                  <span>{rupiah(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function EntryForm({ methods, accounts, onCreated }: { methods: { value: string; label: string }[]; accounts: ListResponse["accounts"]; onCreated: () => void }) {
  const { t } = useDashboardLang();
  const today = outletDateYmd(new Date());
  const empty = { category: "other", incomeDate: today, amount: "", payerName: "", description: "", paymentMethod: "cash", costCenterId: "", attachmentUrl: "" };
  const [form, setForm] = useState(empty);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string; isActive?: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const proses = useProsesTunggal();

  useEffect(() => {
    fetchJsonArray<{ id: string; name: string; isActive?: boolean }>("/api/cost-centers").then((rows) => setCostCenters(rows.filter((c) => c.isActive !== false)));
  }, []);

  const catRef = accounts?.categories[form.category];
  const methodRef = accounts?.methods[form.paymentMethod];
  const acct = (ref: AccountRef | null | undefined) => (ref ? `${ref.code} ${coaAccountName(t, ref)}` : "—");
  const backdated = form.incomeDate !== today;
  const amount = Number(form.amount) || 0;

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/expenses/upload", { method: "POST", body: fd });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      setForm((f) => ({ ...f, attachmentUrl: out.url }));
    } finally {
      setUploading(false);
    }
  };

  const submit = () =>
    proses.jalankan("create", async () => {
      if (!(amount > 0)) return showAlert(t("otherIncome.amountRequired", "Nominal harus lebih dari 0."));
      if (!form.incomeDate) return showAlert(t("otherIncome.dateRequired", "Isi tanggal diterima."));
      const res = await fetch("/api/other-income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          incomeDate: form.incomeDate,
          amount,
          paymentMethod: form.paymentMethod,
          payerName: form.payerName || null,
          description: form.description || null,
          costCenterId: form.costCenterId || null,
          attachmentUrl: form.attachmentUrl || null,
        }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      setForm({ ...empty, paymentMethod: form.paymentMethod, category: form.category });
      onCreated();
      showAlert(t("otherIncome.saved", "{no} tersimpan dan sudah dibukukan ke jurnal.").replace("{no}", out.incomeNumber));
    });

  return (
    <Card className="space-y-4">
      {proses.sibuk("create") && <ProcessingOverlay message={t("otherIncome.savingOverlay", "Menyimpan pendapatan...")} hint={t("otherIncome.savingHint", "Mencatat entri dan jurnalnya. Jangan tutup halaman ini.")} />}
      <h2 className="font-medium flex items-center gap-2"><Wallet size={16} className="text-emerald-400" /> {t("otherIncome.formTitle", "Catat Pendapatan Lain-lain")}</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 block">
          <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldCategory", "1. Jenis pendapatan *")}</div>
          <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(CATEGORY_LABEL_KEY).map(([k, entry]) => <option key={k} value={k}>{t(entry.key, entry.fallback)}</option>)}
          </select>
          <div className="text-[11px] text-neutral-500">{CATEGORY_LABEL_KEY[form.category]?.hint}</div>
          <div className="text-[11px] text-sky-300">{t("otherIncome.toAccount", "Dibukukan ke akun")} {acct(catRef)}</div>
          {form.category === "asset_sale" && (
            <div className="text-[11px] text-amber-400">
              {t("otherIncome.assetSaleWarn", "Menjual PS/TV/perabot yang terdaftar di menu Aset? Catat lewat Aset → Lepas Aset supaya nilai buku & laba/rugi pelepasannya benar. Di sini hanya untuk barang bekas yang tidak terdaftar sebagai aset.")}
            </div>
          )}
        </label>

        <label className="space-y-1 block">
          <div className="text-xs font-medium text-neutral-300 flex items-center gap-1"><CalendarDays size={12} /> {t("otherIncome.fieldDate", "2. Tanggal diterima *")}</div>
          <input type="date" className={inputCls} value={form.incomeDate} max={today} onChange={(e) => setForm({ ...form, incomeDate: e.target.value || today })} />
          <div className={`text-[11px] ${backdated ? "text-amber-400" : "text-neutral-500"}`}>
            {backdated
              ? t("otherIncome.backdateHint", "Tanggal lampau: dibukukan pada tanggal ini dan TIDAK dihitung ke shift kasir yang sedang buka. Kalau periodenya sudah ditutup, jurnal jatuh ke hari ini.")
              : t("otherIncome.todayHint", "Hari ini: kalau diterima tunai, ikut dihitung sebagai kas masuk shift kasir yang sedang buka.")}
          </div>
        </label>

        <label className="space-y-1 block">
          <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldAmount", "Nominal (Rp) *")}</div>
          <input type="number" min={0} inputMode="numeric" className={inputCls} placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <div className="text-[11px] text-neutral-500">{t("otherIncome.amountHint", "Tanpa titik atau koma. Contoh: 250000")}</div>
        </label>

        <label className="space-y-1 block">
          <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldMethod", "3. Diterima lewat *")}</div>
          <select className={inputCls} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div className="text-[11px] text-sky-300">{t("otherIncome.toCash", "Uang masuk ke")} {acct(methodRef)}</div>
        </label>

        <label className="space-y-1 block">
          <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldPayer", "Diterima dari")}</div>
          <input className={inputCls} placeholder={t("otherIncome.payerPlaceholder2", "mis. PT Voucher Game, Pak Budi")} value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} />
        </label>

        <label className="space-y-1 block">
          <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldDescription", "Keterangan")}</div>
          <input className={inputCls} placeholder={t("otherIncome.descriptionPlaceholder", "Deskripsi (mis. Sewa lahan parkir ke tetangga)")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        {costCenters.length > 0 && (
          <label className="space-y-1 block">
            <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldCostCenter", "Divisi / bagian (opsional)")}</div>
            <select className={inputCls} value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}>
              <option value="">{t("otherIncome.noCostCenter", "— tidak dipilah —")}</option>
              {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}

        <div className="space-y-1">
          <div className="text-xs font-medium text-neutral-300">{t("otherIncome.fieldProof", "Foto bukti / nota (opsional)")}</div>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*,.pdf" className="text-xs" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {uploading && <span className="text-xs text-neutral-500">{t("otherIncome.uploading", "Mengunggah...")}</span>}
            {form.attachmentUrl && <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-400">{t("otherIncome.viewProof", "Lihat bukti")}</a>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm">
        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Info size={12} /> {t("otherIncome.summaryHeading", "Periksa sekali lagi")}</div>
        {amount > 0 ? (
          <span>
            {new Date(`${form.incomeDate}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} —{" "}
            {t("otherIncome.summarySentence", "{jenis} sebesar {amount}{dari}, diterima lewat {metode}. Jurnal: Debit {kas} / Kredit {akun}.")
              .replace("{jenis}", t(CATEGORY_LABEL_KEY[form.category].key, CATEGORY_LABEL_KEY[form.category].fallback))
              .replace("{amount}", rupiah(amount))
              .replace("{dari}", form.payerName ? ` ${t("otherIncome.fromPrefix", "dari")} ${form.payerName}` : "")
              .replace("{metode}", methods.find((m) => m.value === form.paymentMethod)?.label ?? form.paymentMethod)
              .replace("{kas}", acct(methodRef))
              .replace("{akun}", acct(catRef))}
          </span>
        ) : (
          <span className="text-neutral-500">{t("otherIncome.summaryIncomplete", "Isi nominalnya dulu.")}</span>
        )}
      </div>

      <Button onClick={submit} disabled={proses.sibuk("create") || uploading}>
        {proses.sibuk("create") ? t("otherIncome.saving", "Menyimpan...") : t("otherIncome.save", "Simpan")}
      </Button>
    </Card>
  );
}
