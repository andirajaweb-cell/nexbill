import { saveClock } from "./store";

/**
 * Status koneksi untuk Mode Offline. Tidak bisa mengandalkan navigator.onLine saja: saat WiFi outlet
 * masih tersambung ke router tapi internetnya putus (kasus paling umum), browser tetap "online".
 * Jadi perangkat aktif memanggil GET /api/offline/ping: dianggap OFFLINE setelah 2 kali gagal
 * berturut-turut (atau langsung saat browser sendiri melapor offline), dan ONLINE lagi begitu satu
 * ping berhasil. Setiap ping yang berhasil sekaligus memperbarui selisih jam perangkat vs server.
 */

export type ConnectivityState = { online: boolean; checkedAt: number };

const PING_TIMEOUT_MS = 6000;
const INTERVAL_ONLINE_MS = 20_000;
const INTERVAL_OFFLINE_MS = 7_000;
const FAILURES_TO_OFFLINE = 2;

let state: ConnectivityState = { online: true, checkedAt: 0 };
let failures = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = 0;
const listeners = new Set<() => void>();

function set(online: boolean) {
  const changed = online !== state.online;
  state = { online, checkedAt: Date.now() };
  if (changed) listeners.forEach((l) => l());
}

/** Satu ping ke server; true bila server menjawab. */
export async function probe(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    failures = FAILURES_TO_OFFLINE;
    set(false);
    return false;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(`/api/offline/ping?t=${startedAt}`, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { serverTime?: string };
    if (body.serverTime) saveClock(body.serverTime, Date.now() - startedAt);
    failures = 0;
    set(true);
    return true;
  } catch {
    failures += 1;
    if (failures >= FAILURES_TO_OFFLINE) set(false);
    return false;
  } finally {
    clearTimeout(t);
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    await probe();
    schedule();
  }, state.online ? INTERVAL_ONLINE_MS : INTERVAL_OFFLINE_MS);
}

const onBrowserOffline = () => {
  failures = FAILURES_TO_OFFLINE;
  set(false);
  schedule();
};
const onBrowserOnline = () => {
  void probe().then(schedule);
};

/** Mulai memantau (sekali per halaman; aman dipanggil berkali-kali). Mengembalikan fungsi berhenti. */
export function startConnectivityMonitor(): () => void {
  started += 1;
  if (started === 1 && typeof window !== "undefined") {
    window.addEventListener("offline", onBrowserOffline);
    window.addEventListener("online", onBrowserOnline);
    void probe().then(schedule);
  }
  return () => {
    started -= 1;
    if (started === 0 && typeof window !== "undefined") {
      window.removeEventListener("offline", onBrowserOffline);
      window.removeEventListener("online", onBrowserOnline);
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}

/** Laporkan permintaan API yang gagal karena jaringan — mempercepat deteksi offline. */
export function reportNetworkFailure() {
  void probe();
}

export const getConnectivity = () => state;
export function subscribeConnectivity(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
