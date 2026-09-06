import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs";
import { translate, type LangCode } from "@/lib/i18n/registry";
import { currencyForCountry, formatMoney, type OutletCurrency } from "@/lib/currency/format";
import "@/lib/i18n/dict-report-export";

export interface ReportMeta {
  companyName: string;
  companyAddress: string | null;
  /** Absolute filesystem path to the logo file, or null if no logo / file missing. Resolved from outlets.logoUrl (a public URL like "/uploads/branding/xxx.png") against the Next.js `public/` folder. */
  logoAbsPath: string | null;
  reportTitle: string;
  periodLabel: string;
  generatedAtLabel: string;
  /** Outlet's own display currency (see lib/currency/format.ts) — was previously always IDR/"Rp" regardless of outlet country, unlike the on-screen dashboard which already reads this via useCurrency(). */
  currency: OutletCurrency;
  /** Language the exported document's own labels are rendered in — the caller's ?lang= query param, defaulting to "id" like every other dashboard export. */
  lang: LangCode;
}

/** @deprecated Use ReportMeta.currency + formatMoney() from lib/currency/format.ts instead — this always assumed IDR regardless of the outlet's own country/currency setting. Kept only as a safety-net default for any call site not yet passing a currency. */
export function rupiah(n: number, currency: OutletCurrency = currencyForCountry(null)): string {
  return formatMoney(n, currency);
}

/** Human period label, mirroring PeriodPicker's describePeriod() but built server-side from raw ISO from/to (the export route only receives resolved from/to, not the preset), localized via lang. */
export function describePeriodRange(from: string | undefined, to: string | undefined, lang: LangCode): string {
  const t = (key: string, fallback: string) => translate(lang, key, fallback);
  const locale = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" }[lang] ?? "id-ID";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  if (!from && !to) return t("report.export.allTime", "Sepanjang Waktu");
  if (from && to && from.slice(0, 10) === to.slice(0, 10)) return fmt(from);
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (to) return `${t("report.export.asOfPrefix", "Per")} ${fmt(to)}`;
  if (from) return `${t("report.export.sincePrefix", "Sejak")} ${fmt(from)}`;
  return t("report.export.allTime", "Sepanjang Waktu");
}

function resolveLogoPath(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  // logoUrl is a public URL like "/uploads/branding/foo.png" — map it onto the Next.js public/ dir.
  const rel = logoUrl.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  try {
    if (fs.existsSync(abs)) return abs;
  } catch {
    // ignore — fall through to null (report renders without a logo rather than failing)
  }
  return null;
}

export async function buildReportMeta(outletId: string, reportTitle: string, from?: string, to?: string, lang: LangCode = "id"): Promise<ReportMeta> {
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const locale = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" }[lang] ?? "id-ID";
  return {
    companyName: outlet?.name ?? translate(lang, "report.export.defaultCompanyName", "Perusahaan"),
    companyAddress: outlet?.address ?? null,
    logoAbsPath: resolveLogoPath(outlet?.logoUrl ?? null),
    reportTitle,
    periodLabel: describePeriodRange(from, to, lang),
    generatedAtLabel: new Date().toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }),
    currency: currencyForCountry(outlet?.outletCountry),
    lang,
  };
}
