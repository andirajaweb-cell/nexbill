"use client";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PeriodBar, resolvePeriodPreset, describePeriod, type PeriodPreset } from "@/components/reports/PeriodPicker";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";
import type { Calk, CalkGroup } from "@/lib/accounting/calk";

/**
 * Tab "CALK (SAK EMKM)" — Catatan atas Laporan Keuangan yang disusun otomatis (lib/accounting/calk.ts).
 * SAK EMKM mewajibkan tiga komponen laporan keuangan: Laporan Posisi Keuangan (tab Neraca), Laporan
 * Laba Rugi (tab Laba Rugi), dan CALK ini. Bisa dicetak / disimpan sebagai PDF dari browser.
 */
export function CalkTab() {
  const { t } = useDashboardLang();
  const { formatMoney: rupiah } = useCurrency();
  const [preset, setPreset] = useState<PeriodPreset>("this_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { from, to } = resolvePeriodPreset(preset, customFrom, customTo);
  const [calk, setCalk] = useState<Calk | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
    fetch(`/api/accounting/calk?${qs}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal memuat CALK.");
        setError(null);
        setCalk(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [from, to]);

  const groupTable = (groups: CalkGroup[], total: number, totalLabel: string) => (
    <table className="w-full text-sm">
      <tbody>
        {groups.map((g) => (
          <GroupRows key={`${g.code}-${g.name}`} group={g} rupiah={rupiah} />
        ))}
        <tr className="border-t-2 border-neutral-600 font-semibold">
          <td className="py-1.5">{totalLabel}</td>
          <td className="py-1.5 text-right">{rupiah(total)}</td>
        </tr>
      </tbody>
    </table>
  );

  let note = 0;
  const heading = (title: string) => {
    note++;
    return (
      <h3 className="font-semibold mt-5 mb-2">
        {note}. {title}
      </h3>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <PeriodBar preset={preset} setPreset={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        <Button variant="secondary" className="text-xs flex items-center gap-1.5" onClick={() => window.print()}>
          <Printer size={14} /> {t("accounting.calk.print", "Cetak / Simpan PDF")}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!calk ? (
        !error && <p className="text-sm text-neutral-500">{t("accounting.common.loading", "Memuat...")}</p>
      ) : (
        <Card className="print:border-0 print:bg-white print:text-black">
          <div className="text-center space-y-0.5">
            <div className="text-lg font-bold">{calk.entity.name}</div>
            <div className="font-semibold">{t("accounting.calk.title", "Catatan atas Laporan Keuangan")}</div>
            <div className="text-xs text-neutral-500">{describePeriod(preset, from, to)}</div>
          </div>

          {heading(t("accounting.calk.general", "Umum"))}
          <table className="text-sm">
            <tbody>
              <tr><td className="pr-4 text-neutral-500">{t("accounting.calk.entityName", "Nama entitas")}</td><td>{calk.entity.name}</td></tr>
              {calk.entity.address && <tr><td className="pr-4 text-neutral-500">{t("accounting.calk.address", "Alamat")}</td><td>{calk.entity.address}</td></tr>}
              {calk.entity.entityType && <tr><td className="pr-4 text-neutral-500">{t("accounting.calk.entityType", "Bentuk usaha")}</td><td>{calk.entity.entityType}</td></tr>}
              <tr><td className="pr-4 text-neutral-500">{t("accounting.calk.business", "Kegiatan usaha")}</td><td>{calk.entity.businessType ?? t("accounting.calk.businessDefault", "Penyewaan konsol permainan, penjualan makanan/minuman dan barang")}</td></tr>
              {calk.entity.npwp && <tr><td className="pr-4 text-neutral-500">NPWP</td><td>{calk.entity.npwp}</td></tr>}
            </tbody>
          </table>

          {heading(t("accounting.calk.compliance", "Pernyataan Kepatuhan"))}
          <p className="text-sm">{calk.compliance}</p>

          {heading(t("accounting.calk.basis", "Dasar Penyusunan"))}
          <ul className="list-disc pl-5 text-sm space-y-1">
            {calk.basis.map((b) => <li key={b}>{b}</li>)}
          </ul>

          {heading(t("accounting.calk.policies", "Ikhtisar Kebijakan Akuntansi"))}
          <div className="space-y-2 text-sm">
            {calk.policies.map((p) => (
              <div key={p.title}>
                <div className="font-medium">{p.title}</div>
                <div className="text-neutral-300 print:text-black">{p.text}</div>
              </div>
            ))}
          </div>

          {heading(t("accounting.calk.assets", "Aset"))}
          {groupTable(calk.balanceSheet.assets, calk.balanceSheet.totalAssets, t("accounting.calk.totalAssets", "Jumlah aset"))}

          {calk.fixedAssets.length > 0 && (
            <>
              {heading(t("accounting.calk.fixedAssets", "Rincian Aset Tetap"))}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-700">
                    <th className="py-1">{t("accounting.calk.fa.name", "Aset")}</th>
                    <th className="text-right">{t("accounting.calk.fa.cost", "Harga perolehan")}</th>
                    <th className="text-right">{t("accounting.calk.fa.accum", "Akumulasi penyusutan")}</th>
                    <th className="text-right">{t("accounting.calk.fa.book", "Nilai buku")}</th>
                    <th className="text-right">{t("accounting.calk.fa.life", "Umur (bln)")}</th>
                  </tr>
                </thead>
                <tbody>
                  {calk.fixedAssets.map((a) => (
                    <tr key={a.name + a.acquisitionDate} className="border-b border-neutral-800">
                      <td className="py-1">{a.name}</td>
                      <td className="text-right">{rupiah(a.cost)}</td>
                      <td className="text-right">{rupiah(a.accumulated)}</td>
                      <td className="text-right">{rupiah(a.bookValue)}</td>
                      <td className="text-right">{a.usefulLifeMonths}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {heading(t("accounting.calk.liabilities", "Liabilitas"))}
          {groupTable(calk.balanceSheet.liabilities, calk.balanceSheet.totalLiabilities, t("accounting.calk.totalLiabilities", "Jumlah liabilitas"))}

          {heading(t("accounting.calk.equity", "Ekuitas"))}
          {groupTable(calk.balanceSheet.equity, calk.balanceSheet.totalEquity, t("accounting.calk.totalEquity", "Jumlah ekuitas"))}

          {heading(t("accounting.calk.revenue", "Pendapatan"))}
          {groupTable(calk.profitLoss.revenue, calk.profitLoss.totalRevenue, t("accounting.calk.totalRevenue", "Jumlah pendapatan (neto)"))}

          {heading(t("accounting.calk.expense", "Beban"))}
          {groupTable(calk.profitLoss.expense, calk.profitLoss.totalExpense, t("accounting.calk.totalExpense", "Jumlah beban"))}
          <div className="mt-2 flex justify-between text-sm font-semibold">
            <span>{t("accounting.calk.netProfit", "Laba (rugi) bersih periode")}</span>
            <span className={calk.profitLoss.netProfit < 0 ? "text-rose-400" : ""}>{rupiah(calk.profitLoss.netProfit)}</span>
          </div>

          {heading(t("accounting.calk.tax", "Pajak Penghasilan"))}
          <p className="text-sm">
            {t(
              "accounting.calk.taxText",
              "Peredaran bruto tahun {year} sampai tanggal laporan {gross}. Estimasi PPh Final UMKM (0,5%) {estimate}; beban pajak penghasilan yang telah dicatat {posted}. Estimasi ini informatif — kewajiban sebenarnya mengikuti status dan fasilitas pajak entitas."
            )
              .replace("{year}", calk.incomeTax.year)
              .replace("{gross}", rupiah(calk.incomeTax.grossRevenue))
              .replace("{estimate}", rupiah(calk.incomeTax.pphFinalEstimate))
              .replace("{posted}", rupiah(calk.incomeTax.taxExpensePosted))}
          </p>
        </Card>
      )}
    </div>
  );
}

function GroupRows({ group, rupiah }: { group: CalkGroup; rupiah: (n: number) => string }) {
  return (
    <>
      <tr className="border-b border-neutral-800">
        <td className="pt-2 pb-1 font-medium">{group.name}</td>
        <td className="pt-2 pb-1 text-right font-medium">{rupiah(group.total)}</td>
      </tr>
      {group.lines.map((l) => (
        <tr key={l.code + l.name}>
          <td className="py-0.5 pl-4 text-neutral-400 print:text-black">
            {l.code !== "—" && <span className="font-mono text-xs mr-1.5">{l.code}</span>}
            {l.name}
          </td>
          <td className="py-0.5 text-right text-neutral-300 print:text-black">{rupiah(l.amount)}</td>
        </tr>
      ))}
    </>
  );
}
