import { outletDateYmd } from "@/lib/time/outlet-time";

/** Satu baris audit log "demo_login" (afterData = JSON { visitor, device, country, source }). */
export interface DemoLoginRow {
  createdAt: string;
  afterData: string | null;
}

export interface DemoAccessStats {
  today: number;
  last7Days: number;
  last30Days: number;
  uniqueToday: number;
  unique30Days: number;
  lastLoginAt: string | null;
  /** 30 hari terakhir (WIB), terlama → terbaru, termasuk hari tanpa login (0). */
  daily: { date: string; count: number }[];
  topDevices: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

function parse(after: string | null): { visitor?: string; device?: string; country?: string | null } {
  if (!after) return {};
  try {
    return JSON.parse(after);
  } catch {
    return {};
  }
}

/** Statistik login akun demo; "hari" = tanggal kalender WIB (outlet-time.ts). */
export function computeDemoStats(rows: DemoLoginRow[], now = new Date()): DemoAccessStats {
  const todayKey = outletDateYmd(now);
  const dayMs = 86_400_000;
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) keys.push(outletDateYmd(new Date(now.getTime() - i * dayMs)));
  const in7 = new Set(keys.slice(-7));
  const in30 = new Set(keys);

  const perDay = new Map<string, number>(keys.map((k) => [k, 0]));
  const visitorsToday = new Set<string>();
  const visitors30 = new Set<string>();
  const devices = new Map<string, number>();
  const countries = new Map<string, number>();
  let today = 0;
  let last7Days = 0;
  let last30Days = 0;
  let lastLoginAt: string | null = null;

  for (const r of rows) {
    const key = outletDateYmd(new Date(r.createdAt));
    if (!lastLoginAt || r.createdAt > lastLoginAt) lastLoginAt = r.createdAt;
    if (!in30.has(key)) continue;
    const a = parse(r.afterData);
    last30Days++;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    if (in7.has(key)) last7Days++;
    if (a.visitor) visitors30.add(a.visitor);
    if (key === todayKey) {
      today++;
      if (a.visitor) visitorsToday.add(a.visitor);
    }
    const dev = a.device || "Tidak diketahui";
    devices.set(dev, (devices.get(dev) ?? 0) + 1);
    const c = a.country || "—";
    countries.set(c, (countries.get(c) ?? 0) + 1);
  }

  const top = (m: Map<string, number>) => [...m].sort((x, y) => y[1] - x[1]).slice(0, 5);
  return {
    today,
    last7Days,
    last30Days,
    uniqueToday: visitorsToday.size,
    unique30Days: visitors30.size,
    lastLoginAt,
    daily: keys.map((date) => ({ date, count: perDay.get(date) ?? 0 })),
    topDevices: top(devices).map(([device, count]) => ({ device, count })),
    topCountries: top(countries).map(([country, count]) => ({ country, count })),
  };
}
