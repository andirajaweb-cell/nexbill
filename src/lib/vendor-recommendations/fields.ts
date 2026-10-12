import { VENDOR_REC_PLACEMENTS, isSafeHttpUrl } from "./core";

/** Validasi & normalisasi isian form rekomendasi vendor (platform-admin). partial = PATCH. */
export function parseVendorRecInput(body: Record<string, unknown>, partial: boolean): { data: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : body[k] === null ? "" : undefined);
  const textFields = ["vendorName", "badge", "headline", "body", "promoText", "primaryLabel", "secondaryLabel", "infoLabel", "footnote", "disclosure", "logoUrl"] as const;
  for (const k of textFields) {
    const v = str(k);
    if (v !== undefined) data[k] = v === "" ? null : v;
  }
  for (const k of ["primaryUrl", "secondaryUrl", "infoUrl"] as const) {
    const v = str(k);
    if (v === undefined) continue;
    if (v === "") data[k] = null;
    else if (!isSafeHttpUrl(v)) return { data, error: `Tautan ${k} harus diawali https:// atau http://` };
    else data[k] = v;
  }
  if (body.placement !== undefined) {
    if (!(VENDOR_REC_PLACEMENTS as readonly string[]).includes(String(body.placement))) return { data, error: "Halaman tujuan tidak dikenal." };
    data.placement = body.placement;
  }
  if (body.benefits !== undefined) {
    const list = Array.isArray(body.benefits) ? body.benefits : String(body.benefits).split("\n");
    data.benefitsJson = JSON.stringify(list.map((x) => String(x).trim()).filter(Boolean));
  }
  if (body.countries !== undefined) {
    const c = String(body.countries)
      .split(",")
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .join(",");
    data.countries = c || "ID";
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
  if (body.confirmedSignups !== undefined) data.confirmedSignups = Math.max(0, Math.floor(Number(body.confirmedSignups) || 0));
  for (const k of ["startsAt", "endsAt"] as const) {
    if (body[k] === undefined) continue;
    const v = body[k] ? String(body[k]) : "";
    if (v && !Number.isFinite(Date.parse(v))) return { data, error: "Tanggal mulai/selesai tidak valid." };
    data[k] = v ? new Date(v).toISOString() : null;
  }
  if (!partial) {
    if (!data.vendorName || !data.headline || !data.primaryLabel || !data.primaryUrl) {
      return { data, error: "Nama vendor, judul, label tombol utama, dan tautan utama wajib diisi." };
    }
  } else {
    for (const k of ["vendorName", "headline", "primaryLabel", "primaryUrl"]) {
      if (k in data && !data[k]) return { data, error: "Nama vendor, judul, label tombol utama, dan tautan utama tidak boleh kosong." };
    }
  }
  return { data };
}
