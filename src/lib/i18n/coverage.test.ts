import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { hasTranslation, LANG_OPTIONS } from "./registry";

/*
 * Setiap t("key", "fallback Indonesia") di dashboard harus punya terjemahan di kamus (dict-*.ts) untuk
 * semua bahasa. Tanpa itu, t() diam-diam jatuh ke teks Indonesia — begitulah ratusan teks di Other
 * Income, Pembelian Aset, Membership, Inventory, dll. dulu selalu tampil dalam Bahasa Indonesia.
 *
 * Halaman dengan kamus lokal sendiri (login, daftar, /u/[token], halaman pilar) tidak memakai registry
 * dan tidak diperiksa di sini: hanya file yang memakai useDashboardLang() atau translate().
 */

const SRC = path.resolve(__dirname, "../..");
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

function usedKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  for (const f of walk(SRC)) {
    if (!/\.(tsx?|mts)$/.test(f) || f.endsWith(".test.ts")) continue;
    const s = fs.readFileSync(f, "utf8");
    if (!/useDashboardLang\(|\btranslate\(/.test(s)) continue;
    for (const m of s.matchAll(/\bt\(\s*["'`]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_\-]+)+)["'`]/g)) {
      if (!keys.has(m[1])) keys.set(m[1], path.relative(SRC, f));
    }
  }
  return keys;
}

describe("dashboard i18n coverage", () => {
  beforeAll(async () => {
    for (const f of fs.readdirSync(__dirname).filter((n) => /^dict-.*\.ts$/.test(n))) await import(`./${f}`);
  });

  it.each(LANG_OPTIONS.map((o) => o.code).filter((c) => c !== "id"))("every t() key used in the dashboard has a %s translation", (lang) => {
    const missing = [...usedKeys()].filter(([k]) => !hasTranslation(lang, k)).map(([k, f]) => `${k}  (${f})`);
    expect(missing).toEqual([]);
  });
});
