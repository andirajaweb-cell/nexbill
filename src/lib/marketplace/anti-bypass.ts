/**
 * Penutup celah "ketemu di etalase, transaksi di luar aplikasi" pada Marketplace Antar-Outlet.
 *
 * Latar belakang: NEXBILL tidak memegang uang (tidak ada escrow — lihat db/schema.ts), jadi satu-
 * satunya tanda sebuah barang laku adalah kesepakatan yang dinyatakan selesai di aplikasi. Begitu
 * penjual dan pembeli bisa saling menghubungi SEBELUM ada kesepakatan, tidak ada lagi alasan
 * menyelesaikannya di aplikasi, dan ujrah hilang. Modul ini menegakkan tiga hal:
 *
 *   1. Kontak (No. HP) kedua pihak baru dibuka setelah penjual MENERIMA penawaran.
 *   2. Teks bebas (nama barang, keterangan, catatan penawaran) tidak boleh berisi nomor HP, link,
 *      atau akun media sosial — jalan memutar dari aturan nomor 1.
 *   3. Barang yang ditarik dari etalase wajib diberi alasan, supaya pola "ditarik setelah ada
 *      penawaran" bisa dipantau.
 *
 * Modul murni (tanpa db) — dipakai server untuk menegakkan dan layar untuk memberi tahu lebih awal.
 */

import type { DealStatus } from "./ujrah";

/* ================= 1. KAPAN KONTAK DIBUKA ================= */

/** Kontak kedua pihak terlihat hanya pada kesepakatan yang sudah diterima atau selesai. Setelah dibatalkan/ditolak, ditutup lagi. */
export function kontakBolehDibuka(status: DealStatus): boolean {
  return status === "accepted" || status === "completed";
}

/**
 * Nomor HP Indonesia untuk kontak marketplace. Menerima 08…, 628…, +62…, dengan spasi/titik/strip.
 * Disimpan dalam bentuk 08… supaya seragam dan langsung bisa diklik ke WhatsApp.
 */
export function normalisasiNoHp(input: unknown): string {
  const digit = String(input ?? "").replace(/[^\d]/g, "");
  let lokal = digit;
  if (lokal.startsWith("62")) lokal = "0" + lokal.slice(2);
  else if (lokal.startsWith("8")) lokal = "0" + lokal;
  if (!/^08[1-9]\d{7,10}$/.test(lokal)) throw new Error("No. HP tidak valid. Contoh: 0812 3456 7890.");
  return lokal;
}

/**
 * Tautan WhatsApp untuk tombol "Chat WhatsApp" di kartu kesepakatan. Toleran terhadap nomor lama
 * (sebelum migrasi 0012) yang disimpan apa adanya dengan spasi/strip/+62.
 */
export function linkWhatsApp(noHp: string): string {
  const d = noHp.replace(/\D/g, "");
  const intl = d.startsWith("62") ? d : d.startsWith("0") ? `62${d.slice(1)}` : `62${d}`;
  return `https://wa.me/${intl}`;
}

/* ================= 2. TEKS BEBAS TANPA KONTAK ================= */

/*
 * Nomor HP: deretan angka yang boleh diselingi spasi/titik/strip/kurung (maks. 2 karakter antar
 * angka). Setelah angka-angkanya digabung, dianggap nomor HP bila berpola 08[1-9]…, 628[1-9]…, atau
 * 8[1-9]…. Digit kedua setelah 8 harus 1–9 karena semua prefiks seluler Indonesia begitu — ini
 * yang mencegah rentang harga seperti "80.000-85.000" (digabung: 8000085000) ikut tertolak.
 */
const DERET_ANGKA = /\+?\d(?:[\s.\-()]{0,2}\d){8,15}/g;

function adaNomorHp(teks: string): boolean {
  for (const m of teks.match(DERET_ANGKA) ?? []) {
    const d = m.replace(/\D/g, "");
    if (/^08[1-9]\d{7,10}$/.test(d) || /^628[1-9]\d{7,10}$/.test(d) || /^8[1-9]\d{7,10}$/.test(d)) return true;
  }
  return false;
}

const POLA_KONTAK: { jenis: string; pola: RegExp }[] = [
  { jenis: "link WhatsApp", pola: /wa\.me|api\.whatsapp|chat\.whatsapp|whats\s*app|\bw\.?\s?a\b\s*[:=]?\s*\+?\d/i },
  { jenis: "Telegram", pola: /t\.me\/|telegram/i },
  { jenis: "akun media sosial", pola: /instagram|facebook\.com|fb\.com|tiktok\.com|\big\s*[:@]|\bline\s*(?:id)?\s*[:@]/i },
  { jenis: "alamat email", pola: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { jenis: "link situs", pola: /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|co\.id|id|net|org|me|ly|link)\b/i },
  // "@Rp50.000" / "@50rb" adalah cara umum menulis harga per unit, bukan akun — dikecualikan.
  { jenis: "akun media sosial", pola: /(?:^|[\s(])@(?!rp)(?!\d)[a-z0-9_.]{3,}/i },
];

/** Jenis kontak pertama yang ditemukan dalam teks, atau null bila bersih. */
export function cariKontakDalamTeks(teks: string | null | undefined): string | null {
  if (!teks) return null;
  if (adaNomorHp(teks)) return "nomor HP";
  for (const { jenis, pola } of POLA_KONTAK) if (pola.test(teks)) return jenis;
  return null;
}

/**
 * Melempar pesan yang bisa ditampilkan apa adanya bila salah satu isian berisi kontak.
 * `isian` = { "Nama Barang": "...", "Keterangan": "..." }.
 */
export function pastikanTanpaKontak(isian: Record<string, string | null | undefined>): void {
  for (const [label, teks] of Object.entries(isian)) {
    const jenis = cariKontakDalamTeks(teks);
    if (jenis) {
      throw new Error(
        `${label} berisi ${jenis}. Hapus dulu — nomor HP kedua pihak dibuka otomatis setelah penawaran diterima penjual, jadi tidak perlu ditulis di sini.`
      );
    }
  }
}

/* ================= 3. ALASAN MENARIK BARANG ================= */

export const ALASAN_TARIK = {
  sold_outside: "Terjual ke pembeli di luar jaringan NEXBILL (bukan outlet NEXBILL)",
  not_selling: "Batal dijual / dipakai sendiri",
  damaged: "Rusak atau hilang",
  other: "Lainnya",
} as const;

export type AlasanTarik = keyof typeof ALASAN_TARIK;

export function alasanTarikSah(x: unknown): x is AlasanTarik {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(ALASAN_TARIK, x);
}
