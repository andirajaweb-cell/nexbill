"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payments/labels";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-other-income";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const CATEGORY_LABEL_KEY: Record<string, { key: string; fallback: string }> = {
  vendor_commission: { key: "otherIncome.category.vendorCommission", fallback: "Komisi / Kerjasama Vendor" },
  asset_rental: { key: "otherIncome.category.assetRental", fallback: "Sewa Tempat/Aset ke Pihak Lain" },
  asset_sale: { key: "otherIncome.category.assetSale", fallback: "Penjualan Aset/Barang Bekas" },
  sponsorship: { key: "otherIncome.category.sponsorship", fallback: "Sponsorship / Kerjasama Event" },
  penalty_compensation: { key: "otherIncome.category.penaltyCompensation", fallback: "Denda / Ganti Rugi dari Pelanggan" },
  bank_interest_cashback: { key: "otherIncome.category.bankInterestCashback", fallback: "Bunga Bank / Cashback / Promo" },
  other: { key: "otherIncome.category.other", fallback: "Lain-lain" },
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function toDateInput(d: Date) { return d.toISOString().slice(0, 10); }

export default function OtherIncomePage() {
  const { t } = useDashboardLang();
  const categoryLabel = (cat: string) => {
    const entry = CATEGORY_LABEL_KEY[cat];
    return entry ? t(entry.key, entry.fallback) : cat;
  };
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as any;
  const canManage = hasPermission(role, "manage_other_income");

  const [outletId, setOutletId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(toDateInput(new Date(new Date().setDate(new Date().getDate() - 6))));
  const [toDate, setToDate] = useState(toDateInput(new Date()));
  const [data, setData] = useState<{ rows: any[]; totalPosted: number } | null>(null);
  const [methods, setMethods] = useState(PAYMENT_METHOD_OPTIONS); // static 8 as a safe default, replaced once the outlet's live catalog loads
  const methodLabel = useMemo(() => Object.fromEntries(methods.map((m) => [m.value, m.label])), [methods]);

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (!outlet) return;
    setOutletId(outlet.id);
    // Owner-editable payment methods (add/edit/delete from the Pembayaran page) — falls back to the static 8 above if this fails.
    fetchJsonArray(`/api/payment-methods?outletId=${outlet.id}`).then((rows) => {
      const active = rows.filter((m: any) => m.isActive);
      if (active.length > 0) setMethods(active.map((m: any) => ({ value: m.key, label: m.label })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  const range = useMemo(() => ({
    from: fromDate ? startOfDay(new Date(fromDate)).toISOString() : undefined,
    to: toDate ? endOfDay(new Date(toDate)).toISOString() : undefined,
  }), [fromDate, toDate]);

  const load = async () => {
    if (!outletId) return;
    const params = new URLSearchParams({ outletId, ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) });
    const res = await fetchJsonObject(`/api/other-income?${params}`);
    setData(res as any);
  };
  useEffect(() => { load(); }, [outletId, range.from, range.to]);

  const doVoid = async (id: string) => {
    const reason = prompt(t("otherIncome.voidPrompt", "Alasan void entri pendapatan lain-lain ini?")) ?? "";
    if (!reason.trim()) return;
    const res = await fetch(`/api/other-income/${id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    load();
  };

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data?.rows ?? []) {
      if (r.status !== "posted") continue;
      map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("otherIncome.title", "Pendapatan Lain-lain")}</h1>
        <p className="text-sm text-neutral-500">
          {t("otherIncome.subtitle", "Uang masuk di luar penjualan Rental/F&B/PPOB/Produk — komisi vendor, sewa tempat/aset, penjualan barang bekas, sponsorship, denda/ganti rugi, bunga/cashback, dst. Setiap entri langsung terbukukan ke jurnal dan ikut diperhitungkan saat tutup shift (kalau diterima tunai atau lewat channel bersaldo).")}
        </p>
      </div>

      {outletId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="text-xs text-neutral-500">{t("otherIncome.totalPeriod", "Total Periode Ini")}</div>
              <div className="text-lg font-semibold mt-1 text-emerald-400">{rupiah(data?.totalPosted ?? 0)}</div>
            </Card>
            {byCategory.slice(0, 3).map(([cat, amt]) => (
              <Card key={cat} className="p-3">
                <div className="text-xs text-neutral-500">{categoryLabel(cat)}</div>
                <div className="text-sm font-medium mt-1">{rupiah(amt)}</div>
              </Card>
            ))}
          </div>

          <Card className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-neutral-500">{t("otherIncome.filterFrom", "Dari")}</label>
              <input type="date" className="block rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-neutral-500">{t("otherIncome.filterTo", "Sampai")}</label>
              <input type="date" className="block rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button variant="ghost" className="text-xs" onClick={() => { const d = toDateInput(new Date()); setFromDate(d); setToDate(d); }}>{t("otherIncome.today", "Hari Ini")}</Button>
            <Button variant="ghost" className="text-xs" onClick={() => { const n = new Date(); setFromDate(toDateInput(new Date(n.getFullYear(), n.getMonth(), 1))); setToDate(toDateInput(new Date(n.getFullYear(), n.getMonth() + 1, 0))); }}>{t("otherIncome.thisMonth", "Bulan Ini")}</Button>
          </Card>

          {canManage ? (
            <EntryForm outletId={outletId} methods={methods} onCreated={load} />
          ) : (
            <div className="text-xs text-neutral-500 italic">{t("otherIncome.noPermission", "Role kamu tidak punya izin mencatat Pendapatan Lain-lain — hubungi Owner/Manager kalau perlu akses ini.")}</div>
          )}

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-800">
                  <th className="py-2">{t("otherIncome.table.time", "Waktu")}</th><th>{t("otherIncome.table.number", "No.")}</th><th>{t("otherIncome.table.category", "Kategori")}</th><th>{t("otherIncome.table.description", "Deskripsi")}</th><th>{t("otherIncome.table.from", "Dari")}</th>
                  <th>{t("otherIncome.table.amount", "Nominal")}</th><th>{t("otherIncome.table.method", "Metode")}</th><th>{t("otherIncome.table.status", "Status")}</th><th>{t("otherIncome.table.action", "Aksi")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-neutral-900 align-top">
                    <td className="py-2 whitespace-nowrap text-xs">{new Date(r.incomeDate).toLocaleString("id-ID")}</td>
                    <td className="text-xs font-mono text-neutral-400">{r.incomeNumber}</td>
                    <td className="text-xs">{categoryLabel(r.category)}</td>
                    <td className="text-xs text-neutral-400">{r.description ?? "-"}</td>
                    <td className="text-xs">{r.payerName ?? "-"}</td>
                    <td className="text-xs font-medium text-emerald-400">{rupiah(r.amount)}</td>
                    <td className="text-xs">{methodLabel[r.paymentMethod] ?? r.paymentMethod}</td>
                    <td><Badge status={r.status === "posted" ? "success" : "failed"}>{r.status === "posted" ? t("otherIncome.statusPosted", "Posted") : t("otherIncome.statusVoid", "Void")}</Badge></td>
                    <td>
                      {canManage && r.status === "posted" && (
                        <Button variant="ghost" className="text-xs text-red-400" onClick={() => doVoid(r.id)}>{t("otherIncome.voidAction", "Void")}</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(data?.rows ?? []).length === 0 && (
                  <tr><td colSpan={9} className="text-center text-neutral-500 py-6">{t("otherIncome.empty", "Belum ada entri pendapatan lain-lain pada periode ini.")}</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function EntryForm({ outletId, methods, onCreated }: { outletId: string; methods: { value: string; label: string }[]; onCreated: () => void }) {
  const { t } = useDashboardLang();
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!(Number(amount) > 0)) return showAlert(t("otherIncome.amountRequired", "Nominal harus lebih dari 0."));
    setSaving(true);
    const res = await fetch("/api/other-income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId, category, description: description || null, payerName: payerName || null,
        amount: Number(amount), paymentMethod,
      }),
    });
    const out = await res.json();
    setSaving(false);
    if (!res.ok) return showAlert(out.error);
    setDescription(""); setPayerName(""); setAmount("");
    onCreated();
  };

  return (
    <Card className="space-y-2">
      <h2 className="font-medium">{t("otherIncome.formTitle", "Catat Pendapatan Lain-lain")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(CATEGORY_LABEL_KEY).map(([k, entry]) => <option key={k} value={k}>{t(entry.key, entry.fallback)}</option>)}
        </select>
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs sm:col-span-2" placeholder={t("otherIncome.descriptionPlaceholder", "Deskripsi (mis. Sewa lahan parkir ke tetangga)")} value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("otherIncome.payerPlaceholder", "Diterima dari (opsional)")} value={payerName} onChange={(e) => setPayerName(e.target.value)} />
        <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" placeholder={t("otherIncome.amountPlaceholder", "Nominal")} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs sm:col-span-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <Button onClick={submit} disabled={saving} className="sm:col-span-2">{saving ? t("otherIncome.saving", "Menyimpan...") : t("otherIncome.save", "Simpan")}</Button>
      </div>
    </Card>
  );
}
