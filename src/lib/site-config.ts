// The marketing/landing site's own canonical domain — split out of src/app/layout.tsx, which
// used to be the only place this lived. That worked fine as long as every importer was itself a
// Server Component (sitemap.ts, robots.ts, and ~20 metadata-exporting pages all import it that
// way), but src/components/seo/Breadcrumb.tsx also imports it and IS reachable from a Client
// Component (src/app/about/page.tsx has "use client"). Importing anything — even a plain string
// constant — from layout.tsx pulls that whole module into whatever bundle needs it; when that
// bundle is a client one, Next.js refuses to build at all, because layout.tsx also exports
// `metadata`, and `metadata` is only ever allowed to exist in a server-only module ("You are
// attempting to export 'metadata' from a component marked with 'use client'"). Moving the
// constant to this small, framework-agnostic file means it can be imported from server OR client
// code with no such entanglement. layout.tsx re-exports it from here so its ~20 existing
// `import { SITE_URL } from "@/app/layout"` call sites keep working unchanged.
export const SITE_URL = "https://www.nexbill.id";
