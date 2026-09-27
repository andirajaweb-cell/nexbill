import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Rentang tanggal laporan → batas ISO dalam kalender outlet (WIB).
 *
 * BUG YANG DIPERBAIKI (2026-09-27): halaman Laporan mengirim "2026-09-30" mentah dan server
 * membandingkannya sebagai string dengan timestamp ISO. "2026-09-30T10:00:00Z" > "2026-09-30",
 * jadi SELURUH transaksi di hari terakhir periode hilang dari setiap laporan (penjualan, rental,
 * HPP, pelanggan, beban, Laba Rugi di tab Beban & Kesehatan Keuangan) — dan batas awalnya memakai
 * tengah malam UTC (07.00 WIB), sehingga transaksi dini hari pindah hari.
 *
 * Sekarang: "YYYY-MM-DD" → 00:00:00 WIB (from) / 23:59:59.999 WIB (to). ISO lengkap diteruskan apa
 * adanya (halaman yang sudah mengirim ISO, mis. Transaksi, tidak berubah). Kosong → undefined.
 */
export function normalizeReportRange(from?: string | null, to?: string | null): { from?: string; to?: string } {
  const conv = (v: string | null | undefined, end: boolean) => {
    if (!v) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}+07:00`).toISOString();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  return { from: conv(from, false), to: conv(to, true) };
}

/** Bulan berjalan (kalender WIB) sampai akhir hari ini. */
export function monthToDateRange(now: Date = new Date()): { from: string; to: string } {
  const today = outletDateYmd(now);
  return normalizeReportRange(`${today.slice(0, 7)}-01`, today) as { from: string; to: string };
}

/** Jumlah hari kalender (inklusif) dalam rentang ISO. */
export function daysInRange(from: string, to: string): number {
  const a = outletDateYmd(new Date(from));
  const b = outletDateYmd(new Date(to));
  return Math.max(1, Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1);
}
