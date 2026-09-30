/**
 * Excel Daftar Aset: template upload, unduhan daftar (sesuai filter), dan commit upload.
 * Logika murninya ada di ./asset-filter.ts dan ./asset-import-parse.ts.
 *
 * Perlakuan akuntansi upload: SETIAP kelompok tanggal perolehan = satu dokumen Pembelian Aset
 * lewat createAssetPurchase (jalur yang sama dengan tab Pembelian Aset), jadi jurnal, akun per
 * kategori, utang, dan pembatalan bekerja persis sama. Cara pencatatan dipilih sekali untuk
 * seluruh file:
 *   - opening_balance : aset yang sudah dimiliki sebelum memakai NEXBILL (Cr Ekuitas Saldo Awal)
 *   - paid            : dibayar dari akun kas/bank terpilih
 *   - payable         : dicatat sebagai utang pembelian aset
 */
import * as XLSX from "xlsx";
import { and, eq, ne, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedAssets, rentalUnits } from "@/db/schema";
import { createAssetPurchase, type AssetPurchaseFunding } from "@/lib/accounting/asset-purchase";
import { outletDateYmd } from "@/lib/time/outlet-time";
import { translate, type LangCode } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-assets";
import { assetDateYmd, summarizeAssets, type AssetLike } from "./asset-filter";
import { ASSET_IMPORT_MAX_ROWS, parseAssetRows, type AssetImportParseResult } from "./asset-import-parse";

const CATEGORY_KEY: Record<string, [string, string]> = {
  playstation: ["assets.category.playstation", "PlayStation"],
  tv: ["assets.category.tv", "TV"],
  controller: ["assets.category.controller", "Controller"],
  furniture: ["assets.category.furniture", "Furniture"],
  vehicle: ["assets.category.vehicle", "Kendaraan"],
  other: ["assets.category.other", "Lainnya"],
};
const STATUS_KEY: Record<string, [string, string]> = {
  active: ["assets.status.active", "Aktif"],
  under_maintenance: ["assets.status.underMaintenance", "Maintenance"],
  disposed: ["assets.status.disposed", "Dilepas (Disposed)"],
};

const tr = (lang: LangCode) => (key: string, fallback: string) => translate(lang, key, fallback);
const toBuffer = (wb: XLSX.WorkBook) => XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

/* ----------------------------------------------------------------- template ----------------------------------------------------------------- */

export async function buildAssetImportTemplate(outletId: string, lang: LangCode): Promise<Buffer> {
  const t = tr(lang);
  const units = await db.select({ name: rentalUnits.name }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  const header = [
    t("assets.io.col.name", "Nama Aset *"),
    t("assets.io.col.category", "Kategori *"),
    t("assets.io.col.qty", "Qty"),
    t("assets.io.col.unitCost", "Harga Perolehan per Unit *"),
    t("assets.io.col.salvage", "Nilai Sisa"),
    t("assets.io.col.life", "Umur Ekonomis (bulan) *"),
    t("assets.io.col.date", "Tanggal Perolehan"),
    t("assets.io.col.unit", "Unit PS Terkait"),
  ];
  const exampleUnit = units[0]?.name ?? "";
  const rows = [
    header,
    ["PS5 Slim", "PlayStation", 1, 8000000, 1000000, 36, "2025-06-15", exampleUnit],
    ["Stik DualSense", "Controller", 4, 950000, 0, 12, "2025-06-15", ""],
    ["TV LED 43 inch", "TV", 2, 3500000, 300000, 60, "", ""],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 18 }];

  const legend = [
    [t("assets.io.legend.column", "Kolom"), t("assets.io.legend.required", "Wajib?"), t("assets.io.legend.note", "Keterangan")],
    [header[0], t("assets.io.yes", "Ya"), t("assets.io.legend.name", "Nama aset. Qty lebih dari 1 akan dibuat menjadi beberapa aset bernomor (#1, #2, ...).")],
    [header[1], t("assets.io.yes", "Ya"), t("assets.io.legend.category", "PlayStation, TV, Controller, Furniture, Kendaraan, atau Lainnya.")],
    [header[2], t("assets.io.no", "Tidak"), t("assets.io.legend.qty", "Jumlah unit, 1–100. Kosong = 1.")],
    [header[3], t("assets.io.yes", "Ya"), t("assets.io.legend.unitCost", "Harga beli per unit (Rupiah, angka saja).")],
    [header[4], t("assets.io.no", "Tidak"), t("assets.io.legend.salvage", "Perkiraan nilai jual saat umur ekonomis habis. Harus lebih kecil dari harga perolehan. Kosong = 0.")],
    [header[5], t("assets.io.yes", "Ya"), t("assets.io.legend.life", "Lama pemakaian untuk penyusutan, dalam bulan (mis. 36 = 3 tahun).")],
    [header[6], t("assets.io.no", "Tidak"), t("assets.io.legend.date", "Format YYYY-MM-DD atau DD/MM/YYYY. Kosong = hari ini. Tidak boleh di masa depan. Baris dengan tanggal yang sama digabung dalam satu dokumen Pembelian Aset.")],
    [header[7], t("assets.io.no", "Tidak"), `${t("assets.io.legend.unit", "Nama unit PS persis seperti di Kelola Unit, hanya untuk Qty 1.")}${units.length ? ` ${t("assets.io.legend.unitList", "Unit yang ada:")} ${units.map((u) => u.name).join(", ")}` : ""}`],
    [],
    [t("assets.io.legend.maxRows", `Maksimal ${ASSET_IMPORT_MAX_ROWS} baris per file. Hapus baris contoh sebelum upload.`).replace("{n}", String(ASSET_IMPORT_MAX_ROWS))],
  ];
  const legendSheet = XLSX.utils.aoa_to_sheet(legend);
  legendSheet["!cols"] = [{ wch: 26 }, { wch: 8 }, { wch: 100 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, t("assets.io.sheetAssets", "Aset").slice(0, 31));
  XLSX.utils.book_append_sheet(wb, legendSheet, t("assets.io.sheetGuide", "Petunjuk").slice(0, 31));
  return toBuffer(wb);
}

/* ----------------------------------------------------------------- unduhan ----------------------------------------------------------------- */

type ExportAsset = AssetLike & { id: string; salvageValue: number; usefulLifeMonths: number };

export function buildAssetListXlsx(assets: ExportAsset[], unitNames: Record<string, string>, lang: LangCode, filterLabel: string): Buffer {
  const t = tr(lang);
  const header = [
    t("assets.tableName", "Nama"),
    t("assets.tableCategory", "Kategori"),
    t("assets.io.col.unit", "Unit PS Terkait"),
    t("assets.io.col.date", "Tanggal Perolehan"),
    t("assets.tableAcquisition", "Perolehan"),
    t("assets.io.col.salvage", "Nilai Sisa"),
    // Label kolom template memakai tanda wajib "*" — tidak relevan di file unduhan.
    t("assets.io.col.life", "Umur Ekonomis (bulan)").replace(/\s*\*$/, ""),
    t("assets.tableAccumDepreciation", "Akum. Penyusutan"),
    t("assets.tableBookValue", "Nilai Buku"),
    t("assets.tableStatus", "Status"),
    t("assets.io.col.notes", "Catatan"),
  ];
  const body = assets.map((a) => [
    a.name,
    CATEGORY_KEY[a.category] ? t(...CATEGORY_KEY[a.category]) : a.category,
    a.rentalUnitId ? unitNames[a.rentalUnitId] ?? "" : "",
    assetDateYmd(a.acquisitionDate),
    Math.round(a.acquisitionCost),
    Math.round(a.salvageValue ?? 0),
    a.usefulLifeMonths,
    Math.round(a.accumulatedDepreciation),
    Math.round(a.acquisitionCost - a.accumulatedDepreciation),
    STATUS_KEY[a.status] ? t(...STATUS_KEY[a.status]) : a.status,
    [a.notes, a.status === "disposed" ? a.disposalReason : null].filter(Boolean).join(" · "),
  ]);
  const s = summarizeAssets(assets);
  const totalRow = [t("assets.io.total", "TOTAL"), `${s.count} ${t("assets.io.assetsWord", "aset")}`, "", "", Math.round(s.cost), "", "", Math.round(s.accumulated), Math.round(s.bookValue), "", ""];
  const rows = [
    [t("assets.io.exportTitle", "Daftar Aset Tetap")],
    [`${t("assets.io.filter", "Filter")}: ${filterLabel}`],
    [`${t("assets.io.printedAt", "Dicetak")}: ${outletDateYmd(new Date())}`],
    [],
    header,
    ...body,
    totalRow,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 40 }];
  // Format angka ribuan untuk kolom nominal (E, F, H, I).
  const numFmt = "#,##0";
  const firstDataRow = 5; // 0-based index baris header = 4
  for (let r = firstDataRow; r < rows.length; r++) {
    for (const c of [4, 5, 7, 8]) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") cell.z = numFmt;
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, t("assets.io.sheetAssets", "Aset").slice(0, 31));
  return toBuffer(wb);
}

/* ----------------------------------------------------------------- upload ----------------------------------------------------------------- */

export async function parseAssetWorkbook(outletId: string, buffer: Buffer): Promise<AssetImportParseResult> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File Excel tidak punya sheet.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, blankrows: false, raw: true });
  if (rows.length <= 1) throw new Error("Sheet pertama kosong — isi data mulai baris 2 (baris 1 = judul kolom).");

  const [units, taken] = await Promise.all([
    db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(eq(rentalUnits.outletId, outletId)),
    db
      .select({ id: fixedAssets.rentalUnitId })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.outletId, outletId), ne(fixedAssets.status, "disposed"), isNotNull(fixedAssets.rentalUnitId))),
  ]);
  return parseAssetRows(rows, {
    rentalUnits: units,
    takenRentalUnitIds: new Set(taken.map((r) => r.id).filter((v): v is string => Boolean(v))),
    today: outletDateYmd(new Date()),
  });
}

export interface AssetImportCommitInput {
  outletId: string;
  staffUserId?: string;
  funding: Extract<AssetPurchaseFunding, "opening_balance" | "paid" | "payable">;
  cashBankAccountId?: string | null;
  paymentMethod?: string | null;
  supplierId?: string | null;
}

/**
 * Simpan hasil parse: satu Pembelian Aset per tanggal. Hanya dijalankan kalau TIDAK ada baris
 * error (semua-atau-tidak-sama-sekali di level file, supaya admin tidak perlu menebak baris mana
 * yang sudah masuk). Kalau satu dokumen gagal di tengah jalan, dokumen sebelumnya sudah tersimpan
 * — dikembalikan daftar nomornya supaya bisa dicek/dibatalkan dari tab Pembelian Aset.
 */
export async function commitAssetImport(parsed: AssetImportParseResult, input: AssetImportCommitInput) {
  if (parsed.errors.length) throw new Error("Masih ada baris yang salah — perbaiki file lalu upload ulang.");
  if (parsed.items.length === 0) throw new Error("Tidak ada baris aset untuk disimpan.");
  if (input.funding === "paid" && !input.cashBankAccountId) throw new Error("Pilih akun kas/bank sumber pembayaran.");

  const created: { purchaseNumber: string; date: string; assets: number; total: number }[] = [];
  for (const g of parsed.groups) {
    try {
      const res = await createAssetPurchase({
        outletId: input.outletId,
        staffUserId: input.staffUserId,
        supplierId: input.supplierId || null,
        purchaseDate: g.date || null,
        items: g.items.map((i) => ({
          name: i.name,
          category: i.category,
          qty: i.qty,
          unitCost: i.unitCost,
          usefulLifeMonths: i.usefulLifeMonths,
          salvageValue: i.salvageValue,
          rentalUnitId: i.rentalUnitId,
        })),
        funding: input.funding,
        cashBankAccountId: input.funding === "paid" ? input.cashBankAccountId : null,
        paymentMethod: input.paymentMethod,
        notes: input.funding === "opening_balance" ? "Upload daftar aset (saldo awal)" : "Upload daftar aset",
      });
      created.push({ purchaseNumber: res.purchase.purchaseNumber, date: g.date, assets: res.assets.length, total: res.purchase.total });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const done = created.length ? ` Dokumen yang sudah tersimpan: ${created.map((c) => c.purchaseNumber).join(", ")}.` : "";
      throw Object.assign(new Error(`Gagal menyimpan kelompok tanggal ${g.date || "hari ini"}: ${msg}.${done}`), { created });
    }
  }
  return { created, assets: created.reduce((s, c) => s + c.assets, 0), total: created.reduce((s, c) => s + c.total, 0) };
}
