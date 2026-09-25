import type { PlaceResult } from "./constants";

/**
 * Google Maps lead search for the platform-admin CRM — goes through the OFFICIAL Places API (New)
 * Text Search, not by scraping maps.google.com. Scraping breaks Google's ToS, gets CAPTCHA'd within
 * a few pages, and needs a headless browser that can't run on Vercel anyway; the API is stable and
 * returns the same public business info (name, address, phone, website, rating).
 *
 * Cost note: the field mask below includes phone/website/rating, which puts every call in the
 * "Text Search Enterprise" SKU (Google bills per request/page of up to 20 results, with a monthly
 * free allowance). Every page fetched is one billed request — the UI only fetches the next page when
 * the admin asks for it.
 *
 * Requires GOOGLE_MAPS_API_KEY (server-only, never exposed to the browser) with "Places API (New)"
 * enabled on the Google Cloud project and billing active.
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "nextPageToken",
].join(",");

interface RawAddressComponent {
  longText?: string;
  types?: string[];
}

export interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: RawAddressComponent[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

/**
 * Turns an Indonesian phone number into the digits-only form wa.me expects (e.g. "0812-3456-7890"
 * or "+62 812-3456-7890" → "6281234567890"). Returns null for anything that isn't an Indonesian
 * MOBILE number (62 8xx) — landlines like 021-xxx almost never have WhatsApp, and a dead wa.me link
 * wastes the admin's time.
 */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  if (!/^628\d{7,12}$/.test(digits)) return null;
  return digits;
}

/** Kota/Kabupaten from the structured address — administrative_area_level_2 in Indonesia, locality as fallback. */
function pickCity(components: RawAddressComponent[] | undefined): string | null {
  if (!components) return null;
  const byType = (t: string) => components.find((c) => c.types?.includes(t))?.longText ?? null;
  return byType("administrative_area_level_2") ?? byType("locality");
}

export function normalizePlace(raw: RawPlace): PlaceResult | null {
  if (!raw.id || !raw.displayName?.text) return null;
  const phone = raw.nationalPhoneNumber ?? raw.internationalPhoneNumber ?? null;
  return {
    placeId: raw.id,
    name: raw.displayName.text,
    category: raw.primaryTypeDisplayName?.text ?? null,
    address: raw.formattedAddress ?? null,
    city: pickCity(raw.addressComponents),
    phone,
    waNumber: toWhatsappNumber(raw.internationalPhoneNumber ?? raw.nationalPhoneNumber),
    website: raw.websiteUri ?? null,
    mapsUrl: raw.googleMapsUri ?? null,
    lat: raw.location?.latitude ?? null,
    lng: raw.location?.longitude ?? null,
    rating: raw.rating ?? null,
    reviewCount: raw.userRatingCount ?? null,
    businessStatus: raw.businessStatus ?? null,
  };
}

export function isPlacesConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

/** One page (max 20) of Text Search results. Pass the previous response's nextPageToken with the SAME textQuery to get the next page (Google caps a query at 60 results / 3 pages). */
export async function searchPlaces(textQuery: string, pageToken?: string): Promise<{ results: PlaceResult[]; nextPageToken: string | null }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY belum diisi di environment server.");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "id",
      regionCode: "ID",
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Google Places API menolak permintaan: ${message}`);
  }

  const results = ((data?.places ?? []) as RawPlace[]).map(normalizePlace).filter((p): p is PlaceResult => p !== null);
  return { results, nextPageToken: data?.nextPageToken ?? null };
}
