/**
 * Filter & ringkasan Daftar Aset — modul murni, dipakai halaman /dashboard/assets (tampilan) DAN
 * /api/assets/export (unduhan), supaya file Excel yang diunduh selalu sama persis dengan yang
 * sedang dilihat di layar. Diuji di asset-filter.test.ts.
 */

export const ASSET_CATEGORIES = ["playstation", "tv", "controller", "furniture", "vehicle", "other"] as const;
export type AssetCategoryCode = (typeof ASSET_CATEGORIES)[number];
export const ASSET_STATUSES = ["active", "under_maintenance", "disposed"] as const;
export type AssetStatusCode = (typeof ASSET_STATUSES)[number];

export interface AssetFilter {
  /** Cari di nama, catatan, alasan pelepasan, dan nama unit PS terkait. */
  q?: string;
  category?: string;
  /** "" = semua; "not_disposed" = semua kecuali yang sudah dilepas. */
  status?: string;
  /** "" = semua; "linked" = terhubung ke unit PS; "unlinked" = tidak. */
  unit?: string;
  /** YYYY-MM-DD (inklusif), dibandingkan dengan tanggal perolehan (zona outlet). */
  from?: string;
  to?: string;
}

export interface AssetLike {
  name: string;
  category: string;
  status: string;
  notes?: string | null;
  disposalReason?: string | null;
  rentalUnitId?: string | null;
  acquisitionDate: string;
  acquisitionCost: number;
  accumulatedDepreciation: number;
}

/** Tanggal (YYYY-MM-DD) di zona Asia/Jakarta — sama dengan tanggal yang tampil di outlet. */
export function assetDateYmd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function filterAssets<T extends AssetLike>(assets: T[], f: AssetFilter, unitNames: Record<string, string> = {}): T[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return assets.filter((a) => {
    if (f.category && a.category !== f.category) return false;
    if (f.status === "not_disposed") {
      if (a.status === "disposed") return false;
    } else if (f.status && a.status !== f.status) return false;
    if (f.unit === "linked" && !a.rentalUnitId) return false;
    if (f.unit === "unlinked" && a.rentalUnitId) return false;
    if (f.from || f.to) {
      const ymd = assetDateYmd(a.acquisitionDate);
      if (f.from && ymd < f.from) return false;
      if (f.to && ymd > f.to) return false;
    }
    if (q) {
      const hay = [a.name, a.notes, a.disposalReason, a.rentalUnitId ? unitNames[a.rentalUnitId] : ""].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function summarizeAssets(assets: AssetLike[]) {
  let cost = 0;
  let accumulated = 0;
  for (const a of assets) {
    cost += a.acquisitionCost || 0;
    accumulated += a.accumulatedDepreciation || 0;
  }
  return { count: assets.length, cost, accumulated, bookValue: cost - accumulated };
}

export function isFilterActive(f: AssetFilter): boolean {
  return Boolean((f.q ?? "").trim() || f.category || f.status || f.unit || f.from || f.to);
}

/** Filter → query string untuk /api/assets/export (dan sebaliknya di server). */
export function filterToParams(f: AssetFilter): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of ["q", "category", "status", "unit", "from", "to"] as const) {
    const v = (f[k] ?? "").trim();
    if (v) p.set(k, v);
  }
  return p;
}

export function filterFromParams(p: URLSearchParams): AssetFilter {
  const ymd = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    q: p.get("q") ?? undefined,
    category: p.get("category") ?? undefined,
    status: p.get("status") ?? undefined,
    unit: p.get("unit") ?? undefined,
    from: ymd(p.get("from")),
    to: ymd(p.get("to")),
  };
}
