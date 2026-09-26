"use client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { coaAccountName } from "@/lib/accounting/coa-data";

/**
 * Laba Rugi bertingkat sesuai golongan Chart of Accounts (lihat classifyProfitLoss di
 * lib/accounting/reports.ts): Pendapatan usaha − HPP = Laba Kotor − Beban operasional = Laba Usaha
 * + Pendapatan lain − Beban lain = Laba Sebelum Pajak − PPh = Laba Bersih.
 */

interface Row { accountId: string; code: string; name: string; balance: number; depth?: number; isPostingAllowed?: boolean | null }
interface Section { total: number; tree: Row[] }
export interface ProfitLossData {
  netProfit: number;
  grossProfit: number;
  operatingProfit?: number;
  profitBeforeTax?: number;
  sections?: { operatingRevenue: Section; cogs: Section; operatingExpense: Section; otherIncome: Section; otherExpense: Section; incomeTax: Section };
}

export function ProfitLossSteps({ pl, rupiah, onRow }: { pl: ProfitLossData; rupiah: (n: number) => string; onRow: (r: Row) => void }) {
  const { t } = useDashboardLang();
  const s = pl.sections!;

  const block = (title: string, hint: string, section: Section, sign: "+" | "−", codes: string) => (
    <div className="mt-4">
      <div className="flex items-baseline justify-between border-b border-neutral-800 pb-1">
        <h2 className="text-sm font-medium text-neutral-300">
          <span className="mr-1 text-neutral-500">{sign}</span>
          {title} <span className="font-mono text-[10px] text-neutral-600">{codes}</span>
        </h2>
        <span className="text-sm font-medium">{rupiah(section.total)}</span>
      </div>
      <p className="text-[11px] text-neutral-600">{hint}</p>
      {section.tree.length === 0 && <div className="py-1 text-xs text-neutral-600">{t("accounting.pl.noActivity", "Tidak ada transaksi pada periode ini.")}</div>}
      {section.tree.map((r) => (
        <button
          key={r.accountId}
          type="button"
          onClick={() => onRow(r)}
          className={`w-full flex justify-between text-sm py-1 text-left rounded hover:bg-neutral-800/60 transition-colors ${!r.isPostingAllowed ? "font-semibold text-neutral-300" : ""}`}
          style={{ paddingLeft: 8 + (r.depth ?? 0) * 16 }}
        >
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-neutral-600">{r.code}</span>
            {coaAccountName(t, r)}
          </span>
          <span>{rupiah(r.balance)}</span>
        </button>
      ))}
    </div>
  );

  const subtotal = (label: string, value: number, strong = false) => (
    <div className={`mt-2 flex justify-between rounded-lg px-2 py-1.5 text-sm ${strong ? "bg-emerald-500/10 font-bold" : "bg-neutral-800/60 font-semibold"}`}>
      <span>= {label}</span>
      <span className={value < 0 ? "text-red-400" : strong ? "text-emerald-400" : ""}>{rupiah(value)}</span>
    </div>
  );

  return (
    <div>
      {block(t("accounting.pl.sec.operatingRevenue", "Pendapatan usaha"), t("accounting.pl.hint.operatingRevenue", "Rental, F&B, produk, PPOB, membership, home rental, dan pendapatan operasional lain — setelah diskon/retur (49xx)."), s.operatingRevenue, "+", "4xxx")}
      {block(t("accounting.pl.sec.cogs", "Harga pokok penjualan (HPP)"), t("accounting.pl.hint.cogs", "Modal barang yang terjual, termasuk selisih opname & barang rusak."), s.cogs, "−", "5xxx")}
      {subtotal(t("accounting.pl.grossProfit", "Laba Kotor"), pl.grossProfit)}
      {block(t("accounting.pl.sec.operatingExpense", "Beban operasional"), t("accounting.pl.hint.operatingExpense", "Gaji, sewa, listrik, internet, perawatan, pemasaran, administrasi, transport, asuransi, penyusutan."), s.operatingExpense, "−", "6xxx")}
      {subtotal(t("accounting.pl.operatingProfit", "Laba Usaha"), pl.operatingProfit ?? 0)}
      {block(t("accounting.pl.sec.otherIncome", "Pendapatan lain-lain"), t("accounting.pl.hint.otherIncome", "Di luar usaha inti: komisi vendor, sewa tempat, penjualan barang bekas, bunga bank, laba pelepasan aset."), s.otherIncome, "+", "47xx · 7xxx")}
      {block(t("accounting.pl.sec.otherExpense", "Beban lain-lain"), t("accounting.pl.hint.otherExpense", "Bunga pinjaman, rugi pelepasan aset, dan beban non-operasional lain."), s.otherExpense, "−", "8xxx")}
      {subtotal(t("accounting.pl.profitBeforeTax", "Laba Sebelum Pajak"), pl.profitBeforeTax ?? 0)}
      {block(t("accounting.pl.sec.incomeTax", "Beban pajak penghasilan"), t("accounting.pl.hint.incomeTax", "PPh Final UMKM / PPh badan yang dibebankan periode ini."), s.incomeTax, "−", "8500")}
      {subtotal(t("accounting.pl.netProfit", "Laba Bersih"), pl.netProfit, true)}
    </div>
  );
}
