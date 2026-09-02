import Link from "next/link";
// Imports from lib/site-config.ts, NOT @/app/layout — this component is reachable from a
// "use client" page (src/app/about/page.tsx), and importing SITE_URL from layout.tsx directly
// dragged that whole module (including its server-only `metadata` export) into the client bundle,
// which Next.js refuses to build. See site-config.ts's own comment for the full story.
import { SITE_URL } from "@/lib/site-config";

// Reusable breadcrumb — SEO Architecture Phase 0 (docs/SEO-ARCHITECTURE.md §6). Single source of
// truth: the visible trail below and the BreadcrumbList JSON-LD are built from the exact same
// `items` array, so structured data can never diverge from what a visitor actually sees (a
// mismatch there is one of the "misleading schema" patterns explicitly ruled out in the roadmap).
//
// `items` is the full trail including the current page as the LAST entry, with no `href` on that
// last entry (it's not a link — it's where you are).
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-neutral-600">/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:underline hover:text-cyan-400 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-neutral-400">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
