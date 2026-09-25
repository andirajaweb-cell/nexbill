/**
 * Pembulatan Total Tagihan (Settings → Pajak & Billing).
 *
 * Tarif rental per menit menghasilkan total tidak bulat (mis. 181 menit × Rp5.000/jam = Rp15.083).
 * Kasir menerima Rp15.000, lalu sisa Rp83 tercatat selamanya sebagai Piutang Pelanggan. Dengan
 * setelan ini total tagihan dibulatkan ke satuan uang yang benar-benar dipakai bertransaksi, dan
 * selisihnya disimpan di orders.roundingAdjustment lalu dijurnal ke akun Selisih Pembulatan
 * (postSalesJournal) — jadi pendapatan di buku sama dengan uang yang diterima.
 */

export const BILL_ROUNDING_UNITS = [0, 100, 500, 1000] as const;
export const BILL_ROUNDING_MODES = ["nearest", "down", "up"] as const;
export type BillRoundingMode = (typeof BILL_ROUNDING_MODES)[number];

export interface BillRounding {
  total: number;
  /** total − unrounded amount: positive when rounded up, negative when rounded down. */
  adjustment: number;
}

/** Pure. unit <= 0 means off. Never rounds below 0. */
export function roundBillTotal(amount: number, unit: number | null | undefined, mode: string | null | undefined): BillRounding {
  const base = Math.max(0, Math.round(amount * 100) / 100);
  if (!unit || unit <= 0) return { total: base, adjustment: 0 };
  const steps = base / unit;
  const rounded = mode === "up" ? Math.ceil(steps - 1e-9) : mode === "down" ? Math.floor(steps + 1e-9) : Math.round(steps);
  const total = Math.max(0, rounded * unit);
  return { total, adjustment: Math.round((total - base) * 100) / 100 };
}
