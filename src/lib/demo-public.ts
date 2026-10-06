/**
 * Kredensial akun DEMO publik yang sengaja dipajang di landing page (nexbill.id, section "Coba
 * Demo") dan dipakai /login?demo=1 untuk mengisi form otomatis. Bukan rahasia. Akun ini dilindungi
 * di server (lib/auth/demo-account.ts): password/email tidak bisa diubah, banyak orang boleh login
 * bersamaan, dan setiap login dihitung di Platform Admin.
 * Kalau password akun demo diganti (via scripts/reset-staff-password.ts), ubah juga di sini.
 */
export const DEMO_PUBLIC_EMAIL = "demo@nexbill.id";
export const DEMO_PUBLIC_PASSWORD = "Demo2025!";
