"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Space_Grotesk, Inter, Bebas_Neue } from "next/font/google";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./landing.css";
import { SiteNavbar } from "./site-navbar";
import { SiteFooter } from "./site-footer";
import { CookieConsentBanner } from "./cookie-consent-banner";
import { LoadingScreen } from "./loading-screen";
import { LanguageProvider, useLanguage } from "./landing-i18n";

// NOTE: a <Script src=".../model-viewer.min.js"> tag used to live in the JSX below, loaded
// unconditionally on every page view even though no <model-viewer> element is ever rendered
// anywhere in this app (confirmed via grep across src/). That library does its own internal
// WebGL/Three.js capability probing as soon as it loads — in a sandboxed/GPU-disabled browser
// (no ANGLE backend, GPU process disabled) that probe itself was throwing
// "THREE.WebGLRenderer: Error creating WebGL context" followed by a crash reading `.xr` on the
// half-initialized renderer. Removed the script (and its now-unused JSX.IntrinsicElements
// "model-viewer" type declaration) since it wasn't serving any actual content on this page —
// this eliminates the WebGL probe entirely rather than trying to make it fail more gracefully.
// (The RunrobrunGooBackground component + its `three` import that used to live below were
// unrelated dead code — never mounted anywhere, see the removal note further down — and were
// deleted outright as part of the "opening lambat" performance pass: `three` alone is a very
// heavy dependency to ship on every page load of a component that never renders.)

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nb-font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--nb-font-body" });
// Condensed poster/display face for the hero headline only — reads more cinematic with a tall
// condensed face than Space Grotesk alone. Kept from an earlier gold-theme experiment (since
// reverted back to NEXBILL's original blue+black palette) since it's independent of color.
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--nb-font-poster" });

// "Blue-black background" spin frame sequence for the hero — 85 JPGs extracted from
// buatkan_latar_belakang_blue_bl.mp4 (source was 1280x720, 24fps/10s), upscaled to 4K
// (3840x2160, lanczos) with the Gemini "nano banana" watermark removed via ffmpeg's delogo
// filter (public/spin-frames/bg-blue-hd/, ~14MB total). Drawn onto a canvas and advanced by
// scroll position instead of relying on <video> currentTime seeking, which is choppier on
// compressed h264 with sparse keyframes. Filenames are 1-indexed (frame-001.jpg .. frame-085.jpg)
// — the sequence ends and releases into .intro-section exactly at frame 85. (Previous PS-stick
// sequence is still on disk at public/spin-frames/ps-stick-hd/, just no longer referenced.)
// Frames 043-085 briefly went missing from disk (only 001-042 made it through an earlier upload),
// causing 43 straight 404s on every page load — re-uploaded and verified all 85 are present at the
// correct 3840x2160 resolution before restoring this constant to its original value.
const SPIN_FRAME_COUNT = 85;
const SPIN_FRAME_W = 3840;
const SPIN_FRAME_H = 2160;
const spinFrameSrc = (i: number) => `/spin-frames/bg-blue-hd/frame-${String(i + 1).padStart(3, "0")}.jpg`;

// Total scroll distance (px) that drives the hero's scrubbed animations (spin-frame progression,
// grow-video, content fades) — MUST match .hero's CSS height in landing.css exactly. Every
// hero-scoped ScrollTrigger below uses `end: "+=${HERO_SCROLL_PX}"` rather than the more common
// "bottom bottom" on purpose: "bottom bottom" resolves to `hero_top + hero_height - viewport_height`
// (comparing the trigger's bottom edge against the *viewport's* bottom edge), which only produces
// the intended "hero_top + HERO_SCROLL_PX" result when hero_height is exactly
// `100vh + HERO_SCROLL_PX` — a viewport-height-dependent formula. That was fine back when
// .hero-mono-sticky was position:sticky (which genuinely needed that extra 100vh to physically
// scroll away), but now that it's position:fixed and toggled via display:none (see the
// ScrollTrigger below), .hero's own CSS height only needs to be HERO_SCROLL_PX itself — no "100vh
// +" required. Leaving "bottom bottom" in that scenario left hero_height at 100vh+500px well
// after the sticky trick was removed, silently reintroducing a full extra 100vh of dead scroll
// before .intro-section could ever come into view (the "4 scroll kosong" bug reported after the
// fixed-position change). An explicit "+=" pixel offset has no viewport-height dependency at all.
const HERO_SCROLL_PX = 500;

// PAIN_POINTS / FEATURES / FAQS content moved into landing-i18n.tsx (LANDING_COPY[lang].solusi/
// fitur/faq) so it can be translated — see useLanguage() usage inside LandingPageInner below.
// PAIN_ICONS and FEATURE_ICONS (landing-i18n.tsx's old emoji-per-item sets for SOLUSI/FITUR) are
// both unused here now — every card in both sections shows a zero-padded index / HUD reticle
// instead of an emoji, per explicit request for a more elegant/high-tech look. The constants
// still exist in landing-i18n.tsx in case a future design wants them back.

// Per-problem real footage for the SOLUSI cards, keyed by point index (0 = "KAS BOCOR", 1 = "UNIT
// KACAU", ...), uploaded one at a time as real clips become available. Any index not listed here
// (i.e. every card that doesn't have real footage yet) falls back to the shared placeholder clip —
// see solusiPanelVideoSrc() below.
const SOLUSI_PANEL_VIDEOS: Record<number, string> = {
  0: "/videos/solusi-kas-bocor.mp4",
  1: "/videos/solusi-unit-kacau.mp4",
  2: "/videos/solusi-tv-manual.mp4",
  // -v2: the original solusi-tarif-salah.mp4 couldn't be overwritten in place (write permission
  // denied on that existing file), so the replacement clip was saved under a new filename instead.
  3: "/videos/solusi-tarif-salah-v2.mp4",
  4: "/videos/solusi-unit-nganggur.mp4",
  5: "/videos/solusi-barang-rusak.mp4",
  6: "/videos/solusi-deposit-bocor.mp4",
  7: "/videos/solusi-profit-samar.mp4",
};
const solusiPanelVideoSrc = (i: number) => SOLUSI_PANEL_VIDEOS[i] ?? "/videos/solusi-preview.mp4";

// PRICING section (#harga) — data shape returned by GET /api/public/pricing (see that route for
// the full rationale). One entry per supported language, each already converted server-side into
// that language's market-risk currency (or falling back to the plan's original IDR pricing when
// no usable rate exists yet for that currency — an explicit product decision, not a bug).
interface PublicPlanPricing {
  currency: string;
  fallback: boolean;
  priceOriginal: number;
  priceCurrent: number;
  extraConsolePrice: number;
  smartPlugPrice: number;
  setupServicePrice: number;
}
interface PublicPlan {
  code: string;
  name: string;
  includedConsoles: number;
  unlimitedEntitlement: boolean;
  byLang: Partial<Record<string, PublicPlanPricing>>;
}
// Intl.NumberFormat locale per currency — chosen for correct grouping/decimal conventions and
// symbol placement for THAT currency specifically (Rp249.000 with a period separator, $16.13 with
// a comma, etc.), independent of which UI language is currently selected. "fil-PH" ICU support is
// inconsistent across browsers/Node versions, so PHP uses "en-PH" instead — same currency symbol
// and grouping, more reliably supported.
const PRICE_CURRENCY_LOCALE: Record<string, string> = { IDR: "id-ID", USD: "en-US", MYR: "ms-MY", THB: "th-TH", VND: "vi-VN", PHP: "en-PH" };
// IDR and VND are conventionally shown with zero decimal places (whole-unit pricing); every other
// supported currency here uses two.
const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "VND"]);
const formatPlanPrice = (currency: string, value: number): string => {
  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
  try {
    return new Intl.NumberFormat(PRICE_CURRENCY_LOCALE[currency] ?? "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: zeroDecimal ? 0 : 2,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(value);
  } catch {
    // Currency code Intl doesn't recognize (shouldn't happen — these all come from
    // LANG_TO_CURRENCY_CODE/IDR — but fail safe rather than crashing the pricing section).
    return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
  }
};

// --- KOMPONEN UTAMA PAGE ---
// Default export wraps the actual page in <LanguageProvider> (landing-i18n.tsx) so the navbar's
// language switcher, and every t.xxx lookup inside LandingPageInner, share one language state.
export default function LandingPage() {
  return (
    <LanguageProvider>
      <LoadingScreen />
      <LandingPageInner />
    </LanguageProvider>
  );
}

function LandingPageInner() {
  const { t, lang } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingPlan, setPricingPlan] = useState<PublicPlan | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroGrowVideoFrameRef = useRef<HTMLDivElement>(null);
  const showcaseTrackRef = useRef<HTMLDivElement>(null);
  const solusiPinRef = useRef<HTMLDivElement>(null);
  const solusiWordRefs = useRef<(HTMLDivElement | null)[]>([]);
  const solusiPanelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sets scroll-behavior:smooth on <html> so the section anchor links (#solusi, #fitur, etc.)
  // scroll smoothly via native browser behavior. Next.js's App Router detects this and logs a
  // console warning ("Detected scroll-behavior: smooth ... add data-scroll-behavior=smooth")
  // because it disables smooth scrolling during its own client-side route transitions unless the
  // <html> element opts in — fixed by adding data-scroll-behavior="smooth" to <html> in
  // layout.tsx, not here (this effect only needs to keep setting/restoring the actual CSS value).
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = prev; };
  }, []);

  // Live pricing for the #harga section — replaces the hardcoded "Rp249.000"/"Rp399.000" literals
  // that used to live directly in the JSX below with whatever platform-admin actually has
  // configured, converted into the visitor's selected language's currency. Fetched ONCE on mount
  // (the response already contains every supported language's numbers, pre-converted server-side
  // — see /api/public/pricing) rather than re-fetching on every language switch; the JSX below
  // just re-picks pricingPlan.byLang[lang] whenever `lang` changes, no network round-trip needed.
  // On any failure (network error, no active plan configured yet, etc.) pricingPlan simply stays
  // null and the JSX falls back to the same static Rp values that were there before this existed —
  // the pricing section can never end up blank or broken, only "not yet live-converted".
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { plans?: PublicPlan[] } | null) => {
        if (cancelled) return;
        const plan = data?.plans?.[0];
        if (plan) setPricingPlan(plan);
      })
      .catch(() => {
        // Swallow — see comment above, static fallback values already cover this.
      });
    return () => { cancelled = true; };
  }, []);

  const pricingEntry: PublicPlanPricing | null = pricingPlan?.byLang?.[lang] ?? null;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Every scroll-driven reveal below is skipped for reduced-motion users — but .intro-copy/
      // .intro-media now start hidden by CSS default (see landing.css), not just via this effect's
      // own gsap.set(...). Without explicitly showing them here, a reduced-motion visitor would
      // never see that content at all: nothing else in this early-return path would ever flip it
      // back on. Jump straight to the "scrolled past hero" end state instead of animating there.
      gsap.set(".hero-mono-sticky", { display: "none" });
      gsap.set([".intro-copy", ".intro-media"], { autoAlpha: 1, y: 0 });
      gsap.set("nav", { autoAlpha: 1 });
      return;
    }

    let lenis: Lenis | undefined;
    let rafCallback: ((time: number) => void) | undefined;
    const effectCleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      rafCallback = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);

      // Minimal hero entrance: wordmark, video frame, corner copy and the grow-video card fading
      // in on first paint.
      gsap.timeline({ delay: 0.1, defaults: { ease: "power3.out" } })
        .fromTo(".hero-wordmark", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9 })
        .fromTo(".hero-scroll-video-frame", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.5")
        .fromTo(".hero-corner-copy", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.4")
        .fromTo(".hero-grow-video-frame", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.4");

      // Nav starts hidden (it would otherwise sit, sticky, right over the minimal hero) and fades
      // in almost immediately — ~33px of scroll, roughly "frame 5" of the spin sequence — rather
      // than waiting for the whole hero to pass, matching brikken.co's own hero where the nav
      // appears within the first few pixels of scroll. Reverses on scroll back above that point.
      gsap.set("nav", { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "+=33",
        onLeave: () => gsap.to("nav", { autoAlpha: 1, duration: 0.4 }),
        onEnterBack: () => gsap.to("nav", { autoAlpha: 0, duration: 0.3 }),
      });

      // Hero "spin frame" sequence (the PS-stick spin): 85 preloaded JPGs drawn onto a canvas,
      // advancing across the hero's whole pinned scroll range (100vh + ~500px, see landing.css)
      // — the same 360°-product-shot technique agency sites use, and steadier than seeking a
      // compressed <video>. It's hidden behind the grow-video once that covers the screen (see
      // below), so it's only actually visible during the first chunk of the scroll. Scroll down
      // slowly to see it — a static screenshot always looks like a still frame.
      const canvas = heroCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const images: HTMLImageElement[] = [];
        let currentFrame = 0;

        const drawFrame = (index: number) => {
          const img = images[index];
          if (!ctx || !img || !img.complete || img.naturalWidth === 0) return;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const displayW = canvas.clientWidth;
          const displayH = canvas.clientHeight;
          if (!displayW || !displayH) return;
          if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
            canvas.width = displayW * dpr;
            canvas.height = displayH * dpr;
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const scale = Math.max(displayW / SPIN_FRAME_W, displayH / SPIN_FRAME_H);
          const drawW = SPIN_FRAME_W * scale;
          const drawH = SPIN_FRAME_H * scale;
          ctx.clearRect(0, 0, displayW, displayH);
          ctx.drawImage(img, (displayW - drawW) / 2, (displayH - drawH) / 2, drawW, drawH);
        };

        let loadedCount = 0;
        const onFrameLoaded = () => {
          loadedCount += 1;
          if (loadedCount === SPIN_FRAME_COUNT) ScrollTrigger.refresh();
        };

        // Perf fix ("opening lambat" report): this used to fire all 85 full-4K JPGs (~14MB total)
        // as simultaneous requests the instant the page mounted, saturating bandwidth against
        // fonts/hero video/first paint on every load. Frame 0 is the only one visible before any
        // scrolling happens, so it still loads eagerly at normal priority; frames 1-84 are only
        // needed once the user actually scrolls into the hero's pinned range, so they're deferred
        // to the browser's idle time and marked low-priority — same end state (all 85 cached,
        // ScrollTrigger.refresh() once the last one lands), just no longer competing with what the
        // very first paint actually needs.
        let cancelled = false;
        effectCleanups.push(() => { cancelled = true; });

        const frame0 = new Image();
        frame0.src = spinFrameSrc(0);
        frame0.onload = () => { drawFrame(0); onFrameLoaded(); };
        frame0.onerror = onFrameLoaded;
        images[0] = frame0;

        const loadRest = () => {
          if (cancelled) return;
          for (let i = 1; i < SPIN_FRAME_COUNT; i++) {
            const img = new Image();
            if ("fetchPriority" in img) (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = "low";
            img.src = spinFrameSrc(i);
            img.onload = onFrameLoaded;
            img.onerror = onFrameLoaded;
            images[i] = img;
          }
        };
        const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
        const cic = window.cancelIdleCallback ?? window.clearTimeout;
        const idleHandle = ric(loadRest);
        effectCleanups.push(() => cic(idleHandle as never));

        ScrollTrigger.create({
          trigger: ".hero",
          start: "top top",
          end: `+=${HERO_SCROLL_PX}`,
          scrub: true,
          onUpdate: (self) => {
            currentFrame = Math.min(SPIN_FRAME_COUNT - 1, Math.round(self.progress * (SPIN_FRAME_COUNT - 1)));
            drawFrame(currentFrame);
          },
        });

        const handleCanvasResize = () => drawFrame(currentFrame);
        window.addEventListener("resize", handleCanvasResize);
        effectCleanups.push(() => window.removeEventListener("resize", handleCanvasResize));
      }

      // .hero-mono-sticky is position:fixed (see landing.css) rather than position:sticky. A
      // sticky element always costs its OWN full height (100vh here) worth of extra scroll to
      // physically leave view once it unpins — that's inherent to how sticky works, no amount of
      // tuning the parent's height avoids it. That 100vh of scrolling past a frozen last-frame
      // background before .intro-section ever appeared was exactly the "section 2 terlalu jauh"
      // gap being reported. Fixed positioning has no such cost: the element doesn't occupy
      // document flow at all, so hiding it the instant .hero's scroll range ends means
      // .intro-section — which sits immediately after .hero in the DOM — is right there to
      // reveal with no extra scroll required. display:none (not just opacity) is used so it's
      // unambiguously out of the way, not just invisible. Restored on scroll back up so re-
      // entering the hero range still shows the sequence. (display:"flex" here matches
      // .hero-mono-sticky's own authored `display: flex` in landing.css — restoring plain
      // "block" would silently break its centering.)
      ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: `+=${HERO_SCROLL_PX}`,
        onLeave: () => gsap.set(".hero-mono-sticky", { display: "none" }),
        onEnterBack: () => gsap.set(".hero-mono-sticky", { display: "flex" }),
      });

      // "Rental PS" demo video: starts as a small card bottom-right of the hero, then — like
      // brikken.co's own hero media panel — the wordmark/corner copy fade away first, and the
      // card grows to true 100vw × 100vh (border, radius and shadow animating out to zero right
      // along with it, not just left at their small-card values) exactly by the time the hero's
      // scroll range ends, handing off cleanly into .intro-section.
      //
      // The "small" starting box is read from getComputedStyle (the authored 340×191/40/40 —
      // or 130×73/20/20 under the mobile media query), NOT getBoundingClientRect(). A rect is
      // measured relative to the current scroll position, and this element sits inside a
      // position:sticky container — if this effect happened to run while the page was already
      // scrolled (e.g. a dev-server hot reload preserving scroll position), the rect would
      // capture the WRONG box as "small" and every frame of the scrub would come out wrong for
      // the rest of the session (the exact "stuck partway, never reaches full-screen" bug seen
      // during testing). Computed style values are scroll-position-independent.
      const growFrame = heroGrowVideoFrameRef.current;
      if (growFrame) {
        const cs = window.getComputedStyle(growFrame);
        const small = {
          w: parseFloat(cs.width) || 340,
          h: parseFloat(cs.height) || 191,
          right: parseFloat(cs.right) || 40,
          bottom: parseFloat(cs.bottom) || 40,
          radius: parseFloat(cs.borderTopLeftRadius) || 16,
          borderWidth: parseFloat(cs.borderTopWidth) || 1,
        };
        ScrollTrigger.create({
          trigger: ".hero",
          start: "top top",
          end: `+=${HERO_SCROLL_PX}`,
          scrub: true,
          // Belt-and-suspenders on top of the autoAlpha fade below: growFrame is position:fixed,
          // so it sits in the viewport independent of document scroll — its opacity fade should
          // be enough on its own, but since it's fixed, any edge case that leaves it at even a
          // hair of opacity (or just blocks clicks despite being invisible) reads as hero content
          // "covering" section 2, which is worse than a plain fade glitch elsewhere on the page.
          // display:none is unambiguous: once you've scrolled past the hero entirely, the element
          // is out of the render tree, not just faded — no ambiguity possible. Restored on scroll
          // back up so the fade-in animation still has something to animate.
          onLeave: () => {
            gsap.set(growFrame, { display: "none" });
            // Single source of truth for revealing section 2's headline/CTA/badges (see the
            // gsap.set(...autoAlpha:0...) above where they start hidden) — this onLeave fires
            // exactly once, exactly when the hero's scroll range is fully exited, same trigger
            // that hides growFrame itself. A short animated fade (not an instant gsap.set) still
            // gives a soft handoff feel without a second, independently-scrubbed tween that could
            // race with this one.
            gsap.to([".intro-copy", ".intro-media"], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" });
          },
          onEnterBack: () => {
            gsap.set(growFrame, { display: "block" });
            // Symmetric counterpart to onLeave above — without this, scrolling back UP past the
            // hero's exit point restores the fixed hero content (wordmark/canvas/corner-copy) but
            // left section 2's headline/CTA/badges still visible underneath it (they were only
            // ever wired to show, never to hide again), so both stacked and overlapped. Hide them
            // again the instant we re-enter the hero's range, mirroring growFrame's own
            // show/hide symmetry exactly.
            //
            // Duration cut 0.35s -> 0.15s (and a snappier ease) after "onEnterBack masih belum
            // smooth, sedikit masih terlihat" — the hero content reappearing (growFrame/wordmark/
            // corner-copy) is scroll-LINKED: their own autoAlpha comes from onUpdate below, which
            // reacts to scroll position on essentially the same frame, no ramp-up. .intro-copy/
            // .intro-media hiding was, by contrast, a fixed-duration tween running on its own
            // independent clock regardless of scroll speed — on a fast scroll-up, the hero content
            // was already fully back before this fade even finished, leaving a visible window
            // where both were partly on screen at once. Shortening this closes that gap without
            // losing the soft-handoff feel entirely (the forward direction's onLeave reveal above
            // stays at 0.5s — that one doesn't have this scroll-speed mismatch, since nothing is
            // racing it back into view underneath).
            gsap.to([".intro-copy", ".intro-media"], { autoAlpha: 0, y: 40, duration: 0.15, ease: "power3.in" });
          },
          onUpdate: (self) => {
            const p = self.progress;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            // Growth finishes at 80% of the hero's scroll range, then HOLDS full-screen (gp
            // stays at 1) for a short dwell, instead of hitting full size right as the pin
            // releases and immediately scrolling away half-seen.
            const gp = Math.min(1, p / 0.8);
            // Frame is position:fixed (see landing.css), so it no longer physically scrolls
            // away with the hero when the sticky container unpins — instead it snaps out via a
            // quick opacity fade in the last 10% of the range, overlapping with .intro-copy's own
            // fade-in (which now starts at 85%, see below) so the two crossfade instead of
            // running back-to-back. Sequential (video fully gone, THEN text starts) left a blank
            // instant if you paused exactly at the handoff — nothing but the persistent 3D
            // background blob, which read as a stuck/broken gap. Overlapping them means there's
            // never a frame with neither visible.
            const fadeStart = 0.9;
            const exitAlpha = p <= fadeStart ? 1 : Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart));
            gsap.set(growFrame, {
              width: gp >= 1 ? vw : small.w + (vw - small.w) * gp,
              height: gp >= 1 ? vh : small.h + (vh - small.h) * gp,
              right: small.right * (1 - gp),
              bottom: small.bottom * (1 - gp),
              borderRadius: small.radius * (1 - gp),
              borderWidth: small.borderWidth * (1 - gp),
              boxShadow: `0 ${20 * (1 - gp)}px ${50 * (1 - gp)}px -15px rgba(0,0,0,${(0.7 * (1 - gp)).toFixed(2)})`,
              autoAlpha: exitAlpha,
            });
            // The background spin-frame canvas fades out on the same curve as growFrame itself.
            // Without this, the canvas would flash briefly visible right at the very end — as
            // growFrame's own opacity approaches 0 it becomes see-through, revealing the (still
            // fully opaque) canvas behind it for an instant, right before .hero-mono-sticky gets
            // display:none'd entirely — a visible "pop" at the exact handoff point.
            gsap.set(".hero-scroll-video-frame", { autoAlpha: exitAlpha });
            // Wordmark and corner copy disappear early (fully faded by 40% of the way through,
            // well before the video finishes growing) so the card reads as taking over the hero.
            const contentOpacity = Math.max(0, 1 - p / 0.4);
            gsap.set([".hero-wordmark", ".hero-corner-copy"], { autoAlpha: contentOpacity });
          },
        });
      }

      // Showcase marquee: a continuous auto-scroll (right-to-left, the actual "marquee" behavior)
      // that idles the track on its own, plus mouse-drag for manual nudging. Deliberately does
      // NOT hook the page's vertical scroll/wheel input at all anymore — an earlier version
      // translated wheel deltas into horizontal movement so a mouse wheel could scroll it
      // sideways, but that meant hovering the section while trying to scroll the page up/down
      // did nothing (the wheel event was being hijacked), which is worse than just leaving wheel
      // scroll alone. The card set is rendered twice in the JSX (see the `[0, 1].map` wrapper
      // around showcaseCards below) so wrapping scrollLeft back to 0 the instant it passes one
      // full copy's width is invisible — the second copy is already sitting right there,
      // identical to the first.
      const showcaseTrack = showcaseTrackRef.current;
      if (showcaseTrack) {
        let isDown = false;
        let startX = 0;
        let scrollStart = 0;
        let autoScrollPaused = false;
        const markInteracted = () => showcaseTrack.classList.add("interacted");
        const pauseAutoScroll = () => { autoScrollPaused = true; };
        const resumeAutoScroll = () => { autoScrollPaused = false; };
        const onPointerDown = (e: PointerEvent) => {
          if (e.pointerType === "touch") return; // touch already gets native overflow-x scrolling
          isDown = true;
          startX = e.clientX;
          scrollStart = showcaseTrack.scrollLeft;
          showcaseTrack.classList.add("dragging");
          showcaseTrack.setPointerCapture(e.pointerId);
          markInteracted();
          pauseAutoScroll();
        };
        const onPointerMove = (e: PointerEvent) => {
          if (!isDown) return;
          showcaseTrack.scrollLeft = scrollStart - (e.clientX - startX);
        };
        const endDrag = () => {
          isDown = false;
          showcaseTrack.classList.remove("dragging");
          resumeAutoScroll();
        };
        showcaseTrack.addEventListener("pointerdown", onPointerDown);
        showcaseTrack.addEventListener("pointermove", onPointerMove);
        showcaseTrack.addEventListener("pointerup", endDrag);
        showcaseTrack.addEventListener("pointerleave", endDrag);
        showcaseTrack.addEventListener("mouseenter", pauseAutoScroll);
        showcaseTrack.addEventListener("mouseleave", resumeAutoScroll);

        // Bug fix: touch is deliberately skipped in onPointerDown above (it gets native
        // overflow-x scrolling instead of the JS drag), but that left a gap — nothing was
        // pausing the auto-scroll ticker while a touch drag was happening, so on mobile the
        // ticker kept overwriting scrollLeft every frame right on top of the user's own swipe,
        // fighting it and making the track feel jumpy/uncontrollable. Desktop never had this
        // problem because hovering the track (required to use a mouse/trackpad on it at all)
        // already pauses via mouseenter. Touch has no hover equivalent, so it needs its own
        // pause/resume pair tied to the touch gesture itself.
        const onTouchStart = () => { markInteracted(); pauseAutoScroll(); };
        const onTouchEnd = () => { resumeAutoScroll(); };
        showcaseTrack.addEventListener("touchstart", onTouchStart, { passive: true });
        showcaseTrack.addEventListener("touchend", onTouchEnd);
        showcaseTrack.addEventListener("touchcancel", onTouchEnd);

        // Direction reversed per explicit request ("looping ... dari arah kiri ke kanan"):
        // DECREMENTING scrollLeft each frame makes the viewport slide left along the (doubled)
        // card strip, which reads as the cards themselves traveling left-to-right across the
        // screen — the opposite of the original increment-based right-to-left ticker. Speed
        // bumped way up too (0.6 -> 3.2px/frame) for the requested "tempo cepat".
        // Starting scrollLeft at halfWidth (instead of leaving it at the initial 0) matters here:
        // decrementing from 0 would immediately go negative on the very first frame and wrap all
        // the way to the far end of the track, which reads as a visible pop/jump right as the
        // section loads. Starting mid-strip means the first wrap doesn't happen until the strip
        // has already been scrolling for a while, so it's never seen.
        const AUTO_SCROLL_PX_PER_FRAME = 3.2;
        const initialHalfWidth = showcaseTrack.scrollWidth / 2;
        if (initialHalfWidth > 0) showcaseTrack.scrollLeft = initialHalfWidth;
        const autoScrollTick = () => {
          if (autoScrollPaused || isDown) return;
          const halfWidth = showcaseTrack.scrollWidth / 2;
          if (halfWidth <= 0) return;
          let next = showcaseTrack.scrollLeft - AUTO_SCROLL_PX_PER_FRAME;
          if (next < 0) next += halfWidth;
          showcaseTrack.scrollLeft = next;
        };
        gsap.ticker.add(autoScrollTick);

        effectCleanups.push(() => {
          gsap.ticker.remove(autoScrollTick);
          showcaseTrack.removeEventListener("pointerdown", onPointerDown);
          showcaseTrack.removeEventListener("pointermove", onPointerMove);
          showcaseTrack.removeEventListener("pointerup", endDrag);
          showcaseTrack.removeEventListener("pointerleave", endDrag);
          showcaseTrack.removeEventListener("mouseenter", pauseAutoScroll);
          showcaseTrack.removeEventListener("mouseleave", resumeAutoScroll);
          showcaseTrack.removeEventListener("touchstart", onTouchStart);
          showcaseTrack.removeEventListener("touchend", onTouchEnd);
          showcaseTrack.removeEventListener("touchcancel", onTouchEnd);
        });
      }

      // SOLUSI pinned scrollytelling (brikken.co-style). Unlike the hero's own hand-rolled
      // position:fixed + onLeave/onEnterBack trick (needed there because a canvas AND a growing
      // video both had to be choreographed together), this is a single self-contained block, so
      // GSAP's own `pin: true` is the right tool — it inserts and sizes the pin-spacer
      // automatically, which is exactly the kind of bookkeeping that's easy to get subtly wrong
      // by hand (see the whole HERO_SCROLL_PX saga above for what that looks like when it's
      // wrong). stageCount equal-width progress buckets (0-33/33-66/66-100%) decide which word is
      // bright and which panel is visible; only re-triggers the crossfade when the bucket actually
      // changes, not on every scroll-tick, so it doesn't restart its own fade mid-animation.
      const solusiPin = solusiPinRef.current;
      // Read the 8 word elements straight from the DOM (sorted by their own data-idx attribute)
      // instead of trusting solusiWordRefs.current's array order — the left group (idx 0-3) and
      // right group (idx 4-7) are two separate .map() calls under two separate parent divs, so a
      // callback-ref race between them (or a stale/duplicate slot from a language-switch remount)
      // could silently desync the array without the length-based guard below ever catching it.
      // That desync is the most likely explanation for "left words track scroll fine, right words
      // don't" — querying by data-idx makes the ordering correct by construction rather than by
      // assignment-timing luck.
      const solusiWords = solusiPin
        ? Array.from(solusiPin.querySelectorAll<HTMLDivElement>(".solusi-word")).sort(
            (a, b) => Number(a.dataset.idx) - Number(b.dataset.idx)
          )
        : [];
      const solusiPanels = solusiPanelRefs.current.filter((el): el is HTMLDivElement => el !== null);
      // Bumped 3 -> 8 when 5 more pain points were added (rate errors, idle units, lost gear,
      // deposit leaks, hidden profit) — invariant across every language in landing-i18n.tsx's
      // t.solusi.points, since the guard below (solusiWords.length === PAIN_POINT_COUNT) would
      // just silently skip wiring up the whole pinned effect if this drifted out of sync with the
      // actual points array length. Per-stage scroll distance trimmed 480px -> 360px at the same
      // time: left at 480, 8 stages would pin the page for 3840px of scroll (2.7x the original
      // 1440px for 3 stages) — 360px keeps the total (2880px) more in line with how long a
      // pinned scrollytelling section reads as "worth it" rather than a slog, while still giving
      // each pain point enough scroll room to crossfade in and be read.
      const PAIN_POINT_COUNT = 8;
      if (solusiPin && solusiWords.length === PAIN_POINT_COUNT && solusiPanels.length === PAIN_POINT_COUNT) {
        const stageCount = PAIN_POINT_COUNT;
        gsap.set(solusiPanels, { autoAlpha: 0, y: 24 });
        gsap.set(solusiPanels[0], { autoAlpha: 1, y: 0 });
        let activeStage = 0;
        // Pulled the crossfade logic out of the ScrollTrigger's onUpdate so it can also be called
        // from a plain hover listener below — previously only scroll progress could change which
        // word/panel was active, so hovering a word (left OR right column) did nothing at all.
        const setActiveStage = (stage: number) => {
          if (stage === activeStage) return;
          const prevStage = activeStage;
          activeStage = stage;
          solusiWords.forEach((w, i) => w.classList.toggle("is-active", i === stage));
          gsap.to(solusiPanels[prevStage], { autoAlpha: 0, y: -16, duration: 0.3, ease: "power2.in" });
          gsap.fromTo(solusiPanels[stage], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" });
        };
        ScrollTrigger.create({
          trigger: solusiPin,
          start: "top top+=88", // +88 clears the fixed navbar's own height so pinned content isn't tucked under it
          end: `+=${stageCount * 360}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => {
            const stage = Math.min(stageCount - 1, Math.floor(self.progress * stageCount));
            setActiveStage(stage);
          },
        });
        // Hover-to-preview: lets a visitor jump straight to any of the 8 problems by mousing over
        // its word (either the left or right column) instead of only ever being able to scrub
        // through them via scroll. Reuses the exact same setActiveStage as the scroll handler, so
        // scrolling afterwards just resumes from wherever the hover left it.
        solusiWords.forEach((w, i) => {
          const onEnter = () => setActiveStage(i);
          w.addEventListener("mouseenter", onEnter);
          effectCleanups.push(() => w.removeEventListener("mouseenter", onEnter));
        });
      }

      // Magnetic buttons: a hallmark "expensive agency site" micro-interaction — CTAs nudge
      // toward the cursor and spring back on leave. Wired onto the effectCleanups scaffold
      // (declared above, previously unused) so listeners are torn down on unmount.
      gsap.utils.toArray<HTMLElement>(".btn").forEach((btn) => {
        const onMove = (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const relX = e.clientX - rect.left - rect.width / 2;
          const relY = e.clientY - rect.top - rect.height / 2;
          gsap.to(btn, { x: relX * 0.25, y: relY * 0.35, duration: 0.4, ease: "power2.out" });
        };
        const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        effectCleanups.push(() => {
          btn.removeEventListener("mousemove", onMove);
          btn.removeEventListener("mouseleave", onLeave);
        });
      });

      // .intro-copy/.intro-media reveal was previously TWO competing GSAP animations targeting
      // the same elements/properties: a continuous scrub-tween (autoAlpha tied directly to scroll
      // progress across a 425-605px window) PLUS the onLeave safety-net above (a discrete
      // gsap.set to autoAlpha:1 the moment the hero fully exits). Running both was the likely
      // cause of the content staying stuck invisible in practice — GSAP tweens targeting the same
      // property on the same element can race, and debugging exactly which one "won" at a given
      // scroll position proved unreliable across repeated testing. Consolidated into ONE
      // mechanism: gsap.set({autoAlpha:0}) once up front (so there's still a hidden starting
      // state, avoiding the earlier "double-exposed over the still-fading video" overlap bug),
      // then a single gsap.to(...) fade INSIDE the SAME onLeave callback that hides growFrame —
      // i.e. .intro-copy/.intro-media only ever get shown by that one onLeave firing, never by a
      // second, independent scroll-scrubbed tween. See the ScrollTrigger's onLeave above.
      gsap.set([".intro-copy", ".intro-media"], { autoAlpha: 0, y: 40 });

      const revealGroups = [".section-head", ".feat-card", ".step", ".price-card", ".addon-card", ".faq-item"];
      revealGroups.forEach((sel) => {
        gsap.utils.toArray<HTMLElement>(sel).forEach((el, i) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              delay: (i % 3) * 0.08,
              scrollTrigger: { trigger: el, start: "top 88%" },
            }
          );
        });
      });

      // Animasi 3D Object Floating murni CSS/GSAP
      gsap.utils.toArray<HTMLElement>(".floating-3d-asset").forEach((el, i) => {
        gsap.to(el, {
          y: -12,
          rotationX: 15,
          rotationY: 10,
          duration: 2 + (i % 2), 
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      });

      // Recalculate every ScrollTrigger's start/end pixel positions once the whole timeline above
      // has run — the solusi pin's own trigger position depends on the total document height
      // above it, which shifts as the hero's 85 spin-frame images and various background videos
      // finish loading in (those already call their own targeted ScrollTrigger.refresh() once
      // loaded, but this catches anything else). A defensive measure, not the fix for a pin that
      // was created against stale content — that specific case needs a real remount, which only a
      // full page reload guarantees for a GSAP effect this tied to DOM measurements (Fast Refresh
      // hot-swapping this file's code does NOT re-run this mount-only effect, so a pinned
      // ScrollTrigger already running against the pre-edit content can be left stuck on that old
      // state until the page is actually reloaded, not just hot-reloaded).
      ScrollTrigger.refresh();
    }, root);

    return () => {
      effectCleanups.forEach((fn) => fn());
      if (rafCallback) gsap.ticker.remove(rafCallback);
      lenis?.destroy();
      ctx.revert();
    };
  }, []);

  // Showcase marquee cards — defined once here and rendered TWICE in the JSX below (see the
  // `[0, 1].map` wrapper) so the auto-scroll ticker (in the effect above) can wrap scrollLeft
  // back to 0 the instant it passes one copy's width, with an identical copy already in place to
  // make the loop invisible. Keep this as the single place to add/edit/reorder cards.
  const showcaseCards = [
    <div key="dashboard" className="showcase-card size-tall showcase-media-card">
      <video
        src="/dashboard-demo.mp4"
        poster="/dashboard-demo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Dashboard Real-Time NEXBILL"
        width={260}
        height={420}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="showcase-card-label">{t.showcase.dashboardLabel}</div>
    </div>,
    <div key="unit-video" className="showcase-card size-wide showcase-media-card">
      <video
        src="/unit-demo.mp4"
        poster="/unit-demo-poster.jpg"
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        aria-label="Kontrol Unit Otomatis NEXBILL"
        width={1280}
        height={720}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <span className="showcase-hint">{t.showcase.unitHint}</span>
      <div className="showcase-card-label">{t.showcase.unitLabel}</div>
    </div>,
    <div key="quote" className="showcase-card size-medium showcase-quote">
      <div className="showcase-quote-mark">&ldquo;</div>
      <p>{t.showcase.quote}</p>
      <span>{t.showcase.quoteAuthor}</span>
    </div>,
    <div key="booking" className="showcase-card size-tall showcase-media-card">
      <video
        src="/booking-demo.mp4"
        poster="/booking-demo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Booking Online 24 Jam NEXBILL"
        width={260}
        height={420}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="showcase-card-label">{t.showcase.bookingLabel}</div>
    </div>,
    <div key="stat" className="showcase-card size-square showcase-stat">
      <div className="showcase-stat-num">500+</div>
      <p>{t.showcase.statLabel}</p>
    </div>,
    <div key="kasir" className="showcase-card size-wide showcase-media-card">
      <video
        src="/kasir-demo.mp4"
        poster="/kasir-demo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Video Demo Kasir NEXBILL"
        width={1280}
        height={720}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="showcase-card-label">{t.showcase.kasirLabel}</div>
    </div>,
    <div key="laporan" className="showcase-card size-medium showcase-media-card">
      <video
        src="/laporan-demo.mp4"
        poster="/laporan-demo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Laporan Keuangan Otomatis NEXBILL"
        width={1280}
        height={720}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="showcase-card-label">{t.showcase.laporanLabel}</div>
    </div>,
  ];

  return (
    <div ref={rootRef} className={`nb-landing ${spaceGrotesk.variable} ${inter.variable} ${bebasNeue.variable}`} style={{ position: 'relative', background: 'transparent' }}>
      {/* 3D "goo" WebGL background removed per explicit request — it read as a bright blue orb
          floating over every section, clashing with the site's plain-black aesthetic (matching
          the near-black background baked into the hero's spin-frame video, e.g. frame-001.jpg's
          corners at ~rgb(4,8,17), which is already almost exactly --bg below). .nb-landing's own
          background (var(--bg), set in landing.css) now shows through everywhere instead — no
          extra color change needed since it already matches. The component itself (RunrobrunGooBackground,
          THREE.js-based) has since been deleted outright — it was never mounted, just dead weight
          in the client bundle — see the perf-pass note near the top imports. */}

      {/* NAVBAR — extracted to <SiteNavbar> (src/app/site-navbar.tsx) so the homepage and any
          standalone marketing page (e.g. /about) share one menu definition instead of two copies
          drifting apart. Modeled on brikken.co: a floating rounded pill on desktop, collapsing to
          a plain hamburger bar below 900px (see landing.css media query). */}
      <SiteNavbar />

      {/* HERO SECTION — brikken.co-style: wordmark + PS-stick spin canvas, a bottom-left blurb
          and CTA about NEXBILL, and a "rental ps" demo video that starts as a small card
          bottom-right and grows to cover the entire frame by the time the hero's scroll ends
          (see the grow-video ScrollTrigger in the effect above). Nav fades in early (~frame 5)
          rather than waiting for the whole hero to pass. */}
      <header className="hero">
        <div className="hero-mono-sticky">
          <div className="hero-scroll-video-frame">
            <canvas ref={heroCanvasRef} className="hero-scroll-video" aria-hidden="true" />
          </div>

          <h1 className="hero-wordmark">N E X B I L L</h1>

          <div className="hero-corner-copy">
            <span className="eyebrow" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}>{t.hero.eyebrow}</span>
            <p>{t.hero.lede}</p>
            <Link href="/daftar" className="btn btn-primary hero-corner-btn">{t.hero.cta}</Link>
          </div>

          <div className="hero-grow-video-frame" ref={heroGrowVideoFrameRef}>
            <video muted playsInline loop autoPlay preload="auto" className="hero-grow-video">
              <source src="/videos/rental-ps.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </header>

      {/* INTRO — sales copy relocated from the old hero. The "rental ps" video no longer lives
          here — it grows to fullscreen inside the hero above instead, so this section just picks
          up the copy once that transition finishes. This is also where the navbar first fades in
          (see the ~33px ScrollTrigger above). Redesigned as a two-column split: text left
          (.intro-copy), photo right (.intro-media) — .intro-grid handles the layout, stacking
          to a single column on mobile (see landing.css). The stat-strip stays full-width below
          both columns since a 4-up stat grid doesn't have an obvious "half" to live in. */}
      {/* <main> landmark — semantic HTML / a11y + SEO: everything below is the page's primary
          content (the hero <header> above and <SiteNavbar>'s <nav> stay outside it, as they
          should). Wraps through the FAQ section, right before <SiteFooter>. */}
      <main>
      <section className="intro-section">
        {/* Full-bleed background photo behind the ENTIRE section (not just a boxed card in the
            right column) — per explicit request ("photonya jadi background section 2 full
            screen"). Same absolute-inset + object-fit:cover + gradient-overlay technique as the
            showcase section's background video (see .intro-bg-photo/.intro-bg-overlay in
            landing.css). Still eager + fetchPriority high: likely LCP candidate this high up. */}
        <picture>
          <source srcSet="/intro-hero-photo.webp" type="image/webp" />
          <img
            src="/intro-hero-photo.jpg"
            alt="Dashboard NEXBILL Dipakai Langsung di Outlet Rental PlayStation"
            className="intro-bg-photo"
            draggable={false}
            width={1024}
            height={683}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="intro-bg-overlay" aria-hidden="true" />

        <div className="wrap intro-inner">
          <div className="intro-grid">
            <div className="intro-copy">
              <h2 className="intro-headline" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>{t.intro.headlinePre}<span className="glow-text">{t.intro.headlineHighlight}</span></h2>
              <p className="sub" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.8)', color: '#fff' }}>{t.intro.sub}</p>
              <div className="hero-ctas">
                <Link href="/daftar" className="btn btn-primary">{t.intro.ctaPrimary}</Link>
                <a href="#fitur" className="btn btn-ghost" style={{ backdropFilter: 'blur(8px)' }}>{t.intro.ctaGhost}</a>
              </div>
              <p className="hero-note" style={{ color: '#cbd5e1' }}>{t.intro.note}</p>

              <div className="trust-badge">
                <span className="stars" aria-hidden="true">★★★★★</span>
                <span className="trust-text"><strong>4.9/5</strong> {t.intro.trustSuffix}</span>
              </div>
            </div>

            {/* Right column no longer holds a framed picture (the photo is now the section's own
                background) — kept only as a positioning container for the floating stat badges,
                so they still land over the visible right-hand part of the photo. */}
            <div className="intro-media" style={{ minHeight: '340px' }}>
              {/* intro-float-badge(-1/2/3): gentle infinite up/down bob per explicit request ("ui
                  floating dibuatkan animasi bergerak") — pure CSS keyframes (see landing.css),
                  each badge on its own slightly different duration/delay so the three drift out of
                  sync with each other instead of bobbing in unison, which reads as more organic
                  ("floating") than a single shared beat. No GSAP needed: these three are simple,
                  self-contained, non-scroll-linked loops — exactly the kind of thing this
                  codebase's own .nb-loader-glow pulse already does the same way.
                  All positioning/padding/type now lives in these classes (landing.css), not inline
                  styles — moved out during a mobile-responsive pass specifically so a narrow-phone
                  media query could shrink them (inline styles can't be overridden by a stylesheet
                  media query without !important). See the max-width:480px block in landing.css. */}
              <div className="intro-float-badge intro-float-badge-1">
                <span className="intro-media-dot" aria-hidden="true" />
                <div>
                  <div className="intro-float-badge-value">{t.intro.floatingUnits.value}</div>
                  <div className="intro-float-badge-label">{t.intro.floatingUnits.label}</div>
                </div>
              </div>

              <div className="intro-float-badge intro-float-badge-2">
                <div className="intro-float-badge-label">{t.intro.floatingBooking.label}</div>
                <div className="intro-float-badge-value">{t.intro.floatingBooking.value}</div>
              </div>

              <div className="intro-float-badge intro-float-badge-3">
                <div className="intro-float-badge-label">{t.intro.floatingRevenue.label}</div>
                <div className="intro-float-badge-value-cyan">{t.intro.floatingRevenue.value}</div>
              </div>
            </div>
          </div>

          <div className="stat-strip" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.4)', borderRadius: '16px', padding: '10px' }}>
            {t.intro.stats.map((s, i) => (
              <div className="stat-item" key={i} style={{ backgroundColor: 'transparent', border: 'none' }}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: SOLUSI — redesigned as a brikken.co-style pinned scrollytelling block: the
          section PINS in place (position:fixed, handled by GSAP's own pin-spacer — see the
          ScrollTrigger in the effect above) for a scroll distance, during which the 3 pain
          points step through in sync with scroll progress (word brightens on the left, panel
          crossfades on the right) rather than jumping straight to FITUR (section 5). It only
          releases into section 5 once all 3 stages have been seen. */}
      <section id="solusi" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">{t.solusi.kicker}</div>
            <h2>{t.solusi.title}</h2>
            <p>{t.solusi.sub}</p>
          </div>
        </div>
        <div className="solusi-pin" ref={solusiPinRef}>
          <div className="solusi-orbit" aria-hidden="true">
            <span className="solusi-orbit-ring solusi-orbit-ring-1" />
            <span className="solusi-orbit-ring solusi-orbit-ring-2" />
            <span className="solusi-orbit-track" />
            <span className="solusi-orbit-arrow solusi-orbit-arrow-left">←</span>
            <span className="solusi-orbit-arrow solusi-orbit-arrow-right">→</span>
          </div>
          {/* 8 pain-point labels split 4-and-4 flanking the card (per explicit request), instead
              of all 8 stacked in one column to the card's left. Absolute index (i) is preserved
              across both halves — the left half is points[0..3] with i as-is, the right half is
              points[4..7] with i offset by +4 — so solusiWordRefs.current stays a flat 0-7 array
              and the GSAP effect above (which toggles "is-active" and drives the shared card by
              plain numeric index) needs no changes at all, only this rendering split. */}
          <div className="wrap solusi-pin-inner">
            <div className="solusi-words solusi-words-left">
              {t.solusi.points.slice(0, 4).map((p, i) => (
                <div
                  className={`solusi-word${i === 0 ? " is-active" : ""}`}
                  key={i}
                  data-idx={i}
                  ref={(el) => { solusiWordRefs.current[i] = el; }}
                >
                  {p.word}
                </div>
              ))}
            </div>
            <div className="solusi-panels">
              {t.solusi.points.map((p, i) => (
                <div
                  className={`solusi-panel${i === 0 ? " is-active" : ""}`}
                  key={i}
                  ref={(el) => { solusiPanelRefs.current[i] = el; }}
                  style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(13, 21, 38, 0.65)" }}
                >
                  {/* Real per-problem clips (uploaded one at a time — see SOLUSI_PANEL_VIDEOS
                      above) for cards that have them; every other card still shares the generic
                      placeholder until real footage exists for it too. */}
                  <div className="solusi-panel-media">
                    <video autoPlay muted loop playsInline preload="metadata">
                      <source src={solusiPanelVideoSrc(i)} type="video/mp4" />
                    </video>
                  </div>
                  {/* Emoji icon removed per explicit request ("hapus emoticon/icon ... elegant dan
                      seperti memiliki teknologi tinggi") — replaced with a HUD-style index readout
                      (pulsing dot + zero-padded "N / 08" counter) that reads as diagnostic/technical
                      rather than decorative, in keeping with the section's existing sci-fi "orbit"
                      motif (the rings/arrows drawn behind the word columns). */}
                  <div className="solusi-panel-index" aria-hidden="true">
                    <span className="solusi-panel-index-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="solusi-panel-index-sep">/</span>
                    <span className="solusi-panel-index-total">{String(t.solusi.points.length).padStart(2, "0")}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="solusi-words solusi-words-right">
              {t.solusi.points.slice(4).map((p, iRel) => {
                const i = iRel + 4;
                return (
                  <div
                    className="solusi-word"
                    key={i}
                    data-idx={i}
                    ref={(el) => { solusiWordRefs.current[i] = el; }}
                  >
                    {p.word}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: SHOWCASE — horizontal marquee of varied-size cards, bajgartoffice.com style.
          Auto-scrolls left-to-right on its own at a fast tempo (see the gsap.ticker-driven
          autoScrollTick in the effect above), and is also drag/wheel-scrollable — dragging or
          hovering pauses the auto-scroll. Card set is rendered twice (showcaseCards defined above,
          near `return`) so
          the loop wraps seamlessly. Content is a placeholder mix (per explicit request): 2 cards
          use real project assets (dashboard-preview.png, hero-ps-stick.mp4), the rest are
          clearly-labeled placeholders ("Ganti dengan screenshot/video") plus a quote and a stat
          card for visual variety — swap them for real screenshots/clips whenever ready, the
          mechanics don't need to change. Moved to below SOLUSI per explicit request, so visitors
          see the problem framing first, then the product showcase. */}
      <section className="showcase-section">
        {/* Full-bleed background video (uploaded hero-video.mp4.mp4) behind the whole section —
            absolute + object-fit:cover so it fills the section's actual height (which varies with
            content) rather than a fixed 100vh, plus a dark gradient overlay so the heading text
            and card set stay legible on top of it, same technique as the hero's own video overlay. */}
        <video className="showcase-bg-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
          <source src="/hero-video.mp4.mp4" type="video/mp4" />
        </video>
        <div className="showcase-bg-overlay" aria-hidden="true" />
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">{t.showcase.kicker}</div>
            <h2>{t.showcase.title}</h2>
            <p>{t.showcase.sub}</p>
          </div>
        </div>
        <div className="showcase-track" ref={showcaseTrackRef}>
          {[0, 1].map((copy) => (
            <Fragment key={`showcase-copy-${copy}`}>{showcaseCards}</Fragment>
          ))}
        </div>
      </section>

      {/* SECTION: FITUR */}
      <section id="fitur" style={{ backgroundColor: 'transparent' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">{t.fitur.kicker}</div>
            <h2>{t.fitur.title}</h2>
            <p>{t.fitur.sub}</p>
          </div>
          <div className="feat-grid">
            {t.fitur.items.map((f, i) => (
              <div className="feat-card" key={i} style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.5)' }}>
                {/* Emoji replaced with a zero-padded index + HUD reticle corner marks (::before/
                    ::after in CSS) — same "elegant/high-tech, no emoji" direction already applied
                    to the SOLUSI cards' index readout, kept consistent here. */}
                <div className="feat-icon floating-3d-asset" style={{ boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.1), 0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: HARGA & ADD-ONS */}
      {/* HARGA — premium redesign: satu "bundle" visual (kartu langganan + konektor "+" + kartu
          hardware opsional) menggantikan layout lama (kartu tunggal + grid 3-addon terpisah),
          dengan glow gradient di latar dan trust-row metode pembayaran iPaymu di bawah CTA. Harga
          Smart Plug diturunkan dari Rp275.000 ke Rp249.000/unit — modal beli ~Rp150.000 (generik,
          tanpa brand tertentu), jadi margin ~40% (~Rp99rb/unit) masih sehat untuk menutup ongkos
          kirim, packaging, & QC sebelum kirim ke outlet, sambil harganya "match" angka langganan
          untuk kesan lebih premium & mudah diingat. */}
      <section id="harga" style={{ backgroundColor: 'transparent', position: 'relative', overflow: 'hidden' }}>
        <div className="harga-glow" aria-hidden="true" />
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">{t.harga.kicker}</div>
            <h2>{t.harga.title}</h2>
            <p>{t.harga.sub}</p>
          </div>

          <div className="harga-bundle">
            <div className="price-card price-card-premium">
              <span className="price-badge">{t.harga.badge}</span>
              <div className="price-plan">{t.harga.plan}</div>
              <div className="price-old">{pricingEntry ? formatPlanPrice(pricingEntry.currency, pricingEntry.priceOriginal) : "Rp399.000"}</div>
              <div className="price-now"><span className="amount">{pricingEntry ? formatPlanPrice(pricingEntry.currency, pricingEntry.priceCurrent) : "Rp249.000"}</span><span className="period">{t.harga.period}</span></div>
              <div className="price-save">
                {t.harga.save.replace(
                  "{amount}",
                  pricingEntry ? formatPlanPrice(pricingEntry.currency, pricingEntry.priceOriginal - pricingEntry.priceCurrent) : "Rp150.000"
                )}
              </div>
              <ul className="price-feats">
                {t.harga.feats.map((f, i) => (
                  <li key={i}><span className="check">✓</span> {f}</li>
                ))}
              </ul>
              <Link href="/daftar" className="btn btn-primary btn-block">{t.harga.cta}</Link>

              <div className="price-pay-trust">
                <span className="price-pay-label">{t.harga.payLabel}</span>
                <div className="price-pay-badges">
                  {t.harga.payBadges.map((b, i) => (
                    <span className="pay-badge" key={i}>{b}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="harga-connector" aria-hidden="true">
              <span className="harga-connector-line" />
              <span className="harga-connector-plus">+</span>
              <span className="harga-connector-line" />
            </div>

            <div className="addon-card addon-card-premium">
              <div className="addon-card-tag">{t.harga.addonTag}</div>
              <div className="addon-photo">
                <picture>
                  <source srcSet="/smart-plug.webp" type="image/webp" />
                  <img src="/smart-plug.jpg" alt="Smart Plug WiFi Tuya" loading="lazy" decoding="async" width={500} height={500} />
                </picture>
              </div>
              <h4>{t.harga.addonTitle}</h4>
              <div className="a-price">{pricingEntry ? formatPlanPrice(pricingEntry.currency, pricingEntry.smartPlugPrice) : "Rp249.000"}<span>{t.harga.addonPriceSuffix}</span></div>
              <p>{t.harga.addonDesc}</p>
              {/* Kompatibilitas: hanya TV yang TIDAK punya kontrol jaringan sendiri yang butuh smart
                  plug fisik ini (TV analog/tabung, TV digital biasa, dan smart TV non-Android seperti
                  Viva OS/Hisense OS/webOS dll — Tuya-nya yang mengendalikan aliran listrik ke TV).
                  Android TV sudah punya sistem operasi berbasis Android yang bisa dikontrol/dimatikan
                  langsung lewat integrasi software NEXBILL tanpa hardware tambahan, jadi TIDAK perlu
                  beli smart plug untuk unit Android TV. */}
              <div className="addon-compat">
                <div className="addon-compat-row addon-compat-need">
                  <span className="addon-compat-icon">✓</span>
                  <span><strong>{t.harga.compatNeedLabel}</strong> {t.harga.compatNeedText}</span>
                </div>
                <div className="addon-compat-row addon-compat-skip">
                  <span className="addon-compat-icon">–</span>
                  <span><strong>{t.harga.compatSkipLabel}</strong> {t.harga.compatSkipText}</span>
                </div>
              </div>
              {/* Opsi "beli smart plug sendiri + biaya integrasi Rp50.000/unit" SENGAJA tidak
                  ditampilkan di halaman harga publik ini (per keputusan eksplisit user) — supaya
                  pesan "satu harga, tanpa biaya tersembunyi" tetap simpel & tidak menambah cabang
                  pilihan yang bisa membingungkan calon pelanggan di titik ini. Opsi itu tetap ada,
                  tapi dipindah ke alur onboarding/setup di dashboard (lihat DeviceSetupGuide di
                  src/app/dashboard/devices), di mana tim support bisa cek dulu kompatibilitas unit
                  yang dipunyai customer sebelum disetujui — lebih aman dari sisi support/garansi. */}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: FAQ — restyled after brikken.co's FAQ page: a big, left-aligned headline+sub
          instead of the old centered "section-head" pattern, and a borderless/divider-line
          accordion (no per-item card background) instead of the old rounded card list. Kept on
          NEXBILL's dark palette — Brikken's own version is light/cream. */}
      <section id="faq" style={{ backgroundColor: 'transparent' }}>
        {/* FAQPage structured data — makes NEXBILL's FAQ eligible for Google's expandable rich
            results (higher SERP real-estate = more clicks). Built directly from the same
            translated t.faq.items already rendered below, so it can never drift out of sync
            with the visible copy in any of the 6 languages. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": t.faq.items.map((item) => ({
                "@type": "Question",
                "name": item.q,
                "acceptedAnswer": { "@type": "Answer", "text": item.a },
              })),
            }),
          }}
        />
        <div className="wrap">
          <div className="faq-head">
            <div className="kicker">{t.faq.kicker}</div>
            <h2 className="faq-headline">{t.faq.headline}</h2>
            <p className="faq-subhead">{t.faq.sub}</p>
          </div>
          <div className="faq-list">
            {t.faq.items.map((item, i) => (
              <div className={`faq-item${openFaq === i ? " open" : ""}`} key={i}>
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className="faq-toggle" aria-hidden="true">{openFaq === i ? "–" : "+"}</span>
                </div>
                <div className="faq-a"><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal links to the SEO pillar pages (docs/SEO-ARCHITECTURE.md §2-3, §6) — without
          this, those 4 pages would only be reachable via sitemap.xml, which is a weak discovery/
          PageRank-flow signal on its own. Contextual anchor text here, each phrased differently
          (not exact-match keyword repeated 4x), matching the internal-linking guardrail. */}
      <section style={{ backgroundColor: 'transparent' }}>
        <div className="wrap" style={{ padding: '32px 0 64px', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '14px' }}>{t.pillarLinks.heading}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {t.pillarLinks.items.map((item, i) => (
              <a key={i} href={item.href} style={{ fontSize: '13.5px', color: 'var(--text-dim)', border: '1px solid var(--card-border)', borderRadius: '999px', padding: '8px 16px' }}>{item.label}</a>
            ))}
          </div>
        </div>
      </section>
      </main>

      {/* FOOTER — extracted to <SiteFooter> (src/app/site-footer.tsx), same rationale as the navbar. */}
      <SiteFooter />

      {/* Cookie consent banner — mounted here (inside <LanguageProvider>, once per page load)
          rather than in layout.tsx, since this whole marketing site is one client component tree
          and layout.tsx stays a server component. See cookie-consent-banner.tsx for the
          accept/decline persistence logic. */}
      <CookieConsentBanner />
    </div>
  );
}