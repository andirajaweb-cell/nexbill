import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { PillarNav, PillarFooter } from "@/components/pillar/PillarPage";
import { SITE_URL } from "@/lib/site-config";
import {
  BLOG_ROOT,
  BLOG_UI,
  PILLARS,
  articleByKey,
  articlePath,
  authorPath,
  blogAlternates,
  clusterByKey,
  clusterPath,
  pairOf,
  type BlogLang,
} from "./blog-data";

// Shared shell for NexBill blog articles (docs/SEO-ARCHITECTURE.md §9, E-E-A-T). Every article
// carries a REAL author (see AUTHORS below) — no generic "NEXBILL Team" byline on individual
// posts, per the guardrail against fake trust signals. Reuses PillarNav/PillarFooter for visual
// consistency with the pillar pages rather than inventing a third header/footer variant.
//
// The blog exists in Indonesian (/blog) and English (/en/blog). Titles, deks, dates, URLs and the
// hreflang pairs come from blog-data.ts; only each article's body lives in its own route file.

export interface Author {
  slug: string;
  name: string;
  role: Record<BlogLang, string>;
  bio: Record<BlogLang, string>;
}

// Single source of truth for author identity — referenced by every article AND by
// /authors/[slug] (+ /en/authors/[slug]), so a byline can never drift from the author page it links to.
export const AUTHORS: Record<string, Author> = {
  "andika-rajasa": {
    slug: "andika-rajasa",
    name: "Andika Rajasa",
    role: { id: "Founder NEXBILL", en: "Founder of NEXBILL" },
    bio: {
      id: "Pemilik bisnis rental PlayStation di Bandung, Indonesia — membangun NEXBILL dari pengalaman langsung mengelola outlet sendiri.",
      en: "Owner of a PlayStation rental business in Bandung, Indonesia — built NEXBILL from first-hand experience running his own outlet.",
    },
  },
};

export interface BlogArticleProps {
  lang: BlogLang;
  /** Key in BLOG_ARTICLES (blog-data.ts). */
  articleKey: string;
  authorSlug?: keyof typeof AUTHORS;
  updatedAt?: string;
  /** Keys in PILLARS. */
  relatedPillars: string[];
  /** Keys in BLOG_ARTICLES. */
  relatedArticles: string[];
  children: React.ReactNode;
}

const DATE_LOCALE: Record<BlogLang, string> = { id: "id-ID", en: "en-US" };

function formatDate(iso: string, lang: BlogLang) {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
}

/** Metadata (title, description, canonical + hreflang id/en) for an article route. */
export function blogArticleMetadata(articleKey: string, lang: BlogLang): Metadata {
  const a = articleByKey(articleKey);
  return {
    title: a.title[lang],
    description: a.dek[lang],
    alternates: blogAlternates(pairOf((l) => articlePath(articleKey, l)), lang),
  };
}

export function BlogArticle(props: BlogArticleProps) {
  const { lang } = props;
  const ui = BLOG_UI[lang];
  const a = articleByKey(props.articleKey);
  const cluster = clusterByKey(a.cluster);
  const author = AUTHORS[props.authorSlug ?? "andika-rajasa"];
  const otherLang: BlogLang = lang === "id" ? "en" : "id";

  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogArticleJsonLd({ articleKey: props.articleKey, lang, authorSlug: author.slug, updatedAt: props.updatedAt })) }}
      />
      <PillarNav lang={lang} />

      <main className="max-w-3xl mx-auto px-4">
        <section className="pt-8 pb-6">
          <Breadcrumb
            items={[
              { label: ui.home, href: "/" },
              { label: ui.blog, href: BLOG_ROOT[lang] },
              { label: cluster.label[lang], href: clusterPath(cluster.key, lang) },
              { label: a.title[lang] },
            ]}
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Link href={clusterPath(cluster.key, lang)} className="text-xs font-semibold tracking-widest text-cyan-400 uppercase hover:underline">
              {cluster.label[lang]}
            </Link>
            <Link href={articlePath(props.articleKey, otherLang)} hrefLang={otherLang} className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors">
              {ui.otherLanguage}
            </Link>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black leading-tight">{a.title[lang]}</h1>
          <p className="mt-4 text-base text-neutral-400 leading-relaxed">{a.dek[lang]}</p>

          <div className="mt-5 flex items-center gap-3 text-sm text-neutral-500">
            <Link href={authorPath(author.slug, lang)} className="font-medium text-neutral-300 hover:text-cyan-400 transition-colors">
              {author.name}
            </Link>
            <span aria-hidden="true">·</span>
            <time dateTime={a.publishedAt}>{formatDate(a.publishedAt, lang)}</time>
            <span aria-hidden="true">·</span>
            <span>{a.readingTime[lang]}</span>
          </div>
        </section>

        <article className="py-6 border-t border-white/5 space-y-5 text-[15px] text-neutral-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_strong]:text-white [&_strong]:font-semibold [&_a]:text-cyan-400 [&_a]:hover:underline">
          {props.children}
        </article>

        {/* Author box — E-E-A-T trust signal, real bio, links to the author's full page */}
        <section className="py-6 border-t border-white/5">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex items-start gap-4">
            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-[#050810]">
              {author.name.charAt(0)}
            </div>
            <div>
              <Link href={authorPath(author.slug, lang)} className="font-semibold text-white hover:text-cyan-400 transition-colors">
                {author.name}
              </Link>
              <div className="text-xs text-cyan-400 mt-0.5">{author.role[lang]}</div>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{author.bio[lang]}</p>
            </div>
          </div>
        </section>

        {/* Related pillar pages — ties cluster content back to the product pages (docs/SEO-ARCHITECTURE.md §6) */}
        {props.relatedPillars.length > 0 && (
          <section className="py-6 border-t border-white/5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{ui.relatedPillars}</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {props.relatedPillars.map((k) => (
                <li key={k}>
                  <Link href={PILLARS[k].href[lang]} className="inline-block rounded-full bg-blue-500/10 border border-blue-400/20 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/20 transition-colors">
                    {PILLARS[k].label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Related articles — same cluster, varied anchor text */}
        {props.relatedArticles.length > 0 && (
          <section className="py-6 border-t border-white/5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{ui.relatedArticles}</h2>
            <ul className="mt-4 space-y-2">
              {props.relatedArticles.map((k) => (
                <li key={k}>
                  <Link href={articlePath(k, lang)} className="text-sm text-neutral-300 hover:text-cyan-400 transition-colors">
                    → {articleByKey(k).shortTitle[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <PillarFooter lang={lang} />
    </div>
  );
}

// Article/BlogPosting JSON-LD — real author, real dates, no fields fabricated.
export function blogArticleJsonLd(props: { articleKey: string; lang: BlogLang; authorSlug: keyof typeof AUTHORS; updatedAt?: string }) {
  const a = articleByKey(props.articleKey);
  const author = AUTHORS[props.authorSlug];
  const url = `${SITE_URL}${articlePath(props.articleKey, props.lang)}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title[props.lang],
    description: a.dek[props.lang],
    inLanguage: props.lang === "id" ? "id-ID" : "en-US",
    author: {
      "@type": "Person",
      name: author.name,
      url: `${SITE_URL}${authorPath(author.slug, props.lang)}`,
    },
    publisher: {
      "@type": "Organization",
      name: "NEXBILL",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.jpg` },
    },
    datePublished: a.publishedAt,
    dateModified: props.updatedAt ?? a.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}
