/**
 * Pembuat perintah ESC/POS untuk printer thermal 58mm/80mm — modul murni (tanpa DOM/Bluetooth),
 * diuji di escpos.test.ts. Dipakai untuk cetak struk langsung dari HP (Web Bluetooth BLE atau
 * aplikasi RawBT untuk printer Bluetooth Classic), lihat bluetooth-printer.ts.
 *
 * Teks dikirim sebagai ASCII polos (code page PC437): huruf beraksen ditransliterasi dan karakter
 * di luar ASCII diganti "?" — printer thermal murah sering tidak mendukung UTF-8, dan struk
 * Indonesia praktis hanya memakai ASCII.
 */

export type PaperWidth = 58 | 80;

/**
 * Bahasa struk: hanya Indonesia & Inggris. Struk dipegang pelanggan, jadi tidak ikut 6 bahasa dashboard —
 * dashboard berbahasa Indonesia mencetak struk Indonesia, bahasa lain mencetak struk Inggris.
 */
export type ReceiptLang = "id" | "en";
export const receiptLangFor = (dashboardLang: string | null | undefined): ReceiptLang => (dashboardLang === "id" || !dashboardLang ? "id" : "en");
export const RECEIPT_LOCALE: Record<ReceiptLang, string> = { id: "id-ID", en: "en-US" };

/** Label struk per bahasa — dipakai struk ESC/POS (di bawah) dan halaman /receipt/[id], supaya keduanya identik. */
export const RECEIPT_TEXT: Record<ReceiptLang, {
  receipt: string; no: string; date: string; subtotal: string; discount: string; serviceCharge: string; tax: string; rounding: string;
  total: string; paymentMethod: string; status: string; paid: string; thanks: string;
  testHeader: string; testPaper: string; testChars: string; testTime: string; testItem1: string; testItem2: string; testFooter1: string; testFooter2: string;
}> = {
  id: {
    receipt: "Struk", no: "No", date: "Tanggal", subtotal: "Subtotal", discount: "Diskon", serviceCharge: "Service Charge", tax: "Pajak", rounding: "Pembulatan",
    total: "TOTAL", paymentMethod: "Metode Bayar", status: "Status", paid: "LUNAS", thanks: "Terima kasih!",
    testHeader: "Tes cetak printer Bluetooth", testPaper: "Kertas", testChars: "karakter", testTime: "Waktu", testItem1: "Rental PS5 - 1 jam", testItem2: "Es teh manis",
    testFooter1: "Jika teks rapi & tidak terpotong,", testFooter2: "printer siap dipakai.",
  },
  en: {
    receipt: "Receipt", no: "No", date: "Date", subtotal: "Subtotal", discount: "Discount", serviceCharge: "Service Charge", tax: "Tax", rounding: "Rounding",
    total: "TOTAL", paymentMethod: "Payment", status: "Status", paid: "PAID", thanks: "Thank you!",
    testHeader: "Bluetooth printer test print", testPaper: "Paper", testChars: "characters", testTime: "Time", testItem1: "PS5 rental - 1 hour", testItem2: "Iced sweet tea",
    testFooter1: "If the text is neat & not cut off,", testFooter2: "the printer is ready to use.",
  },
};

/** Jumlah karakter per baris dengan font A standar. */
export const CHARS_PER_LINE: Record<PaperWidth, number> = { 58: 32, 80: 48 };

export interface ReceiptLine {
  label: string;
  value: string;
  bold?: boolean;
}

export interface ReceiptDoc {
  title: string;
  headerLines: string[];
  meta: ReceiptLine[];
  items: { name: string; qty: number; total: string }[];
  totals: ReceiptLine[];
  payment: ReceiptLine[];
  footerLines: string[];
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const REPLACEMENTS: Record<string, string> = {
  "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...",
  " ": " ", "•": "*", "×": "x", "€": "EUR", "£": "GBP", "฿": "THB", "₫": "VND", "₱": "PHP",
};

/** Ubah teks bebas menjadi ASCII yang aman untuk printer thermal. */
export function toPrintableAscii(input: string): string {
  let s = String(input ?? "");
  s = s.replace(/[‘’“”–—… •×€£฿₫₱]/g, (c) => REPLACEMENTS[c] ?? "?");
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/\r\n?/g, "\n").replace(/\t/g, " ");
  return s.replace(/[^\x20-\x7E\n]/g, "?");
}

/** Pecah teks menjadi baris selebar `width`, memotong di spasi bila memungkinkan. */
export function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of toPrintableAscii(text).split("\n")) {
    let rest = para.trim();
    if (!rest) {
      out.push("");
      continue;
    }
    while (rest.length > width) {
      let cut = rest.lastIndexOf(" ", width);
      if (cut <= 0) cut = width;
      out.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).trimStart();
    }
    out.push(rest);
  }
  return out;
}

/** Dua kolom: label rata kiri, nilai rata kanan. Label panjang dibungkus; nilai di baris terakhir bila muat. */
export function twoColumns(left: string, right: string, width: number): string[] {
  const r = toPrintableAscii(right).trim();
  const maxLeft = Math.max(1, width - r.length - 1);
  const lines = wrapText(left, r.length >= width - 1 ? width : maxLeft);
  const last = lines[lines.length - 1] ?? "";
  if (last.length + 1 + r.length <= width) {
    lines[lines.length - 1] = last + " ".repeat(width - last.length - r.length) + r;
    return lines;
  }
  return [...lines, " ".repeat(Math.max(0, width - r.length)) + r.slice(-width)];
}

export function separator(width: number, ch = "-"): string {
  return ch.repeat(width);
}

class Bytes {
  private parts: number[] = [];
  raw(...b: number[]) {
    this.parts.push(...b);
    return this;
  }
  text(s: string) {
    for (const ch of toPrintableAscii(s)) this.parts.push(ch.charCodeAt(0));
    return this;
  }
  line(s = "") {
    return this.text(s).raw(LF);
  }
  align(a: "left" | "center" | "right") {
    return this.raw(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
  }
  bold(on: boolean) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }
  /** GS ! n — 0x00 normal, 0x01 tinggi ganda (lebar tetap, jadi jumlah karakter per baris aman). */
  size(n: number) {
    return this.raw(GS, 0x21, n);
  }
  toUint8() {
    return Uint8Array.from(this.parts);
  }
}

/** Susun byte ESC/POS lengkap untuk satu struk. */
export function buildReceiptEscPos(doc: ReceiptDoc, paper: PaperWidth, opts: { cut?: boolean; feedLines?: number } = {}): Uint8Array {
  const w = CHARS_PER_LINE[paper];
  const b = new Bytes();
  b.raw(ESC, 0x40); // inisialisasi
  b.raw(ESC, 0x74, 0x00); // code page PC437

  b.align("center").bold(true).size(0x01);
  for (const l of wrapText(doc.title, w)) b.line(l);
  b.size(0x00).bold(false);
  for (const h of doc.headerLines.filter((x) => x && x.trim())) for (const l of wrapText(h, w)) b.line(l);

  b.align("left").line(separator(w));
  for (const m of doc.meta) for (const l of twoColumns(m.label, m.value, w)) b.line(l);
  b.line(separator(w));

  for (const it of doc.items) {
    for (const l of twoColumns(`${it.qty}x ${it.name}`, it.total, w)) b.line(l);
  }
  b.line(separator(w));

  for (const tl of doc.totals) {
    if (tl.bold) b.bold(true);
    for (const l of twoColumns(tl.label, tl.value, w)) b.line(l);
    if (tl.bold) b.bold(false);
  }

  if (doc.payment.length) {
    b.line(separator(w));
    for (const p of doc.payment) {
      if (p.bold) b.bold(true);
      for (const l of twoColumns(p.label, p.value, w)) b.line(l);
      if (p.bold) b.bold(false);
    }
  }

  b.line(separator(w)).align("center");
  for (const f of doc.footerLines) for (const l of wrapText(f, w)) b.line(l);
  b.align("left");

  b.raw(ESC, 0x64, Math.max(1, Math.min(10, opts.feedLines ?? 4))); // dorong kertas keluar
  if (opts.cut) b.raw(GS, 0x56, 0x42, 0x00); // potong sebagian (diabaikan printer tanpa cutter)
  return b.toUint8();
}

/** Uint8Array → base64 (untuk intent RawBT). */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bin, "binary").toString("base64");
}

export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  const n = Math.max(1, Math.floor(size));
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += n) out.push(bytes.slice(i, i + n));
  return out;
}

interface ReceiptApiData {
  order: {
    id: string;
    createdAt: string;
    subtotal: number;
    discount?: number | null;
    serviceCharge?: number | null;
    tax?: number | null;
    roundingAdjustment?: number | null;
    total: number;
  };
  items: { description: string; qty: number; lineTotal: number }[];
  payments: { status: string; method: string }[];
  outlet?: { name?: string | null; address?: string | null; phone?: string | null; receiptFooterText?: string | null } | null;
}

const defaultMoney = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

/**
 * Data /api/orders/[id]/receipt → ReceiptDoc. Isi & label sama persis dengan halaman struk
 * /receipt/[id] supaya cetak Bluetooth dan cetak dialog sistem identik.
 */
export function receiptDocFromOrder(
  data: ReceiptApiData,
  opts: { formatMoney?: (n: number) => string; formatDate?: (iso: string) => string; lang?: ReceiptLang } = {}
): ReceiptDoc {
  const L = RECEIPT_TEXT[opts.lang ?? "id"];
  const money = opts.formatMoney ?? defaultMoney;
  const fmtDate = opts.formatDate ?? ((iso: string) => new Date(iso).toLocaleString(RECEIPT_LOCALE[opts.lang ?? "id"]));
  const { order, items, payments, outlet } = data;
  const totals: ReceiptLine[] = [{ label: L.subtotal, value: money(order.subtotal) }];
  if ((order.discount ?? 0) > 0) totals.push({ label: L.discount, value: `-${money(order.discount ?? 0)}` });
  if ((order.serviceCharge ?? 0) > 0) totals.push({ label: L.serviceCharge, value: money(order.serviceCharge ?? 0) });
  if ((order.tax ?? 0) > 0) totals.push({ label: L.tax, value: money(order.tax ?? 0) });
  const rounding = order.roundingAdjustment ?? 0;
  if (rounding !== 0) totals.push({ label: L.rounding, value: `${rounding > 0 ? "" : "-"}${money(Math.abs(rounding))}` });
  totals.push({ label: L.total, value: money(order.total), bold: true });

  const success = payments.find((p) => p.status === "success");
  const payment: ReceiptLine[] = success
    ? [
        { label: L.paymentMethod, value: String(success.method ?? "").toUpperCase() },
        { label: L.status, value: L.paid, bold: true },
      ]
    : [];

  return {
    title: outlet?.name || L.receipt,
    headerLines: [outlet?.address ?? "", outlet?.phone ?? ""],
    meta: [
      { label: L.no, value: order.id.slice(0, 8).toUpperCase() },
      { label: L.date, value: fmtDate(order.createdAt) },
    ],
    items: items.map((i) => ({ name: i.description, qty: i.qty, total: money(i.lineTotal) })),
    totals,
    payment,
    // Teks penutup yang diisi outlet sendiri (Pengaturan → Printer & Struk) dicetak apa adanya.
    footerLines: [(outlet?.receiptFooterText || L.thanks).trim()],
  };
}

/** Struk uji untuk tombol "Tes Cetak" di Pengaturan. */
export function testReceiptDoc(outletName: string, paper: PaperWidth, when: string, lang: ReceiptLang = "id"): ReceiptDoc {
  const L = RECEIPT_TEXT[lang];
  return {
    title: outletName || "NEXBILL",
    headerLines: [L.testHeader],
    meta: [
      { label: L.testPaper, value: `${paper}mm (${CHARS_PER_LINE[paper]} ${L.testChars})` },
      { label: L.testTime, value: when },
    ],
    items: [
      { name: L.testItem1, qty: 1, total: "Rp15.000" },
      { name: L.testItem2, qty: 2, total: "Rp10.000" },
    ],
    totals: [{ label: L.total, value: "Rp25.000", bold: true }],
    payment: [],
    footerLines: [L.testFooter1, L.testFooter2],
  };
}
