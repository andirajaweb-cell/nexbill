import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs";

export interface ReportMeta {
  companyName: string;
  companyAddress: string | null;
  /** Absolute filesystem path to the logo file, or null if no logo / file missing. Resolved from outlets.logoUrl (a public URL like "/uploads/branding/xxx.png") against the Next.js `public/` folder. */
  logoAbsPath: string | null;
  reportTitle: string;
  periodLabel: string;
  generatedAtLabel: string;
}

export function rupiah(n: number): string {
  return `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
}

/** Human period label, mirroring PeriodPicker's describePeriod() but built server-side from raw ISO from/to (the export route only receives resolved from/to, not the preset). */
export function describePeriodRange(from?: string, to?: string): string {
  if (!from && !to) return "Sepanjang Waktu";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  if (from && to && from.slice(0, 10) === to.slice(0, 10)) return fmt(from);
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (to) return `Per ${fmt(to)}`;
  if (from) return `Sejak ${fmt(from)}`;
  return "Sepanjang Waktu";
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

export async function buildReportMeta(outletId: string, reportTitle: string, from?: string, to?: string): Promise<ReportMeta> {
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return {
    companyName: outlet?.name ?? "Perusahaan",
    companyAddress: outlet?.address ?? null,
    logoAbsPath: resolveLogoPath(outlet?.logoUrl ?? null),
    reportTitle,
    periodLabel: describePeriodRange(from, to),
    generatedAtLabel: new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }),
  };
}
