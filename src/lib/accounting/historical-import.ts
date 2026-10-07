import * as XLSX from "xlsx";
import { createHash } from "crypto";
import { db } from "@/db/client";
import { accounts, cashBankAccounts, journalEntries, otherIncomes } from "@/db/schema";
import { and, eq, inArray, like } from "drizzle-orm";
import { postJournal, type JournalLineInput } from "./journal";
import { getMappedAccountId, getCashBankAccountIdForPaymentMethod } from "./account-mapping";
import { EXPENSE_PAYABLE_ACCOUNT_CODE } from "./coa";
import { coaAccountNameForLang } from "./coa-data";
import { getExistingOpeningBalance } from "./opening-balance";
import { createOtherIncome, OTHER_INCOME_CATEGORY_LABEL, type OtherIncomeCategory } from "./other-income";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_OPTIONS } from "@/lib/payments/labels";
import type { PaymentMethod } from "@/lib/payments/types";
import { outletDateYmd } from "@/lib/time/outlet-time";
import { describeError } from "@/lib/api/error";
import "@/lib/i18n/dict-coa";
import {
  AUX_SHEET_NAME,
  DATA_SHEET_NAME,
  TEMPLATE_COLUMNS,
  templateHeader,
  type ColKey,
  type HistoricalCategory,
  type TemplateLang,
} from "./historical-import-columns";

/**
 * Impor Data Historis (Accounting → Migrasi Data): Penjualan, Pembelian, Pendapatan Lain-lain, dan
 * Pengeluaran dari sistem/catatan lama, lewat Excel, langsung menjadi jurnal bertanggal asli.
 *
 * Baris TIDAK membuat order/faktur/expense palsu — tabel operasional itu menggerakkan alur hidup
 * (dapur, stok, approval, struk) yang tidak masuk akal diputar ulang. Hasilnya tampil di Jurnal,
 * Neraca Saldo, Laba Rugi, Neraca, Arus Kas; khusus Pendapatan Lain-lain (mode Kas/Bank, tanpa kode
 * akun khusus) juga tampil di halaman Pendapatan Lain-lain karena memakai mesinnya sendiri.
 *
 * DUA MODE — ini yang mencegah saldo kas terhitung dua kali:
 *  - "kas": lawan akunnya Kas/Bank/e-wallet sesuai Metode Pembayaran (atau Piutang/Utang). Untuk
 *    outlet yang TIDAK memakai Saldo Awal dan ingin riwayat lengkap dari nol. Baris bertanggal
 *    sebelum Saldo Awal ditolak — kas periode itu sudah termasuk di Saldo Awal.
 *  - "saldo_awal": lawan akunnya 3400 Ekuitas Saldo Awal. Untuk outlet yang memakai Saldo Awal:
 *    riwayat Laba Rugi muncul, tapi posisi kas/bank/utang tetap ditentukan Saldo Awal. Total
 *    ekuitas tidak berubah (laba historis ⇄ ekuitas saldo awal). Baris pada/sesudah tanggal Saldo
 *    Awal ditolak — transaksi sesudahnya harus dicatat lewat menu biasa.
 *
 * Anti-duplikat: setiap baris mendapat sidik jari (kategori + mode + isi baris + urutan kemunculan
 * baris identik di file). Mengunggah file yang sama dua kali tidak menggandakan apa pun — baris yang
 * sudah pernah diimpor dilewati.
 *
 * Kolom dibaca berdasarkan JUDUL kolom (bukan posisi), jadi urutan kolom bebas dan template versi
 * lama tetap bisa dipakai.
 *
 * Dua bahasa: template diunduh dalam Bahasa Indonesia atau Inggris (judul kolom, nama sheet,
 * petunjuk, label pilihan — lihat historical-import-columns.ts). Importer menerima judul kolom dan
 * label pilihan KEDUA bahasa dari file mana pun; `lang` hanya menentukan bahasa pesan error dan
 * pratinjau. Isi jurnal yang disimpan tetap berbahasa Indonesia seperti jurnal lain di aplikasi.
 */

export type { HistoricalCategory, TemplateLang };
export type HistoricalMode = "kas" | "saldo_awal";

const OPENING_EQUITY_CODE = "3400";
const RECEIVABLE_CODE = "1141";
const SUPPLIER_PAYABLE_CODE = "2111";
const SALES_DISCOUNT_CODE = "4910";

const round = (n: number) => Math.round(n);

// ---------------------------------------------------------------- pilihan kategori

type Bi = Record<TemplateLang, string>;

const SALES_CATEGORIES: Record<string, { label: Bi; revenue: string; cogs: string }> = {
  rental: { label: { id: "Rental PS", en: "PS Rental" }, revenue: "4170", cogs: "5400" },
  fnb: { label: { id: "F&B (Makanan/Minuman/Snack)", en: "F&B (Food/Drinks/Snacks)" }, revenue: "4260", cogs: "5160" },
  produk: { label: { id: "Produk/Merchandise", en: "Products/Merchandise" }, revenue: "4330", cogs: "5210" },
  ppob: { label: { id: "PPOB", en: "PPOB (Bills/Top-ups)" }, revenue: "4480", cogs: "5400" },
  membership: { label: { id: "Iuran Membership", en: "Membership Fees" }, revenue: "4645", cogs: "5400" },
  lainnya: { label: { id: "Lainnya", en: "Other" }, revenue: "4650", cogs: "5400" },
};

const PURCHASE_TYPES: Record<string, { label: Bi; code: string }> = {
  stok: { label: { id: "Persediaan (stok barang dagang / bahan baku)", en: "Inventory (merchandise stock / raw materials)" }, code: "1161" },
  operasional: { label: { id: "Beban operasional (habis pakai)", en: "Operating expense (consumables)" }, code: "6900" },
};

const EXPENSE_CATEGORIES: Record<string, { label: Bi; code: string }> = {
  gaji: { label: { id: "Gaji/Staf", en: "Salaries/Staff" }, code: "6110" },
  lembur: { label: { id: "Lembur", en: "Overtime" }, code: "6120" },
  bonus: { label: { id: "Bonus Karyawan", en: "Employee Bonus" }, code: "6130" },
  sewa: { label: { id: "Sewa Tempat", en: "Rent" }, code: "6210" },
  listrik: { label: { id: "Listrik", en: "Electricity" }, code: "6220" },
  air: { label: { id: "Air", en: "Water" }, code: "6230" },
  internet: { label: { id: "Internet", en: "Internet" }, code: "6240" },
  telepon: { label: { id: "Telepon/Pulsa", en: "Phone/Airtime" }, code: "6250" },
  sampah: { label: { id: "Kebersihan/Sampah", en: "Cleaning/Waste" }, code: "6260" },
  servis_ps: { label: { id: "Servis PlayStation", en: "PlayStation Repair" }, code: "6310" },
  servis_tv: { label: { id: "Servis TV", en: "TV Repair" }, code: "6320" },
  servis_stik: { label: { id: "Servis Stik/Controller", en: "Controller Repair" }, code: "6330" },
  perbaikan: { label: { id: "Perbaikan Bangunan", en: "Building Repairs" }, code: "6350" },
  iklan: { label: { id: "Iklan/Promosi", en: "Advertising/Promotion" }, code: "6410" },
  atk: { label: { id: "Alat Tulis/Perlengkapan Kantor", en: "Stationery/Office Supplies" }, code: "6510" },
  biaya_bank: { label: { id: "Biaya Admin Bank", en: "Bank Admin Fees" }, code: "6530" },
  langganan: { label: { id: "Langganan Software", en: "Software Subscriptions" }, code: "6550" },
  transport: { label: { id: "Transportasi", en: "Transportation" }, code: "6610" },
  bensin: { label: { id: "Bensin/BBM", en: "Fuel" }, code: "6630" },
  asuransi: { label: { id: "Asuransi", en: "Insurance" }, code: "6700" },
  pajak: { label: { id: "Pajak Penghasilan (PPh Final)", en: "Income Tax (Final PPh)" }, code: "8500" },
  bunga: { label: { id: "Bunga Pinjaman", en: "Loan Interest" }, code: "8100" },
  operasional: { label: { id: "Operasional (Umum)", en: "Operating (General)" }, code: "6900" },
  lain: { label: { id: "Beban Lain-lain", en: "Other Expenses" }, code: "8900" },
};

/** Label Inggris Pendapatan Lain-lain (sama dengan dict-other-income.ts). */
const OTHER_INCOME_CATEGORY_LABEL_EN: Record<OtherIncomeCategory, string> = {
  vendor_commission: "Vendor Commission / Partnership",
  asset_rental: "Renting Out Space/Assets to Others",
  asset_sale: "Sale of Assets/Used Goods",
  sponsorship: "Sponsorship / Event Partnership",
  penalty_compensation: "Penalty / Compensation from Customers",
  bank_interest_cashback: "Bank Interest / Cashback / Promo",
  other: "Other",
};
const otherIncomeLabel = (k: OtherIncomeCategory, lang: TemplateLang) => (lang === "id" ? OTHER_INCOME_CATEGORY_LABEL[k] : OTHER_INCOME_CATEGORY_LABEL_EN[k]);

/** Label metode pembayaran yang berbeda di template Inggris; sisanya (QRIS, DANA, VA BCA (iPaymu), …) sama. */
const PAYMENT_METHOD_LABEL_EN: Partial<Record<PaymentMethod, string>> = {
  cash: "Cash",
  transfer: "Bank Transfer",
  card: "Debit/Credit Card (EDC)",
  ipaymu_hosted: "iPaymu (Choose Channel)",
  ipaymu_crossborder: "International Card (iPaymu)",
};
const paymentMethodLabel = (m: PaymentMethod, lang: TemplateLang) => (lang === "id" ? PAYMENT_METHOD_LABEL[m] : PAYMENT_METHOD_LABEL_EN[m] ?? PAYMENT_METHOD_LABEL[m]);

/** Mirrors other-income.ts CATEGORY_FALLBACK_CODE / the "other_income" mapping defaults. */
const OTHER_INCOME_FALLBACK: Record<OtherIncomeCategory, string> = {
  vendor_commission: "4710",
  asset_rental: "4720",
  asset_sale: "4730",
  sponsorship: "4740",
  penalty_compensation: "4750",
  bank_interest_cashback: "4760",
  other: "4770",
};

const HUTANG_LABEL: Bi = { id: "Hutang (belum dibayar)", en: "Payable (unpaid)" };
const PIUTANG_LABEL: Bi = { id: "Piutang (belum dibayar)", en: "Receivable (unpaid)" };
const HUTANG_WORDS = ["hutang", "utang", "payable", "on credit", HUTANG_LABEL.id.toLowerCase(), HUTANG_LABEL.en.toLowerCase()];
const PIUTANG_WORDS = ["piutang", "receivable", PIUTANG_LABEL.id.toLowerCase(), PIUTANG_LABEL.en.toLowerCase()];

/** Semua label (dua bahasa) per kunci pilihan, untuk resolveOption. */
const bothLabels = <T extends string>(m: Record<T, { label: Bi }>) =>
  Object.fromEntries(Object.entries<{ label: Bi }>(m).map(([k, v]) => [k, [v.label.id, v.label.en]])) as Record<T, string[]>;
const PAYMENT_METHOD_ALL_LABELS = Object.fromEntries(
  (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => [m, [PAYMENT_METHOD_LABEL[m], PAYMENT_METHOD_LABEL_EN[m] ?? PAYMENT_METHOD_LABEL[m]]])
) as Record<PaymentMethod, string[]>;
const OTHER_INCOME_ALL_LABELS = Object.fromEntries(
  (Object.keys(OTHER_INCOME_CATEGORY_LABEL) as OtherIncomeCategory[]).map((k) => [k, [OTHER_INCOME_CATEGORY_LABEL[k], OTHER_INCOME_CATEGORY_LABEL_EN[k]]])
) as Record<OtherIncomeCategory, string[]>;

// ---------------------------------------------------------------- kolom

/** Judul kolom yang dikenali (huruf kecil, tanpa tanda *): judul template dua bahasa + nama lama. */
const LEGACY_HEADER_ALIASES: Record<ColKey, string[]> = {
  tanggal: ["tanggal", "tgl", "date"],
  kategori: ["kategori", "kategori pendapatan", "kategori beban", "jenis", "jenis pembelian", "category", "type"],
  kodeAkun: ["kode akun", "kode akun pendapatan", "kode akun beban", "kode akun tujuan", "akun", "account code", "account"],
  deskripsi: ["deskripsi", "keterangan", "uraian", "notes"],
  nominal: ["nominal", "penjualan kotor", "jumlah", "total"],
  diskon: ["diskon", "potongan"],
  hpp: ["hpp", "hpp/modal", "hpp / modal", "modal", "cost"],
  kodeHpp: ["kode akun hpp"],
  metode: ["metode pembayaran", "metode", "dibayar dengan", "method", "paid with"],
  pihak: ["supplier", "diterima dari", "dibayar kepada", "pelanggan", "pihak", "party", "vendor", "payer", "payee"],
  referensi: ["referensi", "no. referensi", "no referensi", "nomor bukti", "ref", "ref no.", "reference no."],
};

const HEADER_ALIASES: Record<ColKey, string[]> = (() => {
  const out = Object.fromEntries(Object.entries(LEGACY_HEADER_ALIASES).map(([k, v]) => [k, [...v]])) as Record<ColKey, string[]>;
  for (const cols of Object.values(TEMPLATE_COLUMNS)) {
    for (const c of cols) {
      for (const h of Object.values(c.header)) {
        const n = normalizeHeader(h);
        if (!out[c.key].includes(n)) out[c.key].push(n);
      }
    }
  }
  return out;
})();

export function normalizeHeader(h: unknown): string {
  return String(h ?? "").replace(/\*/g, "").replace(/\(.*?\)/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapHeaders(headerRow: unknown[]): Partial<Record<ColKey, number>> {
  const idx: Partial<Record<ColKey, number>> = {};
  headerRow.forEach((h, i) => {
    const n = normalizeHeader(h);
    for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [ColKey, string[]][]) {
      if (idx[key] === undefined && aliases.includes(n)) idx[key] = i;
    }
  });
  return idx;
}

// ---------------------------------------------------------------- parser murni (diuji)

/**
 * Tanggal Excel → YYYY-MM-DD. Menerima: sel tanggal Excel (nomor seri), Date, "2026-01-31",
 * "31/01/2026", "31-01-2026", "31.01.2026" (hari lebih dulu — format Indonesia). Tidak pernah
 * memakai `new Date("01/02/2026")` yang dibaca JavaScript sebagai 2 Januari (format AS).
 */
export function parseImportDate(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = (y: number, m: number, d: number) => {
    if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
  };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const p = XLSX.SSF.parse_date_code(raw);
    return p ? valid(p.y, p.m, p.d) : null;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return valid(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    return valid(y, Number(m[2]), Number(m[1]));
  }
  return null;
}

/**
 * Nominal → angka. Menerima angka Excel, "1500000", "1.500.000", "Rp 1.500.000", "1.500.000,50",
 * "1,500,000", "-", kosong (→ 0 hanya untuk kolom opsional; pemanggil yang memvalidasi).
 */
export function parseAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim().replace(/^rp\.?/i, "").replace(/\s/g, "");
  if (s === "" || s === "-") return null;
  const neg = s.startsWith("-") || /^\(.*\)$/.test(s);
  s = s.replace(/[-()]/g, "");
  if (s.includes(".") && s.includes(",")) {
    // whichever comes last is the decimal separator
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(".")) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  } else if (s.includes(",")) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

/**
 * Kunci pencarian pilihan: cocok ke kunci ("fnb") atau salah satu label ("F&B (Makanan/Minuman/Snack)",
 * "F&B (Food/Drinks/Snacks)"), tanpa beda huruf besar/kecil.
 */
export function resolveOption<T extends string>(raw: unknown, options: Record<T, string | string[]>): T | null {
  const needle = String(raw ?? "").trim().toLowerCase();
  if (!needle) return null;
  const entries = (Object.entries(options) as [T, string | string[]][]).map(([k, v]) => [k, (Array.isArray(v) ? v : [v]).map((l) => l.toLowerCase())] as const);
  for (const [key, labels] of entries) {
    if (key.toLowerCase() === needle || labels.includes(needle)) return key;
  }
  // Tolerate a leading-word match ("Listrik bulan Jan" → no; "Tunai" → "Tunai (Cash)").
  for (const [key, labels] of entries) {
    if (labels.some((l) => l.split(" (")[0] === needle)) return key;
  }
  return null;
}

export function rowFingerprint(category: string, mode: string, cells: unknown[], occurrence: number): string {
  const body = cells.map((c) => (c instanceof Date ? c.toISOString() : String(c ?? "").trim())).join("\u0001");
  return createHash("sha1").update(`${category}|${mode}|${body}|${occurrence}`).digest("hex").slice(0, 12);
}

// ---------------------------------------------------------------- konteks outlet

interface AccountRow { id: string; code: string; name: string; type: string; isPostingAllowed: boolean }

async function loadContext(outletId: string, category: HistoricalCategory, lang: TemplateLang) {
  const rows: AccountRow[] = await db
    .select({ id: accounts.id, code: accounts.code, name: accounts.name, type: accounts.type, isPostingAllowed: accounts.isPostingAllowed })
    .from(accounts)
    .where(and(eq(accounts.outletId, outletId), eq(accounts.isActive, true)));
  const byCode = new Map(rows.map((a) => [a.code, a]));
  const opening = await getExistingOpeningBalance(outletId);
  const openingDate = opening?.entry.entryDate ? outletDateYmd(new Date(opening.entry.entryDate)) : null;
  /** Teks dalam bahasa pesan (Indonesia / Inggris). */
  const tx = (id: string, en: string) => (lang === "id" ? id : en);
  /** Judul kolom template dalam bahasa pesan, untuk pesan error. */
  const colName = (k: ColKey) => templateHeader(category, k, lang).replace(/\*$/, "");
  const accLabel = (a: AccountRow) => `${a.code} ${coaAccountNameForLang(lang, a)}`;
  return { byCode, openingDate, lang, tx, colName, accLabel };
}
type Ctx = Awaited<ReturnType<typeof loadContext>>;

const TYPE_NAME: Record<string, Bi> = {
  asset: { id: "aset", en: "asset" },
  liability: { id: "liabilitas", en: "liability" },
  equity: { id: "ekuitas", en: "equity" },
  revenue: { id: "pendapatan", en: "revenue" },
  expense: { id: "beban", en: "expense" },
};

function accountByCode(ctx: Ctx, code: string, allowedTypes: string[], columnLabel: string): AccountRow {
  const a = ctx.byCode.get(String(code).trim());
  const accSheet = AUX_SHEET_NAME.accounts[ctx.lang];
  if (!a) throw new Error(ctx.tx(`${columnLabel} "${code}" tidak ada di Chart of Accounts outlet ini (lihat sheet ${accSheet}).`, `${columnLabel} "${code}" is not in this outlet's Chart of Accounts (see the ${accSheet} sheet).`));
  if (!a.isPostingAllowed) throw new Error(ctx.tx(`${columnLabel} ${a.code} adalah akun induk — pakai salah satu akun di bawahnya.`, `${columnLabel} ${a.code} is a parent account — use one of the accounts under it.`));
  if (!allowedTypes.includes(a.type)) {
    const types = allowedTypes.map((t) => TYPE_NAME[t]?.[ctx.lang] ?? t).join("/");
    throw new Error(ctx.tx(`${columnLabel} ${ctx.accLabel(a)} bukan akun ${types}.`, `${columnLabel} ${ctx.accLabel(a)} is not a ${types} account.`));
  }
  return a;
}

/** Lawan akun. `label` masuk ke jurnal (Indonesia); `preview` tampil di layar (bahasa pesan). */
interface Settlement { kind: "cash" | "equity" | "receivable" | "payable"; accountId: string; label: string; preview: string }

function resolveMethod(ctx: Ctx, metodeRaw: unknown): PaymentMethod {
  const method = resolveOption(metodeRaw, PAYMENT_METHOD_ALL_LABELS);
  if (!method) {
    const sheet = AUX_SHEET_NAME.options[ctx.lang];
    throw new Error(ctx.tx(`${ctx.colName("metode")} "${metodeRaw ?? ""}" tidak dikenali (lihat sheet ${sheet}).`, `${ctx.colName("metode")} "${metodeRaw ?? ""}" is not recognized (see the ${sheet} sheet).`));
  }
  return method;
}

async function settlementAccount(outletId: string, ctx: Ctx, mode: HistoricalMode, metodeRaw: unknown, allow: { hutang?: boolean; piutang?: boolean }): Promise<Settlement> {
  if (mode === "saldo_awal") {
    const a = accountByCode(ctx, OPENING_EQUITY_CODE, ["equity"], ctx.tx("Akun Ekuitas Saldo Awal", "Opening Balance Equity account"));
    return { kind: "equity", accountId: a.id, label: "Ekuitas Saldo Awal (riwayat sebelum cutover)", preview: ctx.tx("Ekuitas Saldo Awal (riwayat sebelum cutover)", "Opening Balance Equity (pre-cutover history)") };
  }
  const raw = String(metodeRaw ?? "").trim().toLowerCase();
  if (allow.hutang && HUTANG_WORDS.includes(raw)) return { kind: "payable", accountId: "", label: "hutang", preview: "" };
  if (allow.piutang && PIUTANG_WORDS.includes(raw)) {
    const a = accountByCode(ctx, RECEIVABLE_CODE, ["asset"], ctx.tx("Akun Piutang", "Receivable account"));
    return { kind: "receivable", accountId: a.id, label: "Piutang pelanggan (belum dibayar)", preview: ctx.tx("Piutang pelanggan (belum dibayar)", "Customer receivable (unpaid)") };
  }
  const method = resolveMethod(ctx, metodeRaw);
  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(outletId, method);
  const [cb] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!cb || cb.outletId !== outletId) throw new Error(ctx.tx("Akun kas/bank untuk metode ini tidak ditemukan — cek Account Mapping.", "No cash/bank account found for this method — check Account Mapping."));
  return { kind: "cash", accountId: cb.accountId, label: PAYMENT_METHOD_LABEL[method], preview: paymentMethodLabel(method, ctx.lang) };
}

function checkDateAgainstMode(ctx: Ctx, ymd: string, mode: HistoricalMode) {
  if (ymd > outletDateYmd(new Date())) throw new Error(ctx.tx("Tanggal di masa depan.", "Date is in the future."));
  if (!ctx.openingDate) return;
  if (mode === "kas" && ymd < ctx.openingDate) {
    throw new Error(
      ctx.tx(
        `Tanggal sebelum Saldo Awal (${ctx.openingDate}) — kas/bank periode itu sudah termasuk di Saldo Awal. Impor ulang dengan mode "Hanya riwayat Laba Rugi".`,
        `Date is before the Opening Balance (${ctx.openingDate}) — cash/bank for that period is already in the Opening Balance. Re-import with the "Profit & Loss history only" mode.`
      )
    );
  }
  if (mode === "saldo_awal" && ymd >= ctx.openingDate) {
    throw new Error(
      ctx.tx(
        `Tanggal pada/sesudah Saldo Awal (${ctx.openingDate}) — transaksi setelah cutover dicatat dengan mode "Kas/Bank" atau lewat menu biasa.`,
        `Date is on/after the Opening Balance (${ctx.openingDate}) — post-cutover transactions are recorded with the "Cash/Bank" mode or through the regular menus.`
      )
    );
  }
}

function requireDate(ctx: Ctx, mode: HistoricalMode, raw: unknown): string {
  const date = parseImportDate(raw);
  if (!date) throw new Error(ctx.tx(`${ctx.colName("tanggal")} kosong/tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY).`, `${ctx.colName("tanggal")} is empty/invalid (use YYYY-MM-DD or DD/MM/YYYY).`));
  checkDateAgainstMode(ctx, date, mode);
  return date;
}

function requireAmount(ctx: Ctx, raw: unknown): number {
  const amount = parseAmount(raw);
  if (amount == null || !(amount > 0)) throw new Error(ctx.tx(`${ctx.colName("nominal")} wajib diisi dan harus lebih dari 0.`, `${ctx.colName("nominal")} is required and must be greater than 0.`));
  return amount;
}

const missingCategoryOrCode = (ctx: Ctx) =>
  new Error(ctx.tx(`Isi ${ctx.colName("kategori")} atau ${ctx.colName("kodeAkun")}.`, `Fill in ${ctx.colName("kategori")} or ${ctx.colName("kodeAkun")}.`));

const entryDateOf = (ymd: string) => new Date(`${ymd}T12:00:00+07:00`).toISOString();

// ---------------------------------------------------------------- baris → jurnal

interface ParsedRow {
  date: string;
  description: string;
  lines: JournalLineInput[];
  /** Ringkasan untuk pratinjau: akun utama & nominal. */
  preview: { account: string; amount: number; counter: string };
  /** Pendapatan Lain-lain lewat mesinnya sendiri (tampil di halaman Pendapatan Lain-lain). */
  otherIncome?: { category: OtherIncomeCategory; method: PaymentMethod; payer?: string; description?: string; amount: number };
}

async function buildPenjualan(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = requireDate(ctx, mode, get("tanggal"));
  const gross = requireAmount(ctx, get("nominal"));
  const discount = parseAmount(get("diskon")) ?? 0;
  if (discount < 0 || discount >= gross) {
    throw new Error(ctx.tx(`${ctx.colName("diskon")} tidak boleh negatif dan harus lebih kecil dari penjualan kotor.`, `${ctx.colName("diskon")} cannot be negative and must be less than gross sales.`));
  }
  const hpp = parseAmount(get("hpp")) ?? 0;
  if (hpp < 0) throw new Error(ctx.tx(`${ctx.colName("hpp")} tidak boleh negatif.`, `${ctx.colName("hpp")} cannot be negative.`));

  const catKey = resolveOption(get("kategori"), bothLabels(SALES_CATEGORIES));
  const code = String(get("kodeAkun") ?? "").trim();
  if (!catKey && !code) throw missingCategoryOrCode(ctx);
  const revenue = code
    ? accountByCode(ctx, code, ["revenue"], ctx.colName("kodeAkun"))
    : accountByCode(ctx, SALES_CATEGORIES[catKey!].revenue, ["revenue"], ctx.tx("Akun pendapatan kategori", "Category revenue account"));
  const settle = await settlementAccount(outletId, ctx, mode, get("metode"), { piutang: true });

  const net = round(gross - discount);
  const lines: JournalLineInput[] = [{ accountId: settle.accountId, debit: net, credit: 0, description: settle.label }];
  if (discount > 0) lines.push({ accountId: accountByCode(ctx, SALES_DISCOUNT_CODE, ["revenue"], ctx.tx("Akun Diskon Penjualan", "Sales Discount account")).id, debit: round(discount), credit: 0, description: "Diskon penjualan" });
  lines.push({ accountId: revenue.id, debit: 0, credit: round(gross), description: revenue.name });
  if (hpp > 0) {
    const hppCode = String(get("kodeHpp") ?? "").trim() || SALES_CATEGORIES[catKey ?? "lainnya"].cogs;
    const cogs = accountByCode(ctx, hppCode, ["expense"], ctx.colName("kodeHpp"));
    const inventory =
      mode === "saldo_awal"
        ? accountByCode(ctx, OPENING_EQUITY_CODE, ["equity"], ctx.tx("Akun Ekuitas Saldo Awal", "Opening Balance Equity account")).id
        : await getMappedAccountId(outletId, "product", "inventory", "1161");
    lines.push({ accountId: cogs.id, debit: round(hpp), credit: 0, description: "HPP" });
    lines.push({ accountId: inventory, debit: 0, credit: round(hpp), description: mode === "saldo_awal" ? "Ekuitas Saldo Awal (HPP historis)" : "Persediaan keluar (HPP)" });
  }
  const desc = String(get("deskripsi") ?? "").trim() || (catKey ? SALES_CATEGORIES[catKey].label.id : revenue.name);
  return { date, description: `[Impor Historis] Penjualan — ${desc}`, lines, preview: { account: ctx.accLabel(revenue), amount: round(gross), counter: settle.preview } };
}

async function buildPembelian(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = requireDate(ctx, mode, get("tanggal"));
  const amount = requireAmount(ctx, get("nominal"));
  const typeKey = resolveOption(get("kategori"), bothLabels(PURCHASE_TYPES));
  const code = String(get("kodeAkun") ?? "").trim();
  if (!typeKey && !code) throw missingCategoryOrCode(ctx);
  let target: AccountRow;
  if (code) {
    target = accountByCode(ctx, code, ["asset", "expense"], ctx.colName("kodeAkun"));
    if (/^1(1[1-3]|2)/.test(target.code)) {
      throw new Error(
        target.code.startsWith("12")
          ? ctx.tx(
              `${target.code} adalah aset tetap — catat lewat menu Aset → Pembelian Aset (pilih "Saldo awal") supaya ikut penyusutan.`,
              `${target.code} is a fixed asset — record it through Assets → Asset Purchase (choose "Opening balance") so it is depreciated.`
            )
          : ctx.tx(`${target.code} adalah akun kas/bank — bukan tujuan pembelian.`, `${target.code} is a cash/bank account — not a purchase target.`)
      );
    }
  } else if (typeKey === "stok") {
    const id = await getMappedAccountId(outletId, "product", "inventory", PURCHASE_TYPES.stok.code);
    target = [...ctx.byCode.values()].find((a) => a.id === id) ?? accountByCode(ctx, PURCHASE_TYPES.stok.code, ["asset"], ctx.tx("Akun Persediaan", "Inventory account"));
  } else {
    target = accountByCode(ctx, PURCHASE_TYPES.operasional.code, ["expense"], ctx.tx("Akun beban operasional", "Operating expense account"));
  }
  let settle = await settlementAccount(outletId, ctx, mode, get("metode"), { hutang: true });
  if (settle.kind === "payable") {
    const a = accountByCode(ctx, SUPPLIER_PAYABLE_CODE, ["liability"], ctx.tx("Akun Utang Supplier", "Supplier Payable account"));
    settle = { kind: "payable", accountId: a.id, label: "Utang supplier (belum dibayar)", preview: ctx.tx("Utang supplier (belum dibayar)", "Supplier payable (unpaid)") };
  }
  const supplier = String(get("pihak") ?? "").trim();
  const desc = String(get("deskripsi") ?? "").trim() || target.name;
  return {
    date,
    description: `[Impor Historis] Pembelian — ${desc}${supplier ? ` (${supplier})` : ""}`,
    lines: [
      { accountId: target.id, debit: round(amount), credit: 0, description: target.name },
      { accountId: settle.accountId, debit: 0, credit: round(amount), description: settle.label },
    ],
    preview: { account: ctx.accLabel(target), amount: round(amount), counter: settle.preview },
  };
}

async function buildPendapatanLain(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = requireDate(ctx, mode, get("tanggal"));
  const amount = requireAmount(ctx, get("nominal"));
  const catKey = resolveOption(get("kategori"), OTHER_INCOME_ALL_LABELS);
  const code = String(get("kodeAkun") ?? "").trim();
  if (!catKey && !code) throw missingCategoryOrCode(ctx);
  const revenueId = code
    ? accountByCode(ctx, code, ["revenue"], ctx.colName("kodeAkun")).id
    : await getMappedAccountId(outletId, "other_income", catKey!, OTHER_INCOME_FALLBACK[catKey!]);
  const revenueRow = [...ctx.byCode.values()].find((a) => a.id === revenueId);
  const payer = String(get("pihak") ?? "").trim();
  const descRaw = String(get("deskripsi") ?? "").trim();
  const journalLabel = revenueRow ? `${revenueRow.code} ${revenueRow.name}` : catKey ? OTHER_INCOME_CATEGORY_LABEL[catKey] : code;
  const previewLabel = revenueRow ? ctx.accLabel(revenueRow) : catKey ? otherIncomeLabel(catKey, ctx.lang) : code;

  // Kas mode + kategori standar → lewat mesin Pendapatan Lain-lain (ikut tampil di halamannya).
  if (mode === "kas" && !code && catKey) {
    const method = resolveMethod(ctx, get("metode"));
    return {
      date,
      description: descRaw,
      lines: [],
      preview: { account: previewLabel, amount: round(amount), counter: paymentMethodLabel(method, ctx.lang) },
      otherIncome: { category: catKey, method, payer: payer || undefined, description: descRaw || undefined, amount: round(amount) },
    };
  }
  const settle = await settlementAccount(outletId, ctx, mode, get("metode"), { piutang: true });
  return {
    date,
    description: `[Impor Historis] Pendapatan lain — ${descRaw || journalLabel}${payer ? ` (${payer})` : ""}`,
    lines: [
      { accountId: settle.accountId, debit: round(amount), credit: 0, description: settle.label },
      { accountId: revenueId, debit: 0, credit: round(amount), description: journalLabel },
    ],
    preview: { account: previewLabel, amount: round(amount), counter: settle.preview },
  };
}

async function buildPengeluaran(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = requireDate(ctx, mode, get("tanggal"));
  const amount = requireAmount(ctx, get("nominal"));
  const catKey = resolveOption(get("kategori"), bothLabels(EXPENSE_CATEGORIES));
  const code = String(get("kodeAkun") ?? "").trim();
  if (!catKey && !code) throw missingCategoryOrCode(ctx);
  const expense = accountByCode(ctx, code || EXPENSE_CATEGORIES[catKey!].code, ["expense"], code ? ctx.colName("kodeAkun") : ctx.tx("Akun beban kategori", "Category expense account"));
  if (expense.code.startsWith("68")) {
    throw new Error(ctx.tx(`${expense.code} adalah beban penyusutan — dihitung otomatis dari menu Aset, jangan diimpor.`, `${expense.code} is a depreciation expense — it is calculated automatically from the Assets menu, do not import it.`));
  }
  let settle = await settlementAccount(outletId, ctx, mode, get("metode"), { hutang: true });
  if (settle.kind === "payable") {
    const a = accountByCode(ctx, EXPENSE_PAYABLE_ACCOUNT_CODE, ["liability"], ctx.tx("Akun Utang Biaya", "Accrued Expenses account"));
    settle = { kind: "payable", accountId: a.id, label: "Utang biaya (belum dibayar)", preview: ctx.tx("Utang biaya (belum dibayar)", "Expense payable (unpaid)") };
  }
  const payee = String(get("pihak") ?? "").trim();
  const desc = String(get("deskripsi") ?? "").trim() || expense.name;
  return {
    date,
    description: `[Impor Historis] Beban — ${desc}${payee ? ` (${payee})` : ""}`,
    lines: [
      { accountId: expense.id, debit: round(amount), credit: 0, description: expense.name },
      { accountId: settle.accountId, debit: 0, credit: round(amount), description: settle.label },
    ],
    preview: { account: ctx.accLabel(expense), amount: round(amount), counter: settle.preview },
  };
}

const BUILDERS: Record<HistoricalCategory, (outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown) => Promise<ParsedRow>> = {
  penjualan: buildPenjualan,
  pembelian: buildPembelian,
  pendapatan_lain: buildPendapatanLain,
  pengeluaran: buildPengeluaran,
};
const REF_PREFIX: Record<HistoricalCategory, string> = { penjualan: "HIST-JUAL", pembelian: "HIST-BELI", pendapatan_lain: "HIST-PLAIN", pengeluaran: "HIST-BBN" };

// ---------------------------------------------------------------- impor

export interface ImportRowResult {
  row: number;
  action: "posted" | "skipped" | "error" | "ok";
  error?: string;
  date?: string;
  account?: string;
  amount?: number;
  counter?: string;
}
export interface ImportSummary {
  dryRun: boolean;
  mode: HistoricalMode;
  totalRows: number;
  posted: number;
  skipped: number;
  errors: number;
  totalAmount: number;
  byAccount: { account: string; amount: number; rows: number }[];
  details: ImportRowResult[];
}

const AUX_SHEET_NAMES_LOWER: string[] = Object.values(AUX_SHEET_NAME).flatMap((n) => Object.values(n).map((x) => x.toLowerCase()));

function readSheet(fileBuffer: Buffer, category: HistoricalCategory, lang: TemplateLang): unknown[][] {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const dataNames = Object.values(DATA_SHEET_NAME[category]).map((n) => n.toLowerCase());
  const preferred = wb.SheetNames.find((n) => dataNames.includes(n.toLowerCase()));
  const name = preferred ?? wb.SheetNames.find((n) => !AUX_SHEET_NAMES_LOWER.includes(n.toLowerCase()));
  if (!name) throw new Error(lang === "id" ? "File Excel tidak punya sheet data." : "The Excel file has no data sheet.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, blankrows: false, raw: true, defval: "" });
  if (rows.length < 2) {
    throw new Error(
      lang === "id"
        ? `Sheet "${name}" belum berisi data (baris 1 = judul kolom, data mulai baris 2).`
        : `Sheet "${name}" has no data yet (row 1 = column headers, data starts on row 2).`
    );
  }
  return rows;
}

export async function importHistoricalRows(
  outletId: string,
  category: HistoricalCategory,
  fileBuffer: Buffer,
  staffUserId?: string,
  opts: { mode?: HistoricalMode; dryRun?: boolean; lang?: TemplateLang } = {}
): Promise<ImportSummary> {
  const mode: HistoricalMode = opts.mode === "saldo_awal" ? "saldo_awal" : "kas";
  const dryRun = Boolean(opts.dryRun);
  const lang: TemplateLang = opts.lang === "en" ? "en" : "id";
  const rows = readSheet(fileBuffer, category, lang);
  const cols = mapHeaders(rows[0]);
  const required: ColKey[] = ["tanggal", "nominal"];
  const missing = required.filter((k) => cols[k] === undefined);
  const header = (k: ColKey) => templateHeader(category, k, lang).replace(/\*$/, "");
  if (missing.length) {
    const names = missing.map(header).join(", ");
    throw new Error(lang === "id" ? `Kolom wajib tidak ditemukan: ${names}. Pakai template terbaru.` : `Required column(s) not found: ${names}. Use the latest template.`);
  }
  if (cols.kategori === undefined && cols.kodeAkun === undefined) {
    throw new Error(
      lang === "id"
        ? `Kolom ${header("kategori")} atau ${header("kodeAkun")} wajib ada. Pakai template terbaru.`
        : `Column ${header("kategori")} or ${header("kodeAkun")} is required. Use the latest template.`
    );
  }

  const ctx = await loadContext(outletId, category, lang);
  const details: ImportRowResult[] = [];
  const seen = new Map<string, number>();
  const prepared: { rowNum: number; ref: string; parsed: ParsedRow }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    if (!r || r.every((c) => String(c ?? "").trim() === "")) continue;
    const get = (k: ColKey) => (cols[k] === undefined ? undefined : r[cols[k]!]);
    const body = JSON.stringify(r.map((c) => String(c ?? "").trim()));
    const occurrence = (seen.get(body) ?? 0) + 1;
    seen.set(body, occurrence);
    try {
      const parsed = await BUILDERS[category](outletId, ctx, mode, get);
      const ref = `${REF_PREFIX[category]}-${rowFingerprint(category, mode, r, occurrence)}`;
      prepared.push({ rowNum, ref, parsed });
    } catch (err: unknown) {
      details.push({ row: rowNum, action: "error", error: describeError(err) });
    }
  }

  // Rows already imported earlier (same fingerprint) are skipped — re-uploading a file is safe.
  const refs = prepared.map((p) => p.ref);
  const existing = new Set<string>();
  for (let i = 0; i < refs.length; i += 500) {
    const chunk = refs.slice(i, i + 500);
    const found = await db
      .select({ reference: journalEntries.reference })
      .from(journalEntries)
      .where(and(eq(journalEntries.outletId, outletId), eq(journalEntries.status, "posted"), inArray(journalEntries.reference, chunk)));
    for (const f of found) if (f.reference) existing.add(f.reference);
  }
  if (category === "pendapatan_lain" && prepared.some((p) => p.parsed.otherIncome)) {
    const found = await db
      .select({ description: otherIncomes.description })
      .from(otherIncomes)
      .where(and(eq(otherIncomes.outletId, outletId), like(otherIncomes.description, "%[HIST:%"), eq(otherIncomes.status, "posted")));
    for (const f of found) {
      const m = f.description?.match(/\[HIST:([A-Z-]+-[0-9a-f]{12})\]/);
      if (m) existing.add(m[1]);
    }
  }

  let posted = 0;
  let skipped = 0;
  for (const p of prepared) {
    const base = { row: p.rowNum, date: p.parsed.date, account: p.parsed.preview.account, amount: p.parsed.preview.amount, counter: p.parsed.preview.counter };
    if (existing.has(p.ref)) {
      skipped++;
      details.push({ ...base, action: "skipped", error: ctx.tx("Sudah pernah diimpor (baris identik) — dilewati.", "Already imported (identical row) — skipped.") });
      continue;
    }
    if (dryRun) {
      details.push({ ...base, action: "ok" });
      continue;
    }
    try {
      if (p.parsed.otherIncome) {
        const oi = p.parsed.otherIncome;
        await createOtherIncome({
          outletId,
          category: oi.category,
          description: `${oi.description ? `${oi.description} ` : ""}[Impor Historis] [HIST:${p.ref}]`,
          payerName: oi.payer,
          amount: oi.amount,
          paymentMethod: oi.method,
          incomeDate: entryDateOf(p.parsed.date),
          staffUserId,
          shiftId: null,
        });
      } else {
        await postJournal({
          outletId,
          entryDate: entryDateOf(p.parsed.date),
          reference: p.ref,
          description: p.parsed.description,
          sourceType: "historical_import",
          staffUserId,
          lines: p.parsed.lines,
        });
      }
      existing.add(p.ref);
      posted++;
      details.push({ ...base, action: "posted" });
    } catch (err: unknown) {
      details.push({ ...base, action: "error", error: describeError(err) });
    }
  }

  details.sort((a, b) => a.row - b.row);
  const counted = details.filter((d) => d.action === (dryRun ? "ok" : "posted"));
  const byAccountMap = new Map<string, { account: string; amount: number; rows: number }>();
  for (const d of counted) {
    const cur = byAccountMap.get(d.account!) ?? { account: d.account!, amount: 0, rows: 0 };
    cur.amount += d.amount ?? 0;
    cur.rows += 1;
    byAccountMap.set(d.account!, cur);
  }
  return {
    dryRun,
    mode,
    totalRows: details.length,
    posted: dryRun ? counted.length : posted,
    skipped,
    errors: details.filter((d) => d.action === "error").length,
    totalAmount: counted.reduce((s, d) => s + (d.amount ?? 0), 0),
    byAccount: [...byAccountMap.values()].sort((a, b) => b.amount - a.amount),
    details,
  };
}

// ---------------------------------------------------------------- template

interface ColumnSpec { header: string; required: string; desc: string; example: (string | number)[] }

function columnSpecs(category: HistoricalCategory, lang: TemplateLang): ColumnSpec[] {
  const L = (id: string, en: string) => (lang === "id" ? id : en);
  const h = (k: ColKey) => templateHeader(category, k, lang);
  const optionsSheet = AUX_SHEET_NAME.options[lang];
  const accountsSheet = AUX_SHEET_NAME.accounts[lang];
  const pm = (m: PaymentMethod) => paymentMethodLabel(m, lang);
  const REQ = L("Wajib", "Required");
  const OPT = L("Opsional", "Optional");
  const REQ_IF_NO_CODE = L("Wajib jika Kode Akun kosong", "Required if Account Code is empty");
  const REQ_CASH_MODE = L("Wajib (mode Kas/Bank)", "Required (Cash/Bank mode)");
  const dateFmt = L("Sel tanggal Excel, YYYY-MM-DD, atau DD/MM/YYYY.", "Excel date cell, YYYY-MM-DD, or DD/MM/YYYY.");
  const methods = L(
    `Salah satu nilai kolom ${h("metode").replace(/\*$/, "")} di sheet ${optionsSheet} (mis. ${pm("cash")}, ${pm("qris")}, ${pm("transfer")})`,
    `One of the ${h("metode").replace(/\*$/, "")} values in the ${optionsSheet} sheet (e.g. ${pm("cash")}, ${pm("qris")}, ${pm("transfer")})`
  );
  if (category === "penjualan") {
    return [
      { header: h("tanggal"), required: REQ, desc: `${L("Tanggal transaksi.", "Transaction date.")} ${dateFmt}`, example: ["2026-01-05", "06/01/2026"] },
      { header: h("kategori"), required: REQ_IF_NO_CODE, desc: L(`Pilihan di sheet ${optionsSheet}. Menentukan akun pendapatan & HPP bawaan.`, `A choice from the ${optionsSheet} sheet. Sets the default revenue & COGS accounts.`), example: [SALES_CATEGORIES.rental.label[lang], SALES_CATEGORIES.fnb.label[lang]] },
      { header: h("kodeAkun"), required: OPT, desc: L(`Kode akun pendapatan (4xxx) dari sheet ${accountsSheet} — mengalahkan Kategori. Mis. 4120 Rental PS5 untuk rincian per konsol.`, `Revenue account code (4xxx) from the ${accountsSheet} sheet — overrides Category. E.g. 4120 PS5 Rental for a per-console breakdown.`), example: ["", "4210"] },
      { header: h("deskripsi"), required: OPT, desc: L("Mis. 'Rekap penjualan harian' atau nomor struk lama.", "E.g. 'Daily sales recap' or an old receipt number."), example: [L("Rekap rental 5 Jan", "Rental recap Jan 5"), L("Rekap F&B 6 Jan", "F&B recap Jan 6")] },
      { header: h("nominal"), required: REQ, desc: L("Nilai penjualan SEBELUM diskon, > 0. Boleh per transaksi atau rekap per hari (disarankan per hari per kategori).", "Sales value BEFORE discount, > 0. Per transaction or a daily recap (one row per day per category is recommended)."), example: [750000, 420000] },
      { header: h("diskon"), required: OPT, desc: L("Total diskon yang diberikan → akun 4910 Diskon Penjualan (mengurangi pendapatan).", "Total discount given → account 4910 Sales Discount (reduces revenue)."), example: [50000, 0] },
      { header: h("hpp"), required: OPT, desc: L("Harga pokok barang yang terjual (F&B/produk). Isi supaya Laba Kotor historis benar. Rental umumnya 0.", "Cost of goods sold (F&B/products). Fill it in so historical Gross Profit is correct. Usually 0 for rentals."), example: [0, 180000] },
      { header: h("kodeHpp"), required: OPT, desc: L("Kode akun HPP (5xxx). Kosong = bawaan kategori.", "COGS account code (5xxx). Empty = category default."), example: ["", "5110"] },
      { header: h("metode"), required: REQ_CASH_MODE, desc: L(`${methods}, atau "${PIUTANG_LABEL.id}". Diabaikan pada mode "Hanya riwayat Laba Rugi".`, `${methods}, or "${PIUTANG_LABEL.en}". Ignored in the "Profit & Loss history only" mode.`), example: [pm("cash"), pm("qris")] },
      { header: h("pihak"), required: OPT, desc: L("Nama pelanggan (untuk piutang).", "Customer name (for receivables)."), example: ["", ""] },
      { header: h("referensi"), required: OPT, desc: L("Nomor bukti dari sistem lama.", "Document number from the old system."), example: ["Z-0105", "Z-0106"] },
    ];
  }
  if (category === "pembelian") {
    return [
      { header: h("tanggal"), required: REQ, desc: `${L("Tanggal pembelian.", "Purchase date.")} ${dateFmt}`, example: ["2026-01-03", "10/01/2026"] },
      { header: h("kategori"), required: REQ_IF_NO_CODE, desc: L("Persediaan (stok barang dagang/bahan baku) → akun Persediaan; Beban operasional → 6900.", "Inventory (merchandise stock/raw materials) → Inventory account; Operating expense → 6900."), example: [PURCHASE_TYPES.stok.label[lang], PURCHASE_TYPES.operasional.label[lang]] },
      { header: h("kodeAkun"), required: OPT, desc: L(`Kode akun persediaan (116x) atau beban (5xxx–8xxx) dari ${accountsSheet}. Aset tetap (12xx) TIDAK di sini — pakai menu Aset → Pembelian Aset.`, `Inventory (116x) or expense (5xxx–8xxx) account code from the ${accountsSheet}. Fixed assets (12xx) do NOT go here — use Assets → Asset Purchase.`), example: ["1162", ""] },
      { header: h("deskripsi"), required: OPT, desc: L("Mis. 'Belanja minuman botol'.", "E.g. 'Bottled drinks restock'."), example: [L("Belanja minuman botol", "Bottled drinks restock"), L("Gas LPG & sabun", "LPG gas & soap")] },
      { header: h("nominal"), required: REQ, desc: L("Total yang dibeli (termasuk ongkos kirim), > 0.", "Total purchased (including shipping), > 0."), example: [1250000, 95000] },
      { header: h("metode"), required: REQ_CASH_MODE, desc: L(`${methods}, atau "${HUTANG_LABEL.id}" → 2111 Utang Supplier.`, `${methods}, or "${HUTANG_LABEL.en}" → 2111 Supplier Payable.`), example: [pm("transfer"), HUTANG_LABEL[lang]] },
      { header: h("pihak"), required: OPT, desc: L("Nama supplier/toko.", "Supplier/store name."), example: ["CV Sumber Minum", "Toko Jaya"] },
      { header: h("referensi"), required: OPT, desc: L("Nomor nota/faktur supplier.", "Supplier receipt/invoice number."), example: ["INV-221", ""] },
    ];
  }
  if (category === "pendapatan_lain") {
    return [
      { header: h("tanggal"), required: REQ, desc: `${L("Tanggal diterima.", "Date received.")} ${dateFmt}`, example: ["2026-01-15", "31/01/2026"] },
      { header: h("kategori"), required: REQ_IF_NO_CODE, desc: L(`Pilihan di sheet ${optionsSheet} (Komisi, Sewa Tempat, Penjualan Barang Bekas, Sponsorship, Denda, Bunga Bank, Lain-lain).`, `A choice from the ${optionsSheet} sheet (Commission, Space Rental, Sale of Used Goods, Sponsorship, Penalty, Bank Interest, Other).`), example: [otherIncomeLabel("vendor_commission", lang), otherIncomeLabel("bank_interest_cashback", lang)] },
      { header: h("kodeAkun"), required: OPT, desc: L(`Kode akun pendapatan (46xx/47xx/7xxx) dari ${accountsSheet} — mengalahkan Kategori.`, `Revenue account code (46xx/47xx/7xxx) from the ${accountsSheet} — overrides Category.`), example: ["", ""] },
      { header: h("deskripsi"), required: OPT, desc: L("Keterangan.", "Notes."), example: [L("Komisi titip jual voucher", "Voucher consignment commission"), L("Bunga tabungan Jan", "Savings interest Jan")] },
      { header: h("pihak"), required: OPT, desc: L("Nama pihak pembayar.", "Name of the payer."), example: ["PT Voucher Game", "Bank BRI"] },
      { header: h("nominal"), required: REQ, desc: L("Jumlah diterima, > 0.", "Amount received, > 0."), example: [300000, 12500] },
      { header: h("metode"), required: REQ_CASH_MODE, desc: `${methods}.`, example: [pm("transfer"), pm("transfer")] },
    ];
  }
  return [
    { header: h("tanggal"), required: REQ, desc: `${L("Tanggal biaya.", "Expense date.")} ${dateFmt}`, example: ["2026-01-25", "31/01/2026"] },
    { header: h("kategori"), required: REQ_IF_NO_CODE, desc: L(`Pilihan di sheet ${optionsSheet} (Gaji, Sewa, Listrik, Air, Internet, Servis PS, Iklan, dst).`, `A choice from the ${optionsSheet} sheet (Salaries, Rent, Electricity, Water, Internet, PS Repair, Advertising, etc.).`), example: [EXPENSE_CATEGORIES.gaji.label[lang], EXPENSE_CATEGORIES.listrik.label[lang]] },
    { header: h("kodeAkun"), required: OPT, desc: L(`Kode akun beban (5xxx–8xxx) dari ${accountsSheet} — mengalahkan Kategori. Beban penyusutan (68xx) tidak boleh diimpor.`, `Expense account code (5xxx–8xxx) from the ${accountsSheet} — overrides Category. Depreciation expense (68xx) cannot be imported.`), example: ["", "6220"] },
    { header: h("deskripsi"), required: OPT, desc: L("Keterangan.", "Notes."), example: [L("Gaji 2 kasir Januari", "January salary, 2 cashiers"), L("Token listrik Jan", "Electricity token Jan")] },
    { header: h("pihak"), required: OPT, desc: L("Nama penerima.", "Name of the payee."), example: [L("Kasir", "Cashier"), "PLN"] },
    { header: h("nominal"), required: REQ, desc: L("Jumlah biaya, > 0.", "Expense amount, > 0."), example: [4000000, 850000] },
    { header: h("metode"), required: REQ_CASH_MODE, desc: L(`${methods}, atau "${HUTANG_LABEL.id}" → utang biaya.`, `${methods}, or "${HUTANG_LABEL.en}" → expense payable.`), example: [pm("transfer"), pm("cash")] },
  ];
}

const RELEVANT_TYPES: Record<HistoricalCategory, string[]> = {
  penjualan: ["revenue", "expense"],
  pembelian: ["asset", "expense"],
  pendapatan_lain: ["revenue"],
  pengeluaran: ["expense"],
};

function guideRows(category: HistoricalCategory, lang: TemplateLang, specs: ColumnSpec[]): (string | number)[][] {
  const dataSheet = DATA_SHEET_NAME[category][lang];
  const S = AUX_SHEET_NAME;
  if (lang === "id") {
    return [
      [`PETUNJUK IMPOR ${dataSheet.toUpperCase()} HISTORIS — NEXBILL`],
      [],
      ["LANGKAH"],
      ["1", `Isi data di sheet "${dataSheet}" mulai baris 2. Jangan ubah judul kolom di baris 1. Kolom bertanda * wajib.`],
      ["2", `Lihat sheet ${S.example.id} untuk format pengisian, sheet ${S.options.id} untuk nilai Kategori/Metode, dan sheet ${S.accounts.id} untuk kode akun outlet Anda.`],
      ["3", "Di NEXBILL: Accounting → Migrasi Data → pilih MODE → Upload → klik 'Periksa dulu' untuk melihat hasil tanpa menyimpan → lalu 'Impor'."],
      ["4", "Setelah impor, cek tab Laba Rugi / Neraca Saldo pada periode data tersebut."],
      [],
      ["PILIH MODE (penting — mencegah saldo kas terhitung dua kali)"],
      ["Kas/Bank", "Uang masuk/keluar ke akun Kas/Bank sesuai Metode Pembayaran. Pakai JIKA Anda TIDAK mengisi Saldo Awal dan ingin membangun riwayat lengkap dari nol. Baris bertanggal sebelum Saldo Awal akan ditolak."],
      ["Hanya riwayat Laba Rugi", "Lawan akun = 3400 Ekuitas Saldo Awal; kolom Metode diabaikan. Pakai JIKA Anda sudah/akan mengisi Saldo Awal: riwayat pendapatan & biaya muncul di Laba Rugi, sementara saldo kas/bank/utang tetap dari Saldo Awal. Baris pada/sesudah tanggal Saldo Awal akan ditolak."],
      [],
      ["ATURAN"],
      ["•", "Satu baris = satu jurnal. Rekap per hari per kategori sudah cukup dan membuat file ringkas."],
      ["•", "Nominal boleh ditulis 1500000, 1.500.000, atau Rp 1.500.000."],
      ["•", "Mengunggah file yang sama dua kali AMAN: baris yang sudah pernah diimpor otomatis dilewati. Untuk mengoreksi, batalkan jurnalnya di tab Jurnal lalu impor ulang barisnya."],
      ["•", "Periode yang sudah ditutup (Tutup Periode) tidak bisa menerima data — buka dulu bila memang perlu."],
      ["•", "Data historis masuk ke Jurnal & laporan keuangan, TIDAK membuat order/faktur/expense di menu operasional (kecuali Pendapatan Lain-lain mode Kas/Bank tanpa kode akun khusus, yang juga tampil di halaman Pendapatan Lain-lain)."],
      [],
      ["KOLOM", "WAJIB?", "KETERANGAN"],
      ...specs.map((s) => [s.header, s.required, s.desc]),
      [],
      ["JURNAL YANG DIBENTUK"],
      ...journalExplanation(category, lang).map((l) => ["", l]),
    ];
  }
  return [
    [`HISTORICAL ${dataSheet.toUpperCase()} IMPORT INSTRUCTIONS — NEXBILL`],
    [],
    ["STEPS"],
    ["1", `Fill in the "${dataSheet}" sheet starting from row 2. Do not change the column headers in row 1. Columns marked * are required.`],
    ["2", `See the ${S.example.en} sheet for the format, the ${S.options.en} sheet for Category/Method values, and the ${S.accounts.en} sheet for your outlet's account codes.`],
    ["3", "In NEXBILL: Accounting → Data Migration → choose a MODE → Upload → click 'Check first' to preview without saving → then 'Import'."],
    ["4", "After importing, check the Profit & Loss / Trial Balance tabs for that period."],
    [],
    ["CHOOSE A MODE (important — prevents cash balances from being counted twice)"],
    ["Cash/Bank", "Money goes in/out of the Cash/Bank account matching the Payment Method. Use this IF you do NOT use an Opening Balance and want to build the full history from scratch. Rows dated before the Opening Balance are rejected."],
    ["Profit & Loss history only", "Counter account = 3400 Opening Balance Equity; the Method column is ignored. Use this IF you have entered / will enter an Opening Balance: historical revenue & expenses appear in Profit & Loss, while cash/bank/payable balances still come from the Opening Balance. Rows dated on/after the Opening Balance date are rejected."],
    [],
    ["RULES"],
    ["•", "One row = one journal entry. A daily recap per category is enough and keeps the file small."],
    ["•", "Amounts can be written as 1500000, 1.500.000, 1,500,000, or Rp 1.500.000."],
    ["•", "Uploading the same file twice is SAFE: rows already imported are skipped automatically. To correct a row, void its journal in the Journal tab and re-import it."],
    ["•", "Closed periods (Close Period) cannot receive data — reopen them first if needed."],
    ["•", "Historical data goes into the Journal & financial reports and does NOT create orders/invoices/expenses in the operational menus (except Other Income in Cash/Bank mode without a custom account code, which also appears on the Other Income page)."],
    [],
    ["COLUMN", "REQUIRED?", "DESCRIPTION"],
    ...specs.map((s) => [s.header, s.required, s.desc]),
    [],
    ["JOURNAL ENTRIES CREATED"],
    ...journalExplanation(category, lang).map((l) => ["", l]),
  ];
}

/** Template Excel per outlet: sheet data kosong + Petunjuk + Contoh + Pilihan + Daftar Akun (COA outlet sendiri), dalam Bahasa Indonesia atau Inggris. */
export async function generateHistoricalImportTemplate(outletId: string, category: HistoricalCategory, lang: TemplateLang = "id"): Promise<Buffer> {
  const specs = columnSpecs(category, lang);
  const L = (id: string, en: string) => (lang === "id" ? id : en);
  const wb = XLSX.utils.book_new();

  const data = XLSX.utils.aoa_to_sheet([specs.map((s) => s.header)]);
  data["!cols"] = specs.map((s) => ({ wch: Math.max(16, s.header.length + 4) }));
  XLSX.utils.book_append_sheet(wb, data, DATA_SHEET_NAME[category][lang]);

  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows(category, lang, specs));
  guideSheet["!cols"] = [{ wch: 26 }, { wch: 26 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, guideSheet, AUX_SHEET_NAME.guide[lang]);

  const example = XLSX.utils.aoa_to_sheet([specs.map((s) => s.header), ...[0, 1].map((i) => specs.map((s) => s.example[i] ?? ""))]);
  example["!cols"] = specs.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, example, AUX_SHEET_NAME.example[lang]);

  const ctxRows = await db
    .select({ id: accounts.id, code: accounts.code, name: accounts.name, type: accounts.type, isPostingAllowed: accounts.isPostingAllowed })
    .from(accounts)
    .where(and(eq(accounts.outletId, outletId), eq(accounts.isActive, true)));
  const nameOf = (code: string) => {
    const a = ctxRows.find((x) => x.code === code);
    return a ? `${a.code} ${coaAccountNameForLang(lang, a)}` : code;
  };

  const categoryHeader = templateHeader(category, "kategori", lang);
  const choices: (string | number)[][] = [];
  if (category === "penjualan") {
    choices.push([categoryHeader, L("Akun pendapatan", "Revenue account"), L("Akun HPP bawaan", "Default COGS account")]);
    for (const v of Object.values(SALES_CATEGORIES)) choices.push([v.label[lang], nameOf(v.revenue), nameOf(v.cogs)]);
  } else if (category === "pembelian") {
    choices.push([categoryHeader, L("Akun tujuan", "Target account")]);
    for (const v of Object.values(PURCHASE_TYPES)) choices.push([v.label[lang], nameOf(v.code)]);
  } else if (category === "pendapatan_lain") {
    choices.push([categoryHeader, L("Akun pendapatan bawaan", "Default revenue account")]);
    for (const k of Object.keys(OTHER_INCOME_CATEGORY_LABEL) as OtherIncomeCategory[]) choices.push([otherIncomeLabel(k, lang), nameOf(OTHER_INCOME_FALLBACK[k])]);
  } else {
    choices.push([categoryHeader, L("Akun beban", "Expense account")]);
    for (const v of Object.values(EXPENSE_CATEGORIES)) choices.push([v.label[lang], nameOf(v.code)]);
  }
  choices.push([], [templateHeader(category, "metode", lang).replace(/\*$/, ""), L("Keterangan", "Notes")]);
  for (const m of PAYMENT_METHOD_OPTIONS) choices.push([paymentMethodLabel(m.value, lang), L("Masuk/keluar di akun kas/bank sesuai Account Mapping metode ini", "In/out of the cash/bank account set in this method's Account Mapping")]);
  if (category === "penjualan" || category === "pendapatan_lain") choices.push([PIUTANG_LABEL[lang], L("Dicatat sebagai piutang pelanggan (1141)", "Recorded as a customer receivable (1141)")]);
  if (category === "pembelian" || category === "pengeluaran") {
    choices.push([
      HUTANG_LABEL[lang],
      category === "pembelian" ? L("Dicatat sebagai utang supplier (2111)", "Recorded as a supplier payable (2111)") : L("Dicatat sebagai utang biaya", "Recorded as an expense payable"),
    ]);
  }
  const choiceSheet = XLSX.utils.aoa_to_sheet(choices);
  choiceSheet["!cols"] = [{ wch: 48 }, { wch: 48 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, choiceSheet, AUX_SHEET_NAME.options[lang]);

  const REPORT: Record<string, Bi> = {
    asset: { id: "Neraca — Aset", en: "Balance Sheet — Assets" },
    liability: { id: "Neraca — Liabilitas", en: "Balance Sheet — Liabilities" },
    equity: { id: "Neraca — Ekuitas", en: "Balance Sheet — Equity" },
    revenue: { id: "Laba Rugi — Pendapatan", en: "Profit & Loss — Revenue" },
    expense: { id: "Laba Rugi — Beban/HPP", en: "Profit & Loss — Expenses/COGS" },
  };
  const list = ctxRows
    .filter((a) => RELEVANT_TYPES[category].includes(a.type))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => [
      a.code,
      coaAccountNameForLang(lang, a),
      REPORT[a.type]?.[lang] ?? a.type,
      a.isPostingAllowed ? L("Bisa dipakai", "Usable") : L("Akun induk (jangan dipakai)", "Parent account (do not use)"),
    ]);
  const accSheet = XLSX.utils.aoa_to_sheet([[L("Kode Akun", "Account Code"), L("Nama Akun", "Account Name"), L("Laporan", "Report"), "Status"], ...list]);
  accSheet["!cols"] = [{ wch: 12 }, { wch: 46 }, { wch: 26 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, accSheet, AUX_SHEET_NAME.accounts[lang]);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function journalExplanation(category: HistoricalCategory, lang: TemplateLang): string[] {
  if (lang === "en") {
    if (category === "penjualan") {
      return [
        "Dr Cash/Bank/Receivable (gross sales − discount)  ·  Dr 4910 Sales Discount (discount)  ·  Cr Revenue Account (gross sales)",
        "If COGS is filled in: Dr COGS Account  ·  Cr Inventory (Cash/Bank mode) or Cr 3400 Opening Balance Equity (P&L mode)",
        "Cash/Bank mode + COGS: also import Purchases of type Inventory so the Inventory balance does not go negative.",
      ];
    }
    if (category === "pembelian") return ["Dr Inventory / target Expense  ·  Cr Cash/Bank, 2111 Supplier Payable, or 3400 Opening Balance Equity (P&L mode)"];
    if (category === "pendapatan_lain") return ["Dr Cash/Bank/Receivable or 3400 Opening Balance Equity  ·  Cr Other Income Account"];
    return ["Dr Expense Account  ·  Cr Cash/Bank, Expense Payable, or 3400 Opening Balance Equity (P&L mode)"];
  }
  if (category === "penjualan") {
    return [
      "Dr Kas/Bank/Piutang (penjualan kotor − diskon)  ·  Dr 4910 Diskon Penjualan (diskon)  ·  Cr Akun Pendapatan (penjualan kotor)",
      "Jika HPP diisi: Dr Akun HPP  ·  Cr Persediaan (mode Kas/Bank) atau Cr 3400 Ekuitas Saldo Awal (mode Laba Rugi)",
      "Mode Kas/Bank + HPP: impor juga Pembelian jenis Persediaan agar saldo Persediaan tidak minus.",
    ];
  }
  if (category === "pembelian") return ["Dr Persediaan / Beban tujuan  ·  Cr Kas/Bank, 2111 Utang Supplier, atau 3400 Ekuitas Saldo Awal (mode Laba Rugi)"];
  if (category === "pendapatan_lain") return ["Dr Kas/Bank/Piutang atau 3400 Ekuitas Saldo Awal  ·  Cr Akun Pendapatan Lain-lain"];
  return ["Dr Akun Beban  ·  Cr Kas/Bank, Utang Biaya, atau 3400 Ekuitas Saldo Awal (mode Laba Rugi)"];
}
