import { AsyncLocalStorage } from "node:async_hooks";
import { setPermissionScopeResolver } from "./permissions";

/**
 * Outlet aktif per request untuk izin khusus outlet (lihat "IZIN KHUSUS OUTLET" di permissions.ts).
 * Khusus server — jangan diimpor dari komponen klien.
 *
 * hasPermission(role, izin) dipakai di ±300 tempat dengan tanda tangan sinkron tanpa outlet. Supaya
 * semuanya otomatis memakai checklist Owner TANPA mengubah satu pun pemanggilnya, getSession()
 * memanggil beginPermissionScope() sebagai pernyataan PERTAMA (sebelum await apa pun). Saat itu
 * kode masih berjalan sinkron di konteks async milik route/komponen pemanggil, sehingga
 * AsyncLocalStorage.enterWith() menempel di konteks request itu dan ikut ke semua await setelahnya.
 * Setelah sesi terverifikasi, outletId diisi ke wadah yang sama.
 *
 * Setiap request punya konteks async sendiri, jadi outlet satu request tidak pernah terlihat oleh
 * request lain. Tanpa sesi (skrip, cron, webhook) wadahnya kosong → bawaan NEXBILL.
 */
interface PermissionScope {
  outletId: string | null;
}

const storage = new AsyncLocalStorage<PermissionScope>();

setPermissionScopeResolver(() => storage.getStore()?.outletId ?? null);

/** Panggil SINKRON di awal fungsi (sebelum await pertama). Kembalikan wadah untuk diisi outletId. */
export function beginPermissionScope(): PermissionScope {
  const scope: PermissionScope = { outletId: null };
  storage.enterWith(scope);
  return scope;
}

/** Jalankan fn dengan outlet tertentu sebagai konteks izin (untuk kerja latar per outlet). */
export function runWithOutletPermissions<T>(outletId: string, fn: () => T): T {
  return storage.run({ outletId }, fn);
}
