"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { ppobAmounts, marginFromPrice } from "@/lib/ppob/amounts";
import "@/lib/i18n/dict-ppob";

const rupiah = (n: number) => `${n < 0 ? "-" : ""}Rp${Math.abs(Math.round(n ?? 0)).toLocaleString("id-ID")}`;

/**
 * Bagian angka di form PPOB, disusun mengikuti alur uangnya supaya kasir tidak perlu tahu istilah
 * akuntansi: (1) nominal produk → (2) UANG KELUAR ke provider = modal + biaya admin provider →
 * (3) UANG MASUK dari customer = uang keluar + margin. Harga ke customer dan margin saling terisi:
 * kasir boleh mengisi salah satu. Angkanya sama persis dengan yang dibukukan (lib/ppob/amounts.ts).
 */
export function PpobMoneyFlow(props: {
  category: string;
  nominal: string; setNominal: (v: string) => void;
  modal: string; setModal: (v: string) => void;
  providerFee: string; setProviderFee: (v: string) => void;
  margin: string; setMargin: (v: string) => void;
  funding: string; setFunding: (v: string) => void;
  receiving: string; setReceiving: (v: string) => void;
  accounts: any[];
  /** Modal edit lebih sempit — kolom ditumpuk. */
  stacked?: boolean;
}) {
  const { t } = useDashboardLang();
  const { category, nominal, setNominal, modal, setModal, providerFee, setProviderFee, margin, setMargin, funding, setFunding, receiving, setReceiving, accounts, stacked } = props;
  const isCashOut = category === "tarik_tunai";
  const a = ppobAmounts({ nominal: Number(nominal || 0), modal: modal === "" ? null : Number(modal), providerFee: Number(providerFee || 0), margin: Number(margin || 0) });
  // Harga ke customer sedang diketik → tampilkan apa adanya; selain itu selalu = uang keluar + margin.
  const [priceDraft, setPriceDraft] = useState<string | null>(null);
  const priceValue = priceDraft ?? (Number(nominal || 0) > 0 || a.uangMasuk > 0 ? String(a.uangMasuk) : "");
  const onPrice = (v: string) => {
    setPriceDraft(v);
    if (v === "") return setMargin("");
    setMargin(String(marginFromPrice(Number(v), a.modal, a.providerFee)));
  };
  const accountName = (id: string) => accounts.find((x) => x.id === id)?.name ?? "—";
  const opts = accounts.map((x) => ({ value: x.id, label: x.name }));

  const input = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm";
  const label = "block text-[11px] font-medium text-neutral-300 mb-0.5";
  const hint = "text-[10px] text-neutral-500 mt-0.5";

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${stacked ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
        {/* 1. Produk */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
          <div className="text-xs font-semibold text-neutral-200">{t("ppob.flow.step1", "1. Nominal produk")}</div>
          <div>
            <label className={label}>{isCashOut ? t("ppob.flow.nominalCashOut", "Jumlah tarik tunai") : t("ppob.flow.nominal", "Nominal")}</label>
            <input type="number" inputMode="numeric" className={input} placeholder="50000" value={nominal} onChange={(e) => setNominal(e.target.value)} />
            <p className={hint}>{isCashOut ? t("ppob.flow.nominalCashOutHint", "Uang tunai yang diminta customer.") : t("ppob.flow.nominalHint", "Yang diterima customer, mis. saldo DANA Rp50.000 atau token Rp100.000.")}</p>
          </div>
        </div>

        {/* 2. Uang keluar */}
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <ArrowUpRight size={14} /> {isCashOut ? t("ppob.flow.step2CashOut", "2. Uang keluar (tunai ke customer)") : t("ppob.flow.step2", "2. Uang keluar (bayar ke provider)")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>{isCashOut ? t("ppob.flow.modalCashOut", "Tunai diberikan") : t("ppob.flow.modal", "Harga modal")}</label>
              <input type="number" inputMode="numeric" className={input} placeholder={nominal || "0"} value={modal} onChange={(e) => { setModal(e.target.value); setPriceDraft(null); }} />
              <p className={hint}>{t("ppob.flow.modalHint", "Kosong = sama dengan nominal.")}</p>
            </div>
            <div>
              <label className={label}>{t("ppob.flow.providerFee", "Biaya admin provider")}</label>
              <input type="number" inputMode="numeric" className={input} placeholder="0" value={providerFee} onChange={(e) => { setProviderFee(e.target.value); setPriceDraft(null); }} />
              <p className={hint}>{t("ppob.flow.providerFeeHint", "Potongan dari provider, bila ada.")}</p>
            </div>
          </div>
          <div>
            <label className={label}>{t("ppob.flow.fromAccount", "Diambil dari")}</label>
            <SearchableSelect className="text-xs" value={funding} onChange={setFunding} placeholder={t("ppob.flow.chooseAccount", "Pilih akun")} options={opts} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs">
            <span className="text-amber-200">{t("ppob.flow.totalOut", "Total uang keluar")}</span>
            <span className="font-semibold text-amber-300">{rupiah(a.uangKeluar)}</span>
          </div>
        </div>

        {/* 3. Uang masuk */}
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <ArrowDownLeft size={14} /> {isCashOut ? t("ppob.flow.step3CashOut", "3. Uang masuk (transfer dari customer)") : t("ppob.flow.step3", "3. Uang masuk (dibayar customer)")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>{t("ppob.flow.price", "Harga ke customer")}</label>
              <input type="number" inputMode="numeric" className={input} placeholder="0" value={priceValue} onChange={(e) => onPrice(e.target.value)} onBlur={() => setPriceDraft(null)} />
              <p className={hint}>{t("ppob.flow.priceHint", "Yang dibayar customer.")}</p>
            </div>
            <div>
              <label className={label}>{t("ppob.flow.margin", "Margin (untung)")}</label>
              <input type="number" inputMode="numeric" className={input} placeholder="0" value={margin} onChange={(e) => { setMargin(e.target.value); setPriceDraft(null); }} />
              <p className={hint}>{t("ppob.flow.marginHint", "Isi harga ATAU margin — yang lain terhitung otomatis.")}</p>
            </div>
          </div>
          <div>
            <label className={label}>{t("ppob.flow.toAccount", "Masuk ke")}</label>
            <SearchableSelect className="text-xs" value={receiving} onChange={setReceiving} placeholder={t("ppob.flow.chooseAccount", "Pilih akun")} options={opts} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-2 py-1.5 text-xs">
            <span className="text-emerald-200">{t("ppob.flow.totalIn", "Total uang masuk")}</span>
            <span className="font-semibold text-emerald-300">{rupiah(a.uangMasuk)}</span>
          </div>
        </div>
      </div>

      {/* Ringkasan satu baris: apa yang berubah di kas/saldo, dan untungnya */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-3 py-2 text-xs ${a.margin < 0 ? "border-red-700/60 bg-red-950/30" : "border-neutral-800 bg-neutral-900"}`}>
        <span className="text-neutral-400">{t("ppob.flow.summary", "Ringkasan:")}</span>
        <span className="text-amber-300">{accountName(funding)} −{rupiah(a.uangKeluar)}</span>
        <span className="text-emerald-300">{accountName(receiving)} +{rupiah(a.uangMasuk)}</span>
        <span className={`ml-auto flex items-center gap-1 font-semibold ${a.margin < 0 ? "text-red-400" : a.margin === 0 ? "text-neutral-400" : "text-emerald-400"}`}>
          <TrendingUp size={13} />
          {a.margin < 0 ? t("ppob.flow.loss", "Rugi") : t("ppob.flow.profit", "Untung")} {rupiah(Math.abs(a.margin))}
        </span>
        {a.margin < 0 && <span className="w-full text-red-300">{t("ppob.flow.lossWarning", "Harga ke customer lebih kecil dari uang keluar — transaksi ini rugi. Periksa harga atau margin.")}</span>}
        {a.margin === 0 && a.uangKeluar > 0 && <span className="w-full text-neutral-500">{t("ppob.flow.zeroMarginHint", "Margin Rp0 — transaksi ini tidak menghasilkan untung.")}</span>}
      </div>
    </div>
  );
}
