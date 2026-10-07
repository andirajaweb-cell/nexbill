import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-config";
import { PillarNav, PillarFooter } from "@/components/pillar/PillarPage";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { AUTHORS } from "./BlogArticle";
import {
  AUTHOR_ROOT,
  BLOG_ARTICLES,
  BLOG_CLUSTERS,
  BLOG_ROOT,
  BLOG_UI,
  articlePath,
  authorPath,
  blogAlternates,
  clusterByKey,
  clusterPath,
  pairOf,
  type BlogLang,
} from "./blog-data";

// Blog index, cluster hub and author pages — one implementation for both /blog (Indonesian) and
// /en/blog (English). The route files only pick the language; everything listed here comes from
// blog-data.ts, so a new article shows up in every list (and the sitemap) once it's registered there.

/* ---------- Blog index (docs/SEO-ARCHITECTURE.md §12 Phase 4) ---------- */

export function blogIndexMetadata(lang: BlogLang): Metadata {
  return { title: BLOG_UI[lang].indexMetaTitle, description: BLOG_UI[lang].indexMetaDescription, alternates: blogAlternates(BLOG_ROOT, lang) };
}

// Written to scale to more clusters without a redesign, but deliberately doesn't list
// clusters/articles that don't exist yet (no placeholder cards).
export function BlogIndex({ lang }: { lang: BlogLang }) {
  const ui = BLOG_UI[lang];
  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <PillarNav lang={lang} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: ui.home, href: "/" }, { label: ui.blog }]} />
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-black">{ui.indexTitle}</h1>
          <Link href={BLOG_ROOT[lang === "id" ? "en" : "id"]} hrefLang={lang === "id" ? "en" : "id"} className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors">
            {ui.otherLanguage}
          </Link>
        </div>
        <p className="mt-3 text-neutral-400 leading-relaxed max-w-xl">{ui.indexIntro}</p>

        <div className="mt-10 space-y-4">
          {BLOG_CLUSTERS.map((c) => (
            <Link
              key={c.key}
              href={clusterPath(c.key, lang)}
              className="block rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-cyan-400/30 transition-colors"
            >
              <div className="font-semibold text-white">{c.label[lang]}</div>
              <p className="mt-1.5 text-sm text-neutral-400">{c.desc[lang]}</p>
              <div className="mt-2 text-xs text-cyan-400">{ui.articleCount.replace("{n}", String(BLOG_ARTICLES.filter((a) => a.cluster === c.key).length))}</div>
            </Link>
          ))}
        </div>
      </main>
      <PillarFooter lang={lang} />
    </div>
  );
}

/* ---------- Cluster hub (docs/SEO-ARCHITECTURE.md §6) ---------- */

export function blogClusterMetadata(clusterKey: string, lang: BlogLang): Metadata {
  const c = clusterByKey(clusterKey);
  return { title: c.metaTitle[lang], description: c.metaDescription[lang], alternates: blogAlternates(pairOf((l) => clusterPath(clusterKey, l)), lang) };
}

// The "pillar" of the topic cluster: every article in this cluster links back up here, and this
// page links out to all of them.
export function BlogClusterPage({ clusterKey, lang }: { clusterKey: string; lang: BlogLang }) {
  const ui = BLOG_UI[lang];
  const c = clusterByKey(clusterKey);
  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <PillarNav lang={lang} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: ui.home, href: "/" }, { label: ui.blog, href: BLOG_ROOT[lang] }, { label: c.label[lang] }]} />
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-black">{c.heading[lang]}</h1>
          <Link href={clusterPath(clusterKey, lang === "id" ? "en" : "id")} hrefLang={lang === "id" ? "en" : "id"} className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors">
            {ui.otherLanguage}
          </Link>
        </div>
        <p className="mt-3 text-neutral-400 leading-relaxed max-w-xl">{c.intro[lang]}</p>

        <div className="mt-10 divide-y divide-white/5">
          {BLOG_ARTICLES.filter((a) => a.cluster === clusterKey).map((a) => (
            <Link key={a.key} href={articlePath(a.key, lang)} className="block py-5 group">
              <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{a.title[lang]}</div>
              <p className="mt-1.5 text-sm text-neutral-400">{a.summary[lang]}</p>
            </Link>
          ))}
        </div>
      </main>
      <PillarFooter lang={lang} />
    </div>
  );
}

/* ---------- Author page (E-E-A-T, docs/SEO-ARCHITECTURE.md §9) ---------- */

export function authorMetadata(slug: string, lang: BlogLang): Metadata {
  const author = AUTHORS[slug];
  return {
    title: `${author.name} — ${author.role[lang]}`,
    description: `${author.name}, ${author.role[lang]}. ${author.bio[lang]}`,
    alternates: blogAlternates({ id: `${AUTHOR_ROOT.id}/${slug}`, en: `${AUTHOR_ROOT.en}/${slug}` }, lang),
  };
}

// Real person, real role, real bio — exactly what AUTHORS carries, so this page can never drift
// from the byline shown on the articles. Every article in blog-data.ts is by this author for now.
export function AuthorProfile({ slug, lang }: { slug: string; lang: BlogLang }) {
  const ui = BLOG_UI[lang];
  const author = AUTHORS[slug];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.role[lang],
      description: author.bio[lang],
      url: `${SITE_URL}${authorPath(slug, lang)}`,
    },
  };

  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PillarNav lang={lang} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: ui.home, href: "/" }, { label: ui.blog, href: BLOG_ROOT[lang] }, { label: author.name }]} />

        <div className="mt-6 flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-[#050810]">
            {author.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black">{author.name}</h1>
            <div className="text-sm text-cyan-400 mt-0.5">{author.role[lang]}</div>
          </div>
        </div>
        <p className="mt-5 text-neutral-400 leading-relaxed max-w-xl">{author.bio[lang]}</p>

        <h2 className="mt-12 text-sm font-semibold text-neutral-500 uppercase tracking-wide">{ui.articlesBy.replace("{name}", author.name)}</h2>
        <ul className="mt-4 divide-y divide-white/5">
          {BLOG_ARTICLES.map((a) => (
            <li key={a.key} className="py-4">
              <Link href={articlePath(a.key, lang)} className="text-white hover:text-cyan-400 transition-colors font-medium">
                {a.title[lang]}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PillarFooter lang={lang} />
    </div>
  );
}
