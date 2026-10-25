/**
 * Saldo waktu member — aritmetika murni (tanpa db, aman diimpor halaman "use client").
 *
 * Alur:
 *  - SIMPAN: sesi paket/durasi tetap milik member selesai lebih awal → sisa menitnya boleh disimpan
 *    sekali ke saldo member. Nilainya = harga per menit sesi itu × sisa menit, dicatat sebagai
 *    Pendapatan Diterima di Muka (2134), jadi pendapatan sewa berkurang sebesar itu.
 *  - PAKAI: saat mulai sesi durasi tetap, member memakai N menit saldo. Menit itu ditambahkan ke durasi
 *    sesi tetapi TIDAK ditagih; saat sesi selesai nilainya dipindah dari 2134 kembali ke pendapatan.
 */

export const TIME_CREDIT_MIN_SAVE_MINUTES = 5;
export const TIME_CREDIT_MAX_USE_MINUTES = 24 * 60;

export interface CreditBalance {
  minutes: number;
  value: number;
}

const money = (n: number) => Math.round(n * 100) / 100;

/** Menit yang diizinkan sesi berdurasi (paket/durasi tetap), atau null untuk sesi terbuka. */
export function allowedSessionMinutes(s: { plannedMinutes: number | null; extendedMinutes: number }): number | null {
  return s.plannedMinutes ? s.plannedMinutes + (s.extendedMinutes ?? 0) : null;
}

/** Menit bermain sebenarnya (sudah dikurangi jeda), dibulatkan ke atas. */
export function playedMinutes(s: { startedAt: string; endedAt: string | null; accumulatedPauseMs: number }): number {
  if (!s.endedAt) return 0;
  const ms = Date.parse(s.endedAt) - Date.parse(s.startedAt) - (s.accumulatedPauseMs ?? 0);
  return Math.max(0, Math.ceil(ms / 60000));
}

/** Sisa menit sesi berdurasi yang selesai lebih awal (0 bila habis / sesi terbuka). */
export function leftoverMinutes(s: { plannedMinutes: number | null; extendedMinutes: number; startedAt: string; endedAt: string | null; accumulatedPauseMs: number }): number {
  const allowed = allowedSessionMinutes(s);
  if (!allowed) return 0;
  return Math.max(0, allowed - playedMinutes(s));
}

/**
 * Nilai rupiah sisa menit: (yang dibayar untuk sewa + nilai saldo yang dipakai) / menit yang diizinkan × sisa.
 * `rentalPaid` = tagihan sewa sesi itu setelah diskon sesi (rentalSessions.totalAmount).
 */
export function leftoverValue(rentalPaid: number, creditValueUsed: number, allowedMinutes: number, leftover: number): number {
  if (allowedMinutes <= 0 || leftover <= 0) return 0;
  const perMinute = Math.max(0, rentalPaid + creditValueUsed) / allowedMinutes;
  return money(perMinute * Math.min(leftover, allowedMinutes));
}

/** Nilai yang ikut terpakai saat memakai `minutes` dari saldo (rata-rata nilai per menit saldo). */
export function creditUseValue(balance: CreditBalance, minutes: number): number {
  if (balance.minutes <= 0 || minutes <= 0) return 0;
  if (minutes >= balance.minutes) return money(balance.value);
  return money((balance.value * minutes) / balance.minutes);
}

/** Validasi jumlah menit yang mau dipakai; mengembalikan pesan galat atau null. */
export function validateCreditUse(minutes: unknown, balance: CreditBalance | null, opts: { promo: boolean; isMember: boolean }): string | null {
  if (minutes === undefined || minutes === null || minutes === 0) return null;
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 0 || minutes > TIME_CREDIT_MAX_USE_MINUTES) return "Jumlah menit saldo waktu tidak valid.";
  if (!opts.isMember) return "Saldo waktu hanya untuk member terdaftar.";
  if (opts.promo) return "Saldo waktu tidak bisa digabung dengan paket promo — pilih Per Jam atau durasi tetap.";
  if (!balance || balance.minutes < minutes) return `Saldo waktu member tidak cukup (tersisa ${balance?.minutes ?? 0} menit).`;
  return null;
}
