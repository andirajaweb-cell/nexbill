/* eslint-disable @next/next/no-img-element */
import { clsx } from "clsx";

/**
 * Logo resmi NEXBILL (2026-11-17) — satu sumber untuk nexbill.id, dashboard, platform-admin, dan
 * layar TV. Berkas di public/brand/ dibuat dari logo yang diserahkan pemilik (dipangkas tanpa tepi
 * kosong):
 *  - wordmark: tulisan "NEXBILL" (rasio 4,55 : 1), putih untuk latar gelap, hitam untuk latar terang
 *  - mark: simbol "N" saja (rasio 0,75 : 1), untuk tempat sempit (sidebar diciutkan, ikon)
 * <img> biasa (bukan next/image) karena berkasnya kecil & statis, dan dipakai juga di halaman yang
 * dirender di luar pipeline gambar Next (loading screen, TV).
 */
const SRC = {
  wordmark: { white: "/brand/nexbill-wordmark-white.png", black: "/brand/nexbill-wordmark-black.png", ratio: 1091 / 240 },
  mark: { white: "/brand/nexbill-mark-white.png", black: "/brand/nexbill-mark-white.png", ratio: 192 / 256 },
} as const;

export type NexbillLogoVariant = keyof typeof SRC;

export function NexbillLogo({
  variant = "wordmark",
  tone = "white",
  height = 24,
  className,
  alt = "NEXBILL",
}: {
  variant?: NexbillLogoVariant;
  /** "white" untuk latar gelap (bawaan seluruh aplikasi), "black" untuk latar terang/cetak. */
  tone?: "white" | "black";
  /** Tinggi tampil dalam px; lebar mengikuti rasio logo. */
  height?: number;
  className?: string;
  /** Kosongkan ("") bila teks NEXBILL sudah ada di sebelahnya (dekoratif). */
  alt?: string;
}) {
  const s = SRC[variant];
  const src = variant === "mark" && tone === "black" ? s.white : s[tone];
  return (
    <img
      src={src}
      alt={alt}
      width={Math.round(height * s.ratio)}
      height={height}
      draggable={false}
      className={clsx("inline-block shrink-0 select-none", variant === "mark" && tone === "black" && "invert", className)}
      style={{ height, width: "auto" }}
    />
  );
}
