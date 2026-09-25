/**
 * Shared (client + server) constants for the platform-admin Leads/CRM module. Kept free of any
 * db/server import so the "use client" page can import it directly.
 */

export const LEAD_STATUSES = ["baru", "dihubungi", "follow_up", "demo", "trial", "closing", "tidak_tertarik"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  baru: "Baru",
  dihubungi: "Sudah Dihubungi",
  follow_up: "Follow Up",
  demo: "Demo",
  trial: "Trial",
  closing: "Closing (Jadi Pelanggan)",
  tidak_tertarik: "Tidak Tertarik",
};

/** Statuses where the pipeline is finished — no follow-up reminder is ever "due" for these. */
export const LEAD_CLOSED_STATUSES: LeadStatus[] = ["closing", "tidak_tertarik"];

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
