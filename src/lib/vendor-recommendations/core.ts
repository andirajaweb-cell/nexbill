/**
 * Rekomendasi vendor — logika murni (tanpa db), dipakai server, klien, dan test.
 *
 * Kartu ini adalah "solusi tambahan" untuk outlet (mis. Fastpay di halaman PPOB untuk menambah
 * sumber pendapatan), bukan iklan bebas: isinya dikurasi tim NEXBILL di platform-admin, hanya tampil
 * ke Owner/Manager di negara yang relevan, bisa disembunyikan outlet, dan selalu memuat keterangan
 * bahwa tautannya tautan mitra (transparan soal komisi referral).
 */

export const VENDOR_REC_PLACEMENTS = ["ppob"] as const;
export type VendorRecPlacement = (typeof VENDOR_REC_PLACEMENTS)[number];

export const VENDOR_REC_TARGETS = ["primary", "secondary", "info"] as const;
export type VendorRecTarget = (typeof VENDOR_REC_TARGETS)[number];

export type VendorRecEvent = "impression" | "click" | "dismiss";

/** Satu outlet dihitung "melihat" paling banyak sekali per jendela ini. */
export const IMPRESSION_DEDUPE_HOURS = 12;
/** Kartu yang disembunyikan outlet muncul lagi setelah sekian hari. */
export const DISMISS_DAYS = 30;

export interface VendorRecRow {
  id: string;
  placement: string;
  vendorName: string;
  badge: string | null;
  headline: string;
  body: string | null;
  benefitsJson: string | null;
  promoText: string | null;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string | null;
  secondaryUrl: string | null;
  infoLabel: string | null;
  infoUrl: string | null;
  logoUrl: string | null;
  footnote: string | null;
  disclosure: string | null;
  countries: string;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

/** Bentuk yang dikirim ke dashboard outlet — URL tujuan TIDAK ikut (klik lewat /go agar tercatat). */
export interface VendorRecPublic {
  id: string;
  vendorName: string;
  badge: string | null;
  headline: string;
  body: string | null;
  benefits: string[];
  promoText: string | null;
  logoUrl: string | null;
  footnote: string | null;
  disclosure: string | null;
  ctas: { target: VendorRecTarget; label: string }[];
}

export function parseBenefits(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : [];
  } catch {
    return [];
  }
}

/** Hanya http(s) — mencegah javascript:/data: tersimpan sebagai tujuan tautan. */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** countries = "ID" / "ID,MY" / "*" (semua). Outlet tanpa negara dianggap Indonesia (bawaan NEXBILL). */
export function matchesCountry(countries: string, outletCountry: string | null | undefined): boolean {
  const list = countries
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (list.length === 0 || list.includes("*")) return true;
  return list.includes((outletCountry || "ID").toUpperCase());
}

export function isLive(rec: Pick<VendorRecRow, "isActive" | "startsAt" | "endsAt">, now: Date = new Date()): boolean {
  if (!rec.isActive) return false;
  const t = now.getTime();
  if (rec.startsAt && Date.parse(rec.startsAt) > t) return false;
  if (rec.endsAt && Date.parse(rec.endsAt) < t) return false;
  return true;
}

export function urlForTarget(rec: VendorRecRow, target: string): string | null {
  const url = target === "secondary" ? rec.secondaryUrl : target === "info" ? rec.infoUrl : rec.primaryUrl;
  return url && isSafeHttpUrl(url) ? url : null;
}

export function toPublic(rec: VendorRecRow): VendorRecPublic {
  const ctas: VendorRecPublic["ctas"] = [];
  if (isSafeHttpUrl(rec.primaryUrl)) ctas.push({ target: "primary", label: rec.primaryLabel });
  if (rec.secondaryLabel && isSafeHttpUrl(rec.secondaryUrl)) ctas.push({ target: "secondary", label: rec.secondaryLabel });
  if (rec.infoLabel && isSafeHttpUrl(rec.infoUrl)) ctas.push({ target: "info", label: rec.infoLabel });
  return {
    id: rec.id,
    vendorName: rec.vendorName,
    badge: rec.badge,
    headline: rec.headline,
    body: rec.body,
    benefits: parseBenefits(rec.benefitsJson),
    promoText: rec.promoText,
    logoUrl: rec.logoUrl && (isSafeHttpUrl(rec.logoUrl) || /^\/(?!\/)/.test(rec.logoUrl)) ? rec.logoUrl : null,
    footnote: rec.footnote,
    disclosure: rec.disclosure,
    ctas,
  };
}

/* ---------------- Indikator performa ---------------- */

export interface VendorRecEventRow {
  outletId: string | null;
  event: string;
  target: string | null;
  createdAt: string;
}

export interface VendorRecStats {
  impressions: number;
  outletsSeen: number;
  clicks: number;
  outletsClicked: number;
  clicksByTarget: Record<VendorRecTarget, number>;
  dismisses: number;
  /** outletsClicked / outletsSeen (0..1), null bila belum ada yang melihat. */
  ctr: number | null;
  /** dismiss outlet / outletsSeen (0..1). */
  dismissRate: number | null;
}

export function summarizeEvents(rows: VendorRecEventRow[], since: Date | null = null): VendorRecStats {
  const from = since ? since.getTime() : -Infinity;
  const inRange = rows.filter((r) => Date.parse(r.createdAt) >= from);
  const seen = new Set<string>();
  const clicked = new Set<string>();
  const dismissed = new Set<string>();
  const byTarget: Record<VendorRecTarget, number> = { primary: 0, secondary: 0, info: 0 };
  let impressions = 0;
  let clicks = 0;
  let dismisses = 0;
  for (const r of inRange) {
    const o = r.outletId ?? "(tanpa outlet)";
    if (r.event === "impression") {
      impressions++;
      seen.add(o);
    } else if (r.event === "click") {
      clicks++;
      clicked.add(o);
      seen.add(o); // klik selalu berarti kartu terlihat
      const t = (VENDOR_REC_TARGETS as readonly string[]).includes(r.target ?? "") ? (r.target as VendorRecTarget) : "primary";
      byTarget[t]++;
    } else if (r.event === "dismiss") {
      dismisses++;
      dismissed.add(o);
      seen.add(o);
    }
  }
  return {
    impressions,
    outletsSeen: seen.size,
    clicks,
    outletsClicked: clicked.size,
    clicksByTarget: byTarget,
    dismisses,
    ctr: seen.size ? clicked.size / seen.size : null,
    dismissRate: seen.size ? dismissed.size / seen.size : null,
  };
}

/** Tanggal kalender WIB (UTC+7) dari ISO — dasbor NEXBILL berpatokan waktu Indonesia. */
export function wibDay(iso: string): string {
  return new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Deret harian `days` hari terakhir (WIB): outlet yang melihat & outlet yang klik per hari. */
export function dailySeries(rows: VendorRecEventRow[], days: number, now: Date = new Date()): { day: string; seen: number; clicked: number }[] {
  const out: { day: string; seen: number; clicked: number }[] = [];
  const index = new Map<string, { seen: Set<string>; clicked: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    const day = wibDay(new Date(now.getTime() - i * 86_400_000).toISOString());
    index.set(day, { seen: new Set(), clicked: new Set() });
  }
  for (const r of rows) {
    const bucket = index.get(wibDay(r.createdAt));
    if (!bucket) continue;
    const o = r.outletId ?? "(tanpa outlet)";
    bucket.seen.add(o);
    if (r.event === "click") bucket.clicked.add(o);
  }
  for (const [day, b] of index) out.push({ day, seen: b.seen.size, clicked: b.clicked.size });
  return out;
}
