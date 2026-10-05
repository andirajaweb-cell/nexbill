import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Filter Riwayat Shift per hari / bulan / tahun. Kunci tanggal = tanggal BUKA shift dalam
 * kalender outlet (WIB, lihat outlet-time.ts) — shift malam yang dibuka 22.00 tanggal 4 dan
 * ditutup 06.00 tanggal 5 tetap terhitung shift tanggal 4, sama seperti cara kasir menyebutnya.
 */
export type ShiftPeriodMode = "all" | "day" | "month" | "year";

export interface ShiftHistoryFilter {
  mode: ShiftPeriodMode;
  /** "YYYY-MM-DD" (day) · "YYYY-MM" (month) · "YYYY" (year) */
  value: string;
  staffUserId?: string;
  status?: "all" | "open" | "closed" | "flagged" | "variance";
}

export interface ShiftLike {
  openedAt: string;
  staffUserId: string | null;
  status: string;
  variance: number | null;
  nonCashVarianceTotal: number | null;
  riskFlags?: string | null;
}

export function shiftDayKey(s: Pick<ShiftLike, "openedAt">) {
  return outletDateYmd(new Date(s.openedAt));
}

export function defaultFilterValue(mode: ShiftPeriodMode, now = new Date()) {
  const ymd = outletDateYmd(now);
  return mode === "day" ? ymd : mode === "month" ? ymd.slice(0, 7) : mode === "year" ? ymd.slice(0, 4) : "";
}

const flagged = (s: ShiftLike) => !!s.riskFlags && s.riskFlags !== "[]";
const hasVariance = (s: ShiftLike) => Math.abs(s.variance ?? 0) >= 1 || Math.abs(s.nonCashVarianceTotal ?? 0) >= 1;

export function filterShifts<S extends ShiftLike>(rows: S[], f: ShiftHistoryFilter): S[] {
  return rows.filter((s) => {
    if (f.mode !== "all" && f.value) {
      const key = shiftDayKey(s);
      if (f.mode === "day" && key !== f.value) return false;
      if (f.mode === "month" && key.slice(0, 7) !== f.value) return false;
      if (f.mode === "year" && key.slice(0, 4) !== f.value) return false;
    }
    if (f.staffUserId && s.staffUserId !== f.staffUserId) return false;
    switch (f.status ?? "all") {
      case "open": return s.status !== "closed";
      case "closed": return s.status === "closed";
      case "flagged": return flagged(s);
      case "variance": return hasVariance(s);
      default: return true;
    }
  });
}

/** Ringkasan untuk baris di atas tabel. */
export function summarizeShifts(rows: ShiftLike[]) {
  const closed = rows.filter((s) => s.status === "closed");
  const sum = (xs: ShiftLike[], k: "variance" | "nonCashVarianceTotal") => xs.reduce((a, s) => a + (s[k] ?? 0), 0);
  return {
    count: rows.length,
    closedCount: closed.length,
    openCount: rows.length - closed.length,
    cashVariance: sum(closed, "variance"),
    shortage: closed.reduce((a, s) => a + Math.min(0, s.variance ?? 0), 0),
    nonCashVariance: sum(closed, "nonCashVarianceTotal"),
    flaggedCount: rows.filter(flagged).length,
  };
}

/** Tahun yang punya shift (untuk pilihan tahun), terbaru dulu, minimal tahun ini. */
export function shiftYears(rows: ShiftLike[], now = new Date()) {
  const ys = new Set(rows.map((s) => shiftDayKey(s).slice(0, 4)));
  ys.add(outletDateYmd(now).slice(0, 4));
  return [...ys].sort().reverse();
}
