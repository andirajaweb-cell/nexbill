import * as XLSX from "xlsx";
import { db } from "@/db/client";
import { cashBankAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { postJournal } from "./journal";
import { getMappedAccountId, getCashBankAccountIdForPaymentMethod } from "./account-mapping";
import { getAccountIdByCode, EXPENSE_PAYABLE_ACCOUNT_CODE } from "./coa";
import { createOtherIncome, OTHER_INCOME_CATEGORY_LABEL, type OtherIncomeCategory } from "./other-income";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_OPTIONS } from "@/lib/payments/labels";
import type { PaymentMethod } from "@/lib/payments/types";
import { describeError } from "@/lib/api/error";

/**
 * Bulk-imports HISTORICAL transactions from a previous system, via Excel —
 * the counterpart to Opening Balance (opening-balance.ts) for owners who
 * want more than just a starting balance: real dated entries for old
 * Penjualan/Pembelian/Pendapatan Lain-lain/Pengeluaran, so historical trends
 * still show up in this app's reports.
 *
 * IMPORTANT design choice: rows post DIRECTLY to the journal (or, for
 * Pendapatan Lain-lain, through the real createOtherIncome() engine) —
 * they deliberately do NOT create fake rows in `orders`/`purchaseInvoices`/
 * `expenses`. Those operational tables drive live workflows (kitchen queue,
 * inventory deduction, approval states, receipts) that make no sense to
 * replay for something that already happened in a different system. This
 * means imported Penjualan/Pembelian/Pengeluaran show up correctly in
 * Accounting (Jurnal/Neraca Saldo/Laba Rugi) but NOT in the POS/Purchasing/
 * Expense Management list screens — only Pendapatan Lain-lain (which reuses
 * the real engine) appears in both places. This tradeoff is intentional and
 * should be explained to the owner before they import.
 */

export type HistoricalCategory = "penjualan" | "pembelian" | "pendapatan_lain" | "pengeluaran";

const round = (n: number) => Math.round(n);

// ---------------- Penjualan (historical sales, summarized) ----------------

const SALES_CATEGORY_LABEL: Record<string, string> = {
  rental: "Rental PS",
  fnb: "F&B (Makanan/Minuman/Snack)",
  produk: "Produk/Merchandise Lain",
  ppob: "PPOB",
  lainnya: "Lainnya",
};
// Deliberately routed to each revenue group's "Other/lainnya" catch-all account — a bulk
// historical import can't reliably distinguish PS4 vs PS5 or Food vs Drink from an old
// system's export, but the totals still roll up correctly under the right parent group
// (Rental/F&B/Produk/PPOB Revenue) in Trial Balance & Laba Rugi either way.
const SALES_CATEGORY_ACCOUNT_CODE: Record<string, string> = {
  rental: "4170", // Other Rental
  fnb: "4260", // Other F&B
  produk: "4330", // Other Product Sales
  ppob: "4480", // PPOB Service Fee
  lainnya: "4650", // Other Revenue
};

// ---------------- Pembelian (historical purchases) ----------------

const PURCHASE_TYPE_LABEL: Record<string, string> = {
  stok: "Stok/Bahan Baku (Inventaris)",
  operasional: "Operasional/Aset Lain",
};

// ---------------- Pengeluaran (historical expenses) ----------------

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  gaji: "Gaji/Staf",
  sewa: "Sewa",
  listrik: "Listrik",
  internet: "Internet",
  operasional: "Operasional (Umum)",
};
const EXPENSE_CATEGORY_FALLBACK_CODE: Record<string, string> = {
  gaji: "6110",
  sewa: "6210",
  listrik: "6220",
  internet: "6240",
  operasional: "6900",
};

const HUTANG_LABEL = "Hutang (belum dibayar)";

function methodColDescription(): string {
  return `${PAYMENT_METHOD_OPTIONS.map((m) => m.label).join(" / ")} / ${HUTANG_LABEL}`;
}

function resolveLabelKey(raw: string, labelMap: Record<string, string>): string | null {
  const needle = String(raw ?? "").trim().toLowerCase();
  for (const [key, label] of Object.entries(labelMap)) {
    if (key === needle || label.toLowerCase() === needle) return key;
  }
  return null;
}

function resolvePaymentMethod(raw: string): PaymentMethod | null {
  return resolveLabelKey(raw, PAYMENT_METHOD_LABEL) as PaymentMethod | null;
}

function isHutangValue(raw: string): boolean {
  const needle = String(raw ?? "").trim().toLowerCase();
  return needle === "hutang" || needle === HUTANG_LABEL.toLowerCase();
}

function parseDate(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  // xlsx gives JS Date objects for date-formatted cells, or a string/number otherwise.
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString();
  const asDate = new Date(String(raw));
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
  return null;
}

/** Resolves the credit-side GL account for a "cash/bank OR hutang" row — shared by Pembelian and Pengeluaran. */
async function resolveSettlementAccount(outletId: string, isHutang: boolean, method: PaymentMethod | null, payableAccountCode: string, payableLabel: string) {
  if (isHutang) {
    return { accountId: await getAccountIdByCode(outletId, payableAccountCode), label: payableLabel };
  }
  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(outletId, method!);
  const [cbRow] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!cbRow) throw new Error("Akun kas/bank tidak ditemukan.");
  return { accountId: cbRow.accountId, label: `Pembayaran (${PAYMENT_METHOD_LABEL[method!]})` };
}

export interface ImportRowResult {
  row: number;
  action: "posted" | "error";
  error?: string;
}
export interface ImportSummary {
  totalRows: number;
  posted: number;
  errors: number;
  details: ImportRowResult[];
}

// ---------------- Template generation ----------------

function buildTemplate(headers: string[], exampleRows: (string | number)[][], legendRows: string[][], sheetTitle: string): Buffer {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  sheet["!cols"] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, sheet, sheetTitle);

  const legendSheet = XLSX.utils.aoa_to_sheet([["Kolom", "Keterangan"], ...legendRows]);
  legendSheet["!cols"] = [{ wch: 20 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, legendSheet, "Petunjuk");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function generateHistoricalImportTemplate(category: HistoricalCategory): Buffer {
  const today = new Date().toISOString().slice(0, 10);
  if (category === "penjualan") {
    return buildTemplate(
      ["Tanggal", "Kategori Pendapatan", "Deskripsi", "Nominal", "Metode Pembayaran", "Referensi"],
      [[today, "Rental PS", "Total penjualan harian (contoh)", 500000, "Tunai (Cash)", "REF-001"]],
      [
        ["Tanggal", "Format tanggal (YYYY-MM-DD atau DD/MM/YYYY)."],
        ["Kategori Pendapatan", "Salah satu: " + Object.values(SALES_CATEGORY_LABEL).join(", ")],
        ["Deskripsi", "Bebas, mis. 'Penjualan harian 1 Jan 2026' atau nomor struk lama."],
        ["Nominal", "Angka, harus lebih dari 0. Boleh diisi per transaksi ATAU total per hari — direkomendasikan per hari supaya baris tidak terlalu banyak."],
        ["Metode Pembayaran", "Salah satu: " + PAYMENT_METHOD_OPTIONS.map((m) => m.label).join(", ")],
        ["Referensi", "Opsional — nomor struk/invoice dari sistem lama."],
        ["CATATAN PENTING", "Data ini masuk ke Jurnal/Laporan Keuangan (Neraca Saldo, Laba Rugi) TAPI TIDAK muncul di daftar Transaksi/POS — karena bukan order sungguhan, hanya catatan akuntansi historis."],
      ],
      "Penjualan"
    );
  }
  if (category === "pembelian") {
    return buildTemplate(
      ["Tanggal", "Jenis", "Deskripsi", "Nominal", "Metode Pembayaran", "Supplier", "Referensi"],
      [[today, "Stok/Bahan Baku (Inventaris)", "Pembelian bahan baku (contoh)", 300000, "Tunai (Cash)", "Toko Sembako Jaya", "PO-001"]],
      [
        ["Tanggal", "Format tanggal (YYYY-MM-DD atau DD/MM/YYYY)."],
        ["Jenis", "Salah satu: " + Object.values(PURCHASE_TYPE_LABEL).join(", ")],
        ["Deskripsi", "Bebas."],
        ["Nominal", "Angka, harus lebih dari 0."],
        ["Metode Pembayaran", "Salah satu: " + methodColDescription()],
        ["Supplier", "Opsional."],
        ["Referensi", "Opsional — nomor PO/invoice dari sistem lama."],
        ["CATATAN PENTING", "Data ini masuk ke Jurnal/Laporan Keuangan TAPI TIDAK muncul di daftar Purchase Order/Invoice — hanya catatan akuntansi historis."],
      ],
      "Pembelian"
    );
  }
  if (category === "pendapatan_lain") {
    return buildTemplate(
      ["Tanggal", "Kategori", "Deskripsi", "Diterima Dari", "Nominal", "Metode Pembayaran"],
      [[today, "Lain-lain", "Komisi kerjasama vendor (contoh)", "PT Contoh", 100000, "Tunai (Cash)"]],
      [
        ["Tanggal", "Format tanggal (YYYY-MM-DD atau DD/MM/YYYY)."],
        ["Kategori", "Salah satu: " + Object.values(OTHER_INCOME_CATEGORY_LABEL).join(", ")],
        ["Deskripsi", "Bebas."],
        ["Diterima Dari", "Opsional."],
        ["Nominal", "Angka, harus lebih dari 0."],
        ["Metode Pembayaran", "Salah satu: " + PAYMENT_METHOD_OPTIONS.map((m) => m.label).join(", ")],
        ["CATATAN", "Baris ini akan MUNCUL di halaman Pendapatan Lain-lain seperti entri baru (bukan cuma jurnal) — karena pakai mesin pencatatan yang sama."],
      ],
      "Pendapatan Lain-lain"
    );
  }
  return buildTemplate(
    ["Tanggal", "Kategori Beban", "Deskripsi", "Nominal", "Metode Pembayaran"],
    [[today, "Operasional (Umum)", "Beban operasional (contoh)", 150000, "Tunai (Cash)"]],
    [
      ["Tanggal", "Format tanggal (YYYY-MM-DD atau DD/MM/YYYY)."],
      ["Kategori Beban", "Salah satu: " + Object.values(EXPENSE_CATEGORY_LABEL).join(", ")],
      ["Deskripsi", "Bebas."],
      ["Nominal", "Angka, harus lebih dari 0."],
      ["Metode Pembayaran", "Salah satu: " + methodColDescription()],
      ["CATATAN PENTING", "Data ini masuk ke Jurnal/Laporan Keuangan TAPI TIDAK muncul di daftar Expense Management — hanya catatan akuntansi historis (sudah otomatis berstatus lunas, tidak melalui alur approval)."],
    ],
    "Pengeluaran"
  );
}

// ---------------- Import processing ----------------

function readRows(fileBuffer: Buffer): any[][] {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File Excel tidak punya sheet.");
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) throw new Error("Sheet kosong.");
  return rows.slice(1); // drop header row
}

async function importPenjualanRow(outletId: string, r: any[], rowNum: number, staffUserId?: string) {
  const [tanggalRaw, kategoriRaw, deskripsi, nominalRaw, metodeRaw, referensi] = r;
  const tanggal = parseDate(tanggalRaw);
  if (!tanggal) throw new Error("Tanggal tidak valid.");
  const kategoriKey = resolveLabelKey(String(kategoriRaw ?? ""), SALES_CATEGORY_LABEL);
  if (!kategoriKey) throw new Error(`Kategori Pendapatan "${kategoriRaw}" tidak dikenali.`);
  const nominal = round(Number(nominalRaw));
  if (!(nominal > 0)) throw new Error("Nominal harus lebih dari 0.");
  const method = resolvePaymentMethod(String(metodeRaw ?? ""));
  if (!method) throw new Error(`Metode Pembayaran "${metodeRaw}" tidak dikenali.`);

  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(outletId, method);
  const [cbRow] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!cbRow) throw new Error("Akun kas/bank tidak ditemukan.");
  const revenueAccountId = await getAccountIdByCode(outletId, SALES_CATEGORY_ACCOUNT_CODE[kategoriKey]);

  await postJournal({
    outletId,
    entryDate: tanggal,
    reference: referensi ? String(referensi) : `HIST-JUAL-${rowNum}`,
    description: `[Impor Historis] Penjualan — ${String(deskripsi ?? SALES_CATEGORY_LABEL[kategoriKey])}`,
    sourceType: "pos",
    staffUserId,
    lines: [
      { accountId: cbRow.accountId, debit: nominal, credit: 0, description: `Uang masuk (${PAYMENT_METHOD_LABEL[method]})` },
      { accountId: revenueAccountId, debit: 0, credit: nominal, description: SALES_CATEGORY_LABEL[kategoriKey] },
    ],
  });
}

async function importPembelianRow(outletId: string, r: any[], rowNum: number, staffUserId?: string) {
  const [tanggalRaw, jenisRaw, deskripsi, nominalRaw, metodeRaw, supplier, referensi] = r;
  const tanggal = parseDate(tanggalRaw);
  if (!tanggal) throw new Error("Tanggal tidak valid.");
  const jenisKey = resolveLabelKey(String(jenisRaw ?? ""), PURCHASE_TYPE_LABEL);
  if (!jenisKey) throw new Error(`Jenis "${jenisRaw}" tidak dikenali.`);
  const nominal = round(Number(nominalRaw));
  if (!(nominal > 0)) throw new Error("Nominal harus lebih dari 0.");
  const isHutang = isHutangValue(String(metodeRaw ?? ""));
  const method = isHutang ? null : resolvePaymentMethod(String(metodeRaw ?? ""));
  if (!isHutang && !method) throw new Error(`Metode Pembayaran "${metodeRaw}" tidak dikenali.`);

  const debitAccountId =
    jenisKey === "stok" ? await getMappedAccountId(outletId, "product", "inventory", "1161") : await getMappedAccountId(outletId, "expense", "operasional", "6900");
  const settlement = await resolveSettlementAccount(outletId, isHutang, method, "2111", "Hutang Supplier");

  await postJournal({
    outletId,
    entryDate: tanggal,
    reference: referensi ? String(referensi) : `HIST-BELI-${rowNum}`,
    description: `[Impor Historis] Pembelian — ${String(deskripsi ?? "")}${supplier ? ` (${supplier})` : ""}`,
    sourceType: "purchase_invoice",
    staffUserId,
    lines: [
      { accountId: debitAccountId, debit: nominal, credit: 0, description: PURCHASE_TYPE_LABEL[jenisKey] },
      { accountId: settlement.accountId, debit: 0, credit: nominal, description: settlement.label },
    ],
  });
}

async function importPendapatanLainRow(outletId: string, r: any[], staffUserId?: string) {
  const [tanggalRaw, kategoriRaw, deskripsi, diterimaDari, nominalRaw, metodeRaw] = r;
  const tanggal = parseDate(tanggalRaw);
  if (!tanggal) throw new Error("Tanggal tidak valid.");
  const kategoriKey = resolveLabelKey(String(kategoriRaw ?? ""), OTHER_INCOME_CATEGORY_LABEL);
  if (!kategoriKey) throw new Error(`Kategori "${kategoriRaw}" tidak dikenali.`);
  const nominal = Number(nominalRaw);
  if (!(nominal > 0)) throw new Error("Nominal harus lebih dari 0.");
  const method = resolvePaymentMethod(String(metodeRaw ?? ""));
  if (!method) throw new Error(`Metode Pembayaran "${metodeRaw}" tidak dikenali.`);

  await createOtherIncome({
    outletId,
    category: kategoriKey as OtherIncomeCategory,
    description: deskripsi ? String(deskripsi) : undefined,
    payerName: diterimaDari ? String(diterimaDari) : undefined,
    amount: nominal,
    paymentMethod: method,
    incomeDate: tanggal,
    staffUserId,
    shiftId: null,
  });
}

async function importPengeluaranRow(outletId: string, r: any[], rowNum: number, staffUserId?: string) {
  const [tanggalRaw, kategoriRaw, deskripsi, nominalRaw, metodeRaw] = r;
  const tanggal = parseDate(tanggalRaw);
  if (!tanggal) throw new Error("Tanggal tidak valid.");
  const kategoriKey = resolveLabelKey(String(kategoriRaw ?? ""), EXPENSE_CATEGORY_LABEL);
  if (!kategoriKey) throw new Error(`Kategori Beban "${kategoriRaw}" tidak dikenali.`);
  const nominal = round(Number(nominalRaw));
  if (!(nominal > 0)) throw new Error("Nominal harus lebih dari 0.");
  const isHutang = isHutangValue(String(metodeRaw ?? ""));
  const method = isHutang ? null : resolvePaymentMethod(String(metodeRaw ?? ""));
  if (!isHutang && !method) throw new Error(`Metode Pembayaran "${metodeRaw}" tidak dikenali.`);

  const debitAccountId = await getMappedAccountId(outletId, "expense", kategoriKey, EXPENSE_CATEGORY_FALLBACK_CODE[kategoriKey]);
  const settlement = await resolveSettlementAccount(outletId, isHutang, method, EXPENSE_PAYABLE_ACCOUNT_CODE, "Hutang Expense");

  await postJournal({
    outletId,
    entryDate: tanggal,
    reference: `HIST-EXP-${rowNum}`,
    description: `[Impor Historis] Beban ${EXPENSE_CATEGORY_LABEL[kategoriKey]} — ${String(deskripsi ?? "")}`,
    sourceType: "expense",
    staffUserId,
    lines: [
      { accountId: debitAccountId, debit: nominal, credit: 0, description: EXPENSE_CATEGORY_LABEL[kategoriKey] },
      { accountId: settlement.accountId, debit: 0, credit: nominal, description: settlement.label },
    ],
  });
}

export async function importHistoricalRows(outletId: string, category: HistoricalCategory, fileBuffer: Buffer, staffUserId?: string): Promise<ImportSummary> {
  const dataRows = readRows(fileBuffer);
  const details: ImportRowResult[] = [];
  let posted = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const r = dataRows[i];
    if (!r || r.every((c) => c === undefined || c === null || String(c).trim() === "")) continue;

    try {
      if (category === "penjualan") await importPenjualanRow(outletId, r, rowNum, staffUserId);
      else if (category === "pembelian") await importPembelianRow(outletId, r, rowNum, staffUserId);
      else if (category === "pendapatan_lain") await importPendapatanLainRow(outletId, r, staffUserId);
      else await importPengeluaranRow(outletId, r, rowNum, staffUserId);

      posted++;
      details.push({ row: rowNum, action: "posted" });
    } catch (err: unknown) {
      details.push({ row: rowNum, action: "error", error: describeError(err) });
    }
  }

  return { totalRows: dataRows.length, posted, errors: details.filter((d) => d.action === "error").length, details };
}
