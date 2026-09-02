import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { PillarNav, PillarFooter } from "@/components/pillar/PillarPage";
import { SITE_URL } from "@/app/layout";

// Shared shell for NexBill blog articles (docs/SEO-ARCHITECTURE.md §9, E-E-A-T). Every article
// carries a REAL author (see AUTHORS below) — no generic "NEXBILL Team" byline on individual
// posts, per the guardrail against fake trust signals. Reuses PillarNav/PillarFooter for visual
// consistency with the pillar pages rather than inventing a third header/footer variant.

export interface Author {
  slug: string;
  name: string;
  role: string;
  bio: string;
}

// Single source of truth for author identity — referenced by every article AND by
// /authors/[slug], so a byline can never drift from the author page it links to.
export const AUTHORS: Record<string, Author> = {
  "andika-rajasa": {
    slug: "andika-rajasa",
    name: "Andika Rajasa",
    role: "Founder NEXBILL",
    bio: "Pemilik bisnis rental PlayStation di Bandung, Indonesia — membangun NEXBILL dari pengalaman langsung mengelola outlet sendiri.",
  },
};

export interface BlogArticleProps {
  clusterLabel: string;
  clusterHref: string;
  title: string;
  dek: string;
  authorSlug: keyof typeof AUTHORS;
  publishedAt: string; // ISO date, e.g. "2026-08-31"
  updatedAt?: string;
  readingTime: string;
  children: React.ReactNode;
  relatedPillars: { label: string; href: string }[];
  relatedArticles: { label: string; href: string }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function BlogArticle(props: BlogArticleProps) {
  const author = AUTHORS[props.authorSlug];

  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <PillarNav lang="id" />

      <main className="max-w-3xl mx-auto px-4">
        <section className="pt-8 pb-6">
          <Breadcrumb
            items={[
              { label: "Beranda", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: props.clusterLabel, href: props.clusterHref },
              { label: props.title },
            ]}
          />
          <div className="mt-5">
            <Link href={props.clusterHref} className="text-xs font-semibold tracking-widest text-cyan-400 uppercase hover:underline">
              {props.clusterLabel}
            </Link>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black leading-tight">{props.title}</h1>
          <p className="mt-4 text-base text-neutral-400 leading-relaxed">{props.dek}</p>

          <div className="mt-5 flex items-center gap-3 text-sm text-neutral-500">
            <Link href={`/authors/${author.slug}`} className="font-medium text-neutral-300 hover:text-cyan-400 transition-colors">
              {author.name}
            </Link>
            <span aria-hidden="true">·</span>
            <time dateTime={props.publishedAt}>{formatDate(props.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{props.readingTime}</span>
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
              <Link href={`/authors/${author.slug}`} className="font-semibold text-white hover:text-cyan-400 transition-colors">
                {author.name}
              </Link>
              <div className="text-xs text-cyan-400 mt-0.5">{author.role}</div>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{author.bio}</p>
            </div>
          </div>
        </section>

        {/* Related pillar pages — ties cluster content back to the product pages (docs/SEO-ARCHITECTURE.md §6) */}
        {props.relatedPillars.length > 0 && (
          <section className="py-6 border-t border-white/5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Terkait dengan NEXBILL</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {props.relatedPillars.map((r, i) => (
                <li key={i}>
                  <Link href={r.href} className="inline-block rounded-full bg-blue-500/10 border border-blue-400/20 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/20 transition-colors">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Related articles — same cluster, varied anchor text */}
        {props.relatedArticles.length > 0 && (
          <section className="py-6 border-t border-white/5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Artikel Terkait Lainnya</h2>
            <ul className="mt-4 space-y-2">
              {props.relatedArticles.map((r, i) => (
                <li key={i}>
                  <Link href={r.href} className="text-sm text-neutral-300 hover:text-cyan-400 transition-colors">
                    → {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <PillarFooter lang="id" />
    </div>
  );
}

// Article/BlogPosting JSON-LD — real author, real dates, no fields fabricated.
export function blogArticleJsonLd(props: {
  title: string;
  dek: string;
  authorSlug: keyof typeof AUTHORS;
  publishedAt: string;
  updatedAt?: string;
  url: string;
}) {
  const author = AUTHORS[props.authorSlug];
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: props.title,
    description: props.dek,
    author: {
      "@type": "Person",
      name: author.name,
      url: `${SITE_URL}/authors/${author.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: "NEXBILL",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.jpg` },
    },
    datePublished: props.publishedAt,
    dateModified: props.updatedAt ?? props.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": props.url },
  };
}
