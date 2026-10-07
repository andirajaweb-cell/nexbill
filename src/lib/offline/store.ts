import type { OfflineAction, SyncActionResult, SyncNoteCode } from "./protocol";
import type { OfflineSnapshot } from "./engine";

/**
 * Penyimpanan Mode Offline di perangkat (localStorage, per outlet). Kecil dan sinkron — antrean
 * aksi kasir jarang lebih dari beberapa ratus baris. Setiap akses dibungkus try/catch: storage bisa
 * diblokir (mode privat, kuota penuh) dan Mode Offline tidak boleh membuat halaman crash.
 *
 * Yang disimpan:
 *  - snapshot   : data terakhir dari GET /api/offline/snapshot (unit, sesi aktif, tarif, produk…)
 *  - queue      : aksi offline yang belum berhasil disinkronkan, urut sesuai waktu direkam
 *  - clock      : selisih jam server − jam perangkat, diukur setiap kali online
 *  - report     : hasil sinkron terakhir (untuk ditampilkan ke kasir)
 */

export interface QueuedAction {
  action: OfflineAction;
  /** Error terakhir dari server; undefined = belum pernah gagal. */
  error?: string;
  attempts: number;
}

export interface SyncReportNote {
  sessionId: string;
  kind: string;
  /** Teks Indonesia dari server; dipakai bila `code` tidak ada (laporan lama). */
  note: string;
  code?: SyncNoteCode;
  amount?: number;
}

export interface SyncReport {
  at: string;
  done: number;
  failed: number;
  notes: SyncReportNote[];
  clockFlagged: boolean;
}

const PREFIX = "nexbill_offline";
const k = (name: string, outletId?: string) => (outletId ? `${PREFIX}_${name}:${outletId}` : `${PREFIX}_${name}`);
export const OFFLINE_CHANGE_EVENT = "nexbill-offline-change";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(OFFLINE_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Outlet yang terakhir aktif di perangkat ini — dipakai saat data login tidak bisa diambil (offline). */
export const getLastOutletId = () => read<string>(k("outlet"));
export const setLastOutletId = (outletId: string) => {
  if (getLastOutletId() !== outletId) write(k("outlet"), outletId);
};

export const getSnapshot = (outletId: string) => read<OfflineSnapshot>(k("snapshot", outletId));
export const saveSnapshot = (snapshot: OfflineSnapshot) => write(k("snapshot", snapshot.outlet.id), snapshot);

export const getQueue = (outletId: string): QueuedAction[] => read<QueuedAction[]>(k("queue", outletId)) ?? [];

/**
 * Menambah aksi ke antrean. Mengembalikan false bila gagal disimpan (storage penuh/diblokir) —
 * pemanggil WAJIB memberi tahu kasir, karena aksi itu tidak akan pernah sampai ke server.
 */
export function enqueue(outletId: string, action: OfflineAction): boolean {
  return write(k("queue", outletId), [...getQueue(outletId), { action, attempts: 0 }]);
}

/** Terapkan hasil sinkron: aksi done/duplicate dibuang, aksi gagal disimpan beserta errornya. */
export function applySyncResults(outletId: string, results: SyncActionResult[]) {
  const byId = new Map(results.map((r) => [r.id, r]));
  const next: QueuedAction[] = [];
  for (const q of getQueue(outletId)) {
    const r = byId.get(q.action.id);
    if (!r) next.push(q);
    else if (r.status === "failed") next.push({ ...q, error: r.error ?? "Gagal", attempts: q.attempts + 1 });
  }
  write(k("queue", outletId), next);
}

/** Buang aksi dari antrean (setelah kasir/owner meninjaunya). */
export function discardActions(outletId: string, actionIds: string[]) {
  const drop = new Set(actionIds);
  write(
    k("queue", outletId),
    getQueue(outletId).filter((q) => !drop.has(q.action.id))
  );
}

export interface ClockInfo {
  offsetMs: number;
  measuredAt: string;
}
export const getClock = () => read<ClockInfo>(k("clock"));
export const saveClock = (serverTimeIso: string, roundTripMs = 0) => {
  const serverMs = Date.parse(serverTimeIso);
  if (Number.isNaN(serverMs)) return;
  // Server time was taken roughly halfway through the request.
  const offsetMs = Math.round(serverMs + roundTripMs / 2 - Date.now());
  write(k("clock"), { offsetMs, measuredAt: new Date().toISOString() } satisfies ClockInfo);
};
/** Jam "server" menurut perangkat ini (jam perangkat + selisih terakhir yang diukur). */
export const serverNowMs = () => Date.now() + (getClock()?.offsetMs ?? 0);

export const getSyncReport = (outletId: string) => read<SyncReport>(k("report", outletId));
export const saveSyncReport = (outletId: string, report: SyncReport | null) => write(k("report", outletId), report);

/** Id acak perangkat ini (ditampilkan di Audit Log sebagai asal transaksi offline). */
export function deviceLabel(): string {
  let id = read<string>(k("device"));
  if (!id) {
    id = (globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 8);
    write(k("device"), id);
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const kind = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : "Web";
  return `${kind}-${id}`;
}

/** Bersihkan data offline outlet ini (dipanggil saat logout). Antrean yang belum terkirim TIDAK dihapus. */
export function clearSnapshot(outletId: string) {
  write(k("snapshot", outletId), null);
}

/** UUID v4 untuk aksi & sesi offline (crypto.randomUUID bila ada; WebView lama memakai getRandomValues). */
export function newUuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
