/**
 * Kalender akademik outlet (activity_academic_events) dan preferensi libur (outlet_calendar_prefs).
 * Semua query dibatasi outletId sesi. Sebelum migrasi 0040 dijalankan, pembacaan mengembalikan nilai
 * kosong/bawaan (isMissingRelation) supaya Kalender Bisnis tetap jalan.
 */
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { activityAcademicEvents, outletCalendarPrefs, outlets } from "@/db/schema";
import { isMissingRelation } from "./http";
import { effectiveHolidayCountry } from "./holiday-rules";
import type { AcademicInput } from "./academic-rules";

export interface CalendarPrefs {
  /** Pilihan outlet (null = ikut negara outlet). */
  holidayCountry: string | null;
  /** Negara yang dipakai: pilihan → negara outlet → ID. */
  effectiveCountry: string;
  outletCountry: string | null;
  showHolidays: boolean;
  showAcademic: boolean;
  /** Provinsi outlet (Profil Outlet) — untuk keterangan kalender akademik. */
  province: string | null;
  /** false = migrasi 0040 belum dijalankan. */
  ready: boolean;
}

export async function getCalendarPrefs(outletId: string): Promise<CalendarPrefs> {
  const [o] = await db.select({ country: outlets.outletCountry, province: outlets.province }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const outletCountry = o?.country ?? null;
  try {
    const [row] = await db.select().from(outletCalendarPrefs).where(eq(outletCalendarPrefs.outletId, outletId)).limit(1);
    return {
      holidayCountry: row?.holidayCountry ?? null,
      effectiveCountry: effectiveHolidayCountry(row?.holidayCountry, outletCountry),
      outletCountry,
      showHolidays: row?.showHolidays ?? true,
      showAcademic: row?.showAcademic ?? true,
      province: o?.province ?? null,
      ready: true,
    };
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return { holidayCountry: null, effectiveCountry: effectiveHolidayCountry(null, outletCountry), outletCountry, showHolidays: true, showAcademic: true, province: o?.province ?? null, ready: false };
  }
}

export async function saveCalendarPrefs(outletId: string, patch: { holidayCountry: string | null; showHolidays: boolean; showAcademic: boolean }, by: string) {
  const now = new Date().toISOString();
  const values = { holidayCountry: patch.holidayCountry, showHolidays: patch.showHolidays, showAcademic: patch.showAcademic, updatedBy: by, updatedAt: now };
  await db.insert(outletCalendarPrefs).values({ outletId, ...values }).onConflictDoUpdate({ target: outletCalendarPrefs.outletId, set: values });
}

export interface AcademicEvent {
  id: string;
  level: string;
  kind: string;
  title: string;
  startDate: string;
  endDate: string;
  province: string | null;
  note: string | null;
  createdBy: string | null;
  updatedAt: string;
}

const cols = {
  id: activityAcademicEvents.id,
  level: activityAcademicEvents.level,
  kind: activityAcademicEvents.kind,
  title: activityAcademicEvents.title,
  startDate: activityAcademicEvents.startDate,
  endDate: activityAcademicEvents.endDate,
  province: activityAcademicEvents.province,
  note: activityAcademicEvents.note,
  createdBy: activityAcademicEvents.createdBy,
  updatedAt: activityAcademicEvents.updatedAt,
};

/** Kegiatan akademik outlet yang beririsan dengan [from, to]. */
export async function academicBetween(outletId: string, from: string, to: string): Promise<AcademicEvent[]> {
  try {
    return await db
      .select(cols)
      .from(activityAcademicEvents)
      .where(and(eq(activityAcademicEvents.outletId, outletId), lte(activityAcademicEvents.startDate, to), gte(activityAcademicEvents.endDate, from)))
      .orderBy(asc(activityAcademicEvents.startDate), asc(activityAcademicEvents.level))
      .limit(500);
  } catch (err) {
    if (isMissingRelation(err)) return [];
    throw err;
  }
}

export async function createAcademic(outletId: string, input: AcademicInput, province: string | null, by: string): Promise<AcademicEvent> {
  const [row] = await db
    .insert(activityAcademicEvents)
    .values({ outletId, ...input, province, createdBy: by })
    .returning(cols);
  return row;
}

/** Ubah kegiatan milik outlet ini; null bila tidak ditemukan (atau milik outlet lain). */
export async function updateAcademic(outletId: string, id: string, input: AcademicInput): Promise<AcademicEvent | null> {
  const [row] = await db
    .update(activityAcademicEvents)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(activityAcademicEvents.id, id), eq(activityAcademicEvents.outletId, outletId)))
    .returning(cols);
  return row ?? null;
}

export async function deleteAcademic(outletId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(activityAcademicEvents)
    .where(and(eq(activityAcademicEvents.id, id), eq(activityAcademicEvents.outletId, outletId)))
    .returning({ id: activityAcademicEvents.id });
  return rows.length > 0;
}
