/**
 * Sesi rental yang diatur kasir LANGSUNG DI TV (aplikasi NEXBILL TV), termasuk saat internet putus.
 * Aturan murni (tanpa db) — dipakai /api/tv/sync & /api/tv/catalog.
 *
 * TV merekam aksi dengan format Mode Offline kasir (lib/offline/protocol.ts) lalu mengirimnya ke
 * /api/tv/sync begitu online; server memutarnya ulang lewat processOfflineBatch (idempoten per aksi).
 * Pembatasnya: token layar hanya boleh mengatur unit yang DIPASANGKAN ke layar itu, hanya aksi
 * mulai/tambah waktu/jeda/lanjut/stop (bukan bayar atau menambah item), dan hanya bila outlet
 * memasang PIN layar (sesi dari TV selalu lewat PIN kasir).
 */
import { isUuid, type OfflineActionKind } from "@/lib/offline/protocol";

export const TV_ALLOWED_KINDS: OfflineActionKind[] = ["start", "extend", "pause", "resume", "stop"];

export type TvActionCheck = { ok: true } | { ok: false; error: string };

/** Pemeriksaan sebelum aksi diteruskan ke processOfflineBatch. */
export function checkTvAction(
  raw: unknown,
  ctx: { screenUnitId: string | null; pinConfigured: boolean; sessionUnitId?: string | null }
): TvActionCheck {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!ctx.pinConfigured) return { ok: false, error: "Atur PIN layar di Pengaturan › TV Screensaver dulu — sesi dari TV wajib lewat PIN kasir." };
  if (!ctx.screenUnitId) return { ok: false, error: "Layar ini belum ditautkan ke unit PS." };
  if (!TV_ALLOWED_KINDS.includes(r.kind as OfflineActionKind)) return { ok: false, error: "Aksi ini tidak bisa dilakukan dari TV." };
  if (r.kind === "start") {
    if (r.rentalUnitId !== ctx.screenUnitId) return { ok: false, error: "TV hanya boleh mengatur unitnya sendiri." };
    return { ok: true };
  }
  // extend/pause/resume/stop: sesi yang sudah ada di server harus milik unit layar ini. Sesi yang
  // belum ada (dimulai di TV, start-nya ada di antrean yang sama) diperiksa processOfflineBatch.
  if (ctx.sessionUnitId && ctx.sessionUnitId !== ctx.screenUnitId) return { ok: false, error: "Sesi ini bukan milik unit layar ini." };
  return { ok: true };
}

export interface TvCatalogPackage {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

/** Paket promo yang berlaku untuk tipe konsol unit (sama dengan dialog Mulai Sesi di halaman Rental). */
export function packagesForConsole(
  promos: { id: string; name: string; type: string; consoleType: string | null; durationMinutes: number | null; packagePrice: number | null; isActive: boolean; validFrom: string | null; validUntil: string | null }[],
  consoleType: string,
  nowIso: string
): TvCatalogPackage[] {
  return promos
    .filter((p) => {
      if (!p.isActive || p.type !== "rental_package" || !p.durationMinutes) return false;
      const scope = p.consoleType ?? "any";
      if (scope !== "any" && scope !== consoleType) return false;
      if (p.validFrom && nowIso < p.validFrom) return false;
      if (p.validUntil && nowIso > p.validUntil) return false;
      return true;
    })
    .map((p) => ({ id: p.id, name: p.name, durationMinutes: p.durationMinutes!, price: Math.round(p.packagePrice ?? 0) }))
    .sort((a, b) => a.durationMinutes - b.durationMinutes || a.price - b.price);
}

export const DEFAULT_TV_DURATIONS = [30, 60, 90, 120, 180];

/** Label perangkat untuk semua yang dikirim aplikasi NEXBILL TV (offline_sync_actions.deviceLabel). */
export const TV_DEVICE_PREFIX = "NEXBILL TV · ";

/** Mode staf (layar game dibuka tanpa sesi, untuk tes) — dibatasi per TV per hari di aplikasi. */
export const TV_STAFF_TEST_KIND = "staffTest";
export const TV_STAFF_TEST_MAX_MINUTES = 10;

export type TvEvent = { id: string; kind: typeof TV_STAFF_TEST_KIND; at: string; minutes: number };

export function parseTvEvent(raw: unknown): { ok: true; event: TvEvent } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!isUuid(r.id)) return { ok: false, error: "ID kejadian tidak valid." };
  if (r.kind !== TV_STAFF_TEST_KIND) return { ok: false, error: "Jenis kejadian tidak dikenal." };
  if (typeof r.at !== "string" || Number.isNaN(Date.parse(r.at))) return { ok: false, error: "Waktu tidak valid." };
  const minutes = Number(r.minutes);
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 60) return { ok: false, error: "Durasi tidak valid." };
  return { ok: true, event: { id: r.id, kind: TV_STAFF_TEST_KIND, at: new Date(r.at).toISOString(), minutes } };
}
