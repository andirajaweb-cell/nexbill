/**
 * Foto barang Marketplace Antar-Outlet. Modul murni (tanpa db/env) supaya bisa dipakai server dan
 * layar sekaligus, dan diuji tanpa basis data.
 */

export const MAX_FOTO_BARANG = 5;
export const BUCKET_FOTO_MARKETPLACE = "marketplace";

/**
 * Menerima hanya URL publik dari bucket Storage "marketplace" milik NEXBILL sendiri.
 *
 * Kenapa dibatasi: foto ini tampil di layar outlet LAIN. Kalau URL apa pun diterima, penjual bisa
 * menaruh gambar dari server mana saja — piksel pelacak yang mencatat alamat IP setiap outlet yang
 * membuka etalase, atau gambar yang berubah isinya setelah dipasang. Dengan hanya menerima berkas
 * yang diunggah lewat /api/marketplace/upload, isi foto tetap seperti saat dipasang.
 *
 * Mengembalikan daftar yang sudah dibersihkan (duplikat dibuang, urutan dipertahankan) atau
 * melempar pesan yang bisa ditampilkan apa adanya ke pengguna.
 */
export function bersihkanFotoBarang(input: unknown, supabaseUrl: string | undefined): string[] {
  if (input == null) return [];
  if (!Array.isArray(input)) throw new Error("Format foto tidak valid.");

  const awalan = supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_FOTO_MARKETPLACE}/` : null;
  const hasil: string[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !item.trim()) continue;
    const url = item.trim();
    if (!awalan || !url.startsWith(awalan) || url.includes("..")) {
      throw new Error("Foto harus diunggah lewat tombol Tambah Foto di halaman ini.");
    }
    if (!hasil.includes(url)) hasil.push(url);
  }
  if (hasil.length > MAX_FOTO_BARANG) throw new Error(`Maksimal ${MAX_FOTO_BARANG} foto per barang.`);
  return hasil;
}

/**
 * Daftar foto sebuah listing untuk ditampilkan. Barang lama (sebelum migrasi 0012) hanya punya
 * image_url — dibaca sebagai satu foto. JSON yang rusak tidak boleh membuat etalase gagal dimuat;
 * jatuh kembali ke image_url.
 */
export function daftarFotoBarang(row: { imageUrl?: string | null; imageUrls?: string | null }): string[] {
  if (row.imageUrls) {
    try {
      const parsed = JSON.parse(row.imageUrls);
      if (Array.isArray(parsed)) {
        const urls = parsed.filter((u): u is string => typeof u === "string" && u.length > 0).slice(0, MAX_FOTO_BARANG);
        if (urls.length > 0) return urls;
      }
    } catch {
      /* jatuh ke image_url */
    }
  }
  return row.imageUrl ? [row.imageUrl] : [];
}
