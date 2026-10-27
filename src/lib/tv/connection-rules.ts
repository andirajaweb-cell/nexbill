/**
 * Status sambungan layar NEXBILL TV untuk dashboard (Rental PS). Murni, diuji di connection-rules.test.ts.
 * TV memanggil /api/tv/state tiap 5 detik (lebih cepat dengan colekan), jadi "terakhir terlihat" > 30
 * detik = TV tidak terhubung (WiFi TV mati, TV dimatikan, atau aplikasi ditutup).
 */
export const TV_ONLINE_MS = 30_000;

export type TvConnState = "online" | "offline" | "never";

export function tvConnState(lastSeenAt: string | null, now: number, isPaired: boolean): TvConnState {
  if (!isPaired || !lastSeenAt) return "never";
  return now - new Date(lastSeenAt).getTime() <= TV_ONLINE_MS ? "online" : "offline";
}

/** Menit sejak terakhir terlihat (dibulatkan ke bawah, minimal 0); null bila belum pernah. */
export function minutesSince(lastSeenAt: string | null, now: number): number | null {
  if (!lastSeenAt) return null;
  return Math.max(0, Math.floor((now - new Date(lastSeenAt).getTime()) / 60_000));
}
