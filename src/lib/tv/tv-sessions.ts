import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, offlineSyncActions, outlets, promos, rentalDurationPresets, rentalSessions, rentalUnits, staffUsers, tvScreens } from "@/db/schema";
import { computeEffectiveHourlyRate } from "@/lib/rental/pricing";
import { DEFAULT_DEPS, processOfflineBatch, type SyncDeps } from "@/lib/offline/server-sync";
import { isUuid, SYNC_BATCH_LIMIT, type SyncActionResult } from "@/lib/offline/protocol";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";
import { getOrCreateTvSettings } from "./service";
import { checkTvAction, DEFAULT_TV_DURATIONS, packagesForConsole, parseTvEvent, TV_DEVICE_PREFIX, type TvCatalogPackage } from "./tv-session-rules";

/**
 * Sesi rental dari aplikasi NEXBILL TV (lihat tv-session-rules.ts). Outlet & unit SELALU diambil
 * dari token layar — TV tidak pernah bisa menyentuh unit/outlet lain, dan dua outlet yang memakai
 * NEXBILL TV tidak pernah berbagi data apa pun.
 */

async function screenByToken(token: string) {
  if (!token) throw new Error("UNKNOWN_SCREEN");
  const [screen] = await db.select().from(tvScreens).where(eq(tvScreens.token, token)).limit(1);
  if (!screen) throw new Error("UNKNOWN_SCREEN");
  return screen;
}

async function pinConfigured(outletId: string) {
  const s = await getOrCreateTvSettings(outletId);
  return s.unlockMode === "pin" && !!s.unlockPinHash;
}

export interface TvCatalog {
  outletName: string;
  unit: { id: string; name: string; consoleType: string; ratePerHour: number } | null;
  packages: TvCatalogPackage[];
  durations: { minutes: number; label: string }[];
  /** Sesi dari TV hanya boleh bila outlet memasang PIN layar. */
  canStartFromTv: boolean;
  reason: string | null;
  serverTime: string;
}

/** Daftar harga & paket untuk unit layar ini — disimpan di TV supaya bisa dipakai saat offline. */
export async function getTvCatalog(token: string): Promise<TvCatalog> {
  const screen = await screenByToken(token);
  const [outlet] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, screen.outletId)).limit(1);
  const nowIso = new Date().toISOString();
  const [moduleOn, hasPin] = await Promise.all([isFeatureEnabled(screen.outletId, "TV_SCREENSAVER_ENABLED"), pinConfigured(screen.outletId)]);
  let unit: TvCatalog["unit"] = null;
  let packages: TvCatalogPackage[] = [];
  if (screen.rentalUnitId) {
    const [u] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, screen.rentalUnitId)).limit(1);
    if (u && u.outletId === screen.outletId) {
      const rate = await computeEffectiveHourlyRate(screen.outletId, u.id);
      unit = { id: u.id, name: u.name, consoleType: u.consoleType, ratePerHour: Math.round(rate.finalRate) };
      const rows = await db.select().from(promos).where(eq(promos.outletId, screen.outletId));
      packages = packagesForConsole(rows, u.consoleType, nowIso);
    }
  }
  const presets = await db
    .select({ minutes: rentalDurationPresets.minutes, label: rentalDurationPresets.label })
    .from(rentalDurationPresets)
    .where(and(eq(rentalDurationPresets.outletId, screen.outletId), eq(rentalDurationPresets.isActive, true)))
    .orderBy(asc(rentalDurationPresets.sortOrder), asc(rentalDurationPresets.minutes));
  const durations = presets.length ? presets : DEFAULT_TV_DURATIONS.map((m) => ({ minutes: m, label: m % 60 === 0 ? `${m / 60} jam` : `${m} menit` }));
  let reason: string | null = null;
  if (!moduleOn) reason = "Screensaver dimatikan di Pengaturan › Feature Management.";
  else if (!screen.isActive) reason = "Layar ini dinonaktifkan di Pengaturan › TV Screensaver.";
  else if (!unit) reason = "Layar ini belum ditautkan ke unit PS.";
  else if (!hasPin) reason = "Atur PIN layar di Pengaturan › TV Screensaver dulu — sesi dari TV wajib lewat PIN kasir.";
  return { outletName: outlet?.name ?? "Outlet", unit, packages, durations, canStartFromTv: reason === null, reason, serverTime: nowIso };
}

/** Staf yang dicatat sebagai pembuat sesi dari TV: Owner outlet (atau Superuser/Manager aktif). */
async function tvActor(outletId: string): Promise<string> {
  const rows = await db
    .select({ id: staffUsers.id, role: staffUsers.role })
    .from(staffUsers)
    .where(and(eq(staffUsers.outletId, outletId), eq(staffUsers.isActive, true), inArray(staffUsers.role, ["owner", "superuser", "manager"])));
  const pick = rows.find((r) => r.role === "owner") ?? rows.find((r) => r.role === "superuser") ?? rows[0];
  if (!pick) throw new Error("Outlet ini belum punya akun Owner/Manager aktif untuk mencatat sesi dari TV.");
  return pick.id;
}

const PROTOCOL_KEYS = ["id", "kind", "at", "clockOffsetMs", "sessionId", "rentalUnitId", "plannedMinutes", "promoId", "minutes", "customerName", "gameName"];

function cleanAction(r: Record<string, unknown>) {
  const clean: Record<string, unknown> = { recordedBy: null };
  for (const k of PROTOCOL_KEYS) if (r[k] !== undefined) clean[k] = r[k];
  return clean;
}

export async function syncTvActions(token: string, body: { actions?: unknown; clockOffsetMs?: unknown; events?: unknown }) {
  const screen = await screenByToken(token);
  const actions = Array.isArray(body.actions) ? body.actions.slice(0, SYNC_BATCH_LIMIT) : [];
  const [moduleOn, hasPin] = await Promise.all([isFeatureEnabled(screen.outletId, "TV_SCREENSAVER_ENABLED"), pinConfigured(screen.outletId)]);

  // Unit sesi yang sudah ada di server (untuk aksi lanjutan), sekali kueri untuk seluruh antrean.
  const sessionIds = [...new Set(actions.map((a) => (a as { sessionId?: unknown })?.sessionId).filter((v): v is string => typeof v === "string"))];
  const known = sessionIds.length
    ? await db.select({ id: rentalSessions.id, unitId: rentalSessions.rentalUnitId, outletId: rentalSessions.outletId }).from(rentalSessions).where(inArray(rentalSessions.id, sessionIds))
    : [];
  const unitOfSession = new Map(known.map((k) => [k.id, k.outletId === screen.outletId ? k.unitId : "__other_outlet__"]));

  const rejected: SyncActionResult[] = [];
  const accepted: unknown[] = [];
  for (const raw of actions) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    if (!moduleOn || !screen.isActive) {
      rejected.push({ id, status: "failed", error: "Layar ini sedang nonaktif di dashboard." });
      continue;
    }
    const check = checkTvAction(raw, {
      screenUnitId: screen.rentalUnitId,
      pinConfigured: hasPin,
      sessionUnitId: typeof r.sessionId === "string" ? unitOfSession.get(r.sessionId) ?? null : null,
    });
    if (!check.ok) rejected.push({ id, status: "failed", error: check.error });
    // Hanya kolom protokol Mode Offline yang diteruskan (tidak ada token/jejak lain yang ikut tersimpan).
    else accepted.push(cleanAction(r));
  }

  const actor = await tvActor(screen.outletId);
  const [unit] = screen.rentalUnitId ? await db.select({ name: rentalUnits.name }).from(rentalUnits).where(eq(rentalUnits.id, screen.rentalUnitId)).limit(1) : [];
  const deviceLabel = `${TV_DEVICE_PREFIX}${unit?.name ?? screen.name}`;

  // Aksi yang ditolak SEBELUM diputar ulang tetap dicatat sebagai "failed" di offline_sync_actions,
  // supaya muncul di dashboard (kartu Pengawasan NEXBILL TV) — bukan hanya di layar TV.
  for (const rej of rejected) {
    const raw = actions.find((a) => (a as { id?: unknown })?.id === rej.id) as Record<string, unknown> | undefined;
    if (!raw || !isUuid(rej.id)) continue;
    const at = typeof raw.at === "string" && !Number.isNaN(Date.parse(raw.at)) ? new Date(raw.at).toISOString() : new Date().toISOString();
    await db
      .insert(offlineSyncActions)
      .values({
        id: rej.id,
        outletId: screen.outletId,
        staffUserId: actor,
        kind: typeof raw.kind === "string" ? raw.kind.slice(0, 20) : "unknown",
        rentalSessionId: isUuid(raw.sessionId) ? raw.sessionId : null,
        occurredAt: at,
        payloadJson: JSON.stringify(cleanAction(raw)),
        status: "failed",
        error: rej.error ?? null,
        deviceLabel,
      })
      .onConflictDoUpdate({ target: offlineSyncActions.id, set: { error: rej.error ?? null, updatedAt: new Date().toISOString() }, setWhere: eq(offlineSyncActions.status, "failed") });
  }

  // Kejadian non-tagihan dari TV (mis. mode staf/tes 10 menit) — dicatat supaya terlihat owner.
  const eventResults: { id: string; status: "done" | "failed"; error?: string }[] = [];
  const rawEvents = Array.isArray(body.events) ? body.events.slice(0, SYNC_BATCH_LIMIT) : [];
  for (const raw of rawEvents) {
    const ev = parseTvEvent(raw);
    if (!ev.ok) {
      eventResults.push({ id: typeof (raw as { id?: unknown })?.id === "string" ? String((raw as { id: string }).id) : "", status: "failed", error: ev.error });
      continue;
    }
    const inserted = await db
      .insert(offlineSyncActions)
      .values({
        id: ev.event.id,
        outletId: screen.outletId,
        staffUserId: actor,
        kind: ev.event.kind,
        occurredAt: ev.event.at,
        payloadJson: JSON.stringify({ minutes: ev.event.minutes }),
        status: "done",
        deviceLabel,
      })
      .onConflictDoNothing()
      .returning({ id: offlineSyncActions.id });
    if (inserted.length) {
      await db
        .insert(auditLogs)
        .values({ outletId: screen.outletId, staffUserId: actor, action: "tv_staff_test", entityType: "tv_screen", entityId: screen.id, afterData: JSON.stringify({ at: ev.event.at, minutes: ev.event.minutes, device: deviceLabel }) })
        .catch((err) => console.error("[tv-sync] audit staff test gagal:", err));
    }
    eventResults.push({ id: ev.event.id, status: "done" });
  }
  const offset = typeof body.clockOffsetMs === "number" && Number.isFinite(body.clockOffsetMs) ? body.clockOffsetMs : null;
  const deps: SyncDeps = DEFAULT_DEPS;
  const result = accepted.length
    ? await processOfflineBatch({ outletId: screen.outletId, staffUserId: actor, currentClockOffsetMs: offset, deviceLabel }, accepted, deps)
    : { serverTime: new Date().toISOString(), results: [], clockFlagged: false };
  await db.update(tvScreens).set({ lastSeenAt: new Date().toISOString() }).where(eq(tvScreens.id, screen.id));
  return { ...result, results: [...rejected, ...result.results], events: eventResults };
}
