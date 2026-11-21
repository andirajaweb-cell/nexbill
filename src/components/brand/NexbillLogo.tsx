/* eslint-disable @next/next/no-img-element */
import { clsx } from "clsx";

/**
 * Logo resmi NEXBILL — satu sumber untuk nexbill.id, dashboard, platform-admin, dan layar TV.
 * Berkas di public/brand/ dibuat dari logo yang diserahkan pemilik (versi 2026-11-21, huruf "X"
 * bermotif jalur sirkuit), dipangkas tanpa tepi kosong:
 *  - wordmark: tulisan "Nexbill" (rasio 3,76 : 1)
 *  - mark: simbol "X" saja (rasio 0,88 : 1), untuk tempat sempit (sidebar diciutkan, ikon)
 * Masing-masing punya versi putih (untuk latar gelap) dan hitam (untuk latar terang).
 *
 * tone "auto" (bawaan) mengikuti mode tampilan: dua gambar dirender, CSS di globals.css
 * menampilkan versi putih di mode gelap dan versi hitam saat <html> memakai kelas `theme-light`
 * (saklar Terang/Gelap dashboard, lib/ui/dashboard-theme.tsx). Tanpa JavaScript, jadi tidak ada
 * kedipan logo yang salah saat halaman dimuat. Halaman yang selalu gelap (situs, login, TV) tetap
 * benar karena kelas itu tidak pernah ada di sana.
 */
const SRC = {
  wordmark: { white: "/brand/nexbill-wordmark-white.png", black: "/brand/nexbill-wordmark-black.png", ratio: 903 / 240 },
  mark: { white: "/brand/nexbill-mark-white.png", black: "/brand/nexbill-mark-black.png", ratio: 226 / 256 },
} as const;

export type NexbillLogoVariant = keyof typeof SRC;

export function NexbillLogo({
  variant = "wordmark",
  tone = "auto",
  height = 24,
  className,
  alt = "NEXBILL",
}: {
  variant?: NexbillLogoVariant;
  /** "auto" mengikuti mode terang/gelap; "white" khusus latar gelap; "black" khusus latar terang/cetak. */
  tone?: "auto" | "white" | "black";
  /** Tinggi tampil dalam px; lebar mengikuti rasio logo. */
  height?: number;
  className?: string;
  /** Kosongkan ("") bila teks NEXBILL sudah ada di sebelahnya (dekoratif). */
  alt?: string;
}) {
  const s = SRC[variant];
  const width = Math.round(height * s.ratio);
  const img = (src: string, extra?: string, hidden?: boolean) => (
    <img
      src={src}
      alt={hidden ? "" : alt}
      aria-hidden={hidden || undefined}
      width={width}
      height={height}
      draggable={false}
      className={clsx("inline-block shrink-0 select-none", extra, className)}
      style={{ height, width: "auto" }}
    />
  );
  if (tone === "white") return img(s.white);
  if (tone === "black") return img(s.black);
  return (
    <>
      {img(s.white, "nb-logo-on-dark")}
      {img(s.black, "nb-logo-on-light", true)}
    </>
  );
}
