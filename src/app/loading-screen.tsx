"use client";

// Premium PS-themed boot/loading screen, shown on every load of the landing page, per explicit
// request ("animasi loading super premium yang berhubungan dengan teknologi playstation").
// Deliberately a small, SELF-CONTAINED component with its own tiny
// useEffect (a couple of setTimeouts, nothing scroll-linked) rather than being folded into the
// page's existing GSAP effect — that effect is already large and scroll-trigger-heavy (hero pin,
// growFrame, canvas spin-frames, SOLUSI pin, etc.), and this session's debugging history showed
// how fragile/hard-to-diagnose that effect gets when more moving parts are added to it. Pure CSS
// keyframes here instead, zero GSAP dependency, zero interaction with the rest of the page.
//
// Motif: the four classic PlayStation face-button glyphs (△ ○ ✕ □), each in their authentic
// original color (green/red/blue/pink from the very first PS1 controller — instantly recognizable
// PlayStation branding, not just "generic tech loading spinner"), pulsing on in a clockwise
// stagger like the controller "waking up", then the NEXBILL wordmark and a slim progress line.
//
// Plays on EVERY load/refresh, not session-scoped — per explicit request ("animasi loading setiap
// refresh"). Earlier versions gated this behind sessionStorage (once per tab session), which kept
// reading as "broken" during testing since a tab that had already seen it once would silently skip
// it on every subsequent refresh — indistinguishable from a bug without opening devtools to check
// storage directly. Removing the gate entirely sidesteps that whole class of confusion: no flag to
// go stale, no key to bump, it just always shows. Still skips entirely for prefers-reduced-motion
// (a11y) and unmounts (not just hides) once it's done its job, so it can never intercept clicks or
// show up in the accessibility tree once gone.
//
// State starts at "visible", not "idle": the previous version started idle (renders null) and only
// flipped to visible inside useEffect, which only runs AFTER mount/hydration. That left a real gap
// on every refresh — the raw, un-animated page painted first (server HTML + the first client
// render, both pre-effect), and the loader only appeared a tick later on top of it, which is
// exactly the "page tampil dulu baru muncul loading" behavior reported. Starting at "visible"
// means the loader is part of the very first render (including the server-rendered HTML this page
// ships), so it's what covers the screen from frame one — .nb-loader is position:fixed with a
// solid #050810 background (see landing.css), opaque enough to fully hide whatever's rendering
// underneath while GSAP/Lenis/ScrollTrigger and everything else in page.tsx's own effect spins up.
import { useEffect, useState } from "react";

const MIN_VISIBLE_MS = 3000; // "agak lama 3 detik" — long enough to read as a deliberate beat
const EXIT_MS = 650;

export function LoadingScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    // SSR-safe guard: matchMedia only exists client-side, and this effect only ever runs after
    // mount anyway, but the check stays explicit for clarity.
    if (typeof window === "undefined") return;

    // Reduced-motion users still get one unavoidable frame of the loader (it's already in the
    // initial render by the time this check runs) — the CSS media query on .nb-loader in
    // landing.css hides it outright for them regardless of this state, so that frame is never
    // actually painted. This just stops the timers from running a pointless animation in the
    // background.
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPhase("gone");
      return;
    }

    // Lock background scroll while the boot screen owns the viewport.
    //
    // IMPORTANT: the unlock below is called explicitly from the goneTimer callback, not only from
    // this effect's cleanup function. <LoadingScreen /> is rendered unconditionally by its parent
    // (see page.tsx) and, once phase reaches "gone", it just returns null — it never actually
    // unmounts. Relying solely on cleanup-on-unmount left `overflow: hidden` permanently stuck on
    // <html> in production (confirmed live: the page froze and stopped responding to scroll/swipe
    // on mobile after the loader finished, exactly the "tidak bisa di-swipe ke atas" bug report).
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const unlock = () => {
      document.documentElement.style.overflow = prevOverflow;
    };

    const leaveTimer = window.setTimeout(() => setPhase("leaving"), MIN_VISIBLE_MS);
    const goneTimer = window.setTimeout(() => {
      setPhase("gone");
      unlock();
    }, MIN_VISIBLE_MS + EXIT_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(goneTimer);
      unlock();
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={`nb-loader${phase === "leaving" ? " nb-loader-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Memuat NEXBILL"
    >
      <div className="nb-loader-glow" aria-hidden="true" />

      <div className="nb-loader-buttons" aria-hidden="true">
        <svg className="nb-loader-btn nb-loader-btn-triangle" viewBox="0 0 40 40" style={{ animationDelay: "0ms" }}>
          <path d="M20 8 L33 32 L7 32 Z" fill="none" stroke="#3ddc97" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <svg className="nb-loader-btn nb-loader-btn-circle" viewBox="0 0 40 40" style={{ animationDelay: "140ms" }}>
          <circle cx="20" cy="20" r="13" fill="none" stroke="#ff5d7a" strokeWidth="3" />
        </svg>
        <svg className="nb-loader-btn nb-loader-btn-cross" viewBox="0 0 40 40" style={{ animationDelay: "280ms" }}>
          <path d="M11 11 L29 29 M29 11 L11 29" fill="none" stroke="#4fa8ff" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <svg className="nb-loader-btn nb-loader-btn-square" viewBox="0 0 40 40" style={{ animationDelay: "420ms" }}>
          <rect x="9" y="9" width="22" height="22" fill="none" stroke="#f069c9" strokeWidth="3" />
        </svg>
      </div>

      <div className="nb-loader-wordmark">NEXBILL</div>
      <div className="nb-loader-tagline">Menyiapkan sistem billing rental PS Anda</div>

      <div className="nb-loader-bar-track">
        <div className="nb-loader-bar-fill" />
      </div>
    </div>
  );
}
