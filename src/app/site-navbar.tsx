"use client";

// Shared navbar for the marketing site — used on both the homepage (src/app/page.tsx) and any
// standalone marketing page (e.g. /about) so the menu structure only has to be maintained in one
// place. Section links point to "/#id" (not "#id") so they resolve correctly regardless of which
// route the navbar is currently rendered on: from a standalone page like /about, a bare "#fitur"
// would try to scroll to an element that doesn't exist on that page instead of taking the visitor
// back to the homepage section.
//
// Layout: FAQ now sits in the LEFT group alongside Solusi/Fitur/Harga (moved per explicit request)
// — the right group is lighter as a result (just About + the language switcher + Daftar/Login),
// which also lets the pill itself run narrower/tighter (see the max-width tuning in landing.css).
//
// Language switcher: must be rendered inside a <LanguageProvider> (see landing-i18n.tsx) — both
// page.tsx and about/page.tsx wrap their whole tree in one, so this component just consumes
// useLanguage() rather than managing its own copy of the language state.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LANGUAGES, useLanguage } from "./landing-i18n";

// Pulled out to a real top-level component (was previously defined INSIDE SiteNavbar's own render
// body) — that's a classic React footgun: a function declared inside another component's render
// gets a brand-new identity every single render, so React treats it as a completely different
// component type each time and unmounts + remounts it instead of just updating it. Concretely,
// clicking the toggle button called setLangOpen -> re-rendered SiteNavbar -> redefined
// LangDropdown as a new function -> React tore down the just-clicked button's whole subtree and
// mounted a fresh one, which is exactly the kind of thing that shows up as "the button doesn't do
// anything" / the option list not opening reliably. A stable top-level component only re-renders
// (never remounts) when its own state changes, which is what makes a toggle-dropdown actually
// work predictably.
function LangDropdown({ align }: { align: "left" | "right" }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-outside-to-close: without this, the menu only ever closed by picking a language, so
  // clicking anywhere else on the page left it hanging open on top of everything (z-index 60).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="nav-lang" style={{ position: "relative" }} ref={rootRef}>
      <button
        type="button"
        className="nav-lang-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Pilih bahasa"
        aria-expanded={open}
      >
        🌐 {currentLang.short}
      </button>
      {open && (
        <div className={`nav-lang-menu nav-lang-menu-${align}`}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`nav-lang-item${l.code === lang ? " is-active" : ""}`}
              onClick={() => { setLang(l.code); setOpen(false); }}
            >
              <span className="nav-lang-short">{l.short}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteNavbar() {
  const [navOpen, setNavOpen] = useState(false);
  const { t } = useLanguage();

  const sectionLinks = [
    { href: "/#solusi", label: t.nav.solusi },
    { href: "/#fitur", label: t.nav.fitur },
    { href: "/#harga", label: t.nav.harga },
    { href: "/#faq", label: t.nav.faq },
  ];

  return (
    <nav>
      <div className="wrap">
        {/* Desktop: floating pill, all links visible — Solusi/Fitur/Harga/FAQ on the left of the
            logo, About + language switcher + the Daftar/Login capsule on the right. */}
        <div className="nav-pill">
          <div className="nav-pill-links">
            {sectionLinks.map((l) => (<a key={l.href} href={l.href}>{l.label}</a>))}
          </div>
          <div className="logo">NEXBILL</div>
          <div className="nav-pill-links right">
            <Link href="/about">{t.nav.about}</Link>
            <LangDropdown align="right" />
            <div className="nav-cta">
              <Link href="/daftar" className="nav-cta-primary">{t.nav.daftar}</Link>
              <span className="nav-cta-divider" aria-hidden="true">/</span>
              <Link href="/login" className="nav-cta-secondary">{t.nav.login}</Link>
            </div>
          </div>
        </div>

        {/* Mobile/tablet: hamburger bar — language switcher sits to the right of the hamburger so
            the logo stays centered against the same 1fr/auto/1fr grid as before. */}
        <div className="nav-bar">
          <button className="nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            {navOpen ? "✕" : "☰"}
          </button>
          <div className="logo">NEXBILL</div>
          <div style={{ justifySelf: "end" }}>
            <LangDropdown align="right" />
          </div>
        </div>
      </div>
      {navOpen && (
        <div className="nav-dropdown">
          {sectionLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setNavOpen(false)}>{l.label}</a>
          ))}
          <Link href="/about" onClick={() => setNavOpen(false)}>{t.nav.about}</Link>
          <Link href="/login" onClick={() => setNavOpen(false)}>{t.nav.masuk}</Link>
          <Link href="/daftar" onClick={() => setNavOpen(false)}>{t.nav.daftarAkun}</Link>
        </div>
      )}
    </nav>
  );
}
