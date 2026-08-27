"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-ppob";

interface FeatureFlagRow { key: string; effectiveEnabled: boolean; }

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

/** Category display labels, resolved per-component from each component's own t() so every
 * consumer (summary cards, price rules panel, entry form, main page) stays in sync with the
 * active language without threading a shared translated map through props. */
function categoryLabels(t: (key: string, fallback?: string) => string): Record<string, string> {
  return {
    ewallet_topup: t("ppob.category.ewalletTopup", "Top Up E-Wallet"),
    token_listrik: t("ppob.category.tokenListrik", "Token Listrik PLN"),
    pulsa: t("ppob.category.pulsa", "Pulsa"),
    transfer: t("ppob.category.transfer", "Transfer"),
    tarik_tunai: t("ppob.category.tarikTunai", "Tarik Tunai"),
    lainnya: t("ppob.category.lainnya", "Lainnya"),
  };
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function toDateInput(d: Date) { return d.toISOString().slice(0, 10); }

export default function PpobPage() {
  const { t } = useDashboardLang();
  const CATEGORY_LABEL = categoryLabels(t);
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as any;
  const canManage = hasPermission(role, "manage_ppob");
  // Exact-role check, not hasPermission() — edit & hapus permanen
  // transaksi PPOB sengaja dibatasi hanya Superuser, beda dengan tambah/Batalkan
  // yang tetap terbuka untuk siapa saja dengan izin manage_ppob.
  const isSuperuser = role === "superuser" || role === "owner";
  const [editingTx, setEditingTx] = useState<any>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const [outletId, setOutletId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [priceRules, setPriceRules] = useState<any[]>([]);
  const [showPriceRules, setShowPriceRules] = useState(false);
  const [fromDate, setFromDate] = useState(toDateInput(new Date()));
  const [toDate, setToDate] = useState(toDateInput(new Date()));
  const [data, setData] = useState<{ transactions: any[]; summary: any } | null>(null);
  const [saldoFastpay, setSaldoFastpay] = useState<number | null>(null);

  useEffect(() => {
    fetchJsonObject("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); });
    fetchJsonObject<{ flags: FeatureFlagRow[] }>("/api/feature-flags").then((d) => setEnabled(!!d?.flags.find((f) => f.key === "PPOB_ENABLED")?.effectiveEnabled));
  }, []);
  useEffect(() => {
    if (!outletId) return;
    fetchJsonArray(`/api/cash-bank-accounts?outletId=${outletId}`).then(setAccounts);
    loadPriceRules();
  }, [outletId]);

  const loadPriceRules = () => {
    if (outletId) fetchJsonArray(`/api/ppob/price-rules?outletId=${outletId}`).then(setPriceRules);
  };

  const range = useMemo(() => ({
    from: fromDate ? startOfDay(new Date(fromDate)).toISOString() : undefined,
    to: toDate ? endOfDay(new Date(toDate)).toISOString() : undefined,
  }), [fromDate, toDate]);

  const load = async () => {
    if (!outletId) return;
    const params = new URLSearchParams({ outletId, ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) });
    const res = await fetchJsonObject(`/api/ppob/transactions?${params}`);
    setData(res as any);
    const summary = await fetchJsonObject(`/api/ppob/summary?${params}`);
    setSaldoFastpay((summary as any)?.saldoFastpay ?? null);
  };
  useEffect(() => { load(); }, [outletId, range.from, range.to]);

  const fastpayAccount = accounts.find((a) => a.code === "1151");
  const cashAccount = accounts.find((a) => a.type === "cash");

  const doVoid = async (id: string) => {
    const reason = prompt(t("ppob.promptVoidReason", "Alasan pembatalan transaksi PPOB ini?")) ?? "";
    const res = await fetch(`/api/ppob/transactions/${id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    load();
  };

  const deleteTx = async (id: string) => {
    if (!await showConfirm(t("ppob.confirmDeleteTransaction", "Hapus transaksi PPOB ini secara PERMANEN? Beda dengan Batalkan — ini menghapus total dari sistem (termasuk jurnal akuntansinya) dan tidak bisa dibatalkan."))) return;
    const res = await fetch(`/api/ppob/transactions/${id}`, { method: "DELETE" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    showAlert(t("ppob.alertTransactionDeleted", "Transaksi PPOB berhasil dihapus."));
    load();
  };

  if (enabled === false) {
    return (
      <Card className="space-y-2">
        <h1 className="gm-display text-xl font-bold gm-gradient-title">PPOB</h1>
        <p className="text-sm text-neutral-400">{t("ppob.disabledNotice", "Modul PPOB sedang nonaktif.")}</p>
        {isSuperRole(user?.role) ? (
          <p className="text-sm text-neutral-500">
            {t("ppob.disabledEnablePrefix", "Aktifkan di ")}
            <Link href="/dashboard/settings" className="text-emerald-400 underline">{t("ppob.disabledEnableLinkText", "Pengaturan > Feature Management")}</Link>
            {t("ppob.disabledEnableSuffix", ".")}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">{t("ppob.disabledContactAdmin", "Hubungi Owner/Superuser untuk mengaktifkannya.")}</p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">PPOB</h1>
        <p className="text-sm text-neutral-500">
          {t("ppob.subtitle", "Pencatatan transaksi PPOB (top up e-wallet, token listrik, pulsa, transfer, tarik tunai) via Fastpay — terpisah dari stok F&B, tetap satu accounting. Biaya provider (Fastpay Fee Outlet, tier Basic) dibukukan sebagai beban riil, terpisah dari margin toko yang Anda atur sendiri. Edit dan hapus permanen transaksi hanya bisa dilakukan akun Superuser.")}
        </p>
      </div>

      {outletId && (
        <>
          <SummaryCards saldoFastpay={saldoFastpay} summary={data?.summary} />
          <Card className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-neutral-500">{t("ppob.filter.from", "Dari")}</label>
              <input type="date" className="block rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-neutral-500">{t("ppob.filter.to", "Sampai")}</label>
              <input type="date" className="block rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button variant="ghost" className="text-xs" onClick={() => { const d = toDateInput(new Date()); setFromDate(d); setToDate(d); }}>{t("ppob.filter.today", "Hari Ini")}</Button>
            <Button variant="ghost" className="text-xs" onClick={() => { const n = new Date(); setFromDate(toDateInput(new Date(n.getFullYear(), n.getMonth(), 1))); setToDate(toDateInput(new Date(n.getFullYear(), n.getMonth() + 1, 0))); }}>{t("ppob.filter.thisMonth", "Bulan Ini")}</Button>
            {canManage && <Button variant="ghost" className="text-xs ml-auto" onClick={() => setShowPriceRules((v) => !v)}>{showPriceRules ? t("ppob.btnCloseFormPriceRules", "Tutup Harga Provider & Margin") : t("ppob.btnManagePriceRules", "Kelola Harga Provider & Margin")}</Button>}
          </Card>

          {canManage && showPriceRules && <PriceRulesPanel outletId={outletId} rules={priceRules} onChanged={loadPriceRules} />}

          {canManage && <EntryForm outletId={outletId} accounts={accounts} priceRules={priceRules} defaultFunding={fastpayAccount?.id} defaultReceiving={cashAccount?.id} onCreated={load} />}

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-800">
                  <th className="py-2">{t("ppob.col.time", "Waktu")}</th><th>{t("ppob.col.cashier", "Kasir")}</th><th>{t("ppob.col.category", "Kategori")}</th><th>{t("ppob.col.product", "Produk")}</th><th>{t("ppob.col.ref", "Ref")}</th>
                  <th>{t("ppob.col.nominal", "Nominal")}</th><th>{t("ppob.col.modal", "Modal")}</th><th>{t("ppob.col.providerFee", "Biaya Fastpay")}</th><th>{t("ppob.col.margin", "Margin")}</th><th>{t("ppob.col.uangMasuk", "Uang Masuk")}</th><th>{t("ppob.col.account", "Akun")}</th><th>{t("ppob.col.status", "Status")}</th><th>{t("ppob.col.action", "Aksi")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.transactions ?? []).map((tx) => (
                  <tr key={tx.id} className="border-b border-neutral-900 align-top">
                    <td className="py-2 whitespace-nowrap text-xs">{new Date(tx.createdAt).toLocaleString("id-ID")}</td>
                    <td className="text-xs">{tx.staffName}</td>
                    <td className="text-xs">{CATEGORY_LABEL[tx.category] ?? tx.category}</td>
                    <td className="text-xs">{tx.product}</td>
                    <td className="text-xs text-neutral-400">{tx.serviceRef ?? "-"}</td>
                    <td className="text-xs">{rupiah(tx.nominal)}</td>
                    <td className="text-xs">{rupiah(tx.modal)}</td>
                    <td className="text-xs text-amber-400">{rupiah(tx.providerFee)}</td>
                    <td className="text-xs text-emerald-400">{rupiah(tx.feeAdmin)}</td>
                    <td className="text-xs font-medium">{rupiah(tx.uangMasuk)}</td>
                    <td className="text-xs text-neutral-400">{tx.fundingAccountName} → {tx.receivingAccountName}</td>
                    <td><Badge status={tx.status === "success" ? "success" : "failed"}>{tx.status === "success" ? t("ppob.status.success", "Sukses") : t("ppob.status.reversed", "Reversed")}</Badge></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {canManage && tx.status === "success" && (
                          <Button variant="ghost" className="text-xs text-red-400" onClick={() => doVoid(tx.id)}>{t("ppob.void", "Batalkan")}</Button>
                        )}
                        {isSuperuser && tx.status === "success" && (
                          <Button variant="ghost" className="text-xs text-emerald-400" onClick={() => setEditingTx(tx)}>{t("ppob.edit", "Edit")}</Button>
                        )}
                        {isSuperuser && (
                          <Button variant="ghost" className="text-xs text-red-500" onClick={() => deleteTx(tx.id)}>{t("ppob.delete", "Hapus")}</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.transactions ?? []).length === 0 && (
                  <tr><td colSpan={13} className="text-center text-neutral-500 py-6">{t("ppob.noTransactions", "Belum ada transaksi PPOB pada periode ini.")}</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {editingTx && (
        <PpobEditModal
          tx={editingTx}
          accounts={accounts}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); load(); }}
        />
      )}
    </div>
  );
}

function SummaryCards({ saldoFastpay, summary }: { saldoFastpay: number | null; summary: any }) {
  const { t } = useDashboardLang();
  const CATEGORY_LABEL = categoryLabels(t);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-3">
        <div className="text-xs text-neutral-500">{t("ppob.summary.saldoFastpay", "Saldo Deposit Fastpay")}</div>
        <div className="text-lg font-semibold mt-1">{saldoFastpay === null ? "-" : rupiah(saldoFastpay)}</div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-neutral-500">{t("ppob.summary.transactionsPeriod", "Transaksi (periode ini)")}</div>
        <div className="text-lg font-semibold mt-1">{summary?.activeTransactions ?? 0}</div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-neutral-500">{t("ppob.summary.providerFeeExpense", "Beban Biaya Fastpay")}</div>
        <div className="text-lg font-semibold mt-1 text-amber-400">{rupiah(summary?.totalProviderFee ?? 0)}</div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-neutral-500">{t("ppob.summary.marginNetProfit", "Margin (Keuntungan Bersih)")}</div>
        <div className="text-lg font-semibold mt-1 text-emerald-400">{rupiah(summary?.totalFeeAdmin ?? 0)}</div>
      </Card>
      {summary?.byCategory?.map((c: any) => (
        <Card key={c.category} className="p-3">
          <div className="text-xs text-neutral-500">{CATEGORY_LABEL[c.category] ?? c.category}</div>
          <div className="text-sm font-medium mt-1">{t("ppob.summary.categoryLine", "{count}x · {amount} margin").replace("{count}", String(c.count)).replace("{amount}", rupiah(c.feeAdmin))}</div>
        </Card>
      ))}
    </div>
  );
}

function PriceRulesPanel({ outletId, rules, onChanged }: { outletId: string; rules: any[]; onChanged: () => void }) {
  const { t } = useDashboardLang();
  const CATEGORY_LABEL = categoryLabels(t);
  const [category, setCategory] = useState("ewallet_topup");
  const [product, setProduct] = useState("");
  const [providerFee, setProviderFee] = useState("");
  const [defaultMargin, setDefaultMargin] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (r: any) => {
    setEditingId(r.id); setCategory(r.category); setProduct(r.product);
    setProviderFee(String(r.providerFee)); setDefaultMargin(String(r.defaultMargin));
  };
  const resetForm = () => { setEditingId(null); setCategory("ewallet_topup"); setProduct(""); setProviderFee(""); setDefaultMargin(""); };

  const save = async () => {
    if (!product.trim()) return showAlert(t("ppob.alertFillProductName", "Isi nama produk."));
    const res = await fetch("/api/ppob/price-rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, outletId, category, product, providerFee: Number(providerFee || 0), defaultMargin: Number(defaultMargin || 0) }),
    });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    resetForm();
    onChanged();
  };

  const remove = async (id: string) => {
    if (!await showConfirm(t("ppob.confirmDeletePriceRule", "Hapus aturan harga ini?"))) return;
    const res = await fetch(`/api/ppob/price-rules/${id}`, { method: "DELETE" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    onChanged();
  };

  return (
    <Card className="space-y-3 border-amber-500/30">
      <div>
        <h2 className="font-medium">{t("ppob.priceRules.heading", "Harga Provider & Margin")}</h2>
        <p className="text-xs text-neutral-500">{t("ppob.priceRules.description", "Biaya Fastpay diisi dari daftar Fee Outlet tier Basic (fastpay.co.id/blog/layanan-fee) — margin sepenuhnya Anda atur sendiri. Keduanya jadi default saat kasir memilih produk ini, tapi tetap bisa diubah per transaksi.")}</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800">
            <th className="py-1.5">{t("ppob.priceRules.col.category", "Kategori")}</th><th>{t("ppob.priceRules.col.product", "Produk")}</th><th>{t("ppob.priceRules.col.providerFee", "Biaya Fastpay")}</th><th>{t("ppob.priceRules.col.defaultMargin", "Margin Default")}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b border-neutral-900">
              <td className="py-1.5">{CATEGORY_LABEL[r.category] ?? r.category}</td>
              <td>{r.product}</td>
              <td className="text-amber-400">{rupiah(r.providerFee)}</td>
              <td className="text-emerald-400">{rupiah(r.defaultMargin)}</td>
              <td className="flex gap-1 py-1.5">
                <Button variant="ghost" className="text-xs" onClick={() => startEdit(r)}>{t("ppob.edit", "Edit")}</Button>
                <Button variant="ghost" className="text-xs text-red-400" onClick={() => remove(r.id)}>{t("ppob.delete", "Hapus")}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.priceRules.productPlaceholder", "Nama produk")} value={product} onChange={(e) => setProduct(e.target.value)} />
        <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.priceRules.providerFeePlaceholder", "Biaya Fastpay")} value={providerFee} onChange={(e) => setProviderFee(e.target.value)} />
        <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.priceRules.defaultMarginPlaceholder", "Margin default")} value={defaultMargin} onChange={(e) => setDefaultMargin(e.target.value)} />
        <div className="flex gap-1">
          <Button className="text-xs" onClick={save}>{editingId ? t("ppob.save", "Simpan") : t("ppob.add", "Tambah")}</Button>
          {editingId && <Button variant="ghost" className="text-xs" onClick={resetForm}>{t("ppob.cancel", "Batal")}</Button>}
        </div>
      </div>
    </Card>
  );
}

function EntryForm({ outletId, accounts, priceRules, defaultFunding, defaultReceiving, onCreated }: {
  outletId: string; accounts: any[]; priceRules: any[]; defaultFunding?: string; defaultReceiving?: string; onCreated: () => void;
}) {
  const { t } = useDashboardLang();
  const CATEGORY_LABEL = categoryLabels(t);
  const [category, setCategory] = useState("ewallet_topup");
  const [product, setProduct] = useState("");
  const [serviceRef, setServiceRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [nominal, setNominal] = useState("");
  const [modal, setModal] = useState("");
  const [providerFee, setProviderFee] = useState("");
  const [feeAdmin, setFeeAdmin] = useState("");
  const [funding, setFunding] = useState(defaultFunding ?? "");
  const [receiving, setReceiving] = useState(defaultReceiving ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (defaultFunding && !funding) setFunding(defaultFunding); }, [defaultFunding]);
  useEffect(() => { if (defaultReceiving && !receiving) setReceiving(defaultReceiving); }, [defaultReceiving]);

  const productsForCategory = priceRules.filter((r) => r.category === category);

  // Tarik tunai flips the usual flow: customer receives cash, Fastpay saldo gets credited —
  // swap the default legs when the category changes to it (still editable by the cashier).
  const onCategoryChange = (next: string) => {
    setCategory(next);
    setProduct(""); setProviderFee(""); setFeeAdmin("");
    if (next === "tarik_tunai") {
      const cash = accounts.find((a) => a.type === "cash")?.id;
      const fastpay = accounts.find((a) => a.code === "1151")?.id;
      if (cash) setFunding(cash);
      if (fastpay) setReceiving(fastpay);
    } else if (defaultFunding && defaultReceiving) {
      setFunding(defaultFunding);
      setReceiving(defaultReceiving);
    }
  };

  // When the cashier picks (or types an exact match for) a product that has a saved price
  // rule, auto-fill the provider fee + margin from it — still fully editable afterward.
  const onProductChange = (next: string) => {
    setProduct(next);
    const match = productsForCategory.find((r) => r.product.toLowerCase() === next.toLowerCase());
    if (match) {
      setProviderFee(String(match.providerFee));
      setFeeAdmin(String(match.defaultMargin));
    }
  };

  const uangMasuk = (Number(modal || 0) + Number(providerFee || 0) + Number(feeAdmin || 0)) || 0;

  const submit = async () => {
    if (!product.trim()) return showAlert(t("ppob.alertFillProductName", "Isi nama produk."));
    if (!(Number(nominal) > 0)) return showAlert(t("ppob.alertNominalPositive", "Nominal harus lebih dari 0."));
    if (!funding || !receiving) return showAlert(t("ppob.alertSelectAccounts", "Pilih akun sumber modal dan akun penerima."));
    setSaving(true);
    const res = await fetch("/api/ppob/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId, category, product, serviceRef: serviceRef || null, customerName: customerName || null,
        nominal: Number(nominal), modal: Number(modal || nominal), providerFee: Number(providerFee || 0), feeAdmin: Number(feeAdmin || 0),
        fundingCashBankAccountId: funding, receivingCashBankAccountId: receiving, notes: notes || null,
      }),
    });
    const out = await res.json();
    setSaving(false);
    if (!res.ok) return showAlert(out.error);
    setProduct(""); setServiceRef(""); setCustomerName(""); setNominal(""); setModal(""); setProviderFee(""); setFeeAdmin(""); setNotes("");
    onCreated();
  };

  return (
    <Card className="space-y-2">
      <h2 className="font-medium">{t("ppob.entryForm.heading", "Catat Transaksi PPOB")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input list="product-hints" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.entryForm.productPlaceholder", "Produk (mis. DANA)")} value={product} onChange={(e) => onProductChange(e.target.value)} />
        <datalist id="product-hints">
          {productsForCategory.map((r) => <option key={r.id} value={r.product} />)}
        </datalist>
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.entryForm.serviceRefPlaceholder", "No. HP / ID Pelanggan (perintah jasa)")} value={serviceRef} onChange={(e) => setServiceRef(e.target.value)} />
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.entryForm.customerNamePlaceholder", "Nama customer (opsional)")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />

        <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.field.nominalPlaceholder", "Nominal")} value={nominal} onChange={(e) => setNominal(e.target.value)} />
        <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.entryForm.modalPlaceholder", "Modal (default = nominal)")} value={modal} onChange={(e) => setModal(e.target.value)} />
        <input type="number" className="rounded-lg bg-amber-950/30 border border-amber-800/50 px-2 py-1.5 text-xs" placeholder={t("ppob.field.providerFeePlaceholder", "Biaya Fastpay (beban)")} value={providerFee} onChange={(e) => setProviderFee(e.target.value)} />
        <input type="number" className="rounded-lg bg-emerald-950/30 border border-emerald-800/50 px-2 py-1.5 text-xs" placeholder={t("ppob.field.feeAdminPlaceholder", "Margin (keuntungan)")} value={feeAdmin} onChange={(e) => setFeeAdmin(e.target.value)} />

        <div className="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-xs text-neutral-400 flex items-center justify-between sm:col-span-2">
          <span>{t("ppob.entryForm.uangMasukLabel", "Uang Masuk (dibebankan ke customer)")}</span><span className="font-medium text-neutral-200">{rupiah(uangMasuk)}</span>
        </div>
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={funding} onChange={(e) => setFunding(e.target.value)}>
          <option value="">{t("ppob.field.fundingPlaceholder", "Sumber Modal (keluar)")}</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={receiving} onChange={(e) => setReceiving(e.target.value)}>
          <option value="">{t("ppob.field.receivingPlaceholder", "Penerima (uang masuk)")}</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs sm:col-span-4" placeholder={t("ppob.field.notesPlaceholder", "Catatan (opsional)")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={saving}>{saving ? t("ppob.entryForm.saving", "Menyimpan...") : t("ppob.entryForm.submit", "Simpan Transaksi")}</Button>
    </Card>
  );
}

/**
 * Superuser-only correction form — PATCHes /api/ppob/transactions/[id], which
 * voids the original journal entry and posts a fresh one off the corrected
 * numbers (see editPpobTransaction in lib/ppob/engine.ts) rather than
 * silently rewriting a posted journal.
 */
function PpobEditModal({ tx, accounts, onClose, onSaved }: { tx: any; accounts: any[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useDashboardLang();
  const [product, setProduct] = useState(tx.product ?? "");
  const [serviceRef, setServiceRef] = useState(tx.serviceRef ?? "");
  const [customerName, setCustomerName] = useState(tx.customerName ?? "");
  const [nominal, setNominal] = useState(String(tx.nominal ?? ""));
  const [modalAmount, setModalAmount] = useState(String(tx.modal ?? ""));
  const [providerFee, setProviderFee] = useState(String(tx.providerFee ?? ""));
  const [feeAdmin, setFeeAdmin] = useState(String(tx.feeAdmin ?? ""));
  const [funding, setFunding] = useState(tx.fundingCashBankAccountId ?? "");
  const [receiving, setReceiving] = useState(tx.receivingCashBankAccountId ?? "");
  const [notes, setNotes] = useState(tx.notes ?? "");
  const [saving, setSaving] = useState(false);

  const uangMasuk = (Number(modalAmount || 0) + Number(providerFee || 0) + Number(feeAdmin || 0)) || 0;

  const save = async () => {
    if (!product.trim()) return showAlert(t("ppob.alertFillProductName", "Isi nama produk."));
    if (!(Number(nominal) > 0)) return showAlert(t("ppob.alertNominalPositive", "Nominal harus lebih dari 0."));
    if (!funding || !receiving) return showAlert(t("ppob.alertSelectAccounts", "Pilih akun sumber modal dan akun penerima."));
    setSaving(true);
    try {
      const res = await fetch(`/api/ppob/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product, serviceRef: serviceRef || null, customerName: customerName || null,
          nominal: Number(nominal), modal: Number(modalAmount || 0), providerFee: Number(providerFee || 0), feeAdmin: Number(feeAdmin || 0),
          fundingCashBankAccountId: funding, receivingCashBankAccountId: receiving, notes: notes || null,
        }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{t("ppob.editModal.heading", "Edit Transaksi PPOB")}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 text-sm">{t("ppob.close", "Tutup")}</button>
        </div>
        <p className="text-xs text-amber-400">{t("ppob.editModal.warning", "Jurnal lama akan dibatalkan otomatis dan diganti jurnal baru sesuai angka yang dikoreksi.")}</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs col-span-2" placeholder={t("ppob.field.productPlaceholder", "Produk")} value={product} onChange={(e) => setProduct(e.target.value)} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.field.serviceRefPlaceholderShort", "No. HP / ID Pelanggan")} value={serviceRef} onChange={(e) => setServiceRef(e.target.value)} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.field.customerNamePlaceholderShort", "Nama customer")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.field.nominalPlaceholder", "Nominal")} value={nominal} onChange={(e) => setNominal(e.target.value)} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("ppob.field.modalPlaceholderShort", "Modal")} value={modalAmount} onChange={(e) => setModalAmount(e.target.value)} />
          <input type="number" className="rounded-lg bg-amber-950/30 border border-amber-800/50 px-2 py-1.5 text-xs" placeholder={t("ppob.field.providerFeePlaceholder", "Biaya Fastpay (beban)")} value={providerFee} onChange={(e) => setProviderFee(e.target.value)} />
          <input type="number" className="rounded-lg bg-emerald-950/30 border border-emerald-800/50 px-2 py-1.5 text-xs" placeholder={t("ppob.field.feeAdminPlaceholder", "Margin (keuntungan)")} value={feeAdmin} onChange={(e) => setFeeAdmin(e.target.value)} />
          <div className="rounded-lg bg-neutral-950 border border-neutral-800 px-2 py-1.5 text-xs text-neutral-400 flex items-center justify-between col-span-2">
            <span>{t("ppob.editModal.uangMasukLabel", "Uang Masuk")}</span><span className="font-medium text-neutral-200">{rupiah(uangMasuk)}</span>
          </div>
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={funding} onChange={(e) => setFunding(e.target.value)}>
            <option value="">{t("ppob.field.fundingPlaceholder", "Sumber Modal (keluar)")}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={receiving} onChange={(e) => setReceiving(e.target.value)}>
            <option value="">{t("ppob.field.receivingPlaceholder", "Penerima (uang masuk)")}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs col-span-2" placeholder={t("ppob.field.notesPlaceholderShort", "Catatan")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? t("ppob.entryForm.saving", "Menyimpan...") : t("ppob.editModal.submit", "Simpan Koreksi")}</Button>
      </div>
    </div>
  );
}
