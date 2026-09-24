"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";
import { useProsesTunggal } from "@/lib/ui/use-proses-tunggal";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { coaAccountName } from "@/lib/accounting/coa-data";
import { outletDateYmd } from "@/lib/time/outlet-time";
import "@/lib/i18n/dict-expenses";
import "@/lib/i18n/dict-coa";

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
  // Hari ini dalam kalender WIB, bukan UTC — di atas pukul 00.00–07.00 WIB tanggal UTC masih
  // kemarin, dan kasir yang mencatat pengeluaran dini hari akan melihat form terisi tanggal yang
  // salah. Sama seperti kelas bug yang sudah diperbaiki di laporan harian.
  const todayYmd = outletDateYmd(new Date());
  const [form, setForm] = useState<any>({
    accountId: "", category: "", description: "", payeeName: "", supplierId: "",
    qty: 1, amount: 0, taxAmount: 0, paymentMethod: "cash", cashBankAccountId: "",
    recordAsPayable: false, costCenterId: "", rentalUnitId: "", dueDate: "", attachmentUrl: "",
    expenseDate: todayYmd,
  });
  const [payFor, setPayFor] = useState<{ id: string; method: string; cashBankAccountId: string } | null>(null);

  const canManage = hasPermission(role, "manage_expenses");
  const canApprove = hasPermission(role, "approve_expenses");
  const canVoid = hasPermission(role, "void_expense");
  // Penjaga klik ganda untuk semua aksi yang menyimpan data di tab ini — lihat use-proses-tunggal.ts.
  const proses = useProsesTunggal();

  // Cash Out Cepat — a minimal 3-field shortcut for small register spending (parkir, beli air
  // galon, dll) that doesn't need the full expense form below. It's still a real Expense under
  // the hood (same createExpense + submitExpense engine as "+ Expense Baru", same auto-approve-
  // under-threshold rule from outlet.expenseApprovalThreshold) — just pre-filled to cash payment
  // so it posts in one click instead of filling 10+ fields.
  const [cashOutForm, setCashOutForm] = useState({ accountId: "", amount: "", note: "" });
  const [cashOutBusy, setCashOutBusy] = useState(false);
  const defaultCashAccount = cashBankAccounts.find((c: any) => c.type === "cash" && c.isDefault) ?? cashBankAccounts.find((c: any) => c.type === "cash");

  const submitCashOut = () => proses.jalankan("cashout", async () => {
    if (!cashOutForm.accountId || !cashOutForm.amount) return showAlert(t("expenses.alert.selectCategoryAndAmount", "Pilih kategori beban dan isi nominal."));
    if (!defaultCashAccount) return showAlert(t("expenses.alert.noCashAccount", "Belum ada akun Kas — atur dulu di halaman Pembayaran."));
    setCashOutBusy(true);
    try {
      const accountRow = bundle.accounts.find((a: any) => a.id === cashOutForm.accountId);
      const accountLabel = accountRow ? coaAccountName(t, accountRow) : "Cash Out";
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
  });

  const load = () => {
    const qs = statusFilter ? `&status=${statusFilter}` : "";
    fetchJsonObject(`/api/expenses?outletId=${outletId}${qs}`).then((d) => d && setBundle(d));
    fetchJsonArray(`/api/cash-bank-accounts?outletId=${outletId}`).then(setCashBankAccounts);
  };
  useEffect(() => { load(); }, [outletId, statusFilter]);

  const accountName = (id: string) => {
    const a = bundle.accounts.find((x: any) => x.id === id);
    return a ? coaAccountName(t, a) : "-";
  };

  // For audit: who actually input this expense (staffUserId, set from the logged-in session at
  // creation — see POST /api/expenses) vs. who later approved/rejected/paid/voided it (separate
  // approvedBy/rejectedBy/paidBy/voidedBy columns on the same row, already returned by the API).
  // The table's own "Diinput Oleh" column below only shows the creator; the fuller trail (who
  // approved and when, who paid and when, etc.) is surfaced via this row's title tooltip so it's
  // still one hover away without cluttering the table with 4 more columns.
  const staffName = (id: string | null | undefined) => {
    if (!id) return "-";
    const s = bundle.staff.find((x: any) => x.id === id);
    return s?.name ?? "-";
  };
  const auditTrail = (e: any) => {
    const parts = [`Diinput: ${staffName(e.staffUserId)}`];
    if (e.approvedBy) parts.push(`Approved: ${staffName(e.approvedBy)}`);
    if (e.rejectedBy) parts.push(`Rejected: ${staffName(e.rejectedBy)} (${e.rejectReason ?? "-"})`);
    if (e.paidBy) parts.push(`Dibayar: ${staffName(e.paidBy)}`);
    if (e.voidedBy) parts.push(`Dibatalkan: ${staffName(e.voidedBy)} (${e.voidReason ?? "-"})`);
    return parts.join(" · ");
  };

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

  const submitCreate = () => proses.jalankan("create", async () => {
    // Pesan menyebut nama kolom PERSIS seperti yang tertulis di layar — versi lama menyebut "Akun"
    // dan "centang 'Catat sebagai hutang'", dua sebutan yang tidak pernah muncul di form itu
    // sendiri, sehingga pemakainya harus menebak kotak mana yang dimaksud.
    if (!form.accountId || !form.category || !form.amount) {
      return showAlert(t("expenses.alert.requiredFields", "Lengkapi dulu: Jenis biaya, Kategori, dan Nominal (langkah 1 dan 2)."));
    }
    if (uploading) return showAlert(t("expenses.alert.waitUpload", "Tunggu sampai unggahan bukti selesai."));
    if (!form.recordAsPayable && !form.cashBankAccountId) {
      return showAlert(t("expenses.alert.selectCashBankOrPayable", "Di langkah 4, pilih dulu \"Uangnya diambil dari mana?\" — atau ubah ke \"Belum dibayar (hutang)\" kalau uangnya memang belum keluar."));
    }
    /*
     * Tanggal dari <input type="date"> berbentuk "YYYY-MM-DD", sementara seluruh kolom tanggal lain
     * di aplikasi ini menyimpan instant UTC penuh. Dikonversi ke pukul 12.00 WIB pada tanggal itu,
     * bukan tengah malam: tengah malam WIB berada tepat di batas hari dalam UTC (17.00 hari
     * sebelumnya), jadi kesalahan pembulatan sekecil apa pun bisa melemparkannya ke tanggal
     * sebelahnya. Tengah hari memberi jarak tujuh jam ke kedua arah dan tidak pernah ambigu.
     */
    const expenseDateIso = form.expenseDate
      ? new Date(`${form.expenseDate}T12:00:00+07:00`).toISOString()
      : new Date().toISOString();

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, outletId, qty: Number(form.qty) || 1, amount: Number(form.amount), taxAmount: Number(form.taxAmount) || 0, expenseDate: expenseDateIso }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    // expenseDate dikembalikan ke hari ini, bukan dikosongkan — form kosong tanpa tanggal adalah
    // keadaan yang tidak valid, dan mengosongkannya hanya memindahkan beban mengisinya ke pemakai.
    setForm({ accountId: "", category: "", description: "", payeeName: "", supplierId: "", qty: 1, amount: 0, taxAmount: 0, paymentMethod: "cash", cashBankAccountId: "", recordAsPayable: false, costCenterId: "", rentalUnitId: "", dueDate: "", attachmentUrl: "", expenseDate: todayYmd });
    setShowForm(false);
    load();
  });

  /** Aksi per baris. Kuncinya per BARIS (`row:<id>`), jadi satu baris yang sedang diproses tidak mengunci baris lain. */
  const act = (id: string, action: "submit" | "approve" | "cancel" | "reject" | "void", extra?: any) =>
    proses.jalankan(`row:${id}`, async () => {
      const res = await fetch(`/api/expenses/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(extra ?? {}) });
      const data = await res.json().catch(() => ({ error: "Gagal memproses. Coba lagi." }));
      if (!res.ok) return showAlert(data.error);
      load();
    });

  /** Alasan wajib — dulu prompt() bawaan browser (tidak sesuai tema, dan "Cancel" bisa lolos dengan alasan kosong). */
  const minta = async (id: string, action: "cancel" | "reject" | "void", pesan: string, judul: string) => {
    if (proses.sibuk(`row:${id}`)) return;
    const alasan = await showPrompt(pesan, {
      title: judul,
      required: true,
      multiline: true,
      tone: action === "void" || action === "cancel" ? "danger" : "default",
      placeholder: t("expenses.reasonPlaceholder", "mis. input ganda, salah nominal, salah akun"),
      confirmLabel: judul,
    });
    if (alasan) await act(id, action, { reason: alasan });
  };

  const submitPay = () => proses.jalankan("pay", async () => {
    if (!payFor?.cashBankAccountId) return showAlert(t("expenses.alert.selectCashBank", "Pilih akun kas/bank."));
    const res = await fetch(`/api/expenses/${payFor.id}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: payFor.method, cashBankAccountId: payFor.cashBankAccountId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setPayFor(null);
    load();
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="space-y-2 border-amber-500/30">
          <div>
            <h2 className="font-medium text-amber-400">{t("expenses.cashOutQuick", "Cash Out Cepat")}</h2>
            <p className="text-xs text-neutral-500">{t("expenses.cashOutDescription", "Pengeluaran kas kecil (parkir, beli air galon, dll) — langsung lunas dari {account}, tanpa isi form lengkap.").replace("{account}", defaultCashAccount?.name ?? t("expenses.defaultCashAccountName", "akun Kas"))}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SearchableSelect
              className="col-span-2"
              value={cashOutForm.accountId}
              onChange={(v) => setCashOutForm({ ...cashOutForm, accountId: v })}
              placeholder={t("expenses.optionCategoryAccount", "Kategori (Akun Beban)")}
              options={bundle.accounts.filter((a: any) => a.isPostingAllowed !== false).map((a: any) => ({ value: a.id, label: `${a.code} ${coaAccountName(t, a)}` }))}
            />
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
        /*
         * FORM DIRANCANG ULANG (2026-09-20) atas permintaan pemilik outlet.
         *
         * Versi sebelumnya adalah grid 4 kolom berisi 13 kolom tanpa SATU pun label — semuanya
         * hanya mengandalkan placeholder, yang menghilang begitu kolomnya diisi. Jadi setelah
         * mengetik, tidak ada lagi cara mengetahui kolom itu untuk apa; satu-satunya jalan adalah
         * menghapus isinya supaya petunjuknya muncul lagi. Ditambah istilah akuntansi mentah
         * ("Akun Beban (COA)", "Cost Center", "Payee"), pemilik rental yang tidak berlatar akuntansi
         * praktis harus menebak.
         *
         * Pendekatan barunya:
         *  - Label tetap di atas tiap kolom, plus penjelasan satu baris untuk yang tidak
         *    jelas-dengan-sendirinya. Label yang selalu terlihat mengalahkan placeholder cantik.
         *  - Dikelompokkan jadi langkah bernomor yang mengikuti cara orang berpikir tentang sebuah
         *    pengeluaran: biaya apa → berapa → ke siapa → sudah dibayar belum.
         *  - Checkbox "Catat sebagai hutang" diganti dua pilihan eksplisit. Checkbox memaksa
         *    pembacanya menyimpulkan arti keadaan TIDAK tercentang, dan di sini artinya sama sekali
         *    tidak jelas.
         *  - Kolom akuntansi murni (Cost Center, Unit PS) dipindah ke bagian opsional paling bawah
         *    dan diberi tahu terus terang bahwa boleh dilewati.
         *  - Ringkasan satu kalimat sebelum tombol simpan, supaya isian bisa diperiksa dalam bahasa
         *    manusia, bukan dengan membaca ulang 13 kotak.
         */
        <Card className="space-y-5">
          <div>
            <h2 className="font-medium">{t("expenses.formTitle", "Catat Pengeluaran")}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{t("expenses.formSubtitle", "Isi dari atas ke bawah. Kolom bertanda * wajib diisi, sisanya boleh dilewati.")}</p>
          </div>

          {/* LANGKAH 1 — biaya apa */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">{t("expenses.step1", "1. Pengeluaran untuk apa?")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldAccount", "Jenis biaya *")}</div>
                <SearchableSelect
                  value={form.accountId}
                  onChange={(v) => setForm({ ...form, accountId: v })}
                  placeholder={t("expenses.fieldAccountPlaceholder", "Pilih jenis biaya...")}
                  options={bundle.accounts.filter((a: any) => a.isPostingAllowed !== false).map((a: any) => ({ value: a.id, label: `${a.code} ${coaAccountName(t, a)}` }))}
                />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldAccountHint", "Contoh: Listrik, Gaji, Internet, Pemeliharaan PlayStation. Ini yang menentukan pengeluaran masuk ke baris mana di Laba Rugi.")}</div>
              </label>
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldCategory", "Kategori *")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.fieldCategoryPlaceholder", "mis. Listrik")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldCategoryHint", "Nama pendek versi Anda sendiri, untuk mengelompokkan laporan biaya.")}</div>
              </label>
              {/*
               * Tanggal Pengeluaran — kolom TERPISAH dari Jatuh Tempo di langkah 4.
               *
               * Versi form sebelumnya hanya punya satu kolom tanggal, yang dipakai sebagai
               * dueDate; saat form dirombak (2026-09-20) kolom itu dipindah ke langkah 4 dan hanya
               * muncul untuk hutang, sehingga pengeluaran yang sudah dibayar kehilangan tanggalnya
               * sama sekali dan selalu tercatat hari ini.
               *
               * Keduanya memang beda arti dan tidak boleh digabung lagi: tanggal pengeluaran
               * menentukan biaya ini masuk Laba Rugi bulan mana, sedangkan jatuh tempo menentukan
               * kapan hutangnya harus dibayar. Sebuah tagihan bisa tertanggal 28 Agustus tapi baru
               * jatuh tempo 10 September, dan keduanya harus bisa diisi berbeda.
               */}
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldExpenseDate", "Tanggal pengeluaran *")}</div>
                <input
                  type="date"
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
                  value={form.expenseDate || todayYmd}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldExpenseDateHint", "Kapan biaya ini benar-benar terjadi. Ini yang menentukan biaya masuk Laba Rugi bulan mana — isi mundur kalau mencatat tagihan bulan lalu.")}</div>
              </label>
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldDescription", "Keterangan")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.fieldDescriptionPlaceholder", "mis. Token listrik September")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldDescriptionHint", "Catatan bebas supaya nanti Anda ingat ini pengeluaran apa.")}</div>
              </label>
            </div>
          </section>

          {/* LANGKAH 2 — berapa */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">{t("expenses.step2", "2. Berapa nominalnya?")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldAmount", "Nominal (Rp) *")}</div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder="0" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldAmountHint", "Tanpa titik atau koma. Contoh: 1005000")}</div>
              </label>
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldQty", "Jumlah")}</div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldQtyHint", "Biarkan 1 kalau tidak dihitung per satuan.")}</div>
              </label>
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldTax", "Pajak (Rp)")}</div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder="0" value={form.taxAmount || ""} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldTaxHint", "Kosongkan kalau tidak ada pajak terpisah.")}</div>
              </label>
            </div>
          </section>

          {/* LANGKAH 3 — ke siapa */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">{t("expenses.step3", "3. Dibayarkan ke siapa?")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldPayee", "Nama penerima")}</div>
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.fieldPayeePlaceholder", "mis. Andika, PLN, Toko Berkah")} value={form.payeeName} onChange={(e) => setForm({ ...form, payeeName: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldPayeeHint", "Isi ini kalau penerimanya bukan supplier terdaftar.")}</div>
              </label>
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldSupplier", "Atau pilih supplier terdaftar")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">{t("expenses.fieldSupplierNone", "— tidak ada —")}</option>
                  {bundle.suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldSupplierHint", "Cukup isi salah satu: nama penerima ATAU supplier.")}</div>
              </label>
            </div>
          </section>

          {/* LANGKAH 4 — sudah dibayar atau belum */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">{t("expenses.step4", "4. Uangnya sudah keluar?")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Dua pilihan eksplisit, bukan satu checkbox — arti keadaan "tidak tercentang" pada
                  versi lama tidak pernah dinyatakan di mana pun. */}
              <button
                type="button"
                onClick={() => setForm({ ...form, recordAsPayable: false })}
                className={`text-left rounded-lg border px-3 py-2 ${!form.recordAsPayable ? "border-emerald-500/60 bg-emerald-500/10" : "border-neutral-700 bg-neutral-800/50"}`}
              >
                <div className="text-sm font-medium">{t("expenses.paidNowTitle", "Sudah dibayar")}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{t("expenses.paidNowHint", "Uangnya sudah keluar sekarang. Kas berkurang saat ini juga.")}</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, recordAsPayable: true })}
                className={`text-left rounded-lg border px-3 py-2 ${form.recordAsPayable ? "border-amber-500/60 bg-amber-500/10" : "border-neutral-700 bg-neutral-800/50"}`}
              >
                <div className="text-sm font-medium">{t("expenses.payableTitle", "Belum dibayar (hutang)")}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{t("expenses.payableHint", "Dicatat sebagai hutang dulu. Kas belum berkurang sampai Anda bayar nanti.")}</div>
              </button>
            </div>

            {!form.recordAsPayable ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldMethod", "Cara bayar")}</div>
                  <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    <option value="cash">{t("expenses.method.cash", "Cash")}</option><option value="bank">{t("expenses.method.bank", "Bank")}</option><option value="transfer">{t("expenses.method.transfer", "Transfer")}</option><option value="qris">{t("expenses.method.qris", "QRIS")}</option>
                  </select>
                </label>
                <label className="space-y-1 block">
                  <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldCashBank", "Uangnya diambil dari mana? *")}</div>
                  <SearchableSelect
                    value={form.cashBankAccountId}
                    onChange={(v) => setForm({ ...form, cashBankAccountId: v })}
                    placeholder={t("expenses.fieldCashBankPlaceholder", "Pilih sumber dana...")}
                    options={cashBankAccounts.map((c: any) => ({ value: c.id, label: c.name }))}
                  />
                  <div className="text-[11px] text-neutral-500">{t("expenses.fieldCashBankHint", "Pilih laci kas atau rekening yang saldonya benar-benar berkurang. Salah pilih di sini bikin saldo kas tidak cocok dengan uang fisik.")}</div>
                </label>
              </div>
            ) : (
              <label className="space-y-1 block sm:w-1/2">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldDueDate", "Jatuh tempo")}</div>
                <input type="date" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldDueDateHint", "Kapan hutang ini harus dibayar. Akan muncul sebagai pengingat di Hutang (AP).")}</div>
              </label>
            )}
          </section>

          {/* LANGKAH 5 — opsional */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t("expenses.step5", "5. Tambahan (boleh dilewati)")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldCostCenter", "Divisi / bagian")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}>
                  <option value="">{t("expenses.fieldCostCenterNone", "— tidak dipilah —")}</option>
                  {bundle.costCenters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldCostCenterHint", "Kalau Anda ingin tahu biaya per bagian, mis. Dapur vs Ruang Main.")}</div>
              </label>
              <label className="space-y-1 block">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldRentalUnit", "Unit PS terkait")}</div>
                <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.rentalUnitId} onChange={(e) => setForm({ ...form, rentalUnitId: e.target.value })}>
                  <option value="">{t("expenses.fieldRentalUnitNone", "— tidak terkait unit tertentu —")}</option>
                  {bundle.rentalUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <div className="text-[11px] text-neutral-500">{t("expenses.fieldRentalUnitHint", "Isi kalau biayanya khusus satu TV, mis. servis stik TV 3.")}</div>
              </label>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-xs font-medium text-neutral-300">{t("expenses.fieldAttachment", "Foto bukti / nota")}</div>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])} className="text-xs" />
                  {uploading && <span className="text-xs text-neutral-500">{t("expenses.uploading", "Mengunggah...")}</span>}
                  {form.attachmentUrl && <a href={form.attachmentUrl} target="_blank" className="text-xs text-emerald-400">{t("expenses.viewProof", "Lihat bukti")}</a>}
                </div>
              </div>
            </div>
          </section>

          {/*
           * Ringkasan dalam satu kalimat. Memeriksa 13 kotak isian satu per satu adalah pekerjaan
           * yang mudah dilewati orang; membaca satu kalimat dan merasa ada yang janggal jauh lebih
           * mungkin terjadi — dan di sinilah salah pilih sumber dana paling sering tertangkap.
           */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm">
            <div className="text-xs text-neutral-500 mb-1">{t("expenses.summaryHeading", "Periksa sekali lagi")}</div>
            {(() => {
              const akun = bundle.accounts.find((a: any) => a.id === form.accountId);
              const sumber = cashBankAccounts.find((c: any) => c.id === form.cashBankAccountId);
              const penerima = form.payeeName || bundle.suppliers.find((s: any) => s.id === form.supplierId)?.name;
              const nominal = Number(form.amount) || 0;
              const pajak = Number(form.taxAmount) || 0;
              if (!akun || !nominal) {
                return <span className="text-neutral-500">{t("expenses.summaryIncomplete", "Isi dulu jenis biaya dan nominalnya.")}</span>;
              }
              // Tanggal ikut disebut dalam ringkasan — inilah kolom yang paling mungkin terlewat
              // saat mencatat tagihan bulan lalu, dan akibat salahnya (biaya mendarat di bulan yang
              // keliru) tidak terlihat sampai Laba Rugi bulan itu dibaca ulang.
              const tanggal = form.expenseDate ? new Date(`${form.expenseDate}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";
              return (
                <span>
                  {tanggal && <span className="text-neutral-400">{tanggal} — </span>}
                  {t("expenses.summarySentence", "Pengeluaran {jenis} sebesar {total}{penerima}, {status}.")
                    .replace("{jenis}", coaAccountName(t, akun))
                    .replace("{total}", rupiah(nominal + pajak))
                    .replace("{penerima}", penerima ? t("expenses.summaryPayee", " untuk {nama}").replace("{nama}", penerima) : "")
                    .replace(
                      "{status}",
                      form.recordAsPayable
                        ? t("expenses.summaryPayable", "dicatat sebagai hutang (kas belum berkurang)")
                        : sumber
                          ? t("expenses.summaryPaid", "dibayar dari {sumber}").replace("{sumber}", sumber.name)
                          : t("expenses.summaryNoSource", "TAPI sumber dananya belum dipilih")
                    )}
                </span>
              );
            })()}
          </div>

          <Button onClick={submitCreate} disabled={proses.sibuk("create") || uploading}>
            {proses.sibuk("create") ? t("expenses.saving", "Menyimpan...") : t("expenses.saveAndSubmit", "Simpan & Submit")}
          </Button>
        </Card>
      )}

      {payFor && (
        <Card className="space-y-2 border-emerald-500/40">
          <h2 className="font-medium">{t("expenses.payDebtTitle", "Bayar Hutang Expense")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={payFor.method} onChange={(e) => setPayFor({ ...payFor, method: e.target.value })}>
              <option value="cash">{t("expenses.method.cash", "Cash")}</option><option value="bank">{t("expenses.method.bank", "Bank")}</option><option value="transfer">{t("expenses.method.transfer", "Transfer")}</option><option value="qris">{t("expenses.method.qris", "QRIS")}</option>
            </select>
            <SearchableSelect
              value={payFor.cashBankAccountId}
              onChange={(v) => setPayFor({ ...payFor, cashBankAccountId: v })}
              placeholder={t("expenses.optionCashBankAccount", "Akun Kas/Bank")}
              options={cashBankAccounts.map((c: any) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={submitPay} disabled={proses.sibuk("pay")}>{proses.sibuk("pay") ? t("expenses.processing", "Memproses...") : t("expenses.action.pay", "Bayar")}</Button>
            <Button variant="ghost" onClick={() => setPayFor(null)} disabled={proses.sibuk("pay")}>{t("expenses.action.batal", "Batal")}</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("expenses.table.no", "No.")}</th><th>{t("expenses.table.date", "Tanggal")}</th><th>{t("expenses.table.account", "Akun")}</th><th>{t("expenses.placeholderDescription", "Deskripsi")}</th><th>{t("expenses.amountLabel", "Nominal")}</th><th>{t("expenses.table.status", "Status")}</th><th>{t("expenses.table.inputBy", "Diinput Oleh")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {bundle.expenses.map((e: any) => (
              <tr key={e.id} className="border-b border-neutral-900 align-top" title={auditTrail(e)}>
                <td className="py-2 font-mono text-xs">{e.expenseNumber}</td>
                <td className="text-xs">{new Date(e.expenseDate).toLocaleDateString("id-ID")}</td>
                <td className="text-xs">{accountName(e.accountId)}</td>
                <td className="text-xs max-w-[200px] truncate" title={e.description}>{e.description || e.category}</td>
                <td>{rupiah(e.amount + (e.taxAmount ?? 0))}</td>
                <td><Badge status={STATUS_BADGE[e.status]}>{statusLabel(e.status)}</Badge></td>
                <td className="text-xs">{staffName(e.staffUserId)}</td>
                <td className="text-right space-y-1">
                  <div className="flex flex-col items-end gap-1">
                    {proses.sibuk(`row:${e.id}`) && <span className="text-[11px] text-cyan-300 animate-pulse">{t("expenses.processing", "Memproses...")}</span>}
                    {e.status === "draft" && canManage && <Button variant="secondary" className="text-xs px-2 py-1" disabled={proses.sibuk(`row:${e.id}`)} onClick={() => act(e.id, "submit")}>{t("expenses.action.submit", "Submit")}</Button>}
                    {e.status === "rejected" && canManage && <Button variant="secondary" className="text-xs px-2 py-1" disabled={proses.sibuk(`row:${e.id}`)} onClick={() => act(e.id, "submit")}>{t("expenses.action.submitAgain", "Submit Ulang")}</Button>}
                    {["draft", "pending_approval"].includes(e.status) && canManage && (
                      <Button
                        variant="ghost"
                        className="text-xs px-2 py-1 text-red-400"
                        disabled={proses.sibuk(`row:${e.id}`)}
                        onClick={() => minta(e.id, "cancel", `${e.expenseNumber} — ${t("expenses.promptCancelReason", "Alasan cancel?")}`, t("expenses.action.cancel", "Cancel"))}
                      >
                        {t("expenses.action.cancel", "Cancel")}
                      </Button>
                    )}
                    {e.status === "pending_approval" && canApprove && (
                      <>
                        <Button className="text-xs px-2 py-1" disabled={proses.sibuk(`row:${e.id}`)} onClick={() => act(e.id, "approve")}>{t("expenses.action.approve", "Approve")}</Button>
                        <Button
                          variant="ghost"
                          className="text-xs px-2 py-1 text-red-400"
                          disabled={proses.sibuk(`row:${e.id}`)}
                          onClick={() => minta(e.id, "reject", `${e.expenseNumber} — ${t("expenses.promptRejectReason", "Alasan reject?")}`, t("expenses.action.reject", "Reject"))}
                        >
                          {t("expenses.action.reject", "Reject")}
                        </Button>
                      </>
                    )}
                    {e.status === "approved" && e.recordAsPayable && canManage && (
                      <Button className="text-xs px-2 py-1" disabled={proses.sibuk(`row:${e.id}`)} onClick={() => setPayFor({ id: e.id, method: "cash", cashBankAccountId: "" })}>{t("expenses.action.pay", "Bayar")}</Button>
                    )}
                    {["approved", "paid"].includes(e.status) && canVoid && (
                      <Button
                        variant="ghost"
                        className="text-xs px-2 py-1 text-red-400"
                        disabled={proses.sibuk(`row:${e.id}`)}
                        onClick={() =>
                          minta(
                            e.id,
                            "void",
                            `${e.expenseNumber} · ${e.description || e.category} · ${rupiah(e.amount + (e.taxAmount ?? 0))}\n\n${t("expenses.promptVoidReason", "Alasan pembatalan (akan membalik jurnal)?")}`,
                            t("expenses.action.void", "Batalkan")
                          )
                        }
                      >
                        {t("expenses.action.void", "Batalkan")}
                      </Button>
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
  const proses = useProsesTunggal();

  const create = () => proses.jalankan("create", async () => {
    if (!form.name) return;
    const res = await fetch("/api/cost-centers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ name: "", code: "" });
    load();
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("expenses.costCenterExplainer", 'Cost center = pembagian biaya per divisi/area (Rental, F&B, Kitchen, Administration, dst) dalam satu cabang — dipakai untuk laporan "biaya per cost center".')}</p>
      {canManage && (
        <Card>
          <h2 className="font-medium mb-3">{t("expenses.addCostCenterTitle", "Tambah Cost Center")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderNameCostCenter", "Nama (mis. Kitchen)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("expenses.placeholderCode", "Kode (opsional)")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Button onClick={create} disabled={proses.sibuk("create")}>{proses.sibuk("create") ? t("expenses.saving", "Menyimpan...") : t("expenses.addButton", "Tambah")}</Button>
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
  const proses = useProsesTunggal();

  const create = () => proses.jalankan("create", async () => {
    if (!form.name || !form.accountId || !form.category || !form.amount || !form.nextDueDate) return showAlert(t("expenses.alert.recurringRequiredFields", "Nama, akun, kategori, nominal, dan tanggal jatuh tempo berikutnya wajib diisi."));
    const res = await fetch("/api/expenses/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId, amount: Number(form.amount), taxAmount: Number(form.taxAmount) || 0, dayOfMonth: Number(form.dayOfMonth) || undefined, nextDueDate: new Date(form.nextDueDate).toISOString() }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ name: "", accountId: "", category: "", amount: 0, taxAmount: 0, recordAsPayable: true, frequency: "monthly", dayOfMonth: 1, nextDueDate: "" });
    load();
  });

  const deactivate = (id: string) => proses.jalankan(`row:${id}`, async () => {
    if (!await showConfirm(t("expenses.confirmDeactivateRecurring", "Nonaktifkan recurring expense ini?"), { tone: "danger" })) return;
    const res = await fetch(`/api/expenses/recurring/${id}`, { method: "DELETE" });
    // Dulu hasilnya tidak dicek sama sekali: gagal pun layar diam, dan template tetap aktif tanpa pemberitahuan.
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Gagal menonaktifkan template." }));
      return showAlert(data.error);
    }
    load();
  });

  /*
   * Generate paling berbahaya bila tertekan dua kali: tiap tekanan membuat draft untuk semua
   * template yang jatuh tempo. `generating` (state) saja bisa tembus klik cepat — dijaga ref juga.
   */
  const generate = () => proses.jalankan("generate", async () => {
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
  });

  const frequencyLabel = (f: string) => f === "monthly" ? t("expenses.frequency.monthly", "Bulanan") : f === "weekly" ? t("expenses.frequency.weekly", "Mingguan") : t("expenses.frequency.yearly", "Tahunan");

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("expenses.recurringExplainer", "Untuk biaya rutin — listrik, internet, sewa, gaji, dst. Setiap periode buat draft expense baru secara otomatis (lewat tombol Generate di bawah), lalu tinggal Submit seperti expense biasa.")}</p>

      {canManage && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("expenses.newRecurringTemplate", "Template Recurring Baru")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm col-span-2" placeholder={t("expenses.placeholderNameRecurring", "Nama (mis. Listrik Bulanan)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <SearchableSelect
              className="col-span-2"
              value={form.accountId}
              onChange={(v) => setForm({ ...form, accountId: v })}
              placeholder={t("expenses.optionAccountCoa", "Akun Beban (COA)")}
              options={accounts.filter((a: any) => a.isPostingAllowed !== false).map((a: any) => ({ value: a.id, label: `${a.code} ${coaAccountName(t, a)}` }))}
            />
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
          <Button onClick={create} disabled={proses.sibuk("create")}>{proses.sibuk("create") ? t("expenses.saving", "Menyimpan...") : t("expenses.saveTemplate", "Simpan Template")}</Button>
        </Card>
      )}

      {canManage && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={generate} disabled={generating}>{generating ? t("expenses.processing", "Memproses...") : t("expenses.generateDue", "Generate Expense yang Jatuh Tempo")}</Button>
            {lastResult && <span className="text-xs text-neutral-500">{t("expenses.generatedCount", "{n} draft expense dibuat.").replace("{n}", String(lastResult.generatedCount))}</span>}
          </div>
          {/* "Sudah dibuat" bukan berarti "sudah masuk laporan". Draft belum memposting jurnal apa
              pun, jadi belum muncul di Laba Rugi — tanpa kalimat ini, pemilik wajar mengira biaya
              rutinnya sudah tercatat padahal belum, dan itu membuat laporan terlihat lebih untung
              daripada kenyataannya. */}
          {lastResult && lastResult.generatedCount > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
              {t("expenses.generatedStillDraft", "Draft ini BELUM masuk Laba Rugi. Buka tab \"Daftar Expense\", lalu Submit dan setujui tiap draft supaya jurnalnya terposting.")}
            </div>
          )}
          {lastResult && lastResult.generatedCount === 0 && (
            <div className="text-xs text-neutral-500">
              {t("expenses.generatedNothingDue", "Tidak ada template yang jatuh tempo. Kalau ada yang Anda harapkan muncul, cek tanggal \"Jatuh tempo berikutnya\" pada template tersebut.")}
            </div>
          )}
          {lastResult?.templatesMasihTertinggal?.length > 0 && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
              {t("expenses.generatedStillBehind", "{n} template masih tertinggal lebih dari 24 periode dan dibatasi demi keamanan — tekan tombol ini sekali lagi untuk melanjutkan.").replace("{n}", String(lastResult.templatesMasihTertinggal.length))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{r.name} {!r.isActive && <span className="text-xs text-neutral-500">{t("expenses.inactive", "(nonaktif)")}</span>}</div>
              <div className="text-xs text-neutral-500">{rupiah(r.amount)} · {frequencyLabel(r.frequency)} · {t("expenses.nextDueDate", "Jatuh tempo berikutnya")} {new Date(r.nextDueDate).toLocaleDateString("id-ID")}</div>
            </div>
            {canManage && r.isActive && <Button variant="ghost" className="text-xs text-red-400" disabled={proses.sibuk(`row:${r.id}`)} onClick={() => deactivate(r.id)}>{t("expenses.deactivate", "Nonaktifkan")}</Button>}
          </Card>
        ))}
        {rows.length === 0 && <div className="text-sm text-neutral-500">{t("expenses.emptyRecurring", "Belum ada template recurring.")}</div>}
      </div>
    </div>
  );
}
