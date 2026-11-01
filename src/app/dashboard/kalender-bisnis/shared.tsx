"use client";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Haze, Sun } from "lucide-react";
import type { CalendarAcademic, CalendarHoliday, CalendarPayload, CalendarMatch, CalendarWeatherDay } from "@/lib/activity-calendar/calendar";
import type { CalendarPrefs } from "@/lib/activity-calendar/academic";
import type { WeatherSlot } from "@/lib/activity-calendar/bmkg-rules";
import type { ActivitySettings } from "@/lib/activity-calendar/data";

export type TFn = (key: string, fallback: string) => string;
export type View = "month" | "week" | "day";

export type CalendarResponse = CalendarPayload & {
  migration: boolean;
  settings: ActivitySettings;
  canEdit: boolean;
  refreshing: { weather: boolean; football: boolean; holidays?: boolean };
  prefs?: CalendarPrefs;
};

export type { CalendarAcademic, CalendarHoliday, CalendarMatch, CalendarWeatherDay, WeatherSlot };

export interface Filters {
  weather: boolean;
  matches: boolean;
  actual: boolean;
  rainOnly: boolean;
  holidays: boolean;
  academic: boolean;
  leagues: string[];
}

/** Isi {placeholder} di teks terjemahan. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text);
}

/* ---------------------------------------------- tanggal (string YYYY-MM-DD, tanpa jebakan zona waktu) ---------------------------------------------- */

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Senin sebagai awal minggu. */
export function startOfWeek(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function monthGrid(anchor: string): { from: string; to: string; days: string[] } {
  const first = `${anchor.slice(0, 8)}01`;
  const from = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  return { from, to: days[41], days };
}

export function rangeFor(view: View, anchor: string): { from: string; to: string } {
  if (view === "month") {
    const g = monthGrid(anchor);
    return { from: g.from, to: g.to };
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  return { from: anchor, to: anchor };
}

export function shiftAnchor(view: View, anchor: string, dir: -1 | 1): string {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, 7 * dir);
  const d = new Date(`${anchor.slice(0, 8)}01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + dir);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(date: string, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(new Date(`${date}T12:00:00Z`));
}

export function fmtDateTime(iso: string | null, locale: string, tz: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export const TZ_ABBR: Record<string, string> = { "Asia/Jakarta": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT" };

/* ---------------------------------------------- cuaca: ikon, warna, label ---------------------------------------------- */

export const RAIN_STYLE: Record<string, { chip: string; dot: string; cell: string }> = {
  none: { chip: "bg-amber-400/10 text-amber-200 border-amber-400/25", dot: "bg-amber-300", cell: "" },
  light: { chip: "bg-sky-400/10 text-sky-200 border-sky-400/30", dot: "bg-sky-300", cell: "bg-sky-500/[0.06]" },
  moderate: { chip: "bg-sky-500/15 text-sky-100 border-sky-400/40", dot: "bg-sky-400", cell: "bg-sky-500/[0.10]" },
  heavy: { chip: "bg-blue-500/20 text-blue-100 border-blue-400/50", dot: "bg-blue-400", cell: "bg-blue-500/[0.14]" },
  thunder: { chip: "bg-violet-500/20 text-violet-100 border-violet-400/50", dot: "bg-violet-400", cell: "bg-violet-500/[0.14]" },
};

export function rainLabel(level: string, t: TFn): string {
  switch (level) {
    case "light":
      return t("act.rain.light", "Hujan ringan");
    case "moderate":
      return t("act.rain.moderate", "Hujan sedang");
    case "heavy":
      return t("act.rain.heavy", "Hujan lebat");
    case "thunder":
      return t("act.rain.thunder", "Hujan petir");
    default:
      return t("act.rain.none", "Tidak hujan");
  }
}

export function skyLabel(sky: string | null, t: TFn): string {
  switch (sky) {
    case "clear":
      return t("act.sky.clear", "Cerah");
    case "partly":
      return t("act.sky.partly", "Cerah berawan");
    case "cloudy":
      return t("act.sky.cloudy", "Berawan");
    case "fog":
      return t("act.sky.fog", "Berkabut");
    case "haze":
      return t("act.sky.haze", "Udara kabur");
    case "rain":
      return t("act.rain.light", "Hujan ringan");
    case "thunder":
      return t("act.rain.thunder", "Hujan petir");
    default:
      return "—";
  }
}

/** Label slot: BMKG sudah memberi teks Indonesia & Inggris; bahasa lain memakai kamus dari kondisi. */
export function slotLabel(s: WeatherSlot, lang: string, t: TFn): string {
  if (lang === "id" && s.descId) return s.descId;
  if (lang === "en" && s.descEn) return s.descEn;
  return s.rain !== "none" ? rainLabel(s.rain, t) : skyLabel(s.sky, t);
}

export function WeatherIcon({ sky, rain, size = 16, className = "" }: { sky?: string | null; rain?: string | null; size?: number; className?: string }) {
  if (rain === "thunder" || sky === "thunder") return <CloudLightning size={size} className={`text-violet-300 ${className}`} />;
  if ((rain && rain !== "none") || sky === "rain") return <CloudRain size={size} className={`text-sky-300 ${className}`} />;
  if (sky === "fog") return <CloudFog size={size} className={`text-neutral-300 ${className}`} />;
  if (sky === "haze") return <Haze size={size} className={`text-neutral-300 ${className}`} />;
  if (sky === "cloudy") return <Cloud size={size} className={`text-neutral-300 ${className}`} />;
  if (sky === "partly") return <CloudSun size={size} className={`text-amber-200 ${className}`} />;
  return <Sun size={size} className={`text-amber-300 ${className}`} />;
}

/* ---------------------------------------------- pertandingan ---------------------------------------------- */

export function statusLabel(status: string, t: TFn): string {
  switch (status) {
    case "scheduled":
      return t("act.status.scheduled", "Terjadwal");
    case "live":
      return t("act.status.live", "Berlangsung");
    case "finished":
      return t("act.status.finished", "Selesai");
    case "postponed":
      return t("act.status.postponed", "Ditunda");
    case "cancelled":
      return t("act.status.cancelled", "Dibatalkan");
    default:
      return t("act.status.unknown", "Status belum ada");
  }
}

export function bucketLabel(bucket: string, t: TFn): string {
  switch (bucket) {
    case "morning":
      return t("act.bucket.morning", "Pagi");
    case "afternoon":
      return t("act.bucket.afternoon", "Siang–sore");
    case "evening":
      return t("act.bucket.evening", "Malam");
    default:
      return t("act.bucket.late_night", "Dini hari");
  }
}

export const isPrime = (m: CalendarMatch) => {
  const h = Number(m.localTime.slice(0, 2));
  return h >= 15 && h <= 23;
};

export const STATUS_STYLE: Record<string, string> = {
  scheduled: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  live: "text-rose-100 bg-rose-500/20 border-rose-400/50 animate-pulse",
  finished: "text-neutral-300 bg-white/5 border-white/10",
  postponed: "text-amber-200 bg-amber-500/10 border-amber-400/30",
  cancelled: "text-neutral-400 bg-white/5 border-white/10 line-through",
  unknown: "text-neutral-400 bg-white/5 border-white/10",
};

/** Label sumber data (Aktual / Prakiraan / Arsip / Jadwal / Prediksi) — selalu tampil di samping angka. */
export function SourceTag({ kind, t }: { kind: "forecast" | "archive" | "actual" | "prediction" | "schedule"; t: TFn }) {
  const map = {
    forecast: ["act.src.forecast", "Prakiraan", "border-sky-400/40 text-sky-200"],
    archive: ["act.src.archive", "Arsip prakiraan", "border-white/15 text-neutral-400"],
    actual: ["act.src.actual", "Aktual", "border-emerald-400/40 text-emerald-200"],
    prediction: ["act.src.prediction", "Prediksi", "border-fuchsia-400/40 text-fuchsia-200 border-dashed"],
    schedule: ["act.src.schedule", "Jadwal", "border-lime-400/40 text-lime-200"],
  } as const;
  const [k, fb, cls] = map[kind];
  return <span className={`inline-flex shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${cls}`}>{t(k, fb)}</span>;
}

/* ---------------------------------------------- libur nasional & kalender akademik ---------------------------------------------- */

/** Libur yang benar-benar meliburkan (sama dengan holiday-rules.isDayOff — tanpa impor modul server). */
export const isDayOffKind = (kind: string) => kind === "public" || kind === "joint_leave";
export const isExamKind = (kind: string) => kind === "midterm" || kind === "final_exam";

export function holidayKindLabel(kind: string, t: TFn): string {
  switch (kind) {
    case "public":
      return t("act.hol.kind.public", "Libur nasional");
    case "joint_leave":
      return t("act.hol.kind.joint", "Cuti bersama");
    case "observance":
      return t("act.hol.kind.observance", "Hari peringatan (bukan libur)");
    default:
      return t("act.hol.kind.other", "Hari khusus");
  }
}

export const HOLIDAY_STYLE: Record<string, string> = {
  public: "border-rose-400/40 bg-rose-500/15 text-rose-100",
  joint_leave: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  observance: "border-white/15 bg-white/[0.04] text-neutral-300",
  other: "border-white/15 bg-white/[0.04] text-neutral-300",
};

export const ACADEMIC_STYLE: Record<string, string> = {
  school_holiday: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  midterm: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  final_exam: "border-amber-400/50 bg-amber-500/20 text-amber-50",
  other: "border-indigo-400/40 bg-indigo-500/15 text-indigo-100",
};

export function academicKindLabel(kind: string, t: TFn): string {
  switch (kind) {
    case "school_holiday":
      return t("act.acad.kind.holiday", "Libur sekolah/kuliah");
    case "midterm":
      return t("act.acad.kind.midterm", "UTS (tengah semester)");
    case "final_exam":
      return t("act.acad.kind.final", "UAS (akhir semester)");
    default:
      return t("act.acad.kind.other", "Kegiatan akademik lain");
  }
}

/** Label pendek untuk sel kalender: "UTS", "UAS", "Libur". */
export function academicShort(kind: string, t: TFn): string {
  switch (kind) {
    case "school_holiday":
      return t("act.acad.short.holiday", "Libur");
    case "midterm":
      return t("act.acad.short.midterm", "UTS");
    case "final_exam":
      return t("act.acad.short.final", "UAS");
    default:
      return t("act.acad.short.other", "Akademik");
  }
}

export function academicLevelLabel(level: string, t: TFn): string {
  switch (level) {
    case "sd":
      return t("act.acad.level.sd", "SD");
    case "smp":
      return t("act.acad.level.smp", "SMP");
    case "sma":
      return t("act.acad.level.sma", "SMA/SMK");
    case "kuliah":
      return t("act.acad.level.kuliah", "Kuliah");
    default:
      return t("act.acad.level.all", "Semua jenjang");
  }
}

export function countryName(code: string, t: TFn): string {
  const names: Record<string, [string, string]> = {
    ID: ["act.country.ID", "Indonesia"],
    MY: ["act.country.MY", "Malaysia"],
    SG: ["act.country.SG", "Singapura"],
    TH: ["act.country.TH", "Thailand"],
    PH: ["act.country.PH", "Filipina"],
    VN: ["act.country.VN", "Vietnam"],
    BN: ["act.country.BN", "Brunei"],
    KH: ["act.country.KH", "Kamboja"],
    LA: ["act.country.LA", "Laos"],
    MM: ["act.country.MM", "Myanmar"],
    TL: ["act.country.TL", "Timor Leste"],
  };
  const n = names[code];
  return n ? t(n[0], n[1]) : code;
}
