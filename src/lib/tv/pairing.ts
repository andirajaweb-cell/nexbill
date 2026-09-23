/**
 * Pembuatan dan validasi kode pairing / token layar TV — MURNI kecuali `crypto`, yang tersedia
 * sama-sama di Node dan di Edge runtime.
 *
 * KENAPA KODENYA 6 DIGIT ANGKA, bukan huruf-angka acak. Layar ini dioperasikan dengan REMOTE TV,
 * bukan papan ketik. Mengetik "a7Kq2..." berarti menyusuri papan ketik di layar satu huruf demi
 * satu dengan tombol arah — puluhan penekanan tombol, dan hampir pasti salah di percobaan pertama.
 * Enam digit angka bisa ditekan langsung di tombol angka remote. Ruang tebakannya memang lebih
 * kecil (sejuta kemungkinan), dan itu dikompensasi dengan tiga hal: kode hanya berlaku
 * PAIRING_CODE_TTL_MINUTES menit, hangus begitu berhasil ditukar, dan satu kode hanya pernah
 * dipegang satu layar (unique index tv_screens_pairing_code_idx).
 */

export const PAIRING_CODE_TTL_MINUTES = 30;
const PAIRING_CODE_DIGITS = 6;

/**
 * Enam digit acak secara kriptografis. Memakai rejection sampling, bukan `% 1000000`.
 *
 * Alasannya: 2^32 tidak habis dibagi 1.000.000, jadi sisa pembagian akan membuat sebagian kode
 * lebih sering muncul dari yang lain — bias kecil, tapi persis jenis kelemahan yang membuat
 * penebakan kode jauh lebih murah dari yang diperkirakan. Batas di bawah membuang nilai di ekor
 * yang tidak rata sebelum membagi.
 */
export function generatePairingCode(): string {
  const LIMIT = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= LIMIT);
  return String(value % 1_000_000).padStart(PAIRING_CODE_DIGITS, "0");
}

/** Token rahasia jangka panjang milik satu layar (hex 256-bit). Disimpan di localStorage TV dan dikirim di tiap polling. */
export function generateScreenToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Membersihkan kode yang diketik di TV menjadi tepat 6 digit, atau null kalau tidak berbentuk
 * kode sama sekali.
 *
 * Spasi, tanda hubung, dan spasi tak-putus dibuang sebelum diperiksa — merchant membacakan kode
 * lewat telepon sebagai "123 456" atau "123-456", dan menolaknya hanya karena pemisah itu adalah
 * kegagalan yang tidak perlu.
 */
export function normalizePairingCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s -]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

export function pairingCodeExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + PAIRING_CODE_TTL_MINUTES * 60_000).toISOString();
}

/** Kode masih berlaku? Kode tanpa tanggal kedaluwarsa diperlakukan SUDAH HANGUS — gagal ke sisi aman. */
export function isPairingCodeValid(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  return Number.isFinite(ts) && ts > now.getTime();
}

/**
 * PIN yang sah: 4-6 digit.
 *
 * Deretan yang seluruhnya satu angka ("0000") dan empat tangga berurutan yang paling sering
 * dipakai ditolak di sini, bukan sekadar diberi peringatan. PIN ini menjaga layar di ruang publik
 * yang bisa dicoba siapa saja tanpa diawasi; "1234" bukan PIN, ia hanya formalitas.
 */
export function validatePin(pin: string): { ok: true } | { ok: false; error: string } {
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, error: "PIN harus 4-6 digit angka." };
  if (/^(\d)\1+$/.test(pin)) return { ok: false, error: "PIN tidak boleh angka yang sama semua, mis. 0000 — terlalu mudah ditebak." };
  if (["1234", "12345", "123456", "4321", "54321", "654321"].includes(pin)) {
    return { ok: false, error: "PIN tidak boleh angka berurutan seperti 1234 — terlalu mudah ditebak." };
  }
  return { ok: true };
}
