/**
 * Kalender akademik outlet — aturan MURNI (diuji di holiday-rules.test.ts).
 *
 * Kalender pendidikan Indonesia ditetapkan per provinsi (dinas pendidikan) dan per kampus, jadi untuk
 * sementara setiap outlet mengisi sendiri: libur sekolah/kuliah, UTS (ujian tengah semester), dan UAS
 * (ujian akhir semester) untuk SD, SMP, SMA/SMK, atau kuliah.
 */

export const ACADEMIC_LEVELS = ["all", "sd", "smp", "sma", "kuliah"] as const;
export const ACADEMIC_KINDS = ["school_holiday", "midterm", "final_exam", "other"] as const;
export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number];
export type AcademicKind = (typeof ACADEMIC_KINDS)[number];

/** Satu kegiatan paling panjang 120 hari (mis. libur semester genap ± 4 minggu, semester kuliah tidak). */
export const ACADEMIC_MAX_DAYS = 120;
export const ACADEMIC_TITLE_MAX = 120;
export const ACADEMIC_NOTE_MAX = 300;

export interface AcademicInput {
  level: AcademicLevel;
  kind: AcademicKind;
  title: string;
  startDate: string;
  endDate: string;
  note: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s: unknown): s is string {
  return typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Judul bawaan bila outlet tidak mengisi (mis. "UTS SMP"). Bahasa Indonesia — data milik outlet. */
export function defaultAcademicTitle(level: AcademicLevel, kind: AcademicKind): string {
  if (kind === "school_holiday" && level === "kuliah") return "Libur kuliah";
  const lv = level === "all" ? "" : level === "kuliah" ? " Kuliah" : level === "sma" ? " SMA/SMK" : ` ${level.toUpperCase()}`;
  const k = kind === "school_holiday" ? "Libur sekolah" : kind === "midterm" ? "UTS" : kind === "final_exam" ? "UAS" : "Kegiatan akademik";
  return `${k}${lv}`;
}

/** Validasi & bersihkan masukan dari dashboard. Pesan galat dalam bahasa Indonesia (tampil di toast). */
export function parseAcademicInput(raw: unknown): { ok: true; value: AcademicInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const level = ACADEMIC_LEVELS.includes(r.level as AcademicLevel) ? (r.level as AcademicLevel) : null;
  const kind = ACADEMIC_KINDS.includes(r.kind as AcademicKind) ? (r.kind as AcademicKind) : null;
  if (!level) return { ok: false, error: "Pilih jenjang: semua, SD, SMP, SMA/SMK, atau kuliah." };
  if (!kind) return { ok: false, error: "Pilih jenis: libur, UTS, UAS, atau lainnya." };
  if (!validDate(r.startDate) || !validDate(r.endDate)) return { ok: false, error: "Tanggal mulai dan selesai wajib diisi (YYYY-MM-DD)." };
  const startDate = r.startDate;
  const endDate = r.endDate;
  if (endDate < startDate) return { ok: false, error: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
  if (daysBetween(startDate, endDate) + 1 > ACADEMIC_MAX_DAYS) return { ok: false, error: `Satu kegiatan paling panjang ${ACADEMIC_MAX_DAYS} hari — pecah menjadi beberapa kegiatan.` };
  const title = (typeof r.title === "string" ? r.title.trim().replace(/\s+/g, " ") : "").slice(0, ACADEMIC_TITLE_MAX) || defaultAcademicTitle(level, kind);
  const noteRaw = typeof r.note === "string" ? r.note.trim().slice(0, ACADEMIC_NOTE_MAX) : "";
  return { ok: true, value: { level, kind, title, startDate, endDate, note: noteRaw || null } };
}

/** Ujian (UTS/UAS) — pelajar biasanya lebih jarang main; libur — biasanya lebih ramai. */
export function isExam(kind: string): boolean {
  return kind === "midterm" || kind === "final_exam";
}
