"use client";
import { useRef, useState } from "react";

/**
 * Penjaga klik ganda untuk aksi yang menyimpan data (Simpan, Submit, Bayar, Approve, Batalkan…).
 *
 * `disabled={loading}` saja TIDAK cukup: state React baru terpasang setelah render berikutnya, dan
 * dua klik yang sangat cepat (atau tombol Enter + klik) bisa sama-sama lolos sebelum tombolnya
 * sempat nonaktif — itulah asal expense ganda seperti EXP-00171 & EXP-00181 "Gaji Ahmad". Hook ini
 * memakai ref yang berubah SEKETIKA, jadi panggilan kedua dengan kunci yang sama langsung ditolak,
 * sementara state `sibuk` dipakai untuk menampilkan "Menyimpan..." dan menonaktifkan tombol.
 *
 * Kunci memisahkan aksi yang boleh berjalan bersamaan: mis. "create" vs `row:${id}` untuk tombol
 * per baris, sehingga memproses satu baris tidak mengunci baris lain.
 */
export function useProsesTunggal() {
  const berjalan = useRef(new Set<string>());
  const [, setVersi] = useState(0);

  async function jalankan<T>(kunci: string, fn: () => Promise<T>): Promise<T | undefined> {
    if (berjalan.current.has(kunci)) return undefined;
    berjalan.current.add(kunci);
    setVersi((v) => v + 1);
    try {
      return await fn();
    } finally {
      berjalan.current.delete(kunci);
      setVersi((v) => v + 1);
    }
  }

  return {
    jalankan,
    /** True selama aksi dengan kunci ini berjalan. */
    sibuk: (kunci: string) => berjalan.current.has(kunci),
    /** True selama aksi APA PUN berjalan. */
    adaYangSibuk: () => berjalan.current.size > 0,
  };
}
