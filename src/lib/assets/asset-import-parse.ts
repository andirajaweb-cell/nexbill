/**
 * Parser upload Daftar Aset dari Excel — modul murni (tanpa DB/xlsx), diuji di
 * asset-import-parse.test.ts. Baris yang valid dikelompokkan per Tanggal Perolehan: tiap
 * kelompok nanti menjadi SATU dokumen Pembelian Aset (lib/accounting/asset-purchase.ts), karena
 * satu dokumen pembelian hanya punya satu tanggal.
 *
 * Urutan kolom (header di baris 1 diabaikan isinya, yang dipakai posisinya):
 *   A Nama Aset* | B Kategori* | C Qty | D Harga Perolehan per Unit* | E Nilai Sisa |
 *   F Umur Ekonomis (bulan)* | G Tanggal Perolehan | H Unit PS Terkait
 */
import { ASSET_CATEGORIES, type AssetCategoryCode } from "./asset-filter";

export const ASSET_IMPORT_MAX_ROWS = 300;

/** Label kategori yang diterima (semua bahasa aplikasi + sinonim umum), huruf kecil. */
const CATEGORY_ALIASES: Record<AssetCategoryCode, string[]> = {
  playstation: ["playstation", "ps", "ps3", "ps4", "ps5", "konsol", "console", "playstation / konsol", "máy chơi game", "เพลย์สเตชัน"],
  tv: ["tv", "televisi", "television", "monitor", "ทีวี"],
  controller: ["controller", "stik", "stick", "joystick", "gamepad", "kawalan", "tay cầm", "จอย"],
  furniture: ["furniture", "mebel", "kursi", "meja", "sofa", "perabot", "kasangkapan", "nội thất", "เฟอร์นิเจอร์"],
  vehicle: ["vehicle", "kendaraan", "kenderaan", "motor", "mobil", "sasakyan", "phương tiện", "ยานพาหนะ"],
  other: ["other", "lainnya", "lain-lain", "lain", "iba pa", "khác", "อื่นๆ", "อื่น ๆ"],
};

export function resolveAssetCategory(raw: unknown): AssetCategoryCode | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  for (const code of ASSET_CATEGORIES) if (code === s || CATEGORY_ALIASES[code].includes(s)) return code;
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function validYmd(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Tanggal dari sel Excel → YYYY-MM-DD. Menerima: kosong (→ ""), serial tanggal Excel, objek Date,
 * "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "DD.MM.YYYY". Mengembalikan null bila tidak dikenali.
 */
export function parseAssetDate(raw: unknown): string | null {
  if (raw === undefined || raw === null || String(raw).trim() === "") return "";
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    // SheetJS kadang menghasilkan 23:59:xx hari sebelumnya untuk sel tanggal (pembulatan serial).
    // Geser 12 jam lalu baca tanggalnya — tanggal tengah malam yang benar tetap di hari yang sama.
    const d = new Date(raw.getTime() + 12 * 3600_000);
    return validYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  if (typeof raw === "number") {
    if (raw < 1 || raw > 80000) return null;
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return validYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(raw).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return validYmd(+m[3], +m[2], +m[1]);
  return null;
}

/** "Rp 1.500.000", "1,500,000", 1500000 → 1500000. Titik/koma dianggap pemisah ribuan (Rupiah tanpa sen). */
export function parseAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const digits = String(raw).replace(/rp/i, "").replace(/[\s.,]/g, "");
  if (!/^-?\d+$/.test(digits)) return null;
  return Number(digits);
}

export interface ParsedAssetItem {
  row: number;
  name: string;
  category: AssetCategoryCode;
  qty: number;
  unitCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  /** "" = hari ini. */
  date: string;
  rentalUnitId: string | null;
  rentalUnitName: string | null;
}

export interface AssetImportGroup {
  /** YYYY-MM-DD, atau "" untuk tanggal hari ini. */
  date: string;
  items: ParsedAssetItem[];
  units: number;
  total: number;
}

export interface AssetImportParseResult {
  totalRows: number;
  items: ParsedAssetItem[];
  errors: { row: number; name?: string; error: string }[];
  groups: AssetImportGroup[];
  units: number;
  total: number;
}

export interface AssetImportContext {
  /** Unit PS milik outlet: nama (bebas huruf besar/kecil) → id. */
  rentalUnits: { id: string; name: string }[];
  /** Unit PS yang sudah terhubung ke aset aktif — tidak boleh dipakai lagi. */
  takenRentalUnitIds: Set<string>;
  /** Tanggal hari ini (YYYY-MM-DD) zona outlet — tanggal perolehan tidak boleh di masa depan. */
  today: string;
}

export function parseAssetRows(rows: unknown[][], ctx: AssetImportContext): AssetImportParseResult {
  const dataRows = rows.slice(1);
  const unitsByName = new Map(ctx.rentalUnits.map((u) => [u.name.trim().toLowerCase(), u]));
  const usedUnitIds = new Set<string>();
  const items: ParsedAssetItem[] = [];
  const errors: AssetImportParseResult["errors"] = [];
  let totalRows = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i] ?? [];
    const rowNum = i + 2;
    if (r.every((c) => c === undefined || c === null || String(c).trim() === "")) continue;
    totalRows++;
    if (totalRows > ASSET_IMPORT_MAX_ROWS) {
      errors.push({ row: rowNum, error: `Maksimal ${ASSET_IMPORT_MAX_ROWS} baris per upload — pecah file menjadi beberapa bagian.` });
      break;
    }
    const [nameRaw, catRaw, qtyRaw, costRaw, salvageRaw, lifeRaw, dateRaw, unitRaw] = r;
    const name = String(nameRaw ?? "").trim();
    const fail = (error: string) => errors.push({ row: rowNum, name: name || undefined, error });

    if (!name) { fail("Nama aset kosong."); continue; }
    const category = resolveAssetCategory(catRaw);
    if (!category) { fail(`Kategori "${String(catRaw ?? "")}" tidak dikenali. Pakai: PlayStation, TV, Controller, Furniture, Kendaraan, Lainnya.`); continue; }
    const qty = qtyRaw === undefined || qtyRaw === null || String(qtyRaw).trim() === "" ? 1 : Number(qtyRaw);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) { fail("Qty harus bilangan bulat 1–100."); continue; }
    const unitCost = parseAmount(costRaw);
    if (unitCost === null || !(unitCost > 0)) { fail("Harga Perolehan per Unit wajib diisi dan lebih dari 0."); continue; }
    const salvage = parseAmount(salvageRaw) ?? 0;
    if (salvage < 0) { fail("Nilai Sisa tidak boleh negatif."); continue; }
    if (salvage >= unitCost) { fail("Nilai Sisa harus lebih kecil dari Harga Perolehan per Unit."); continue; }
    const life = Number(lifeRaw);
    if (!Number.isInteger(life) || life < 1 || life > 600) { fail("Umur Ekonomis (bulan) wajib bilangan bulat 1–600."); continue; }
    const date = parseAssetDate(dateRaw);
    if (date === null) { fail(`Tanggal Perolehan "${String(dateRaw)}" tidak dikenali. Pakai format YYYY-MM-DD atau DD/MM/YYYY.`); continue; }
    if (date && date > ctx.today) { fail("Tanggal Perolehan tidak boleh di masa depan."); continue; }

    let rentalUnitId: string | null = null;
    let rentalUnitName: string | null = null;
    const unitLabel = String(unitRaw ?? "").trim();
    if (unitLabel) {
      const unit = unitsByName.get(unitLabel.toLowerCase());
      if (!unit) { fail(`Unit PS "${unitLabel}" tidak ditemukan di outlet ini.`); continue; }
      if (qty !== 1) { fail("Unit PS Terkait hanya bisa diisi untuk Qty 1."); continue; }
      if (ctx.takenRentalUnitIds.has(unit.id)) { fail(`Unit PS "${unit.name}" sudah terhubung ke aset lain.`); continue; }
      if (usedUnitIds.has(unit.id)) { fail(`Unit PS "${unit.name}" dipakai di lebih dari satu baris.`); continue; }
      usedUnitIds.add(unit.id);
      rentalUnitId = unit.id;
      rentalUnitName = unit.name;
    }

    items.push({ row: rowNum, name, category, qty, unitCost: Math.round(unitCost), salvageValue: Math.round(salvage), usefulLifeMonths: life, date, rentalUnitId, rentalUnitName });
  }

  const byDate = new Map<string, ParsedAssetItem[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);
  const groups: AssetImportGroup[] = [...byDate.entries()]
    .sort(([a], [b]) => (a || "9999").localeCompare(b || "9999"))
    .map(([date, gi]) => ({
      date,
      items: gi,
      units: gi.reduce((s, i) => s + i.qty, 0),
      total: gi.reduce((s, i) => s + i.qty * i.unitCost, 0),
    }));

  return {
    totalRows,
    items,
    errors,
    groups,
    units: groups.reduce((s, g) => s + g.units, 0),
    total: groups.reduce((s, g) => s + g.total, 0),
  };
}
