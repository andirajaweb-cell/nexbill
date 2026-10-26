/**
 * SATU TV FISIK = SATU OUTLET (aturan pemilik, 2026-10-27). Aplikasi NEXBILL TV 1.2.2+ mengirim sidik
 * TV (hash ANDROID_ID, header X-Nexbill-Device & saat pairing); sidiknya disimpan di tv_screens.tv_info
 * (kunci `deviceId`, tanpa migrasi). Aturan murni di sini, diuji di device-binding.test.ts:
 *
 *  - Pairing TV yang masih terikat ke layar di OUTLET LAIN ditolak — outlet lain tidak bisa mengambil
 *    alih TV hanya dengan menghapus data aplikasi lalu mengetik kodenya sendiri. Outlet pemilik harus
 *    menghapus layarnya dulu (Pengaturan › TV Screensaver). Pengecualian: layar lama itu sudah tidak
 *    terlihat lebih dari 30 hari (TV dijual/dipindah) → ikatan lama dilepas otomatis.
 *  - Pairing ke layar lain di OUTLET YANG SAMA (pindah unit) → layar lama dilepas otomatis.
 *  - Setiap pairing memberi token BARU, jadi TV lain yang memegang token lama layar ini langsung
 *    terputus: satu layar dikendalikan satu TV.
 *  - Polling dengan sidik yang berbeda dari sidik layar → ditolak (token disalin ke perangkat lain).
 */

export const STALE_BINDING_MS = 30 * 86400_000;

export function isDeviceId(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{32}$/.test(v);
}

export interface BoundScreen {
  id: string;
  outletId: string;
  lastSeenAt: string | null;
}

export type PairDecision = { ok: true; release: string[] } | { ok: false; reason: string };

export function decidePairing(input: { targetScreenId: string; targetOutletId: string; deviceId: string | null; bound: BoundScreen[]; now: number }): PairDecision {
  if (!input.deviceId) return { ok: true, release: [] }; // TV lama / browser: tanpa ikatan
  const others = input.bound.filter((b) => b.id !== input.targetScreenId);
  const otherOutletActive = others.filter(
    (b) => b.outletId !== input.targetOutletId && b.lastSeenAt != null && input.now - new Date(b.lastSeenAt).getTime() < STALE_BINDING_MS
  );
  if (otherOutletActive.length > 0) {
    return {
      ok: false,
      reason:
        "TV ini masih terdaftar di outlet lain. Satu TV hanya boleh dikontrol satu outlet — minta pemilik outlet tersebut menghapus layar TV ini di Pengaturan › TV Screensaver, lalu ketik kode ini lagi.",
    };
  }
  return { ok: true, release: others.map((b) => b.id) };
}

/** Polling: layar yang sudah terikat ke TV lain menolak sidik yang berbeda. TV tanpa sidik (versi lama) tetap dilayani. */
export function deviceMatches(boundDeviceId: string | null, requestDeviceId: string | null): boolean {
  if (!boundDeviceId || !requestDeviceId) return true;
  return boundDeviceId === requestDeviceId;
}
