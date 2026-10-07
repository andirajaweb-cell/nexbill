/**
 * Membangun public/downloads/nexbill-agent/panduan-android.html — panduan bergambar "Relay Agent di
 * HP Android" dalam 6 bahasa, satu file mandiri yang bisa dibuka tanpa login dan dicetak/disimpan PDF.
 * Teks diambil dari dict-devices-guide (sama dengan Kontrol Perangkat), gambar dari
 * AndroidRelayIllustrations — jadi cukup ubah di sana lalu jalankan ulang:
 *
 *   npx esbuild scripts/build-android-guide.tsx --bundle --platform=node --jsx=automatic --alias:@=./src --outfile=/tmp/bag.cjs && node /tmp/bag.cjs
 */
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { RelayIllustration, relayIllustrationLang, type RelayIllustrationKind } from "../src/components/devices/AndroidRelayIllustrations";
import { translate, type LangCode } from "../src/lib/i18n/registry";
import "../src/lib/i18n/dict-devices-guide";
import { ANDROID_INSTALL_COMMAND } from "../src/app/dashboard/devices/android-relay-guide";

const LANGS: { code: LangCode; label: string }[] = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "th", label: "ภาษาไทย" },
  { code: "fil", label: "Filipino" },
  { code: "vi", label: "Tiếng Việt" },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const img = (k: RelayIllustrationKind, lang: LangCode) => renderToStaticMarkup(<RelayIllustration kind={k} lang={relayIllustrationLang(lang)} />);

function article(lang: LangCode) {
  const t = (k: string) => esc(translate(lang, `devices.guide.android.${k}`));
  const title = esc(translate(lang, "devices.guide.android.tabAndroid"));
  const step = (n: number, k: RelayIllustrationKind, titleKey: string, body: string) => `
    <section class="step">
      <div class="pic">${img(k, lang)}</div>
      <div class="txt"><h2><span class="num">${n}</span>${t(titleKey)}</h2>${body}</div>
    </section>`;
  const cmd = (c: string) => `<pre class="code">${esc(c)}</pre>`;
  return `
<article data-lang="${lang}"${lang === "id" ? "" : " hidden"}>
  <h1>NEXBILL Relay Agent — ${title}</h1>
  <p class="sub">${t("intro")}</p>
  ${step(0, "prepare", "s0Title", `<ul><li>${t("req1")}</li><li>${t("req2")}</li><li>${t("req3")}</li></ul>`)}
  ${step(1, "token", "s1Title", `<p>${t("s1Body")}</p>`)}
  ${step(2, "install", "s2Title", `<p>${t("s2Body")}</p><p class="links"><b>Termux:</b> https://f-droid.org/packages/com.termux/<br/><b>Termux:Boot:</b> https://f-droid.org/packages/com.termux.boot/</p><p class="note">${t("s2Note")}</p>`)}
  ${step(3, "paste", "s3Title", `<p>${t("s3Body")}</p>${cmd(ANDROID_INSTALL_COMMAND)}`)}
  ${step(4, "language", "s4Title", `<p>${t("s4Body")}</p>`)}
  ${step(5, "tv", "s5Title", `<p>${t("s5Body")}</p>${cmd("nexbill-tv 192.168.1.50")}<p class="note">${t("s5Note")}</p>`)}
  ${step(6, "battery", "s6Title", `<ul><li>${t("s6a")}</li><li>${t("s6b")}</li><li>${t("s6c")}</li></ul>`)}
  ${step(7, "done", "s7Title", `<p>${esc(translate(lang, "devices.guide.tv.step5Body"))}</p>`)}
  <section class="trouble"><h2>⚠ ${t("troubleTitle")}</h2><ul>
    <li>${t("trouble1")}</li><li>${t("trouble2")}</li><li>${t("trouble3")}</li><li>${t("trouble4")}</li><li>${t("trouble5")}</li>
  </ul></section>
  <p class="footer">NEXBILL · Digitrajasa · nexbill.id</p>
</article>`;
}

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NEXBILL Relay Agent — HP Android</title>
<meta name="robots" content="noindex" />
<!-- Dibangun otomatis oleh scripts/build-android-guide.tsx — jangan diedit manual. -->
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
  .step { display:grid; grid-template-columns:240px 1fr; gap:20px; align-items:start; padding:18px 0; border-top:1px solid #e2e8f0; }
  .step .pic svg { border-radius:14px; }
  .step h2 { font-size:19px; margin:0 0 6px; display:flex; align-items:center; gap:10px; }
  .num { flex:0 0 30px; height:30px; border-radius:50%; background:#0e7490; color:#fff; font-size:15px; display:inline-flex; align-items:center; justify-content:center; }
  .step p, .step li { margin:4px 0; }
  .note { color:#475569; font-size:14px; }
  .links { font-size:14px; word-break:break-all; }
  pre.code { background:#0b1220; color:#a7f3d0; border-radius:10px; padding:10px 14px; white-space:pre-wrap; word-break:break-all; font-family:Consolas,"Cascadia Mono","Courier New",monospace; font-size:14px; }
  .trouble { margin-top:18px; background:#fffbeb; border:1px solid #fcd34d; border-radius:12px; padding:14px 18px; }
  .trouble h2 { font-size:17px; margin:0 0 6px; }
  .footer { color:#64748b; font-size:13px; margin-top:28px; }
  @media (max-width:640px) { article { padding:18px; } .step { grid-template-columns:1fr; } .step .pic { max-width:260px; } }
  @media print { .toolbar { display:none; } body { background:#fff; } main { padding:0; } article { border:none; padding:0; } [hidden] { display:none !important; } .step { break-inside:avoid; } }
</style>
</head>
<body>
<div class="toolbar">
  <b>NEXBILL · Relay Agent · Android</b>
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

const out = path.join(process.cwd(), "public/downloads/nexbill-agent/panduan-android.html");
fs.writeFileSync(out, html);
console.log(`Ditulis: ${out} (${html.length} byte)`);
