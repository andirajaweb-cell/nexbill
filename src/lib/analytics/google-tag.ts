/**
 * Google tag (Google Tag Manager container) — dipasang 2026-11-21 di root layout (src/app/layout.tsx)
 * sehingga aktif di nexbill.id dan dashboard.nexbill.id.
 *
 * Consent Mode v2: penyimpanan cookie iklan & analitik bawaannya DITOLAK; baru diizinkan setelah
 * pengunjung menekan "Terima" di banner cookie (src/app/cookie-consent-banner.tsx, cookie
 * `nb_cookie_consent`). Sebelum itu Google hanya menerima ping tanpa cookie. Sejalan dengan
 * Kebijakan Cookie (cookie analitik hanya bila diaktifkan) dan UU PDP.
 *
 * Ganti container lewat env NEXT_PUBLIC_GTM_ID (kosongkan → "off" untuk mematikan).
 */
export const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-T3XFH6FH").trim();
export const GOOGLE_TAG_ENABLED = /^GTM-[A-Z0-9]+$/.test(GTM_ID);

const CONSENT_COOKIE = "nb_cookie_consent";

/** Skrip inline sebelum gtm.js: dataLayer, gtag(), consent default (ikut pilihan yang tersimpan), gtag('js'). */
export function googleTagBootstrapScript(): string {
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag=gtag;",
    `var nbOk=/(?:^|; )${CONSENT_COOKIE}=accepted(?:;|$)/.test(document.cookie);`,
    "var nbC=nbOk?'granted':'denied';",
    "gtag('consent','default',{ad_storage:nbC,analytics_storage:nbC,ad_user_data:nbC,ad_personalization:nbC,wait_for_update:500});",
    "gtag('js',new Date());",
  ].join("");
}

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** Dipanggil banner cookie saat pengunjung memilih Terima/Tolak. */
export function updateGoogleConsent(choice: "accepted" | "declined") {
  if (typeof window === "undefined") return;
  const v = choice === "accepted" ? "granted" : "denied";
  (window as GtagWindow).gtag?.("consent", "update", { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
}
