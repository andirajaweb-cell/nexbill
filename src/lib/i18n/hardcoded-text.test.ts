import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import ts from "typescript";
import { hasTranslation, LANG_OPTIONS, registeredIndonesian } from "./registry";
import { DEFAULT_COA } from "@/lib/accounting/coa-data";

/*
 * Audit teks Bahasa Indonesia yang ditulis langsung di kode UI (tanpa t()). coverage.test.ts hanya
 * memeriksa key yang sudah dipanggil lewat t(); teks yang tidak pernah dibungkus t() tidak terlihat
 * olehnya — itulah sebabnya keterangan kategori Other Income, tombol periode, panduan Accounting, dll.
 * dulu tetap berbahasa Indonesia walau bahasa dashboard diganti.
 *
 * Test ini membaca setiap file UI dashboard (AST TypeScript) dan menandai string/JSX yang terlihat
 * seperti kalimat Bahasa Indonesia. Sebuah teks dianggap aman bila:
 *   - ia argumen fungsi penerjemah (t/tf/tr/tx/uiText/translate — teks fallback), atau
 *   - ia sama persis dengan teks Indonesia (id) dari key kamus yang dirujuk di file yang sama —
 *     pola peta label `{ value, labelKey: "x.y", label: "Teks" }` / `X_KEY` di samping `X_LABEL`, atau
 *   - ia tercantum di ALLOWED di bawah, lengkap dengan alasannya (ditinjau satu per satu).
 *
 * Deteksinya heuristik (kata-kata umum Bahasa Indonesia), jadi teks yang sangat pendek bisa lolos;
 * tetapi setiap kalimat/label baru yang ditulis tanpa t() akan menggagalkan test ini.
 */

const SRC = path.resolve(__dirname, "../..");
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join("/");
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

/** Folder/file UI yang diaudit. */
const UI_ROOTS = ["app/dashboard", "components"];
/** Modul lib yang teksnya tampil di browser dashboard (label, pesan klien). */
const CLIENT_LIB = [
  "lib/printer/bluetooth-printer.ts",
  "lib/printer/print-receipt.ts",
  "lib/payments/use-payment-methods.ts",
  "lib/payments/confirm-client.ts",
  "lib/push/client.ts",
  "lib/ui/use-saving-overlay.tsx",
  "lib/marketplace/upload-client.ts",
  "lib/maintenance/gamepad-doctor.ts",
  "lib/auth/permissions.ts",
];

/** File yang tidak diaudit di sini, dengan alasannya. */
const EXCLUDED: { pattern: RegExp; reason: string }[] = [
  { pattern: /^components\/platform-admin\//, reason: "Panel internal tim NEXBILL (bukan dashboard merchant), sengaja Bahasa Indonesia." },
  { pattern: /^components\/(pillar|blog)\//, reason: "Halaman pemasaran publik berbahasa Indonesia (SEO), bukan dashboard." },
  { pattern: /^app\/dashboard\/accounting\/guides(\.[a-z]+)?\.ts$/, reason: "Buku panduan Accounting per bahasa; kelengkapannya diperiksa guides.test.ts." },
  { pattern: /\.test\.tsx?$/, reason: "Test." },
];

/**
 * Teks Indonesia yang memang dibiarkan, per file. Tambah entri hanya dengan alasan yang jelas.
 * `text` dicocokkan sebagai awalan teks yang dinormalisasi (spasi dirapikan).
 */
const ALLOWED: { file: string; text: string; reason: string }[] = [
  { file: "app/dashboard/settings/DeleteAccountCard.tsx", text: "HAPUS", reason: "Kata konfirmasi tetap yang diperiksa server (api/account/deletion/confirm) di semua bahasa." },
  { file: "app/dashboard/devices/page.tsx", text: "REM Dibuat otomatis oleh NEXBILL", reason: "Isi file .bat yang diunduh (komentar skrip Windows), bukan teks di layar." },
];

const WORDS =
  "dan yang untuk dari tidak belum sudah akan bisa dengan ini itu atau pilih simpan hapus tambah baru nama tanggal jumlah harga pembelian penjualan pendapatan beban biaya akun pelanggan wajib isi lihat semua batal tutup bulan tahun hari periode laporan catat dicatat ubah cari tampilkan sembunyikan keterangan kosong dipakai gagal berhasil sebelum sesudah setelah saat lainnya contoh barang metode pembayaran hutang utang piutang bayar dibayar terima diterima masuk keluar penyusutan nilai umur tanpa harus jika kalau agar supaya lewat melalui sesuai otomatis pengaturan ringkasan rincian karyawan kasir minggu sampai mulai selesai diskon pajak transaksi tunai saldo awal akhir tersedia belanja beli jual tagihan faktur nota unduh unggah impor ekspor cetak kirim nonaktif sedang perlu dulu lagi juga hanya masih harap silakan mohon anda kamu kami sini sana atas bawah baris kolom tombol halaman data lama perangkat pesanan pemilik penjual pembeli ulasan produk stok gudang cabang konsol jam menit detik sesi sewa main lunas sisa nominal rekening tujuan sumber dibatalkan berlaku masa aktif koneksi terhubung memuat menyimpan memproses mengirim ganti pakai buka catatan panduan resmi rilis lisensi kiri kanan atas bawah tombol stik".split(
    " "
  );
const WORD_RE = new RegExp(`\\b(${WORDS.join("|")})\\b`, "gi");
function looksIndonesian(text: string): boolean {
  if (text.length < 3 || !/[a-zA-Z]{3}/.test(text) || /^[a-z0-9_.\-/:]+$/.test(text)) return false;
  const hits = new Set((text.match(WORD_RE) ?? []).map((w) => w.toLowerCase()));
  return hits.size >= 2 || (hits.size === 1 && text.split(/\s+/).length <= 3 && text.length >= 4);
}

/** Fungsi penerjemah: t/tf (useDashboardLang), tr/tx (alias lokal / parameter penerjemah), uiText (modul non-React), translate (registry). */
const TRANSLATORS = ["t", "tf", "tr", "tx", "uiText", "translate"];
const CALL_SKIP = new Set([...TRANSLATORS, "console", "log", "error", "warn", "info", "debug", "includes", "startsWith", "endsWith", "replace", "replaceAll", "split", "get", "set", "has", "append", "getItem", "setItem", "removeItem", "match", "test", "indexOf", "querySelector", "addEventListener", "fetch", "require"]);
const ATTR_SKIP = /^(className|href|src|type|name|id|key|accept|rel|target|method|autoComplete|inputMode|role|htmlFor|variant|size|style|status|value)$/;
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_\-]+)+$/;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function isSkippedContext(node: ts.Node): boolean {
  for (let child: ts.Node = node, p = node.parent; p; child = p, p = p.parent) {
    if (ts.isCallExpression(p) && p.arguments.includes(child as ts.Expression)) {
      const e = p.expression;
      const n = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
      if (CALL_SKIP.has(n)) return true;
    }
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p)) return true;
    if (ts.isPropertyAssignment(p) && p.name === child) return true;
    if (ts.isJsxAttribute(p) && ATTR_SKIP.test(p.name.getText())) return true;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
    if (ts.isCaseClause(p) && p.expression === child) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === child) return true;
  }
  return false;
}

function auditedFiles(): string[] {
  const ui = UI_ROOTS.flatMap((d) => walk(path.join(SRC, d)));
  return [...ui, ...CLIENT_LIB.map((f) => path.join(SRC, f))]
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !EXCLUDED.some((x) => x.pattern.test(rel(f))));
}

function sourceOf(f: string) {
  return ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true, f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

describe("dashboard i18n audit", () => {
  let ID: Readonly<Record<string, string>>;
  beforeAll(async () => {
    for (const f of fs.readdirSync(__dirname).filter((n) => /^dict-.*\.ts$/.test(n))) await import(/* @vite-ignore */ `./${f}`);
    ID = registeredIndonesian();
  });

  it("no Indonesian UI text is written without a translation key", () => {
    const problems: string[] = [];
    const usedAllow = new Set<number>();
    for (const f of auditedFiles()) {
      const sf = sourceOf(f);
      const file = rel(f);
      // Teks Indonesia dari setiap key kamus yang dirujuk di file ini (fallback peta label).
      const known = new Set<string>();
      const collectKeys = (n: ts.Node) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && KEY_RE.test(n.text) && ID[n.text] !== undefined) known.add(norm(ID[n.text]));
        ts.forEachChild(n, collectKeys);
      };
      collectKeys(sf);
      const check = (node: ts.Node, raw: string) => {
        const text = norm(raw);
        if (!looksIndonesian(text) || known.has(text) || isSkippedContext(node)) return;
        const allowIdx = ALLOWED.findIndex((a) => a.file === file && text.startsWith(a.text));
        if (allowIdx >= 0) return void usedAllow.add(allowIdx);
        problems.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}  ${text.slice(0, 100)}`);
      };
      const visit = (n: ts.Node) => {
        if (ts.isJsxText(n)) check(n, n.text);
        else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) check(n, n.text);
        else if (ts.isTemplateExpression(n)) check(n, [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(" {} "));
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(problems).toEqual([]);
    // Entri ALLOWED yang sudah tidak terpakai harus dihapus supaya daftar pengecualian tetap jujur.
    expect(ALLOWED.filter((_, i) => !usedAllow.has(i)).map((a) => `${a.file}: ${a.text}`)).toEqual([]);
  });

  it("translation keys are literal (no t(`prefix.${x}`)), so every key can be audited", () => {
    const dynamic: string[] = [];
    for (const f of auditedFiles()) {
      const sf = sourceOf(f);
      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && TRANSLATORS.includes(n.expression.text)) {
          const keyArg = n.expression.text === "translate" ? n.arguments[1] : n.arguments[0];
          if (keyArg && ts.isTemplateExpression(keyArg)) dynamic.push(`${rel(f)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}  ${keyArg.getText()}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(dynamic).toEqual([]);
  });

  it.each(LANG_OPTIONS.map((o) => o.code).filter((c) => c !== "id"))("every translation key referenced in dashboard UI (incl. label maps) has a %s translation", (lang) => {
    const namespaces = new Set(Object.keys(ID).map((k) => k.split(".")[0]));
    const missing = new Set<string>();
    for (const f of auditedFiles()) {
      const visit = (n: ts.Node) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && KEY_RE.test(n.text) && namespaces.has(n.text.split(".")[0])) {
          if (!hasTranslation(lang, n.text)) missing.add(`${n.text}  (${rel(f)})`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sourceOf(f));
    }
    expect([...missing]).toEqual([]);
  });

  it.each(LANG_OPTIONS.map((o) => o.code))("every default Chart of Accounts name has a %s translation (coaAccountName)", (lang) => {
    expect(DEFAULT_COA.filter((a) => !hasTranslation(lang, `coa.${a.code}`)).map((a) => `coa.${a.code} ${a.name}`)).toEqual([]);
  });
  it("every dictionary a dashboard page needs is actually loaded on that page", () => {
    // Kamus didaftarkan lewat import efek samping (import "@/lib/i18n/dict-x"). Bila komponen memakai key
    // dari kamus yang tidak ikut ter-import di halaman tempat ia tampil, t() diam-diam jatuh ke fallback
    // Bahasa Indonesia — persis gejala yang dilaporkan. Di sini setiap halaman dashboard ditelusuri import-nya.
    const resolve = (from: string, spec: string): string | null => {
      const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
      if (!base) return null;
      for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
      return null;
    };
    const importCache = new Map<string, string[]>();
    const importsOf = (f: string) => {
      if (!importCache.has(f)) {
        const s = fs.readFileSync(f, "utf8");
        const specs = [...s.matchAll(/(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
        importCache.set(f, specs.map((sp) => resolve(f, sp)).filter((x): x is string => !!x && /\.tsx?$/.test(x)));
      }
      return importCache.get(f)!;
    };
    const closure = (roots: string[]) => {
      const seen = new Set<string>();
      const stack = [...roots];
      while (stack.length) {
        const f = stack.pop()!;
        if (seen.has(f)) continue;
        seen.add(f);
        stack.push(...importsOf(f));
      }
      return seen;
    };
    const DICT_DIR = __dirname;
    const dictOfKey = new Map<string, string>();
    for (const d of fs.readdirSync(DICT_DIR).filter((n) => /^dict-.*\.ts$/.test(n))) {
      for (const m of fs.readFileSync(path.join(DICT_DIR, d), "utf8").matchAll(/^\s+"([^"]+)":\s*\{/gm)) dictOfKey.set(m[1], path.join(DICT_DIR, d));
    }
    const audited = new Set(auditedFiles());
    const layout = path.join(SRC, "app/dashboard/layout.tsx");
    const pages = walk(path.join(SRC, "app/dashboard")).filter((f) => /\/page\.tsx$/.test(f));
    const keysCache = new Map<string, string[]>();
    const keysOf = (f: string) => {
      if (!keysCache.has(f)) {
        const keys: string[] = [];
        const visit = (n: ts.Node) => {
          if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && dictOfKey.has(n.text)) keys.push(n.text);
          ts.forEachChild(n, visit);
        };
        visit(sourceOf(f));
        keysCache.set(f, keys);
      }
      return keysCache.get(f)!;
    };
    const problems = new Set<string>();
    for (const page of [layout, ...pages]) {
      const mods = closure(page === layout ? [layout] : [layout, page]);
      for (const m of mods) {
        if (!audited.has(m)) continue;
        for (const k of keysOf(m)) {
          const d = dictOfKey.get(k)!;
          if (!mods.has(d)) problems.add(`${rel(m)} memakai ${k} (${path.basename(d)}) yang tidak dimuat di ${rel(page)}`);
        }
      }
    }
    expect([...problems]).toEqual([]);
  });
});
