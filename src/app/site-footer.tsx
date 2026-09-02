"use client";

// Shared footer for the marketing site — see site-navbar.tsx for why this is a standalone
// component (keeps the link set/order in sync across the homepage and standalone pages like
// /about without duplicating markup). Now a client component (was a plain server component
// before the language switcher) since it needs useLanguage() to translate its labels.
import Link from "next/link";
import { useLanguage } from "./landing-i18n";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer style={{ backgroundColor: "transparent", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="wrap">
        <div>
          <div className="logo" style={{ marginBottom: "16px" }}>
            NEXBILL
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "13.5px", maxWidth: "350px", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "8px" }}><strong>{t.footer.alamatLabel}</strong><br /> Komp. Bumi Adipura Jl. Tulip V No. 40 RT.02/RW 04 Kel. Rancabolang Kec. Gedebage Kota Bandung, Jawa Barat, Indonesia 40295</p>
            <p style={{ marginBottom: "4px" }}><strong>{t.footer.teleponLabel}</strong> +62 8557 3333 20</p>
            <p><strong>{t.footer.emailLabel}</strong> sales@nexbill.id</p>
          </div>
        </div>
        <div className="foot-links">
          <Link href="/#solusi">{t.nav.solusi}</Link>
          <Link href="/#fitur">{t.nav.fitur}</Link>
          <Link href="/#harga">{t.nav.harga}</Link>
          <Link href="/#faq">{t.nav.faq}</Link>
          <Link href="/about">{t.nav.about}</Link>
          <Link href="/login">{t.nav.login}</Link>
          <Link href="/daftar">{t.nav.daftar}</Link>
          <Link href="/kebijakan-cookie">{t.cookieBanner.policyLinkLabel}</Link>
          <Link href="/kebijakan-refund">{t.footer.refundLabel}</Link>
          <Link href="/syarat-ketentuan">{t.footer.termsLabel}</Link>
        </div>
        <div className="copyright" style={{ width: "100%", textAlign: "center", marginTop: "32px" }}>
          {t.footer.copyright}
        </div>
        {/* This anchor previously had no styling of its own, so it inherited the surrounding
            div's dim gray color via the site-wide ".nb-landing a { color: inherit; text-decoration:
            none; }" reset (see landing.css) — meaning it rendered pixel-identical to the plain
            "Dikembangkan oleh" text next to it, with zero visual affordance that it was even a
            link. Explicit color + underline here overrides that reset so it actually reads as a
            clickable backlink, matching the cyan accent used for links elsewhere on the site
            (e.g. the cookie-consent banner's policy link). */}
        <div style={{ width: "100%", textAlign: "center", marginTop: "8px", fontSize: "12px", color: "var(--text-dim, #888)" }}>
          Dikembangkan oleh{" "}
          <a
            href="https://www.digitrajasa.web.id"
            target="_blank"
            rel="noopener"
            style={{ color: "#22d3ee", textDecoration: "underline", textUnderlineOffset: "2px" }}
          >
            Digitrajasa
          </a>
        </div>
      </div>
    </footer>
  );
}
