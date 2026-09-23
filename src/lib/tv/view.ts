/**
 * Logika tampilan TV Screensaver — MURNI: tidak mengimpor `db`, tidak menyentuh jaringan, tidak
 * membaca jam sistem sendiri (setiap fungsi menerima `now` dari pemanggil).
 *
 * Dipisah dari service.ts persis seperti pricing.ts dipisah dari charge.ts, dengan dua alasan yang
 * sama:
 *
 *   1. Bisa diuji tanpa database — dan yang paling butuh diuji di fitur ini justru yang paling
 *      mudah salah diam-diam: batas mode malam yang melewati tengah malam, dan perhitungan sisa
 *      waktu untuk sesi berdurasi tetap vs sesi terbuka.
 *
 *   2. Halaman /tv adalah komponen klien. Kalau ia mengimpor modul yang menarik `db` atau
 *      bcryptjs, seluruh rantai itu ikut ke bundle browser. Preseden mahalnya sudah ada di
 *      repo ini: halaman Rekomendasi Produk nyaris mengirim SDK Anthropic ke browser karena
 *      mengimpor translate-product.ts.
 */

import { outletHour } from "@/lib/time/outlet-time";

export type TvUnitStatus = "available" | "occupied" | "paused" | "maintenance" | "unknown";

export interface TvSessionInput {
  status: "running" | "paused";
  startedAt: string;
  accumulatedPauseMs: number;
  pausedAt: string | null;
  /** 0 / null = sesi terbuka (open-ended) — tidak punya waktu selesai, jadi tidak punya sisa waktu. */
  plannedMinutes: number | null;
  extendedMinutes: number;
}

export interface TvUnitView {
  status: TvUnitStatus;
  /** Detik berjalan sejak sesi dimulai (pause tidak dihitung). null jika tidak ada sesi. */
  elapsedSeconds: number | null;
  /**
   * Detik tersisa sampai sesi berdurasi tetap berakhir. null untuk sesi TERBUKA — dan itu bukan
   * kelalaian: sesi tanpa durasi yang disepakati memang tidak punya sisa waktu, jadi layar harus
   * menampilkan waktu BERJALAN, bukan hitung mundur yang dikarang. Nilai tidak pernah negatif;
   * sesi yang lewat waktu berhenti di 0 dan ditandai lewat isOvertime.
   */
  remainingSeconds: number | null;
  isOvertime: boolean;
}

/**
 * Menit berjalan bersih sebuah sesi — jeda (pause) tidak ikut dihitung.
 *
 * Saat sesi sedang DIJEDA, session.accumulatedPauseMs belum memuat jeda yang sedang berlangsung
 * (baru dikreditkan ketika sesi dilanjutkan), jadi durasi jeda berjalan ditambahkan di sini.
 * Tanpa itu, angka di layar terus merambat naik selama dijeda. Ini meniru persis perhitungan di
 * getLiveBillingBoard() dan stopRentalSession() — dan memang harus sama: pelanggan yang melihat
 * hitungan di TV lalu membayar angka berbeda di kasir adalah pertengkaran yang tidak perlu.
 */
export function effectiveElapsedMs(session: TvSessionInput, nowMs: number): number {
  let pauseMs = session.accumulatedPauseMs;
  if (session.status === "paused" && session.pausedAt) {
    pauseMs += nowMs - new Date(session.pausedAt).getTime();
  }
  return Math.max(0, nowMs - new Date(session.startedAt).getTime() - pauseMs);
}

/** Status + waktu satu unit untuk ditampilkan di layar bilik. */
export function computeUnitView(
  unitStatus: string | null,
  session: TvSessionInput | null,
  nowMs: number
): TvUnitView {
  if (!session) {
    // Tanpa sesi berjalan, status unit sendiri yang menentukan. "booked" sengaja dipetakan ke
    // available: dari sudut pandang orang yang berdiri di depan TV, bilik ini memang masih kosong
    // dan bisa dimainkan sekarang — pesanan yang belum check-in adalah urusan kasir, bukan sesuatu
    // yang perlu membuat layar berkata "tidak bisa dipakai".
    if (unitStatus === "maintenance") return { status: "maintenance", elapsedSeconds: null, remainingSeconds: null, isOvertime: false };
    if (unitStatus === "available" || unitStatus === "booked") return { status: "available", elapsedSeconds: null, remainingSeconds: null, isOvertime: false };
    return { status: "unknown", elapsedSeconds: null, remainingSeconds: null, isOvertime: false };
  }

  const elapsedMs = effectiveElapsedMs(session, nowMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const planned = session.plannedMinutes ?? 0;

  if (planned <= 0) {
    return {
      status: session.status === "paused" ? "paused" : "occupied",
      elapsedSeconds,
      remainingSeconds: null,
      isOvertime: false,
    };
  }

  const totalSeconds = (planned + (session.extendedMinutes ?? 0)) * 60;
  const rawRemaining = totalSeconds - elapsedSeconds;
  return {
    status: session.status === "paused" ? "paused" : "occupied",
    elapsedSeconds,
    remainingSeconds: Math.max(0, rawRemaining),
    isOvertime: rawRemaining < 0,
  };
}

/**
 * Apakah saat ini sedang masuk jam mode malam, menurut jam OUTLET (WIB) — bukan jam server.
 *
 * Rentang yang melewati tengah malam (mis. 23 -> 6) adalah kasus NORMAL di sini, bukan kasus tepi:
 * "setelah jam 23 malam" hampir selalu berarti menyeberangi tengah malam. Perbandingan naif
 * `hour >= start && hour < end` akan selalu bernilai false untuk rentang semacam itu — mode malam
 * yang tidak pernah menyala, gagal dalam diam. Karena itu kedua bentuk rentang ditangani terpisah.
 *
 * start === end diperlakukan sebagai "tidak pernah", bukan "selalu" — menyetel keduanya sama
 * hampir pasti salah ketik, dan layar yang gelap seharian jauh lebih merepotkan daripada layar
 * yang tidak pernah meredup.
 */
export function isNightMode(startHour: number, endHour: number, now: Date): boolean {
  const start = Math.max(0, Math.min(23, Math.trunc(startHour)));
  const end = Math.max(0, Math.min(23, Math.trunc(endHour)));
  if (start === end) return false;
  const hour = outletHour(now);
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** "01:25:30" untuk detik >= 1 jam, "25:30" untuk yang lebih pendek. null -> "--:--". */
export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) return "--:--";
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Opasitas overlay hitam yang ditumpuk di atas layar, 0..0.9.
 *
 * Dibatasi 0,9 dan bukan 1 dengan sengaja: pada 1 layar menjadi hitam pekat dan staf yang
 * menghampiri bilik tidak bisa membedakannya dari TV yang mati atau rusak — lalu mencabut
 * colokannya. Selalu menyisakan sedikit yang terlihat membuat layar tetap jelas "hidup, sedang
 * diredupkan".
 */
export function nightDimOpacity(enabled: boolean, dimPercent: number, startHour: number, endHour: number, now: Date): number {
  if (!enabled) return 0;
  if (!isNightMode(startHour, endHour, now)) return 0;
  const pct = Math.max(0, Math.min(90, Math.trunc(dimPercent)));
  return pct / 100;
}
