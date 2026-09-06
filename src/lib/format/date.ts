/**
 * Outlet display-format preference for dates. Set in Settings > Preferensi > Format Lainnya.
 * Built from the Date object's own components rather than toLocaleDateString(locale) — a locale
 * string picks a whole convention bundle (separators AND ordering AND sometimes script) that
 * doesn't map cleanly to "just these 3 presets", and its exact output can vary by JS runtime.
 * Manual formatting guarantees the separator/order the outlet actually picked, every time.
 */
export type DateFormatStyle = "dmy" | "mdy" | "iso";

export const DEFAULT_DATE_FORMAT: DateFormatStyle = "dmy";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `input` accepts anything `new Date()` accepts (ISO string, timestamp, Date) — returns "-" for an invalid/missing date rather than "Invalid Date". */
export function formatDate(input: string | number | Date | null | undefined, style: DateFormatStyle = DEFAULT_DATE_FORMAT): string {
  if (input == null) return "-";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  if (style === "mdy") return `${month}/${day}/${year}`;
  if (style === "iso") return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`; // dmy — default
}

/** Same as formatDate but appends a HH:mm time component — for timestamps (created_at, closed_at, etc) rather than pure calendar dates. */
export function formatDateTime(input: string | number | Date | null | undefined, style: DateFormatStyle = DEFAULT_DATE_FORMAT): string {
  if (input == null) return "-";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return `${formatDate(d, style)} ${time}`;
}
