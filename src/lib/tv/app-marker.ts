/**
 * Penanda "layar ini memakai aplikasi NEXBILL TV" — tanpa migrasi. Aplikasi mengirim User-Agent
 * "NexbillTvApp/<versi>" pada setiap polling /api/tv/state; versinya disimpan di kolom JSON
 * tv_screens.tv_info dengan kunci `nexbillApp` (kolom yang sama dipakai Relay Agent untuk info TV,
 * jadi kunci lain di dalamnya dipertahankan). Dari penanda ini dashboard tahu unit itu dikontrol
 * aplikasi — sesi dari dashboard membuka/mengunci layar game tanpa ADB/relay. Murni, diuji di
 * app-marker.test.ts.
 */

export function appVersionFromUserAgent(ua: string | null | undefined): string | null {
  const m = /NexbillTvApp\/([0-9][0-9A-Za-z.\-]{0,15})/.exec(ua ?? "");
  return m ? m[1] : null;
}

function parse(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function appVersionOf(rawTvInfo: string | null | undefined): string | null {
  const v = parse(rawTvInfo)?.nexbillApp;
  return typeof v === "string" && v ? v : null;
}

/** tv_info baru bila versi aplikasi perlu dicatat/diubah; null = tidak ada yang perlu ditulis. */
export function withAppVersion(rawTvInfo: string | null | undefined, version: string | null): string | null {
  if (!version || appVersionOf(rawTvInfo) === version) return null;
  return JSON.stringify({ ...(parse(rawTvInfo) ?? {}), nexbillApp: version });
}

/** Saat Relay Agent menulis ulang info TV, penanda aplikasi tidak boleh ikut terhapus. */
export function keepAppVersion(newInfo: Record<string, unknown>, previousRaw: string | null | undefined): Record<string, unknown> {
  const v = appVersionOf(previousRaw);
  return v ? { ...newInfo, nexbillApp: v } : newInfo;
}
