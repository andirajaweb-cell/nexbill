/**
 * Sinkron libur nasional ASEAN dari Google Calendar (lihat holiday-rules.ts) ke activity_holidays.
 * Satu sinkron per negara untuk SEMUA outlet (data publik), tiap 24 jam — dari scheduler VPS
 * (sync.ts) dan, sebagai cadangan, dari halaman Kalender Bisnis (after()).
 *
 *  - GOOGLE_CALENDAR_API_KEY ada → Google Calendar API v3 events.list (JSON).
 *  - Tanpa key → feed iCal publik kalender yang sama (tanpa autentikasi).
 * API key tidak pernah ditulis ke log (http.ts hanya mencatat host + path).
 */
import { and, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activityHolidays, activitySyncState } from "@/db/schema";
import { fetchJson, fetchText } from "./http";
import {
  googleCalendarId,
  holidayCountry,
  holidayNeedsSync,
  HOLIDAY_COUNTRY_CODES,
  mergeHolidays,
  parseApiEvents,
  parseIcs,
  syncWindow,
  type HolidayRow,
  type RawHoliday,
} from "./holiday-rules";

const API_BASE = (process.env.GOOGLE_CALENDAR_API_URL || "https://www.googleapis.com/calendar/v3").replace(/\/$/, "");
const ICAL_BASE = (process.env.GOOGLE_CALENDAR_ICAL_URL || "https://calendar.google.com/calendar/ical").replace(/\/$/, "");
const stateKey = (country: string) => `holidays_${country}`;

export function holidaysEnabled(): boolean {
  return (process.env.HOLIDAYS ?? "on").toLowerCase() !== "off";
}

function apiKey(): string | null {
  const k = (process.env.GOOGLE_CALENDAR_API_KEY ?? "").trim();
  return k || null;
}

async function fetchCalendar(calendarId: string, from: string, to: string): Promise<RawHoliday[]> {
  const key = apiKey();
  if (key) {
    const qs = new URLSearchParams({ key, singleEvents: "true", orderBy: "startTime", maxResults: "2500", timeMin: `${from}T00:00:00Z`, timeMax: `${to}T23:59:59Z` });
    const { json } = await fetchJson(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`, { label: "Google Calendar", timeoutMs: 10_000, retries: 1 });
    return parseApiEvents(json);
  }
  const text = await fetchText(`${ICAL_BASE}/${encodeURIComponent(calendarId)}/public/basic.ics`, { label: "Google Calendar iCal", timeoutMs: 12_000, retries: 1, headers: { Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.1" } });
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Google Calendar: respons bukan kalender");
  return parseIcs(text).filter((e) => e.start <= to && e.endExclusive > from);
}

async function readState(country: string) {
  const [row] = await db.select().from(activitySyncState).where(eq(activitySyncState.key, stateKey(country))).limit(1);
  return row ?? null;
}

async function writeState(country: string, patch: Partial<typeof activitySyncState.$inferInsert>) {
  const now = new Date().toISOString();
  await db
    .insert(activitySyncState)
    .values({ key: stateKey(country), ...patch, updatedAt: now })
    .onConflictDoUpdate({ target: activitySyncState.key, set: { ...patch, updatedAt: now } });
}

export async function holidaysDue(country: string): Promise<boolean> {
  if (!holidaysEnabled() || !holidayCountry(country)) return false;
  const st = await readState(country).catch(() => null);
  return holidayNeedsSync(st?.lastSuccessAt, st?.lastAttemptAt, Date.now());
}

/**
 * Ambil libur satu negara dan simpan. Baris di jendela sinkron yang tidak lagi ada di Google dihapus
 * (libur yang dipindah/dibatalkan pemerintah ikut terkoreksi).
 */
export async function syncHolidays(country: string): Promise<{ ok: boolean; count: number; error?: string }> {
  const c = holidayCountry(country);
  if (!c) return { ok: false, count: 0, error: "Negara tidak didukung." };
  const nowIso = new Date().toISOString();
  await writeState(c.code, { lastAttemptAt: nowIso });
  const { from, to } = syncWindow(nowIso.slice(0, 10));
  try {
    const en = await fetchCalendar(googleCalendarId("en", c.gcal), from, to);
    if (en.length === 0) throw new Error("Google Calendar tidak mengembalikan libur untuk negara ini.");
    let local: RawHoliday[] | null = null;
    if (c.localLang) {
      try {
        local = await fetchCalendar(googleCalendarId(c.localLang, c.gcal), from, to);
      } catch {
        local = null; // nama lokal tidak wajib — nama Inggris dipakai
      }
    }
    const rows: HolidayRow[] = mergeHolidays(c.code, en, local);
    const updatedAt = new Date().toISOString();
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200).map((r) => ({ ...r, updatedAt }));
      await db
        .insert(activityHolidays)
        .values(chunk)
        .onConflictDoUpdate({
          target: activityHolidays.id,
          set: { date: sql`excluded.date`, endDate: sql`excluded.end_date`, name: sql`excluded.name`, nameEn: sql`excluded.name_en`, kind: sql`excluded.kind`, updatedAt },
        });
    }
    const ids = rows.map((r) => r.id);
    await db
      .delete(activityHolidays)
      .where(and(eq(activityHolidays.country, c.code), gte(activityHolidays.date, from), lte(activityHolidays.date, to), ids.length ? notInArray(activityHolidays.id, ids) : undefined));
    await writeState(c.code, { lastSuccessAt: updatedAt, lastError: null, payload: JSON.stringify({ count: rows.length, source: apiKey() ? "api" : "ical", localNames: !!local?.length }) });
    return { ok: true, count: rows.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await writeState(c.code, { lastError: msg.slice(0, 300), lastErrorAt: new Date().toISOString() });
    return { ok: false, count: 0, error: msg };
  }
}

export interface StoredHoliday {
  id: string;
  date: string;
  endDate: string;
  name: string;
  nameEn: string | null;
  kind: string;
}

/** Libur negara yang beririsan dengan [from, to]. */
export async function holidaysBetween(country: string, from: string, to: string): Promise<StoredHoliday[]> {
  return db
    .select({ id: activityHolidays.id, date: activityHolidays.date, endDate: activityHolidays.endDate, name: activityHolidays.name, nameEn: activityHolidays.nameEn, kind: activityHolidays.kind })
    .from(activityHolidays)
    .where(and(eq(activityHolidays.country, country), lte(activityHolidays.date, to), gte(activityHolidays.endDate, from)))
    .orderBy(activityHolidays.date);
}

export async function holidayStatus(country: string) {
  const st = await readState(country).catch(() => null);
  let count: number | null = null;
  try {
    count = st?.payload ? (JSON.parse(st.payload) as { count?: number }).count ?? null : null;
  } catch {
    count = null;
  }
  return { lastSuccessAt: st?.lastSuccessAt ?? null, lastAttemptAt: st?.lastAttemptAt ?? null, lastError: st?.lastError ?? null, lastErrorAt: st?.lastErrorAt ?? null, count, enabled: holidaysEnabled() };
}

/** Negara yang dipakai outlet (untuk sinkron terjadwal): selalu Indonesia + negara yang dipilih outlet. */
export async function holidayCountriesInUse(): Promise<string[]> {
  const set = new Set<string>(["ID"]);
  try {
    const { outletCalendarPrefs, outlets } = await import("@/db/schema");
    const prefs = await db.selectDistinct({ c: outletCalendarPrefs.holidayCountry }).from(outletCalendarPrefs);
    for (const p of prefs) if (p.c && holidayCountry(p.c)) set.add(p.c.toUpperCase());
    const oc = await db.selectDistinct({ c: outlets.outletCountry }).from(outlets).where(inArray(outlets.outletCountry, HOLIDAY_COUNTRY_CODES));
    for (const o of oc) if (o.c) set.add(o.c.toUpperCase());
  } catch {
    /* tabel prefs belum ada — cukup Indonesia */
  }
  return [...set];
}
