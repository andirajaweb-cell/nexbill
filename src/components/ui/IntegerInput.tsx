"use client";
import { useEffect, useState, type InputHTMLAttributes } from "react";

/**
 * Kolom angka bulat yang bisa dikosongkan sementara saat mengetik.
 *
 * Pola lama `value={n} onChange={(e) => set(Math.max(1, Number(e.target.value) || 1))}` membuat
 * kolom MUSTAHIL dikosongkan: begitu "1" dihapus, nilainya langsung kembali ke 1, sehingga untuk
 * mengisi "2" yang terketik malah "12" (atau tertolak batas max). Di HP hampir tidak bisa dipakai —
 * itulah laporan "tidak bisa buat angka 2 karena 1 muncul" di formulir Daftar.
 *
 * Di sini teks yang sedang diketik disimpan sendiri. Nilai baru diteruskan ke induk setiap kali
 * teks membentuk angka bulat yang sah di dalam [min, max]; saat kolom ditinggalkan (blur) teksnya
 * dirapikan ke nilai sah terdekat. Fokus otomatis memblok seluruh isi supaya langsung tertimpa.
 */
export function IntegerInput({
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  onBlur,
  onFocus,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max"> & {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Nilai dari luar berubah (mis. tombol reset) saat kolom tidak sedang diketik → ikuti.
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      min={min}
      max={max === Number.MAX_SAFE_INTEGER ? undefined : max}
      step={1}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = parseIntegerInRange(raw, min, max);
        if (n !== null) onValueChange(n);
      }}
      onBlur={(e) => {
        setFocused(false);
        const n = clampInteger(text, min, max, value);
        setText(String(n));
        if (n !== value) onValueChange(n);
        onBlur?.(e);
      }}
    />
  );
}

/** Angka bulat sah di dalam [min, max], atau null kalau belum/tidak sah (mis. kosong, "1.5"). */
export function parseIntegerInRange(raw: string, min: number, max: number): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/** Nilai akhir saat kolom ditinggalkan: kosong → nilai terakhir yang sah; di luar batas → dijepit. */
export function clampInteger(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return Math.min(max, Math.max(min, fallback));
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return Math.min(max, Math.max(min, fallback));
  return Math.min(max, Math.max(min, n));
}
