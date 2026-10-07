/**
 * Mode Offline kasir rental — format aksi yang direkam perangkat kasir saat internet putus, lalu
 * dikirim ke POST /api/offline/sync begitu tersambung lagi. MURNI (tanpa db/DOM): dipakai klien
 * untuk merekam dan server untuk memvalidasi, jadi keduanya tidak bisa berbeda pendapat tentang
 * bentuk data.
 *
 * Prinsip:
 *  - Setiap aksi punya `id` UUID buatan perangkat → server menyimpannya (offline_sync_actions) dan
 *    menolak memproses ulang id yang sama. Mengirim ulang antrean (koneksi putus di tengah sinkron,
 *    tab ditutup, dsb.) tidak pernah menggandakan sesi atau pembayaran.
 *  - Sesi yang DIMULAI offline memakai `sessionId` UUID buatan perangkat, sehingga aksi lanjutan
 *    (tambah waktu, stop, bayar) bisa menunjuk sesi itu sebelum server pernah melihatnya.
 *  - `at` = waktu kejadian menurut jam server (jam perangkat + selisih jam yang diukur saat
 *    terakhir online). `clockOffsetMs` ikut dikirim supaya server bisa mendeteksi jam perangkat
 *    yang diubah selama offline (lihat CLOCK_TAMPER_THRESHOLD_MS).
 *  - Hanya pembayaran TUNAI yang bisa dicatat offline — QRIS/transfer butuh internet.
 */

export type OfflineActionKind = "start" | "extend" | "pause" | "resume" | "addItems" | "stop" | "payCash";

interface Base {
  /** UUID aksi (kunci idempotensi). */
  id: string;
  kind: OfflineActionKind;
  /** Waktu kejadian (ISO, sudah dikoreksi ke jam server). */
  at: string;
  /** Selisih jam server − jam perangkat (ms) yang dipakai saat aksi direkam. */
  clockOffsetMs: number;
  sessionId: string;
  /** Staf yang login di perangkat saat aksi direkam (atribusi & laci shift); diverifikasi server. */
  recordedBy?: string | null;
}

export interface StartAction extends Base {
  kind: "start";
  rentalUnitId: string;
  customerName?: string | null;
  gameName?: string | null;
  plannedMinutes?: number | null;
  promoId?: string | null;
}
export interface ExtendAction extends Base {
  kind: "extend";
  minutes: number;
}
export interface PauseAction extends Base {
  kind: "pause";
}
export interface ResumeAction extends Base {
  kind: "resume";
}
export interface AddItemsAction extends Base {
  kind: "addItems";
  items: { productId: string; qty: number }[];
}
export interface StopAction extends Base {
  kind: "stop";
}
export interface PayCashAction extends Base {
  kind: "payCash";
  /** Uang tunai yang benar-benar diterima kasir untuk tagihan sesi ini. */
  amount: number;
}

export type OfflineAction = StartAction | ExtendAction | PauseAction | ResumeAction | AddItemsAction | StopAction | PayCashAction;

/** Aksi offline lebih tua dari ini ditolak (perangkat yang lama tidak tersambung perlu ditinjau manual). */
export const OFFLINE_MAX_AGE_MS = 72 * 60 * 60 * 1000;
/** Toleransi jam "di masa depan" (selisih kecil antar jam). */
export const OFFLINE_FUTURE_SKEW_MS = 5 * 60 * 1000;
/** Selisih jam perangkat berubah lebih dari ini antara saat merekam dan saat sinkron → ditandai. */
export const CLOCK_TAMPER_THRESHOLD_MS = 2 * 60 * 1000;
/** Batas jumlah aksi per permintaan sinkron. */
export const SYNC_BATCH_LIMIT = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export class OfflineActionError extends Error {}

const optText = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new OfflineActionError("Teks tidak valid.");
  return v.trim().slice(0, max) || null;
};
const posInt = (v: unknown, max: number, label: string): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0 || v > max) throw new OfflineActionError(`${label} tidak valid.`);
  return v;
};

/** Validasi bentuk satu aksi dari klien (TIDAK memeriksa kepemilikan/kondisi database). */
export function parseOfflineAction(raw: unknown): OfflineAction {
  if (!raw || typeof raw !== "object") throw new OfflineActionError("Aksi tidak valid.");
  const r = raw as Record<string, unknown>;
  if (!isUuid(r.id)) throw new OfflineActionError("ID aksi tidak valid.");
  if (!isUuid(r.sessionId)) throw new OfflineActionError("ID sesi tidak valid.");
  if (typeof r.at !== "string" || Number.isNaN(Date.parse(r.at))) throw new OfflineActionError("Waktu aksi tidak valid.");
  if (typeof r.clockOffsetMs !== "number" || !Number.isFinite(r.clockOffsetMs)) throw new OfflineActionError("Selisih jam tidak valid.");
  const base = {
    id: r.id,
    sessionId: r.sessionId,
    at: new Date(r.at).toISOString(),
    clockOffsetMs: Math.round(r.clockOffsetMs),
    recordedBy: optText(r.recordedBy, 64),
  };
  switch (r.kind) {
    case "start": {
      if (typeof r.rentalUnitId !== "string" || !r.rentalUnitId) throw new OfflineActionError("Unit tidak valid.");
      const planned = r.plannedMinutes === undefined || r.plannedMinutes === null ? null : posInt(r.plannedMinutes, 24 * 60, "Durasi");
      return {
        ...base,
        kind: "start",
        rentalUnitId: r.rentalUnitId,
        customerName: optText(r.customerName, 120),
        gameName: optText(r.gameName, 120),
        plannedMinutes: planned,
        promoId: optText(r.promoId, 64),
      };
    }
    case "extend":
      return { ...base, kind: "extend", minutes: posInt(r.minutes, 24 * 60, "Tambahan waktu") };
    case "pause":
    case "resume":
    case "stop":
      return { ...base, kind: r.kind };
    case "addItems": {
      if (!Array.isArray(r.items) || r.items.length === 0 || r.items.length > 50) throw new OfflineActionError("Item tidak valid.");
      const items = r.items.map((i) => {
        const it = i as Record<string, unknown>;
        if (typeof it?.productId !== "string" || !it.productId) throw new OfflineActionError("Produk tidak valid.");
        return { productId: it.productId, qty: posInt(it.qty, 999, "Qty") };
      });
      return { ...base, kind: "addItems", items };
    }
    case "payCash": {
      if (typeof r.amount !== "number" || !Number.isFinite(r.amount) || r.amount <= 0 || r.amount > 1e10) throw new OfflineActionError("Nominal tidak valid.");
      return { ...base, kind: "payCash", amount: Math.round(r.amount * 100) / 100 };
    }
    default:
      throw new OfflineActionError("Jenis aksi tidak dikenal.");
  }
}

/** null bila waktu aksi masuk akal terhadap jam server sekarang; selain itu alasan penolakan. */
export function checkActionTime(at: string, serverNowMs: number): string | null {
  const t = Date.parse(at);
  if (t > serverNowMs + OFFLINE_FUTURE_SKEW_MS) return "Waktu aksi berada di masa depan — periksa jam perangkat.";
  if (t < serverNowMs - OFFLINE_MAX_AGE_MS) return "Aksi offline lebih dari 72 jam — perlu ditinjau manual oleh owner.";
  return null;
}

/** True bila jam perangkat bergeser mencurigakan antara saat aksi direkam dan saat sinkron. */
export function clockLooksTampered(recordedOffsetMs: number, currentOffsetMs: number): boolean {
  return Math.abs(recordedOffsetMs - currentOffsetMs) > CLOCK_TAMPER_THRESHOLD_MS;
}

export type SyncResultStatus = "done" | "failed" | "duplicate";

/** Jenis info tambahan hasil sinkron; diterjemahkan di perangkat (kunci i18n `offline.note.<kode>`). */
export type SyncNoteCode = "reopened" | "alreadyStopped" | "alreadyPaid" | "overpaid" | "underpaid";

export interface SyncActionResult {
  id: string;
  status: SyncResultStatus;
  error?: string;
  /** Info tambahan untuk kasir (mis. selisih tagihan final vs uang yang diterima), teks Indonesia untuk Audit Log. */
  note?: string;
  noteCode?: SyncNoteCode;
  /** Nominal yang dirujuk catatan: uang yang diterima (alreadyPaid) atau selisihnya (overpaid/underpaid). */
  noteAmount?: number;
  orderId?: string;
}

export interface SyncResponse {
  serverTime: string;
  results: SyncActionResult[];
  /** True bila jam perangkat terdeteksi berubah selama offline (dicatat di Audit Log). */
  clockFlagged: boolean;
}
