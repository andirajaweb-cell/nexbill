/**
 * Aturan murni Banner Iklan halaman booking publik (diuji di banner-rules.test.ts).
 *
 * Bug yang ditutup 2026-11-11: link banner disimpan apa adanya lalu dipasang sebagai href di
 * halaman publik /book/[slug] — "javascript:..." akan berjalan di browser pengunjung (XSS
 * tersimpan), dan "instagram.com/outlet" tanpa https:// jadi link relatif yang rusak.
 */

export const BANNER_TITLE_MAX = 120;
export const BANNER_LINK_MAX = 500;
export const BANNER_MAX_BYTES = 3 * 1024 * 1024;
export const BANNER_ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".webp"] as const;

export class BannerInputError extends Error {
  status = 400;
}

/** Link tujuan banner → URL http(s) yang aman, atau null bila kosong. Tanpa skema → https://. */
export function normalizeBannerLink(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new BannerInputError("Link banner tidak valid.");
  let v = raw.trim();
  if (!v) return null;
  if (v.length > BANNER_LINK_MAX) throw new BannerInputError(`Link banner maksimal ${BANNER_LINK_MAX} karakter.`);
  if (/^wa\.me\//i.test(v) || !/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v.replace(/^\/+/, "")}`;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new BannerInputError("Link banner tidak valid. Contoh: https://instagram.com/outletkamu");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new BannerInputError("Link banner harus diawali http:// atau https://.");
  if (!url.hostname.includes(".")) throw new BannerInputError("Link banner tidak valid. Contoh: https://instagram.com/outletkamu");
  return url.toString();
}

/** Judul banner (alt text) — dirapikan, maksimal 120 karakter, null bila kosong. */
export function normalizeBannerTitle(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new BannerInputError("Judul banner tidak valid.");
  const v = raw.trim().replace(/\s+/g, " ");
  if (!v) return null;
  return v.slice(0, BANNER_TITLE_MAX);
}

/** Dipakai halaman publik: hanya http(s) yang dipasang sebagai link (data lama yang belum divalidasi). */
export function safeBannerHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Urutan baru dari daftar id: hanya id milik outlet, tanpa duplikat; id yang tidak disebut tetap di belakang. */
export function resolveBannerOrder(requested: unknown, ownedIds: string[]): string[] {
  const owned = new Set(ownedIds);
  const seen = new Set<string>();
  const out: string[] = [];
  if (Array.isArray(requested)) {
    for (const id of requested) {
      if (typeof id === "string" && owned.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  for (const id of ownedIds) if (!seen.has(id)) out.push(id);
  return out;
}

export function bannerFileProblem(name: string, size: number): string | null {
  const ext = (name.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
  if (!(BANNER_ALLOWED_EXT as readonly string[]).includes(ext)) return "Format banner harus PNG, JPG, atau WEBP.";
  if (size > BANNER_MAX_BYTES) return "Ukuran gambar banner maksimal 3MB.";
  return null;
}
