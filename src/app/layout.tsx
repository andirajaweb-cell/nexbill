import type { Metadata } from "next";
import { Orbitron, Rajdhani, Inter, Geist } from "next/font/google";
import { DialogHost } from "@/components/DialogHost";
import { PsCursorSystem } from "@/components/PsCursorSystem";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"], variable: "--font-display" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

const SITE_URL = "https://nexbill.id"; 

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
    // Ini adalah kunci SEO Internasional (Hreflang Tags)
    languages: {
      'id-ID': `${SITE_URL}`,       // Indonesia (Default)
      'en-US': `${SITE_URL}/en`,    // English
      'ms-MY': `${SITE_URL}/ms`,    // Malaysia
      'th-TH': `${SITE_URL}/th`,    // Thailand
      'fil-PH': `${SITE_URL}/fil`,  // Philippines
      'vi-VN': `${SITE_URL}/vi`,    // Vietnam
      'x-default': SITE_URL,        // Fallback jika wilayah tidak cocok
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
    "offers": {
      "@type": "Offer",
      "price": "249000",
      "priceCurrency": "IDR",
      "billingIncrement": "P1M"
    }
  };

  return (
    <html lang="id" className={cn(orbitron.variable, rajdhani.variable, inter.variable, "font-sans", geist.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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