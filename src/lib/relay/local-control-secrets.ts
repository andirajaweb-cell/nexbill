import { createHmac } from "crypto";

/**
 * Kunci & PIN Kontrol Lokal, DITURUNKAN dari token Relay Agent — tidak disimpan di mana pun.
 * Agent (public/downloads/nexbill-agent/android/index.js, deriveLocalSecrets) menghitung nilai yang
 * sama persis dari token miliknya sendiri, jadi keduanya tetap cocok walau internet putus dan tanpa
 * kolom database baru. Mengganti token agent otomatis mengganti kunci & PIN-nya.
 *
 *  - key: 40 karakter heksadesimal, dipakai papan kasir offline (browser) memanggil API agent.
 *    Hanya dikirim server ke staf yang login di outlet itu (GET /api/offline/snapshot).
 *  - pin: 6 angka untuk halaman Kontrol Lokal di LAN; ditampilkan di Kontrol Perangkat untuk role
 *    pengelola perangkat. Agent membatasi salah PIN (lihat LOGIN_MAX_FAILS di agent).
 */
export function deriveLocalSecrets(agentToken: string): { key: string; pin: string } {
  const key = createHmac("sha256", agentToken).update("nexbill-local-key-v1").digest("hex").slice(0, 40);
  const pinNum = createHmac("sha256", agentToken).update("nexbill-local-pin-v1").digest().readUInt32BE(0) % 1_000_000;
  return { key, pin: String(pinNum).padStart(6, "0") };
}
