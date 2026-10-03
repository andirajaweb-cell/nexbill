/**
 * Struktur harga & batasan paket NEXBILL (2026-10-03) — modul murni (tanpa DB), diuji di
 * pricing.test.ts. Satu-satunya tempat aturan harga dihitung, dipakai oleh checkout, perpanjangan,
 * tagihan gabungan multi-cabang, upgrade prorata, halaman Langganan, dan landing page.
 *
 *  - Starter : per unit PS aktif per bulan (minimal MIN_UNITS unit), fitur operasional saja.
 *  - Pro     : flat per outlet per bulan, unit tak terbatas + seluruh fitur (akuntansi, aset,
 *              PPOB, anti-fraud, AI, multi-cabang, rental ke rumah).
 *  - Multi-cabang : outlet Pro ke-2 dst dalam satu grup penagihan dapat diskon.
 *  - Tahunan : bayar 10 bulan, aktif 12 bulan.
 *  - Trial 30 hari = akses penuh setara Pro. Status free_forever TIDAK diatur di sini (perilakunya
 *    tetap seperti sebelumnya — lihat resolveEntitlements).
 */

export type PlanTier = "starter" | "pro";
export type PricingModel = "per_unit" | "flat";
export type BillingCycle = "monthly" | "annual";

/** Fitur yang dikunci untuk Starter. AI diatur terpisah (assertAiAllowed) karena punya Add-on. */
export type PlanFeature = "accounting" | "assets" | "ppob" | "anti_fraud" | "multi_outlet" | "home_rental";

export const ALL_PLAN_FEATURES: PlanFeature[] = ["accounting", "assets", "ppob", "anti_fraud", "multi_outlet", "home_rental"];

export const TIER_FEATURES: Record<PlanTier, PlanFeature[]> = {
  starter: [],
  pro: ALL_PLAN_FEATURES,
};

/** Paket mana yang menyertakan AI Business Assistant tanpa Add-on. */
export const TIER_INCLUDES_AI: Record<PlanTier, boolean> = { starter: false, pro: true };

/** Harga bawaan (IDR). Bisa diubah dari Platform Admin > Paket; ini nilai seed awal. */
export const DEFAULT_PRICING = {
  starterPerUnit: 6000,
  starterMinUnits: 5,
  proFlat: 199000,
  multiOutletDiscountPct: 20,
  annualMonthsCharged: 10,
  aiAddonMonthly: 149000,
} as const;

export const ANNUAL_MONTHS_GRANTED = 12;

export interface PlanPricingInput {
  code?: string | null;
  tier?: string | null;
  pricingModel?: string | null;
  priceCurrent: number;
  minUnits?: number | null;
  annualMonthsCharged?: number | null;
  multiOutletDiscountPct?: number | null;
}

export function planTierOf(plan: { tier?: string | null; code?: string | null } | null | undefined): PlanTier {
  if (plan?.tier === "starter" || plan?.code === "starter") return "starter";
  return "pro";
}

export function pricingModelOf(plan: PlanPricingInput): PricingModel {
  if (plan.pricingModel === "per_unit" || plan.pricingModel === "flat") return plan.pricingModel;
  return planTierOf(plan) === "starter" ? "per_unit" : "flat";
}

export function minUnitsOf(plan: PlanPricingInput): number {
  if (pricingModelOf(plan) !== "per_unit") return 1;
  const n = Math.floor(Number(plan.minUnits ?? DEFAULT_PRICING.starterMinUnits));
  return n > 0 ? n : DEFAULT_PRICING.starterMinUnits;
}

export function normalizeCycle(v: unknown): BillingCycle {
  return v === "annual" ? "annual" : "monthly";
}

/** Jumlah bulan yang ditagih untuk satu siklus (bulanan 1, tahunan default 10). */
export function monthsChargedFor(plan: PlanPricingInput, cycle: BillingCycle): number {
  if (cycle !== "annual") return 1;
  const n = Math.floor(Number(plan.annualMonthsCharged ?? DEFAULT_PRICING.annualMonthsCharged));
  return n >= 1 && n <= ANNUAL_MONTHS_GRANTED ? n : DEFAULT_PRICING.annualMonthsCharged;
}

export function monthsGrantedFor(cycle: BillingCycle): number {
  return cycle === "annual" ? ANNUAL_MONTHS_GRANTED : 1;
}

export interface PlanCharge {
  tier: PlanTier;
  pricingModel: PricingModel;
  cycle: BillingCycle;
  /** Unit yang ditagih (Starter: max(minimal, unit diminta); Pro: 1 = per outlet). */
  billedUnits: number;
  /** Harga satuan per bulan sebelum diskon (per unit untuk Starter, per outlet untuk Pro). */
  unitPrice: number;
  discountPct: number;
  /** Total per bulan setelah diskon multi-cabang. */
  monthly: number;
  monthsCharged: number;
  monthsGranted: number;
  /** Yang benar-benar ditagih untuk satu siklus. */
  amount: number;
  /** Hemat dibanding bayar bulanan selama monthsGranted bulan. */
  annualSavings: number;
}

/**
 * Menghitung tagihan satu siklus. `additionalOutlet` = outlet ini bukan outlet Pro pertama di grup
 * penagihannya → diskon multi-cabang (hanya untuk paket flat/Pro).
 */
export function computePlanCharge(plan: PlanPricingInput, opts: { units?: number; cycle?: BillingCycle; additionalOutlet?: boolean } = {}): PlanCharge {
  const tier = planTierOf(plan);
  const model = pricingModelOf(plan);
  const cycle = normalizeCycle(opts.cycle);
  const unitPrice = Math.max(0, Number(plan.priceCurrent) || 0);
  const billedUnits = model === "per_unit" ? Math.max(minUnitsOf(plan), Math.floor(Number(opts.units) || 0)) : 1;
  const rawPct = Number(plan.multiOutletDiscountPct ?? DEFAULT_PRICING.multiOutletDiscountPct);
  const discountPct = model === "flat" && opts.additionalOutlet ? Math.min(90, Math.max(0, Number.isFinite(rawPct) ? rawPct : 0)) : 0;
  const monthly = Math.round(unitPrice * billedUnits * (1 - discountPct / 100));
  const monthsCharged = monthsChargedFor(plan, cycle);
  const monthsGranted = monthsGrantedFor(cycle);
  const amount = monthly * monthsCharged;
  return {
    tier,
    pricingModel: model,
    cycle,
    billedUnits,
    unitPrice,
    discountPct,
    monthly,
    monthsCharged,
    monthsGranted,
    amount,
    annualSavings: cycle === "annual" ? monthly * monthsGranted - amount : 0,
  };
}

/** Deskripsi baris tagihan yang konsisten, mis. "NEXBILL Starter · 8 unit × Rp6.000 · Tahunan (bayar 10 bln, aktif 12 bln)". */
export function describeCharge(planName: string, c: PlanCharge): string {
  const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
  const parts = [planName];
  parts.push(c.pricingModel === "per_unit" ? `${c.billedUnits} unit × ${rp(c.unitPrice)}/bln` : `${rp(c.unitPrice)}/outlet/bln`);
  if (c.discountPct > 0) parts.push(`diskon cabang ${c.discountPct}%`);
  parts.push(c.cycle === "annual" ? `Tahunan (bayar ${c.monthsCharged} bln, aktif ${c.monthsGranted} bln)` : "Bulanan");
  return parts.join(" · ");
}

/**
 * Selisih prorata saat naik paket / tambah kuota unit di tengah periode berjalan:
 * (nilai siklus baru − nilai siklus lama) × sisa waktu / panjang periode, dibulatkan ke Rp100 ke
 * atas. 0 kalau turun/tetap (penurunan berlaku di perpanjangan berikutnya, tanpa refund).
 */
export function prorateUpgrade(params: { oldCycleAmount: number; newCycleAmount: number; periodStart: string | null; periodEnd: string | null; now?: Date }): number {
  const diff = params.newCycleAmount - params.oldCycleAmount;
  if (!(diff > 0)) return 0;
  const now = (params.now ?? new Date()).getTime();
  const end = params.periodEnd ? new Date(params.periodEnd).getTime() : NaN;
  if (!Number.isFinite(end) || end <= now) return 0;
  let start = params.periodStart ? new Date(params.periodStart).getTime() : NaN;
  if (!Number.isFinite(start) || start >= end) start = end - 30 * 86_400_000;
  const fraction = Math.min(1, (end - now) / (end - start));
  return Math.ceil((diff * fraction) / 100) * 100;
}

export interface EntitlementInput {
  status: string;
  /** Tier paket langganan ini (null = belum memilih paket). */
  tier: PlanTier | null;
  /** Kuota unit yang dibayar (Starter). */
  planUnits?: number | null;
  minUnits?: number | null;
}

export interface Entitlements {
  /** "trial" & "free_forever" = akses penuh; selain itu sesuai paket. */
  source: "trial" | "free_forever" | "plan";
  tier: PlanTier;
  features: PlanFeature[];
  /** Batas unit PS aktif; null = tidak dibatasi. */
  unitLimit: number | null;
}

/**
 * Aturan buka/kunci fitur per status + paket.
 *  - trial         : semua fitur (rasakan Pro selama 30 hari). Batas perangkat trial tetap diatur
 *                    assertDeviceAllowed seperti sebelumnya.
 *  - free_forever  : TIDAK DIUBAH — tetap akses penuh seperti sebelum struktur harga baru (AI tetap
 *                    lewat aturan assertAiAllowed yang lama).
 *  - lainnya       : sesuai tier paket. Tanpa paket (data lama) dianggap Pro agar pelanggan lama
 *                    tidak tiba-tiba terkunci.
 */
export function resolveEntitlements(input: EntitlementInput): Entitlements {
  if (input.status === "trial") return { source: "trial", tier: "pro", features: [...ALL_PLAN_FEATURES], unitLimit: null };
  if (input.status === "free_forever") return { source: "free_forever", tier: "pro", features: [...ALL_PLAN_FEATURES], unitLimit: null };
  const tier = input.tier ?? "pro";
  if (tier === "starter") {
    const min = Math.max(1, Math.floor(Number(input.minUnits ?? DEFAULT_PRICING.starterMinUnits)) || DEFAULT_PRICING.starterMinUnits);
    const paid = Math.floor(Number(input.planUnits ?? 0)) || 0;
    return { source: "plan", tier, features: [...TIER_FEATURES.starter], unitLimit: Math.max(min, paid) };
  }
  return { source: "plan", tier, features: [...TIER_FEATURES.pro], unitLimit: null };
}

export function hasFeature(e: Entitlements, f: PlanFeature): boolean {
  return e.features.includes(f);
}

/**
 * Pemetaan request API → fitur paket yang wajib dimiliki. Dipakai middleware untuk menandai
 * request (header) lalu diperiksa di getSession(). null = tidak dikunci.
 * Beberapa GET sengaja dibiarkan terbuka karena dipakai halaman operasional Starter
 * (mis. daftar akun COA di Pengaturan, daftar akun biaya di halaman Maintenance).
 */
export function featureForApiRequest(pathname: string, method: string): PlanFeature | null {
  const m = method.toUpperCase();
  const p = pathname.replace(/\/+$/, "");
  const under = (prefix: string) => p === prefix || p.startsWith(`${prefix}/`);

  if (under("/api/accounting")) {
    if (p === "/api/accounting/coa" && m === "GET") return null;
    return "accounting";
  }
  if (under("/api/account-mappings") || under("/api/other-income") || under("/api/cost-centers")) return "accounting";
  if (under("/api/expenses")) {
    if (p === "/api/expenses" && m === "GET") return null;
    return "accounting";
  }
  if (under("/api/assets") || under("/api/asset-purchases")) return "assets";
  if (under("/api/ppob")) {
    if (p.startsWith("/api/ppob/webhook") || p.startsWith("/api/ppob/callback")) return null;
    return "ppob";
  }
  if (under("/api/home-rental")) return "home_rental";
  if (p === "/api/outlets" && m === "POST") return "multi_outlet";
  return null;
}

/** Fitur yang dibutuhkan halaman dashboard (untuk kunci di UI + gembok di sidebar). */
export function featureForDashboardPath(pathname: string): PlanFeature | null {
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (under("/dashboard/accounting") || under("/dashboard/expenses") || under("/dashboard/other-income")) return "accounting";
  if (under("/dashboard/assets")) return "assets";
  if (under("/dashboard/ppob")) return "ppob";
  if (under("/dashboard/home-rental")) return "home_rental";
  if (under("/dashboard/semua-outlet")) return "multi_outlet";
  return null;
}

export const FEATURE_LABEL_ID: Record<PlanFeature, string> = {
  accounting: "Akuntansi & Keuangan",
  assets: "Manajemen Aset",
  ppob: "PPOB (pulsa, token, tagihan)",
  anti_fraud: "Kontrol Anti-Fraud Shift",
  multi_outlet: "Multi-Cabang",
  home_rental: "Rental ke Rumah",
};

/** Header internal yang dipasang middleware. Selalu ditimpa/dihapus di middleware agar tidak bisa dipalsukan klien. */
export const PLAN_FEATURE_HEADER = "x-nexbill-plan-feature";
