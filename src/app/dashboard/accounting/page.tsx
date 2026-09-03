"use client";
import { Fragment, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { PeriodBar, PeriodPreset, resolvePeriodPreset, describePeriod } from "@/components/reports/PeriodPicker";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-accounting";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputClsSm = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs";
function Field({ label, children }: { label: string; children: any }) {
  return <label className="space-y-1 block"><div className="text-xs text-neutral-500">{label}</div>{children}</label>;
}
const TABS = ["Chart of Accounts", "Account Mapping", "Jurnal", "Neraca Saldo", "Piutang (AR)", "Hutang (AP)", "Laba Rugi", "Neraca", "Arus Kas", "Migrasi Data"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL_KEYS: Record<Tab, { key: string; fallback: string }> = {
  "Chart of Accounts": { key: "accounting.tab.coa", fallback: "Chart of Accounts" },
  "Account Mapping": { key: "accounting.tab.mapping", fallback: "Account Mapping" },
  "Jurnal": { key: "accounting.tab.journal", fallback: "Jurnal" },
  "Neraca Saldo": { key: "accounting.tab.trialBalance", fallback: "Neraca Saldo" },
  "Piutang (AR)": { key: "accounting.tab.receivables", fallback: "Piutang (AR)" },
  "Hutang (AP)": { key: "accounting.tab.payables", fallback: "Hutang (AP)" },
  "Laba Rugi": { key: "accounting.tab.profitLoss", fallback: "Laba Rugi" },
  "Neraca": { key: "accounting.tab.balanceSheet", fallback: "Neraca" },
  "Arus Kas": { key: "accounting.tab.cashFlow", fallback: "Arus Kas" },
  "Migrasi Data": { key: "accounting.tab.migration", fallback: "Migrasi Data" },
};

export default function AccountingPage() {
  const [outletId, setOutletId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Neraca Saldo");
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const role = (user?.role ?? "cashier") as any;
  const isMigrationRole = role === "superuser" || role === "owner";
  const visibleTabs = TABS.filter((tb) => tb !== "Migrasi Data" || isMigrationRole);

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("accounting.header.title", "Accounting")}</h1>
        <p className="text-sm text-neutral-500">{t("accounting.header.subtitle", "Setiap transaksi rental & POS otomatis membuat jurnal debit/kredit di sini.")}</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {visibleTabs.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tb ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            {t(TAB_LABEL_KEYS[tb].key, TAB_LABEL_KEYS[tb].fallback)}
          </button>
        ))}
      </div>

      {!outletId ? null : tab === "Chart of Accounts" ? (
        <ChartOfAccountsTab outletId={outletId} />
      ) : tab === "Account Mapping" ? (
        <AccountMappingTab outletId={outletId} />
      ) : tab === "Jurnal" ? (
        <JournalTab outletId={outletId} />
      ) : tab === "Neraca Saldo" ? (
        <TrialBalanceTab outletId={outletId} />
      ) : tab === "Piutang (AR)" ? (
        <ReceivablesTab outletId={outletId} />
      ) : tab === "Hutang (AP)" ? (
        <PayablesTab outletId={outletId} />
      ) : tab === "Laba Rugi" ? (
        <ProfitLossTab outletId={outletId} />
      ) : tab === "Neraca" ? (
        <BalanceSheetTab outletId={outletId} />
      ) : tab === "Arus Kas" ? (
        <CashFlowTab outletId={outletId} />
      ) : (
        <DataMigrationTab outletId={outletId} />
      )}
    </div>
  );
}

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  parentId: string | null;
  isPostingAllowed: boolean;
  isActive: boolean;
  isSystemAccount: boolean;
  costCenter: string | null;
  taxCode: string | null;
}

const TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  asset: { key: "accounting.type.asset", fallback: "Aset" },
  liability: { key: "accounting.type.liability", fallback: "Liabilitas" },
  equity: { key: "accounting.type.equity", fallback: "Ekuitas" },
  revenue: { key: "accounting.type.revenue", fallback: "Pendapatan" },
  expense: { key: "accounting.type.expense", fallback: "Beban" },
};
const emptyAccountForm = { code: "", name: "", type: "asset", parentId: "", isPostingAllowed: true, costCenter: "", taxCode: "" };

/** Full Chart of Accounts CRUD: search/filter, tree + flat list view, create/edit/archive/delete, Header vs Posting Account distinction (headers group children in the tree and can never receive a journal posting — enforced server-side too). */
function ChartOfAccountsTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [view, setView] = useState<"tree" | "list">("tree");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAccountForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyAccountForm);

  const load = () => { fetchJsonArray(`/api/accounting/coa?outletId=${outletId}`).then(setRows); };
  useEffect(load, [outletId]);

  const createAccount = async () => {
    if (!form.code || !form.name) return showAlert(t("accounting.coa.alertRequiredFields", "Kode dan nama akun wajib diisi."));
    const res = await fetch("/api/accounting/coa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, outletId, parentId: form.parentId || null }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(emptyAccountForm);
    setShowForm(false);
    load();
  };

  const startEdit = (a: AccountRow) => {
    setEditingId(a.id);
    setEditForm({ code: a.code, name: a.name, type: a.type, parentId: a.parentId ?? "", isPostingAllowed: a.isPostingAllowed, costCenter: a.costCenter ?? "", taxCode: a.taxCode ?? "" });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyAccountForm); };
  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/accounting/coa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, parentId: editForm.parentId || null }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
  };
  const toggleActive = async (a: AccountRow) => {
    const res = await fetch(`/api/accounting/coa/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !a.isActive }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };
  const deleteAccount = async (a: AccountRow) => {
    if (!await showConfirm(t("accounting.coa.confirmDelete", 'Hapus akun "{account}"?').replace("{account}", `${a.code} — ${a.name}`))) return;
    const res = await fetch(`/api/accounting/coa/${a.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    if (data.softDeleted) showAlert(t("accounting.coa.archivedNotice", '"{name}" sudah pernah dipakai di jurnal, jadi diarsipkan (bukan dihapus permanen) agar riwayat jurnal tetap aman.').replace("{name}", a.name));
    load();
  };

  const matchesFilter = (a: AccountRow) => {
    if (!showInactive && !a.isActive) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (search && !`${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const byParent = new Map<string, AccountRow[]>();
  for (const a of rows) {
    if (!showInactive && !a.isActive) continue;
    const key = a.parentId ?? "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(a);
  }
  for (const list of byParent.values()) list.sort((x, y) => x.code.localeCompare(y.code));

  const potentialParents = rows.filter((a) => a.isActive).sort((x, y) => x.code.localeCompare(y.code));

  const renderRow = (a: AccountRow, depth: number, recurse: boolean): any => (
    <div key={a.id}>
      {editingId === a.id ? (
        <div className="py-2 space-y-2 border-b border-neutral-900" style={{ paddingLeft: depth * 16 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs font-mono" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} placeholder={t("accounting.coa.placeholderCode", "Kode")} />
            <input className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs col-span-2" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder={t("accounting.coa.placeholderName", "Nama")} />
            <select className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
              {Object.entries(TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className="col-span-2 rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={editForm.parentId} onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value })}>
              <option value="">{t("accounting.coa.noParentOption", "(Tanpa induk / top-level)")}</option>
              {potentialParents.filter((p) => p.id !== a.id).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-neutral-400"><input type="checkbox" checked={editForm.isPostingAllowed} onChange={(e) => setEditForm({ ...editForm, isPostingAllowed: e.target.checked })} /> {t("accounting.coa.postingAccountLabel", "Posting Account")}</label>
            <input className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={editForm.costCenter} onChange={(e) => setEditForm({ ...editForm, costCenter: e.target.value })} placeholder={t("accounting.coa.placeholderCostCenter", "Cost Center")} />
          </div>
          <div className="flex gap-2">
            <Button className="text-xs" onClick={() => saveEdit(a.id)}>{t("accounting.common.save", "Simpan")}</Button>
            <Button variant="ghost" className="text-xs" onClick={cancelEdit}>{t("accounting.common.cancel", "Batal")}</Button>
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-between py-1.5 border-b border-neutral-900 text-sm gap-2 ${!a.isActive ? "opacity-40" : ""}`} style={{ paddingLeft: depth * 16 }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-neutral-500 w-14 shrink-0">{a.code}</span>
            <span className={`truncate ${!a.isPostingAllowed ? "font-semibold text-neutral-300" : ""}`}>{a.name}</span>
            {!a.isPostingAllowed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0">{t("accounting.coa.headerBadge", "Header")}</span>}
            {!a.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 shrink-0">{t("accounting.coa.inactiveBadge", "Nonaktif")}</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-neutral-500 mr-2 hidden sm:inline">{TYPE_LABEL_KEYS[a.type] ? t(TYPE_LABEL_KEYS[a.type].key, TYPE_LABEL_KEYS[a.type].fallback) : a.type}</span>
            <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => startEdit(a)}>{t("accounting.common.edit", "Edit")}</Button>
            <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => toggleActive(a)}>{a.isActive ? t("accounting.coa.archiveButton", "Arsipkan") : t("accounting.coa.activateButton", "Aktifkan")}</Button>
            <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => deleteAccount(a)}>{t("accounting.common.delete", "Hapus")}</Button>
          </div>
        </div>
      )}
      {recurse && (byParent.get(a.id) ?? []).map((child) => renderRow(child, depth + 1, true))}
    </div>
  );

  const flatFiltered = rows.filter(matchesFilter).sort((x, y) => x.code.localeCompare(y.code));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("accounting.coa.searchPlaceholder", "Cari kode/nama akun...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">{t("accounting.coa.allTypes", "Semua Tipe")}</option>
          {Object.entries(TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-neutral-400"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> {t("accounting.coa.showInactiveLabel", "Tampilkan nonaktif")}</label>
        <div className="flex-1" />
        <div className="flex rounded-lg overflow-hidden border border-neutral-700">
          <button className={`px-3 py-1.5 text-xs ${view === "tree" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-400"}`} onClick={() => setView("tree")}>{t("accounting.coa.viewTree", "Tree")}</button>
          <button className={`px-3 py-1.5 text-xs ${view === "list" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-400"}`} onClick={() => setView("list")}>{t("accounting.coa.viewList", "List")}</button>
        </div>
        <Button className="text-xs" onClick={() => setShowForm((s) => !s)}>{showForm ? t("accounting.common.close", "Tutup") : t("accounting.coa.newAccountButton", "+ Akun Baru")}</Button>
      </div>

      {showForm && (
        <Card className="space-y-2 border-emerald-500/40">
          <h2 className="font-medium text-sm">{t("accounting.coa.newAccountHeading", "Akun Baru")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm font-mono" placeholder={t("accounting.coa.placeholderCodeExample", "Kode (mis. 4650)")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("accounting.coa.placeholderAccountName", "Nama akun")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">{t("accounting.coa.noParentOption", "(Tanpa induk / top-level)")}</option>
              {potentialParents.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-neutral-400"><input type="checkbox" checked={form.isPostingAllowed} onChange={(e) => setForm({ ...form, isPostingAllowed: e.target.checked })} /> {t("accounting.coa.postingAccountLabel", "Posting Account")}</label>
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("accounting.coa.placeholderCostCenterOptional", "Cost Center (opsional)")} value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} />
          </div>
          <p className="text-xs text-neutral-500">{t("accounting.coa.postingHelperText", 'Uncheck "Posting Account" untuk membuat akun Header (grouping) — header tidak bisa menerima jurnal langsung, hanya mengelompokkan akun turunannya di tree view.')}</p>
          <Button className="text-xs" onClick={createAccount}>{t("accounting.coa.saveAccountButton", "Simpan Akun")}</Button>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="max-h-[65vh] overflow-y-auto px-3">
          {view === "tree"
            ? (byParent.get("__root__") ?? []).map((a) => renderRow(a, 0, true))
            : flatFiltered.map((a) => renderRow(a, 0, false))}
          {rows.length === 0 && <p className="text-sm text-neutral-500 py-6 text-center">{t("accounting.common.loading", "Memuat...")}</p>}
        </div>
      </Card>
    </div>
  );
}

const MAPPING_MODULE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  rental: { key: "accounting.mapping.module.rental", fallback: "Rental" },
  fnb: { key: "accounting.mapping.module.fnb", fallback: "F&B (Revenue)" },
  fnb_cogs: { key: "accounting.mapping.module.fnbCogs", fallback: "F&B (HPP)" },
  ppob: { key: "accounting.mapping.module.ppob", fallback: "PPOB" },
  expense: { key: "accounting.mapping.module.expense", fallback: "Expense" },
  asset: { key: "accounting.mapping.module.asset", fallback: "Asset" },
  asset_accum_depr: { key: "accounting.mapping.module.assetAccumDepr", fallback: "Akumulasi Penyusutan" },
  depreciation: { key: "accounting.mapping.module.depreciation", fallback: "Beban Penyusutan" },
  payment: { key: "accounting.mapping.module.payment", fallback: "Payment" },
  product: { key: "accounting.mapping.module.product", fallback: "Product/Inventory" },
  other: { key: "accounting.mapping.module.other", fallback: "Lainnya" },
};

/** "⚙️ ACCOUNT MAPPING" — Module → Transaction → Default Account routing so cashiers never pick a COA code manually; the posting engine reads this table first and only falls back to its hardcoded default if a row is missing/inactive. */
function AccountMappingTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAccountId, setEditAccountId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: "rental", transactionKey: "", accountId: "", label: "" });

  const load = () => {
    fetchJsonArray(`/api/account-mappings?outletId=${outletId}`).then(setRows);
    fetchJsonArray(`/api/accounting/coa?outletId=${outletId}`).then(setAccounts);
  };
  useEffect(load, [outletId]);

  const postableAccounts = accounts.filter((a) => a.isPostingAllowed && a.isActive).sort((x, y) => x.code.localeCompare(y.code));

  const createMapping = async () => {
    if (!form.transactionKey || !form.accountId) return showAlert(t("accounting.mapping.alertRequiredFields", "Transaction key dan akun tujuan wajib diisi."));
    const res = await fetch("/api/account-mappings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ module: "rental", transactionKey: "", accountId: "", label: "" });
    setShowForm(false);
    load();
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/account-mappings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: editAccountId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setEditingId(null);
    load();
  };

  const toggleActive = async (m: any) => {
    const res = await fetch(`/api/account-mappings/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !m.isActive }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const deleteMapping = async (m: any) => {
    if (!await showConfirm(t("accounting.mapping.confirmDelete", 'Hapus mapping "{label}"? Modul ini akan kembali memakai akun default bawaan sistem.').replace("{label}", m.label ?? m.transactionKey))) return;
    const res = await fetch(`/api/account-mappings/${m.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const grouped = new Map<string, any[]>();
  for (const m of rows) {
    if (!grouped.has(m.module)) grouped.set(m.module, []);
    grouped.get(m.module)!.push(m);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        {t("accounting.mapping.explainer", "Kasir dan modul lain (Rental, F&B, PPOB, Expense, Asset, Payment) tidak pernah memilih akun COA secara manual — sistem otomatis memilih akun dari tabel ini berdasarkan modul + jenis transaksi. Ubah baris di bawah untuk mengarahkan transaksi ke akun COA lain; hapus baris untuk kembali ke akun default bawaan sistem.")}
      </p>

      <div className="flex justify-end">
        <Button className="text-xs" onClick={() => setShowForm((s) => !s)}>{showForm ? t("accounting.common.close", "Tutup") : t("accounting.mapping.newMappingButton", "+ Mapping Baru")}</Button>
      </div>

      {showForm && (
        <Card className="space-y-2 border-emerald-500/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}>
              {Object.entries(MAPPING_MODULE_LABEL_KEYS).map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
            </select>
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("accounting.mapping.placeholderTransactionKey", "Transaction key (mis. ps5, food, pulsa)")} value={form.transactionKey} onChange={(e) => setForm({ ...form, transactionKey: e.target.value })} />
            <select className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">{t("accounting.mapping.chooseTargetAccount", "Pilih akun tujuan...")}</option>
              {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("accounting.mapping.placeholderLabel", "Label (opsional, mis. Rental PS5)")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Button className="text-xs" onClick={createMapping}>{t("accounting.mapping.saveMappingButton", "Simpan Mapping")}</Button>
        </Card>
      )}

      {[...grouped.entries()].map(([module, list]) => (
        <Card key={module}>
          <h2 className="font-medium text-sm mb-2">{MAPPING_MODULE_LABEL_KEYS[module] ? t(MAPPING_MODULE_LABEL_KEYS[module].key, MAPPING_MODULE_LABEL_KEYS[module].fallback) : module}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-800">
                <th className="py-2">{t("accounting.mapping.table.transaction", "Transaksi")}</th><th>{t("accounting.mapping.table.label", "Label")}</th><th>{t("accounting.mapping.table.targetAccount", "Akun Tujuan")}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className={`border-b border-neutral-900 ${!m.isActive ? "opacity-40" : ""}`}>
                  <td className="py-2 font-mono text-xs">{m.transactionKey}</td>
                  <td className="text-xs text-neutral-400">{m.label ?? "-"}</td>
                  <td className="text-xs">
                    {editingId === m.id ? (
                      <select className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={editAccountId} onChange={(e) => setEditAccountId(e.target.value)}>
                        {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                    ) : (
                      <span className="font-mono">{m.accountCode}</span>
                    )}{" "}
                    {editingId !== m.id && <span className="text-neutral-500">{m.accountName}</span>}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {editingId === m.id ? (
                      <>
                        <Button className="text-xs px-2 py-1 mr-1" onClick={() => saveEdit(m.id)}>{t("accounting.common.save", "Simpan")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => setEditingId(null)}>{t("accounting.common.cancel", "Batal")}</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => { setEditingId(m.id); setEditAccountId(m.accountId); }}>{t("accounting.common.edit", "Edit")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => toggleActive(m)}>{m.isActive ? t("accounting.mapping.deactivateButton", "Nonaktifkan") : t("accounting.coa.activateButton", "Aktifkan")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => deleteMapping(m)}>{t("accounting.common.delete", "Hapus")}</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
      {rows.length === 0 && <p className="text-sm text-neutral-500">{t("accounting.mapping.emptyState", "Belum ada mapping tersimpan — sistem memakai akun default bawaan.")}</p>}
    </div>
  );
}

const SOURCE_TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  manual: { key: "accounting.journal.source.manual", fallback: "Manual" },
  rental: { key: "accounting.journal.source.rental", fallback: "Rental" },
  pos: { key: "accounting.journal.source.pos", fallback: "POS" },
  purchase_invoice: { key: "accounting.journal.source.purchaseInvoice", fallback: "Purchase Invoice" },
  purchase_payment: { key: "accounting.journal.source.purchasePayment", fallback: "Purchase Payment" },
  purchase_return: { key: "accounting.journal.source.purchaseReturn", fallback: "Purchase Return" },
  expense: { key: "accounting.journal.source.expense", fallback: "Expense" },
  refund: { key: "accounting.journal.source.refund", fallback: "Refund" },
  asset_purchase: { key: "accounting.journal.source.assetPurchase", fallback: "Pembelian Aset" },
  asset_disposal: { key: "accounting.journal.source.assetDisposal", fallback: "Pelepasan Aset" },
  depreciation: { key: "accounting.journal.source.depreciation", fallback: "Penyusutan" },
  receivable_payment: { key: "accounting.journal.source.receivablePayment", fallback: "Pelunasan Piutang" },
  opening_balance: { key: "accounting.journal.source.openingBalance", fallback: "Saldo Awal" },
  ppob: { key: "accounting.journal.source.ppob", fallback: "PPOB" },
};

const emptyJournalLine = () => ({ accountId: "", debit: "", credit: "", description: "" });

function JournalTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entryDate: new Date().toISOString().slice(0, 10), reference: "", description: "", lines: [emptyJournalLine(), emptyJournalLine()] });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as any;
  const canPostManual = hasPermission(role, "post_manual_journal");

  const load = () => {
    const qs = sourceFilter === "all" ? "" : `&sourceType=${sourceFilter}`;
    fetchJsonArray(`/api/accounting/journal?outletId=${outletId}${qs}`).then(setEntries);
    fetchJsonArray(`/api/accounting/coa?outletId=${outletId}`).then(setAccounts);
  };
  useEffect(load, [outletId, sourceFilter]);

  const postableAccounts = accounts.filter((a) => a.isPostingAllowed && a.isActive).sort((x, y) => x.code.localeCompare(y.code));

  const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = form.lines.length >= 2 && totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 1;

  const addLine = () => setForm({ ...form, lines: [...form.lines, emptyJournalLine()] });
  const removeLine = (i: number) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i: number, patch: Partial<ReturnType<typeof emptyJournalLine>>) =>
    setForm({ ...form, lines: form.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  const submitManual = async () => {
    if (!form.description) return showAlert(t("accounting.journal.alertDescriptionRequired", "Deskripsi jurnal wajib diisi."));
    if (!isBalanced) return showAlert(t("accounting.journal.alertMustBalance", "Total debit dan kredit harus sama dan lebih dari 0."));
    setSaving(true);
    try {
      const res = await fetch("/api/accounting/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, entryDate: new Date(form.entryDate).toISOString(), reference: form.reference || undefined, description: form.description, lines: form.lines }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm({ entryDate: new Date().toISOString().slice(0, 10), reference: "", description: "", lines: [emptyJournalLine(), emptyJournalLine()] });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const voidEntry = async (e: any) => {
    const reason = prompt(t("accounting.journal.voidPrompt", 'Alasan pembatalan jurnal "{description}"?').replace("{description}", e.description));
    if (reason === null) return;
    const res = await fetch(`/api/accounting/journal/${e.id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason || undefined }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">{t("accounting.journal.allSources", "Semua Sumber")}</option>
          <option value="manual">{t(SOURCE_TYPE_LABEL_KEYS.manual.key, SOURCE_TYPE_LABEL_KEYS.manual.fallback)}</option>
          {Object.entries(SOURCE_TYPE_LABEL_KEYS).filter(([k]) => k !== "manual").map(([k, meta]) => <option key={k} value={k}>{t(meta.key, meta.fallback)}</option>)}
        </select>
        <div className="flex-1" />
        {canPostManual && <Button className="text-xs" onClick={() => setShowForm((s) => !s)}>{showForm ? t("accounting.common.close", "Tutup") : t("accounting.journal.newManualButton", "+ Jurnal Manual")}</Button>}
      </div>

      {showForm && (
        <Card className="space-y-3 border-emerald-500/40">
          <h2 className="font-medium text-sm">{t("accounting.journal.formHeading", "Input Jurnal Manual")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Field label={t("accounting.journal.fieldDate", "Tanggal")}><input type="date" className={inputClsSm} value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} /></Field>
            <Field label={t("accounting.journal.fieldReference", "Referensi (opsional)")}><input className={inputClsSm} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
            <Field label={t("accounting.journal.fieldDescription", "Deskripsi")}><input className={inputClsSm} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("accounting.journal.placeholderDescriptionExample", "mis. Penyesuaian saldo kas")} /></Field>
          </div>

          <div className="space-y-2">
            {form.lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select className={`${inputClsSm} col-span-4`} value={line.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}>
                  <option value="">{t("accounting.common.chooseAccount", "Pilih akun...")}</option>
                  {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input className={`${inputClsSm} col-span-2`} placeholder={t("accounting.journal.placeholderKeterangan", "Keterangan")} value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                <input type="number" className={`${inputClsSm} col-span-2`} placeholder={t("accounting.common.debit", "Debit")} value={line.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })} />
                <input type="number" className={`${inputClsSm} col-span-2`} placeholder={t("accounting.common.credit", "Kredit")} value={line.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })} />
                <button className="col-span-2 text-xs text-red-400 hover:underline" onClick={() => removeLine(i)} disabled={form.lines.length <= 2}>{t("accounting.journal.removeLineButton", "Hapus baris")}</button>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="text-xs" onClick={addLine}>{t("accounting.journal.addLineButton", "+ Tambah Baris")}</Button>

          <div className="flex items-center justify-between text-sm border-t border-neutral-800 pt-2">
            <div className="flex gap-4">
              <span>{t("accounting.common.totalDebitLabel", "Total Debit:")} <strong>{rupiah(totalDebit)}</strong></span>
              <span>{t("accounting.common.totalCreditLabel", "Total Kredit:")} <strong>{rupiah(totalCredit)}</strong></span>
            </div>
            <span className={isBalanced ? "text-emerald-400" : "text-red-400"}>{isBalanced ? t("accounting.common.balanceOk", "Balance ✓") : t("accounting.journal.notBalanced", "Belum balance")}</span>
          </div>

          <Button onClick={submitManual} disabled={saving || !isBalanced}>{saving ? t("accounting.common.saving", "Menyimpan...") : t("accounting.journal.postButton", "Posting Jurnal")}</Button>
        </Card>
      )}

      {entries.length === 0 && <p className="text-sm text-neutral-500">{t("accounting.journal.emptyState", "Belum ada jurnal.")}</p>}
      {entries.map((e) => (
        <Card key={e.id}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium">{e.description}</div>
              <div className="text-xs text-neutral-500">{e.reference} · {new Date(e.entryDate).toLocaleString("id-ID")} · {SOURCE_TYPE_LABEL_KEYS[e.sourceType] ? t(SOURCE_TYPE_LABEL_KEYS[e.sourceType].key, SOURCE_TYPE_LABEL_KEYS[e.sourceType].fallback) : e.sourceType}</div>
            </div>
            <div className="flex items-center gap-2">
              {e.status === "void" && <span className="text-xs text-red-400">{t("accounting.journal.voidBadge", "VOID")}</span>}
              {e.status !== "void" && e.sourceType === "manual" && canPostManual && (
                <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => voidEntry(e)}>{t("accounting.journal.voidButton", "Batalkan")}</Button>
              )}
            </div>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {e.lines.map((l: any) => (
                <tr key={l.id} className="border-t border-neutral-900">
                  <td className="py-1 font-mono">{l.accountCode}</td>
                  <td>{l.accountName}</td>
                  <td className="text-right">{l.debit > 0 ? rupiah(l.debit) : ""}</td>
                  <td className="text-right">{l.credit > 0 ? rupiah(l.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

function DownloadButtons({ outletId, reportType, from, to, showZero }: { outletId: string; reportType: string; from?: string; to?: string; showZero?: boolean }) {
  const { t } = useDashboardLang();
  const qs = new URLSearchParams({ outletId, type: reportType, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(showZero ? { showZero: "1" } : {}) });
  return (
    <div className="flex gap-2">
      <a href={`/api/accounting/reports/export?${qs}&format=xlsx`} target="_blank" rel="noreferrer">
        <Button variant="secondary" className="text-xs">{t("accounting.download.excel", "Download Excel")}</Button>
      </a>
      <a href={`/api/accounting/reports/export?${qs}&format=pdf`} target="_blank" rel="noreferrer">
        <Button variant="secondary" className="text-xs">{t("accounting.download.pdf", "Download PDF")}</Button>
      </a>
    </div>
  );
}

function usePeriodState(defaultPreset: PeriodPreset = "this_month") {
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { from, to } = resolvePeriodPreset(preset, customFrom, customTo);
  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, from, to };
}

function TrialBalanceTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<any[]>([]);
  const [showZero, setShowZero] = useState(false);
  const period = usePeriodState("this_month");

  useEffect(() => {
    const qs = new URLSearchParams({ outletId, ...(period.from ? { from: period.from } : {}), ...(period.to ? { to: period.to } : {}) });
    fetchJsonArray(`/api/accounting/trial-balance?${qs}`).then(setRows);
  }, [outletId, period.from, period.to]);

  const totalDebit = rows.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.filter((r) => r.isPostingAllowed).reduce((s, r) => s + r.credit, 0);

  const byId = new Map(rows.map((r) => [r.accountId, r]));
  const childrenOf = new Map<string, any[]>();
  for (const r of rows) {
    const key = r.parentId ?? "__root__";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(r);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.code.localeCompare(b.code));

  const amountsCache = new Map<string, { debit: number; credit: number; balance: number }>();
  const computeAmounts = (id: string): { debit: number; credit: number; balance: number } => {
    if (amountsCache.has(id)) return amountsCache.get(id)!;
    const row = byId.get(id);
    let result: { debit: number; credit: number; balance: number };
    if (row?.isPostingAllowed) {
      result = { debit: row.debit, credit: row.credit, balance: row.balance };
    } else {
      const kids = childrenOf.get(id) ?? [];
      result = kids.reduce((acc, k) => { const a = computeAmounts(k.accountId); return { debit: acc.debit + a.debit, credit: acc.credit + a.credit, balance: acc.balance + a.balance }; }, { debit: 0, credit: 0, balance: 0 });
    }
    amountsCache.set(id, result);
    return result;
  };

  const renderNode = (r: any, depth: number): any => {
    const amounts = computeAmounts(r.accountId);
    const isZero = amounts.debit === 0 && amounts.credit === 0;
    if (isZero && !showZero) return null;
    const kids = childrenOf.get(r.accountId) ?? [];
    return (
      <Fragment key={r.accountId}>
        <tr className={`border-b border-neutral-900 ${!r.isPostingAllowed ? "font-semibold text-neutral-300" : ""}`}>
          <td className="py-1.5 font-mono text-xs" style={{ paddingLeft: depth * 16 }}>{r.code}</td>
          <td className="text-sm">{r.name}</td>
          <td className="text-right text-sm">{amounts.debit ? rupiah(amounts.debit) : ""}</td>
          <td className="text-right text-sm">{amounts.credit ? rupiah(amounts.credit) : ""}</td>
          <td className="text-right text-sm font-medium">{amounts.balance ? rupiah(amounts.balance) : ""}</td>
        </tr>
        {kids.map((k) => renderNode(k, depth + 1))}
      </Fragment>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodBar preset={period.preset} setPreset={period.setPreset} customFrom={period.customFrom} setCustomFrom={period.setCustomFrom} customTo={period.customTo} setCustomTo={period.setCustomTo} />
        <DownloadButtons outletId={outletId} reportType="trial-balance" from={period.from} to={period.to} showZero={showZero} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-xs text-neutral-400"><input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} /> {t("accounting.trialBalance.showZeroLabel", "Tampilkan akun bersaldo nol (terinci lengkap)")}</label>
        <span className="text-xs text-neutral-500">{t("accounting.common.periodPrefix", "Periode:")} {describePeriod(period.preset, period.from, period.to)}</span>
      </div>
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800">
            <th className="py-2">{t("accounting.trialBalance.table.code", "Kode")}</th><th>{t("accounting.trialBalance.table.account", "Akun")}</th><th className="text-right">{t("accounting.common.debit", "Debit")}</th><th className="text-right">{t("accounting.common.credit", "Kredit")}</th><th className="text-right">{t("accounting.trialBalance.table.balance", "Saldo")}</th>
          </tr>
        </thead>
        <tbody>
          {(childrenOf.get("__root__") ?? []).map((r) => renderNode(r, 0))}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-800 font-semibold">
            <td colSpan={2} className="py-2">{t("accounting.trialBalance.table.total", "Total")}</td>
            <td className="text-right">{rupiah(totalDebit)}</td>
            <td className="text-right">{rupiah(totalCredit)}</td>
            <td className={`text-right ${Math.abs(totalDebit - totalCredit) < 1 ? "text-emerald-400" : "text-red-400"}`}>
              {Math.abs(totalDebit - totalCredit) < 1 ? t("accounting.common.balanceOk", "Balance ✓") : t("accounting.trialBalance.notBalanced", "TIDAK BALANCE")}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
    </div>
  );
}

const AGING_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  current: { key: "accounting.aging.current", fallback: "Belum Jatuh Tempo" },
  d1_30: { key: "accounting.aging.d1_30", fallback: "1-30 Hari" },
  d31_60: { key: "accounting.aging.d31_60", fallback: "31-60 Hari" },
  d60plus: { key: "accounting.aging.d60plus", fallback: ">60 Hari" },
};

function AgingCards({ buckets }: { buckets: Record<string, number> }) {
  const { t } = useDashboardLang();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Object.entries(AGING_LABEL_KEYS).map(([key, meta]) => (
        <Card key={key} className="text-center py-3">
          <div className={`text-lg font-semibold ${key === "d60plus" ? "text-red-400" : key === "d31_60" ? "text-amber-400" : ""}`}>{rupiah(buckets[key] ?? 0)}</div>
          <div className="text-xs text-neutral-500">{t(meta.key, meta.fallback)}</div>
        </Card>
      ))}
    </div>
  );
}

function ReceivablesTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [collectFor, setCollectFor] = useState<{ id: string; orderId: string | null; outstanding: number; method: string; amount: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetchJsonObject(`/api/accounting/receivables?outletId=${outletId}`).then(setData);
  };
  useEffect(load, [outletId]);

  const collect = async () => {
    if (!collectFor?.orderId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${collectFor.orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: collectFor.method, amount: collectFor.amount }),
      });
      const payment = await res.json();
      if (!res.ok) return showAlert(payment.error);
      if (collectFor.method === "cash") {
        await fetch(`/api/payments/${payment.id}/confirm-cash`, { method: "POST" });
      }
      setCollectFor(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="text-sm text-neutral-500">{t("accounting.common.loading", "Memuat...")}</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("accounting.receivables.explainer", "Piutang tercipta otomatis saat order/rental dibayar sebagian — sisa tagihan dibukukan ke akun 1100 Piutang Usaha. Terima pelunasan langsung dari sini lewat mekanisme pembayaran yang sama, tidak perlu input ulang.")}</p>
      <Card className="text-center py-4">
        <div className="text-2xl font-bold text-amber-400">{rupiah(data.totalOutstanding)}</div>
        <div className="text-xs text-neutral-500">{t("accounting.receivables.totalOutstanding", "Total Piutang Outstanding ({count} tagihan)").replace("{count}", String(data.count))}</div>
      </Card>
      <AgingCards buckets={data.agingBuckets} />

      {collectFor && (
        <Card className="space-y-2 border-emerald-500/40">
          <h2 className="font-medium">{t("accounting.receivables.collectFormHeading", "Terima Pembayaran Piutang")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
              value={collectFor.amount}
              max={collectFor.outstanding}
              onChange={(e) => setCollectFor({ ...collectFor, amount: Number(e.target.value) })}
            />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={collectFor.method} onChange={(e) => setCollectFor({ ...collectFor, method: e.target.value })}>
              <option value="cash">{t("accounting.common.methodCash", "Cash")}</option>
              <option value="transfer">{t("accounting.common.methodTransfer", "Transfer")}</option>
              <option value="qris">{t("accounting.common.methodQris", "QRIS")}</option>
              <option value="card">{t("accounting.common.methodCard", "Kartu")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={collect} disabled={busy}>{busy ? t("accounting.common.processing", "Memproses...") : t("accounting.receivables.collectButton", "Terima Pembayaran")}</Button>
            <Button variant="ghost" onClick={() => setCollectFor(null)}>{t("accounting.common.cancel", "Batal")}</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("accounting.receivables.table.customer", "Customer")}</th><th>{t("accounting.receivables.table.outstanding", "Outstanding")}</th><th>{t("accounting.receivables.table.dueDate", "Jatuh Tempo")}</th><th>{t("accounting.receivables.table.age", "Umur")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.detail.map((r: any) => (
              <tr key={r.id} className="border-b border-neutral-900">
                <td className="py-2 text-xs">{r.customerName}</td>
                <td className="text-xs">{rupiah(r.outstanding)}</td>
                <td className="text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("id-ID") : "-"}</td>
                <td className={`text-xs ${r.agingBucket === "d60plus" ? "text-red-400" : r.agingBucket === "d31_60" ? "text-amber-400" : ""}`}>
                  {r.daysOverdue > 0 ? t("accounting.receivables.daysOverdue", "{n} hari").replace("{n}", String(r.daysOverdue)) : t("accounting.receivables.notYetDue", "Belum jatuh tempo")}
                </td>
                <td className="text-right">
                  {r.orderId && (
                    <Button
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => setCollectFor({ id: r.id, orderId: r.orderId, outstanding: r.outstanding, method: "cash", amount: r.outstanding })}
                    >
                      {t("accounting.receivables.collectRowButton", "Terima Bayar")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data.detail.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-neutral-500">{t("accounting.receivables.emptyState", "Tidak ada piutang outstanding.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PayablesTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [payFor, setPayFor] = useState<{ type: string; id: string; outstanding: number; method: string; amount: number; cashBankAccountId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const load = () => {
    fetchJsonObject(`/api/accounting/payables?outletId=${outletId}`).then(setData);
    fetchJsonArray(`/api/cash-bank-accounts?outletId=${outletId}`).then(setCashBankAccounts);
  };
  useEffect(load, [outletId]);

  const pay = async () => {
    if (!payFor) return;
    if (!payFor.cashBankAccountId) return showAlert(t("accounting.payables.alertChooseCashBank", "Pilih akun kas/bank."));
    setBusy(true);
    try {
      const url = payFor.type === "purchase_invoice" ? `/api/purchase-invoices/${payFor.id}/pay` : `/api/expenses/${payFor.id}/pay`;
      const body =
        payFor.type === "purchase_invoice"
          ? { amount: payFor.amount, method: payFor.method, cashBankAccountId: payFor.cashBankAccountId, staffUserId: user?.id }
          : { method: payFor.method, cashBankAccountId: payFor.cashBankAccountId };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) return showAlert(result.error);
      setPayFor(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="text-sm text-neutral-500">{t("accounting.common.loading", "Memuat...")}</div>;
  const typeLabelKeys: Record<string, { key: string; fallback: string }> = {
    purchase_invoice: { key: "accounting.payables.typeSupplierDebt", fallback: "Hutang Supplier" },
    expense: { key: "accounting.payables.typeExpenseDebt", fallback: "Expense (Hutang Lain-lain)" },
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("accounting.payables.explainer", "Gabungan hutang supplier (purchase invoice) dan expense yang dicatat sebagai hutang — pembayaran tetap lewat mekanisme masing-masing yang sudah ada, tampilan ini hanya konsolidasi + aging supaya tidak perlu buka dua tempat terpisah.")}</p>
      <Card className="text-center py-4">
        <div className="text-2xl font-bold text-amber-400">{rupiah(data.totalOutstanding)}</div>
        <div className="text-xs text-neutral-500">{t("accounting.payables.totalOutstanding", "Total Hutang Outstanding ({count} tagihan)").replace("{count}", String(data.count))}</div>
      </Card>
      <AgingCards buckets={data.agingBuckets} />

      {payFor && (
        <Card className="space-y-2 border-emerald-500/40">
          <h2 className="font-medium">{t("accounting.payables.payFormHeading", "Bayar Hutang")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {payFor.type === "purchase_invoice" && (
              <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={payFor.amount} onChange={(e) => setPayFor({ ...payFor, amount: Number(e.target.value) })} />
            )}
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={payFor.method} onChange={(e) => setPayFor({ ...payFor, method: e.target.value })}>
              <option value="cash">{t("accounting.common.methodCash", "Cash")}</option>
              <option value="bank">{t("accounting.common.methodBank", "Bank")}</option>
              <option value="transfer">{t("accounting.common.methodTransfer", "Transfer")}</option>
            </select>
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={payFor.cashBankAccountId} onChange={(e) => setPayFor({ ...payFor, cashBankAccountId: e.target.value })}>
              <option value="">{t("accounting.payables.cashBankAccountOption", "Akun Kas/Bank")}</option>
              {cashBankAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={pay} disabled={busy}>{busy ? t("accounting.common.processing", "Memproses...") : t("accounting.payables.payButton", "Bayar")}</Button>
            <Button variant="ghost" onClick={() => setPayFor(null)}>{t("accounting.common.cancel", "Batal")}</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("accounting.payables.table.type", "Tipe")}</th><th>{t("accounting.payables.table.payee", "Payee")}</th><th>{t("accounting.payables.table.reference", "Referensi")}</th><th>{t("accounting.payables.table.outstanding", "Outstanding")}</th><th>{t("accounting.payables.table.age", "Umur")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.detail.map((r: any) => (
              <tr key={`${r.type}-${r.id}`} className="border-b border-neutral-900">
                <td className="py-2 text-xs">{typeLabelKeys[r.type] ? t(typeLabelKeys[r.type].key, typeLabelKeys[r.type].fallback) : r.type}</td>
                <td className="text-xs">{r.payee}</td>
                <td className="text-xs font-mono">{r.reference}</td>
                <td className="text-xs">{rupiah(r.amount)}</td>
                <td className={`text-xs ${r.agingBucket === "d60plus" ? "text-red-400" : r.agingBucket === "d31_60" ? "text-amber-400" : ""}`}>
                  {r.daysOverdue > 0 ? t("accounting.receivables.daysOverdue", "{n} hari").replace("{n}", String(r.daysOverdue)) : t("accounting.receivables.notYetDue", "Belum jatuh tempo")}
                </td>
                <td className="text-right">
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    onClick={() => setPayFor({ type: r.type, id: r.id, outstanding: r.amount, method: "cash", amount: r.amount, cashBankAccountId: "" })}
                  >
                    {t("accounting.payables.payButton", "Bayar")}
                  </Button>
                </td>
              </tr>
            ))}
            {data.detail.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-neutral-500">{t("accounting.payables.emptyState", "Tidak ada hutang outstanding.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const newPeriodEntry = () => ({ preset: "this_month" as PeriodPreset, customFrom: "", customTo: "" });

function ProfitLossTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [pl, setPl] = useState<any>(null);
  const period = usePeriodState("this_month");
  const [compareMode, setCompareMode] = useState(false);
  const [periods, setPeriods] = useState([newPeriodEntry(), newPeriodEntry()]);
  const [compareData, setCompareData] = useState<any[] | null>(null);

  useEffect(() => {
    if (compareMode) return;
    const qs = new URLSearchParams({ outletId, ...(period.from ? { from: period.from } : {}), ...(period.to ? { to: period.to } : {}) });
    fetchJsonObject(`/api/accounting/profit-loss?${qs}`).then(setPl);
  }, [outletId, period.from, period.to, compareMode]);

  const runCompare = async () => {
    const results = await Promise.all(
      periods.map(async (p) => {
        const { from, to } = resolvePeriodPreset(p.preset, p.customFrom, p.customTo);
        const qs = new URLSearchParams({ outletId, ...(from ? { from } : {}), ...(to ? { to } : {}) });
        const data = await fetchJsonObject<any>(`/api/accounting/profit-loss?${qs}`);
        return { label: describePeriod(p.preset, from, to), from, to, data };
      })
    );
    setCompareData(results);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!compareMode ? (
          <PeriodBar preset={period.preset} setPreset={period.setPreset} customFrom={period.customFrom} setCustomFrom={period.setCustomFrom} customTo={period.customTo} setCustomTo={period.setCustomTo} />
        ) : <span className="text-sm font-medium">{t("accounting.pl.multiPeriodMode", "Mode Multi-Periode")}</span>}
        <div className="flex items-center gap-2">
          {!compareMode && <DownloadButtons outletId={outletId} reportType="profit-loss" from={period.from} to={period.to} />}
          <Button variant="secondary" className="text-xs" onClick={() => { setCompareMode((c) => !c); setCompareData(null); }}>
            {compareMode ? t("accounting.pl.compareToggleOff", "Kembali ke Periode Tunggal") : t("accounting.pl.compareToggleOn", "Bandingkan Multi-Periode")}
          </Button>
        </div>
      </div>

      {compareMode && (
        <Card className="space-y-3">
          <div className="space-y-2">
            {periods.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border-b border-neutral-900 pb-2">
                <span className="text-xs text-neutral-500 w-16">{t("accounting.pl.periodLabel", "Periode {n}").replace("{n}", String(i + 1))}</span>
                <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={p.preset} onChange={(e) => setPeriods(periods.map((x, idx) => idx === i ? { ...x, preset: e.target.value as PeriodPreset } : x))}>
                  {["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year", "custom"].map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                {p.preset === "custom" && (
                  <>
                    <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={p.customFrom} onChange={(e) => setPeriods(periods.map((x, idx) => idx === i ? { ...x, customFrom: e.target.value } : x))} />
                    <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={p.customTo} onChange={(e) => setPeriods(periods.map((x, idx) => idx === i ? { ...x, customTo: e.target.value } : x))} />
                  </>
                )}
                {periods.length > 2 && <button className="text-xs text-red-400" onClick={() => setPeriods(periods.filter((_, idx) => idx !== i))}>{t("accounting.common.delete", "Hapus")}</button>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {periods.length < 4 && <Button variant="secondary" className="text-xs" onClick={() => setPeriods([...periods, newPeriodEntry()])}>{t("accounting.pl.addPeriodButton", "+ Tambah Periode")}</Button>}
            <Button className="text-xs" onClick={runCompare}>{t("accounting.pl.compareButton", "Bandingkan")}</Button>
          </div>
        </Card>
      )}

      {compareMode && compareData && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-800">
                <th className="py-2">{t("accounting.pl.table.account", "Akun")}</th>
                {compareData.map((c, i) => <th key={i} className="text-right whitespace-nowrap px-2">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-900"><td colSpan={compareData.length + 1} className="py-1 text-xs font-semibold text-neutral-400">{t("accounting.type.revenue", "Pendapatan")}</td></tr>
              {[...new Set(compareData.flatMap((c) => c.data.revenue.filter((r: any) => r.balance !== 0).map((r: any) => r.name)))].map((name) => (
                <tr key={String(name)} className="border-b border-neutral-900">
                  <td className="py-1">{name}</td>
                  {compareData.map((c, i) => <td key={i} className="text-right px-2">{rupiah(c.data.revenue.find((r: any) => r.name === name)?.balance ?? 0)}</td>)}
                </tr>
              ))}
              <tr className="border-b border-neutral-900"><td colSpan={compareData.length + 1} className="py-1 text-xs font-semibold text-neutral-400 pt-3">{t("accounting.type.expense", "Beban")}</td></tr>
              {[...new Set(compareData.flatMap((c) => c.data.expense.filter((r: any) => r.balance !== 0).map((r: any) => r.name)))].map((name) => (
                <tr key={String(name)} className="border-b border-neutral-900">
                  <td className="py-1">{name}</td>
                  {compareData.map((c, i) => <td key={i} className="text-right px-2">{rupiah(c.data.expense.find((r: any) => r.name === name)?.balance ?? 0)}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-800"><td className="py-1 text-neutral-500">{t("accounting.pl.grossSales", "Gross Sales")}</td>{compareData.map((c, i) => <td key={i} className="text-right px-2 text-neutral-500">{rupiah(c.data.grossRevenue)}</td>)}</tr>
              <tr><td className="py-1 text-amber-400">{t("accounting.pl.discount", "Discount")}</td>{compareData.map((c, i) => <td key={i} className="text-right px-2 text-amber-400">-{rupiah(c.data.totalDiscount)}</td>)}</tr>
              <tr className="font-semibold"><td className="py-2">{t("accounting.pl.totalRevenueNet", "Total Pendapatan (Net)")}</td>{compareData.map((c, i) => <td key={i} className="text-right px-2 text-emerald-400">{rupiah(c.data.totalRevenue)}</td>)}</tr>
              <tr className="font-semibold"><td className="py-2">{t("accounting.pl.grossProfit", "Laba Kotor")}</td>{compareData.map((c, i) => <td key={i} className="text-right px-2">{rupiah(c.data.grossProfit)}</td>)}</tr>
              <tr className="font-semibold"><td className="py-2">{t("accounting.pl.netProfit", "Laba Bersih")}</td>{compareData.map((c, i) => <td key={i} className={`text-right px-2 ${c.data.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rupiah(c.data.netProfit)}</td>)}</tr>
            </tfoot>
          </table>
        </Card>
      )}

      {!compareMode && pl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card><div className="text-xs text-neutral-500">{t("accounting.pl.totalRevenueCard", "Total Pendapatan")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(pl.totalRevenue)}</div></Card>
          <Card><div className="text-xs text-neutral-500">{t("accounting.pl.grossProfit", "Laba Kotor")}</div><div className="text-xl font-bold">{rupiah(pl.grossProfit)}</div></Card>
          <Card><div className="text-xs text-neutral-500">{t("accounting.pl.netProfit", "Laba Bersih")}</div><div className={`text-xl font-bold ${pl.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rupiah(pl.netProfit)}</div></Card>

          <Card className="lg:col-span-3">
            <div className="text-xs text-neutral-500 mb-2">{t("accounting.common.periodPrefix", "Periode:")} {describePeriod(period.preset, period.from, period.to)}</div>

            {pl.totalDiscount > 0 && (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm space-y-1">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">{t("accounting.pl.grossDiscountNetHeading", "Gross → Discount → Net")}</div>
                <div className="flex justify-between"><span className="text-neutral-400">{t("accounting.pl.grossSales", "Gross Sales")}</span><span>{rupiah(pl.grossRevenue)}</span></div>
                <div className="flex justify-between text-amber-400"><span>{t("accounting.pl.discount", "Discount")}</span><span>-{rupiah(pl.totalDiscount)}</span></div>
                <div className="flex justify-between font-semibold pt-1 border-t border-amber-500/20"><span>{t("accounting.pl.netSales", "Net Sales")}</span><span className="text-emerald-400">{rupiah(pl.netRevenue)}</span></div>
              </div>
            )}

            <h2 className="font-medium mb-2 text-sm text-neutral-400">{t("accounting.type.revenue", "Pendapatan")}</h2>
            {pl.revenue.filter((r: any) => r.balance !== 0).map((r: any) => (
              <div key={r.accountId} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{rupiah(r.balance)}</span></div>
            ))}
            <h2 className="font-medium mb-2 mt-4 text-sm text-neutral-400">{t("accounting.type.expense", "Beban")}</h2>
            {pl.expense.filter((r: any) => r.balance !== 0).map((r: any) => (
              <div key={r.accountId} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{rupiah(r.balance)}</span></div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function BalanceSheetTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [bs, setBs] = useState<any>(null);
  const [asOf, setAsOf] = useState("");
  useEffect(() => {
    const qs = new URLSearchParams({ outletId, ...(asOf ? { asOf: new Date(asOf).toISOString() } : {}) });
    fetchJsonObject(`/api/accounting/balance-sheet?${qs}`).then(setBs);
  }, [outletId, asOf]);
  if (!bs) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Field label={t("accounting.bs.fieldAsOf", "Per Tanggal (kosongkan untuk hari ini)")}><input type="date" className={inputClsSm} value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
        <DownloadButtons outletId={outletId} reportType="balance-sheet" to={asOf ? new Date(asOf).toISOString() : undefined} />
      </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <h2 className="font-medium mb-2">{t("accounting.bs.assetsHeading", "Aset")}</h2>
        {bs.assets.filter((r: any) => r.balance !== 0).map((r: any) => (
          <div key={r.accountId} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{rupiah(r.balance)}</span></div>
        ))}
        <div className="flex justify-between text-sm py-2 border-t border-neutral-800 font-semibold mt-2"><span>{t("accounting.bs.totalAssets", "Total Aset")}</span><span>{rupiah(bs.totalAssets)}</span></div>
      </Card>
      <Card>
        <h2 className="font-medium mb-2">{t("accounting.bs.liabilitiesEquityHeading", "Liabilitas & Ekuitas")}</h2>
        {bs.liabilities.filter((r: any) => r.balance !== 0).map((r: any) => (
          <div key={r.accountId} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{rupiah(r.balance)}</span></div>
        ))}
        {bs.equity.filter((r: any) => r.balance !== 0).map((r: any) => (
          <div key={r.accountId} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{rupiah(r.balance)}</span></div>
        ))}
        <div className="flex justify-between text-sm py-1"><span>{t("accounting.bs.currentPeriodProfit", "Laba Berjalan (belum ditutup)")}</span><span>{rupiah(bs.currentPeriodNetProfit)}</span></div>
        <div className="flex justify-between text-sm py-2 border-t border-neutral-800 font-semibold mt-2">
          <span>{t("accounting.bs.totalLiabilitiesEquity", "Total Liabilitas + Ekuitas")}</span><span>{rupiah(bs.totalLiabilities + bs.totalEquityWithRetainedEarnings)}</span>
        </div>
        <div className={`text-xs mt-1 ${bs.balances ? "text-emerald-400" : "text-red-400"}`}>{bs.balances ? t("accounting.bs.balanced", "Neraca balance ✓") : t("accounting.bs.notBalanced", "TIDAK BALANCE — periksa jurnal")}</div>
      </Card>
    </div>
    </div>
  );
}


function CashFlowTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [cf, setCf] = useState<any>(null);
  const period = usePeriodState("this_month");

  const load = () => {
    const params = new URLSearchParams({ outletId });
    if (period.from) params.set("from", period.from);
    if (period.to) params.set("to", period.to);
    fetchJsonObject(`/api/accounting/cash-flow?${params}`).then(setCf);
  };

  useEffect(load, [outletId, period.from, period.to]);
  if (!cf) return null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodBar preset={period.preset} setPreset={period.setPreset} customFrom={period.customFrom} setCustomFrom={period.setCustomFrom} customTo={period.customTo} setCustomTo={period.setCustomTo} />
          <DownloadButtons outletId={outletId} reportType="cash-flow" from={period.from} to={period.to} />
        </div>
        <div className="text-xs text-neutral-500 mt-2">{describePeriod(period.preset, period.from, period.to)}</div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs text-neutral-500">{t("accounting.cf.cashIn", "Kas Masuk")}</div><div className="text-xl font-bold text-emerald-400">{rupiah(cf.totalIn)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("accounting.cf.cashOut", "Kas Keluar")}</div><div className="text-xl font-bold text-red-400">{rupiah(cf.totalOut)}</div></Card>
        <Card><div className="text-xs text-neutral-500">{t("accounting.cf.netCashFlow", "Arus Kas Bersih")}</div><div className={`text-xl font-bold ${cf.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rupiah(cf.netCashFlow)}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-2">{t("accounting.cf.cashInDetail", "Rincian Kas Masuk")}</h2>
          {cf.inByCategory.length === 0 && <p className="text-sm text-neutral-500">{t("accounting.cf.noData", "Tidak ada data.")}</p>}
          {cf.inByCategory.map((r: any) => (
            <div key={r.category} className="flex justify-between text-sm py-1 capitalize"><span>{r.category}</span><span>{rupiah(r.amount)}</span></div>
          ))}
        </Card>
        <Card>
          <h2 className="font-medium mb-2">{t("accounting.cf.cashOutDetail", "Rincian Kas Keluar")}</h2>
          {cf.outByCategory.length === 0 && <p className="text-sm text-neutral-500">{t("accounting.cf.noData", "Tidak ada data.")}</p>}
          {cf.outByCategory.map((r: any) => (
            <div key={r.category} className="flex justify-between text-sm py-1 capitalize"><span>{r.category}</span><span>{rupiah(r.amount)}</span></div>
          ))}
        </Card>
      </div>

      <Card>
        <h2 className="font-medium mb-2">{t("accounting.cf.dailyCashFlow", "Arus Kas Harian")}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("accounting.cf.table.date", "Tanggal")}</th><th className="text-right">{t("accounting.cf.table.in", "Masuk")}</th><th className="text-right">{t("accounting.cf.table.out", "Keluar")}</th><th className="text-right">{t("accounting.cf.table.net", "Bersih")}</th></tr></thead>
          <tbody>
            {cf.byDay.map((d: any) => (
              <tr key={d.date} className="border-b border-neutral-900">
                <td className="py-2">{new Date(d.date).toLocaleDateString("id-ID")}</td>
                <td className="text-right text-emerald-400">{rupiah(d.in)}</td>
                <td className="text-right text-red-400">{rupiah(d.out)}</td>
                <td className={`text-right font-medium ${d.net >= 0 ? "" : "text-red-400"}`}>{rupiah(d.net)}</td>
              </tr>
            ))}
            {cf.byDay.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-neutral-500">{t("accounting.cf.emptyState", "Belum ada transaksi kas.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// Expense recording moved to its own full module — see /dashboard/expenses (Expense Management):
// approval workflow, AP/hutang support, cost centers, recurring expenses, attachments, reports.
// This page's Jurnal/Neraca Saldo/Laba Rugi/Neraca/Arus Kas tabs pick up every expense journal
// automatically since they all read live from journalLines — nothing else here needed to change.

/**
 * "Migrasi Data" — recommended path for bringing data over from a previous
 * app: (1) Saldo Awal (Opening Balance) for account balances as of a
 * cutover date — the standard, safe way to preserve balance-sheet
 * continuity without replaying every old transaction; (2) Impor Data
 * Historis for owners who also want old Penjualan/Pembelian/Pendapatan
 * Lain-lain/Pengeluaran to show up in reports, via Excel templates. Both
 * are Owner/Superuser-only (page-level gate above) since bulk-injecting
 * financial history is high-trust, one-time work.
 */
function DataMigrationTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30">
        <h2 className="font-medium mb-1">{t("accounting.migration.recoHeading", "Rekomendasi Alur Migrasi")}</h2>
        <p className="text-xs text-neutral-500">
          {t("accounting.migration.recoPart1", "1) Isi ")}<strong>{t("accounting.migration.recoSaldoAwalBold", "Saldo Awal")}</strong>{t("accounting.migration.recoPart2", " di bawah dengan saldo kas/bank/piutang/hutang/aset/modal per tanggal cutover (hari mulai pakai app ini) — ini cukup untuk Neraca yang benar ke depannya. 2) Kalau kamu juga mau riwayat Penjualan/Pembelian/Pendapatan Lain-lain/Pengeluaran lama tetap muncul di laporan (Laba Rugi historis, tren), pakai ")}<strong>{t("accounting.migration.recoImporBold", "Impor Data Historis")}</strong>{t("accounting.migration.recoPart3", " lewat template Excel di bawah. Data yang diimpor langsung masuk ke jurnal dengan tanggal aslinya — tidak melalui alur kasir/approval biasa, karena memang sudah terjadi di masa lalu.")}
        </p>
      </Card>

      <OpeningBalanceCard outletId={outletId} />

      <Card>
        <h2 className="font-medium mb-1">{t("accounting.migration.importHeading", "Impor Data Historis (Excel)")}</h2>
        <p className="text-xs text-neutral-500 mb-3">
          {t("accounting.migration.importDescription", "Download template, isi dari data lama (export Excel/CSV dari aplikasi sebelumnya atau catatan manual), lalu upload kembali. Penjualan/Pembelian/Pengeluaran historis masuk ke Jurnal & Laporan Keuangan saja (tidak muncul di daftar Transaksi/Purchasing/Expense Management, karena bukan order/expense sungguhan) — Pendapatan Lain-lain historis MUNCUL juga di halaman Pendapatan Lain-lain, karena pakai mesin pencatatan yang sama persis.")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HistoricalImportCard outletId={outletId} category="penjualan" title={t("accounting.migration.categoryPenjualan", "Penjualan")} />
          <HistoricalImportCard outletId={outletId} category="pembelian" title={t("accounting.migration.categoryPembelian", "Pembelian")} />
          <HistoricalImportCard outletId={outletId} category="pendapatan_lain" title={t("accounting.migration.categoryPendapatanLain", "Pendapatan Lain-lain")} />
          <HistoricalImportCard outletId={outletId} category="pengeluaran" title={t("accounting.migration.categoryPengeluaran", "Pengeluaran")} />
        </div>
      </Card>
    </div>
  );
}

function OpeningBalanceCard({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [existing, setExisting] = useState<any>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [cutoverDate, setCutoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<{ accountId: string; debit: string; credit: string }[]>([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    fetchJsonObject(`/api/accounting/opening-balance?outletId=${outletId}`).then(setExisting);
    fetchJsonArray(`/api/accounting/coa?outletId=${outletId}`).then(setAccounts);
  };
  useEffect(load, [outletId]);

  const postableAccounts = accounts.filter((a) => a.isPostingAllowed && a.isActive).sort((x, y) => x.code.localeCompare(y.code));
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 1;

  const addLine = () => setLines([...lines, { accountId: "", debit: "", credit: "" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<{ accountId: string; debit: string; credit: string }>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const loadAllAccounts = () => setLines(postableAccounts.map((a) => ({ accountId: a.id, debit: "", credit: "" })));

  const submit = async () => {
    setMsg("");
    if (!isBalanced) return setMsg(t("accounting.openingBalance.validationMsg", "Total debit harus sama dengan total kredit, dan lebih dari 0."));
    setSaving(true);
    const res = await fetch("/api/accounting/opening-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, cutoverDate, lines: lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setMsg(data.error);
    setLines([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
    load();
  };

  const voidExisting = async () => {
    const reason = prompt(t("accounting.openingBalance.voidPrompt", "Alasan void Saldo Awal ini? (mis. salah input, mau diganti)")) ?? "";
    if (!reason.trim()) return;
    const res = await fetch("/api/accounting/opening-balance", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, reason }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <Card>
      <h2 className="font-medium mb-1">{t("accounting.openingBalance.heading", "Saldo Awal (Opening Balance)")}</h2>
      <p className="text-xs text-neutral-500 mb-3">
        {t("accounting.openingBalance.description", "Satu jurnal berisi saldo tiap akun (Kas, Bank, Piutang, Hutang, Aset, Modal, dst.) per tanggal cutover — cara standar migrasi sistem akuntansi, tanpa perlu memindahkan tiap transaksi lama satu-satu. Total debit harus sama dengan total kredit.")}
      </p>

      {existing ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2">
          <div className="text-sm font-medium text-emerald-400">{t("accounting.openingBalance.alreadyActive", "Saldo Awal sudah aktif ({date})").replace("{date}", new Date(existing.entry.entryDate).toLocaleDateString("id-ID"))}</div>
          <table className="w-full text-xs">
            <tbody>
              {existing.lines.map((l: any) => (
                <tr key={l.id} className="border-b border-neutral-900">
                  <td className="py-1">{l.accountCode} — {l.accountName}</td>
                  <td className="text-right text-emerald-400">{l.debit > 0 ? rupiah(l.debit) : ""}</td>
                  <td className="text-right text-amber-400">{l.credit > 0 ? rupiah(l.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="ghost" className="text-xs text-red-400" onClick={voidExisting}>{t("accounting.openingBalance.voidButton", "Void Saldo Awal Ini (untuk ganti)")}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label={t("accounting.openingBalance.fieldCutoverDate", "Tanggal Cutover")}>
            <input type="date" className={inputClsSm} value={cutoverDate} onChange={(e) => setCutoverDate(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">{t("accounting.openingBalance.lineCount", "{n} baris").replace("{n}", String(lines.length))}</span>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-xs" onClick={loadAllAccounts}>{t("accounting.openingBalance.loadAllAccountsButton", "Muat Semua Akun Postable")}</Button>
              <Button variant="ghost" className="text-xs" onClick={addLine}>{t("accounting.openingBalance.addLineButton", "+ Baris")}</Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <select className={`${inputClsSm} col-span-6`} value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}>
                  <option value="">{t("accounting.common.chooseAccount", "Pilih akun...")}</option>
                  {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input type="number" className={`${inputClsSm} col-span-2`} placeholder={t("accounting.common.debit", "Debit")} value={l.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })} />
                <input type="number" className={`${inputClsSm} col-span-2`} placeholder={t("accounting.common.credit", "Kredit")} value={l.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })} />
                <button className="col-span-2 text-xs text-red-400" onClick={() => removeLine(i)}>{t("accounting.common.delete", "Hapus")}</button>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-neutral-800">
            <span>{t("accounting.common.totalDebitLabel", "Total Debit:")} <span className="font-medium">{rupiah(totalDebit)}</span></span>
            <span>{t("accounting.common.totalCreditLabel", "Total Kredit:")} <span className="font-medium">{rupiah(totalCredit)}</span></span>
            <span className={isBalanced ? "text-emerald-400" : "text-red-400"}>{isBalanced ? t("accounting.common.balanceOk", "Balance ✓") : t("accounting.openingBalance.notBalanced", "Belum Balance")}</span>
          </div>
          {msg && <div className="text-xs text-red-400">{msg}</div>}
          <Button onClick={submit} disabled={!isBalanced || saving}>{saving ? t("accounting.common.saving", "Menyimpan...") : t("accounting.openingBalance.postButton", "Posting Saldo Awal")}</Button>
        </div>
      )}
    </Card>
  );
}

const HISTORICAL_CATEGORY_DESC_KEYS: Record<string, { key: string; fallback: string }> = {
  penjualan: { key: "accounting.migration.descPenjualan", fallback: "Total penjualan lama (per hari/per transaksi) beserta metode pembayaran." },
  pembelian: { key: "accounting.migration.descPembelian", fallback: "Pembelian stok/bahan baku atau operasional lama, tunai atau hutang." },
  pendapatan_lain: { key: "accounting.migration.descPendapatanLain", fallback: "Komisi, sewa aset, penjualan barang bekas, dan pendapatan non-inti lain dari masa lalu." },
  pengeluaran: { key: "accounting.migration.descPengeluaran", fallback: "Beban operasional lama (gaji, sewa, listrik, internet, dll), tunai atau hutang." },
};

function HistoricalImportCard({ outletId, category, title }: { outletId: string; category: string; title: string }) {
  const { t } = useDashboardLang();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const upload = async () => {
    if (!file) return showAlert(t("accounting.historicalImport.alertChooseFile", "Pilih file Excel (.xlsx) dulu."));
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("outletId", outletId);
    fd.append("category", category);
    fd.append("file", file);
    const res = await fetch("/api/accounting/historical-import", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { showAlert(data.error); return; }
    setResult(data);
    setFile(null);
  };

  const errorRows = (result?.details ?? []).filter((d: any) => d.action === "error");

  return (
    <div className="rounded-lg border border-neutral-800 p-3 space-y-2">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-neutral-500">{HISTORICAL_CATEGORY_DESC_KEYS[category] ? t(HISTORICAL_CATEGORY_DESC_KEYS[category].key, HISTORICAL_CATEGORY_DESC_KEYS[category].fallback) : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/api/accounting/historical-import/template?category=${category}`} className="text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 px-3 py-2 font-medium transition">{t("accounting.historicalImport.downloadTemplate", "Download Template")}</a>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="text-xs text-neutral-400 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-xs file:text-neutral-200 file:cursor-pointer"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button onClick={upload} disabled={!file || uploading} className="text-xs">{uploading ? t("accounting.historicalImport.uploading", "Mengimpor...") : t("accounting.historicalImport.uploadButton", "Upload & Impor")}</Button>
      </div>
      {result && (
        <div className="text-xs space-y-1">
          <div className={result.errors > 0 ? "text-amber-400" : "text-emerald-400"}>
            {t("accounting.historicalImport.resultLine", "{posted} dari {total} baris berhasil diposting").replace("{posted}", String(result.posted)).replace("{total}", String(result.totalRows))}{result.errors > 0 ? t("accounting.historicalImport.resultErrorsSuffix", ", {errors} error").replace("{errors}", String(result.errors)) : ""}.
          </div>
          {errorRows.length > 0 && (
            <ul className="max-h-32 overflow-y-auto space-y-0.5 text-red-400">
              {errorRows.map((e: any, i: number) => <li key={i}>{t("accounting.historicalImport.errorRowPrefix", "Baris {row}:").replace("{row}", String(e.row))} {e.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
