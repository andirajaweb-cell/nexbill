/**
 * Profil publik halaman booking (/book/[slug]) — logika murni: lokasi (geo tag) & petunjuk arah,
 * nomor WhatsApp admin, dan batas foto. Aman diimpor dari halaman "use client".
 */
import { normalizePhone } from "./no-show-core";

export const MAX_PUBLIC_PHOTOS = 8;
export const MAX_PUBLIC_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_WHATSAPP_CONTACTS = 10;
export const WHATSAPP_LABEL_MAX = 40;

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/**
 * Ambil koordinat dari link Google Maps yang ditempel pemilik:
 *   …/@-6.2,106.8,17z · …?q=-6.2,106.8 · …?query=-6.2,106.8 · …!3d-6.2!4d106.8 · "-6.2, 106.8"
 * Link pendek (maps.app.goo.gl) tidak memuat koordinat — null (link tetap disimpan apa adanya).
 */
export function parseLatLngFromText(text: string | null | undefined): { lat: number; lng: number } | null {
  const s = String(text ?? "").trim();
  if (!s) return null;
  const pats = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|destination|ll|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  ];
  for (const p of pats) {
    const m = s.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isValidLatLng(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/** Hanya link http(s) yang disimpan sebagai link peta (mencegah javascript: dsb.). */
export function cleanMapsUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** URL "petunjuk arah" Google Maps: koordinat > link peta pemilik > alamat. null bila tidak ada apa pun. */
export function directionsUrl(p: { latitude?: number | null; longitude?: number | null; mapsUrl?: string | null; address?: string | null }): string | null {
  if (isValidLatLng(p.latitude, p.longitude)) return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  if (p.mapsUrl) return p.mapsUrl;
  const a = (p.address ?? "").trim();
  return a ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}` : null;
}

/** Peta tersemat (tanpa API key) bila koordinat ada. */
export function mapEmbedUrl(p: { latitude?: number | null; longitude?: number | null }): string | null {
  return isValidLatLng(p.latitude, p.longitude) ? `https://maps.google.com/maps?q=${p.latitude},${p.longitude}&z=16&output=embed` : null;
}

/** Link wa.me untuk satu nomor, dengan pesan pembuka opsional. */
export function whatsappLink(phone: string, text?: string): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function cleanWhatsappLabel(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, WHATSAPP_LABEL_MAX);
}
