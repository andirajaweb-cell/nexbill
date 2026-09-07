"use client";
import { useEffect, useState } from "react";
import type { LangCode } from "@/lib/i18n/registry";

// Same locale mapping convention as PRICE_CURRENCY_LOCALE in src/app/page.tsx — "fil" maps to
// "en-PH" rather than "fil-PH" since Filipino ICU locale data support is inconsistent across
// browser/Node versions, while "en-PH" gets the right date/number conventions more reliably.
const LOCALE_BY_LANG: Record<LangCode, string> = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "en-PH", vi: "vi-VN" };

/**
 * Ticking date/time display for the dashboard header. Mostly a trust signal: seeing the live
 * clock sitting right next to hour-based charts ("Transaksi per Jam", "Jam Ramai vs Jam Sepi")
 * makes it obvious at a glance whether the system's notion of "now" matches the real wall clock —
 * exactly the kind of drift a server-timezone mismatch would otherwise show up as (see
 * src/lib/time/outlet-time.ts for the bug this same class of issue caused in those charts).
 *
 * Deliberately uses the BROWSER's own local time, not a server-fetched or timezone-converted
 * one — whoever's looking at this dashboard is physically wherever they are, so `new Date()` in
 * the browser already reflects their real local time with zero conversion needed.
 */
export function LiveClock({ lang = "id" }: { lang?: LangCode }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Nothing rendered until mounted client-side — the server has no "now" to render, so this
  // avoids a hydration mismatch rather than flashing a wrong/stale time for one frame.
  if (!now) return null;

  const locale = LOCALE_BY_LANG[lang] ?? "id-ID";
  const dateLabel = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="text-right leading-tight">
      <div className="text-sm font-semibold text-neutral-100 tabular-nums">{timeLabel}</div>
      <div className="text-xs text-neutral-500">{dateLabel}</div>
    </div>
  );
}
