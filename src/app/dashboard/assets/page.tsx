"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { coaAccountName } from "@/lib/accounting/coa-data";
import "@/lib/i18n/dict-assets";
import "@/lib/i18n/dict-coa";
import { AssetPurchaseTab } from "./AssetPurchaseTab";
import { AssetImportPanel } from "./AssetImportPanel";
import { ASSET_CATEGORIES, assetDateYmd, filterAssets, filterToParams, isFilterActive, summarizeAssets, type AssetFilter } from "@/lib/assets/asset-filter";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const TAB_DEFS = [
  { value: "Daftar Aset", labelKey: "assets.tabList", fallback: "Daftar Aset" },
  { value: "Pembelian Aset", labelKey: "assets.tabPurchase", fallback: "Pembelian Aset" },
  { value: "Penyusutan", labelKey: "assets.tabDepreciation", fallback: "Penyusutan" },
] as const;
type Tab = (typeof TAB_DEFS)[number]["value"];

const CATEGORY_LABEL: Record<string, string> = {
  playstation: "PlayStation", tv: "TV", controller: "Controller", furniture: "Furniture", vehicle: "Kendaraan", other: "Lainnya",
};
const CATEGORY_LABEL_KEY: Record<string, string> = {
  playstation: "assets.category.playstation", tv: "assets.category.tv", controller: "assets.category.controller", furniture: "assets.category.furniture", vehicle: "assets.category.vehicle", other: "assets.category.other",
};
const STATUS_BADGE: Record<string, string> = { active: "success", under_maintenance: "pending", disposed: "failed" };
const STATUS_LABEL: Record<string, string> = { active: "Aktif", under_maintenance: "Maintenance", disposed: "Dilepas (Disposed)" };
const STATUS_LABEL_KEY: Record<string, string> = { active: "assets.status.active", under_maintenance: "assets.status.underMaintenance", disposed: "assets.status.disposed" };

function categoryLabel(t: (key: string, fallback?: string) => string, category: string): string {
  return CATEGORY_LABEL_KEY[category] ? t(CATEGORY_LABEL_KEY[category], CATEGORY_LABEL[category] ?? category) : category;
}
function statusLabel(t: (key: string, fallback?: string) => string, status: string): string {
  return STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status], STATUS_LABEL[status] ?? status) : status;
}

const thisPeriod = () => new Date().toISOString().slice(0, 7);

export default function AssetsPage() {
  const [tab, setTab] = useState<Tab>("Daftar Aset");
  const [outletId, setOutletId] = useState<string | null>(null);
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const { t } = useDashboardLang();

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("assets.pageTitle", "Fixed Asset & Depreciation")}</h1>
        <p className="text-sm text-neutral-500">
          {t("assets.pageSubtitle", "Register aset (PS/TV/Controller/dst), penyusutan garis lurus otomatis, dan pelepasan aset — semuanya langsung membentuk jurnal ke General Ledger.")}
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TAB_DEFS.map((td) => (
          <button key={td.value} onClick={() => setTab(td.value)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === td.value ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>{t(td.labelKey, td.fallback)}</button>
        ))}
      </div>

      {!outletId ? null : tab === "Daftar Aset" ? (
        <AssetListTab outletId={outletId} role={role} onOpenPurchase={() => setTab("Pembelian Aset")} />
      ) : tab === "Pembelian Aset" ? (
        <AssetPurchaseTab role={role} />
      ) : (
        <DepreciationTab outletId={outletId} role={role} />
      )}
    </div>
  );
}

const EMPTY_FILTER: AssetFilter = { q: "", category: "", status: "", unit: "", from: "", to: "" };
const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

function AssetListTab({ outletId, role, onOpenPurchase }: { outletId: string; role: StaffRole; onOpenPurchase: () => void }) {
  const { t, lang } = useDashboardLang();
  const [bundle, setBundle] = useState<any>({ assets: [], rentalUnits: [], suppliers: [], cashBankAccounts: [], maintenanceLogs: [] });
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState<AssetFilter>(EMPTY_FILTER);

  const unitNames = useMemo(() => Object.fromEntries((bundle.rentalUnits as { id: string; name: string }[]).map((u) => [u.id, u.name])), [bundle.rentalUnits]);
  const visible = useMemo(() => filterAssets(bundle.assets as any[], filter, unitNames), [bundle.assets, filter, unitNames]);
  const summary = summarizeAssets(visible);
  const filterOn = isFilterActive(filter);

  /** Ringkasan filter untuk baris "Filter:" di file Excel. */
  const filterLabel = () => {
    const parts: string[] = [];
    if (filter.q?.trim()) parts.push(`"${filter.q.trim()}"`);
    if (filter.category) parts.push(categoryLabel(t, filter.category));
    if (filter.status === "not_disposed") parts.push(t("assets.io.statusNotDisposed", "Semua kecuali dilepas"));
    else if (filter.status) parts.push(statusLabel(t, filter.status));
    if (filter.unit === "linked") parts.push(t("assets.io.unitLinked", "Terhubung unit PS"));
    if (filter.unit === "unlinked") parts.push(t("assets.io.unitUnlinked", "Tanpa unit PS"));
    if (filter.from || filter.to) parts.push(`${filter.from || "…"} – ${filter.to || "…"}`);
    return parts.length ? parts.join(", ") : t("assets.io.allAssets", "Semua aset");
  };
  const exportHref = () => {
    const p = filterToParams(filter);
    p.set("lang", lang);
    p.set("label", filterLabel());
    return `/api/assets/export?${p.toString()}`;
  };
  const [form, setForm] = useState<any>({
    name: "", category: "playstation", rentalUnitId: "", acquisitionCost: 0, salvageValue: 0, usefulLifeMonths: 36,
    supplierId: "", notes: "", recordAsPayable: false, paymentMethod: "cash", cashBankAccountId: "",
  });
  const [disposeFor, setDisposeFor] = useState<{ id: string; disposalAmount: number; reason: string; cashBankAccountId: string } | null>(null);
  const [maintFor, setMaintFor] = useState<{ id: string; description: string; cost: number; createExpenseFor: boolean; accountId: string; cashBankAccountId: string } | null>(null);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);

  const canManage = hasPermission(role, "manage_assets");

  const load = () => {
    fetchJsonObject(`/api/assets?outletId=${outletId}`).then((d) => d && setBundle(d));
    fetchJsonObject(`/api/expenses?outletId=${outletId}`).then((d: any) => d && setExpenseAccounts(d.accounts));
  };
  useEffect(() => { load(); }, [outletId]);

  const submitCreate = async () => {
    if (!form.name || !form.acquisitionCost || !form.usefulLifeMonths) return showAlert(t("assets.alertRequiredFields", "Nama, harga perolehan, dan umur ekonomis wajib diisi."));
    if (!form.recordAsPayable && !form.cashBankAccountId) return showAlert(t("assets.alertSelectCashOrPayable", "Pilih akun kas/bank, atau centang 'Catat sebagai hutang'."));
    const res = await fetch("/api/assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, outletId, acquisitionCost: Number(form.acquisitionCost), salvageValue: Number(form.salvageValue) || 0, usefulLifeMonths: Number(form.usefulLifeMonths) }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ name: "", category: "playstation", rentalUnitId: "", acquisitionCost: 0, salvageValue: 0, usefulLifeMonths: 36, supplierId: "", notes: "", recordAsPayable: false, paymentMethod: "cash", cashBankAccountId: "" });
    setShowForm(false);
    load();
  };

  const submitDispose = async () => {
    if (!disposeFor) return;
    if (!disposeFor.reason) return showAlert(t("assets.alertDisposeReasonRequired", "Alasan pelepasan wajib diisi."));
    if (disposeFor.disposalAmount > 0 && !disposeFor.cashBankAccountId) return showAlert(t("assets.alertDisposeCashAccountRequired", "Pilih akun kas/bank penerima hasil pelepasan."));
    const res = await fetch(`/api/assets/${disposeFor.id}/dispose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(disposeFor) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setDisposeFor(null);
    load();
  };

  const submitMaintenance = async () => {
    if (!maintFor) return;
    if (!maintFor.description) return showAlert(t("assets.alertMaintenanceDescRequired", "Deskripsi maintenance wajib diisi."));
    if (maintFor.createExpenseFor && maintFor.cost > 0 && !maintFor.accountId) return showAlert(t("assets.alertMaintenanceAccountRequired", "Pilih akun beban untuk membuat expense maintenance."));
    const res = await fetch(`/api/assets/${maintFor.id}/maintenance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(maintFor) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setMaintFor(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-neutral-500">{t("assets.registeredCount", "{n} aset terdaftar").replace("{n}", String(bundle.assets.length))}</div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref()}
            className={`rounded-lg px-3 py-2 text-sm font-medium border border-white/10 bg-white/5 text-neutral-100 hover:bg-white/10 ${visible.length === 0 ? "pointer-events-none opacity-50" : ""}`}
            title={t("assets.io.downloadHint", "Unduh daftar aset sesuai filter yang sedang aktif")}
          >
            {filterOn ? t("assets.io.downloadFiltered", "Download Excel (terfilter)") : t("assets.io.download", "Download Excel")}
          </a>
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => { setShowImport((s) => !s); setShowForm(false); }}>{t("assets.io.upload", "Upload Excel")}</Button>
              <Button variant="secondary" onClick={onOpenPurchase}>{t("assets.purchase.new", "+ Pembelian Aset")}</Button>
              <Button onClick={() => { setShowForm((s) => !s); setShowImport(false); }}>{showForm ? t("assets.closeForm", "Tutup Form") : t("assets.newAssetButton", "+ Aset Baru")}</Button>
            </>
          )}
        </div>
      </div>

      {showImport && canManage && (
        <AssetImportPanel
          cashBankAccounts={bundle.cashBankAccounts}
          suppliers={bundle.suppliers}
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            load();
          }}
        />
      )}

      <Card className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <input
            className={`${inputCls} lg:col-span-2`}
            placeholder={t("assets.io.searchPlaceholder", "Cari nama, catatan, unit PS...")}
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          />
          <select className={inputCls} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
            <option value="">{t("assets.io.allCategories", "Semua kategori")}</option>
            {ASSET_CATEGORIES.map((k) => <option key={k} value={k}>{categoryLabel(t, k)}</option>)}
          </select>
          <select className={inputCls} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">{t("assets.io.allStatuses", "Semua status")}</option>
            <option value="not_disposed">{t("assets.io.statusNotDisposed", "Semua kecuali dilepas")}</option>
            <option value="active">{statusLabel(t, "active")}</option>
            <option value="under_maintenance">{statusLabel(t, "under_maintenance")}</option>
            <option value="disposed">{statusLabel(t, "disposed")}</option>
          </select>
          <select className={inputCls} value={filter.unit} onChange={(e) => setFilter({ ...filter, unit: e.target.value })}>
            <option value="">{t("assets.io.allUnits", "Semua (unit PS)")}</option>
            <option value="linked">{t("assets.io.unitLinked", "Terhubung unit PS")}</option>
            <option value="unlinked">{t("assets.io.unitUnlinked", "Tanpa unit PS")}</option>
          </select>
          <div className="flex items-center gap-1 sm:col-span-2 lg:col-span-1">
            <input type="date" aria-label={t("assets.io.dateFrom", "Dari tanggal")} title={t("assets.io.dateFrom", "Dari tanggal")} className={`${inputCls} w-full min-w-0 px-2`} value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
            <span className="text-neutral-600 text-xs">–</span>
            <input type="date" aria-label={t("assets.io.dateTo", "Sampai tanggal")} title={t("assets.io.dateTo", "Sampai tanggal")} className={`${inputCls} w-full min-w-0 px-2`} value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
          <span>
            {t("assets.io.showing", "Menampilkan {n} dari {total} aset").replace("{n}", String(summary.count)).replace("{total}", String(bundle.assets.length))}
          </span>
          <span>{t("assets.tableAcquisition", "Perolehan")}: <b className="text-neutral-200">{rupiah(summary.cost)}</b></span>
          <span>{t("assets.tableAccumDepreciation", "Akum. Penyusutan")}: <b className="text-neutral-200">{rupiah(summary.accumulated)}</b></span>
          <span>{t("assets.tableBookValue", "Nilai Buku")}: <b className="text-emerald-300">{rupiah(summary.bookValue)}</b></span>
          {filterOn && (
            <button className="text-cyan-300 hover:underline" onClick={() => setFilter(EMPTY_FILTER)}>{t("assets.io.resetFilter", "Reset filter")}</button>
          )}
        </div>
      </Card>

      {showForm && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("assets.formTitle", "Form Aset Baru")}</h2>
          <p className="text-xs text-neutral-500">{t("assets.formPurchaseHint", "Satu aset, dicatat sebagai Pembelian Aset 1 baris. Untuk beberapa unit sekaligus, ongkos kirim/pasang, uang muka, atau aset saldo awal, gunakan tab Pembelian Aset.")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("assets.placeholderName", "Nama aset (mis. PS5 Unit 5)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.keys(CATEGORY_LABEL).map((k) => <option key={k} value={k}>{categoryLabel(t, k)}</option>)}
            </select>
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.rentalUnitId} onChange={(e) => setForm({ ...form, rentalUnitId: e.target.value })}>
              <option value="">{t("assets.optionRentalUnit", "Unit PS terkait (opsional)")}</option>
              {bundle.rentalUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("assets.placeholderAcquisitionCost", "Harga Perolehan")} value={form.acquisitionCost || ""} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("assets.placeholderSalvageValue", "Nilai Sisa (Salvage)")} value={form.salvageValue || ""} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("assets.placeholderUsefulLife", "Umur Ekonomis (bulan)")} value={form.usefulLifeMonths || ""} onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">{t("assets.optionSupplier", "Supplier (opsional)")}</option>
              {bundle.suppliers.filter((s: { id: string; archivedAt?: string | null }) => !s.archivedAt || s.id === form.supplierId).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} disabled={form.recordAsPayable}>
              <option value="cash">{t("assets.paymentCash", "Cash")}</option><option value="bank">{t("assets.paymentBank", "Bank")}</option><option value="transfer">{t("assets.paymentTransfer", "Transfer")}</option><option value="qris">{t("assets.paymentQris", "QRIS")}</option>
            </select>
            <SearchableSelect
              value={form.cashBankAccountId}
              onChange={(v) => setForm({ ...form, cashBankAccountId: v })}
              disabled={form.recordAsPayable}
              placeholder={t("assets.optionCashBankAccount", "Akun Kas/Bank")}
              options={bundle.cashBankAccounts.map((c: any) => ({ value: c.id, label: c.name }))}
            />
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={form.recordAsPayable} onChange={(e) => setForm({ ...form, recordAsPayable: e.target.checked })} /> {t("assets.checkboxRecordAsPayable", "Catat sebagai hutang")}
            </label>
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("assets.placeholderNotes", "Catatan (opsional)")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={submitCreate}>{t("assets.saveAsset", "Simpan Aset")}</Button>
        </Card>
      )}

      {disposeFor && (
        <Card className="space-y-2 border-red-500/40">
          <h2 className="font-medium">{t("assets.disposeTitle", "Lepas Aset (Dispose)")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("assets.placeholderDisposalAmount", "Hasil pelepasan (Rp, 0 jika tidak ada)")} value={disposeFor.disposalAmount || ""} onChange={(e) => setDisposeFor({ ...disposeFor, disposalAmount: Number(e.target.value) })} />
            <SearchableSelect
              value={disposeFor.cashBankAccountId}
              onChange={(v) => setDisposeFor({ ...disposeFor, cashBankAccountId: v })}
              placeholder={t("assets.optionCashBankAccountResult", "Akun Kas/Bank (jika ada hasil)")}
              options={bundle.cashBankAccounts.map((c: any) => ({ value: c.id, label: c.name }))}
            />
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("assets.placeholderDisposeReason", "Alasan (rusak, dijual, hilang, dst)")} value={disposeFor.reason} onChange={(e) => setDisposeFor({ ...disposeFor, reason: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={submitDispose}>{t("assets.disposeAsset", "Lepas Aset")}</Button>
            <Button variant="ghost" onClick={() => setDisposeFor(null)}>{t("assets.cancel", "Batal")}</Button>
          </div>
        </Card>
      )}

      {maintFor && (
        <Card className="space-y-2 border-amber-500/40">
          <h2 className="font-medium">{t("assets.maintenanceTitle", "Catat Maintenance")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("assets.placeholderMaintDesc", "Deskripsi (mis. Ganti thermal paste)")} value={maintFor.description} onChange={(e) => setMaintFor({ ...maintFor, description: e.target.value })} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("assets.placeholderMaintCost", "Biaya (Rp, 0 jika gratis)")} value={maintFor.cost || ""} onChange={(e) => setMaintFor({ ...maintFor, cost: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={maintFor.createExpenseFor} onChange={(e) => setMaintFor({ ...maintFor, createExpenseFor: e.target.checked })} /> {t("assets.checkboxCreateExpense", "Buat Expense (Beban Maintenance)")}
            </label>
            {maintFor.createExpenseFor && (
              <>
                <SearchableSelect
                  value={maintFor.accountId}
                  onChange={(v) => setMaintFor({ ...maintFor, accountId: v })}
                  placeholder={t("assets.optionExpenseAccount", "Akun Beban (COA)")}
                  options={expenseAccounts.map((a: any) => ({ value: a.id, label: `${a.code} ${coaAccountName(t, a)}` }))}
                />
                <SearchableSelect
                  value={maintFor.cashBankAccountId}
                  onChange={(v) => setMaintFor({ ...maintFor, cashBankAccountId: v })}
                  placeholder={t("assets.optionCashBankAccountOrPayable", "Akun Kas/Bank (kosongkan = hutang)")}
                  options={bundle.cashBankAccounts.map((c: any) => ({ value: c.id, label: c.name }))}
                />
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={submitMaintenance}>{t("assets.save", "Simpan")}</Button>
            <Button variant="ghost" onClick={() => setMaintFor(null)}>{t("assets.cancel", "Batal")}</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("assets.tableName", "Nama")}</th><th>{t("assets.tableCategory", "Kategori")}</th><th>{t("assets.io.col.date", "Tanggal Perolehan")}</th><th>{t("assets.tableAcquisition", "Perolehan")}</th><th>{t("assets.tableAccumDepreciation", "Akum. Penyusutan")}</th><th>{t("assets.tableBookValue", "Nilai Buku")}</th><th>{t("assets.tableStatus", "Status")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a: any) => {
              const bookValue = a.acquisitionCost - a.accumulatedDepreciation;
              return (
                <tr key={a.id} className="border-b border-neutral-900 align-top">
                  <td className="py-2 text-xs font-medium">
                    {a.name}
                    {a.purchaseId && a.notes && <div className="text-[11px] font-normal text-neutral-500">{a.notes}</div>}
                    {a.status === "disposed" && a.disposalReason && <div className="text-[11px] font-normal text-neutral-500">{a.disposalReason}</div>}
                  </td>
                  <td className="text-xs">
                    {categoryLabel(t, a.category)}
                    {a.rentalUnitId && unitNames[a.rentalUnitId] && <div className="text-[11px] text-cyan-300/80">{unitNames[a.rentalUnitId]}</div>}
                  </td>
                  <td className="text-xs whitespace-nowrap">{assetDateYmd(a.acquisitionDate)}</td>
                  <td className="text-xs">{rupiah(a.acquisitionCost)}</td>
                  <td className="text-xs">{rupiah(a.accumulatedDepreciation)}</td>
                  <td className="text-xs">{rupiah(bookValue)}</td>
                  <td><Badge status={STATUS_BADGE[a.status]}>{statusLabel(t, a.status)}</Badge></td>
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {a.status === "active" && canManage && (
                        <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setMaintFor({ id: a.id, description: "", cost: 0, createExpenseFor: false, accountId: "", cashBankAccountId: "" })}>{t("assets.addMaintenance", "+ Maintenance")}</Button>
                      )}
                      {a.status !== "disposed" && canManage && (
                        <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => setDisposeFor({ id: a.id, disposalAmount: 0, reason: "", cashBankAccountId: "" })}>{t("assets.disposeAsset", "Lepas Aset")}</Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {bundle.assets.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("assets.emptyAssets", "Belum ada aset terdaftar.")}</div>}
        {bundle.assets.length > 0 && visible.length === 0 && (
          <div className="text-sm text-neutral-500 py-4 text-center">{t("assets.io.noMatch", "Tidak ada aset yang cocok dengan filter.")}</div>
        )}
      </Card>
    </div>
  );
}

function DepreciationTab({ outletId, role }: { outletId: string; role: StaffRole }) {
  const { t } = useDashboardLang();
  const [bundle, setBundle] = useState<any>({ assets: [], depreciationEntries: [] });
  const [period, setPeriod] = useState(thisPeriod());
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any[] | null>(null);
  const canManage = hasPermission(role, "manage_assets");

  const load = () => fetchJsonObject(`/api/assets?outletId=${outletId}`).then((d) => d && setBundle(d));
  useEffect(() => { load(); }, [outletId]);

  const runAll = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/assets/depreciate-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId, period }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setLastResult(data);
      load();
    } finally {
      setRunning(false);
    }
  };

  const activeAssets = bundle.assets.filter((a: any) => a.status !== "disposed");
  const totalMonthly = activeAssets.reduce((s: number, a: any) => {
    const remaining = a.acquisitionCost - a.salvageValue - a.accumulatedDepreciation;
    if (remaining <= 0) return s;
    return s + Math.min((a.acquisitionCost - a.salvageValue) / a.usefulLifeMonths, remaining);
  }, 0);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-medium">{t("assets.runDepreciationTitle", "Jalankan Penyusutan Bulanan")}</h2>
        <p className="text-xs text-neutral-500">{t("assets.runDepreciationDesc", "Memposting jurnal Dr Beban Penyusutan / Cr Akumulasi Penyusutan untuk semua aset aktif pada periode terpilih — dilewati otomatis jika periode itu sudah pernah dijalankan atau aset sudah terdepresiasi penuh.")}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <span className="text-xs text-neutral-500">{t("assets.estimatedTotal", "Estimasi total: {amount}").replace("{amount}", rupiah(totalMonthly))}</span>
          {canManage && <Button onClick={runAll} disabled={running}>{running ? t("assets.processing", "Memproses...") : t("assets.runDepreciation", "Jalankan Penyusutan")}</Button>}
        </div>
        {lastResult && (
          <div className="text-xs space-y-1 pt-2 border-t border-neutral-800">
            {lastResult.map((r) => (
              <div key={r.fixedAssetId} className={`flex justify-between ${r.error ? "text-neutral-500" : "text-emerald-400"}`}>
                <span>{r.name}</span><span>{r.error ? r.error : rupiah(r.amount ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-medium mb-3">{t("assets.depreciationHistoryTitle", "Riwayat Penyusutan")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("assets.tableAsset", "Aset")}</th><th>{t("assets.tablePeriod", "Periode")}</th><th>{t("assets.tableAmount", "Nominal")}</th></tr>
          </thead>
          <tbody>
            {bundle.depreciationEntries
              .slice()
              .sort((a: any, b: any) => b.period.localeCompare(a.period))
              .map((d: any) => (
                <tr key={d.id} className="border-b border-neutral-900">
                  <td className="py-2 text-xs">{bundle.assets.find((a: any) => a.id === d.fixedAssetId)?.name ?? d.fixedAssetId}</td>
                  <td className="text-xs">{d.period}</td>
                  <td className="text-xs">{rupiah(d.amount)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {bundle.depreciationEntries.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("assets.emptyDepreciationHistory", "Belum ada riwayat penyusutan.")}</div>}
      </Card>
    </div>
  );
}
