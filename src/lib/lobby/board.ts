/**
 * Papan lobi publik (/lobi/[slug]) — logika murni, tanpa db. Mengubah unit + sesi aktif menjadi
 * kartu yang aman ditampilkan ke umum: TIDAK ada nama pelanggan, tagihan, atau data pribadi lain.
 * Hanya status unit, sisa/berjalannya waktu, jenis sesi, dan booking terdekat.
 */

export type LobbyStatus = "available" | "playing" | "paused" | "maintenance";
export type LobbyMode = "package" | "fixed" | "open";

export interface LobbyUnitInput {
  id: string;
  name: string;
  consoleType: string;
  status: string;
}

export interface LobbySessionInput {
  rentalUnitId: string;
  status: string;
  startedAt: string;
  pausedAt: string | null;
  accumulatedPauseMs: number;
  plannedMinutes: number | null;
  extendedMinutes: number;
  promoId: string | null;
}

export interface LobbyCard {
  id: string;
  name: string;
  consoleType: string;
  status: LobbyStatus;
  mode: LobbyMode | null;
  /** Detik tersisa (sesi paket/durasi tetap); null untuk sesi terbuka atau unit kosong. */
  remainingSeconds: number | null;
  /** Detik berjalan (sesi terbuka). */
  elapsedSeconds: number | null;
  /** Sisa ≤ 10 menit — ditandai "segera kosong" di papan. */
  endingSoon: boolean;
  /** Booking terdekat (12 jam ke depan) untuk unit yang sedang kosong. */
  nextBookingAt: string | null;
}

export const ENDING_SOON_SECONDS = 10 * 60;

export function buildLobbyCards(
  units: LobbyUnitInput[],
  sessions: LobbySessionInput[],
  promoMinutes: Map<string, number>,
  nextBookingByUnit: Map<string, string>,
  nowMs: number
): LobbyCard[] {
  const byUnit = new Map(sessions.filter((s) => s.status === "running" || s.status === "paused").map((s) => [s.rentalUnitId, s]));
  const cards = units.map((u): LobbyCard => {
    if (u.status === "maintenance") {
      return { id: u.id, name: u.name, consoleType: u.consoleType, status: "maintenance", mode: null, remainingSeconds: null, elapsedSeconds: null, endingSoon: false, nextBookingAt: null };
    }
    const s = byUnit.get(u.id);
    if (!s) {
      return { id: u.id, name: u.name, consoleType: u.consoleType, status: "available", mode: null, remainingSeconds: null, elapsedSeconds: null, endingSoon: false, nextBookingAt: nextBookingByUnit.get(u.id) ?? null };
    }
    let pauseMs = s.accumulatedPauseMs;
    if (s.status === "paused" && s.pausedAt) pauseMs += Math.max(0, nowMs - Date.parse(s.pausedAt));
    const elapsedSec = Math.max(0, Math.floor((nowMs - Date.parse(s.startedAt) - pauseMs) / 1000));
    const promoMin = s.promoId ? promoMinutes.get(s.promoId) ?? null : null;
    const baseMin = promoMin ?? s.plannedMinutes ?? null;
    const mode: LobbyMode = promoMin !== null ? "package" : s.plannedMinutes !== null ? "fixed" : "open";
    const remaining = baseMin !== null ? Math.max(0, (baseMin + s.extendedMinutes) * 60 - elapsedSec) : null;
    return {
      id: u.id,
      name: u.name,
      consoleType: u.consoleType,
      status: s.status === "paused" ? "paused" : "playing",
      mode,
      remainingSeconds: remaining,
      elapsedSeconds: remaining === null ? elapsedSec : null,
      endingSoon: remaining !== null && s.status !== "paused" && remaining <= ENDING_SOON_SECONDS,
      nextBookingAt: null,
    };
  });
  // Unit kosong dulu, lalu yang segera kosong, lalu sisanya — urutan nama dalam tiap kelompok.
  const rank = (c: LobbyCard) => (c.status === "available" ? 0 : c.endingSoon ? 1 : c.status === "maintenance" ? 3 : 2);
  return cards.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "id", { numeric: true }));
}

/** Detik → "1:05:09" / "05:09". */
export function lobbyClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Pengumuman: dipangkas & dibatasi panjangnya supaya muat di teks berjalan. */
export const LOBBY_ANNOUNCEMENT_MAX = 300;
export function cleanAnnouncement(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim().slice(0, LOBBY_ANNOUNCEMENT_MAX);
  return s || null;
}
