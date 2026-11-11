/**
 * Shared (client + server) constants for the platform-admin Leads/CRM module. Kept free of any
 * db/server import so the "use client" page can import it directly.
 */

/**
 * "tutup" (2026-11-12) = usahanya sudah tutup / tidak ditemukan saat dikunjungi / nomor mati — beda
 * dengan "tidak_tertarik" (pemiliknya ada tapi menolak). Disimpan di kolom teks `status` yang sama
 * (tanpa CHECK constraint di DB), jadi tidak perlu migrasi.
 */
export const LEAD_STATUSES = ["baru", "dihubungi", "follow_up", "demo", "trial", "closing", "tidak_tertarik", "tutup"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  baru: "Baru",
  dihubungi: "Sudah Dihubungi",
  follow_up: "Follow Up",
  demo: "Demo",
  trial: "Trial",
  closing: "Closing (Jadi Pelanggan)",
  tidak_tertarik: "Tidak Tertarik",
  tutup: "Tutup / Tidak Ada",
};

/** Statuses where the pipeline is finished — no follow-up reminder is ever "due" for these. */
export const LEAD_CLOSED_STATUSES: LeadStatus[] = ["closing", "tidak_tertarik", "tutup"];

/** Lost states — shown beside the funnel, never inside it. */
export const LEAD_LOST_STATUSES: LeadStatus[] = ["tidak_tertarik", "tutup"];

/**
 * Status awal saat menyimpan hasil Google Maps: tempat yang ditandai Google "CLOSED_PERMANENTLY"
 * langsung masuk "tutup" supaya tidak ikut dihubungi/dikunjungi. Tutup sementara tetap "baru".
 */
export function initialLeadStatus(businessStatus: string | null | undefined): LeadStatus {
  return businessStatus === "CLOSED_PERMANENTLY" ? "tutup" : "baru";
}

/**
 * Pipeline order for the funnel view ("% lolos" per stage). "tidak_tertarik" and "tutup" are lost
 * states, not stages, so they're left out of the funnel math.
 */
export const LEAD_FUNNEL: LeadStatus[] = ["baru", "dihubungi", "follow_up", "demo", "trial", "closing"];

/** Priority = public signals (reviews, multi-branch, PS5, café/24h) — decides who gets visited first. */
export const LEAD_PRIORITIES = ["A", "B", "C"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export const LEAD_PRIORITY_LABEL: Record<LeadPriority, string> = {
  A: "A · kunjungi langsung",
  B: "B · WA dulu",
  C: "C · saat lewat area",
};

/** Temperature = the merchant's own intent. "hot" only after the merchant showed direct interest. */
export const LEAD_TEMPERATURES = ["hot", "warm", "cold"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];
export const LEAD_TEMPERATURE_LABEL: Record<LeadTemperature, string> = { hot: "HOT", warm: "WARM", cold: "COLD" };

/**
 * Home base for field sales — distance on the CRM list is measured from here, so "urut jarak" gives
 * a visiting route (density over distance). XTREAM ps, Majalaya.
 */
export const LEAD_BASE = { name: "XTREAM ps (Majalaya)", lat: -7.0445564, lng: 107.7670479 } as const;

/** Straight-line distance in km (haversine), rounded to 0.1 km. Null when a coordinate is missing. */
export function distanceKm(lat: number | null | undefined, lng: number | null | undefined, from: { lat: number; lng: number } = LEAD_BASE): number | null {
  if (lat == null || lng == null) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - from.lat);
  const dLng = rad(lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

export const LEAD_ACTIVITY_TYPES = ["catatan", "whatsapp", "telepon", "kunjungan", "demo", "email", "status"] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const LEAD_ACTIVITY_LABEL: Record<LeadActivityType, string> = {
  catatan: "Catatan",
  whatsapp: "Chat WhatsApp",
  telepon: "Telepon",
  kunjungan: "Kunjungan",
  demo: "Demo Aplikasi",
  email: "Email",
  status: "Perubahan Status",
};

/** Activity types that count as actually reaching out to the lead (updates lastContactedAt). */
export const LEAD_CONTACT_ACTIVITY_TYPES: LeadActivityType[] = ["whatsapp", "telepon", "kunjungan", "demo", "email"];

export const LEAD_SOURCES = ["google_maps", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** One normalized Google Maps search result, as returned by /api/platform-admin/leads/search. */
export interface PlaceResult {
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  waNumber: string | null;
  website: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  businessStatus: string | null;
}
