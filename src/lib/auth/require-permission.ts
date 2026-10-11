import { NextResponse } from "next/server";
import { hasAnyPermission, type Permission } from "./permissions";

export { hasAnyPermission };

/**
 * Pemeriksaan izin peran di server untuk route API yang mengubah data.
 *
 * Latar belakang (audit 2026-10-11): banyak aksi pengelola — ubah harga produk, buat voucher/tier,
 * penyesuaian stok, belanja supplier, PO, stock opname, bayar faktur supplier — hanya dijaga oleh
 * menu yang disembunyikan. Server cukup memeriksa "sudah login & outletnya sama", sehingga staf
 * peran apa pun (kasir, dapur) bisa memanggil API-nya langsung. Pemisahan antar-outlet tetap aman;
 * yang bocor adalah pemisahan peran DI DALAM satu outlet.
 *
 * Pakai di awal handler, setelah sesi didapat:
 *   const denied = forbidUnless(session, ["manage_inventory_purchasing"], "…");
 *   if (denied) return denied;
 * Daftar izin bersifat "salah satu cukup". Matriks izin tetap yang bisa diatur pemilik di menu Staf.
 */
export function forbidUnless(session: { role: string }, permissions: Permission[], message: string): NextResponse | null {
  return hasAnyPermission(session.role, permissions) ? null : NextResponse.json({ error: message }, { status: 403 });
}
