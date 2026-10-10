/**
 * Daftar "Siap Buka Outlet" di Ringkasan — MURNI (diuji di checklist.test.ts). Setiap langkah
 * tercentang sendiri dari data outlet, jadi pemilik tidak perlu menandai apa pun: begitu tarif
 * diisi, shift pertama dibuka, dst., langkahnya selesai. Sumber urutan: Pusat Bantuan › Mulai
 * ("Langkah 1–10"), yang sebelumnya hanya bisa dibaca, tidak bisa dikerjakan dari dashboard.
 */

export type ChecklistKey = "profile" | "rates" | "payments" | "staff" | "devices" | "printer" | "products" | "shift" | "firstSession";

export interface ChecklistFacts {
  hasAddress: boolean;
  hasCountry: boolean;
  activeUnits: number;
  zeroRateUnits: number;
  /** Metode non-tunai aktif yang sudah punya QRIS atau rekening tujuan. */
  configuredNonCashMethods: number;
  /** Staf aktif selain pemilik/superuser. */
  staffCount: number;
  /** Smart plug, TV Screensaver/aplikasi TV, atau Relay Agent. */
  controlDevices: number;
  hasPrinter: boolean;
  products: number;
  shifts: number;
  sessions: number;
}

export interface ChecklistItem {
  key: ChecklistKey;
  done: boolean;
  required: boolean;
  href: string;
}

export interface Checklist {
  items: ChecklistItem[];
  done: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  allRequiredDone: boolean;
  allDone: boolean;
}

export function buildChecklist(f: ChecklistFacts): Checklist {
  const items: ChecklistItem[] = [
    { key: "profile", required: true, done: f.hasAddress && f.hasCountry, href: "/dashboard/settings" },
    { key: "rates", required: true, done: f.activeUnits > 0 && f.zeroRateUnits === 0, href: "/dashboard/rental?atur=tarif" },
    { key: "payments", required: false, done: f.configuredNonCashMethods > 0, href: "/dashboard/payments" },
    { key: "staff", required: false, done: f.staffCount > 0, href: "/dashboard/staff" },
    { key: "devices", required: false, done: f.controlDevices > 0, href: "/dashboard/devices" },
    { key: "printer", required: false, done: f.hasPrinter, href: "/dashboard/settings" },
    { key: "products", required: false, done: f.products > 0, href: "/dashboard/inventory" },
    { key: "shift", required: true, done: f.shifts > 0, href: "/dashboard/shift" },
    { key: "firstSession", required: true, done: f.sessions > 0, href: "/dashboard/rental" },
  ];
  const required = items.filter((i) => i.required);
  const done = items.filter((i) => i.done).length;
  const requiredDone = required.filter((i) => i.done).length;
  return {
    items,
    done,
    total: items.length,
    requiredDone,
    requiredTotal: required.length,
    allRequiredDone: requiredDone === required.length,
    allDone: done === items.length,
  };
}
