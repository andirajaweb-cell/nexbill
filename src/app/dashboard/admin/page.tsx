"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import "@/lib/i18n/dict-admin";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

interface ColumnMeta {
  key: string;
  dataType: string;
  enumValues: string[] | null;
  notNull: boolean;
  hasDefault: boolean;
}

// Display labels resolved via t() inside components (hooks can't run at module scope) — key
// is the i18n key, fallback is the original Indonesian text used if the key isn't registered.
const TABLE_OPTIONS: { key: string; labelKey: string; fallback: string }[] = [
  { key: "products", labelKey: "admin.table.products", fallback: "Produk" },
  { key: "customers", labelKey: "admin.table.customers", fallback: "Customer" },
  { key: "suppliers", labelKey: "admin.table.suppliers", fallback: "Supplier" },
  { key: "staff", labelKey: "admin.table.staff", fallback: "Staff" },
  { key: "promos", labelKey: "admin.table.promos", fallback: "Promo" },
  { key: "membership-tiers", labelKey: "admin.table.membershipTiers", fallback: "Membership Tier" },
  { key: "loyalty-play-point-rates", labelKey: "admin.table.loyaltyRates", fallback: "Rate Poin Main (per Konsol)" },
  { key: "rental-units", labelKey: "admin.table.rentalUnits", fallback: "Unit PS" },
  { key: "outlets", labelKey: "admin.table.outlets", fallback: "Outlet" },
  { key: "devices", labelKey: "admin.table.devices", fallback: "Device" },
  { key: "warehouses", labelKey: "admin.table.warehouses", fallback: "Gudang" },
  { key: "recipes", labelKey: "admin.table.recipes", fallback: "Resep" },
  { key: "pricing-rules", labelKey: "admin.table.pricingRules", fallback: "Aturan Harga" },
  { key: "vouchers", labelKey: "admin.table.vouchers", fallback: "Voucher" },
  { key: "cash-bank-accounts", labelKey: "admin.table.cashBankAccounts", fallback: "Akun Kas/Bank" },
  { key: "accounts", labelKey: "admin.table.accounts", fallback: "Chart of Accounts" },
  { key: "agent-settings", labelKey: "admin.table.agentSettings", fallback: "Pengaturan AI Agent" },
];

function FieldInput({ col, value, onChange }: { col: ColumnMeta; value: any; onChange: (v: any) => void }) {
  if (col.dataType === "boolean") {
    return (
      <select
        className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value === "true")}
      >
        <option value="">-</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (col.enumValues) {
    return (
      <select
        className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-</option>
        {col.enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  if (col.dataType === "number") {
    return (
      <input
        type="number"
        className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  }
  return (
    <input
      className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60";

/**
 * Danger zone — full factory reset, scoped to the caller's own outlet only (see
 * src/lib/admin/full-reset.ts — resetAllData() is always called with session.outletId,
 * never unscoped). Moved here from Pengaturan so every "direct database access" capability
 * lives in one place. Rendered for role "superuser" or "owner" (the two full-authority
 * roles), re-checked server-side by the API route regardless. Requires typing the caller's
 * own login email (re-verified server-side against the DB row, not just the session) +
 * re-entering the caller's password before the button even enables, plus a native confirm
 * dialog as one more speed bump, since this is irreversible through the app itself.
 */
function ResetDataSection() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const confirmPhrase = user?.email ?? "";
  const phraseMatches = !!confirmPhrase && confirmText.trim().toLowerCase() === confirmPhrase.toLowerCase();

  const submit = async () => {
    if (!phraseMatches) return showAlert(t("admin.reset.retypeExact", 'Ketik ulang persis: "{phrase}"').replace("{phrase}", confirmPhrase));
    if (!password) return showAlert(t("admin.reset.enterPassword", "Masukkan password kamu."));
    if (!(await showConfirm(
      t("admin.reset.confirmMessage", "Ini akan MENGHAPUS PERMANEN semua data operasional outlet ini — produk, transaksi, booking, akuntansi, staf lain, dan lainnya. Outlet/tenant lain tidak terpengaruh. Tidak bisa dibatalkan dari aplikasi. Lanjutkan?")
    ))) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/full-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: confirmText.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await showAlert(t("admin.reset.doneMessage", "Selesai. {n} tabel dikosongkan (hanya milik outlet ini). Kamu akan diarahkan ke halaman login.").replace("{n}", String(data.tablesCleared)));
      window.location.href = "/login";
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-rose-600/50 space-y-3">
      <h2 className="font-medium text-rose-400">{t("admin.reset.title", "Hapus Semua Data (Reset Total) — Outlet Ini Saja")}</h2>
      <p className="text-sm text-neutral-400">
        {t("admin.reset.desc1Pre", "Menghapus permanen, ")}<b>{t("admin.reset.desc1Bold", "hanya untuk outlet yang sedang aktif")}</b>{t("admin.reset.desc1Rest", ": semua transaksi POS, order, pembayaran, booking, sesi rental, jurnal & laporan akuntansi, produk & resep/BOM, stok & supplier, pelanggan & membership, promo/voucher, expense, aset, data Home Rental, notifikasi, audit log, chart of accounts, metode pembayaran, satuan, dan pengaturan lainnya. Data outlet/merchant lain di sistem ini sama sekali tidak tersentuh.")}
      </p>
      <p className="text-sm text-neutral-400">
        {t("admin.reset.desc2Pre", "Yang ")}<b>{t("admin.reset.desc2Bold1", "tetap ada")}</b>{t("admin.reset.desc2Mid", " supaya sistem tidak terkunci total: data cabang/outlet itu sendiri, dan akun staf dengan role ")}<b>Owner</b>{t("admin.reset.desc2Suffix", " (akun Owner lain di outlet ini juga tetap ada). Kontrol Perangkat yang sudah kamu setting (device, TV, relay) juga tidak ikut terhapus. Semua akun staf non-Owner (Manager, Kasir, dll) di outlet ini ikut terhapus.")}
      </p>

      <div className="border-t border-neutral-800 pt-3 space-y-2">
        <label className="space-y-1 block">
          <div className="text-xs text-neutral-500">{t("admin.reset.typeExactly", "Ketik persis: ")}<span className="font-mono text-rose-400">{confirmPhrase}</span></div>
          <input className={inputCls} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={confirmPhrase} />
        </label>
        <label className="space-y-1 block">
          <div className="text-xs text-neutral-500">{t("admin.reset.passwordLabel", "Password kamu (konfirmasi ulang)")}</div>
          <PasswordInput className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <Button
          variant="danger"
          disabled={!phraseMatches || !password || submitting}
          onClick={submit}
        >
          {submitting ? t("admin.reset.deletingBtn", "Menghapus...") : t("admin.reset.deleteNowBtn", "Hapus Semua Data Outlet Ini Sekarang")}
        </Button>
      </div>
    </Card>
  );
}

/**
 * One-time repair for the hard-delete bug fixed in lib/ppob/engine.ts (commit 7b8a18e) —
 * deleting a PPOB transaction that had been voided/edited before left its unpaired reversal
 * journal entry behind, quietly distorting that channel's balance (e.g. a shift's non-cash
 * verification showing a negative "Ekspektasi" with no transaction to explain it). The fix only
 * prevents new occurrences; this card finds and removes leftover orphans already in the ledger.
 * See lib/accounting/orphan-cleanup.ts for exactly what "orphaned" means here — never touches an
 * entry with a live, existing transaction behind it.
 */
function PpobOrphanCleanupSection() {
  const { t } = useDashboardLang();
  const [report, setReport] = useState<{ orphanedEntryCount: number; impact: { accountCode: string; accountName: string; netAmount: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const checkNow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ppob-orphan-cleanup");
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const cleanNow = async () => {
    if (!report || report.orphanedEntryCount === 0) return;
    if (!(await showConfirm(
      t("admin.ppobCleanup.confirmMessage", "Hapus {count} entri jurnal PPOB yatim ini? Ini hanya menghapus entri yang transaksinya sudah tidak ada sama sekali — tidak menyentuh transaksi yang masih hidup.").replace("{count}", String(report.orphanedEntryCount))
    ))) return;
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/ppob-orphan-cleanup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await showAlert(t("admin.ppobCleanup.doneMessage", "Selesai. {count} entri jurnal yatim dihapus — saldo yang terdampak sudah dikoreksi.").replace("{count}", String(data.removedEntries)));
      setReport(null);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Card className="border border-amber-600/40 space-y-3">
      <h2 className="font-medium text-amber-400">{t("admin.ppobCleanup.title", "Bersihkan Jurnal PPOB Yatim (Perbaikan Saldo Minus)")}</h2>
      <p className="text-sm text-neutral-400">
        {t(
          "admin.ppobCleanup.desc",
          "Kalau kamu pernah melihat saldo channel PPOB/non-tunai yang aneh (misalnya minus) padahal transaksinya sudah dihapus, itu kemungkinan sisa dari bug lama yang sudah diperbaiki. Klik \"Cek Sekarang\" untuk melihat apakah outlet ini terdampak, lalu \"Bersihkan\" untuk menghapus sisa-sisanya. Tidak menyentuh transaksi yang masih ada."
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={checkNow} disabled={loading}>
          {loading ? t("admin.ppobCleanup.checking", "Mengecek...") : t("admin.ppobCleanup.checkBtn", "Cek Sekarang")}
        </Button>
        {report && report.orphanedEntryCount > 0 && (
          <Button variant="danger" onClick={cleanNow} disabled={cleaning}>
            {cleaning ? t("admin.ppobCleanup.cleaning", "Membersihkan...") : t("admin.ppobCleanup.cleanBtn", "Bersihkan {count} Entri").replace("{count}", String(report.orphanedEntryCount))}
          </Button>
        )}
      </div>
      {report && (
        <div className="text-sm">
          {report.orphanedEntryCount === 0 ? (
            <span className="text-emerald-400">{t("admin.ppobCleanup.clean", "Bersih — tidak ada entri jurnal yatim ditemukan.")}</span>
          ) : (
            <div className="space-y-1">
              <div className="text-amber-400">{t("admin.ppobCleanup.foundCount", "Ditemukan {count} entri jurnal yatim, berdampak pada akun:").replace("{count}", String(report.orphanedEntryCount))}</div>
              {report.impact.map((i) => (
                <div key={i.accountCode} className="text-xs text-neutral-400 pl-2">
                  {i.accountCode} — {i.accountName}: <span className={i.netAmount < 0 ? "text-red-400" : "text-amber-400"}>Rp{i.netAmount.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function AdminDataPage() {
  const { t } = useDashboardLang();
  const { user, loading } = useAuth();
  const [tableKey, setTableKey] = useState(TABLE_OPTIONS[0].key);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [disableCreate, setDisableCreate] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    fetch(`/api/admin/${tableKey}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setColumns([]);
        setRows([]);
        return;
      }
      setError("");
      setColumns(data.columns);
      setRows(data.rows);
      setLabel(data.label);
      setDisableCreate(Boolean(data.disableCreate));
    });
  };

  useEffect(() => {
    setForm({});
    setEditingId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  const submit = async () => {
    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/admin/${tableKey}/${editingId}` : `/api/admin/${tableKey}`;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({});
    setEditingId(null);
    load();
  };

  const startEdit = (row: any) => {
    setEditingId(row.id);
    const next: Record<string, any> = {};
    columns.forEach((c) => { next[c.key] = row[c.key]; });
    setForm(next);
  };

  const remove = async (row: any) => {
    if (!await showConfirm(t("admin.confirmDeleteRow", "Hapus data ini dari {label}?").replace("{label}", label))) return;
    const res = await fetch(`/api/admin/${tableKey}/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  if (loading) return null;
  // CRUD table browser stays Superuser-only (unchanged). Reset Data is Superuser OR Owner —
  // the same two full-authority roles it was gated to back when it lived on the Pengaturan
  // page — so an Owner who could reset data before can still reach it here, just not the
  // generic table editor.
  const canManageTables = isSuperRole(user?.role);
  const canResetData = user?.role === "superuser" || user?.role === "owner";
  if (!canManageTables && !canResetData) {
    return (
      <Card className="text-sm text-neutral-500">
        {t("admin.accessDenied", "Halaman ini khusus Owner.")}
      </Card>
    );
  }

  const showForm = columns.length > 0 && (editingId || !disableCreate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("admin.title", "Admin Data")}</h1>
        <p className="text-sm text-neutral-500">
          {t("admin.subtitle", "Akses langsung ke tabel data master — tambah, ubah, hapus. Ini adalah jalur pintas ke database, gunakan dengan hati-hati. Tabel transaksi (order, pembayaran, jurnal akuntansi, riwayat stok) sengaja tidak ditampilkan di sini supaya integritas akuntansi & audit trail tidak rusak.")}
        </p>
        <p className="text-xs text-neutral-600 mt-1">
          {t("admin.isolationNote", "Semua data di halaman ini terisolasi per outlet/merchant — kamu hanya melihat & mengubah data outlet kamu sendiri, tidak pernah data tenant lain.")}
        </p>
      </div>

      {canManageTables ? (
        <>
          <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
            {TABLE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTableKey(opt.key)}
                className={`px-3 py-2 text-sm whitespace-nowrap ${tableKey === opt.key ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}
              >
                {t(opt.labelKey, opt.fallback)}
              </button>
            ))}
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          {tableKey === "staff" && (
            <div className="text-xs text-amber-400">
              {t("admin.staffNote", 'Tambah staf baru (perlu password) tetap lewat halaman "Staf & Hak Akses" — di sini kamu bisa ubah role/status atau hapus.')}
            </div>
          )}

          {showForm && (
            <Card className="space-y-3">
              <h2 className="font-medium">{editingId ? t("admin.form.editTitle", "Edit {label}").replace("{label}", label) : t("admin.form.addTitle", "Tambah {label}").replace("{label}", label)}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {columns.map((c) => (
                  <div key={c.key}>
                    <label className="text-xs text-neutral-500">
                      {c.key}
                      {c.notNull && !c.hasDefault ? " *" : ""}
                    </label>
                    <FieldInput col={c} value={form[c.key]} onChange={(v) => setForm({ ...form, [c.key]: v })} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={submit}>{editingId ? t("admin.form.saveBtn", "Simpan Perubahan") : t("admin.form.addBtn", "Tambah")}</Button>
                {editingId && (
                  <Button variant="ghost" onClick={() => { setEditingId(null); setForm({}); }}>
                    {t("admin.form.cancelBtn", "Batal")}
                  </Button>
                )}
              </div>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-800">
                    {columns.map((c) => <th key={c.key} className="py-2 pr-3 whitespace-nowrap">{c.key}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-900">
                      {columns.map((c) => (
                        <td key={c.key} className="py-2 pr-3 max-w-xs truncate">{String(r[c.key] ?? "")}</td>
                      ))}
                      <td className="text-right space-x-1 whitespace-nowrap">
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => startEdit(r)}>{t("admin.table.editBtn", "Edit")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => remove(r)}>{t("admin.table.deleteBtn", "Hapus")}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("admin.table.noData", "Belum ada data.")}</div>}
            </div>
          </Card>
        </>
      ) : (
        <Card className="text-sm text-neutral-500">
          {t("admin.ownerOnlyNote", 'Akses penuh Admin Data (tambah/ubah/hapus tabel master) direservasi khusus untuk tim NEXBILL. Kamu login sebagai Owner — bagian "Hapus Semua Data" di bawah tetap bisa kamu akses.')}
        </Card>
      )}

      {canResetData && <PpobOrphanCleanupSection />}
      {canResetData && <ResetDataSection />}
    </div>
  );
}
