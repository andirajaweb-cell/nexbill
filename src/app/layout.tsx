import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani, Inter, Geist } from "next/font/google";
import { DialogHost } from "@/components/DialogHost";
import { PsCursorSystem } from "@/components/PsCursorSystem";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"], variable: "--font-display" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

// The marketing/landing site's own domain (see src/middleware.ts for the full domain split) —
// /dashboard and /platform-admin live on dashboard.nexbill.id instead, which is deliberately not
// what search engines/social previews should treat as canonical for this metadata.
// Moved to src/lib/site-config.ts after a build error: Breadcrumb.tsx, which is reachable from a
// "use client" page, was importing SITE_URL from this file directly, which dragged this whole
// module — including the `metadata` export below, which Next.js requires to stay server-only —
// into a client bundle. Imported (for this file's own use below) AND re-exported (so every other
// existing `from "@/app/layout"` importer — sitemap.ts, robots.ts, ~20 metadata-exporting pages —
// keeps working unchanged) here.
import { SITE_URL } from "@/lib/site-config";
export { SITE_URL };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NEXBILL — Sistem Billing All-in-One untuk Rental PlayStation",
    template: "%s | NEXBILL"
  },
  description: "Kelola rental PlayStation Anda dalam satu sistem: kasir, kontrol TV/konsol otomatis, booking online, membership, laporan keuangan lengkap, dan AI assistant. Mulai dari Rp249.000/bulan.",
  keywords: [
    // 🇮🇩 Indonesia
    "billing PS", "software rental PlayStation", "aplikasi kasir rental PS", 
    // 🇬🇧 English (Global)
    "PlayStation rental billing software", "game center management system", "PS5 TV automation control", "console rental POS",
    // 🇲🇾 Malaysia
    "sistem bil sewa PlayStation", "perisian pusat permainan", "sistem pengurusan PS5",
    // 🇹🇭 Thailand
    "ระบบคิดเงิน PlayStation", "โปรแกรมร้านเกม", "ระบบควบคุมทีวีร้านเกมอัตโนมัติ",
    // 🇵🇭 Philippines (Tagalog/English)
    "PlayStation rental software", "sistema ng pag-billing sa PS5", "game center POS Philippines",
    // 🇻🇳 Vietnam
    "phần mềm quản lý quán PS5", "phần mềm tính tiền PlayStation", "hệ thống quản lý phòng game"
  ],
  authors: [{ name: "NEXBILL Team" }],
  creator: "NEXBILL",
  publisher: "NEXBILL",
  alternates: {
    canonical: SITE_URL,
    // Hreflang — SEO Architecture Phase 0 (docs/SEO-ARCHITECTURE.md §7): this previously listed
    // /en, /ms, /th, /fil, /vi as if they existed. They don't yet — the UI has a client-side
    // language *switcher* (see landing-i18n.tsx), not separate URLs per locale, so those hreflang
    // entries pointed Google at 404s. A broken hreflang tag is worse than none (GSC reports it as
    // an error and it can suppress the pages we DO have), so this is trimmed to only what's real
    // until each locale gets its own actual URL (roadmap Phase 5+ — country landing pages), at
    // which point that locale's entry gets added back the same day the URL ships.
    languages: {
      'id-ID': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US", "ms_MY", "th_TH", "fil_PH", "vi_VN"], // Support Sosmed Multibahasa
    url: SITE_URL,
    title: "NEXBILL — The Ultimate PlayStation Rental Billing System",
    description: "Tingkatkan profit rental PS Anda dengan otomatisasi TV, kasir cerdas, dan laporan keuangan realtime.",
    siteName: "NEXBILL",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "NEXBILL Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXBILL — PlayStation Rental Billing",
    description: "Automate your PlayStation rental business today.",
    images: ["/og-image.jpg"],
    creator: "@nexbill_id",
  },
};

// Explicit viewport export (Next.js splits this out of `metadata` since v14) — mobile-responsive
// technical-SEO signal: width=device-width + initial-scale=1 is what stops browsers from
// desktop-rendering-then-shrinking the page, which is what "mobile-friendly" test tools check
// for. themeColor also tints the mobile browser chrome/status bar to match the brand.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050810",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  // Structured Data (JSON-LD) yang memberitahu bot bahwa aplikasi ini tersedia dalam banyak bahasa
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXBILL",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, Windows, macOS",
    "description": "All-in-One Billing System for PlayStation rentals featuring POS, automatic TV control, and online booking.",
    "url": SITE_URL,
    "availableLanguage": ["Indonesian", "English", "Malay", "Thai", "Tagalog", "Vietnamese"], // SEO Power untuk AI Scraping
    // Geo-targeting eksplisit: Indonesia + negara Asia Tenggara utama yang sudah punya
    // terjemahan (lihat alternates.languages di atas) — membantu Google memahami cakupan
    // layanan untuk hasil pencarian lokal ("near me" / regional).
    "areaServed": [
      { "@type": "Country", "name": "Indonesia" },
      { "@type": "Country", "name": "Malaysia" },
      { "@type": "Country", "name": "Thailand" },
      { "@type": "Country", "name": "Philippines" },
      { "@type": "Country", "name": "Vietnam" },
      { "@type": "Country", "name": "Singapore" },
    ],
    "offers": {
      "@type": "Offer",
      "price": "249000",
      "priceCurrency": "IDR",
      "billingIncrement": "P1M"
    }
  };

  // Organization node — separate from the SoftwareApplication above so Google can attribute the
  // product to a real publisher/developer entity (Knowledge Graph eligibility) rather than just an
  // app listing. "sameAs" is the standard schema.org way to link out to associated properties.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "NEXBILL",
    "url": SITE_URL,
    "logo": `${SITE_URL}/og-image.jpg`,
    "areaServed": ["Indonesia", "Southeast Asia"],
    "sameAs": [
      "https://digitrajasa.web.id",
    ],
  };

  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={cn(orbitron.variable, rajdhani.variable, inter.variable, "font-sans", geist.variable)}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="gm-body antialiased">
        {children}
        <DialogHost />
        <PsCursorSystem />
      </body>
    </html>
  );
}