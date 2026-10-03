"use client";
import { Check, Minus, Plus, Crown } from "lucide-react";
import { computePlanCharge, minUnitsOf, planTierOf, monthsChargedFor, type BillingCycle, type PlanCharge } from "@/lib/subscription/pricing";
import "@/lib/i18n/dict-plan";

export interface CatalogPlan {
  id: string;
  code: string;
  name: string;
  tier: string;
  pricingModel: string;
  priceCurrent: number;
  priceOriginal: number;
  minUnits: number;
  annualMonthsCharged: number;
  multiOutletDiscountPct: number;
}

export interface PlanSelection {
  planCode: string;
  cycle: BillingCycle;
  units: number;
}

type TFn = (key: string, fallback?: string) => string;

const STARTER_FEATS = ["plan.feat.billing", "plan.feat.pos", "plan.feat.tv", "plan.feat.qr", "plan.feat.unitsQuota", "plan.feat.aiAddon"];
const PRO_FEATS = ["plan.feat.unlimitedUnits", "plan.feat.accounting", "plan.feat.assets", "plan.feat.ppob", "plan.feat.antiFraud", "plan.feat.ai", "plan.feat.multiOutlet", "plan.feat.homeRental"];
const FEAT_FALLBACK: Record<string, string> = {
  "plan.feat.billing": "Billing & timer rental PS",
  "plan.feat.pos": "Kasir F&B, booking online, membership",
  "plan.feat.tv": "Kontrol TV / smart plug otomatis",
  "plan.feat.qr": "QR pelanggan per bilik",
  "plan.feat.unitsQuota": "Kuota sesuai unit yang dibayar",
  "plan.feat.aiAddon": "AI tersedia sebagai Add-on",
  "plan.feat.unlimitedUnits": "Unit PS tak terbatas",
  "plan.feat.accounting": "Akuntansi & laporan keuangan lengkap",
  "plan.feat.assets": "Manajemen aset & penyusutan",
  "plan.feat.ppob": "PPOB (pulsa, token, tagihan)",
  "plan.feat.antiFraud": "Kontrol anti-fraud shift",
  "plan.feat.ai": "AI Business Assistant termasuk",
  "plan.feat.multiOutlet": "Multi-cabang + diskon cabang",
  "plan.feat.homeRental": "Rental ke rumah",
};

/** Harga satu pilihan — dipakai halaman Langganan untuk total keranjang. */
export function chargeForSelection(plans: CatalogPlan[], sel: PlanSelection, opts: { activeUnits: number; additionalOutlet: boolean }): { plan: CatalogPlan | null; charge: PlanCharge | null } {
  const plan = plans.find((p) => p.code === sel.planCode) ?? null;
  if (!plan) return { plan: null, charge: null };
  const isPro = planTierOf(plan) === "pro";
  const units = Math.max(sel.units, opts.activeUnits, minUnitsOf(plan));
  return { plan, charge: computePlanCharge(plan, { units, cycle: sel.cycle, additionalOutlet: isPro && opts.additionalOutlet }) };
}

/**
 * Pemilih paket Starter/Pro + siklus bulanan/tahunan + kuota unit Starter (struktur harga
 * 2026-10, lihat lib/subscription/pricing.ts). Harga dihitung di klien dengan fungsi murni yang
 * sama dengan server, jadi angka di layar selalu sama dengan invoice yang dibuat.
 */
export function PlanPicker({
  plans,
  value,
  onChange,
  activeUnits,
  additionalOutlet,
  currentPlanCode,
  money,
  t,
}: {
  plans: CatalogPlan[];
  value: PlanSelection;
  onChange: (v: PlanSelection) => void;
  activeUnits: number;
  additionalOutlet: boolean;
  currentPlanCode?: string | null;
  money: (n: number) => string;
  t: TFn;
}) {
  const annualMonths = plans[0] ? monthsChargedFor(plans[0], "annual") : 10;
  const { plan: selected, charge } = chargeForSelection(plans, value, { activeUnits, additionalOutlet });

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
        {(["monthly", "annual"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ ...value, cycle: c })}
            className={`rounded-md px-3 py-1.5 font-medium transition ${value.cycle === c ? "bg-cyan-500/20 text-cyan-200" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            {c === "monthly" ? t("plan.cycle.monthly", "Bulanan") : t("plan.cycle.annual", "Tahunan")}
            {c === "annual" && <span className="ml-1 text-[10px] text-emerald-300">({t("plan.cycle.annualHint", "bayar {n} bulan, aktif 12 bulan").replace("{n}", String(annualMonths))})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plans.map((p) => {
          const tier = planTierOf(p);
          const isSel = value.planCode === p.code;
          const isPro = tier === "pro";
          const min = minUnitsOf(p);
          const units = Math.max(value.units, activeUnits, min);
          const c = computePlanCharge(p, { units, cycle: value.cycle, additionalOutlet: isPro && additionalOutlet });
          const feats = isPro ? PRO_FEATS : STARTER_FEATS;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => onChange({ ...value, planCode: p.code, units: isPro ? value.units : Math.max(value.units, activeUnits, min) })}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onChange({ ...value, planCode: p.code })}
              className={`relative cursor-pointer rounded-xl border p-4 transition ${
                isSel ? (isPro ? "border-amber-400/60 bg-amber-500/5" : "border-cyan-400/60 bg-cyan-500/5") : "border-white/10 hover:border-white/25"
              }`}
            >
              {isPro && (
                <span className="absolute -top-2 right-3 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">
                  <Crown size={10} /> {t("plan.recommended", "Paling lengkap")}
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-neutral-100">{p.name}</div>
                {currentPlanCode === p.code && <span className="text-[10px] rounded bg-white/10 px-1.5 py-0.5 text-neutral-300">{t("plan.current", "Paket saat ini")}</span>}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">{isPro ? t("plan.pro.tagline", "Unit tak terbatas + semua fitur bisnis & AI.") : t("plan.starter.tagline", "Operasional rental: billing, kasir, booking, kontrol TV, QR pelanggan.")}</div>
              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl font-bold text-cyan-300">{money(c.unitPrice)}</span>
                <span className="text-xs text-neutral-500">{isPro ? t("plan.perOutletMonth", "/outlet/bulan") : t("plan.perUnitMonth", "/unit/bulan")}</span>
                {!isPro && <span className="text-[11px] text-neutral-500">· {t("plan.minUnits", "minimal {n} unit").replace("{n}", String(min))}</span>}
                {c.discountPct > 0 && <span className="text-[11px] rounded bg-emerald-500/15 px-1.5 text-emerald-300">{t("plan.multiDiscount", "Diskon cabang {pct}%").replace("{pct}", String(c.discountPct))}</span>}
              </div>
              <ul className="mt-3 space-y-1">
                {feats.map((k) => (
                  <li key={k} className="flex items-start gap-1.5 text-xs text-neutral-300">
                    <Check size={12} className={`mt-0.5 shrink-0 ${isPro ? "text-amber-300" : "text-cyan-300"}`} /> {t(k, FEAT_FALLBACK[k])}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-neutral-500">{value.cycle === "annual" ? t("plan.totalAnnual", "Total per tahun") : t("plan.totalMonthly", "Total per bulan")}</span>
                <span className="font-semibold text-neutral-100">{money(c.amount)}</span>
              </div>
              {c.annualSavings > 0 && <div className="text-right text-[11px] text-emerald-300">{t("plan.save", "Hemat {amount}").replace("{amount}", money(c.annualSavings))}</div>}
              <div className={`mt-2 text-center text-xs font-medium ${isSel ? "text-emerald-300" : "text-neutral-500"}`}>{isSel ? `✓ ${t("plan.chosen", "Dipilih")}` : t("plan.choose", "Pilih")}</div>
            </div>
          );
        })}
      </div>

      {selected && planTierOf(selected) === "starter" && (
        <div className="rounded-lg border border-white/10 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium">{t("plan.units", "Kuota unit PS")}</div>
            <div className="text-xs text-neutral-500">
              {t("plan.unitsHint", "{active} unit aktif sekarang — kuota minimal {min}.")
                .replace("{active}", String(activeUnits))
                .replace("{min}", String(Math.max(activeUnits, minUnitsOf(selected))))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
              onClick={() => onChange({ ...value, units: Math.max(activeUnits, minUnitsOf(selected), (charge?.billedUnits ?? 0) - 1) })}
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center font-semibold">{charge?.billedUnits ?? 0}</span>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
              onClick={() => onChange({ ...value, units: (charge?.billedUnits ?? 0) + 1 })}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
