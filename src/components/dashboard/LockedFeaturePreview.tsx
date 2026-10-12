"use client";
import { useRouter } from "next/navigation";
import { Check, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useIsAndroidApp } from "@/lib/app-mode";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import type { PlanFeature } from "@/lib/subscription/pricing";
import "@/lib/i18n/dict-plan";
import "@/lib/i18n/dict-plan-preview";
import "@/lib/i18n/dict-app-mode";

/**
 * "Terlihat tapi terkunci": fitur Pro yang tidak termasuk paket outlet ditampilkan sebagai contoh
 * layar yang diburamkan, dengan penjelasan manfaat dan tombol upgrade di atasnya — bukan halaman
 * kosong. Angka di contoh adalah data contoh (diberi label), bukan data outlet: data asli hanya
 * dikirim server setelah fitur terbuka, sehingga tidak ada yang bocor lewat pratinjau ini.
 */

type PreviewFeature = "accounting" | "assets" | "ppob" | "anti_fraud" | "multi_outlet";

/**
 * Contoh data (diburamkan). Teks yang bisa diterjemahkan memakai key kamus literal (dict-plan-preview.ts);
 * nama produk/angka (PS5 Slim, Rp…) ditulis apa adanya. `vars` diisi ke {placeholder} di teks terjemahan.
 */
type SampleText = string | { k: string; fb: string; vars?: Record<string, string> };
const SAMPLE: Record<PreviewFeature, { heading: SampleText; rows: [SampleText, SampleText, ("good" | "bad")?][]; footer: SampleText }> = {
  accounting: {
    heading: { k: "planPreview.demo.accounting.heading", fb: "Neraca · 31 Okt 2026" },
    rows: [
      [{ k: "planPreview.demo.cashDrawer", fb: "Kas laci" }, "Rp4.250.000"],
      ["Bank BCA", "Rp12.800.000"],
      [{ k: "planPreview.demo.inventory", fb: "Persediaan" }, "Rp1.950.000"],
      [{ k: "planPreview.demo.fixedAssets", fb: "Aset tetap (nilai buku)" }, "Rp38.500.000"],
      [{ k: "planPreview.demo.supplierPayable", fb: "Hutang supplier" }, "Rp2.100.000", "bad"],
      [{ k: "planPreview.demo.ownerEquity", fb: "Modal pemilik" }, "Rp55.400.000"],
    ],
    footer: { k: "planPreview.demo.accounting.footer", fb: "Aset = Liabilitas + Ekuitas ✓ Seimbang" },
  },
  assets: {
    heading: { k: "planPreview.demo.assets.heading", fb: "Aset & penyusutan · Okt 2026" },
    rows: [
      ["PS5 Slim #1", "Rp6.666.000"],
      ["PS5 Slim #2", "Rp6.666.000"],
      ['TV 43" #1', "Rp3.150.000"],
      [{ k: "planPreview.demo.gamingChairs", fb: "Kursi gaming × 6" }, "Rp2.400.000"],
      [{ k: "planPreview.demo.depreciationMonth", fb: "Penyusutan bulan ini" }, "−Rp512.000", "bad"],
    ],
    footer: { k: "planPreview.demo.assets.footer", fb: "Nilai buku total Rp18.882.000" },
  },
  ppob: {
    heading: { k: "planPreview.demo.ppob.heading", fb: "PPOB · Okt 2026" },
    rows: [
      [{ k: "planPreview.demo.plnToken", fb: "Token PLN 50rb" }, "+Rp2.500", "good"],
      [{ k: "planPreview.demo.airtime", fb: "Pulsa 20rb" }, "+Rp2.000", "good"],
      [{ k: "planPreview.demo.danaTopup", fb: "Top-up DANA 100rb" }, "+Rp3.000", "good"],
      [{ k: "planPreview.demo.providerBalance", fb: "Saldo deposit provider" }, "Rp1.240.000"],
      [{ k: "planPreview.demo.marginMonth", fb: "Margin bulan ini" }, "Rp486.000", "good"],
    ],
    footer: { k: "planPreview.demo.ppob.footer", fb: "212 transaksi · margin rata-rata Rp2.290" },
  },
  anti_fraud: {
    heading: { k: "planPreview.demo.antiFraud.heading", fb: "Shift berisiko · minggu ini" },
    rows: [
      [{ k: "planPreview.demo.shiftMorning", fb: "Shift pagi · {name}", vars: { name: "Andi" } }, { k: "planPreview.demo.safe", fb: "Aman" }, "good"],
      [{ k: "planPreview.demo.shiftAfternoon", fb: "Shift sore · {name}", vars: { name: "Budi" } }, { k: "planPreview.demo.shortage", fb: "Selisih {amount}", vars: { amount: "−Rp35.000" } }, "bad"],
      [{ k: "planPreview.demo.shiftNight", fb: "Shift malam · {name}", vars: { name: "Cici" } }, { k: "planPreview.demo.voids", fb: "Batal transaksi {n}×", vars: { n: "4" } }, "bad"],
      [{ k: "planPreview.demo.shiftMorning", fb: "Shift pagi · {name}", vars: { name: "Dedi" } }, { k: "planPreview.demo.safe", fb: "Aman" }, "good"],
    ],
    footer: { k: "planPreview.demo.antiFraud.footer", fb: "2 shift perlu ditinjau" },
  },
  multi_outlet: {
    heading: { k: "planPreview.demo.multiOutlet.heading", fb: "Semua cabang · Okt 2026" },
    rows: [
      [{ k: "planPreview.demo.branch", fb: "Cabang {name}", vars: { name: "Majalaya" } }, "Rp12.400.000"],
      [{ k: "planPreview.demo.branch", fb: "Cabang {name}", vars: { name: "Ciparay" } }, "Rp9.800.000"],
      [{ k: "planPreview.demo.branch", fb: "Cabang {name}", vars: { name: "Banjaran" } }, "Rp7.100.000"],
      [{ k: "planPreview.demo.allBranchesTotal", fb: "Total semua cabang" }, "Rp29.300.000", "good"],
    ],
    footer: { k: "planPreview.demo.multiOutlet.footer", fb: "3 outlet · 1 tagihan" },
  },
};

/** Key penjelasan manfaat per fitur — literal supaya bisa diaudit (bukan t(`planPreview.${feature}…`)). */
const PREVIEW_TEXT: Record<PreviewFeature, { lead: string; bullets: [string, string, string] }> = {
  accounting: { lead: "planPreview.accounting.lead", bullets: ["planPreview.accounting.b1", "planPreview.accounting.b2", "planPreview.accounting.b3"] },
  assets: { lead: "planPreview.assets.lead", bullets: ["planPreview.assets.b1", "planPreview.assets.b2", "planPreview.assets.b3"] },
  ppob: { lead: "planPreview.ppob.lead", bullets: ["planPreview.ppob.b1", "planPreview.ppob.b2", "planPreview.ppob.b3"] },
  anti_fraud: { lead: "planPreview.anti_fraud.lead", bullets: ["planPreview.anti_fraud.b1", "planPreview.anti_fraud.b2", "planPreview.anti_fraud.b3"] },
  multi_outlet: { lead: "planPreview.multi_outlet.lead", bullets: ["planPreview.multi_outlet.b1", "planPreview.multi_outlet.b2", "planPreview.multi_outlet.b3"] },
};

const LABEL_KEY: Record<PlanFeature, string> = {
  expenses: "plan.feature.expenses",
  profit_report: "plan.feature.profit_report",
  home_rental: "plan.feature.home_rental",
  accounting: "plan.feature.accounting",
  assets: "plan.feature.assets",
  ppob: "plan.feature.ppob",
  anti_fraud: "plan.feature.anti_fraud",
  multi_outlet: "plan.feature.multi_outlet",
};

function isPreviewFeature(f: PlanFeature): f is PreviewFeature {
  return f === "accounting" || f === "assets" || f === "ppob" || f === "anti_fraud" || f === "multi_outlet";
}

export function LockedFeaturePreview({ feature, note, compact = false }: { feature: PlanFeature; note?: string; compact?: boolean }) {
  const { t } = useDashboardLang();
  const router = useRouter();
  const isAndroidApp = useIsAndroidApp();
  const label = t(LABEL_KEY[feature], feature);
  const sample = isPreviewFeature(feature) ? SAMPLE[feature] : null;
  const bullets = isPreviewFeature(feature) ? PREVIEW_TEXT[feature].bullets.map((k) => t(k, "")).filter(Boolean) : [];
  const txt = (x: SampleText) => {
    if (typeof x === "string") return x;
    let out = t(x.k, x.fb);
    for (const [name, value] of Object.entries(x.vars ?? {})) out = out.replace(`{${name}}`, value);
    return out;
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-amber-400/25 bg-[#0b1020] ${compact ? "min-h-[420px]" : "min-h-[70vh]"}`}>
      {sample && (
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 p-6 blur-[3px] opacity-60">
          <div className="max-w-3xl mx-auto rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="text-sm font-semibold text-neutral-200">{txt(sample.heading)}</div>
            {sample.rows.map(([k, v, tone], i) => (
              <div key={i} className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-neutral-300">{txt(k)}</span>
                <span className={tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-red-300" : "text-neutral-100"}>{txt(v)}</span>
              </div>
            ))}
            <div className="text-xs text-cyan-300">{txt(sample.footer)}</div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1020]/30 via-[#0b1020]/60 to-[#0b1020]/90" />

      <div className="relative flex items-center justify-center px-4 py-10 min-h-[inherit]">
        <div className="max-w-md w-full rounded-2xl border border-amber-400/30 bg-[#0f1426]/90 backdrop-blur-md p-7 space-y-4 shadow-[0_0_40px_-10px_rgba(251,191,36,0.35)]">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
              <Crown size={12} /> {t("planPreview.badge", "Fitur Pro")}
            </span>
            {sample && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <Lock size={11} /> {t("planPreview.sample", "Contoh tampilan")}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-amber-100 gm-display">{label}</h2>
          {note ? (
            <p className="text-sm text-neutral-300">{note}</p>
          ) : isPreviewFeature(feature) ? (
            <p className="text-sm text-neutral-300">{t(PREVIEW_TEXT[feature].lead, "")}</p>
          ) : null}
          {bullets.length > 0 && (
            <ul className="space-y-1.5 text-sm text-neutral-300">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {isAndroidApp ? (
            <p className="text-xs text-neutral-400">{t("appMode.proFeatureNote", "{feature} termasuk paket NEXBILL Pro.").replace("{feature}", label)}</p>
          ) : (
            <Button className="w-full" onClick={() => router.push("/dashboard/billing")}>
              {t("planGate.upgrade", "Lihat Paket & Upgrade")}
            </Button>
          )}
          <p className="text-[11px] text-neutral-500">{t("planGate.dataSafe", "Data penjualan tetap tercatat — semuanya langsung terbuka begitu upgrade.")}</p>
        </div>
      </div>
    </div>
  );
}
