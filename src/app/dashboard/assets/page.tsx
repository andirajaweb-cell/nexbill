"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-assets";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const TAB_DEFS = [
  { value: "Daftar Aset", labelKey: "assets.tabList", fallback: "Daftar Aset" },
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

  useEffect(() => {
    fetchJsonObject<{ id: string }>("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); });
  }, []);

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
        <AssetListTab outletId={outletId} role={role} />
      ) : (
        <DepreciationTab outletId={outletId} role={role} />
      )}
    </div>
  );
}

function AssetListTab({ outletId, role }: { outletId: string; role: StaffRole }) {
  const { t } = useDashboardLang();
  const [bundle, setBundle] = useState<any>({ assets: [], rentalUnits: [], suppliers: [], cashBankAccounts: [], maintenanceLogs: [] });
  const [showForm, setShowForm] = useState(false);
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
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("assets.closeForm", "Tutup Form") : t("assets.newAssetButton", "+ Aset Baru")}</Button>}
      </div>

      {showForm && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("assets.formTitle", "Form Aset Baru")}</h2>
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
              {bundle.suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} disabled={form.recordAsPayable}>
              <option value="cash">{t("assets.paymentCash", "Cash")}</option><option value="bank">{t("assets.paymentBank", "Bank")}</option><option value="transfer">{t("assets.paymentTransfer", "Transfer")}</option><option value="qris">{t("assets.paymentQris", "QRIS")}</option>
            </select>
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.cashBankAccountId} onChange={(e) => setForm({ ...form, cashBankAccountId: e.target.value })} disabled={form.recordAsPayable}>
              <option value="">{t("assets.optionCashBankAccount", "Akun Kas/Bank")}</option>
              {bundle.cashBankAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={disposeFor.cashBankAccountId} onChange={(e) => setDisposeFor({ ...disposeFor, cashBankAccountId: e.target.value })}>
              <option value="">{t("assets.optionCashBankAccountResult", "Akun Kas/Bank (jika ada hasil)")}</option>
              {bundle.cashBankAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
                <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={maintFor.accountId} onChange={(e) => setMaintFor({ ...maintFor, accountId: e.target.value })}>
                  <option value="">{t("assets.optionExpenseAccount", "Akun Beban (COA)")}</option>
                  {expenseAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
                <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={maintFor.cashBankAccountId} onChange={(e) => setMaintFor({ ...maintFor, cashBankAccountId: e.target.value })}>
                  <option value="">{t("assets.optionCashBankAccountOrPayable", "Akun Kas/Bank (kosongkan = hutang)")}</option>
                  {bundle.cashBankAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("assets.tableName", "Nama")}</th><th>{t("assets.tableCategory", "Kategori")}</th><th>{t("assets.tableAcquisition", "Perolehan")}</th><th>{t("assets.tableAccumDepreciation", "Akum. Penyusutan")}</th><th>{t("assets.tableBookValue", "Nilai Buku")}</th><th>{t("assets.tableStatus", "Status")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {bundle.assets.map((a: any) => {
              const bookValue = a.acquisitionCost - a.accumulatedDepreciation;
              return (
                <tr key={a.id} className="border-b border-neutral-900 align-top">
                  <td className="py-2 text-xs font-medium">{a.name}</td>
                  <td className="text-xs">{categoryLabel(t, a.category)}</td>
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
        {bundle.assets.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("assets.emptyAssets", "Belum ada aset terdaftar.")}</div>}
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
