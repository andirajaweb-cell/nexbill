"use client";

import { useEffect, useRef } from "react";

/**
 * The "Spinning Symbols" loading cursor — mounted once in the root layout, same pattern as
 * DialogHost. Native CSS `cursor` images can't animate, so this renders a small fixed overlay
 * (the four PS button glyphs rotating + pulsing in their classic colors, styling lives in
 * globals.css) that follows the mouse and only becomes visible while <html> carries the
 * .ps-cursor-loading-active class — toggle it via lib/ui/ps-cursor.ts's setPsCursorLoading().
 * That same class also sets `cursor: none` everywhere, so this overlay fully replaces the real
 * cursor for that state instead of drawing alongside it.
 *
 * Position tracking is done via a raw DOM style write in a mousemove listener rather than React
 * state — this fires on every pixel of mouse movement, so keeping it out of the render cycle
 * avoids needless re-renders for something that's invisible 99% of the time anyway.
 */
export function PsCursorSystem() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={ref} className="ps-spinner-ring" aria-hidden="true">
      {/* Four-color arc track connecting the symbols — each arc centered under its matching icon
          (green under triangle at top, red under circle at right, cyan under cross at bottom,
          magenta under square at left), computed as explicit SVG arcs rather than a
          stroke-dasharray trick since dasharray phase math renders inconsistently across SVG
          engines. */}
      <svg className="ps-ring-track" viewBox="0 0 56 56">
        <path d="M 19.05 7.90 A 22 22 0 0 1 36.95 7.90" fill="none" stroke="var(--gm-green)" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
        <path d="M 48.10 19.05 A 22 22 0 0 1 48.10 36.95" fill="none" stroke="var(--gm-red)" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
        <path d="M 36.95 48.10 A 22 22 0 0 1 19.05 48.10" fill="none" stroke="var(--gm-cyan)" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
        <path d="M 7.90 36.95 A 22 22 0 0 1 7.90 19.05" fill="none" stroke="var(--gm-magenta)" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
      </svg>
      <span className="ps-sym ps-sym-triangle">
        <svg viewBox="0 0 24 24">
          <polygon points="12,3 21,20 3,20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="ps-sym ps-sym-circle">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </span>
      <span className="ps-sym ps-sym-cross">
        <svg viewBox="0 0 24 24">
          <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="ps-sym ps-sym-square">
        <svg viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </span>
    </div>
  );
}
