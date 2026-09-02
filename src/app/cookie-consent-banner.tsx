"use client";

// Cookie consent banner for the marketing site (homepage + /about). Standalone component (same
// reasoning as SiteFooter/SiteNavbar) so it can be mounted once inside <LanguageProvider> and
// reused anywhere else that needs it later without duplicating the consent logic.
//
// Consent is stored two ways on purpose: a real cookie (`nb_cookie_consent`, 180 days, so a
// server-side read could honor it later e.g. to skip loading analytics scripts) AND localStorage
// (so the banner can hide itself instantly on next paint without waiting on a cookie round-trip —
// reading document.cookie on mount is cheap but redundant once localStorage already has the
// answer). Both are written together in `remember()`; either one being present is enough to keep
// the banner hidden.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./landing-i18n";

const STORAGE_KEY = "nb_cookie_consent";
const COOKIE_NAME = "nb_cookie_consent";
const COOKIE_MAX_AGE_DAYS = 180;

function readStoredConsent(): "accepted" | "declined" | null {
  if (typeof window === "undefined") return null;
  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  if (fromStorage === "accepted" || fromStorage === "declined") return fromStorage;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const fromCookie = match ? decodeURIComponent(match[1]) : null;
  return fromCookie === "accepted" || fromCookie === "declined" ? fromCookie : null;
}

function remember(choice: "accepted" | "declined") {
  window.localStorage.setItem(STORAGE_KEY, choice);
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${choice}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function CookieConsentBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only decide after mount — reading localStorage/document.cookie during SSR would always be
    // empty and briefly flash the banner for returning visitors before hydration settles.
    setVisible(readStoredConsent() === null);
  }, []);

  if (!visible) return null;

  const choose = (choice: "accepted" | "declined") => {
    remember(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t.cookieBanner.policyLinkLabel}
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "16px",
        zIndex: 200,
        margin: "0 auto",
        maxWidth: "820px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(8,11,22,0.92)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 12px 40px -12px rgba(0,0,0,0.6)",
      }}
    >
      <p style={{ flex: "1 1 320px", margin: 0, fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-dim, #a3a3a3)" }}>
        {t.cookieBanner.message}{" "}
        <Link href="/kebijakan-cookie" style={{ color: "#22d3ee", textDecoration: "underline" }}>
          {t.cookieBanner.policyLinkLabel}
        </Link>
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => choose("declined")}
          style={{
            padding: "9px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 500,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#e5e5e5",
            cursor: "pointer",
          }}
        >
          {t.cookieBanner.decline}
        </button>
        <button
          type="button"
          onClick={() => choose("accepted")}
          style={{
            padding: "9px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            background: "#22d3ee",
            border: "1px solid #22d3ee",
            color: "#05070f",
            cursor: "pointer",
          }}
        >
          {t.cookieBanner.accept}
        </button>
      </div>
    </div>
  );
}
