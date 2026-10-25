import * as XLSX from "xlsx";

/**
 * Saldo Awal lewat Excel (Accounting › Migrasi Data, langkah "ekspor → template Excel → impor").
 *
 * Template berisi SEMUA akun postable outlet (kode, nama, golongan, saldo normal) dengan kolom Debit
 * dan Kredit kosong. Pemilik menyalin saldo per akun dari Neraca/Neraca Saldo aplikasi lama, lalu
 * mengunggahnya. File ini TIDAK memposting apa pun: hasil baca dikembalikan ke formulir Saldo Awal
 * untuk diperiksa, lalu diposting lewat tombol yang sama seperti input manual (postOpeningBalance).
 *
 * Kolom dibaca berdasarkan JUDUL (Indonesia atau Inggris), jadi urutan kolom bebas.
 * Persediaan (116x) dan Aset Tetap (12xx) sengaja hanya diberi PERINGATAN: kalau stok/aset juga
 * diimpor lewat Inventori/Aset, keduanya sudah mencatat saldo awalnya sendiri (lawan 3400) dan akan
 * terhitung dua kali.
 */

export type ObLang = "id" | "en";

export interface ObAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isPostingAllowed: boolean;
  isActive: boolean;
}

export interface ObLine {
  accountId: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export interface ObParseResult {
  lines: ObLine[];
  errors: { row: number; message: string }[];
  warnings: string[];
  /** Selisih yang ditampung otomatis ke 3400 Ekuitas Saldo Awal (null = tidak ada penyeimbang). */
  balancingAmount: number | null;
  totalDebit: number;
  totalCredit: number;
  rowsRead: number;
}

export const OPENING_EQUITY_CODE = "3400";

const SHEET: Record<ObLang, string> = { id: "Saldo Awal", en: "Opening Balance" };
const GUIDE_SHEET: Record<ObLang, string> = { id: "Petunjuk", en: "Instructions" };

const HEAD = {
  code: { id: "Kode Akun", en: "Account Code" },
  name: { id: "Nama Akun", en: "Account Name" },
  type: { id: "Golongan", en: "Class" },
  normal: { id: "Saldo Normal", en: "Normal Balance" },
  debit: { id: "Debit", en: "Debit" },
  credit: { id: "Kredit", en: "Credit" },
} as const;

const TYPE_LABEL: Record<string, Record<ObLang, string>> = {
  asset: { id: "Aset", en: "Asset" },
  liability: { id: "Liabilitas", en: "Liability" },
  equity: { id: "Ekuitas", en: "Equity" },
  revenue: { id: "Pendapatan", en: "Revenue" },
  expense: { id: "Beban", en: "Expense" },
};

const HEADER_ALIASES: Record<"code" | "debit" | "credit", string[]> = {
  code: ["kode akun", "kode", "account code", "code", "no akun", "no. akun", "nomor akun"],
  debit: ["debit", "debet", "dr"],
  credit: ["kredit", "credit", "cr"],
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const MSG = {
  noHeader: { id: "Judul kolom \"Kode Akun\", \"Debit\", dan \"Kredit\" tidak ditemukan. Pakai template Saldo Awal dari NEXBILL.", en: "Column headers \"Account Code\", \"Debit\" and \"Credit\" were not found. Use the NEXBILL Opening Balance template." },
  unknownCode: { id: "Kode akun {code} tidak ada di Chart of Accounts outlet ini.", en: "Account code {code} does not exist in this outlet's Chart of Accounts." },
  header: { id: "Akun {code} adalah akun induk — isi saldonya di akun turunannya.", en: "Account {code} is a header account — put the balance on its sub-accounts." },
  inactive: { id: "Akun {code} nonaktif. Aktifkan dulu di Chart of Accounts atau pakai akun lain.", en: "Account {code} is inactive. Activate it in the Chart of Accounts or use another account." },
  both: { id: "Akun {code}: isi Debit ATAU Kredit, tidak keduanya.", en: "Account {code}: fill Debit OR Credit, not both." },
  badAmount: { id: "Akun {code}: nilai \"{value}\" bukan angka.", en: "Account {code}: \"{value}\" is not a number." },
  negative: { id: "Akun {code}: nilai negatif tidak boleh — pindahkan ke kolom sebelahnya (Debit ⇄ Kredit) tanpa tanda minus.", en: "Account {code}: negative values are not allowed — move it to the other column (Debit ⇄ Credit) without the minus sign." },
  duplicate: { id: "Akun {code} muncul lebih dari sekali — gabungkan menjadi satu baris.", en: "Account {code} appears more than once — merge it into one row." },
  inventory: { id: "Akun persediaan ({codes}) diisi. Kalau stok awal juga diimpor lewat Inventori, nilainya terhitung dua kali — kosongkan salah satunya.", en: "Inventory accounts ({codes}) are filled. If opening stock is also imported via Inventory, it will be counted twice — clear one of them." },
  fixedAsset: { id: "Akun aset tetap ({codes}) diisi. Kalau aset juga diunggah lewat menu Aset (Saldo awal), nilainya terhitung dua kali — kosongkan salah satunya.", en: "Fixed-asset accounts ({codes}) are filled. If assets are also uploaded via Assets (opening balance), they will be counted twice — clear one of them." },
  balanced: { id: "Selisih debit–kredit {amount} ditampung ke {code} Ekuitas Saldo Awal.", en: "The debit–credit difference of {amount} was placed in {code} Opening Balance Equity." },
  noEquity: { id: "Debit dan kredit belum sama, dan akun {code} Ekuitas Saldo Awal tidak ditemukan untuk menampung selisihnya.", en: "Debit and credit do not match, and account {code} Opening Balance Equity was not found to hold the difference." },
} as const;

function fmt(lang: ObLang, key: keyof typeof MSG, vars: Record<string, string> = {}): string {
  let s: string = MSG[key][lang];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Angka dari sel Excel: 1500000, "1.500.000", "1,500,000", "Rp 1.500.000,50", "" (= 0). null = bukan angka. */
export function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? round2(v) : null;
  let s = String(v).trim().replace(/^rp\.?\s*/i, "").replace(/\s+/g, "");
  if (s === "" || s === "-") return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  }
  let n: number;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = Number(s.replace(/\./g, "").replace(",", "."));
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) n = Number(s.replace(/,/g, ""));
  else if (/^\d+(,\d+)?$/.test(s)) n = Number(s.replace(",", "."));
  else if (/^\d+(\.\d+)?$/.test(s)) n = Number(s);
  else return null;
  if (!Number.isFinite(n)) return null;
  return round2(neg ? -n : n);
}

const isInventoryCode = (code: string) => code.startsWith("116");
const isFixedAssetCode = (code: string) => code.startsWith("12");

/** Workbook template: sheet Saldo Awal (semua akun postable aktif) + sheet Petunjuk. */
export function buildOpeningBalanceWorkbook(accounts: ObAccount[], lang: ObLang): Buffer {
  const postable = accounts.filter((a) => a.isPostingAllowed && a.isActive).sort((x, y) => x.code.localeCompare(y.code));
  const header = [HEAD.code[lang], HEAD.name[lang], HEAD.type[lang], HEAD.normal[lang], HEAD.debit[lang], HEAD.credit[lang]];
  const rows = postable.map((a) => [
    a.code,
    a.name,
    TYPE_LABEL[a.type]?.[lang] ?? a.type,
    a.normalBalance === "credit" ? HEAD.credit[lang] : HEAD.debit[lang],
    "",
    "",
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = [{ wch: 12 }, { wch: 38 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];

  const guide =
    lang === "id"
      ? [
          ["Petunjuk Template Saldo Awal NEXBILL"],
          [""],
          ["1. Ambil Neraca / Neraca Saldo dari aplikasi lama per AKHIR HARI sebelum tanggal cutover."],
          ["2. Untuk setiap akun, isi saldonya di kolom Debit (saldo normal Debit: kas, bank, piutang, beban) atau Kredit (utang, modal, pendapatan)."],
          ["3. Isi salah satu saja per baris. Biarkan kosong akun yang saldonya nol. Angka boleh 1500000 atau 1.500.000."],
          ["4. JANGAN isi Persediaan (116x) bila stok awal diimpor lewat Inventori, dan JANGAN isi Aset Tetap (12xx) bila aset diunggah lewat menu Aset — keduanya sudah mencatat saldo awalnya sendiri."],
          ["5. Akun yang belum ada di daftar: tambahkan dulu di Accounting › Chart of Accounts, lalu unduh ulang template ini."],
          ["6. Selisih debit–kredit (mis. modal di aplikasi lama yang berbeda nama) otomatis ditampung ke 3400 Ekuitas Saldo Awal saat diimpor."],
          ["7. Unggah di Accounting › Migrasi Data › Saldo Awal › Impor dari Excel. Periksa barisnya, lalu klik Posting Saldo Awal."],
        ]
      : [
          ["NEXBILL Opening Balance Template — Instructions"],
          [""],
          ["1. Take the Balance Sheet / Trial Balance from your old app as of the END OF THE DAY before the cutover date."],
          ["2. For each account, enter its balance under Debit (debit-normal: cash, bank, receivables, expenses) or Credit (payables, capital, revenue)."],
          ["3. Fill only one column per row. Leave zero-balance accounts empty. Numbers may be 1500000 or 1,500,000."],
          ["4. Do NOT fill Inventory (116x) if opening stock is imported via Inventory, and do NOT fill Fixed Assets (12xx) if assets are uploaded via Assets — both record their own opening balance."],
          ["5. Accounts not in the list: add them first in Accounting › Chart of Accounts, then download this template again."],
          ["6. Any debit–credit difference (e.g. capital named differently in the old app) is placed in 3400 Opening Balance Equity on import."],
          ["7. Upload in Accounting › Data Migration › Opening Balance › Import from Excel. Review the rows, then click Post Opening Balance."],
        ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guide);
  guideSheet["!cols"] = [{ wch: 120 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, SHEET[lang]);
  XLSX.utils.book_append_sheet(wb, guideSheet, GUIDE_SHEET[lang]);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function findHeader(rows: unknown[][]): { rowIndex: number; code: number; debit: number; credit: number } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = (rows[r] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
    const idx = (k: keyof typeof HEADER_ALIASES) => cells.findIndex((c) => HEADER_ALIASES[k].includes(c));
    const code = idx("code");
    const debit = idx("debit");
    const credit = idx("credit");
    if (code >= 0 && debit >= 0 && credit >= 0) return { rowIndex: r, code, debit, credit };
  }
  return null;
}

/** Baca baris (sheet pertama yang punya judul kolom yang dikenali) menjadi baris Saldo Awal. */
export function parseOpeningBalanceRows(rows: unknown[][], accounts: ObAccount[], lang: ObLang, formatMoney: (n: number) => string = (n) => n.toLocaleString("id-ID")): ObParseResult {
  const result: ObParseResult = { lines: [], errors: [], warnings: [], balancingAmount: null, totalDebit: 0, totalCredit: 0, rowsRead: 0 };
  const head = findHeader(rows);
  if (!head) {
    result.errors.push({ row: 0, message: fmt(lang, "noHeader") });
    return result;
  }
  const byCode = new Map(accounts.map((a) => [a.code.trim(), a]));
  const seen = new Set<string>();
  const inventory: string[] = [];
  const fixed: string[] = [];

  for (let r = head.rowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const rawCode = row[head.code];
    const code = rawCode === undefined || rawCode === null ? "" : String(rawCode).trim();
    const debitRaw = row[head.debit];
    const creditRaw = row[head.credit];
    const excelRow = r + 1;
    if (!code && (debitRaw === undefined || debitRaw === "") && (creditRaw === undefined || creditRaw === "")) continue;
    const debit = parseAmount(debitRaw);
    const credit = parseAmount(creditRaw);
    if (debit === null || credit === null) {
      result.errors.push({ row: excelRow, message: fmt(lang, "badAmount", { code: code || "-", value: String(debit === null ? debitRaw : creditRaw) }) });
      continue;
    }
    if (debit === 0 && credit === 0) continue; // akun bersaldo nol di template — dilewati
    result.rowsRead++;
    if (!code) {
      result.errors.push({ row: excelRow, message: fmt(lang, "unknownCode", { code: lang === "id" ? "(kosong)" : "(empty)" }) });
      continue;
    }
    const acc = byCode.get(code);
    if (!acc) {
      result.errors.push({ row: excelRow, message: fmt(lang, "unknownCode", { code }) });
      continue;
    }
    if (!acc.isPostingAllowed) {
      result.errors.push({ row: excelRow, message: fmt(lang, "header", { code }) });
      continue;
    }
    if (!acc.isActive) {
      result.errors.push({ row: excelRow, message: fmt(lang, "inactive", { code }) });
      continue;
    }
    if (debit < 0 || credit < 0) {
      result.errors.push({ row: excelRow, message: fmt(lang, "negative", { code }) });
      continue;
    }
    if (debit > 0 && credit > 0) {
      result.errors.push({ row: excelRow, message: fmt(lang, "both", { code }) });
      continue;
    }
    if (seen.has(code)) {
      result.errors.push({ row: excelRow, message: fmt(lang, "duplicate", { code }) });
      continue;
    }
    seen.add(code);
    if (isInventoryCode(code)) inventory.push(code);
    else if (isFixedAssetCode(code)) fixed.push(code);
    result.lines.push({ accountId: acc.id, code, name: acc.name, debit, credit });
  }

  if (inventory.length) result.warnings.push(fmt(lang, "inventory", { codes: inventory.join(", ") }));
  if (fixed.length) result.warnings.push(fmt(lang, "fixedAsset", { codes: fixed.join(", ") }));

  // Selisih → 3400 Ekuitas Saldo Awal (sama seperti cara standar: saldo awal ditutup ke ekuitas saldo awal).
  const sum = (k: "debit" | "credit") => round2(result.lines.reduce((s, l) => s + l[k], 0));
  let diff = round2(sum("debit") - sum("credit"));
  if (result.lines.length > 0 && Math.abs(diff) >= 0.01) {
    const equity = byCode.get(OPENING_EQUITY_CODE);
    if (equity && equity.isPostingAllowed && equity.isActive) {
      const existing = result.lines.find((l) => l.accountId === equity.id);
      const target = existing ?? { accountId: equity.id, code: equity.code, name: equity.name, debit: 0, credit: 0 };
      // Bersihkan dulu sisi yang berlawanan supaya baris tetap satu sisi.
      const net = round2(target.credit - target.debit + diff); // + = kredit
      target.debit = net < 0 ? -net : 0;
      target.credit = net > 0 ? net : 0;
      if (!existing) result.lines.push(target);
      result.balancingAmount = diff;
      result.warnings.push(fmt(lang, "balanced", { amount: formatMoney(Math.abs(diff)), code: OPENING_EQUITY_CODE }));
      diff = 0;
    } else {
      result.warnings.push(fmt(lang, "noEquity", { code: OPENING_EQUITY_CODE }));
    }
  }
  result.lines = result.lines.filter((l) => l.debit > 0 || l.credit > 0);
  result.totalDebit = sum("debit");
  result.totalCredit = sum("credit");
  return result;
}

/** Baca workbook (Buffer) → hasil parse. Sheet pertama yang punya judul kolom yang dikenali dipakai. */
export function parseOpeningBalanceWorkbook(buffer: Buffer, accounts: ObAccount[], lang: ObLang, formatMoney?: (n: number) => string): ObParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  let lastResult: ObParseResult | null = null;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "" });
    const res = parseOpeningBalanceRows(rows, accounts, lang, formatMoney);
    if (!(res.errors.length === 1 && res.errors[0].row === 0)) return res;
    lastResult = res;
  }
  return lastResult ?? parseOpeningBalanceRows([], accounts, lang, formatMoney);
}
