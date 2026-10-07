/**
 * Audit i18n dasbor: cari kunci t("...") yang dipakai di kode tapi BELUM terdaftar di kamus
 * (src/lib/i18n/dict-*.ts) — kunci seperti itu selalu tampil dalam teks fallback Bahasa Indonesia,
 * apa pun bahasa yang dipilih pengguna.
 *
 *   node scripts/i18n-audit.mjs src/app/dashboard/accounting            # satu folder
 *   node scripts/i18n-audit.mjs src/app/dashboard src/components        # seluruh dasbor
 */
import fs from "fs";
import os from "os";
import path from "path";
import { build } from "esbuild";

const roots = process.argv.slice(2);
if (!roots.length) { console.error("Pakai: node scripts/i18n-audit.mjs <folder|file> ..."); process.exit(1); }
const files = [];
const walk = (p) => { const st = fs.statSync(p); if (st.isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f))); else if (/\.(tsx?|jsx?)$/.test(p) && !/\.test\./.test(p)) files.push(p); };
roots.forEach(walk);

const dicts = fs.readdirSync("src/lib/i18n").filter((f) => /^dict-.*\.ts$/.test(f)).map((f) => `import ${JSON.stringify(path.resolve("src/lib/i18n", f))};`);
const entry = path.join(os.tmpdir(), `i18n-audit-${process.pid}.ts`);
fs.writeFileSync(entry, `${dicts.join("\n")}
import { translate } from ${JSON.stringify(path.resolve("src/lib/i18n/registry.ts"))};
import fs from "fs";
const files: string[] = ${JSON.stringify(files)};
const used = new Map<string, string>();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const re = /(?:\\bt\\(\\s*|key:\\s*|Key:\\s*)(["'\`])([a-zA-Z][\\w.-]*\\.[\\w.-]+)\\1/g;
  let m; while ((m = re.exec(src))) if (!m[2].includes("\${")) used.set(m[2], f);
}
const S = "\\u0000";
const missing = [...used].filter(([k]) => translate("id", k, S) === S);
const byFile = new Map<string, string[]>();
for (const [k, f] of missing) byFile.set(f, [...(byFile.get(f) ?? []), k]);
for (const [f, ks] of [...byFile].sort((a, b) => b[1].length - a[1].length)) console.log(String(ks.length).padStart(4), f);
console.log(\`\\nKunci dipakai: \${used.size} — belum ada di kamus: \${missing.length}\`);
process.exitCode = missing.length ? 1 : 0;
`);
const out = path.join(os.tmpdir(), `i18n-audit-${process.pid}.cjs`);
await build({ entryPoints: [entry], bundle: true, platform: "node", outfile: out, logLevel: "error", alias: { "@": path.resolve("src") } });
await import(out);
