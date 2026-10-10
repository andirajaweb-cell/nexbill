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

const SAMPLE: Record<PreviewFeature, { heading: string; rows: [string, string, ("good" | "bad")?][]; footer: string }> = {
  accounting: {
    heading: "Neraca · 31 Okt 2026",
    rows: [["Kas laci", "Rp4.250.000"], ["Bank BCA", "Rp12.800.000"], ["Persediaan", "Rp1.950.000"], ["Aset tetap (nilai buku)", "Rp38.500.000"], ["Hutang supplier", "Rp2.100.000", "bad"], ["Modal pemilik", "Rp55.400.000"]],
    footer: "Aset = Liabilitas + Ekuitas  ✓ Seimbang",
  },
  assets: {
    heading: "Aset & penyusutan · Okt 2026",
    rows: [["PS5 Slim #1", "Rp6.666.000"], ["PS5 Slim #2", "Rp6.666.000"], ["TV 43\" #1", "Rp3.150.000"], ["Kursi gaming × 6", "Rp2.400.000"], ["Penyusutan bulan ini", "−Rp512.000", "bad"]],
    footer: "Nilai buku total Rp18.882.000",
  },
  ppob: {
    heading: "PPOB · Okt 2026",
    rows: [["Token PLN 50rb", "+Rp2.500", "good"], ["Pulsa 20rb", "+Rp2.000", "good"], ["Top-up DANA 100rb", "+Rp3.000", "good"], ["Saldo deposit provider", "Rp1.240.000"], ["Margin bulan ini", "Rp486.000", "good"]],
    footer: "212 transaksi · margin rata-rata Rp2.290",
  },
  anti_fraud: {
    heading: "Shift berisiko · minggu ini",
    rows: [["Shift pagi · Andi", "Aman", "good"], ["Shift sore · Budi", "Selisih −Rp35.000", "bad"], ["Shift malam · Cici", "Batal transaksi 4×", "bad"], ["Shift pagi · Dedi", "Aman", "good"]],
    footer: "2 shift perlu ditinjau",
  },
  multi_outlet: {
    heading: "Semua cabang · Okt 2026",
    rows: [["Cabang Majalaya", "Rp12.400.000"], ["Cabang Ciparay", "Rp9.800.000"], ["Cabang Banjaran", "Rp7.100.000"], ["Total semua cabang", "Rp29.300.000", "good"]],
    footer: "3 outlet · 1 tagihan",
  },
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
  const bullets = isPreviewFeature(feature)
    ? [t(`planPreview.${feature}.b1`, ""), t(`planPreview.${feature}.b2`, ""), t(`planPreview.${feature}.b3`, "")].filter(Boolean)
    : [];

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-amber-400/25 bg-[#0b1020] ${compact ? "min-h-[420px]" : "min-h-[70vh]"}`}>
      {sample && (
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 p-6 blur-[3px] opacity-60">
          <div className="max-w-3xl mx-auto rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="text-sm font-semibold text-neutral-200">{sample.heading}</div>
            {sample.rows.map(([k, v, tone]) => (
              <div key={k} className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-neutral-300">{k}</span>
                <span className={tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-red-300" : "text-neutral-100"}>{v}</span>
              </div>
            ))}
            <div className="text-xs text-cyan-300">{sample.footer}</div>
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
            <p className="text-sm text-neutral-300">{t(`planPreview.${feature}.lead`, "")}</p>
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
