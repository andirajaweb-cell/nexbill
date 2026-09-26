"use client";
import { Fragment, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import type { listAssetPurchases } from "@/lib/accounting/asset-purchase";

/**
 * Tab "Pembelian Aset" — satu dokumen pembelian berisi beberapa barang + ongkos kirim/pemasangan.
 * Setiap unit otomatis menjadi aset di tab Daftar Aset (dan ikut Penyusutan); jurnal, utang
 * (Accounting → Utang), dan kas keluar shift diurus server di lib/accounting/asset-purchase.ts.
 */

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm w-full";
const CATEGORY_OPTIONS: { value: string; label: string; life: number }[] = [
  { value: "playstation", label: "PlayStation", life: 48 },
  { value: "tv", label: "TV", life: 48 },
  { value: "controller", label: "Controller", life: 12 },
  { value: "furniture", label: "Furniture", life: 48 },
  { value: "vehicle", label: "Kendaraan", life: 96 },
  { value: "other", label: "Lainnya", life: 48 },
];
const STATUS: Record<string, { badge: string; label: string }> = {
  unpaid: { badge: "failed", label: "Belum Dibayar" },
  partial: { badge: "pending", label: "Sebagian" },
  paid: { badge: "success", label: "Lunas" },
  cancelled: { badge: "unknown", label: "Dibatalkan" },
};
const FUNDING = [
  { value: "paid", label: "Lunas sekarang" },
  { value: "partial", label: "Uang muka (DP), sisanya utang" },
  { value: "payable", label: "Utang — bayar nanti" },
  { value: "opening_balance", label: "Saldo awal (aset yang sudah dimiliki)" },
] as const;

type PurchaseRow = Awaited<ReturnType<typeof listAssetPurchases>>[number];
interface Option { id: string; name: string; archivedAt?: string | null }
interface Lookups { suppliers: Option[]; rentalUnits: Option[]; cashBankAccounts: Option[] }

interface ItemForm { name: string; category: string; qty: string; unitCost: string; usefulLifeMonths: string; salvageValue: string; rentalUnitId: string }
/** What was paid at purchase time (DP / full payment), i.e. paidAmount minus later instalments. */
const initialPaid = (p: PurchaseRow) => p.paidAmount - p.payments.filter((x) => x.status === "posted").reduce((s, x) => s + x.amount, 0);
const emptyItem = (): ItemForm => ({ name: "", category: "playstation", qty: "1", unitCost: "", usefulLifeMonths: "48", salvageValue: "", rentalUnitId: "" });
const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const emptyForm = () => ({
  supplierId: "", invoiceNumber: "", purchaseDate: today(), dueDate: "", additionalCost: "", funding: "paid" as string,
  cashBankAccountId: "", paymentMethod: "cash", paidNow: "", notes: "", items: [emptyItem()],
});

export function AssetPurchaseTab({ role, onChanged }: { role: StaffRole; onChanged?: () => void }) {
  const { t } = useDashboardLang();
  const canManage = hasPermission(role, "manage_assets");
  const canCancel = canManage && hasPermission(role, "approve_expenses");
  const [lookups, setLookups] = useState<Lookups>({ suppliers: [], rentalUnits: [], cashBankAccounts: [] });
  const [rows, setRows] = useState<PurchaseRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<{ id: string; number: string; outstanding: number; amount: string; cashBankAccountId: string; method: string } | null>(null);

  const load = () => {
    fetchJsonArray<PurchaseRow>(`/api/asset-purchases`).then(setRows);
    fetchJsonObject<Partial<Lookups>>(`/api/assets`).then((d) => d && setLookups({ suppliers: d.suppliers ?? [], rentalUnits: d.rentalUnits ?? [], cashBankAccounts: d.cashBankAccounts ?? [] }));
  };
  useEffect(load, []);

  // Live preview — same proration rule the server applies (share of the items subtotal).
  const items = form.items.map((i) => ({ ...i, q: Math.max(0, Math.floor(Number(i.qty) || 0)), c: Math.max(0, Number(i.unitCost) || 0) }));
  const subtotal = items.reduce((s, i) => s + i.q * i.c, 0);
  const extra = Math.max(0, Number(form.additionalCost) || 0);
  const total = subtotal + extra;
  const landed = (i: (typeof items)[number]) => (i.q > 0 ? (i.q * i.c + (subtotal > 0 ? (extra * i.q * i.c) / subtotal : extra / items.length)) / i.q : 0);
  const unitCount = items.reduce((s, i) => s + i.q, 0);
  const needsCash = form.funding === "paid" || form.funding === "partial";

  const setItem = (idx: number, patch: Partial<ItemForm>) => setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });

  const submit = async () => {
    if (form.items.some((i) => !i.name.trim() || !(Number(i.unitCost) > 0) || !(Number(i.qty) > 0) || !(Number(i.usefulLifeMonths) > 0))) {
      return showAlert(t("assets.purchase.alertItems", "Setiap baris wajib punya nama, qty, harga satuan, dan umur ekonomis."));
    }
    if (needsCash && !form.cashBankAccountId) return showAlert(t("assets.purchase.alertCash", "Pilih akun kas/bank sumber pembayaran."));
    if (form.funding === "partial" && !(Number(form.paidNow) > 0 && Number(form.paidNow) < total)) {
      return showAlert(t("assets.purchase.alertDp", "Uang muka harus lebih dari 0 dan kurang dari total."));
    }
    const ok = await showConfirm(
      t("assets.purchase.confirm", "Simpan pembelian {n} unit aset senilai {total}? Jurnal akan langsung diposting.").replace("{n}", String(unitCount)).replace("{total}", rupiah(total))
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/asset-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: form.supplierId || null,
          invoiceNumber: form.invoiceNumber || null,
          purchaseDate: form.purchaseDate || null,
          dueDate: form.dueDate || null,
          additionalCost: extra,
          funding: form.funding,
          cashBankAccountId: needsCash ? form.cashBankAccountId : null,
          paymentMethod: needsCash ? form.paymentMethod : null,
          paidNow: form.funding === "partial" ? Number(form.paidNow) : undefined,
          notes: form.notes || null,
          items: form.items.map((i) => ({
            name: i.name,
            category: i.category,
            qty: Number(i.qty),
            unitCost: Number(i.unitCost),
            usefulLifeMonths: Number(i.usefulLifeMonths),
            salvageValue: Number(i.salvageValue) || 0,
            rentalUnitId: Number(i.qty) === 1 && i.rentalUnitId ? i.rentalUnitId : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm(emptyForm());
      setShowForm(false);
      load();
      onChanged?.();
      showAlert(
        t("assets.purchase.saved", "Pembelian {no} tersimpan — {n} aset ditambahkan ke Daftar Aset.").replace("{no}", data.purchase.purchaseNumber).replace("{n}", String(data.assets.length))
      );
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!payFor) return;
    if (!payFor.cashBankAccountId) return showAlert(t("assets.purchase.alertCash", "Pilih akun kas/bank sumber pembayaran."));
    setBusy(true);
    try {
      const res = await fetch(`/api/asset-purchases/${payFor.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(payFor.amount), cashBankAccountId: payFor.cashBankAccountId, method: payFor.method }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setPayFor(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (p: PurchaseRow) => {
    const reason = await showPrompt(
      t("assets.purchase.cancelPrompt", "Batalkan pembelian {no}? Semua jurnalnya dibalik dan {n} asetnya ditandai dilepas. Tulis alasannya:").replace("{no}", p.purchaseNumber).replace("{n}", String(p.assets.length))
    );
    if (!reason?.trim()) return;
    const res = await fetch(`/api/asset-purchases/${p.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
    onChanged?.();
  };

  const cashOptions = lookups.cashBankAccounts.map((c) => ({ value: c.id, label: c.name }));
  const totals = (rows ?? []).filter((r) => r.status !== "cancelled");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card className="py-3">
          <div className="text-xs text-neutral-500">{t("assets.purchase.statTotal", "Total pembelian aset")}</div>
          <div className="text-lg font-semibold">{rupiah(totals.reduce((s, r) => s + r.total, 0))}</div>
        </Card>
        <Card className="py-3">
          <div className="text-xs text-neutral-500">{t("assets.purchase.statOutstanding", "Sisa utang pembelian aset")}</div>
          <div className="text-lg font-semibold text-amber-400">{rupiah(totals.reduce((s, r) => s + r.outstanding, 0))}</div>
        </Card>
        <div className="flex items-center justify-end col-span-2 sm:col-span-1">
          {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("assets.closeForm", "Tutup Form") : t("assets.purchase.new", "+ Pembelian Aset")}</Button>}
        </div>
      </div>

      {showForm && (
        <Card className="space-y-4">
          <h2 className="font-medium">{t("assets.purchase.formTitle", "Form Pembelian Aset")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <label className="text-xs text-neutral-400 space-y-1">
              <span>{t("assets.purchase.supplier", "Supplier (opsional)")}</span>
              <SearchableSelect value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} placeholder="—" options={lookups.suppliers.filter((s) => !s.archivedAt || s.id === form.supplierId).map((s) => ({ value: s.id, label: s.name }))} />
            </label>
            <label className="text-xs text-neutral-400 space-y-1">
              <span>{t("assets.purchase.invoiceNo", "No. faktur/nota supplier")}</span>
              <input className={inputCls} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </label>
            <label className="text-xs text-neutral-400 space-y-1">
              <span>{t("assets.purchase.date", "Tanggal perolehan")}</span>
              <input type="date" className={inputCls} value={form.purchaseDate} max={today()} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </label>
            <label className="text-xs text-neutral-400 space-y-1">
              <span>{t("assets.purchase.additionalCost", "Ongkos kirim/pasang (dikapitalisasi)")}</span>
              <input type="number" min={0} className={inputCls} value={form.additionalCost} onChange={(e) => setForm({ ...form, additionalCost: e.target.value })} />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-neutral-400">{t("assets.purchase.items", "Barang yang dibeli")}</div>
            {form.items.map((it, idx) => {
              const pv = items[idx];
              return (
                <div key={idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end rounded-lg border border-neutral-800 p-2">
                  <label className="col-span-2 sm:col-span-3 text-xs text-neutral-500 space-y-1">
                    <span>{t("assets.purchase.itemName", "Nama aset")}</span>
                    <input className={inputCls} placeholder="PS5 Slim" value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
                  </label>
                  <label className="sm:col-span-2 text-xs text-neutral-500 space-y-1">
                    <span>{t("assets.tableCategory", "Kategori")}</span>
                    <select
                      className={inputCls}
                      value={it.category}
                      onChange={(e) => setItem(idx, { category: e.target.value, usefulLifeMonths: String(CATEGORY_OPTIONS.find((c) => c.value === e.target.value)?.life ?? 48) })}
                    >
                      {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="sm:col-span-1 text-xs text-neutral-500 space-y-1">
                    <span>Qty</span>
                    <input type="number" min={1} className={inputCls} value={it.qty} onChange={(e) => setItem(idx, { qty: e.target.value })} />
                  </label>
                  <label className="sm:col-span-2 text-xs text-neutral-500 space-y-1">
                    <span>{t("assets.purchase.unitCost", "Harga satuan")}</span>
                    <input type="number" min={0} className={inputCls} value={it.unitCost} onChange={(e) => setItem(idx, { unitCost: e.target.value })} />
                  </label>
                  <label className="sm:col-span-1 text-xs text-neutral-500 space-y-1">
                    <span>{t("assets.purchase.life", "Umur (bln)")}</span>
                    <input type="number" min={1} className={inputCls} value={it.usefulLifeMonths} onChange={(e) => setItem(idx, { usefulLifeMonths: e.target.value })} />
                  </label>
                  <label className="sm:col-span-1 text-xs text-neutral-500 space-y-1">
                    <span>{t("assets.purchase.salvage", "Nilai sisa/unit")}</span>
                    <input type="number" min={0} className={inputCls} value={it.salvageValue} onChange={(e) => setItem(idx, { salvageValue: e.target.value })} />
                  </label>
                  <label className="sm:col-span-2 text-xs text-neutral-500 space-y-1">
                    <span>{t("assets.purchase.rentalUnit", "Unit PS (qty 1)")}</span>
                    <select className={inputCls} value={it.rentalUnitId} disabled={Number(it.qty) !== 1} onChange={(e) => setItem(idx, { rentalUnitId: e.target.value })}>
                      <option value="">—</option>
                      {lookups.rentalUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                  <div className="col-span-2 sm:col-span-12 flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {t("assets.purchase.landed", "Harga perolehan/unit")}: <span className="text-neutral-200">{rupiah(landed(pv))}</span> · {t("assets.purchase.lineTotal", "Jumlah")}: {rupiah(pv.q * pv.c)}
                    </span>
                    {form.items.length > 1 && (
                      <button className="text-rose-400 hover:underline" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>
                        {t("assets.purchase.removeLine", "Hapus baris")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <Button variant="secondary" className="text-xs" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>{t("assets.purchase.addLine", "+ Tambah barang")}</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <label className="text-xs text-neutral-400 space-y-1 sm:col-span-2">
              <span>{t("assets.purchase.funding", "Cara pembayaran")}</span>
              <select className={inputCls} value={form.funding} onChange={(e) => setForm({ ...form, funding: e.target.value })}>
                {FUNDING.map((f) => <option key={f.value} value={f.value}>{t(`assets.purchase.funding.${f.value}`, f.label)}</option>)}
              </select>
            </label>
            {needsCash && (
              <>
                <label className="text-xs text-neutral-400 space-y-1">
                  <span>{t("assets.optionCashBankAccount", "Akun Kas/Bank")}</span>
                  <SearchableSelect value={form.cashBankAccountId} onChange={(v) => setForm({ ...form, cashBankAccountId: v })} placeholder="—" options={cashOptions} />
                </label>
                <label className="text-xs text-neutral-400 space-y-1">
                  <span>{t("assets.purchase.method", "Metode")}</span>
                  <select className={inputCls} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="bank">Bank</option>
                  </select>
                </label>
              </>
            )}
            {form.funding === "partial" && (
              <label className="text-xs text-neutral-400 space-y-1">
                <span>{t("assets.purchase.paidNow", "Uang muka dibayar sekarang")}</span>
                <input type="number" min={0} className={inputCls} value={form.paidNow} onChange={(e) => setForm({ ...form, paidNow: e.target.value })} />
              </label>
            )}
            {(form.funding === "partial" || form.funding === "payable") && (
              <label className="text-xs text-neutral-400 space-y-1">
                <span>{t("assets.purchase.dueDate", "Jatuh tempo utang")}</span>
                <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </label>
            )}
            <label className="text-xs text-neutral-400 space-y-1 sm:col-span-4">
              <span>{t("assets.placeholderNotes", "Catatan (opsional)")}</span>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          {form.funding === "opening_balance" && (
            <p className="text-xs text-amber-400">
              {t("assets.purchase.openingHint", "Untuk aset yang sudah dimiliki sebelum memakai NEXBILL: tidak ada kas keluar, jurnalnya Dr Aset / Cr Ekuitas Saldo Awal (3400). Isi harga dengan nilai buku saat ini dan umur dengan sisa umur ekonomisnya.")}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-3 text-sm">
            <div className="space-x-4 text-neutral-400">
              <span>{t("assets.purchase.subtotal", "Subtotal")}: <b className="text-neutral-200">{rupiah(subtotal)}</b></span>
              <span>{t("assets.purchase.extra", "Ongkos")}: <b className="text-neutral-200">{rupiah(extra)}</b></span>
              <span>{t("assets.purchase.total", "Total")}: <b className="text-emerald-400">{rupiah(total)}</b></span>
              <span>{unitCount} {t("assets.purchase.units", "unit aset")}</span>
            </div>
            <Button onClick={submit} disabled={busy}>{busy ? t("assets.processing", "Memproses...") : t("assets.purchase.save", "Simpan Pembelian")}</Button>
          </div>
        </Card>
      )}

      {payFor && (
        <Card className="space-y-2 border-emerald-500/40">
          <h2 className="font-medium">{t("assets.purchase.payTitle", "Bayar Utang {no}").replace("{no}", payFor.number)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="number" className={inputCls} value={payFor.amount} onChange={(e) => setPayFor({ ...payFor, amount: e.target.value })} />
            <select className={inputCls} value={payFor.method} onChange={(e) => setPayFor({ ...payFor, method: e.target.value })}>
              <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="bank">Bank</option>
            </select>
            <SearchableSelect value={payFor.cashBankAccountId} onChange={(v) => setPayFor({ ...payFor, cashBankAccountId: v })} placeholder={t("assets.optionCashBankAccount", "Akun Kas/Bank")} options={cashOptions} />
          </div>
          <div className="text-xs text-neutral-500">{t("assets.purchase.outstanding", "Sisa utang")}: {rupiah(payFor.outstanding)}</div>
          <div className="flex gap-2">
            <Button onClick={pay} disabled={busy}>{busy ? t("assets.processing", "Memproses...") : t("assets.purchase.pay", "Bayar")}</Button>
            <Button variant="ghost" onClick={() => setPayFor(null)}>{t("assets.cancel", "Batal")}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("assets.purchase.number", "No.")}</th>
              <th>{t("assets.purchase.date", "Tanggal perolehan")}</th>
              <th>{t("assets.purchase.supplierCol", "Supplier")}</th>
              <th>{t("assets.purchase.itemsCol", "Barang")}</th>
              <th className="text-right">{t("assets.purchase.total", "Total")}</th>
              <th className="text-right">{t("assets.purchase.outstanding", "Sisa utang")}</th>
              <th>{t("assets.tableStatus", "Status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b border-neutral-900 align-top">
                  <td className="py-2 text-xs font-mono">
                    <button className="hover:underline" onClick={() => setOpenId(openId === p.id ? null : p.id)}>{p.purchaseNumber}</button>
                    {p.invoiceNumber && <div className="text-neutral-500">{p.invoiceNumber}</div>}
                  </td>
                  <td className="text-xs">{new Date(p.purchaseDate).toLocaleDateString("id-ID")}</td>
                  <td className="text-xs">{p.supplierName ?? "—"}</td>
                  <td className="text-xs">{p.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                  <td className="text-xs text-right">{rupiah(p.total)}</td>
                  <td className="text-xs text-right">{p.outstanding > 0 ? <span className="text-amber-400">{rupiah(p.outstanding)}</span> : "—"}</td>
                  <td>
                    <Badge status={STATUS[p.status]?.badge ?? "unknown"}>
                      {p.paymentMethod === "opening_balance" ? t("assets.purchase.status.opening", "Saldo Awal") : t(`assets.purchase.status.${p.status}`, STATUS[p.status]?.label ?? p.status)}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {p.outstanding > 0 && canManage && (
                        <Button
                          variant="secondary"
                          className="text-xs px-2 py-1"
                          onClick={() => setPayFor({ id: p.id, number: p.purchaseNumber, outstanding: p.outstanding, amount: String(p.outstanding), cashBankAccountId: "", method: "cash" })}
                        >
                          {t("assets.purchase.pay", "Bayar")}
                        </Button>
                      )}
                      {p.status !== "cancelled" && canCancel && (
                        <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => cancel(p)}>{t("assets.purchase.cancel", "Batalkan")}</Button>
                      )}
                    </div>
                  </td>
                </tr>
                {openId === p.id && (
                  <tr className="border-b border-neutral-900 bg-neutral-900/40">
                    <td colSpan={8} className="p-3 text-xs space-y-3">
                      <div>
                        <div className="font-medium text-neutral-300 mb-1">{t("assets.purchase.items", "Barang yang dibeli")}</div>
                        {p.items.map((i) => (
                          <div key={i.id} className="flex justify-between">
                            <span>{i.name} · {i.qty} × {rupiah(i.unitCost)} ({t("assets.purchase.landed", "Harga perolehan/unit")} {rupiah(i.landedUnitCost)}, {i.usefulLifeMonths} bln)</span>
                            <span>{rupiah(i.qty * i.unitCost)}</span>
                          </div>
                        ))}
                        {p.additionalCost > 0 && (
                          <div className="flex justify-between text-neutral-400"><span>{t("assets.purchase.additionalCost", "Ongkos kirim/pasang (dikapitalisasi)")}</span><span>{rupiah(p.additionalCost)}</span></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-300 mb-1">{t("assets.purchase.assetsCreated", "Aset yang terbentuk (tab Daftar Aset)")}</div>
                        {p.assets.map((a) => (
                          <div key={a.id} className="flex justify-between">
                            <span>{a.name} <span className="text-neutral-500">({a.status})</span></span>
                            <span>{rupiah(a.acquisitionCost)} · {t("assets.tableBookValue", "Nilai Buku")} {rupiah(a.acquisitionCost - a.accumulatedDepreciation)}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-300 mb-1">{t("assets.purchase.payments", "Pembayaran")}</div>
                        {p.paymentMethod !== "opening_balance" && initialPaid(p) > 0 && (
                          <div className="flex justify-between">
                            <span>{new Date(p.purchaseDate).toLocaleDateString("id-ID")} · {t("assets.purchase.initialPayment", "Dibayar saat pembelian")} ({p.cashBankName ?? p.paymentMethod})</span>
                            <span>{rupiah(initialPaid(p))}</span>
                          </div>
                        )}
                        {p.payments.map((x) => (
                          <div key={x.id} className={`flex justify-between ${x.status === "voided" ? "line-through text-neutral-500" : ""}`}>
                            <span>{new Date(x.paidAt).toLocaleDateString("id-ID")} · {x.cashBankName ?? x.method}</span>
                            <span>{rupiah(x.amount)}</span>
                          </div>
                        ))}
                        {p.paidAmount === 0 && p.payments.length === 0 && <div className="text-neutral-500">—</div>}
                      </div>
                      {p.status === "cancelled" && <div className="text-rose-400">{t("assets.purchase.cancelledReason", "Dibatalkan")}: {p.cancelReason}</div>}
                      {p.notes && <div className="text-neutral-400">{p.notes}</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("assets.purchase.empty", "Belum ada pembelian aset.")}</div>}
        {!rows && <div className="text-sm text-neutral-500 py-4 text-center">{t("accounting.common.loading", "Memuat...")}</div>}
      </Card>
    </div>
  );
}
