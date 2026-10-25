/**
 * Blacklist no-show booking PS — logika murni (tanpa db).
 *
 * Nomor WhatsApp yang tidak datang (status booking "no_show", ditandai kasir atau otomatis oleh
 * runAutoReleaseBookings di lib/rental/scheduler.ts) sebanyak `threshold` kali dalam `windowDays`
 * hari terakhir tidak bisa booking ONLINE lagi. Pemilik bisa memblokir manual atau melepas blokir;
 * melepas blokir = "pengampunan": no-show sebelum saat itu tidak dihitung lagi.
 * Booking dari kasir tidak diblokir — kasir hanya diberi peringatan.
 */

export interface NoShowPolicy {
  enabled: boolean;
  threshold: number;
  windowDays: number;
}

export const DEFAULT_NO_SHOW_POLICY: NoShowPolicy = { enabled: true, threshold: 3, windowDays: 90 };

export const NO_SHOW_THRESHOLD_RANGE = { min: 1, max: 20 } as const;
export const NO_SHOW_WINDOW_RANGE = { min: 7, max: 730 } as const;

/** "0812-3456 789" / "+62 812…" / "62812…" / "812…" → "62812…". Kosong bila bukan nomor. */
export function normalizePhone(raw: string | null | undefined): string {
  let d = String(raw ?? "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 8 ? d : "";
}

export function sanitizePolicy(input: Partial<NoShowPolicy> | null | undefined): NoShowPolicy {
  const clamp = (n: unknown, r: { min: number; max: number }, fallback: number) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.min(r.max, Math.max(r.min, v)) : fallback;
  };
  return {
    enabled: input?.enabled ?? DEFAULT_NO_SHOW_POLICY.enabled,
    threshold: clamp(input?.threshold, NO_SHOW_THRESHOLD_RANGE, DEFAULT_NO_SHOW_POLICY.threshold),
    windowDays: clamp(input?.windowDays, NO_SHOW_WINDOW_RANGE, DEFAULT_NO_SHOW_POLICY.windowDays),
  };
}

export interface BlacklistEntry {
  kind: "block" | "forgive";
  createdAt: string;
  liftedAt: string | null;
  reason: string | null;
}

export interface BlockVerdict {
  blocked: boolean;
  /** manual = diblokir pemilik; auto = melewati batas no-show. */
  source: "manual" | "auto" | null;
  /** No-show yang dihitung (dalam jendela, setelah pengampunan terakhir). */
  countedNoShows: number;
  reason: string | null;
}

/**
 * `noShowAts` = waktu no-show nomor ini (bookings.noShowAt, atau scheduledStart bila kosong).
 * `entries` = baris booking_blacklist nomor ini.
 */
export function evaluateBlock(noShowAts: string[], entries: BlacklistEntry[], policy: NoShowPolicy, nowMs: number): BlockVerdict {
  const manual = entries.filter((e) => e.kind === "block" && !e.liftedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const lastForgive = entries
    .filter((e) => e.kind === "forgive")
    .map((e) => Date.parse(e.createdAt))
    .filter(Number.isFinite)
    .reduce((m, v) => Math.max(m, v), -Infinity);
  const windowStart = nowMs - policy.windowDays * 86400000;
  const from = Math.max(windowStart, lastForgive);
  const counted = noShowAts.map((s) => Date.parse(s)).filter((t) => Number.isFinite(t) && t > from && t <= nowMs).length;
  if (manual) return { blocked: true, source: "manual", countedNoShows: counted, reason: manual.reason };
  if (policy.enabled && counted >= policy.threshold) return { blocked: true, source: "auto", countedNoShows: counted, reason: null };
  return { blocked: false, source: null, countedNoShows: counted, reason: null };
}
