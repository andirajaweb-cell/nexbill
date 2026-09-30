"use client";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { showAlert } from "@/lib/ui/dialog";
import { useProsesTunggal } from "@/lib/ui/use-proses-tunggal";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-assets";

/**
 * Upload Daftar Aset dari Excel: unduh template → pilih file & cara pencatatan → "Periksa File"
 * (pratinjau, tidak menyimpan) → "Simpan". Tiap tanggal perolehan menjadi satu dokumen Pembelian
 * Aset — lihat src/lib/assets/asset-xlsx.ts.
 */

type Funding = "opening_balance" | "paid" | "payable";

interface Preview {
  totalRows: number;
  validRows: number;
  errors: { row: number; name?: string; error: string }[];
  units: number;
  total: number;
  groups: { date: string; units: number; total: number; items: { row: number; name: string; category: string; qty: number; unitCost: number; usefulLifeMonths: number; rentalUnitName: string | null }[] }[];
}

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

export function AssetImportPanel({
  cashBankAccounts,
  suppliers,
  onClose,
  onDone,
}: {
  cashBankAccounts: { id: string; name: string }[];
  suppliers: { id: string; name: string; archivedAt?: string | null }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, lang } = useDashboardLang();
  const [file, setFile] = useState<File | null>(null);
  const [funding, setFunding] = useState<Funding>("opening_balance");
  const [cashBankAccountId, setCashBankAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [supplierId, setSupplierId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { jalankan, sibuk } = useProsesTunggal();

  const kirim = async (dryRun: boolean) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("funding", funding);
    if (funding === "paid") {
      fd.append("cashBankAccountId", cashBankAccountId);
      fd.append("paymentMethod", paymentMethod);
    }
    if (supplierId) fd.append("supplierId", supplierId);
    if (dryRun) fd.append("dryRun", "1");
    const res = await fetch("/api/assets/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const periksa = () =>
    jalankan("periksa", async () => {
      const r = await kirim(true);
      if (!r) return;
      if (!r.ok) return showAlert(r.data?.error ?? t("assets.io.checkFailed", "Gagal memeriksa file."));
      setPreview(r.data.preview);
      setOpenGroup(null);
    });

  const simpan = () =>
    jalankan("simpan", async () => {
      if (funding === "paid" && !cashBankAccountId) return showAlert(t("assets.alertSelectCashOrPayable", "Pilih akun kas/bank, atau centang 'Catat sebagai hutang'."));
      const r = await kirim(false);
      if (!r) return;
      if (!r.ok) {
        if (r.data?.preview) setPreview(r.data.preview);
        return showAlert(r.data?.error ?? t("assets.io.saveFailed", "Gagal menyimpan."));
      }
      const res = r.data.result as { created: { purchaseNumber: string }[]; assets: number; total: number };
      await showAlert(
        t("assets.io.saved", "{n} aset tersimpan ({total}) dalam dokumen Pembelian Aset: {docs}.")
          .replace("{n}", String(res.assets))
          .replace("{total}", rupiah(res.total))
          .replace("{docs}", res.created.map((c) => c.purchaseNumber).join(", "))
      );
      onDone();
    });

  const fundingOptions: { value: Funding; label: string; hint: string }[] = [
    { value: "opening_balance", label: t("assets.io.fundingOpening", "Saldo awal (aset sudah dimiliki)"), hint: t("assets.io.fundingOpeningHint", "Untuk aset yang sudah ada sebelum memakai NEXBILL. Dicatat ke Ekuitas Saldo Awal — kas tidak berkurang.") },
    { value: "paid", label: t("assets.io.fundingPaid", "Dibayar dari kas/bank"), hint: t("assets.io.fundingPaidHint", "Pembelian baru yang sudah dibayar lunas dari akun kas/bank terpilih.") },
    { value: "payable", label: t("assets.io.fundingPayable", "Dicatat sebagai utang"), hint: t("assets.io.fundingPayableHint", "Pembelian baru yang belum dibayar — muncul di Accounting › Utang.") },
  ];

  const bisaSimpan = preview && preview.errors.length === 0 && preview.validRows > 0;

  return (
    <Card className="space-y-4 border border-cyan-500/30">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-medium">{t("assets.io.importTitle", "Upload Daftar Aset (Excel)")}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t("assets.io.importDesc", "Isi template, lalu upload. File diperiksa dulu sebelum disimpan. Baris dengan tanggal perolehan yang sama digabung menjadi satu dokumen Pembelian Aset — bisa dibatalkan dari tab Pembelian Aset bila keliru.")}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>{t("assets.closeForm", "Tutup Form")}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="text-xs font-semibold text-neutral-400">1. {t("assets.io.step1", "Siapkan file")}</div>
          <a href={`/api/assets/import/template?lang=${lang}`} className="inline-block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100 hover:bg-white/10">
            {t("assets.io.downloadTemplate", "Download Template Excel")}
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                // Kosongkan supaya file yang sama (setelah diperbaiki) bisa dipilih lagi.
                e.target.value = "";
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>{t("assets.io.chooseFile", "Pilih File")}</Button>
            <span className="text-xs text-neutral-400 truncate max-w-[16rem]">{file ? file.name : t("assets.io.noFile", "Belum ada file dipilih")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-neutral-400">2. {t("assets.io.step2", "Cara pencatatan")}</div>
          {fundingOptions.map((o) => (
            <label key={o.value} className={`flex gap-2 rounded-lg border px-3 py-2 cursor-pointer ${funding === o.value ? "border-cyan-400/50 bg-cyan-500/5" : "border-white/10"}`}>
              <input type="radio" name="funding" className="mt-1" checked={funding === o.value} onChange={() => setFunding(o.value)} />
              <span>
                <span className="block text-sm text-neutral-100">{o.label}</span>
                <span className="block text-[11px] text-neutral-500">{o.hint}</span>
              </span>
            </label>
          ))}
          {funding === "paid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SearchableSelect value={cashBankAccountId} onChange={setCashBankAccountId} placeholder={t("assets.optionCashBankAccount", "Akun Kas/Bank")} options={cashBankAccounts.map((c) => ({ value: c.id, label: c.name }))} />
              <select className={inputCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">{t("assets.paymentCash", "Cash")}</option>
                <option value="bank">{t("assets.paymentBank", "Bank")}</option>
                <option value="transfer">{t("assets.paymentTransfer", "Transfer")}</option>
                <option value="qris">{t("assets.paymentQris", "QRIS")}</option>
              </select>
            </div>
          )}
          {funding !== "opening_balance" && (
            <select className={`${inputCls} w-full`} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{t("assets.optionSupplier", "Supplier (opsional)")}</option>
              {suppliers.filter((s) => !s.archivedAt).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <Button variant="secondary" onClick={periksa} disabled={!file || sibuk("periksa")}>
          {sibuk("periksa") ? t("assets.processing", "Memproses...") : t("assets.io.check", "3. Periksa File")}
        </Button>
        <Button onClick={simpan} disabled={!bisaSimpan || sibuk("simpan")}>
          {sibuk("simpan")
            ? t("assets.processing", "Memproses...")
            : t("assets.io.saveN", "4. Simpan {n} Aset").replace("{n}", String(preview?.units ?? 0))}
        </Button>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-white/5 p-2"><div className="text-lg font-bold text-neutral-100">{preview.totalRows}</div><div className="text-[11px] text-neutral-500">{t("assets.io.rowsRead", "Baris dibaca")}</div></div>
            <div className="rounded-lg bg-white/5 p-2"><div className="text-lg font-bold text-emerald-300">{preview.validRows}</div><div className="text-[11px] text-neutral-500">{t("assets.io.rowsValid", "Baris valid")}</div></div>
            <div className="rounded-lg bg-white/5 p-2"><div className={`text-lg font-bold ${preview.errors.length ? "text-rose-300" : "text-neutral-400"}`}>{preview.errors.length}</div><div className="text-[11px] text-neutral-500">{t("assets.io.rowsError", "Baris salah")}</div></div>
            <div className="rounded-lg bg-white/5 p-2"><div className="text-lg font-bold text-cyan-300">{rupiah(preview.total)}</div><div className="text-[11px] text-neutral-500">{t("assets.io.unitsTotal", "{n} unit").replace("{n}", String(preview.units))}</div></div>
          </div>

          {preview.errors.length > 0 && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
              <div className="text-sm font-medium text-rose-200 mb-2">{t("assets.io.fixErrors", "Perbaiki baris berikut di file, lalu pilih file lagi dan periksa ulang. Tidak ada yang disimpan selama masih ada baris salah.")}</div>
              <ul className="space-y-1 text-xs max-h-56 overflow-y-auto">
                {preview.errors.map((e) => (
                  <li key={`${e.row}-${e.error}`} className="text-rose-100">
                    <span className="font-semibold">{t("assets.io.row", "Baris")} {e.row}</span>
                    {e.name ? ` (${e.name})` : ""}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.groups.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-neutral-500">{t("assets.io.groupsNote", "Akan dibuat {n} dokumen Pembelian Aset (satu per tanggal perolehan):").replace("{n}", String(preview.groups.length))}</div>
              {preview.groups.map((g) => {
                const key = g.date || "today";
                return (
                  <div key={key} className="rounded-lg border border-white/10">
                    <button className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-left" onClick={() => setOpenGroup(openGroup === key ? null : key)}>
                      <span className="text-neutral-100">{g.date || t("assets.io.today", "Hari ini")}</span>
                      <span className="text-xs text-neutral-400">{t("assets.io.unitsTotal", "{n} unit").replace("{n}", String(g.units))} · {rupiah(g.total)} {openGroup === key ? "▴" : "▾"}</span>
                    </button>
                    {openGroup === key && (
                      <ul className="border-t border-white/5 px-3 py-2 space-y-1 text-xs text-neutral-300">
                        {g.items.map((i) => (
                          <li key={i.row} className="flex flex-wrap justify-between gap-2">
                            <span>{i.qty > 1 ? `${i.qty}× ` : ""}{i.name}{i.rentalUnitName ? ` → ${i.rentalUnitName}` : ""}</span>
                            <span className="text-neutral-500">{rupiah(i.unitCost)} · {i.usefulLifeMonths} {t("assets.io.monthsShort", "bln")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
