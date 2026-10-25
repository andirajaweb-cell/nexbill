/**
 * Kalkulator kebocoran (nexbill.id/kalkulator-kebocoran) — hitungan murni dari isian pemilik outlet
 * saat demo. Tidak ada angka "penghematan" yang dijanjikan: yang dihitung hanya kebocoran per
 * bulan menurut isian, lalu dibandingkan dengan biaya langganan NEXBILL.
 */

export interface LeakageInput {
  /** Selisih kas kurang rata-rata per shift (Rp). */
  cashShortPerShift: number;
  shiftsPerDay: number;
  daysOpenPerMonth: number;
  /** Jumlah unit PS/TV. */
  units: number;
  sessionsPerUnitPerDay: number;
  /** Menit main yang tidak tertagih per sesi (lupa start/stop, dibulatkan ke bawah, "bonus" staf). */
  unbilledMinutesPerSession: number;
  ratePerHour: number;
  /** TV + konsol yang tetap menyala tanpa sesi. */
  idleTvs: number;
  idleHoursPerDay: number;
  /** Daya TV + konsol saat menyala tanpa dipakai (watt). */
  wattsPerTv: number;
  pricePerKwh: number;
}

export const DEFAULT_LEAKAGE_INPUT: LeakageInput = {
  cashShortPerShift: 20000,
  shiftsPerDay: 2,
  daysOpenPerMonth: 30,
  units: 10,
  sessionsPerUnitPerDay: 4,
  unbilledMinutesPerSession: 5,
  ratePerHour: 8000,
  idleTvs: 10,
  idleHoursPerDay: 3,
  wattsPerTv: 120,
  // Tarif PLN R-1 1.300–2.200 VA dan B-2 nonsubsidi, Rp1.444,70/kWh (Triwulan IV 2026, tidak naik).
  // Pemilik sebaiknya mengganti dengan tarif di tagihannya sendiri.
  pricePerKwh: 1444.7,
};

export const LEAKAGE_LIMITS: Record<keyof LeakageInput, { min: number; max: number }> = {
  cashShortPerShift: { min: 0, max: 10_000_000 },
  shiftsPerDay: { min: 0, max: 6 },
  daysOpenPerMonth: { min: 0, max: 31 },
  units: { min: 0, max: 500 },
  sessionsPerUnitPerDay: { min: 0, max: 48 },
  unbilledMinutesPerSession: { min: 0, max: 240 },
  ratePerHour: { min: 0, max: 1_000_000 },
  idleTvs: { min: 0, max: 500 },
  idleHoursPerDay: { min: 0, max: 24 },
  wattsPerTv: { min: 0, max: 2000 },
  pricePerKwh: { min: 0, max: 10_000 },
};

export function sanitizeLeakageInput(raw: Partial<Record<keyof LeakageInput, unknown>>): LeakageInput {
  const out = { ...DEFAULT_LEAKAGE_INPUT };
  for (const key of Object.keys(LEAKAGE_LIMITS) as (keyof LeakageInput)[]) {
    const v = raw[key];
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    const { min, max } = LEAKAGE_LIMITS[key];
    out[key] = Math.min(max, Math.max(min, n));
  }
  return out;
}

export interface LeakageResult {
  cashPerMonth: number;
  unbilledPerMonth: number;
  unbilledMinutesPerMonth: number;
  powerPerMonth: number;
  kwhPerMonth: number;
  totalPerMonth: number;
  totalPerYear: number;
}

export function computeLeakage(i: LeakageInput): LeakageResult {
  const cashPerMonth = i.cashShortPerShift * i.shiftsPerDay * i.daysOpenPerMonth;
  const unbilledMinutesPerMonth = i.units * i.sessionsPerUnitPerDay * i.unbilledMinutesPerSession * i.daysOpenPerMonth;
  const unbilledPerMonth = (unbilledMinutesPerMonth / 60) * i.ratePerHour;
  const kwhPerMonth = (i.idleTvs * i.idleHoursPerDay * i.wattsPerTv * i.daysOpenPerMonth) / 1000;
  const powerPerMonth = kwhPerMonth * i.pricePerKwh;
  const totalPerMonth = cashPerMonth + unbilledPerMonth + powerPerMonth;
  return {
    cashPerMonth: Math.round(cashPerMonth),
    unbilledPerMonth: Math.round(unbilledPerMonth),
    unbilledMinutesPerMonth: Math.round(unbilledMinutesPerMonth),
    powerPerMonth: Math.round(powerPerMonth),
    kwhPerMonth: Math.round(kwhPerMonth * 10) / 10,
    totalPerMonth: Math.round(totalPerMonth),
    totalPerYear: Math.round(totalPerMonth * 12),
  };
}

/** Biaya langganan Starter untuk N unit (per unit, minimal minUnits). */
export function starterMonthlyCost(units: number, perUnit: number, minUnits: number): number {
  return Math.max(Math.ceil(units), minUnits) * perUnit;
}

/** Berapa kali lipat kebocoran dibanding biaya langganan (null bila biaya 0). */
export function leakageMultiple(totalPerMonth: number, monthlyCost: number): number | null {
  if (!(monthlyCost > 0)) return null;
  return Math.round((totalPerMonth / monthlyCost) * 10) / 10;
}

/** Isian ↔ query string, supaya hasil demo bisa dibagikan sebagai link. */
const PARAM: Record<keyof LeakageInput, string> = {
  cashShortPerShift: "kas",
  shiftsPerDay: "shift",
  daysOpenPerMonth: "hari",
  units: "unit",
  sessionsPerUnitPerDay: "sesi",
  unbilledMinutesPerSession: "menit",
  ratePerHour: "tarif",
  idleTvs: "tv",
  idleHoursPerDay: "jam",
  wattsPerTv: "watt",
  pricePerKwh: "kwh",
};

export function leakageToParams(i: LeakageInput): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of Object.keys(PARAM) as (keyof LeakageInput)[]) p.set(PARAM[k], String(i[k]));
  return p;
}

export function leakageFromParams(p: URLSearchParams): LeakageInput {
  const raw: Partial<Record<keyof LeakageInput, unknown>> = {};
  for (const k of Object.keys(PARAM) as (keyof LeakageInput)[]) {
    const v = p.get(PARAM[k]);
    if (v !== null) raw[k] = v;
  }
  return sanitizeLeakageInput(raw);
}
