/**
 * Libur nasional negara ASEAN dari kalender publik Google Calendar ("Holidays in <negara>") — aturan
 * MURNI (diuji di holiday-rules.test.ts). Pengambilan ada di holidays.ts.
 *
 * Sumber: Google Calendar API v3 `events.list` pada kalender publik
 *   "{lang}.{nama}#holiday@group.v.calendar.google.com"
 * dengan API key (env GOOGLE_CALENDAR_API_KEY), atau — tanpa key — feed iCal publik kalender yang sama
 *   https://calendar.google.com/calendar/ical/{id}/public/basic.ics
 *
 * Klasifikasi memakai kalender bahasa Inggris (deskripsi Google: "Public holiday" / "Observance"); nama
 * yang ditampilkan memakai kalender bahasa negara itu bila ada (mis. "Hari Kemerdekaan" untuk Indonesia),
 * dicocokkan lewat UID event — UID sama di semua bahasa.
 */

export type HolidayKind = "public" | "joint_leave" | "observance" | "other";

export interface HolidayCountry {
  code: string;
  /** Bagian nama kalender Google ("indonesian" → en.indonesian#holiday@…). */
  gcal: string;
  /** Bahasa kalender lokal untuk nama libur; null = pakai Inggris. */
  localLang: string | null;
}

/** 11 negara Asia Tenggara. Nama kalender per data kalender publik Google (dicek ulang saat sinkron). */
export const HOLIDAY_COUNTRIES: HolidayCountry[] = [
  { code: "ID", gcal: "indonesian", localLang: "id" },
  { code: "MY", gcal: "malaysia", localLang: null },
  { code: "SG", gcal: "singapore", localLang: null },
  { code: "TH", gcal: "th", localLang: "th" },
  { code: "PH", gcal: "philippines", localLang: null },
  { code: "VN", gcal: "vietnamese", localLang: "vi" },
  { code: "BN", gcal: "bn", localLang: null },
  { code: "KH", gcal: "kh", localLang: null },
  { code: "LA", gcal: "la", localLang: null },
  { code: "MM", gcal: "mm", localLang: null },
  { code: "TL", gcal: "tl", localLang: null },
];

export const HOLIDAY_COUNTRY_CODES = HOLIDAY_COUNTRIES.map((c) => c.code);

export function holidayCountry(code: string | null | undefined): HolidayCountry | null {
  const c = (code ?? "").toUpperCase();
  return HOLIDAY_COUNTRIES.find((x) => x.code === c) ?? null;
}

/** Negara libur efektif outlet: pilihan di Kalender Bisnis → negara outlet → Indonesia. */
export function effectiveHolidayCountry(pref: string | null | undefined, outletCountry: string | null | undefined): string {
  return holidayCountry(pref)?.code ?? holidayCountry(outletCountry)?.code ?? "ID";
}

export function googleCalendarId(lang: string, gcal: string): string {
  return `${lang}.${gcal}#holiday@group.v.calendar.google.com`;
}

export interface RawHoliday {
  uid: string;
  summary: string;
  description: string;
  /** Tanggal mulai (YYYY-MM-DD). */
  start: string;
  /** Tanggal akhir EKSKLUSIF (YYYY-MM-DD), seperti di iCal/Google. */
  endExclusive: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function icsDate(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
  if (!m) return null;
  const d = `${m[1]}-${m[2]}-${m[3]}`;
  return Number.isNaN(Date.parse(`${d}T00:00:00Z`)) ? null : d;
}

function icsUnescape(v: string): string {
  return v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** Mengurai feed iCal (RFC 5545) Google: VEVENT dengan DTSTART;VALUE=DATE, SUMMARY, DESCRIPTION, UID. */
export function parseIcs(text: string): RawHoliday[] {
  // Baris lanjutan (diawali spasi/tab) disambung ke baris sebelumnya.
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: RawHoliday[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const start = cur.DTSTART ? icsDate(cur.DTSTART) : null;
        const end = cur.DTEND ? icsDate(cur.DTEND) : null;
        if (start && cur.UID && cur.SUMMARY) {
          out.push({ uid: cur.UID, summary: icsUnescape(cur.SUMMARY), description: icsUnescape(cur.DESCRIPTION ?? ""), start, endExclusive: end && end > start ? end : addDays(start, 1) });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const name = line.slice(0, idx).split(";")[0].toUpperCase();
    if (["DTSTART", "DTEND", "SUMMARY", "DESCRIPTION", "UID"].includes(name)) cur[name] = line.slice(idx + 1);
  }
  return out;
}

/** Mengurai respons Google Calendar API v3 events.list (hanya event sepanjang hari). */
export function parseApiEvents(json: unknown): RawHoliday[] {
  const items = (json as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items)) return [];
  const out: RawHoliday[] = [];
  for (const it of items) {
    const e = it as { id?: unknown; iCalUID?: unknown; summary?: unknown; description?: unknown; status?: unknown; start?: { date?: unknown }; end?: { date?: unknown } };
    if (e.status === "cancelled") continue;
    const start = typeof e.start?.date === "string" && DATE_RE.test(e.start.date) ? e.start.date : null;
    const end = typeof e.end?.date === "string" && DATE_RE.test(e.end.date) ? e.end.date : null;
    const uid = typeof e.iCalUID === "string" ? e.iCalUID : typeof e.id === "string" ? e.id : null;
    const summary = typeof e.summary === "string" ? e.summary.trim() : "";
    if (!start || !uid || !summary) continue;
    out.push({ uid, summary, description: typeof e.description === "string" ? e.description.trim() : "", start, endExclusive: end && end > start ? end : addDays(start, 1) });
  }
  return out;
}

const JOINT_LEAVE_RE = /cuti bersama|joint (leave|holiday)|collective leave/i;

/**
 * Jenis libur dari event kalender bahasa Inggris. Google menulis "Public holiday" untuk hari libur resmi
 * dan "Observance" untuk hari peringatan (bukan hari libur); cuti bersama Indonesia dikenali dari namanya.
 */
export function classifyHoliday(summary: string, description: string): HolidayKind {
  if (JOINT_LEAVE_RE.test(summary) || JOINT_LEAVE_RE.test(description)) return "joint_leave";
  const d = description.toLowerCase();
  if (d.includes("public holiday") || d.includes("bank holiday") || d.includes("national holiday")) return "public";
  if (d.includes("observance")) return "observance";
  return "other";
}

/** Hari libur yang benar-benar meliburkan sekolah/kantor (dipakai insight & penanda merah). */
export function isDayOff(kind: string): boolean {
  return kind === "public" || kind === "joint_leave";
}

export interface HolidayRow {
  id: string;
  country: string;
  date: string;
  endDate: string;
  name: string;
  nameEn: string | null;
  kind: HolidayKind;
}

/**
 * Gabungkan event Inggris (klasifikasi) dengan event bahasa lokal (nama). Event lokal dicocokkan lewat UID;
 * bila UID berbeda, lewat tanggal yang sama (hanya bila di tanggal itu ada tepat satu event).
 */
export function mergeHolidays(country: string, en: RawHoliday[], local: RawHoliday[] | null): HolidayRow[] {
  const byUid = new Map((local ?? []).map((l) => [l.uid, l]));
  const byDate = new Map<string, RawHoliday[]>();
  for (const l of local ?? []) byDate.set(l.start, [...(byDate.get(l.start) ?? []), l]);
  const enByDate = new Map<string, number>();
  for (const e of en) enByDate.set(e.start, (enByDate.get(e.start) ?? 0) + 1);
  const seen = new Set<string>();
  const rows: HolidayRow[] = [];
  for (const e of en) {
    const id = `${country}:${e.uid}`.slice(0, 200);
    if (seen.has(id)) continue;
    seen.add(id);
    const sameDate = byDate.get(e.start);
    const loc = byUid.get(e.uid) ?? (sameDate && sameDate.length === 1 && enByDate.get(e.start) === 1 ? sameDate[0] : undefined);
    rows.push({
      id,
      country,
      date: e.start,
      endDate: addDays(e.endExclusive, -1),
      name: (loc?.summary || e.summary).slice(0, 200),
      nameEn: e.summary.slice(0, 200),
      kind: classifyHoliday(e.summary, e.description),
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/** Jendela sinkron: 1 Januari tahun lalu s.d. 31 Desember tahun depan (analisis 90 hari + rencana ke depan). */
export function syncWindow(today: string): { from: string; to: string } {
  const y = Number(today.slice(0, 4));
  return { from: `${y - 1}-01-01`, to: `${y + 1}-12-31` };
}

/** Sinkron ulang tiap 24 jam; setelah gagal tunggu 1 jam. */
export const HOLIDAY_SYNC_EVERY_MS = 24 * 3_600_000;
export const HOLIDAY_RETRY_MS = 3_600_000;

export function holidayNeedsSync(lastSuccessAt: string | null | undefined, lastAttemptAt: string | null | undefined, nowMs: number): boolean {
  const ok = lastSuccessAt ? Date.parse(lastSuccessAt) : NaN;
  const tried = lastAttemptAt ? Date.parse(lastAttemptAt) : NaN;
  if (!Number.isNaN(tried) && nowMs - tried < HOLIDAY_RETRY_MS && (Number.isNaN(ok) || ok < tried)) return false;
  return Number.isNaN(ok) || nowMs - ok >= HOLIDAY_SYNC_EVERY_MS;
}

/** Semua tanggal (YYYY-MM-DD) yang dicakup event [date, endDate] dan beririsan dengan [from, to]. */
export function datesInRange(date: string, endDate: string, from: string, to: string): string[] {
  const out: string[] = [];
  const start = date < from ? from : date;
  const end = endDate > to ? to : endDate;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    out.push(d);
    if (out.length > 400) break;
  }
  return out;
}
