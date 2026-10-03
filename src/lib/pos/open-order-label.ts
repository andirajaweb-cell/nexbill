/**
 * Keterangan waktu untuk satu baris "Order Terbuka" di Kasir: tanggal, jam mulai–selesai, dan
 * lama main sesi Rental PS — supaya kasir tahu tagihan ini dari unit mana & kapan.
 * Murni (tanpa DOM/DB), diuji di open-order-label.test.ts. Jam memakai zona waktu perangkat
 * kasir, sama seperti tampilan tanggal lain di dashboard.
 */
import { formatDate, type DateFormatStyle } from "@/lib/format/date";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hhmm(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function valid(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2j 5m", "45m", "3j" — durasi ringkas. Satuan jam/menit bisa diganti untuk bahasa lain. */
export function formatDurationShort(ms: number, units: { h: string; m: string } = { h: "j", m: "m" }): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}${units.m}`;
  if (m === 0) return `${h}${units.h}`;
  return `${h}${units.h} ${m}${units.m}`;
}

export interface OrderTimeLabel {
  /** Tanggal mulai, mis. "03/10/2026". */
  date: string;
  /** "14:05–16:10", "14:05–(+1) 01:10" bila lewat tengah malam, atau "14:05" bila belum selesai. */
  timeRange: string;
  /** Lama sesi ("2j 5m"), kosong bila belum ada jam selesai. */
  duration: string;
}

export function buildOrderTimeLabel(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
  opts: { dateStyle?: DateFormatStyle; units?: { h: string; m: string } } = {},
): OrderTimeLabel | null {
  const start = valid(startedAt);
  if (!start) return null;
  const end = valid(endedAt);
  const date = formatDate(start, opts.dateStyle);
  if (!end || end.getTime() < start.getTime()) return { date, timeRange: hhmm(start), duration: "" };
  const dayDiff = Math.round(
    (new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 86400000,
  );
  const endText = dayDiff > 0 ? `(+${dayDiff}) ${hhmm(end)}` : hhmm(end);
  return { date, timeRange: `${hhmm(start)}–${endText}`, duration: formatDurationShort(end.getTime() - start.getTime(), opts.units) };
}
