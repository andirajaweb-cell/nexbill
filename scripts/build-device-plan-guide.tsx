/**
 * Membangun public/downloads/panduan-kontrol-perangkat.html — "Metode kontrol perangkat & rencana darurat"
 * dalam 6 bahasa, satu file mandiri untuk dicetak dan ditempel di meja kasir. Teks diambil dari
 * dict-devices-methods (sama dengan Kontrol Perangkat) — ubah di sana lalu jalankan ulang:
 *
 *   npx esbuild scripts/build-device-plan-guide.tsx --bundle --platform=node --jsx=automatic --alias:@=./src --outfile=/tmp/bdp.cjs && node /tmp/bdp.cjs
 */
import fs from "fs";
import path from "path";
import { translate, type LangCode } from "../src/lib/i18n/registry";
import "../src/lib/i18n/dict-devices-methods";

const LANGS: { code: LangCode; label: string }[] = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "th", label: "ภาษาไทย" },
  { code: "fil", label: "Filipino" },
  { code: "vi", label: "Tiếng Việt" },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const METHODS: [string, number, number][] = [["app", 4, 2], ["pc", 4, 1], ["phone", 2, 1], ["plug", 3, 1], ["local", 2, 1]];
const RISKS = ["power", "net", "agent", "tv", "plug", "server"];
const TABLE: [string, Record<string, boolean | string>][] = [
  ["noExtra", { app: true, pc: false, phone: true, plug: true }],
  ["realOff", { app: "screenLock", pc: true, phone: true, plug: true }],
  ["offline", { app: "partial", pc: true, phone: true, plug: "tasmotaOnly" }],
  ["anyTv", { app: false, pc: false, phone: false, plug: true }],
];

function article(lang: LangCode) {
  const t = (k: string) => esc(translate(lang, k));
  const cell = (v: boolean | string) => (v === true ? "✓" : v === false ? "—" : t(`devices.methods.tbl.${v}`));
  const methods = METHODS.map(([k, s, r]) => `
    <div class="card"><h3>${t(`devices.methods.${k}.name`)}<span class="badge">${t(`devices.methods.${k}.badge`)}</span></h3>
      <div class="lbl ok">${t("devices.methods.strengths")}</div><ul>${Array.from({ length: s }, (_, i) => `<li>${t(`devices.methods.${k}.s${i + 1}`)}</li>`).join("")}</ul>
      <div class="lbl warnc">${t("devices.methods.remember")}</div><ul>${Array.from({ length: r }, (_, i) => `<li>${t(`devices.methods.${k}.r${i + 1}`)}</li>`).join("")}</ul>
      <p><b>${t("devices.methods.bestFor")}:</b> ${t(`devices.methods.${k}.best`)}</p></div>`).join("");
  const cols = ["app", "pc", "phone", "plug"];
  const table = `<table class="cmp"><tr><th>${t("devices.methods.tbl.feature")}</th>${cols.map((c) => `<th>${t(`devices.methods.${c}.name`)}</th>`).join("")}</tr>${TABLE.map(([row, cells]) => `<tr><td>${t(`devices.methods.tbl.${row}`)}</td>${cols.map((c) => `<td>${cell(cells[c])}</td>`).join("")}</tr>`).join("")}</table>`;
  const risks = RISKS.map((k) => `
    <div class="card"><h3>${t(`devices.risk.${k}.title`)}</h3>
      <div class="lbl">${t("devices.risk.happens")}</div><p>${t(`devices.risk.${k}.h`)}</p>
      <div class="do"><div class="lbl doc">${t("devices.risk.do")}</div><p>${t(`devices.risk.${k}.d`)}</p></div>
      <div class="lbl ok">${t("devices.risk.prevent")}</div><p>${t(`devices.risk.${k}.p`)}</p></div>`).join("");
  return `
<article data-lang="${lang}"${lang === "id" ? "" : " hidden"}>
  <h1>${t("devices.risk.title")}</h1>
  <p class="sub">${t("devices.risk.sub")}</p>
  <section class="check"><h2>✓ ${t("devices.risk.dailyTitle")}</h2><ol><li>${t("devices.risk.daily1")}</li><li>${t("devices.risk.daily2")}</li><li>${t("devices.risk.daily3")}</li></ol></section>
  <div class="grid" style="margin-top:14px">${risks}</div>
  <h1 style="margin-top:28px">${t("devices.methods.title")}</h1>
  <p class="sub">${t("devices.methods.sub")}</p>
  <div class="grid">${methods}</div>
  ${table}
  <p class="footer">NEXBILL · Digitrajasa · nexbill.id</p>
</article>`;
}

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NEXBILL — Kontrol Perangkat: Metode & Rencana Darurat</title>
<meta name="robots" content="noindex" />
<!-- Dibangun otomatis oleh scripts/build-device-plan-guide.tsx — jangan diedit manual. -->
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
  .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
  .card { border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; break-inside:avoid; }
  .card h3 { margin:0 0 4px; font-size:16px; }
  .badge { display:inline-block; font-size:11px; font-weight:700; background:#0e7490; color:#fff; border-radius:999px; padding:1px 8px; margin-left:6px; vertical-align:2px; }
  .lbl { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; margin-top:6px; }
  .ok { color:#047857; } .warnc { color:#b45309; } .doc { color:#0e7490; }
  .do { background:#ecfeff; border-radius:8px; padding:6px 10px; }
  table.cmp { width:100%; border-collapse:collapse; margin-top:12px; font-size:14px; }
  table.cmp th, table.cmp td { border:1px solid #e2e8f0; padding:6px 8px; text-align:center; }
  table.cmp th:first-child, table.cmp td:first-child { text-align:left; }
  @media (max-width:640px) { .grid { grid-template-columns:1fr; } }
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
  <b>NEXBILL · Kontrol Perangkat</b>
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

const out = path.join(process.cwd(), "public/downloads/panduan-kontrol-perangkat.html");
fs.writeFileSync(out, html);
console.log(`Ditulis: ${out} (${html.length} byte)`);
