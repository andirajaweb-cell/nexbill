/**
 * Draf Belanja Supplier — disimpan di browser (localStorage) per outlet.
 *
 *  - Simpan otomatis: isi form yang sedang diketik selalu tersimpan, jadi pindah tab (mis. ke tab
 *    Produk untuk menambah produk baru), pindah menu, atau memuat ulang halaman tidak menghapusnya.
 *  - Tombol "Simpan Draft": menyimpan isian sebagai draf bernama lalu mengosongkan form, supaya
 *    beberapa nota bisa disiapkan bergantian. Draf tidak menyentuh stok, kas, maupun jurnal.
 * Draf hanya ada di perangkat/browser ini.
 */

export interface PurchaseDraftData {
  supplierId: string;
  purchaseDate: string;
  cart: { productId: string; qty: number; unitCost: number }[];
  transportCost: number;
  parkingCost: number;
  otherCost: number;
  paidNow: boolean;
  cashBankAccountId: string;
  itemForm?: { productId: string; qty: number; unitCost: number };
}

export interface SavedPurchaseDraft {
  id: string;
  savedAt: string;
  data: PurchaseDraftData;
}

export const MAX_SAVED_DRAFTS = 20;

const autosaveKey = (outletId: string) => `nexbill:supplier-purchase:autosave:${outletId}`;
const draftsKey = (outletId: string) => `nexbill:supplier-purchase:drafts:${outletId}`;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // penyimpanan penuh / diblokir — draf memang hanya kemudahan, jangan ganggu kasir
  }
}

/** Isian dianggap kosong bila belum ada item, supplier, maupun ongkos. */
export function isEmptyDraft(d: PurchaseDraftData | null | undefined): boolean {
  if (!d) return true;
  return !d.cart?.length && !d.supplierId && !(d.transportCost || d.parkingCost || d.otherCost) && !d.itemForm?.productId;
}

/** Bersihkan data dari penyimpanan (bisa rusak / versi lama). */
export function sanitizeDraft(d: unknown): PurchaseDraftData | null {
  if (!d || typeof d !== "object") return null;
  const x = d as Record<string, unknown>;
  const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
  const cart = Array.isArray(x.cart)
    ? x.cart
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof (c as Record<string, unknown>).productId === "string")
        .map((c) => ({ productId: String(c.productId), qty: num(c.qty), unitCost: num(c.unitCost) }))
        .filter((c) => c.productId && c.qty > 0)
    : [];
  const itemForm = x.itemForm && typeof x.itemForm === "object" ? (x.itemForm as Record<string, unknown>) : null;
  return {
    supplierId: typeof x.supplierId === "string" ? x.supplierId : "",
    purchaseDate: typeof x.purchaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.purchaseDate) ? x.purchaseDate : "",
    cart,
    transportCost: num(x.transportCost),
    parkingCost: num(x.parkingCost),
    otherCost: num(x.otherCost),
    paidNow: x.paidNow !== false,
    cashBankAccountId: typeof x.cashBankAccountId === "string" ? x.cashBankAccountId : "",
    itemForm: itemForm ? { productId: typeof itemForm.productId === "string" ? itemForm.productId : "", qty: num(itemForm.qty) || 1, unitCost: num(itemForm.unitCost) } : undefined,
  };
}

export function draftTotal(d: PurchaseDraftData): number {
  return d.cart.reduce((s, c) => s + c.qty * c.unitCost, 0) + d.transportCost + d.parkingCost + d.otherCost;
}

export function loadAutosave(outletId: string): PurchaseDraftData | null {
  return sanitizeDraft(read(autosaveKey(outletId)));
}
export function saveAutosave(outletId: string, d: PurchaseDraftData) {
  write(autosaveKey(outletId), isEmptyDraft(d) ? null : d);
}
export function clearAutosave(outletId: string) {
  write(autosaveKey(outletId), null);
}

export function loadDrafts(outletId: string): SavedPurchaseDraft[] {
  const rows = read<unknown[]>(draftsKey(outletId));
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const x = r as Record<string, unknown>;
      const data = sanitizeDraft(x?.data);
      return data && typeof x.id === "string" ? { id: x.id, savedAt: typeof x.savedAt === "string" ? x.savedAt : new Date(0).toISOString(), data } : null;
    })
    .filter((r): r is SavedPurchaseDraft => !!r);
}
export function storeDraft(outletId: string, data: PurchaseDraftData, id?: string): SavedPurchaseDraft[] {
  const rows = loadDrafts(outletId).filter((r) => r.id !== id);
  const entry: SavedPurchaseDraft = { id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, savedAt: new Date().toISOString(), data };
  const next = [entry, ...rows].slice(0, MAX_SAVED_DRAFTS);
  write(draftsKey(outletId), next);
  return next;
}
export function removeDraft(outletId: string, id: string): SavedPurchaseDraft[] {
  const next = loadDrafts(outletId).filter((r) => r.id !== id);
  write(draftsKey(outletId), next.length ? next : null);
  return next;
}
