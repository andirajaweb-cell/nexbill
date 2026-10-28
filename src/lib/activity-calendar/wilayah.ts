/**
 * Daftar wilayah administrasi (provinsi → kab/kota → kecamatan → desa/kelurahan) untuk memilih lokasi
 * BMKG. Sumber: wilayah.id (data Kepmendagri, format kode sama dengan adm4 BMKG, mis. 31.71.03.1001).
 * Gratis & publik; respons disimpan di memori server 24 jam (daftar wilayah jarang berubah) dan di
 * browser oleh halaman. Kode wilayah juga bisa diketik langsung bila layanan ini sedang tidak tersedia.
 */
import { fetchJson } from "./http";

const BASE = (process.env.WILAYAH_API_URL || "https://wilayah.id/api").replace(/\/$/, "");

export type WilayahLevel = "provinces" | "regencies" | "districts" | "villages";
export interface WilayahItem {
  code: string;
  name: string;
}

const PARENT_RE: Record<Exclude<WilayahLevel, "provinces">, RegExp> = {
  regencies: /^\d{2}$/,
  districts: /^\d{2}\.\d{2}$/,
  villages: /^\d{2}\.\d{2}\.\d{2}$/,
};

export function validWilayahRequest(level: string, parent: string | null): level is WilayahLevel {
  if (level === "provinces") return true;
  if (level !== "regencies" && level !== "districts" && level !== "villages") return false;
  return !!parent && PARENT_RE[level].test(parent);
}

const memo = new Map<string, { at: number; items: WilayahItem[] }>();

export async function listWilayah(level: WilayahLevel, parent: string | null): Promise<WilayahItem[]> {
  const path = level === "provinces" ? "/provinces.json" : `/${level}/${parent}.json`;
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.items;
  const { json } = await fetchJson(`${BASE}${path}`, { label: "wilayah.id", timeoutMs: 8000, retries: 1 });
  const data = (json as { data?: unknown })?.data;
  const items = (Array.isArray(data) ? data : [])
    .map((x) => x as { code?: unknown; name?: unknown })
    .filter((x): x is { code: string; name: string } => typeof x.code === "string" && typeof x.name === "string")
    .map((x) => ({ code: x.code, name: x.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  memo.set(path, { at: Date.now(), items });
  return items;
}
