/**
 * Akun DEMO publik — kredensialnya sengaja dipajang di landing page (nexbill.id) supaya calon
 * pelanggan bisa mencoba NEXBILL tanpa mendaftar. Karena siapa pun bisa login, akun ini diberi
 * pagar pengaman:
 *  - Banyak orang boleh login bersamaan (aturan "satu akun = satu perangkat" tidak berlaku, dan
 *    login/logout seseorang tidak mengeluarkan pengunjung lain) — lihat single-session.ts.
 *  - Password, email, dan data akun tidak bisa diubah/dihapus dari aplikasi (ganti password, ganti
 *    email, reset password, hapus akun, ubah/nonaktifkan akun owner di Staf) — supaya akun tidak
 *    bisa "dibajak" pengunjung dan tetap bisa dipakai peninjau Google Play.
 *  - Setiap login dicatat (audit log action "demo_login") untuk statistik di Platform Admin.
 *
 * Daftar email diatur lewat env DEMO_ACCOUNT_EMAILS (dipisah koma); bawaan "demo@nexbill.id".
 */
export const DEMO_LOGIN_ACTION = "demo_login";

export function demoEmails(): string[] {
  return (process.env.DEMO_ACCOUNT_EMAILS || "demo@nexbill.id")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return demoEmails().includes(email.trim().toLowerCase());
}

export class DemoAccountError extends Error {
  status = 403;
  constructor(what = "Perubahan ini") {
    super(`${what} tidak tersedia di akun demo. Daftar gratis untuk memakai NEXBILL dengan akun Anda sendiri.`);
  }
}

/** Lempar DemoAccountError kalau sesi ini milik akun demo. */
export function assertNotDemo(session: { email?: string | null } | null | undefined, what?: string) {
  if (session && isDemoEmail(session.email)) throw new DemoAccountError(what);
}

/** Identitas pengunjung tanpa menyimpan IP mentah: hash pendek IP + perangkat (untuk hitung pengunjung unik). */
export async function visitorKey(ip: string | null | undefined, userAgent: string | null | undefined): Promise<string> {
  const data = new TextEncoder().encode(`${ip ?? ""}|${userAgent ?? ""}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
