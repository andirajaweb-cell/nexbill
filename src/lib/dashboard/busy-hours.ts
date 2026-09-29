/**
 * Jam Ramai vs Jam Sepi — perhitungan murni untuk kartu dashboard owner (diuji di busy-hours.test.ts).
 *
 * Masalah versi lama:
 *  - Angka yang ditampilkan adalah TOTAL 30 hari ("13:00 (68x)"), jadi sulit dibandingkan dan
 *    terbaca seolah-olah per hari.
 *  - Jam Sepi = jam dengan transaksi paling sedikit asal bukan nol. Satu transaksi nyasar di luar jam
 *    operasional (mis. 09:00 sekali sebulan) langsung terpilih sebagai "jam sepi" — tidak berguna.
 *
 * Sekarang:
 *  - Nilai utama = rata-rata transaksi per hari (total ÷ jumlah hari yang ada transaksi).
 *  - Jam dianggap JAM OPERASIONAL bila ada transaksi pada minimal 25% hari aktif (min. 2 hari bila
 *    hari aktif ≥ 2). Jam Ramai & Jam Sepi dipilih hanya dari jam operasional; jam di luar itu
 *    tetap tampil di grafik tapi diredupkan.
 */

export const OPERATING_DAY_SHARE = 0.25;

export interface BusyHourInput {
  /** Jam (0–23) transaksi, zona waktu outlet. */
  hour: number;
  /** Tanggal transaksi (YYYY-MM-DD), zona waktu outlet. */
  ymd: string;
}

export interface BusyHourRow {
  hour: number;
  /** Total transaksi di jam ini selama periode. */
  count: number;
  /** Rata-rata transaksi per hari aktif, dibulatkan 1 desimal. */
  avgPerDay: number;
  /** Berapa hari (dari hari aktif) jam ini pernah ada transaksi. */
  daysActive: number;
  operating: boolean;
}

export interface BusyHoursResult {
  hours: BusyHourRow[];
  activeDays: number;
  busiest: BusyHourRow | null;
  quietest: BusyHourRow | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeBusyHours(rows: BusyHourInput[]): BusyHoursResult {
  const counts = new Array(24).fill(0) as number[];
  const daysPerHour: Set<string>[] = Array.from({ length: 24 }, () => new Set<string>());
  const allDays = new Set<string>();
  for (const r of rows) {
    const h = ((r.hour % 24) + 24) % 24;
    counts[h]++;
    daysPerHour[h].add(r.ymd);
    allDays.add(r.ymd);
  }
  const activeDays = allDays.size;
  const minDays = activeDays >= 2 ? Math.max(2, Math.ceil(activeDays * OPERATING_DAY_SHARE)) : 1;

  const hours: BusyHourRow[] = counts.map((count, hour) => ({
    hour,
    count,
    avgPerDay: activeDays ? round1(count / activeDays) : 0,
    daysActive: daysPerHour[hour].size,
    operating: count > 0 && daysPerHour[hour].size >= minDays,
  }));

  // Data masih sangat sedikit (tidak ada jam yang lolos ambang) → pakai semua jam yang ada transaksinya.
  let pool = hours.filter((h) => h.operating);
  if (pool.length === 0) pool = hours.filter((h) => h.count > 0);

  const busiest = pool.length ? pool.reduce((a, b) => (b.count > a.count ? b : a)) : null;
  // Jam sepi hanya bermakna kalau ada lebih dari satu jam untuk dibandingkan.
  const quietest = pool.length > 1 ? pool.reduce((a, b) => (b.count < a.count ? b : a)) : null;

  return { hours, activeDays, busiest, quietest };
}
