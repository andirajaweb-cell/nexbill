/**
 * Thin server-only client for the Biteship API (https://biteship.com/id/docs) — used to price
 * shipping for physical Smart Plug orders bought through the Billing page's etalase (see
 * checkoutCart in lib/subscription/service.ts). Never imported from client components; both
 * routes that use this (api/shipping/areas, api/shipping/rates) run server-side only, so
 * BITESHIP_API_KEY never reaches the browser.
 *
 * Auth: per Biteship's docs, the raw API key IS the header value — no "Bearer "/"Basic " prefix.
 *
 * Rates accuracy: this uses the "by Area ID" request shape (Biteship's own docs call this
 * "High" accuracy vs. "Medium" for postal code / "Low" for raw coordinates), since Indonesian
 * couriers price by kecamatan (district), not by postal code alone — a postal code can span more
 * than one district and vice versa. That's why checkout requires picking a destination AREA via
 * searchAreas() (an autocomplete) rather than just typing a postal code.
 */

const BASE_URL = "https://api.biteship.com/v1";

/**
 * Reads a Biteship response as text first (not res.json() directly) so a non-JSON error body
 * (proxy/gateway error pages, plain-text 4xx responses, etc.) doesn't just silently collapse into
 * "null" and a useless generic error message. On any failure, logs the real status + raw body to
 * the server console (visible in your `npm run dev` terminal) — check there whenever the UI shows
 * a generic "Gagal ..." message with no specific reason.
 */
async function parseBiteshipResponse(res: Response, label: string): Promise<any> {
  const rawText = await res.text();
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    // non-JSON body — data stays null, raw text still gets logged below
  }
  if (!res.ok || !data?.success) {
    console.error(`[biteship] ${label} failed — HTTP ${res.status} ${res.statusText}. Raw body:`, rawText.slice(0, 2000));
  }
  return data;
}

function apiKey(): string {
  const key = process.env.BITESHIP_API_KEY;
  if (!key) throw new Error("BITESHIP_API_KEY belum diisi di .env server — hubungi admin NEXBILL untuk mengaktifkan ongkos kirim.");
  return key;
}

function originAreaId(): string {
  const id = process.env.BITESHIP_ORIGIN_AREA_ID;
  if (!id) throw new Error("BITESHIP_ORIGIN_AREA_ID belum diisi di .env server — admin NEXBILL perlu mengatur area asal pengiriman dulu.");
  return id;
}

function couriers(): string {
  return process.env.BITESHIP_COURIERS?.trim() || "jne,jnt,sicepat,anteraja,ninja";
}

export interface BiteshipArea {
  id: string;
  name: string;
  postalCode: number | null;
}

/** Wraps GET /v1/maps/areas — autocomplete for the destination district, debounced on the client. */
export async function searchAreas(input: string): Promise<BiteshipArea[]> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];
  const url = `${BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(trimmed)}&type=single`;
  const res = await fetch(url, { headers: { authorization: apiKey() } });
  const data = await parseBiteshipResponse(res, "GET /maps/areas");
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Gagal mencari area tujuan pengiriman. Coba lagi.");
  }
  return (data.areas || []).map((a: any) => ({ id: a.id, name: a.name, postalCode: a.postal_code ?? null }));
}

export interface CreateLocationInput {
  name: string;
  contactName: string;
  contactPhone: string;
  address: string;
  note?: string;
  postalCode: number;
  latitude: number;
  longitude: number;
  type: "origin" | "destination";
}

export interface BiteshipLocation {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  address: string;
}

/**
 * Wraps POST /v1/locations — registers an address in Biteship's own dashboard (Address Page),
 * used here only for a one-time NEXBILL warehouse/origin setup (see scripts/biteship-setup-origin.ts).
 * Not used at checkout time. IMPORTANT: the `id` this returns is a Biteship "location_id" — a
 * DIFFERENT identifier from the "area_id" that getRates()/BITESHIP_ORIGIN_AREA_ID needs (that one
 * only comes from searchAreas()/the Maps API). Registering a location here does not by itself give
 * you an area_id.
 */
export async function createLocation(input: CreateLocationInput): Promise<BiteshipLocation> {
  const res = await fetch(`${BASE_URL}/locations`, {
    method: "POST",
    headers: { authorization: apiKey(), "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      address: input.address,
      note: input.note,
      postal_code: input.postalCode,
      latitude: input.latitude,
      longitude: input.longitude,
      type: input.type,
    }),
  });
  const data = await parseBiteshipResponse(res, "POST /locations");
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Gagal menyimpan lokasi ke Biteship.");
  }
  return {
    id: data.id,
    name: data.name,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    address: data.address,
  };
}

export interface RateItem {
  name: string;
  value: number;
  weight: number; // grams
  quantity: number;
  // Optional package dimensions in centimeters (from platformProducts.lengthCm/widthCm/heightCm,
  // set via /platform-admin/products) — Biteship's rate API works from weight alone, these just
  // let it price volumetric-weight couriers more accurately for bulkier items. Omitted entirely
  // when a product hasn't had its dimensions filled in yet.
  length?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface BiteshipPricingOption {
  courierCode: string;
  courierName: string;
  courierServiceCode: string;
  courierServiceName: string;
  description: string;
  duration: string;
  price: number;
}

/**
 * Wraps POST /v1/rates/couriers ("by Area ID" request shape). Called TWICE in the checkout
 * lifecycle by design: once from the client (via api/shipping/rates) so the merchant can browse
 * options and pick one, and once more server-side inside checkoutCart() right before creating the
 * invoice, to re-fetch the authoritative current price for whichever courier+service the merchant
 * picked — a client can send any number for shippingCost, so the actual money math must never
 * trust it. See checkoutCart's shipping block.
 */
export async function getRates(destinationAreaId: string, items: RateItem[]): Promise<BiteshipPricingOption[]> {
  if (items.length === 0) return [];
  const res = await fetch(`${BASE_URL}/rates/couriers`, {
    method: "POST",
    headers: { authorization: apiKey(), "content-type": "application/json" },
    body: JSON.stringify({
      origin_area_id: originAreaId(),
      destination_area_id: destinationAreaId,
      couriers: couriers(),
      items: items.map((i) => ({
        name: i.name,
        value: i.value,
        weight: i.weight,
        quantity: i.quantity,
        ...(i.length ? { length: i.length } : {}),
        ...(i.width ? { width: i.width } : {}),
        ...(i.height ? { height: i.height } : {}),
      })),
    }),
  });
  const data = await parseBiteshipResponse(res, "POST /rates/couriers");
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Gagal mengambil ongkos kirim dari Biteship. Coba lagi sebentar.");
  }
  return (data.pricing || []).map((p: any) => ({
    courierCode: p.courier_code,
    courierName: p.courier_name,
    courierServiceCode: p.courier_service_code,
    courierServiceName: p.courier_service_name,
    description: p.description,
    duration: p.duration,
    price: p.price,
  }));
}
