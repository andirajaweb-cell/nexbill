"use client";

// /about — standalone one-page "About" for the NEXBILL marketing site. Shares the same visual
// system as the homepage (src/app/page.tsx): same font stack + CSS variables (via the ".nb-landing"
// scope in landing.css) and the same <SiteNavbar>/<SiteFooter>, so it reads as one continuous site
// rather than a bolted-on page. Structure takes cues from the reference (appycamper.com/#about):
// full-screen tinted video hero with a big statement + short bio-style paragraph, followed by a
// giant looping "ABOUT" marquee band, then a calmer content section (stats + value pillars) before
// the shared footer.
import Link from "next/link";
import { Space_Grotesk, Inter, Bebas_Neue } from "next/font/google";
import "../landing.css";
import { SiteNavbar } from "../site-navbar";
import { SiteFooter } from "../site-footer";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { CookieConsentBanner } from "../cookie-consent-banner";
import { LanguageProvider, useLanguage } from "../landing-i18n";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nb-font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--nb-font-body" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--nb-font-poster" });

export default function AboutPage() {
  return (
    <LanguageProvider>
      <AboutPageInner />
    </LanguageProvider>
  );
}

function AboutPageInner() {
  const { t } = useLanguage();

  return (
    <div className={`nb-landing about-page ${spaceGrotesk.variable} ${inter.variable} ${bebasNeue.variable}`} style={{ position: "relative", background: "var(--bg, #04070f)" }}>
      <SiteNavbar />

      {/* HERO — full-screen looping background video with a 50% blue-black tint over it (per
          explicit brief: "video ... terlihat transparansi 50% blue black"), text laid out
          bottom-left/center like the appycamper.com reference screenshot. */}
      <header className="about-hero">
        <video className="about-hero-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
          <source src="/videos/about-bg.mp4" type="video/mp4" />
        </video>
        <div className="about-hero-overlay" aria-hidden="true" />
        <div className="wrap about-hero-content">
          <Breadcrumb items={[{ label: t.nav.home, href: "/" }, { label: t.nav.about }]} />
          <div className="about-hero-top">
            <span className="kicker">{t.nav.about}</span>
            <span className="about-hero-index">01 — 04</span>
          </div>
          <h1 className="about-hero-title">{t.about.heroTitle}</h1>
          <p className="about-hero-lede">{t.about.heroLede}</p>
        </div>
      </header>

      {/* MARQUEE — giant looping "ABOUT" band, CSS-only infinite scroll (content duplicated once
          so the loop point is invisible). Sits between the hero and the calmer content below,
          same beat as the reference screenshot's bottom ticker. */}
      <div className="about-marquee" aria-hidden="true">
        <div className="about-marquee-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span className="about-marquee-group" key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <span className="about-marquee-item" key={j}>
                  ABOUT <span className="about-marquee-dot">#</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* CONTENT — stats (reusing the exact same claims already used on the homepage, so nothing
          new/unverified is introduced) + 3 value pillars explaining the product philosophy. */}
      <section className="about-content">
        <div className="wrap">
          <div className="about-stats">
            {t.about.stats.map((s, i) => (
              <div className="stat-item" key={i}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="about-values">
            {t.about.values.map((v, i) => (
              <div className="about-value-card" key={i}>
                <div className="about-value-num">{v.num}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="about-cta">
            <h2>{t.about.ctaTitle}</h2>
            <Link href="/daftar" className="btn btn-primary">{t.about.ctaButton}</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <CookieConsentBanner />
    </div>
  );
}
