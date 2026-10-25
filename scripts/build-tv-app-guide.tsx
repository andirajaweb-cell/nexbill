/**
 * Membangun public/downloads/nexbill-tv/panduan-nexbill-tv.html — panduan pemasangan aplikasi NEXBILL TV
 * dalam 6 bahasa, satu file mandiri yang bisa dibuka tanpa login dan dicetak/disimpan PDF. Berisi versi
 * RINGKAS (untuk yang sudah paham teknologi) di atas dan langkah LENGKAP (untuk pemula) di bawahnya.
 * Teks diambil dari dict yang sama dengan Kontrol Perangkat — ubah di sana lalu jalankan ulang:
 *
 *   npx esbuild scripts/build-tv-app-guide.tsx --bundle --platform=node --jsx=automatic --alias:@=./src --outfile=/tmp/btv.cjs && node /tmp/btv.cjs
 */
import fs from "fs";
import path from "path";
import { translate, type LangCode } from "../src/lib/i18n/registry";
import "../src/lib/i18n/dict-devices-tvapp";
import "../src/lib/i18n/dict-devices-guide-levels";

const LANGS: { code: LangCode; label: string }[] = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "th", label: "ภาษาไทย" },
  { code: "fil", label: "Filipino" },
  { code: "vi", label: "Tiếng Việt" },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function article(lang: LangCode) {
  const t = (k: string) => esc(translate(lang, k));
  const li = (keys: string[]) => keys.map((k) => `<li>${t(k)}</li>`).join("");
  const step = (n: number, title: string, keys: string[]) => `
    <section class="step" style="grid-template-columns:1fr">
      <div class="txt"><h2><span class="num">${n}</span>${t(title)}</h2><ol class="substeps">${li(keys)}</ol></div>
    </section>`;
  return `
<article data-lang="${lang}"${lang === "id" ? "" : " hidden"}>
  <h1>NEXBILL TV — ${t("devices.guide.tvApp.tab")}</h1>
  <p class="sub">${t("devices.guide.tvApp.intro")}</p>
  <section class="quick"><h2>⚡ ${t("devices.guide.level.quick")}</h2><ol>${li(["devices.guide.tvQuick.q1", "devices.guide.tvQuick.q2", "devices.guide.tvQuick.q3", "devices.guide.tvQuick.q4", "devices.guide.tvQuick.q5"])}</ol></section>
  <section class="need"><h2>${t("devices.guide.tvFull.needTitle")}</h2><ul>${li(["devices.guide.tvFull.need1", "devices.guide.tvFull.need2", "devices.guide.tvFull.need3"])}</ul></section>
  ${step(1, "devices.guide.tvFull.s1Title", ["devices.guide.tvFull.s1a", "devices.guide.tvFull.s1b", "devices.guide.tvFull.s1c", "devices.guide.tvFull.s1d", "devices.guide.tvFull.s1e"])}
  ${step(2, "devices.guide.tvFull.s2Title", ["devices.guide.tvFull.s2a", "devices.guide.tvFull.s2b", "devices.guide.tvFull.s2c"])}
  ${step(3, "devices.guide.tvFull.s3Title", ["devices.guide.tvFull.s3a", "devices.guide.tvFull.s3b"])}
  ${step(4, "devices.guide.tvFull.s4Title", ["devices.guide.tvFull.s4a", "devices.guide.tvFull.s4b", "devices.guide.tvFull.s4c"])}
  ${step(5, "devices.guide.tvFull.s5Title", ["devices.guide.tvFull.s5a", "devices.guide.tvFull.s5b", "devices.guide.tvFull.s5c"])}
  ${step(6, "devices.guide.tvFull.s6Title", ["devices.guide.tvFull.s6a", "devices.guide.tvFull.s6b"])}
  <section class="trouble"><h2>⚠ ${t("devices.guide.tvFull.troubleTitle")}</h2><ul>${li(["devices.guide.tvFull.t1", "devices.guide.tvFull.t2", "devices.guide.tvFull.t3", "devices.guide.tvFull.t4"])}</ul></section>
  <p class="note" style="margin-top:14px">${t("devices.guide.tvApp.updateNote")}</p>
  <p class="footer">NEXBILL · Digitrajasa · nexbill.id</p>
</article>`;
}

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NEXBILL TV — Panduan Pemasangan</title>
<meta name="robots" content="noindex" />
<!-- Dibangun otomatis oleh scripts/build-tv-app-guide.tsx — jangan diedit manual. -->
<style>
  body { margin:0; background:#eef2f7; color:#0f172a; font-family:"Segoe UI",system-ui,-apple-system,"Noto Sans","Noto Sans Thai",Tahoma,Arial,sans-serif; line-height:1.6; }
  .toolbar { position:sticky; top:0; z-index:10; background:#0b1220; color:#fff; padding:10px 16px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; }
  .toolbar b { letter-spacing:.5px; }
  .toolbar .langs { display:flex; flex-wrap:wrap; gap:6px; }
  .toolbar button { background:#1e293b; color:#e2e8f0; border:1px solid #334155; border-radius:8px; padding:6px 10px; font-size:14px; cursor:pointer; }
  .toolbar button.active { background:#0e7490; border-color:#22d3ee; color:#fff; }
  .toolbar button.print { background:#15803d; border-color:#22c55e; }
  main { max-width:900px; margin:0 auto; padding:24px 16px 64px; }
  article { background:#fff; border:1px solid #dbe3ee; border-radius:16px; padding:28px; }
  h1 { font-size:26px; line-height:1.25; margin:0 0 6px; }
  .sub { color:#475569; margin:0 0 22px; }
  .quick { background:#ecfeff; border:1px solid #67e8f9; border-radius:12px; padding:14px 18px; margin:0 0 18px; }
  .quick h2 { font-size:17px; margin:0 0 6px; }
  .need { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 18px; margin:0 0 6px; }
  .need h2 { font-size:17px; margin:0 0 6px; }
  .step { display:grid; grid-template-columns:240px 1fr; gap:20px; align-items:start; padding:18px 0; border-top:1px solid #e2e8f0; }
  .step .pic svg { border-radius:14px; }
  .step h2 { font-size:19px; margin:0 0 6px; display:flex; align-items:center; gap:10px; }
  .num { flex:0 0 30px; height:30px; border-radius:50%; background:#0e7490; color:#fff; font-size:15px; display:inline-flex; align-items:center; justify-content:center; }
  .step p, .step li { margin:4px 0; }
  .note { color:#475569; font-size:14px; }
  .links { font-size:14px; word-break:break-all; }
  pre.code { background:#0b1220; color:#a7f3d0; border-radius:10px; padding:10px 14px; white-space:pre-wrap; word-break:break-all; font-family:Consolas,"Cascadia Mono","Courier New",monospace; font-size:14px; }
  ol.substeps { margin:6px 0 0; padding-left:22px; }
  ol.substeps li { margin:5px 0; }
  .warn { background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; padding:8px 12px; margin:0 0 8px; }
  ul.brands { color:#475569; font-size:14px; }
  .check { margin-top:18px; background:#ecfdf5; border:1px solid #6ee7b7; border-radius:12px; padding:14px 18px; }
  .check h2 { font-size:17px; margin:0 0 6px; }
  .trouble { margin-top:18px; background:#fffbeb; border:1px solid #fcd34d; border-radius:12px; padding:14px 18px; }
  .trouble h2 { font-size:17px; margin:0 0 6px; }
  .footer { color:#64748b; font-size:13px; margin-top:28px; }
  @media (max-width:640px) { article { padding:18px; } .step { grid-template-columns:1fr; } .step .pic { max-width:260px; } }
  @media print { .toolbar { display:none; } body { background:#fff; } main { padding:0; } article { border:none; padding:0; } [hidden] { display:none !important; } .step { break-inside:avoid; } }
</style>
</head>
<body>
<div class="toolbar">
  <b>NEXBILL TV · Android TV / Google TV</b>
  <div class="langs">${LANGS.map((l) => `<button type="button" data-set-lang="${l.code}">${esc(l.label)}</button>`).join("")}
    <button type="button" class="print" onclick="window.print()">🖨 PDF</button></div>
</div>
<main>
${LANGS.map((l) => article(l.code)).join("\n")}
</main>
<script>
(function () {
  var codes = ${JSON.stringify(LANGS.map((l) => l.code))};
  function pick() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && codes.indexOf(q) >= 0) return q;
    var b = (navigator.language || "id").slice(0, 2).toLowerCase();
    if (b === "tl") b = "fil";
    return codes.indexOf(b) >= 0 ? b : "id";
  }
  function show(code) {
    document.querySelectorAll("article[data-lang]").forEach(function (a) { a.hidden = a.getAttribute("data-lang") !== code; });
    document.querySelectorAll("[data-set-lang]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-set-lang") === code); });
    document.documentElement.lang = code;
  }
  document.querySelectorAll("[data-set-lang]").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-set-lang")); }); });
  show(pick());
})();
</script>
</body>
</html>
`;

fs.mkdirSync(path.join(process.cwd(), "public/downloads/nexbill-tv"), { recursive: true });
const out = path.join(process.cwd(), "public/downloads/nexbill-tv/panduan-nexbill-tv.html");
fs.writeFileSync(out, html);
console.log(`Ditulis: ${out} (${html.length} byte)`);
