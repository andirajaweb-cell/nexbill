"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList, Download, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-accounting-migration";

/**
 * SOP migrasi data dari aplikasi lain (Accounting › Migrasi Data): ekspor → template Excel → impor.
 * Menyatukan semua jalur impor yang sudah ada — Produk & stok (Inventori), Aset (menu Aset),
 * Saldo Awal (kartu di bawah), Data Historis (bagian di bawah) — dalam urutan yang mencegah saldo
 * terhitung dua kali. Isi teks dijaga sesuai perilaku nyata tiap importer.
 */
export function MigrationSop() {
  const { t, lang } = useDashboardLang();
  const [open, setOpen] = useState(true);

  const templates = [
    {
      key: "products",
      data: t("accounting.sop.row.products", "Produk & stok awal"),
      href: "/api/products/import/template",
      where: t("accounting.sop.row.productsWhere", "Inventori › Import Produk dari Excel"),
    },
    {
      key: "assets",
      data: t("accounting.sop.row.assets", "Aset tetap yang sudah dimiliki"),
      href: `/api/assets/import/template?lang=${lang}`,
      where: t("accounting.sop.row.assetsWhere", "Aset › Upload Daftar Aset — pilih \"Saldo awal\""),
    },
    {
      key: "balances",
      data: t("accounting.sop.row.balances", "Saldo per akun (kas, bank, piutang, utang, modal)"),
      href: `/api/accounting/opening-balance/template?lang=${lang}`,
      where: t("accounting.sop.row.balancesWhere", "Kartu Saldo Awal di bawah"),
    },
    {
      key: "history",
      data: t("accounting.sop.row.history", "Riwayat transaksi (opsional)"),
      href: null,
      where: t("accounting.sop.row.historyWhere", "Impor Data Historis di bawah (template per kategori)"),
    },
  ];

  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">{n}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="text-sm font-medium text-neutral-100">{title}</div>
        <div className="space-y-1.5 text-xs text-neutral-400">{children}</div>
      </div>
    </li>
  );

  return (
    <Card className="space-y-4 border border-emerald-500/30">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left" aria-expanded={open}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <ClipboardList size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">{t("accounting.sop.title", "SOP Migrasi Data dari Aplikasi Lain")}</h2>
          <p className="text-xs text-neutral-500">
            {t("accounting.sop.intro", "Ekspor → template Excel → impor. Kerjakan sekali, oleh Owner, sebelum outlet mulai bertransaksi di NEXBILL. Ikuti urutannya supaya tidak ada saldo yang terhitung dua kali.")}
          </p>
        </div>
        {open ? <ChevronUp size={18} className="mt-1 text-neutral-400" /> : <ChevronDown size={18} className="mt-1 text-neutral-400" />}
      </button>

      {open && (
        <ol className="space-y-4">
          <Step n={1} title={t("accounting.sop.s1.title", "Tentukan tanggal cutover")}>
            <p>{t("accounting.sop.s1.body", "Pilih hari pertama memakai NEXBILL (paling mudah tanggal 1). Sehari sebelumnya, tutup buku di aplikasi lama dan hentikan transaksi di sana.")}</p>
          </Step>

          <Step n={2} title={t("accounting.sop.s2.title", "Ekspor dari aplikasi lama")}>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>{t("accounting.sop.s2.i1", "Neraca atau Neraca Saldo per akhir hari sebelum cutover (wajib)")}</li>
              <li>{t("accounting.sop.s2.i2", "Daftar produk: stok dan harga modal per tanggal itu")}</li>
              <li>{t("accounting.sop.s2.i3", "Daftar aset tetap: tanggal beli, harga beli, umur pakai")}</li>
              <li>{t("accounting.sop.s2.i4", "Rincian piutang pelanggan dan utang supplier yang belum lunas")}</li>
              <li>{t("accounting.sop.s2.i5", "Opsional: rekap penjualan, pembelian, dan pengeluaran per bulan")}</li>
            </ul>
            <p>{t("accounting.sop.s2.tip", "Pilih ekspor ke Excel/CSV. Kalau aplikasi lama hanya bisa mencetak PDF, salin angkanya ke template secara manual.")}</p>
          </Step>

          <Step n={3} title={t("accounting.sop.s3.title", "Isi template Excel NEXBILL")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-left text-neutral-500">
                    <th className="py-1.5 pr-3 font-medium">{t("accounting.sop.col.data", "Data")}</th>
                    <th className="py-1.5 pr-3 font-medium">{t("accounting.sop.col.template", "Template")}</th>
                    <th className="py-1.5 font-medium">{t("accounting.sop.col.where", "Diimpor di")}</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((row) => (
                    <tr key={row.key} className="border-b border-neutral-900 align-top">
                      <td className="py-1.5 pr-3 text-neutral-200">{row.data}</td>
                      <td className="py-1.5 pr-3">
                        {row.href ? (
                          <a href={row.href} className="inline-flex items-center gap-1 text-emerald-300 hover:underline">
                            <Download size={12} /> {t("accounting.sop.download", "Unduh")}
                          </a>
                        ) : (
                          <span className="text-neutral-500">{t("accounting.sop.templateBelow", "di bagian bawah")}</span>
                        )}
                      </td>
                      <td className="py-1.5 text-neutral-400">{row.where}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-amber-200">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {t("accounting.sop.s3.rule", "Jangan isi akun Persediaan (116x) dan Aset Tetap (12xx) di Saldo Awal bila stok dan aset diimpor lewat Inventori/Aset — keduanya sudah mencatat saldo awalnya sendiri.")}
            </p>
          </Step>

          <Step n={4} title={t("accounting.sop.s4.title", "Impor sesuai urutan")}>
            <p>{t("accounting.sop.s4.body", "1) Produk & stok → 2) Aset → 3) Saldo Awal untuk akun sisanya (selisih otomatis ke 3400 Ekuitas Saldo Awal) → 4) Data historis dengan mode \"Hanya riwayat Laba Rugi\".")}</p>
            <p>{t("accounting.sop.s4.tip", "Salah impor Saldo Awal? Batalkan (void) lalu impor ulang. Baris Data Historis yang sama tidak tergandakan bila file diunggah dua kali.")}</p>
          </Step>

          <Step n={5} title={t("accounting.sop.s5.title", "Cocokkan")}>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>{t("accounting.sop.s5.i1", "Neraca per tanggal cutover sama dengan neraca lama, tanpa selisih")}</li>
              <li>{t("accounting.sop.s5.i2", "Stok sistem sama dengan hitungan fisik (Stok Opname)")}</li>
              <li>{t("accounting.sop.s5.i3", "Kas laci sama dengan uang fisik; saldo bank sama dengan rekening koran")}</li>
              <li>{t("accounting.sop.s5.i4", "Tab Audit tanpa temuan merah")}</li>
            </ul>
          </Step>

          <Step n={6} title={t("accounting.sop.s6.title", "Mulai dan kunci")}>
            <p>{t("accounting.sop.s6.body", "Mulai bertransaksi di NEXBILL dan simpan file ekspor lama sebagai arsip. Setelah semua impor beres, Tutup Periode bulan-bulan sebelum cutover supaya tidak berubah lagi.")}</p>
          </Step>
        </ol>
      )}
    </Card>
  );
}
