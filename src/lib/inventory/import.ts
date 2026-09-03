import * as XLSX from "xlsx";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";

export type ProductCategory = "food" | "drink" | "snack" | "device_rental" | "raw_material" | "other";

/** Indonesian label <-> the enum value actually stored in products.category. Import accepts either the Indonesian label or the raw English enum value, case-insensitively, so a re-exported file round-trips cleanly. */
const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: "Makanan",
  drink: "Minuman",
  snack: "Snack",
  device_rental: "Sewa Perangkat",
  raw_material: "Bahan Baku",
  other: "Lainnya",
};

function resolveCategory(raw: string): ProductCategory | null {
  const needle = raw.trim().toLowerCase();
  for (const [value, label] of Object.entries(CATEGORY_LABELS)) {
    if (value === needle || label.toLowerCase() === needle) return value as ProductCategory;
  }
  return null;
}

const TEMPLATE_HEADERS = [
  "Nama Produk", "Kategori", "SKU", "Barcode", "Harga Jual", "Harga Modal", "Stok Awal", "Stok Minimum", "Satuan",
] as const;

/** Builds the downloadable .xlsx template: a header row, one filled example, and a legend sheet listing valid category labels so the owner doesn't have to guess. */
export function generateImportTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const exampleRows = [
    ["Mie Goreng", "Makanan", "MIE-001", "8991234567890", 15000, 8000, 20, 5, "pcs"],
    ["Es Teh Manis", "Minuman", "TEH-001", "", 5000, 1500, 50, 10, "pcs"],
  ];
  const sheetData = [TEMPLATE_HEADERS as unknown as string[], ...exampleRows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Produk");

  const legendRows = [
    ["Kolom", "Wajib?", "Keterangan"],
    ["Nama Produk", "Ya", "Nama produk."],
    ["Kategori", "Ya", "Salah satu: " + Object.values(CATEGORY_LABELS).join(", ")],
    ["SKU", "Tidak", "Jika SKU sudah ada di sistem, produk akan DIUPDATE (bukan dobel). Kosongkan untuk selalu buat produk baru."],
    ["Barcode", "Tidak", "Kode barcode, opsional."],
    ["Harga Jual", "Ya", "Angka, harus lebih dari 0."],
    ["Harga Modal", "Tidak", "Angka, default 0 jika kosong."],
    ["Stok Awal", "Tidak", "Hanya dipakai saat membuat produk BARU. Untuk produk yang sudah ada (update via SKU), kolom ini diabaikan — gunakan menu Restock di halaman Inventori."],
    ["Stok Minimum", "Tidak", "Ambang batas stok menipis, default 5."],
    ["Satuan", "Tidak", "Contoh: pcs, kg, liter. Default pcs."],
  ];
  const legendSheet = XLSX.utils.aoa_to_sheet(legendRows);
  legendSheet["!cols"] = [{ wch: 16 }, { wch: 8 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, legendSheet, "Petunjuk");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export interface ImportRowResult {
  row: number; // 1-based, matching the spreadsheet row number (header = row 1)
  name?: string;
  action: "created" | "updated" | "error";
  error?: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  errors: number;
  details: ImportRowResult[];
}

/** Parses the uploaded workbook's first sheet and upserts products for the given outlet. Matches existing products by (outletId, sku) when sku is non-empty — updates master-data fields only (never touches stockQty on an update, to avoid silently clobbering real inventory counts from a re-uploaded file). Bad rows are skipped and reported; good rows still commit. */
export async function importProductsFromWorkbook(outletId: string, fileBuffer: Buffer): Promise<ImportSummary> {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File Excel tidak punya sheet.");
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  if (rows.length === 0) throw new Error("Sheet kosong.");

  // Tolerate the header being anywhere in the first row regardless of exact casing/whitespace —
  // just skip row 1, treat everything after as data (matches the template's own layout).
  const dataRows = rows.slice(1);
  const existingProducts = await db.select().from(products).where(eq(products.outletId, outletId));
  const bySku = new Map(existingProducts.filter((p) => p.sku).map((p) => [p.sku!.trim().toLowerCase(), p]));

  const details: ImportRowResult[] = [];
  // Pass 1: validate every row in memory (no DB calls) and split into inserts vs. updates —
  // matches this app's established fix for the "one DB round trip per row" pattern (see
  // coa.ts/account-mapping.ts's earlier fix for the same anti-pattern in registration). A
  // several-hundred-row product import used to do a few-hundred sequential round trips; now it's
  // one bulk insert plus a small number of chunked-parallel updates.
  const toCreate: (typeof products.$inferInsert)[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown>; rowNum: number; name: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // +1 for 0-index, +1 for header row
    const r = dataRows[i];
    if (!r || r.every((c) => c === undefined || c === null || String(c).trim() === "")) continue; // fully blank row

    const [nameRaw, categoryRaw, skuRaw, barcodeRaw, priceRaw, costRaw, stockRaw, lowStockRaw, unitRaw] = r;
    const name = String(nameRaw ?? "").trim();
    const sku = String(skuRaw ?? "").trim();

    try {
      if (!name) throw new Error("Nama produk kosong.");
      const category = resolveCategory(String(categoryRaw ?? ""));
      if (!category) throw new Error(`Kategori "${categoryRaw ?? ""}" tidak dikenali. Gunakan salah satu: ${Object.values(CATEGORY_LABELS).join(", ")}.`);
      const price = Number(priceRaw);
      if (!(price > 0)) throw new Error("Harga Jual harus angka lebih dari 0.");
      const costPrice = costRaw !== undefined && costRaw !== "" ? Number(costRaw) : 0;
      if (Number.isNaN(costPrice) || costPrice < 0) throw new Error("Harga Modal harus angka.");
      const lowStockThreshold = lowStockRaw !== undefined && lowStockRaw !== "" ? Number(lowStockRaw) : 5;
      const unit = String(unitRaw ?? "").trim() || "pcs";
      const barcode = String(barcodeRaw ?? "").trim() || null;

      const existing = sku ? bySku.get(sku.toLowerCase()) : undefined;

      if (existing) {
        toUpdate.push({
          id: existing.id,
          rowNum,
          name,
          patch: { name, category, barcode, price, costPrice, lowStockThreshold, unit, updatedAt: new Date().toISOString() },
        });
      } else {
        const stockQty = stockRaw !== undefined && stockRaw !== "" ? Number(stockRaw) : 0;
        if (Number.isNaN(stockQty) || stockQty < 0) throw new Error("Stok Awal harus angka.");
        toCreate.push({ outletId, name, category, sku: sku || null, barcode, price, costPrice, stockQty, lowStockThreshold, unit, isActive: true });
        details.push({ row: rowNum, name, action: "created" });
      }
    } catch (err: unknown) {
      details.push({ row: rowNum, name: name || undefined, action: "error", error: describeError(err) });
    }
  }

  // Pass 2: commit. One bulk insert for every new product...
  if (toCreate.length > 0) await db.insert(products).values(toCreate);

  // ...and updates chunked into small parallel batches rather than either fully sequential (slow)
  // or one giant unbounded Promise.all (risks exhausting the DB connection pool — see db/client.ts's
  // note on the transaction pooler's small `max`). Drizzle has no single-statement "bulk update
  // with per-row different values" without hand-rolled SQL CASE expressions, so this is the
  // pragmatic middle ground.
  const UPDATE_CHUNK_SIZE = 20;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + UPDATE_CHUNK_SIZE);
    await Promise.all(
      chunk.map((u) => db.update(products).set(u.patch).where(and(eq(products.id, u.id), eq(products.outletId, outletId))))
    );
    for (const u of chunk) details.push({ row: u.rowNum, name: u.name, action: "updated" });
  }

  const created = toCreate.length;
  const updated = toUpdate.length;
  // Re-sort details back into original row order — pass 1 pushed "created"/"error" inline but
  // "updated" entries were appended afterward in pass 2, so without this the returned summary's
  // row-by-row detail list would no longer match the spreadsheet's top-to-bottom order.
  details.sort((a, b) => a.row - b.row);

  return { totalRows: dataRows.length, created, updated, errors: details.filter((d) => d.action === "error").length, details };
}
