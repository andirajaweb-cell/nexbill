import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { BLOG_ARTICLES, BLOG_CLUSTERS, BLOG_LANGS, BLOG_ROOT, PILLARS, allBlogPaths, articlePath } from "./blog-data";

// Blog dua bahasa (Indonesia /blog, Inggris /en/blog): setiap artikel yang terdaftar harus punya halaman
// di kedua bahasa, setiap halaman blog harus terdaftar (tidak ada artikel "yatim" satu bahasa), dan
// tautan terkait/pilar harus menunjuk ke halaman yang benar-benar ada.
const APP = path.resolve(__dirname, "../../app");
const routeFile = (p: string) => path.join(APP, p, "page.tsx");
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

describe("bilingual blog", () => {
  it("every registered blog page exists in both languages", () => {
    expect(allBlogPaths().filter((p) => !fs.existsSync(routeFile(p)))).toEqual([]);
  });

  it("every blog route file is registered (no single-language article)", () => {
    const registered = new Set(allBlogPaths());
    const routes = BLOG_LANGS.flatMap((l) =>
      walk(path.join(APP, BLOG_ROOT[l].slice(1)))
        .filter((f) => f.endsWith("page.tsx"))
        .map((f) => "/" + path.relative(APP, path.dirname(f)).split(path.sep).join("/"))
    );
    expect(routes.filter((r) => !registered.has(r))).toEqual([]);
  });

  it("each article route renders its own registry entry in its own language", () => {
    for (const a of BLOG_ARTICLES) {
      for (const lang of BLOG_LANGS) {
        const src = fs.readFileSync(routeFile(articlePath(a.key, lang)), "utf8");
        expect(src, `${a.key}/${lang}`).toContain(`articleKey="${a.key}"`);
        expect(src, `${a.key}/${lang}`).toContain(`lang="${lang}"`);
        expect(src, `${a.key}/${lang}`).toContain(`blogArticleMetadata("${a.key}", "${lang}")`);
        for (const m of src.matchAll(/related(Pillars|Articles)=\{\[([^\]]*)\]\}/g)) {
          const keys = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
          for (const k of keys) {
            if (m[1] === "Pillars") expect(PILLARS[k], `${a.key}/${lang} pillar ${k}`).toBeDefined();
            else expect(BLOG_ARTICLES.some((x) => x.key === k), `${a.key}/${lang} article ${k}`).toBe(true);
          }
        }
      }
    }
  });

  it("pillar links point at existing pages in each language", () => {
    for (const p of Object.values(PILLARS)) for (const lang of BLOG_LANGS) expect(fs.existsSync(routeFile(p.href[lang])), p.href[lang]).toBe(true);
  });

  it("clusters have content in both languages and the sitemap lists every blog page", () => {
    for (const c of BLOG_CLUSTERS) for (const lang of BLOG_LANGS) expect(c.label[lang] && c.heading[lang] && c.intro[lang]).toBeTruthy();
    // sitemap.ts mengimpor layout.tsx (font) sehingga tidak bisa dijalankan di test; cukup pastikan ia
    // membangun entri blog dari allBlogPaths() dan tidak menulis path blog secara manual.
    const sm = fs.readFileSync(path.join(APP, "sitemap.ts"), "utf8");
    expect(sm).toContain("...allBlogPaths()");
    expect(sm.match(/path: "\/(en\/)?blog/g)).toBeNull();
  });
});
