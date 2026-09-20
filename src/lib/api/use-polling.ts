"use client";

import { useEffect, useRef } from "react";

/**
 * Poll a callback on an interval, but ONLY while the browser tab is actually visible.
 *
 * Why this exists: every dashboard page used a plain `setInterval(load, 3000)`, which keeps firing
 * forever in a backgrounded tab. Outlets leave the billing board, kitchen display, and rental page
 * open all day, so those tabs kept pulling data nobody was looking at — for a tab left open over a
 * 12-hour shift, a 3-second interval is roughly 14,000 requests. That traffic is what exhausted
 * this project's Supabase egress quota on 2026-09-20 and took Auth down with it, locking every
 * outlet out of the app entirely.
 *
 * Behaviour:
 *  - Hidden tab: the interval is torn down completely, not merely skipped. Zero requests.
 *  - Becoming visible again: fires `callback` IMMEDIATELY before resuming the interval, so a
 *    cashier returning to the tab sees fresh data rather than whatever was on screen when they
 *    left. Without this the pause would trade bandwidth for stale numbers, which on a billing
 *    screen is a worse bug than the one being fixed.
 *  - `enabled: false` behaves exactly like a hidden tab — useful while a required id is still null.
 *
 * The callback is held in a ref, so passing an inline arrow function does NOT restart the interval
 * on every render — the usual footgun when replacing a hand-written useEffect+setInterval.
 *
 * Deliberately NOT for the 1-second UI timers (elapsed-time counters, clocks): those touch no
 * network, and pausing them would make the clock visibly wrong on return.
 */
export function usePollingWhenVisible(callback: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);

  // Keep the ref pointing at the latest closure without re-running the effect below.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      void savedCallback.current();
    };

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        run(); // catch up first, then resume — see the doc comment above
        start();
      } else {
        stop();
      }
    };

    // Only start polling if the tab is already visible; a page opened in a background tab
    // (middle-click, restored session) should stay quiet until someone actually looks at it.
    if (document.visibilityState === "visible") start();

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [intervalMs, enabled]);
}
