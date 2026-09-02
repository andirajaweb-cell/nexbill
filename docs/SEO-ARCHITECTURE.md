# NexBill.id — SEO Architecture & Roadmap

**Status:** Blueprint for review — no new pages/content published from this document yet.
**Scope:** Full-funnel, multi-market (Indonesia → Malaysia, Singapore, Philippines, Thailand, Vietnam) SEO ecosystem for NexBill, positioning the homepage as topical authority for PlayStation rental / gaming center billing software.
**Non-negotiables (from the brief):** no thin content, no duplicate content, no fake reviews/stats/locations, no keyword stuffing, no hidden text, no misleading schema, no doorway pages, no mass-produced low-value pages. Every page below exists because it answers a real search intent with real product substance.

---

## 1. Where we already are (don't rebuild this)

Completed in prior sessions — this roadmap builds on top of it, not instead of it:

| Item | File | Status |
|---|---|---|
| `robots.txt` (dynamic) | `src/app/robots.ts` | ✅ blocks `/dashboard`, `/platform-admin`, `/api`, `/receipt`, `/payment` |
| `sitemap.xml` (dynamic) | `src/app/sitemap.ts` | ✅ lists public pages only; needs new entries as pages below ship |
| Canonical URLs | root `layout.tsx` + per-route `layout.tsx` (`/about`, `/daftar`, `/login`, `/kebijakan-*`, `/syarat-ketentuan`, `/book`) | ✅ fixed the bug where every page inherited the homepage's canonical |
| hreflang | root `layout.tsx` `alternates.languages` (id/en/ms/th/fil/vi) | ✅ present, but **not yet backed by real localized URLs** — see §7 |
| JSON-LD | `SoftwareApplication` + `Organization` (root layout), `FAQPage` (homepage FAQ section) | ✅ live |
| OG/Twitter metadata + `og-image.jpg` | root `layout.tsx` | ✅ (og-image was previously missing entirely — fixed) |
| Custom 404 | `src/app/not-found.tsx` | ✅ real 404 status, branded |
| Redirects | `src/middleware.ts` | ✅ 308 permanent for the host-split, 307 for auth-gated |
| HSTS + security headers | `next.config.ts` | ✅ |
| Core Web Vitals: images | homepage showcase images | ✅ converted to WebP + lazy-loading + explicit width/height |
| Semantic landmarks | homepage | ✅ single `h1`, `<main>`, `<nav>`, `<footer>` |

**Known gap flagged but not yet fixed:** `/book/[slug]` (per-outlet public booking pages) has no `generateMetadata()` — each outlet's page currently inherits the homepage's title/OG image. Real fix needs per-outlet name/logo pulled from the DB; scoped as its own ticket (§9, Phase 2).

---

## 2. Target keyword map (what each pillar page owns)

No two pages should compete for the same primary keyword. Each pillar below is assigned **one** primary term; everything else it ranks for is secondary/long-tail.

| Page | Primary keyword (ID) | Primary keyword (EN) | Search intent |
|---|---|---|---|
| `/` (homepage) | *(brand + category umbrella — doesn't compete with pillars below)* | — | Navigational + category discovery |
| `/billing-rental-ps` | billing rental PS | PlayStation rental billing software | Commercial investigation |
| `/aplikasi-rental-ps` | aplikasi rental PS | PlayStation rental app | Commercial investigation |
| `/software-rental-ps` | software rental PS | PlayStation rental management software | Commercial investigation |
| `/sistem-rental-ps` | sistem rental PS | PS rental system | Commercial investigation |
| `/aplikasi-kasir-rental-ps` | aplikasi kasir rental PS | rental PS POS app | Commercial investigation |
| `/solusi/gaming-center` | software gaming center | gaming center management software | Commercial investigation |
| `/solusi/gaming-cafe` | software gaming cafe | gaming cafe management software | Commercial investigation |

**Why four near-synonym pillars instead of one page keyword-stuffed with all four phrases:** they map to genuinely different searcher framings (someone typing "aplikasi" wants an app; "sistem" wants to know it's a full system; "billing" is transaction-focused) — Google already treats these as distinct enough SERPs to reward dedicated, differentiated pages over one page force-fitted with all four. Each page must have a **different H1, different lead paragraph, different primary CTA framing** — same product, different angle, or this becomes de facto duplicate content and both pages get suppressed. This is the single biggest content-quality risk in this whole plan and needs real editorial discipline, not a template swap.

---

## 3. Full site/URL map

```
/                                   homepage — topical authority hub
/about
/harga                              pricing (existing "harga" section → promoted to standalone page + anchor kept on homepage)
/billing-rental-ps                  pillar
/aplikasi-rental-ps                 pillar
/software-rental-ps                 pillar
/sistem-rental-ps                   pillar
/aplikasi-kasir-rental-ps           pillar

/fitur                              feature hub (index linking to all below)
/fitur/billing
/fitur/kasir
/fitur/member
/fitur/booking
/fitur/pembayaran
/fitur/laporan
/fitur/manajemen-unit
/fitur/multi-cabang
/fitur/fnb

/ps3                                console-specific landing (real differences: legacy hardware, cash-only common, lower price point)
/ps4
/ps5

/solusi                             solution hub
/solusi/gaming-center
/solusi/gaming-cafe
/solusi/bisnis-kecil                (1-2 unit)
/solusi/bisnis-menengah             (3-10 unit / multi-cabang)
/solusi/bisnis-besar                (10+ unit / franchise)

/case-study                         index
/case-study/[slug]                  one per real customer, real data, real quotes — see §8 guardrails

/tools/kalkulator-profit-rental-ps
/tools/kalkulator-harga-rental-ps
/tools/kalkulator-roi-rental-ps

/blog                               index + /blog/[cluster]/[slug]
/blog/bisnis-rental-ps/...
/blog/billing-dan-operasional/...
/blog/keuangan/...
/blog/marketing/...
/blog/playstation-dan-gaming/...

/my  (or my.nexbill.id — decision needed, see §7)   Malaysia landing
/sg                                                  Singapore landing
/ph                                                  Philippines landing
/th                                                  Thailand landing
/vn                                                  Vietnam landing
```

Existing routes (`/daftar`, `/login`, `/kebijakan-cookie`, `/kebijakan-refund`, `/syarat-ketentuan`, `/book/[slug]`) are unchanged.

**Sitemap:** `src/app/sitemap.ts` gets a new entry appended per page as it ships — never batch-add placeholder URLs for pages that don't exist yet (that alone would violate the "no mass page with no real value" rule at the sitemap level).

---

## 4. JSON-LD schema plan (per page type)

| Page type | Schema | Notes |
|---|---|---|
| Root layout (all pages) | `Organization` | ✅ already live — carries `sameAs`, logo |
| Homepage | `WebSite` + `SearchAction` | **new** — enables Google's sitelinks searchbox; only add if `/search` (or homepage `?q=`) actually works, otherwise this is a "misleading schema" violation |
| Homepage, `/harga` | `SoftwareApplication` (+ `Offer`) | ✅ `SoftwareApplication` already live on root; `/harga` gets its own `Product`+`Offer` with the real current price, not a copy |
| Every pillar/feature/solution/tool page | `BreadcrumbList` | Mirrors the visible breadcrumb component (§6) — never diverge from what's on-screen |
| Any page with a real FAQ block | `FAQPage` | ✅ pattern already proven on homepage FAQ; reuse the same "build JSON-LD straight from the rendered `t.faq.items`" approach so it can never drift from visible copy |
| Blog posts | `Article` (`BlogPosting`) | Requires real `author`, `datePublished`, `dateModified` — see §10 (E-E-A-T). No `Article` schema on pages without a named author. |
| Case studies | `Article` + optionally `Review`/`AggregateRating` **only if** the rating is real and sourced (e.g. an actual testimonial with the customer's consent) — **never a fabricated rating** |
| Pages with an embedded demo video | `VideoObject` | `uploadDate`, `duration`, `thumbnailUrl` must be real, pulled from actual video metadata, not guessed |
| Country landing pages | `Organization` (localized `areaServed`) inherited from root; no separate fake "LocalBusiness with address" per country unless NexBill has a real registered entity/office there — a fabricated address is exactly the "fake location" pattern the brief forbids |

---

## 5. CMS / database schema for SEO fields

NexBill's data layer is Drizzle ORM (`src/db/schema.ts`, Postgres). Proposed new tables follow the exact existing convention (see `outlets` table for the pattern this mirrors):

```ts
// src/db/schema.ts — proposed additions (not yet applied)

export const contentPages = pgTable("content_pages", {
  id: id(),
  slug: text("slug").notNull().unique(),          // "/billing-rental-ps"
  pageType: text("page_type").notNull(),           // "pillar" | "feature" | "solution" | "tool" | "case_study" | "country"
  locale: text("locale").notNull().default("id"),  // id | en | ms | th | fil | vi
  title: text("title").notNull(),
  metaDescription: text("meta_description").notNull(),
  h1: text("h1").notNull(),
  canonicalUrl: text("canonical_url"),              // override; defaults to SITE_URL + slug if null
  ogImageUrl: text("og_image_url"),
  schemaType: text("schema_type"),                  // "SoftwareApplication" | "Article" | ... (drives which JSON-LD builder runs)
  bodyMdx: text("body_mdx"),                        // for blog/case-study; pillar pages stay hand-coded React for full layout control
  authorId: text("author_id").references(() => staffUsers.id), // reuses existing staff/user table — see §10
  noindex: boolean("noindex").notNull().default(false),
  publishedAt: timestamp("published_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("content_pages_locale_type_idx").on(t.locale, t.pageType),
  index("content_pages_published_idx").on(t.publishedAt),
]);

export const blogClusters = pgTable("blog_clusters", {
  id: id(),
  slug: text("slug").notNull().unique(),   // "billing-dan-operasional"
  name: text("name").notNull(),
  pillarPageId: text("pillar_page_id").references(() => contentPages.id), // the cluster's hub page
});
```

Why not just hardcode every page as a React file (like the current homepage): pillar/feature/solution pages are low-volume and hand-authored — those stay as React route files for full design control, matching how `/about` etc. already work. **Blog posts and case studies** go through `contentPages` because their volume and publishing cadence need a real editorial workflow (draft → review → publish → update) without a code deploy per post. This is a deliberate split, not "everything in a CMS" or "everything hardcoded."

`generateMetadata()` on the blog/case-study route reads directly from this table — title, description, canonical, OG image, and `noindex` all come from one source of truth, which is what prevents the exact bug we already found and fixed on `/about` (page silently inheriting homepage metadata).

---

## 6. Internal linking, breadcrumbs, related content

- **Breadcrumb component** (`src/components/seo/Breadcrumb.tsx`, new): renders the visible trail (`Beranda / Fitur / Billing`) **and** emits the matching `BreadcrumbList` JSON-LD from the exact same array — one source, so visible and structured data can never diverge.
- **Topic-cluster internal linking:** every blog post links up to its cluster pillar (e.g. all "billing-dan-operasional" posts link to `/fitur/billing`), and every pillar page links out to its 3-5 most relevant cluster posts once they exist. Anchor text is descriptive and varied ("cara hitung harga sewa PS per jam", not repeated "klik di sini" or the exact-match keyword every time — exact-match anchor stuffing is its own spam pattern).
- **Related content block:** on feature/solution pages, a "Terkait" section pulling 2-3 contextually related pages (same `pageType` or shared cluster) — computed from real relationships in `contentPages`, not random/recent.
- **Feature ↔ pillar cross-links:** `/billing-rental-ps` (pillar) links into `/fitur/billing`, `/fitur/pembayaran`, `/fitur/laporan` (the features that specifically deliver on "billing") — not a link to all 9 feature pages from every pillar, which dilutes relevance signal.

---

## 7. Multilingual & country-specific SEO (the highest-risk part of this plan)

**Current state:** `hreflang` tags already point to `/en`, `/ms`, `/th`, `/fil`, `/vi` — but those URLs **don't exist**. This is worse than no hreflang at all (Google Search Console will report hreflang errors). Two ways to fix, pick one:

- **Option A — retire the aspirational hreflang now**, keep only `id-ID` + `x-default` until real localized pages ship, then add each locale's hreflang entry the same day its page goes live.
- **Option B — build the localized homepage variants first**, then the hreflang tags become true.

**Recommendation: Option A**, immediately, regardless of which phase we start executing — a broken hreflang tag actively hurts the pages we already have. This is a 5-minute fix and should happen before anything else in this whole roadmap.

**For each country landing page**, "real localization" (not a doorway page) means all of the following are actually true, not just translated boilerplate:

| Dimension | Requirement |
|---|---|
| Language | Native-quality copy in the local language (Bahasa Melayu ≠ Bahasa Indonesia; Filipino market often mixes English+Tagalog — match how the market actually searches) |
| Terminology | "rental PS" (ID) vs "PS rental shop" / "gaming shop" (MY/SG/PH phrasing differs) — verified against real local search query patterns, not assumed |
| Currency | Real pricing shown in MYR/SGD/PHP/THB/VND, not IDR with a currency symbol swapped — this already has infra (`lib/market-risk` currency conversion, built in a prior session) to reuse |
| Payment methods | Each country's actual dominant rails (e.g. GrabPay/Touch'n Go in MY, GCash in PH, PromptPay in TH) — mention what's *actually integrated or planned*, never list a payment method NexBill doesn't support |
| Search intent | The page answers what that market searches for, which may not mirror the Indonesian pillar 1:1 — needs a keyword pass per country before writing, not a straight translation of the ID pillar page |
| Legal/compliance mentions | Don't claim compliance/registration status NexBill doesn't have in that country |

**Domain/path structure decision needed from you:** subdirectory (`nexbill.id/my`) is what's assumed above and is the lower-effort, faster-to-rank option since it inherits the root domain's authority. A ccTLD or subdomain per country (`nexbill.my`, `sg.nexbill.id`) is heavier infra and typically only worth it once a market is proven — **not recommended to start with**.

**Sequencing:** don't localize all 5 countries at once. Ship Malaysia first (closest market linguistically/commercially to Indonesia, easiest to verify claims for), prove it converts, then repeat the same real-research process per country — this is explicitly why §11's phases spread MY/SG and PH/TH/VN across two separate phases instead of one "launch all 5" push.

---

## 8. Guardrails — explicit anti-patterns (do not do these, ever)

Restating the brief's constraints as concrete engineering/editorial rules so they're checkable, not just aspirational:

- **No page ships with `bodyMdx`/content under ~600 words of substantive, non-templated text** unless it's a tool (calculator) or hub/index page where thinness is expected by design.
- **No two pages share >30% duplicated sentences.** Pillar pages in particular must be checked against each other before publishing (see §2).
- **No testimonial, rating, or case-study number is published without a named, real, consenting source.** If a number can't be attributed, it doesn't go on the page — not even as a "typical" or rounded illustrative figure.
- **No `LocalBusiness` schema with a fabricated address.** Only use it where NexBill has a real registered/operating address (currently: the Bandung address already in the footer — fine to mark up; do not invent branch addresses per country).
- **No exact-match anchor text repeated more than 2-3 times sitewide** for any single keyword phrase.
- **No hidden text/links** (no `display:none` keyword blocks, no white-on-white text, no off-screen keyword lists).
- **No auto-generated "city + keyword" page combinations** (e.g. do not spin up `/rental-ps-jakarta`, `/rental-ps-bandung`, `/rental-ps-surabaya`... — NexBill is a B2B SaaS for rental *owners*, not a rental *directory*; city-combinatorial pages here would be a textbook doorway-page pattern with zero unique value per page).
- **Every `noindex` decision is deliberate and documented** — private/admin/dashboard/API routes are blocked at the route level (already done via `robots.ts` + per-page `robots: { index: false }` where applicable, e.g. `/book` bare route), not left to chance.

---

## 9. E-E-A-T / trust signals

- **Author system:** blog posts and case studies require a real `authorId` (§5) tied to an actual NexBill team member — a short author bio block (name, role, 1-2 sentence credibility statement) rendered on every article, plus an `/authors/[slug]` page listing their published work. No "Admin" or "NexBill Team" byline on individual articles once this ships (the generic `authors: [{ name: "NEXBILL Team" }]` in root metadata stays fine for site-level attribution, but per-article bylines need a person).
- **Content freshness:** `updatedAt` is a real field (§5), shown on-page ("Diperbarui 12 Agustus 2026") and driving `dateModified` in `Article` schema — only touched when content is actually revised, never bumped cosmetically to fake freshness.
- **Case studies as the primary trust asset:** real customer, real before/after numbers with their permission, real quote. This does more for trust signal than any generic "4.9★ trusted by 500+ outlets" badge (which already exists in the homepage trust-badge component — fine as a light social-proof element, but case studies are what actually builds authority; don't scale up the badge's specific numbers without being able to source them).

---

## 10. Conversion funnel mapping

```
Google Search
   → Pillar / Feature / Solution / Country landing page   (relevant, matches query intent)
      → "Solusi" framing (what problem this solves)
         → Feature deep-dive (how it actually works)
            → Proof (case study / stat with real source)
               → /harga (pricing, clear plan comparison)
                  → /daftar (free trial / demo signup)
```

Every pillar/feature/solution page template includes, in this order: problem framing → solution → proof/social signal → pricing CTA → secondary CTA (demo/trial). This is the same structural pattern the homepage already uses (Solusi → Fitur → Harga → FAQ sections) — the pillar pages are that same funnel compressed into a single-keyword-focused page instead of spread across homepage sections.

---

## 11. Google Search Console / Analytics integration

Needed from you before this can be wired up (nothing here can be faked or guessed):

1. **GSC property** for `nexbill.id` (domain property, covers both `www.nexbill.id` and `dashboard.nexbill.id` under one property) — verification via DNS TXT record or the existing HTML meta-tag method.
2. **GA4 property** + measurement ID.
3. Decision: self-serve dashboard inside `/platform-admin` pulling GSC/GA4 API data (more build effort, but keeps monitoring inside the existing admin the team already uses daily), vs. just using GSC/GA's own web UIs (zero build effort, less integrated).

Once verification access exists, the concrete build is: a `/platform-admin/seo` page (reusing the existing platform-admin auth/layout pattern already in the codebase) showing impressions/clicks/CTR/avg. position by page and by country, indexed-page count, and organic-conversion tie-in to the existing `daftar`/trial signup event. This is Phase 3+ work (§11 below) — sequenced after there's enough indexed content for the data to be meaningful.

---

## 12. Phased rollout

| Phase | Scope | Depends on |
|---|---|---|
| **0 (do now, ~1 session)** | Fix aspirational hreflang (§7 Option A); add `Breadcrumb` component + wire into existing pages that have real hierarchy; add `WebSite`+`SearchAction` schema *only if* site search exists, otherwise skip | Nothing — pure technical fix |
| **1** | `contentPages`/`blogClusters` schema + migration; `generateMetadata()` reads from it; 4 pillar pages (ID) with real, differentiated copy (§2) | Phase 0 |
| **2** | 9 feature pages, 3 console pages (PS3/4/5), 3 business-size solution pages, 2 gaming-center/cafe solution pages, `/harga` promoted to standalone page; `/book/[slug]` per-outlet metadata fix | Phase 1 (reuses `contentPages` infra) |
| **3** | 3 calculators (profit/price/ROI) — pure interactive tools, no thin-content risk, can actually run in parallel with Phase 1/2 if you want a quick win sooner | Independent |
| **4** | Blog engine + first cluster (5-8 real articles, one cluster, with real author) — prove the workflow before scaling to 5 clusters | Phase 1 |
| **5** | Malaysia localization (real research pass per §7) | Phase 1-2 content patterns proven |
| **6** | Singapore localization | Phase 5 workflow proven |
| **7** | Philippines, Thailand, Vietnam (one at a time, not batched) | Phase 5-6 |
| **8** | GSC/GA integration + `/platform-admin/seo` dashboard | Enough indexed content to be meaningful (post-Phase 2) |

Case studies (§3) are seeded opportunistically whenever a real customer agrees to be featured — not tied to a phase number, since they depend on customer availability, not engineering sequencing.

---

## 13. Immediate next action

Phase 0 has no content-quality risk and no scope ambiguity — recommend greenlighting it as the very next execution step regardless of which later phase you want to tackle first. After that, the real decision point is: **pillar pages first (content-heavy, ranking-heavy) vs. calculators first (fast, low-risk, immediate conversion tool)** — both were offered as options earlier and either is a reasonable Phase-1-in-practice starting point once Phase 0 is done.
