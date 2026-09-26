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
 */

export type HistoricalCategory = "penjualan" | "pembelian" | "pendapatan_lain" | "pengeluaran";
export type HistoricalMode = "kas" | "saldo_awal";

const OPENING_EQUITY_CODE = "3400";
const RECEIVABLE_CODE = "1141";
const SUPPLIER_PAYABLE_CODE = "2111";
const SALES_DISCOUNT_CODE = "4910";

const round = (n: number) => Math.round(n);

// ---------------------------------------------------------------- pilihan kategori

const SALES_CATEGORIES: Record<string, { label: string; revenue: string; cogs: string }> = {
  rental: { label: "Rental PS", revenue: "4170", cogs: "5400" },
  fnb: { label: "F&B (Makanan/Minuman/Snack)", revenue: "4260", cogs: "5160" },
  produk: { label: "Produk/Merchandise", revenue: "4330", cogs: "5210" },
  ppob: { label: "PPOB", revenue: "4480", cogs: "5400" },
  membership: { label: "Iuran Membership", revenue: "4645", cogs: "5400" },
  lainnya: { label: "Lainnya", revenue: "4650", cogs: "5400" },
};

const PURCHASE_TYPES: Record<string, { label: string; code: string }> = {
  stok: { label: "Persediaan (stok barang dagang / bahan baku)", code: "1161" },
  operasional: { label: "Beban operasional (habis pakai)", code: "6900" },
};

const EXPENSE_CATEGORIES: Record<string, { label: string; code: string }> = {
  gaji: { label: "Gaji/Staf", code: "6110" },
  lembur: { label: "Lembur", code: "6120" },
  bonus: { label: "Bonus Karyawan", code: "6130" },
  sewa: { label: "Sewa Tempat", code: "6210" },
  listrik: { label: "Listrik", code: "6220" },
  air: { label: "Air", code: "6230" },
  internet: { label: "Internet", code: "6240" },
  telepon: { label: "Telepon/Pulsa", code: "6250" },
  sampah: { label: "Kebersihan/Sampah", code: "6260" },
  servis_ps: { label: "Servis PlayStation", code: "6310" },
  servis_tv: { label: "Servis TV", code: "6320" },
  servis_stik: { label: "Servis Stik/Controller", code: "6330" },
  perbaikan: { label: "Perbaikan Bangunan", code: "6350" },
  iklan: { label: "Iklan/Promosi", code: "6410" },
  atk: { label: "Alat Tulis/Perlengkapan Kantor", code: "6510" },
  biaya_bank: { label: "Biaya Admin Bank", code: "6530" },
  langganan: { label: "Langganan Software", code: "6550" },
  transport: { label: "Transportasi", code: "6610" },
  bensin: { label: "Bensin/BBM", code: "6630" },
  asuransi: { label: "Asuransi", code: "6700" },
  pajak: { label: "Pajak Penghasilan (PPh Final)", code: "8500" },
  bunga: { label: "Bunga Pinjaman", code: "8100" },
  operasional: { label: "Operasional (Umum)", code: "6900" },
  lain: { label: "Beban Lain-lain", code: "8900" },
};

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

const HUTANG_LABEL = "Hutang (belum dibayar)";
const PIUTANG_LABEL = "Piutang (belum dibayar)";

// ---------------------------------------------------------------- kolom

type ColKey = "tanggal" | "kategori" | "kodeAkun" | "deskripsi" | "nominal" | "diskon" | "hpp" | "kodeHpp" | "metode" | "pihak" | "referensi";

/** Judul kolom yang dikenali (huruf kecil, tanpa tanda *). Nama lama tetap diterima. */
const HEADER_ALIASES: Record<ColKey, string[]> = {
  tanggal: ["tanggal", "tgl", "date"],
  kategori: ["kategori", "kategori pendapatan", "kategori beban", "jenis", "jenis pembelian"],
  kodeAkun: ["kode akun", "kode akun pendapatan", "kode akun beban", "kode akun tujuan", "akun"],
  deskripsi: ["deskripsi", "keterangan", "uraian"],
  nominal: ["nominal", "penjualan kotor", "jumlah", "total"],
  diskon: ["diskon", "potongan"],
  hpp: ["hpp", "hpp/modal", "hpp / modal", "modal"],
  kodeHpp: ["kode akun hpp"],
  metode: ["metode pembayaran", "metode", "dibayar dengan"],
  pihak: ["supplier", "diterima dari", "dibayar kepada", "pelanggan", "pihak"],
  referensi: ["referensi", "no. referensi", "no referensi", "nomor bukti"],
};

export function normalizeHeader(h: unknown): string {
  return String(h ?? "").replace(/\*/g, "").replace(/\(.*?\)/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function mapHeaders(headerRow: unknown[]): Partial<Record<ColKey, number>> {
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

/** Kunci pencarian pilihan: cocok ke kunci ("fnb") atau label ("F&B (Makanan/Minuman/Snack)"), tanpa beda huruf besar/kecil. */
export function resolveOption<T extends string>(raw: unknown, options: Record<T, string>): T | null {
  const needle = String(raw ?? "").trim().toLowerCase();
  if (!needle) return null;
  for (const [key, label] of Object.entries(options) as [T, string][]) {
    if (key.toLowerCase() === needle || label.toLowerCase() === needle) return key;
  }
  // Tolerate a leading-word match ("Listrik bulan Jan" → no; "Tunai" → "Tunai (Cash)").
  for (const [key, label] of Object.entries(options) as [T, string][]) {
    if (label.toLowerCase().split(" (")[0] === needle) return key;
  }
  return null;
}

export function rowFingerprint(category: string, mode: string, cells: unknown[], occurrence: number): string {
  const body = cells.map((c) => (c instanceof Date ? c.toISOString() : String(c ?? "").trim())).join("\u0001");
  return createHash("sha1").update(`${category}|${mode}|${body}|${occurrence}`).digest("hex").slice(0, 12);
}

// ---------------------------------------------------------------- konteks outlet

interface AccountRow { id: string; code: string; name: string; type: string; isPostingAllowed: boolean }

async function loadContext(outletId: string) {
  const rows: AccountRow[] = await db
    .select({ id: accounts.id, code: accounts.code, name: accounts.name, type: accounts.type, isPostingAllowed: accounts.isPostingAllowed })
    .from(accounts)
    .where(and(eq(accounts.outletId, outletId), eq(accounts.isActive, true)));
  const byCode = new Map(rows.map((a) => [a.code, a]));
  const opening = await getExistingOpeningBalance(outletId);
  const openingDate = opening?.entry.entryDate ? outletDateYmd(new Date(opening.entry.entryDate)) : null;
  return { byCode, openingDate };
}
type Ctx = Awaited<ReturnType<typeof loadContext>>;

function accountByCode(ctx: Ctx, code: string, allowedTypes: string[], columnLabel: string): AccountRow {
  const a = ctx.byCode.get(String(code).trim());
  if (!a) throw new Error(`${columnLabel} "${code}" tidak ada di Chart of Accounts outlet ini (lihat sheet Daftar Akun).`);
  if (!a.isPostingAllowed) throw new Error(`${columnLabel} ${a.code} adalah akun induk — pakai salah satu akun di bawahnya.`);
  if (!allowedTypes.includes(a.type)) throw new Error(`${columnLabel} ${a.code} ${a.name} bukan akun ${allowedTypes.map((t) => TYPE_ID[t] ?? t).join("/")}.`);
  return a;
}
const TYPE_ID: Record<string, string> = { asset: "aset", liability: "liabilitas", equity: "ekuitas", revenue: "pendapatan", expense: "beban" };

async function settlementAccount(outletId: string, ctx: Ctx, mode: HistoricalMode, metodeRaw: unknown, allow: { hutang?: boolean; piutang?: boolean }): Promise<{ accountId: string; label: string }> {
  if (mode === "saldo_awal") {
    const a = accountByCode(ctx, OPENING_EQUITY_CODE, ["equity"], "Akun Ekuitas Saldo Awal");
    return { accountId: a.id, label: "Ekuitas Saldo Awal (riwayat sebelum cutover)" };
  }
  const raw = String(metodeRaw ?? "").trim().toLowerCase();
  if (allow.hutang && (raw === "hutang" || raw === "utang" || raw === HUTANG_LABEL.toLowerCase())) return { accountId: "", label: "hutang" };
  if (allow.piutang && (raw === "piutang" || raw === PIUTANG_LABEL.toLowerCase())) {
    return { accountId: accountByCode(ctx, RECEIVABLE_CODE, ["asset"], "Akun Piutang").id, label: "Piutang pelanggan (belum dibayar)" };
  }
  const method = resolveOption(metodeRaw, PAYMENT_METHOD_LABEL as Record<PaymentMethod, string>);
  if (!method) throw new Error(`Metode Pembayaran "${metodeRaw ?? ""}" tidak dikenali (lihat sheet Pilihan).`);
  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(outletId, method);
  const [cb] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!cb || cb.outletId !== outletId) throw new Error("Akun kas/bank untuk metode ini tidak ditemukan — cek Account Mapping.");
  return { accountId: cb.accountId, label: `${PAYMENT_METHOD_LABEL[method]}` };
}

function checkDateAgainstMode(ctx: Ctx, ymd: string, mode: HistoricalMode) {
  if (ymd > outletDateYmd(new Date())) throw new Error("Tanggal di masa depan.");
  if (!ctx.openingDate) return;
  if (mode === "kas" && ymd < ctx.openingDate) {
    throw new Error(`Tanggal sebelum Saldo Awal (${ctx.openingDate}) — kas/bank periode itu sudah termasuk di Saldo Awal. Impor ulang dengan mode "Hanya riwayat Laba Rugi".`);
  }
  if (mode === "saldo_awal" && ymd >= ctx.openingDate) {
    throw new Error(`Tanggal pada/sesudah Saldo Awal (${ctx.openingDate}) — transaksi setelah cutover dicatat dengan mode "Kas/Bank" atau lewat menu biasa.`);
  }
}

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
  const date = parseImportDate(get("tanggal"));
  if (!date) throw new Error("Tanggal kosong/tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY).");
  checkDateAgainstMode(ctx, date, mode);
  const gross = parseAmount(get("nominal"));
  if (gross == null || !(gross > 0)) throw new Error("Penjualan Kotor/Nominal wajib diisi dan harus lebih dari 0.");
  const discount = parseAmount(get("diskon")) ?? 0;
  if (discount < 0 || discount >= gross) throw new Error("Diskon tidak boleh negatif dan harus lebih kecil dari penjualan kotor.");
  const hpp = parseAmount(get("hpp")) ?? 0;
  if (hpp < 0) throw new Error("HPP tidak boleh negatif.");

  const catKey = resolveOption(get("kategori"), Object.fromEntries(Object.entries(SALES_CATEGORIES).map(([k, v]) => [k, v.label])));
  const code = String(get("kodeAkun") ?? "").trim();
  if (!catKey && !code) throw new Error("Isi Kategori Pendapatan atau Kode Akun Pendapatan.");
  const revenue = code ? accountByCode(ctx, code, ["revenue"], "Kode Akun Pendapatan") : accountByCode(ctx, SALES_CATEGORIES[catKey!].revenue, ["revenue"], "Akun pendapatan kategori");
  const settle = await settlementAccount(outletId, ctx, mode, get("metode"), { piutang: true });

  const net = round(gross - discount);
  const lines: JournalLineInput[] = [{ accountId: settle.accountId, debit: net, credit: 0, description: settle.label }];
  if (discount > 0) lines.push({ accountId: accountByCode(ctx, SALES_DISCOUNT_CODE, ["revenue"], "Akun Diskon Penjualan").id, debit: round(discount), credit: 0, description: "Diskon penjualan" });
  lines.push({ accountId: revenue.id, debit: 0, credit: round(gross), description: revenue.name });
  if (hpp > 0) {
    const hppCode = String(get("kodeHpp") ?? "").trim() || SALES_CATEGORIES[catKey ?? "lainnya"].cogs;
    const cogs = accountByCode(ctx, hppCode, ["expense"], "Kode Akun HPP");
    const inventory =
      mode === "saldo_awal"
        ? accountByCode(ctx, OPENING_EQUITY_CODE, ["equity"], "Akun Ekuitas Saldo Awal").id
        : await getMappedAccountId(outletId, "product", "inventory", "1161");
    lines.push({ accountId: cogs.id, debit: round(hpp), credit: 0, description: "HPP" });
    lines.push({ accountId: inventory, debit: 0, credit: round(hpp), description: mode === "saldo_awal" ? "Ekuitas Saldo Awal (HPP historis)" : "Persediaan keluar (HPP)" });
  }
  const desc = String(get("deskripsi") ?? "").trim() || (catKey ? SALES_CATEGORIES[catKey].label : revenue.name);
  return { date, description: `[Impor Historis] Penjualan — ${desc}`, lines, preview: { account: `${revenue.code} ${revenue.name}`, amount: round(gross), counter: settle.label } };
}

async function buildPembelian(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = parseImportDate(get("tanggal"));
  if (!date) throw new Error("Tanggal kosong/tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY).");
  checkDateAgainstMode(ctx, date, mode);
  const amount = parseAmount(get("nominal"));
  if (amount == null || !(amount > 0)) throw new Error("Nominal wajib diisi dan harus lebih dari 0.");
  const typeKey = resolveOption(get("kategori"), Object.fromEntries(Object.entries(PURCHASE_TYPES).map(([k, v]) => [k, v.label])));
  const code = String(get("kodeAkun") ?? "").trim();
  if (!typeKey && !code) throw new Error("Isi Jenis atau Kode Akun Tujuan.");
  let target: AccountRow;
  if (code) {
    target = accountByCode(ctx, code, ["asset", "expense"], "Kode Akun Tujuan");
    if (/^1(1[1-3]|2)/.test(target.code)) {
      throw new Error(
        target.code.startsWith("12")
          ? `${target.code} adalah aset tetap — catat lewat menu Aset → Pembelian Aset (pilih "Saldo awal") supaya ikut penyusutan.`
          : `${target.code} adalah akun kas/bank — bukan tujuan pembelian.`
      );
    }
  } else if (typeKey === "stok") {
    const id = await getMappedAccountId(outletId, "product", "inventory", PURCHASE_TYPES.stok.code);
    target = [...ctx.byCode.values()].find((a) => a.id === id) ?? accountByCode(ctx, PURCHASE_TYPES.stok.code, ["asset"], "Akun Persediaan");
  } else {
    target = accountByCode(ctx, PURCHASE_TYPES.operasional.code, ["expense"], "Akun beban operasional");
  }
  let settle = await settlementAccount(outletId, ctx, mode, get("metode"), { hutang: true });
  if (settle.label === "hutang") settle = { accountId: accountByCode(ctx, SUPPLIER_PAYABLE_CODE, ["liability"], "Akun Utang Supplier").id, label: "Utang supplier (belum dibayar)" };
  const supplier = String(get("pihak") ?? "").trim();
  const desc = String(get("deskripsi") ?? "").trim() || target.name;
  return {
    date,
    description: `[Impor Historis] Pembelian — ${desc}${supplier ? ` (${supplier})` : ""}`,
    lines: [
      { accountId: target.id, debit: round(amount), credit: 0, description: target.name },
      { accountId: settle.accountId, debit: 0, credit: round(amount), description: settle.label },
    ],
    preview: { account: `${target.code} ${target.name}`, amount: round(amount), counter: settle.label },
  };
}

async function buildPendapatanLain(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = parseImportDate(get("tanggal"));
  if (!date) throw new Error("Tanggal kosong/tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY).");
  checkDateAgainstMode(ctx, date, mode);
  const amount = parseAmount(get("nominal"));
  if (amount == null || !(amount > 0)) throw new Error("Nominal wajib diisi dan harus lebih dari 0.");
  const catKey = resolveOption(get("kategori"), OTHER_INCOME_CATEGORY_LABEL);
  const code = String(get("kodeAkun") ?? "").trim();
  if (!catKey && !code) throw new Error("Isi Kategori atau Kode Akun Pendapatan.");
  const revenueId = code
    ? accountByCode(ctx, code, ["revenue"], "Kode Akun Pendapatan").id
    : await getMappedAccountId(outletId, "other_income", catKey!, OTHER_INCOME_FALLBACK[catKey!]);
  const revenueRow = [...ctx.byCode.values()].find((a) => a.id === revenueId);
  const payer = String(get("pihak") ?? "").trim();
  const descRaw = String(get("deskripsi") ?? "").trim();
  const label = revenueRow ? `${revenueRow.code} ${revenueRow.name}` : catKey ? OTHER_INCOME_CATEGORY_LABEL[catKey] : code;

  // Kas mode + kategori standar → lewat mesin Pendapatan Lain-lain (ikut tampil di halamannya).
  if (mode === "kas" && !code && catKey) {
    const method = resolveOption(get("metode"), PAYMENT_METHOD_LABEL as Record<PaymentMethod, string>);
    if (!method) throw new Error(`Metode Pembayaran "${get("metode") ?? ""}" tidak dikenali (lihat sheet Pilihan).`);
    return {
      date,
      description: descRaw,
      lines: [],
      preview: { account: label, amount: round(amount), counter: PAYMENT_METHOD_LABEL[method] },
      otherIncome: { category: catKey, method, payer: payer || undefined, description: descRaw || undefined, amount: round(amount) },
    };
  }
  const settle = await settlementAccount(outletId, ctx, mode, get("metode"), { piutang: true });
  return {
    date,
    description: `[Impor Historis] Pendapatan lain — ${descRaw || label}${payer ? ` (${payer})` : ""}`,
    lines: [
      { accountId: settle.accountId, debit: round(amount), credit: 0, description: settle.label },
      { accountId: revenueId, debit: 0, credit: round(amount), description: label },
    ],
    preview: { account: label, amount: round(amount), counter: settle.label },
  };
}

async function buildPengeluaran(outletId: string, ctx: Ctx, mode: HistoricalMode, get: (k: ColKey) => unknown): Promise<ParsedRow> {
  const date = parseImportDate(get("tanggal"));
  if (!date) throw new Error("Tanggal kosong/tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY).");
  checkDateAgainstMode(ctx, date, mode);
  const amount = parseAmount(get("nominal"));
  if (amount == null || !(amount > 0)) throw new Error("Nominal wajib diisi dan harus lebih dari 0.");
  const catKey = resolveOption(get("kategori"), Object.fromEntries(Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => [k, v.label])));
  const code = String(get("kodeAkun") ?? "").trim();
  if (!catKey && !code) throw new Error("Isi Kategori Beban atau Kode Akun Beban.");
  const expense = accountByCode(ctx, code || EXPENSE_CATEGORIES[catKey!].code, ["expense"], code ? "Kode Akun Beban" : "Akun beban kategori");
  if (expense.code.startsWith("68")) throw new Error(`${expense.code} adalah beban penyusutan — dihitung otomatis dari menu Aset, jangan diimpor.`);
  let settle = await settlementAccount(outletId, ctx, mode, get("metode"), { hutang: true });
  if (settle.label === "hutang") settle = { accountId: accountByCode(ctx, EXPENSE_PAYABLE_ACCOUNT_CODE, ["liability"], "Akun Utang Biaya").id, label: "Utang biaya (belum dibayar)" };
  const payee = String(get("pihak") ?? "").trim();
  const desc = String(get("deskripsi") ?? "").trim() || expense.name;
  return {
    date,
    description: `[Impor Historis] Beban — ${desc}${payee ? ` (${payee})` : ""}`,
    lines: [
      { accountId: expense.id, debit: round(amount), credit: 0, description: expense.name },
      { accountId: settle.accountId, debit: 0, credit: round(amount), description: settle.label },
    ],
    preview: { account: `${expense.code} ${expense.name}`, amount: round(amount), counter: settle.label },
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

function readSheet(fileBuffer: Buffer, category: HistoricalCategory): unknown[][] {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const preferred = wb.SheetNames.find((n) => n.toLowerCase() === SHEET_NAME[category].toLowerCase());
  const name = preferred ?? wb.SheetNames.find((n) => !["petunjuk", "contoh", "daftar akun", "pilihan"].includes(n.toLowerCase()));
  if (!name) throw new Error("File Excel tidak punya sheet data.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, blankrows: false, raw: true, defval: "" });
  if (rows.length < 2) throw new Error(`Sheet "${name}" belum berisi data (baris 1 = judul kolom, data mulai baris 2).`);
  return rows;
}

export async function importHistoricalRows(
  outletId: string,
  category: HistoricalCategory,
  fileBuffer: Buffer,
  staffUserId?: string,
  opts: { mode?: HistoricalMode; dryRun?: boolean } = {}
): Promise<ImportSummary> {
  const mode: HistoricalMode = opts.mode === "saldo_awal" ? "saldo_awal" : "kas";
  const dryRun = Boolean(opts.dryRun);
  const rows = readSheet(fileBuffer, category);
  const cols = mapHeaders(rows[0]);
  const required: ColKey[] = ["tanggal", "nominal"];
  const missing = required.filter((k) => cols[k] === undefined);
  if (missing.length) throw new Error(`Kolom wajib tidak ditemukan: ${missing.map((k) => HEADER_ALIASES[k][0]).join(", ")}. Pakai template terbaru.`);
  if (cols.kategori === undefined && cols.kodeAkun === undefined) throw new Error("Kolom Kategori atau Kode Akun wajib ada. Pakai template terbaru.");

  const ctx = await loadContext(outletId);
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
      details.push({ ...base, action: "skipped", error: "Sudah pernah diimpor (baris identik) — dilewati." });
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

const SHEET_NAME: Record<HistoricalCategory, string> = { penjualan: "Penjualan", pembelian: "Pembelian", pendapatan_lain: "Pendapatan Lain-lain", pengeluaran: "Pengeluaran" };

interface ColumnSpec { header: string; required: string; desc: string; example: (string | number)[] }

function columnSpecs(category: HistoricalCategory): ColumnSpec[] {
  const methods = "Salah satu nilai kolom Metode di sheet Pilihan (mis. Tunai (Cash), QRIS, Transfer Bank)";
  if (category === "penjualan") {
    return [
      { header: "Tanggal*", required: "Wajib", desc: "Tanggal transaksi. Sel tanggal Excel, YYYY-MM-DD, atau DD/MM/YYYY.", example: ["2026-01-05", "06/01/2026"] },
      { header: "Kategori Pendapatan", required: "Wajib jika Kode Akun kosong", desc: "Pilihan di sheet Pilihan. Menentukan akun pendapatan & HPP bawaan.", example: ["Rental PS", "F&B (Makanan/Minuman/Snack)"] },
      { header: "Kode Akun Pendapatan", required: "Opsional", desc: "Kode akun pendapatan (4xxx) dari sheet Daftar Akun — mengalahkan Kategori. Mis. 4120 Rental PS5 untuk rincian per konsol.", example: ["", "4210"] },
      { header: "Deskripsi", required: "Opsional", desc: "Mis. 'Rekap penjualan harian' atau nomor struk lama.", example: ["Rekap rental 5 Jan", "Rekap F&B 6 Jan"] },
      { header: "Penjualan Kotor*", required: "Wajib", desc: "Nilai penjualan SEBELUM diskon, > 0. Boleh per transaksi atau rekap per hari (disarankan per hari per kategori).", example: [750000, 420000] },
      { header: "Diskon", required: "Opsional", desc: "Total diskon yang diberikan → akun 4910 Diskon Penjualan (mengurangi pendapatan).", example: [50000, 0] },
      { header: "HPP", required: "Opsional", desc: "Harga pokok barang yang terjual (F&B/produk). Isi supaya Laba Kotor historis benar. Rental umumnya 0.", example: [0, 180000] },
      { header: "Kode Akun HPP", required: "Opsional", desc: "Kode akun HPP (5xxx). Kosong = bawaan kategori.", example: ["", "5110"] },
      { header: "Metode Pembayaran*", required: "Wajib (mode Kas/Bank)", desc: `${methods}, atau "${PIUTANG_LABEL}". Diabaikan pada mode "Hanya riwayat Laba Rugi".`, example: ["Tunai (Cash)", "QRIS"] },
      { header: "Pelanggan", required: "Opsional", desc: "Nama pelanggan (untuk piutang).", example: ["", ""] },
      { header: "Referensi", required: "Opsional", desc: "Nomor bukti dari sistem lama.", example: ["Z-0105", "Z-0106"] },
    ];
  }
  if (category === "pembelian") {
    return [
      { header: "Tanggal*", required: "Wajib", desc: "Tanggal pembelian. Sel tanggal Excel, YYYY-MM-DD, atau DD/MM/YYYY.", example: ["2026-01-03", "10/01/2026"] },
      { header: "Jenis", required: "Wajib jika Kode Akun kosong", desc: "Persediaan (stok barang dagang/bahan baku) → akun Persediaan; Beban operasional → 6900.", example: ["Persediaan (stok barang dagang / bahan baku)", "Beban operasional (habis pakai)"] },
      { header: "Kode Akun Tujuan", required: "Opsional", desc: "Kode akun persediaan (116x) atau beban (5xxx–8xxx) dari Daftar Akun. Aset tetap (12xx) TIDAK di sini — pakai menu Aset → Pembelian Aset.", example: ["1162", ""] },
      { header: "Deskripsi", required: "Opsional", desc: "Mis. 'Belanja minuman botol'.", example: ["Belanja minuman botol", "Gas LPG & sabun"] },
      { header: "Nominal*", required: "Wajib", desc: "Total yang dibeli (termasuk ongkos kirim), > 0.", example: [1250000, 95000] },
      { header: "Metode Pembayaran*", required: "Wajib (mode Kas/Bank)", desc: `${methods}, atau "${HUTANG_LABEL}" → 2111 Utang Supplier.`, example: ["Transfer Bank", HUTANG_LABEL] },
      { header: "Supplier", required: "Opsional", desc: "Nama supplier/toko.", example: ["CV Sumber Minum", "Toko Jaya"] },
      { header: "Referensi", required: "Opsional", desc: "Nomor nota/faktur supplier.", example: ["INV-221", ""] },
    ];
  }
  if (category === "pendapatan_lain") {
    return [
      { header: "Tanggal*", required: "Wajib", desc: "Tanggal diterima. Sel tanggal Excel, YYYY-MM-DD, atau DD/MM/YYYY.", example: ["2026-01-15", "31/01/2026"] },
      { header: "Kategori", required: "Wajib jika Kode Akun kosong", desc: "Pilihan di sheet Pilihan (Komisi, Sewa Tempat, Penjualan Barang Bekas, Sponsorship, Denda, Bunga Bank, Lain-lain).", example: ["Komisi / Kerjasama Vendor", "Bunga Bank / Cashback / Promo"] },
      { header: "Kode Akun Pendapatan", required: "Opsional", desc: "Kode akun pendapatan (46xx/47xx/7xxx) dari Daftar Akun — mengalahkan Kategori.", example: ["", ""] },
      { header: "Deskripsi", required: "Opsional", desc: "Keterangan.", example: ["Komisi titip jual voucher", "Bunga tabungan Jan"] },
      { header: "Diterima Dari", required: "Opsional", desc: "Nama pihak pembayar.", example: ["PT Voucher Game", "Bank BRI"] },
      { header: "Nominal*", required: "Wajib", desc: "Jumlah diterima, > 0.", example: [300000, 12500] },
      { header: "Metode Pembayaran*", required: "Wajib (mode Kas/Bank)", desc: `${methods}.`, example: ["Transfer Bank", "Transfer Bank"] },
    ];
  }
  return [
    { header: "Tanggal*", required: "Wajib", desc: "Tanggal biaya. Sel tanggal Excel, YYYY-MM-DD, atau DD/MM/YYYY.", example: ["2026-01-25", "31/01/2026"] },
    { header: "Kategori Beban", required: "Wajib jika Kode Akun kosong", desc: "Pilihan di sheet Pilihan (Gaji, Sewa, Listrik, Air, Internet, Servis PS, Iklan, dst).", example: ["Gaji/Staf", "Listrik"] },
    { header: "Kode Akun Beban", required: "Opsional", desc: "Kode akun beban (5xxx–8xxx) dari Daftar Akun — mengalahkan Kategori. Beban penyusutan (68xx) tidak boleh diimpor.", example: ["", "6220"] },
    { header: "Deskripsi", required: "Opsional", desc: "Keterangan.", example: ["Gaji 2 kasir Januari", "Token listrik Jan"] },
    { header: "Dibayar Kepada", required: "Opsional", desc: "Nama penerima.", example: ["Kasir", "PLN"] },
    { header: "Nominal*", required: "Wajib", desc: "Jumlah biaya, > 0.", example: [4000000, 850000] },
    { header: "Metode Pembayaran*", required: "Wajib (mode Kas/Bank)", desc: `${methods}, atau "${HUTANG_LABEL}" → utang biaya.`, example: ["Transfer Bank", "Tunai (Cash)"] },
  ];
}

const RELEVANT_TYPES: Record<HistoricalCategory, string[]> = {
  penjualan: ["revenue", "expense"],
  pembelian: ["asset", "expense"],
  pendapatan_lain: ["revenue"],
  pengeluaran: ["expense"],
};

/** Template Excel per outlet: sheet data kosong + Petunjuk + Contoh + Pilihan + Daftar Akun (COA outlet sendiri). */
export async function generateHistoricalImportTemplate(outletId: string, category: HistoricalCategory): Promise<Buffer> {
  const specs = columnSpecs(category);
  const wb = XLSX.utils.book_new();

  const data = XLSX.utils.aoa_to_sheet([specs.map((s) => s.header)]);
  data["!cols"] = specs.map((s) => ({ wch: Math.max(16, s.header.length + 4) }));
  XLSX.utils.book_append_sheet(wb, data, SHEET_NAME[category]);

  const guide: (string | number)[][] = [
    [`PETUNJUK IMPOR ${SHEET_NAME[category].toUpperCase()} HISTORIS — NEXBILL`],
    [],
    ["LANGKAH"],
    ["1", `Isi data di sheet "${SHEET_NAME[category]}" mulai baris 2. Jangan ubah judul kolom di baris 1. Kolom bertanda * wajib.`],
    ["2", "Lihat sheet Contoh untuk format pengisian, sheet Pilihan untuk nilai Kategori/Metode, dan sheet Daftar Akun untuk kode akun outlet Anda."],
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
    ...journalExplanation(category).map((l) => ["", l]),
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guide);
  guideSheet["!cols"] = [{ wch: 26 }, { wch: 26 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, guideSheet, "Petunjuk");

  const example = XLSX.utils.aoa_to_sheet([specs.map((s) => s.header), ...[0, 1].map((i) => specs.map((s) => s.example[i] ?? ""))]);
  example["!cols"] = specs.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, example, "Contoh");

  const ctxRows = await db
    .select({ id: accounts.id, code: accounts.code, name: accounts.name, type: accounts.type, isPostingAllowed: accounts.isPostingAllowed })
    .from(accounts)
    .where(and(eq(accounts.outletId, outletId), eq(accounts.isActive, true)));
  const nameOf = (code: string) => {
    const a = ctxRows.find((x) => x.code === code);
    return a ? `${a.code} ${coaAccountNameForLang("id", a)}` : code;
  };

  const choices: (string | number)[][] = [];
  if (category === "penjualan") {
    choices.push(["Kategori Pendapatan", "Akun pendapatan", "Akun HPP bawaan"]);
    for (const v of Object.values(SALES_CATEGORIES)) choices.push([v.label, nameOf(v.revenue), nameOf(v.cogs)]);
  } else if (category === "pembelian") {
    choices.push(["Jenis", "Akun tujuan"]);
    for (const v of Object.values(PURCHASE_TYPES)) choices.push([v.label, nameOf(v.code)]);
  } else if (category === "pendapatan_lain") {
    choices.push(["Kategori", "Akun pendapatan bawaan"]);
    for (const [k, v] of Object.entries(OTHER_INCOME_CATEGORY_LABEL) as [OtherIncomeCategory, string][]) choices.push([v, nameOf(OTHER_INCOME_FALLBACK[k])]);
  } else {
    choices.push(["Kategori Beban", "Akun beban"]);
    for (const v of Object.values(EXPENSE_CATEGORIES)) choices.push([v.label, nameOf(v.code)]);
  }
  choices.push([], ["Metode Pembayaran", "Keterangan"]);
  for (const m of PAYMENT_METHOD_OPTIONS) choices.push([m.label, "Masuk/keluar di akun kas/bank sesuai Account Mapping metode ini"]);
  if (category === "penjualan" || category === "pendapatan_lain") choices.push([PIUTANG_LABEL, "Dicatat sebagai piutang pelanggan (1141)"]);
  if (category === "pembelian" || category === "pengeluaran") choices.push([HUTANG_LABEL, category === "pembelian" ? "Dicatat sebagai utang supplier (2111)" : "Dicatat sebagai utang biaya"]);
  const choiceSheet = XLSX.utils.aoa_to_sheet(choices);
  choiceSheet["!cols"] = [{ wch: 48 }, { wch: 48 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, choiceSheet, "Pilihan");

  const REPORT: Record<string, string> = { asset: "Neraca — Aset", liability: "Neraca — Liabilitas", equity: "Neraca — Ekuitas", revenue: "Laba Rugi — Pendapatan", expense: "Laba Rugi — Beban/HPP" };
  const list = ctxRows
    .filter((a) => RELEVANT_TYPES[category].includes(a.type))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => [a.code, coaAccountNameForLang("id", a), REPORT[a.type] ?? a.type, a.isPostingAllowed ? "Bisa dipakai" : "Akun induk (jangan dipakai)"]);
  const accSheet = XLSX.utils.aoa_to_sheet([["Kode Akun", "Nama Akun", "Laporan", "Status"], ...list]);
  accSheet["!cols"] = [{ wch: 12 }, { wch: 46 }, { wch: 26 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, accSheet, "Daftar Akun");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function journalExplanation(category: HistoricalCategory): string[] {
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
