"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-expenses";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["Dashboard", "Daftar Expense", "Cost Center", "Recurring"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL_KEY: Record<Tab, { key: string; fallback: string }> = {
  Dashboard: { key: "expenses.tab.dashboard", fallback: "Dashboard" },
  "Daftar Expense": { key: "expenses.tab.list", fallback: "Daftar Expense" },
  "Cost Center": { key: "expenses.tab.costCenter", fallback: "Cost Center" },
  Recurring: { key: "expenses.tab.recurring", fallback: "Recurring" },
};

const STATUS_BADGE: Record<string, string> = {
  draft: "unknown",
  pending_approval: "pending",
  approved: "occupied",
  paid: "success",
  rejected: "failed",
  cancelled: "maintenance",
};
const STATUS_LABEL_KEY: Record<string, { key: string; fallback: string }> = {
  draft: { key: "expenses.status.draft", fallback: "Draft" },
  pending_approval: { key: "expenses.status.pendingApproval", fallback: "Pending Approval" },
  approved: { key: "expenses.status.approved", fallback: "Approved (Belum Dibayar)" },
  paid: { key: "expenses.status.paid", fallback: "Paid" },
  rejected: { key: "expenses.status.rejected", fallback: "Rejected" },
  cancelled: { key: "expenses.status.cancelled", fallback: "Cancelled" },
};

export default function ExpensesPage() {
  const { t } = useDashboardLang();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [outletId, setOutletId] = useState<string | null>(null);
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("expenses.title", "Expense Management")}</h1>
        <p className="text-sm text-neutral-500">
          {t("expenses.subtitle", "Pintu masuk transaksi biaya ke accounting — setiap expense yang disetujui otomatis membuat jurnal, masuk ke General Ledger, Trial Balance, Laba Rugi, Arus Kas, dan Neraca.")}
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((tabItem) => (
          <button key={tabItem} onClick={() => setTab(tabItem)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tabItem ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>{t(TAB_LABEL_KEY[tabItem].key, TAB_LABEL_KEY[tabItem].fallback)}</button>
        ))}
      </div>

      {!outletId ? null : tab === "Dashboard" ? (
        <DashboardTab outletId={outletId} />
      ) : tab === "Daftar Expense" ? (
        <ExpenseListTab outletId={outletId} role={role} staffUserId={user?.id ?? ""} />
      ) : tab === "Cost Center" ? (
        <CostCenterTab outletId={outletId} role={role} />
      ) : (
        <RecurringTab outletId={outletId} role={role} />
      )}
    </div>
  );
}

function DashboardTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetchJsonObject(`/api/expenses/dashboard?outletId=${outletId}`).then(setData); }, [outletId]);
  if (!data) return <div className="text-sm text-neutral-500">{t("expenses.loading", "Memuat...")}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="text-center py-3"><div className="text-lg font-semibold">{rupiah(data.totalToday)}</div><div className="text-xs text-neutral-500">{t("expenses.today", "Hari Ini")}</div></Card>
        <Card className="text-center py-3"><div className="text-lg font-semibold">{rupiah(data.totalMonth)}</div><div className="text-xs text-neutral-500">{t("expenses.thisMonth", "Bulan Ini")}</div></Card>
        <Card className="text-center py-3"><div className="text-lg font-semibold text-amber-400">{rupiah(data.outstanding)}</div><div className="text-xs text-neutral-500">{t("expenses.outstandingPayable", "Outstanding (Hutang)")}</div></Card>
        <Card className="text-center py-3"><div className="text-lg font-semibold text-amber-400">{data.pendingApprovalCount}</div><div className="text-xs text-neutral-500">{t("expenses.stat.pendingApprovalWithAmount", "Pending Approval ({amount})").replace("{amount}", rupiah(data.pendingApprovalAmount))}</div></Card>
        <Card className="text-center py-3"><div className="text-lg font-semibold text-emerald-400">{rupiah(data.paidThisMonth)}</div><div className="text-xs text-neutral-500">{t("expenses.stat.paidThisMonth", "Paid Bulan Ini")}</div></Card>
        <Card className="text-center py-3"><div className="text-lg font-semibold">{data.dueSoonCount}</div><div className="text-xs text-neutral-500">{t("expenses.stat.dueSoon", "Jatuh Tempo ≤3 Hari")}</div></Card>
      </div>

      {data.dueSoonCount > 0 && (
        <Card className="border-amber-500/40">
          <h2 className="font-medium mb-2 text-amber-400">{t("expenses.paymentReminder", "Payment Reminder")}</h2>
          <div className="space-y-1 text-sm">
            {data.dueSoon.map((e: any) => (
              <div key={e.id} className="flex justify-between"><span>{e.expenseNumber} — {e.description}</span><span>{rupiah(e.amount)} · {t("expenses.dueDateLabel", "jatuh tempo")} {new Date(e.dueDate).toLocaleDateString("id-ID")}</span></div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-3">{t("expenses.categoryThisMonth", "Expense by Category (Bulan Ini)")}</h2>
          <div className="space-y-1 text-sm">
            {data.byCategory.length === 0 && <div className="text-neutral-500">{t("expenses.noData", "Belum ada data.")}</div>}
            {data.byCategory.map((c: any) => (
              <div key={c.label} className="flex justify-between"><span>{c.label}</span><span>{rupiah(c.amount)}</span></div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-medium mb-3">{t("expenses.branchThisMonth", "Expense by Branch (Bulan Ini)")}</h2>
          <div className="space-y-1 text-sm">
            {data.byBranch.map((b: any) => (
              <div key={b.key} className="flex justify-between"><span>{b.label}</span><span>{rupiah(b.amount)}</span></div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("expenses.trend30d", "Expense Trend (30 Hari)")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {data.trend.length === 0 && <div className="text-neutral-500">{t("expenses.noData", "Belum ada data.")}</div>}
          {data.trend.map((tr: any) => (
            <div key={tr.date} className="rounded-lg bg-neutral-800/60 px-2 py-1 flex justify-between"><span className="text-neutral-500">{tr.date.slice(5)}</span><span>{rupiah(tr.amount)}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ExpenseListTab({ outletId, role, staffUserId }: { outletId: string; role: StaffRole; staffUserId: string }) {
  const { t } = useDashboardLang();
  const statusLabel = (s: string) => {
    const entry = STATUS_LABEL_KEY[s];
    return entry ? t(entry.key, entry.fallback) : s;
  };
  const [bundle, setBundle] = useState<any>({ expenses: [], accounts: [], costCenters: [], suppliers: [], rentalUnits: [], staff: [] });
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({
    accountId: "", category: "", description: "", payeeName: "", supplierId: "",
    qty: 1, amount: 0, taxAmount: 0, paymentMethod: "cash", cashBankAccountId: "",
    recordAsPayable: false, costCenterId: "", rentalUnitId: "", dueDate: "", attachmentUrl: "",
  });
  const [payFor, setPayFor] = useState<{ id: string; method: string; cashBankAccountId: string } | null>(null);

  const canManage = hasPermission(role, "manage_expenses");
  const canApprove = hasPermission(role, "approve_expenses");
  const canVoid = hasPermission(role, "void_expense");

  // Cash Out Cepat — a minimal 3-field shortcut for small register spending (parkir, beli air
  // galon, dll) that doesn't need the full expense form below. It's still a real Expense under
  // the hood (same createExpense + submitExpense engine as "+ Expense Baru", same auto-approve-
  // under-threshold rule from outlet.expenseApprovalThreshold) — just pre-filled to cash payment
  // so it posts in one click instead of filling 10+ fields.
  const [cashOutForm, setCashOutForm] = useState({ accountId: "", amount: "", note: "" });
  const [cashOutBusy, setCashOutBusy] = useState(false);
  const defaultCashAccount = cashBankAccounts.find((c: any) => c.type === "cash" && c.isDefault) ?? cashBankAccounts.find((c: any) => c.type === "cash");

  const submitCashOut = async () => {
    if (!cashOutForm.accountId || !cashOutForm.amount) return showAlert(t("expenses.alert.selectCategoryAndAmount", "Pilih kategori beban dan isi nominal."));
    if (!defaultCashAccount) return showAlert(t("expenses.alert.noCashAccount", "Belum ada akun Kas — atur dulu di halaman Pembayaran."));
    setCashOutBusy(true);
    try {
      const accountLabel = bundle.accounts.find((a: any) => a.id === cashOutForm.accountId)?.name ?? "Cash Out";
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          accountId: cashOutForm.accountId,
          category: accountLabel,
          description: cashOutForm.note || `Cash Out — ${accountLabel}`,
          qty: 1,
          amount: Number(cashOutForm.amount),
          paymentMethod: "cash",
          cashBankAccountId: defaultCashAccount.id,
          recordAsPayable: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      if (data.submitResult === "pending_approval") {
        showAlert(t("expenses.alert.overThreshold", 'Nominal melebihi batas approval otomatis — Cash Out ini menunggu persetujuan dulu (lihat status "Pending Approval" di daftar bawah).'));
      }
      setCashOutForm({ accountId: "", amount: "", note: "" });
      load();
    } finally {
      setCashOutBusy(false);
    }
  };

  const load = () => {
    const qs = statusFilter ? `&status=${statusFilter}` : "";
    fetchJsonObject(`/api/expenses?outletId=${outletId}${qs}`).then((d) => d && setBundle(d));
    fetchJsonArray(`/api/cash-bank-accounts?outletId=${outletId}`).then(setCashBankAccounts);
  };
  useEffect(() => { load(); }, [outletId, statusFilter]);

  const accountName = (id: string) => bundle.accounts.find((a: any) => a.id === id)?.name ?? bundle.accounts.find((a: any) => a.id === id)?.code ?? "-";

  const uploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/expenses/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm((f: any) => ({ ...f, attachmentUrl: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const submitCreate = async () => {
    if (!form.accountId || !form.category || !form.amount) return showAlert(t("expenses.alert.requiredFields", "Akun, kategori, dan nominal wajib diisi."));
    if (!form.recordAsPayable && !form.cashBankAccountId) return showAlert(t("expenses.alert.selectCashBankOrPayable", "Pilih akun kas/bank, atau centang 'Catat sebagai hutang'."));
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, outletId, qty: Number(form.qty) || 1, amount: Number(form.amount), taxAmount: Number(form.taxAmount) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ accountId: "", category: "", description: "", payeeName: "", supplierId: "", qty: 1, amount: 0, taxAmount: 0, paymentMethod: "cash", cashBankAccountId: "", recordAsPayable: false, costCenterId: "", rentalUnitId: "", dueDate: "", attachmentUrl: "" });
    setShowForm(false);
    load();
  };

  const act = async (id: string, action: "submit" | "approve" | "cancel" | "reject" | "void", extra?: any) => {
    const res = await fetch(`/api/expenses/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(extra ?? {}) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const submitPay = async () => {
    if (!payFor?.cashBankAccountId) return showAlert(t("expenses.alert.selectCashBank", "Pilih akun kas/bank."));
    const res = await fetch(`/api/expenses/${payFor.id}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: payFor.method, cashBankAccountId: payFor.cashBankAccountId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setPayFor(null);
    load();
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="space-y-2 border-amber-500/30">
          <div>
            <h2 className="font-medium text-amber-400">{t("expenses.cashOutQuick", "Cash Out Cepat")}</h2>
            <p className="text-xs text-neutral-500">{t("expenses.cashOutDescription", "Pengeluaran kas kecil (parkir, beli air galon, dll) — langsung lunas dari {account}, tanpa isi form lengkap.").replace("{account}", defaultCashAccount?.name ?? t("expenses.defaultCashAccountName", "akun Kas"))}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" value={cashOutForm.accountId} onChange={(e) => setCashOutForm({ ...cashOutForm, accountId: e.target.value })}>
              <option value="">{t("expenses.optionCategoryAccount", "Kategori (Akun Beban)")}</option>
              {bundle.accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderAmountRp", "Nominal (Rp)")} value={cashOutForm.amount} onChange={(e) => setCashOutForm({ ...cashOutForm, amount: e.target.value })} />
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderNote", "Catatan (opsional)")} value={cashOutForm.note} onChange={(e) => setCashOutForm({ ...cashOutForm, note: e.target.value })} />
          </div>
          <Button onClick={submitCashOut} disabled={cashOutBusy}>{cashOutBusy ? t("expenses.processing", "Memproses...") : t("expenses.recordCashOut", "Catat Cash Out")}</Button>
        </Card>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("expenses.allStatus", "Semua Status")}</option>
          {Object.entries(STATUS_LABEL_KEY).map(([k, entry]) => <option key={k} value={k}>{t(entry.key, entry.fallback)}</option>)}
        </select>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("expenses.closeForm", "Tutup Form") : t("expenses.newExpense", "+ Expense Baru")}</Button>}
      </div>

      {showForm && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("expenses.formTitle", "Form Expense")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">{t("expenses.optionAccountCoa", "Akun Beban (COA)")}</option>
              {bundle.accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderCategoryExample", "Kategori (mis. Listrik)")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} title={t("expenses.dueDateTooltip", "Jatuh tempo (jika hutang)")} />

            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("expenses.placeholderDescription", "Deskripsi")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderPayee", "Payee (nama, jika bukan supplier)")} value={form.payeeName} onChange={(e) => setForm({ ...form, payeeName: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">{t("expenses.optionSupplier", "Supplier (opsional)")}</option>
              {bundle.suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderQty", "Qty")} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.amountLabel", "Nominal")} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderTax", "Pajak (opsional)")} value={form.taxAmount || ""} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}>
              <option value="">{t("expenses.optionCostCenter", "Cost Center (opsional)")}</option>
              {bundle.costCenters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.rentalUnitId} onChange={(e) => setForm({ ...form, rentalUnitId: e.target.value })}>
              <option value="">{t("expenses.optionRentalUnit", "Unit PS terkait (opsional)")}</option>
              {bundle.rentalUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} disabled={form.recordAsPayable}>
              <option value="cash">{t("expenses.method.cash", "Cash")}</option><option value="bank">{t("expenses.method.bank", "Bank")}</option><option value="transfer">{t("expenses.method.transfer", "Transfer")}</option><option value="qris">{t("expenses.method.qris", "QRIS")}</option>
            </select>
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.cashBankAccountId} onChange={(e) => setForm({ ...form, cashBankAccountId: e.target.value })} disabled={form.recordAsPayable}>
              <option value="">{t("expenses.optionCashBankAccount", "Akun Kas/Bank")}</option>
              {cashBankAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={form.recordAsPayable} onChange={(e) => setForm({ ...form, recordAsPayable: e.target.checked })} /> {t("expenses.recordAsPayableCheckbox", "Catat sebagai hutang (belum dibayar)")}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])} className="text-xs" />
            {uploading && <span className="text-xs text-neutral-500">{t("expenses.uploading", "Mengunggah...")}</span>}
            {form.attachmentUrl && <a href={form.attachmentUrl} target="_blank" className="text-xs text-emerald-400">{t("expenses.viewProof", "Lihat bukti")}</a>}
          </div>

          <Button onClick={submitCreate}>{t("expenses.saveAndSubmit", "Simpan & Submit")}</Button>
        </Card>
      )}

      {payFor && (
        <Card className="space-y-2 border-emerald-500/40">
          <h2 className="font-medium">{t("expenses.payDebtTitle", "Bayar Hutang Expense")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={payFor.method} onChange={(e) => setPayFor({ ...payFor, method: e.target.value })}>
              <option value="cash">{t("expenses.method.cash", "Cash")}</option><option value="bank">{t("expenses.method.bank", "Bank")}</option><option value="transfer">{t("expenses.method.transfer", "Transfer")}</option><option value="qris">{t("expenses.method.qris", "QRIS")}</option>
            </select>
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={payFor.cashBankAccountId} onChange={(e) => setPayFor({ ...payFor, cashBankAccountId: e.target.value })}>
              <option value="">{t("expenses.optionCashBankAccount", "Akun Kas/Bank")}</option>
              {cashBankAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={submitPay}>{t("expenses.action.pay", "Bayar")}</Button>
            <Button variant="ghost" onClick={() => setPayFor(null)}>{t("expenses.action.batal", "Batal")}</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("expenses.table.no", "No.")}</th><th>{t("expenses.table.date", "Tanggal")}</th><th>{t("expenses.table.account", "Akun")}</th><th>{t("expenses.placeholderDescription", "Deskripsi")}</th><th>{t("expenses.amountLabel", "Nominal")}</th><th>{t("expenses.table.status", "Status")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {bundle.expenses.map((e: any) => (
              <tr key={e.id} className="border-b border-neutral-900 align-top">
                <td className="py-2 font-mono text-xs">{e.expenseNumber}</td>
                <td className="text-xs">{new Date(e.expenseDate).toLocaleDateString("id-ID")}</td>
                <td className="text-xs">{accountName(e.accountId)}</td>
                <td className="text-xs max-w-[200px] truncate" title={e.description}>{e.description || e.category}</td>
                <td>{rupiah(e.amount + (e.taxAmount ?? 0))}</td>
                <td><Badge status={STATUS_BADGE[e.status]}>{statusLabel(e.status)}</Badge></td>
                <td className="text-right space-y-1">
                  <div className="flex flex-col items-end gap-1">
                    {e.status === "draft" && canManage && <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => act(e.id, "submit")}>{t("expenses.action.submit", "Submit")}</Button>}
                    {e.status === "rejected" && canManage && <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => act(e.id, "submit")}>{t("expenses.action.submitAgain", "Submit Ulang")}</Button>}
                    {["draft", "pending_approval"].includes(e.status) && canManage && (
                      <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => { const r = prompt(t("expenses.promptCancelReason", "Alasan cancel?")); if (r !== null) act(e.id, "cancel", { reason: r }); }}>{t("expenses.action.cancel", "Cancel")}</Button>
                    )}
                    {e.status === "pending_approval" && canApprove && (
                      <>
                        <Button className="text-xs px-2 py-1" onClick={() => act(e.id, "approve")}>{t("expenses.action.approve", "Approve")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => { const r = prompt(t("expenses.promptRejectReason", "Alasan reject?")); if (r) act(e.id, "reject", { reason: r }); }}>{t("expenses.action.reject", "Reject")}</Button>
                      </>
                    )}
                    {e.status === "approved" && e.recordAsPayable && canManage && (
                      <Button className="text-xs px-2 py-1" onClick={() => setPayFor({ id: e.id, method: "cash", cashBankAccountId: "" })}>{t("expenses.action.pay", "Bayar")}</Button>
                    )}
                    {["approved", "paid"].includes(e.status) && canVoid && (
                      <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => { const r = prompt(t("expenses.promptVoidReason", "Alasan void (akan membalik jurnal)?")); if (r) act(e.id, "void", { reason: r }); }}>{t("expenses.action.void", "Void")}</Button>
                    )}
                    {e.attachmentUrl && <a href={e.attachmentUrl} target="_blank" className="text-[10px] text-neutral-500 underline">{t("expenses.proofLink", "bukti")}</a>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bundle.expenses.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("expenses.emptyList", "Belum ada expense.")}</div>}
      </Card>
    </div>
  );
}

function CostCenterTab({ outletId, role }: { outletId: string; role: StaffRole }) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const canManage = hasPermission(role, "manage_expenses");

  const load = () => fetchJsonArray(`/api/cost-centers?outletId=${outletId}`).then(setRows);
  useEffect(() => { load(); }, [outletId]);

  const create = async () => {
    if (!form.name) return;
    const res = await fetch("/api/cost-centers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ name: "", code: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("expenses.costCenterExplainer", 'Cost center = pembagian biaya per divisi/area (Rental, F&B, Kitchen, Administration, dst) dalam satu cabang — dipakai untuk laporan "biaya per cost center".')}</p>
      {canManage && (
        <Card>
          <h2 className="font-medium mb-3">{t("expenses.addCostCenterTitle", "Tambah Cost Center")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderNameCostCenter", "Nama (mis. Kitchen)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderCode", "Kode (opsional)")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Button onClick={create}>{t("expenses.addButton", "Tambah")}</Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map((c) => (
          <Card key={c.id} className="text-center py-3"><div className="font-medium">{c.name}</div>{c.code && <div className="text-xs text-neutral-500">{c.code}</div>}</Card>
        ))}
      </div>
      {rows.length === 0 && <div className="text-sm text-neutral-500">{t("expenses.emptyCostCenter", "Belum ada cost center.")}</div>}
    </div>
  );
}

function RecurringTab({ outletId, role }: { outletId: string; role: StaffRole }) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", accountId: "", category: "", amount: 0, taxAmount: 0, recordAsPayable: true, frequency: "monthly", dayOfMonth: 1, nextDueDate: "" });
  const canManage = hasPermission(role, "manage_expenses");

  const load = () => {
    fetchJsonArray(`/api/expenses/recurring?outletId=${outletId}`).then(setRows);
    fetchJsonObject(`/api/expenses?outletId=${outletId}`).then((d: any) => d && setAccounts(d.accounts));
  };
  useEffect(() => { load(); }, [outletId]);

  const create = async () => {
    if (!form.name || !form.accountId || !form.category || !form.amount || !form.nextDueDate) return showAlert(t("expenses.alert.recurringRequiredFields", "Nama, akun, kategori, nominal, dan tanggal jatuh tempo berikutnya wajib diisi."));
    const res = await fetch("/api/expenses/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId, amount: Number(form.amount), taxAmount: Number(form.taxAmount) || 0, dayOfMonth: Number(form.dayOfMonth) || undefined, nextDueDate: new Date(form.nextDueDate).toISOString() }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ name: "", accountId: "", category: "", amount: 0, taxAmount: 0, recordAsPayable: true, frequency: "monthly", dayOfMonth: 1, nextDueDate: "" });
    load();
  };

  const deactivate = async (id: string) => {
    if (!await showConfirm(t("expenses.confirmDeactivateRecurring", "Nonaktifkan recurring expense ini?"))) return;
    await fetch(`/api/expenses/recurring/${id}`, { method: "DELETE" });
    load();
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/expenses/recurring/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setLastResult(data);
      load();
    } finally {
      setGenerating(false);
    }
  };

  const frequencyLabel = (f: string) => f === "monthly" ? t("expenses.frequency.monthly", "Bulanan") : f === "weekly" ? t("expenses.frequency.weekly", "Mingguan") : t("expenses.frequency.yearly", "Tahunan");

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("expenses.recurringExplainer", "Untuk biaya rutin — listrik, internet, sewa, gaji, dst. Setiap periode buat draft expense baru secara otomatis (lewat tombol Generate di bawah), lalu tinggal Submit seperti expense biasa.")}</p>

      {canManage && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("expenses.newRecurringTemplate", "Template Recurring Baru")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("expenses.placeholderNameRecurring", "Nama (mis. Listrik Bulanan)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">{t("expenses.optionAccountCoa", "Akun Beban (COA)")}</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderCategoryPlain", "Kategori")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.amountLabel", "Nominal")} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option value="monthly">{t("expenses.frequency.monthly", "Bulanan")}</option><option value="weekly">{t("expenses.frequency.weekly", "Mingguan")}</option><option value="yearly">{t("expenses.frequency.yearly", "Tahunan")}</option>
            </select>
            <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} title={t("expenses.nextDueDate", "Jatuh tempo berikutnya")} />
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={form.recordAsPayable} onChange={(e) => setForm({ ...form, recordAsPayable: e.target.checked })} /> {t("expenses.recordAsPayableAtCreation", "Catat sebagai hutang saat dibuat")}
            </label>
          </div>
          <Button onClick={create}>{t("expenses.saveTemplate", "Simpan Template")}</Button>
        </Card>
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={generate} disabled={generating}>{generating ? t("expenses.processing", "Memproses...") : t("expenses.generateDue", "Generate Expense yang Jatuh Tempo")}</Button>
          {lastResult && <span className="text-xs text-neutral-500">{t("expenses.generatedCount", "{n} draft expense dibuat.").replace("{n}", String(lastResult.generatedCount))}</span>}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{r.name} {!r.isActive && <span className="text-xs text-neutral-500">{t("expenses.inactive", "(nonaktif)")}</span>}</div>
              <div className="text-xs text-neutral-500">{rupiah(r.amount)} · {frequencyLabel(r.frequency)} · {t("expenses.nextDueDate", "Jatuh tempo berikutnya")} {new Date(r.nextDueDate).toLocaleDateString("id-ID")}</div>
            </div>
            {canManage && r.isActive && <Button variant="ghost" className="text-xs text-red-400" onClick={() => deactivate(r.id)}>{t("expenses.deactivate", "Nonaktifkan")}</Button>}
          </Card>
        ))}
        {rows.length === 0 && <div className="text-sm text-neutral-500">{t("expenses.emptyRecurring", "Belum ada template recurring.")}</div>}
      </div>
    </div>
  );
}
