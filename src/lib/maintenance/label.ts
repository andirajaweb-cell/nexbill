import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Label tiket maintenance yang dicetak dan ditempel di barang yang diperbaiki (2026-11-22).
 * Murni (tanpa DB/React), diuji di label.test.ts — dipakai halaman /dashboard/maintenance/label.
 */

export type LabelSize = "thermal58" | "thermal80" | "label100x50" | "a6";
export const LABEL_SIZES: LabelSize[] = ["thermal58", "thermal80", "label100x50", "a6"];

/** Lebar isi label & ukuran halaman cetak. Rol thermal tidak memaksa tinggi halaman (driver printer yang menentukan). */
export const LABEL_PAGE: Record<LabelSize, { widthMm: number; page: string | null; compact: boolean }> = {
  thermal58: { widthMm: 48, page: null, compact: false },
  thermal80: { widthMm: 72, page: null, compact: false },
  label100x50: { widthMm: 96, page: "100mm 50mm", compact: true },
  a6: { widthMm: 97, page: "A6", compact: false },
};

export function isLabelSize(v: unknown): v is LabelSize {
  return typeof v === "string" && (LABEL_SIZES as string[]).includes(v);
}

/**
 * Nomor tiket yang mudah dibaca & dicari: MT-YYMMDD-XXXX — tanggal masuk (kalender outlet) +
 * 4 karakter pertama id. Tabel tiket tidak punya nomor urut sendiri; id tetap unik, jadi nomor ini
 * stabil dan tidak butuh migrasi.
 */
export function maintenanceTicketNumber(t: { id: string; maintenanceDate: string }): string {
  const d = new Date(t.maintenanceDate);
  const ymd = Number.isFinite(d.getTime()) ? outletDateYmd(d).replace(/-/g, "").slice(2) : "000000";
  return `MT-${ymd}-${t.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()}`;
}

/** "?ids=a,b,c" → daftar id unik, maks. 50 label sekali cetak. */
export function parseLabelIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{4,64}$/.test(s)))].slice(0, 50);
}

/** Potong teks panjang untuk label kecil tanpa memotong di tengah kata bila bisa. */
export function clampText(text: string | null | undefined, max: number): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}
