import { outletDateYmd } from "./outlet-time";

/**
 * Tanggal transaksi yang dipilih pengguna (YYYY-MM-DD, kalender outlet) → ISO untuk dicatat.
 * Kosong / hari ini = waktu sekarang; tanggal lampau dipatok 12.00 WIB supaya tidak bergeser hari
 * di zona waktu mana pun. Tanggal di masa depan ditolak. Sama dengan purchaseDateToIso (Belanja
 * Supplier), dipakai Setoran Kas & Pindah Kas.
 */
export function ymdToEntryIso(ymd: string | undefined | null, now: Date = new Date()): string {
  if (!ymd) return now.toISOString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || Number.isNaN(Date.parse(`${ymd}T12:00:00+07:00`))) throw new Error("Tanggal tidak valid.");
  const today = outletDateYmd(now);
  if (ymd > today) throw new Error("Tanggal tidak boleh di masa depan.");
  return ymd === today ? now.toISOString() : new Date(`${ymd}T12:00:00+07:00`).toISOString();
}

/** True bila tanggal kosong atau sama dengan hari ini (kalender outlet). */
export function isTodayYmd(ymd: string | undefined | null, now: Date = new Date()): boolean {
  return !ymd || ymd === outletDateYmd(now);
}
