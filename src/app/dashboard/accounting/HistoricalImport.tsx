"use client";
import { useEffect, useState } from "react";
import { Download, FileSearch, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingOverlay } from "@/components/ui/ProcessingOverlay";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";

/**
 * Accounting → Migrasi Data → Impor Data Historis. Aturan impornya ada di
 * lib/accounting/historical-import.ts; layar ini: pilih mode, unduh template (berisi COA outlet
 * sendiri), "Periksa dulu" (validasi tanpa menyimpan), lalu "Impor".
 */

type Category = "penjualan" | "pembelian" | "pendapatan_lain" | "pengeluaran";
type Mode = "kas" | "saldo_awal";

interface Summary {
  dryRun: boolean;
  mode: Mode;
  totalRows: number;
  posted: number;
  skipped: number;
  errors: number;
  totalAmount: number;
  byAccount: { account: string; amount: number; rows: number }[];
  details: { row: number; action: "posted" | "skipped" | "error" | "ok"; error?: string; date?: string; account?: string; amount?: number; counter?: string }[];
}

const CATEGORIES: { value: Category; title: string; desc: string; columns: string }[] = [
  {
    value: "penjualan",
    title: "Penjualan",
    desc: "Omzet lama per hari/per kategori (rental, F&B, produk, PPOB), lengkap dengan diskon dan HPP supaya Laba Kotor historis benar.",
    columns: "Tanggal* · Kategori Pendapatan / Kode Akun Pendapatan · Deskripsi · Penjualan Kotor* · Diskon · HPP · Kode Akun HPP · Metode Pembayaran* · Pelanggan · Referensi",
  },
  {
    value: "pembelian",
    title: "Pembelian",
    desc: "Belanja stok (masuk Persediaan) atau barang habis pakai (beban), tunai atau utang supplier.",
    columns: "Tanggal* · Jenis / Kode Akun Tujuan · Deskripsi · Nominal* · Metode Pembayaran* · Supplier · Referensi",
  },
  {
    value: "pendapatan_lain",
    title: "Pendapatan Lain-lain",
    desc: "Komisi, sewa tempat, penjualan barang bekas, sponsorship, denda, bunga bank, dan pendapatan non-inti lainnya.",
    columns: "Tanggal* · Kategori / Kode Akun Pendapatan · Deskripsi · Diterima Dari · Nominal* · Metode Pembayaran*",
  },
  {
    value: "pengeluaran",
    title: "Pengeluaran",
    desc: "Gaji, sewa, listrik, air, internet, servis, iklan, admin bank, pajak, dan beban lain — tunai atau utang.",
    columns: "Tanggal* · Kategori Beban / Kode Akun Beban · Deskripsi · Dibayar Kepada · Nominal* · Metode Pembayaran*",
  },
];

export function HistoricalImportSection() {
  const { t } = useDashboardLang();
  const [mode, setMode] = useState<Mode>("kas");
  const [openingDate, setOpeningDate] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetchJsonObject<{ entry?: { entryDate: string } } | null>("/api/accounting/opening-balance").then((r) => {
      const d = r?.entry?.entryDate ?? null;
      setOpeningDate(d);
      if (d) setMode("saldo_awal");
    });
  }, []);
  const openingLabel = openingDate ? new Date(openingDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-medium">{t("accounting.migration.importHeading", "Impor Data Historis (Excel)")}</h2>
        <p className="text-xs text-neutral-500">
          {t(
            "accounting.migration.importIntro",
            "Unduh template (sudah berisi Chart of Accounts outlet Anda), isi dari data lama, klik Periksa dulu, lalu Impor. Data masuk ke Jurnal, Laba Rugi, Neraca, dan Arus Kas dengan tanggal aslinya. Mengunggah file yang sama dua kali aman — baris yang sudah diimpor dilewati."
          )}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-neutral-300">{t("accounting.migration.modeLabel", "1. Pilih mode (penting — mencegah saldo kas terhitung dua kali)")}</div>
        <div className="grid gap-2 md:grid-cols-2">
          {([
            {
              value: "saldo_awal" as Mode,
              title: t("accounting.migration.modeHistoryTitle", "Hanya riwayat Laba Rugi"),
              text: t(
                "accounting.migration.modeHistoryText",
                "Untuk outlet yang memakai Saldo Awal. Pendapatan, HPP, dan biaya lama muncul di Laba Rugi; lawan akunnya 3400 Ekuitas Saldo Awal, jadi saldo kas/bank/utang tetap dari Saldo Awal. Hanya untuk tanggal SEBELUM Saldo Awal."
              ),
            },
            {
              value: "kas" as Mode,
              title: t("accounting.migration.modeCashTitle", "Kas/Bank (riwayat lengkap)"),
              text: t(
                "accounting.migration.modeCashText",
                "Untuk outlet yang TIDAK memakai Saldo Awal dan membangun pembukuan dari nol. Uang masuk/keluar ke akun Kas/Bank sesuai Metode Pembayaran (atau piutang/utang). Tanggal sebelum Saldo Awal ditolak."
              ),
            },
          ]).map((o) => (
            <label key={o.value} className={`cursor-pointer rounded-lg border p-3 text-xs space-y-1 ${mode === o.value ? "border-emerald-500/60 bg-emerald-500/5" : "border-neutral-700"}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <input type="radio" name="hist-mode" checked={mode === o.value} onChange={() => setMode(o.value)} />
                {o.title}
              </div>
              <p className="text-neutral-400">{o.text}</p>
            </label>
          ))}
        </div>
        <p className={`text-xs ${openingDate ? "text-sky-300" : "text-neutral-500"}`}>
          {openingDate === undefined
            ? ""
            : openingDate
              ? t("accounting.migration.openingFound", "Saldo Awal outlet ini tercatat per {date}. Data sebelum tanggal itu → mode Hanya riwayat Laba Rugi; sesudahnya → mode Kas/Bank.").replace("{date}", openingLabel!)
              : t("accounting.migration.openingNone", "Outlet ini belum punya Saldo Awal. Kalau Anda akan mengisinya, pakai mode Hanya riwayat Laba Rugi untuk data sebelum tanggal Saldo Awal.")}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-neutral-300">{t("accounting.migration.stepUpload", "2. Unduh template, isi, periksa, lalu impor")}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <ImportCard key={c.value} category={c} mode={mode} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function ImportCard({ category, mode }: { category: (typeof CATEGORIES)[number]; mode: Mode }) {
  const { t } = useDashboardLang();
  const { formatMoney: rupiah } = useCurrency();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<null | "check" | "import">(null);
  const [result, setResult] = useState<Summary | null>(null);
  const [showCols, setShowCols] = useState(false);

  const send = async (dryRun: boolean) => {
    if (!file) return showAlert(t("accounting.historicalImport.alertChooseFile", "Pilih file Excel (.xlsx) dulu."));
    if (!dryRun && !(await showConfirm(t("accounting.migration.confirmImport", "Impor {title} dengan mode \"{mode}\"? Setiap baris menjadi jurnal bertanggal asli.").replace("{title}", category.title).replace("{mode}", mode === "kas" ? "Kas/Bank" : "Hanya riwayat Laba Rugi")))) return;
    setBusy(dryRun ? "check" : "import");
    try {
      const fd = new FormData();
      fd.append("category", category.value);
      fd.append("mode", mode);
      fd.append("dryRun", dryRun ? "1" : "0");
      fd.append("file", file);
      const res = await fetch("/api/accounting/historical-import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(data.error ?? "Gagal memproses file.");
      setResult(data);
    } finally {
      setBusy(null);
    }
  };

  const errors = (result?.details ?? []).filter((d) => d.action === "error");
  const skipped = (result?.details ?? []).filter((d) => d.action === "skipped");
  const stale = result && result.mode !== mode;

  return (
    <div className="rounded-lg border border-neutral-800 p-3 space-y-2">
      {busy && (
        <ProcessingOverlay
          message={busy === "check" ? t("accounting.migration.checking", "Memeriksa file...") : t("accounting.migration.importing", "Mengimpor data historis...")}
          hint={t("accounting.migration.busyHint", "Jangan tutup atau muat ulang halaman ini.")}
        />
      )}
      <div>
        <h3 className="text-sm font-medium">{category.title}</h3>
        <p className="text-xs text-neutral-500">{category.desc}</p>
        <button className="text-[11px] text-sky-400 hover:underline" onClick={() => setShowCols((s) => !s)}>
          {showCols ? t("accounting.migration.hideColumns", "Sembunyikan kolom") : t("accounting.migration.showColumns", "Lihat kolom template")}
        </button>
        {showCols && <p className="text-[11px] text-neutral-400">{category.columns} <span className="text-neutral-500">(* wajib — rincian di sheet Petunjuk)</span></p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/api/accounting/historical-import/template?category=${category.value}`} className="inline-flex items-center gap-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 px-3 py-2 font-medium transition">
          <Download size={12} /> {t("accounting.historicalImport.downloadTemplate", "Download Template")}
        </a>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="text-xs text-neutral-400 max-w-[220px] file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-xs file:text-neutral-200 file:cursor-pointer"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="text-xs flex items-center gap-1" onClick={() => send(true)} disabled={!file || busy !== null}>
          <FileSearch size={12} /> {t("accounting.migration.checkButton", "Periksa dulu")}
        </Button>
        <Button className="text-xs flex items-center gap-1" onClick={() => send(false)} disabled={!file || busy !== null || !result?.dryRun || Boolean(stale) || result.posted === 0}>
          <Upload size={12} /> {t("accounting.migration.importButton", "Impor {n} baris").replace("{n}", String(result?.dryRun && !stale ? result.posted : 0))}
        </Button>
      </div>
      {!result && file && <p className="text-[11px] text-neutral-500">{t("accounting.migration.checkFirst", "Klik Periksa dulu — tombol Impor aktif setelah file diperiksa.")}</p>}
      {stale && <p className="text-[11px] text-amber-400">{t("accounting.migration.modeChanged", "Mode diganti setelah pemeriksaan — periksa ulang.")}</p>}

      {result && (
        <div className="space-y-2 text-xs">
          <div className={result.errors > 0 ? "text-amber-400" : "text-emerald-400"}>
            {(result.dryRun
              ? t("accounting.migration.checkSummary", "Hasil pemeriksaan: {ok} baris siap diimpor ({amount}), {skip} sudah pernah diimpor, {err} error. Perbaiki baris error di Excel lalu periksa ulang, atau impor yang sudah benar.")
              : t("accounting.migration.importSummary", "Selesai: {ok} baris diimpor ({amount}), {skip} dilewati (sudah ada), {err} error. Cek hasilnya di tab Laba Rugi / Neraca Saldo.")
            )
              .replace("{ok}", String(result.posted))
              .replace("{amount}", rupiah(result.totalAmount))
              .replace("{skip}", String(result.skipped))
              .replace("{err}", String(result.errors))}
          </div>
          {result.byAccount.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-0.5">{t("accounting.migration.colAccount", "Akun")}</th>
                  <th className="text-right">{t("accounting.migration.colRows", "Baris")}</th>
                  <th className="text-right">{t("accounting.migration.colAmount", "Jumlah")}</th>
                </tr>
              </thead>
              <tbody>
                {result.byAccount.map((a) => (
                  <tr key={a.account}>
                    <td className="py-0.5">{a.account}</td>
                    <td className="text-right">{a.rows}</td>
                    <td className="text-right">{rupiah(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {errors.length > 0 && (
            <ul className="max-h-40 overflow-y-auto space-y-0.5 text-red-400">
              {errors.map((e) => (
                <li key={e.row}>{t("accounting.historicalImport.errorRowPrefix", "Baris {row}:").replace("{row}", String(e.row))} {e.error}</li>
              ))}
            </ul>
          )}
          {skipped.length > 0 && (
            <p className="text-neutral-500">
              {t("accounting.migration.skippedRows", "Dilewati (sudah pernah diimpor): baris {rows}").replace("{rows}", skipped.slice(0, 30).map((s) => s.row).join(", ") + (skipped.length > 30 ? ", …" : ""))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

