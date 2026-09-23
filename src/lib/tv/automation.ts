import { db } from "@/db/client";
import { tvScreens, rentalUnits, devices, relayAgents } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";
import { turnDeviceOff } from "@/lib/devices";
import type { DeviceRecord } from "@/lib/devices/types";
import { sendRelayCommand, parseRelayDeviceConfig } from "@/lib/devices/adapters/android-tv-relay";
import { parseStoredCapabilities, validateAndroidPackage, validateHdmiPort } from "@/lib/relay/capabilities";
import type { RelayDispatchResponse } from "@/lib/relay/config";
import {
  assessAutomationReadiness,
  canEnableAutoSwitch,
  changeInvalidatesVerification,
  type AgentSnapshot,
  type AutomationReadiness,
} from "@/lib/tv/automation-rules";

/**
 * Otomatisasi TV bilik lewat NexbillAgent v1.2 (rancangan: AGENT-V1.2-DESIGN.md bagian 5):
 *
 *   sesi SELESAI → TV membuka screensaver NEXBILL   (dulu: TV ditidurkan)
 *   sesi MULAI   → TV dibangunkan lalu pindah ke HDMI PlayStation
 *
 * HANYA dipanggil untuk perangkat berprotokol android_tv_relay — lib/rental/sessions.ts memeriksa
 * protokolnya sebelum memanggil file ini, jadi jalur smart plug (Tuya/Tasmota) tidak menyentuh
 * satu baris pun di sini.
 *
 * Aturan yang tidak boleh dilonggarkan: KEGAGALAN OTOMATISASI TIDAK PERNAH MENGGAGALKAN SESI. Sesi
 * tetap mulai/selesai, uang tetap tercatat. Yang terjadi paling buruk adalah (a) TV jatuh kembali
 * ke perilaku lama — ditidurkan — atau (b) kasir mendapat peringatan untuk menekan tombol Input di
 * remote. Keduanya persis seperti yang sudah biasa terjadi saat perangkat gagal sebelum fitur ini.
 */

interface AutoSwitchTarget {
  screenId: string;
  hdmiPort: number | null;
  browserPackage: string | null;
}

/** Layar yang otomatisasinya AKTIF dan SUDAH DIVERIFIKASI untuk unit ini, atau null. */
async function findAutoSwitchTarget(unit: { id: string; outletId: string }): Promise<AutoSwitchTarget | null> {
  if (!(await isFeatureEnabled(unit.outletId, "TV_SCREENSAVER_ENABLED"))) return null;
  const [screen] = await db
    .select({ id: tvScreens.id, hdmiPort: tvScreens.hdmiPort, browserPackage: tvScreens.browserPackage })
    .from(tvScreens)
    .where(
      and(
        eq(tvScreens.rentalUnitId, unit.id),
        eq(tvScreens.outletId, unit.outletId),
        eq(tvScreens.isActive, true),
        eq(tvScreens.autoSwitchEnabled, true),
        isNotNull(tvScreens.autoSwitchVerifiedAt)
      )
    )
    .limit(1);
  return screen ? { screenId: screen.id, hdmiPort: screen.hdmiPort, browserPackage: screen.browserPackage } : null;
}

async function markDevice(deviceId: string, state: "on" | "off") {
  await db.update(devices).set({ lastKnownState: state, lastSeenAt: new Date().toISOString() }).where(eq(devices.id, deviceId));
}

/**
 * Pengganti turnDeviceOff untuk TV lewat Relay Agent saat sesi selesai (atau dipindah KE unit
 * lain). Mengembalikan pesan peringatan untuk kasir, atau null.
 *
 * Tanpa otomatisasi aktif → persis perilaku lama (turnDeviceOff), dengan format pesan galat yang
 * sama seperti runDeviceCommand di sessions.ts.
 */
export async function releaseRelayTv(unit: { id: string; outletId: string; name: string }, device: DeviceRecord, errorLabel: string): Promise<string | null> {
  let target: AutoSwitchTarget | null = null;
  try {
    target = await findAutoSwitchTarget(unit);
  } catch (err) {
    // Gagal membaca pengaturan otomatisasi (mis. migrasi 0010/0011 belum jalan) → perilaku lama.
    console.error("[tv-automation] gagal membaca pengaturan otomatisasi:", err);
  }

  if (target) {
    let result: RelayDispatchResponse;
    try {
      result = await sendRelayCommand(device, "openScreensaver", { browserPackage: target.browserPackage ?? undefined });
    } catch (err) {
      result = { ok: false, error: describeError(err) };
    }
    if (result.ok) {
      // TV sengaja dibiarkan MENYALA menampilkan screensaver — status perangkat dicatat "on",
      // bukan "off", supaya Kontrol Perangkat tidak melaporkan TV mati padahal layarnya hidup.
      await markDevice(device.id, "on").catch(() => {});
      return null;
    }

    // Jalan cadangan: tidurkan TV seperti sebelum fitur ini ada. Bilik tidak boleh tertinggal
    // menampilkan PlayStation yang masih bisa dimainkan gratis hanya karena screensaver gagal.
    const fallback = await turnOffWithWarning(device, errorLabel);
    const why = result.error ?? "alasan tidak diketahui";
    return `Screensaver di TV ${unit.name} tidak terbuka (${why}) — TV ditidurkan seperti biasa.${fallback ? ` ${fallback}` : ""}`;
  }

  return turnOffWithWarning(device, errorLabel);
}

async function turnOffWithWarning(device: DeviceRecord, errorLabel: string): Promise<string | null> {
  try {
    await turnDeviceOff(device);
    return null;
  } catch (err) {
    console.error(errorLabel, err);
    return `${errorLabel} ${describeError(err)}`;
  }
}

/**
 * Setelah TV lewat Relay Agent dinyalakan saat sesi mulai (atau dipindah DARI unit lain):
 * pindahkan TV ke HDMI PlayStation, kalau otomatisasi aktif. Mengembalikan peringatan atau null.
 *
 * Kegagalan di sini adalah yang paling terasa di outlet — pelanggan baru bayar, lalu yang tampil
 * malah screensaver. Karena itu pesannya ditulis sebagai INSTRUKSI untuk kasir, bukan galat teknis.
 */
export async function switchRelayTvToConsole(unit: { id: string; outletId: string; name: string }, device: DeviceRecord): Promise<string | null> {
  let target: AutoSwitchTarget | null = null;
  try {
    target = await findAutoSwitchTarget(unit);
  } catch (err) {
    console.error("[tv-automation] gagal membaca pengaturan otomatisasi:", err);
    return null;
  }
  const port = target ? validateHdmiPort(target.hdmiPort) : null;
  if (!target || port === null) return null;

  let result: RelayDispatchResponse;
  try {
    result = await sendRelayCommand(device, "switchHdmi", { hdmiPort: port });
  } catch (err) {
    result = { ok: false, error: describeError(err) };
  }
  if (result.ok) return null;
  return `TV ${unit.name} mungkin masih menampilkan screensaver — tekan tombol Input/Source di remote dan pilih HDMI ${port}. (${result.error ?? "perintah pindah HDMI gagal"})`;
}

/** ---------------- PENGATURAN & TES (dipakai Pengaturan › TV Screensaver) ---------------- */

interface ScreenContext {
  screen: typeof tvScreens.$inferSelect;
  unit: { id: string; name: string; deviceId: string | null } | null;
  device: DeviceRecord | null;
  agent: AgentSnapshot | null;
  readiness: AutomationReadiness;
}

async function loadAgentSnapshot(relayAgentId: string | undefined, outletId: string): Promise<AgentSnapshot | null> {
  if (!relayAgentId) return null;
  const [row] = await db
    .select({
      name: relayAgents.name,
      outletId: relayAgents.outletId,
      status: relayAgents.status,
      agentVersion: relayAgents.agentVersion,
      capabilities: relayAgents.capabilities,
    })
    .from(relayAgents)
    .where(eq(relayAgents.id, relayAgentId))
    .limit(1);
  if (!row || row.outletId !== outletId) return null;
  return { name: row.name, status: row.status, agentVersion: row.agentVersion, capabilities: parseStoredCapabilities(row.capabilities) };
}

async function loadScreenContext(outletId: string, screenId: string): Promise<ScreenContext> {
  const [screen] = await db.select().from(tvScreens).where(and(eq(tvScreens.id, screenId), eq(tvScreens.outletId, outletId))).limit(1);
  if (!screen) throw new Error("Layar tidak ditemukan.");

  let unit: ScreenContext["unit"] = null;
  let device: DeviceRecord | null = null;
  if (screen.rentalUnitId) {
    const [u] = await db
      .select({ id: rentalUnits.id, name: rentalUnits.name, deviceId: rentalUnits.deviceId })
      .from(rentalUnits)
      .where(and(eq(rentalUnits.id, screen.rentalUnitId), eq(rentalUnits.outletId, outletId)))
      .limit(1);
    unit = u ?? null;
    if (u?.deviceId) {
      const [d] = await db.select().from(devices).where(eq(devices.id, u.deviceId)).limit(1);
      device = (d as unknown as DeviceRecord) ?? null;
    }
  }

  const agent = device?.protocol === "android_tv_relay" ? await loadAgentSnapshot(parseRelayDeviceConfig(device).relayAgentId, outletId) : null;
  const readiness = assessAutomationReadiness({ hasUnit: !!unit, deviceProtocol: device?.protocol ?? null, agent });
  return { screen, unit, device, agent, readiness };
}

export interface ScreenAutomationStatus {
  readiness: AutomationReadiness;
  hdmiPort: number | null;
  browserPackage: string | null;
  autoSwitchEnabled: boolean;
  verifiedAt: string | null;
  tvInfo: { brand?: string; model?: string; android?: string; browsers?: string[] } | null;
}

function parseTvInfo(raw: string | null): ScreenAutomationStatus["tvInfo"] {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/** Status otomatisasi semua layar outlet, per id layar. */
export async function listScreenAutomation(outletId: string): Promise<Record<string, ScreenAutomationStatus>> {
  const screens = await db.select({ id: tvScreens.id }).from(tvScreens).where(eq(tvScreens.outletId, outletId));
  const out: Record<string, ScreenAutomationStatus> = {};
  for (const s of screens) {
    // Berurutan, bukan Promise.all: jumlah layar per outlet kecil (satu per bilik), dan ini hanya
    // dipanggil saat halaman Pengaturan dibuka — tidak ada gunanya membanjiri pool koneksi.
    const ctx = await loadScreenContext(outletId, s.id);
    out[s.id] = {
      readiness: ctx.readiness,
      hdmiPort: ctx.screen.hdmiPort,
      browserPackage: ctx.screen.browserPackage,
      autoSwitchEnabled: ctx.screen.autoSwitchEnabled,
      verifiedAt: ctx.screen.autoSwitchVerifiedAt,
      tvInfo: parseTvInfo(ctx.screen.tvInfo),
    };
  }
  return out;
}

export type ScreenTestKind = "openScreensaver" | "switchHdmi" | "getTvInfo";

/**
 * Menjalankan satu tes di TV sungguhan dari halaman Pengaturan.
 *
 * `ok: true` di sini hanya berarti AGENT MENJALANKAN perintahnya — BUKAN bahwa TV bereaksi. Itu
 * sebabnya verifikasi (confirmScreenAutomation) terpisah dan harus dilakukan manusia setelah
 * melihat layar TV-nya sendiri.
 */
export async function testScreenAutomation(outletId: string, screenId: string, kind: ScreenTestKind): Promise<RelayDispatchResponse> {
  const ctx = await loadScreenContext(outletId, screenId);
  if (!ctx.device || ctx.device.protocol !== "android_tv_relay") {
    return { ok: false, error: ctx.readiness.blocker ?? "Layar ini tidak terhubung ke TV lewat Relay Agent." };
  }
  if (kind === "openScreensaver" && !ctx.readiness.canOpenScreensaver) return { ok: false, code: "UNSUPPORTED_ACTION", error: ctx.readiness.blocker ?? "Agent belum mendukung perintah ini." };
  if (kind === "switchHdmi" && !ctx.readiness.canSwitchHdmi) return { ok: false, code: "UNSUPPORTED_ACTION", error: ctx.readiness.blocker ?? "Agent belum mendukung perintah ini." };
  if (kind === "getTvInfo" && !ctx.readiness.canReadTvInfo) return { ok: false, code: "UNSUPPORTED_ACTION", error: ctx.readiness.blocker ?? "Agent belum mendukung perintah ini." };

  let params = {};
  if (kind === "switchHdmi") {
    const port = validateHdmiPort(ctx.screen.hdmiPort);
    if (port === null) return { ok: false, code: "INVALID_PARAMS", error: "Pilih dulu port HDMI tempat PlayStation dicolokkan, lalu simpan." };
    params = { hdmiPort: port };
  }
  if (kind === "openScreensaver" && ctx.screen.browserPackage) params = { browserPackage: ctx.screen.browserPackage };

  let result: RelayDispatchResponse;
  try {
    result = await sendRelayCommand(ctx.device, kind, params);
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }

  if (kind === "getTvInfo" && result.ok && result.info) {
    await db.update(tvScreens).set({ tvInfo: JSON.stringify(result.info), updatedAt: new Date().toISOString() }).where(eq(tvScreens.id, screenId));
  }
  return result;
}

export interface ScreenAutomationPatch {
  hdmiPort?: number | null;
  browserPackage?: string | null;
  autoSwitchEnabled?: boolean;
  /** true = staf menyatakan sudah melihat sendiri kedua tes berhasil di TV. */
  confirmVerified?: boolean;
}

export async function updateScreenAutomation(outletId: string, screenId: string, patch: ScreenAutomationPatch) {
  const ctx = await loadScreenContext(outletId, screenId);
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  let hdmiPort = ctx.screen.hdmiPort;
  let browserPackage = ctx.screen.browserPackage;

  if (patch.hdmiPort !== undefined) {
    if (patch.hdmiPort === null) hdmiPort = null;
    else {
      const port = validateHdmiPort(patch.hdmiPort);
      if (port === null) throw new Error("Port HDMI harus 1 sampai 4.");
      hdmiPort = port;
    }
    set.hdmiPort = hdmiPort;
  }
  if (patch.browserPackage !== undefined) {
    if (!patch.browserPackage) browserPackage = null;
    else {
      const pkg = validateAndroidPackage(patch.browserPackage);
      if (!pkg) throw new Error("Nama paket browser tidak valid. Pakai tombol Deteksi TV untuk memilih dari daftar.");
      browserPackage = pkg;
    }
    set.browserPackage = browserPackage;
  }

  const invalidated = changeInvalidatesVerification(
    { rentalUnitId: ctx.screen.rentalUnitId, hdmiPort: ctx.screen.hdmiPort, browserPackage: ctx.screen.browserPackage },
    { hdmiPort: patch.hdmiPort !== undefined ? hdmiPort : undefined, browserPackage: patch.browserPackage !== undefined ? browserPackage : undefined }
  );
  let verifiedAt = ctx.screen.autoSwitchVerifiedAt;
  if (invalidated) {
    verifiedAt = null;
    set.autoSwitchVerifiedAt = null;
    set.autoSwitchEnabled = false;
  }

  if (patch.confirmVerified) {
    if (ctx.readiness.blocker) throw new Error(ctx.readiness.blocker);
    if (!hdmiPort) throw new Error("Isi dulu port HDMI tempat PlayStation dicolokkan.");
    verifiedAt = new Date().toISOString();
    set.autoSwitchVerifiedAt = verifiedAt;
  }

  if (patch.autoSwitchEnabled !== undefined) {
    if (patch.autoSwitchEnabled) {
      const check = canEnableAutoSwitch({ readiness: ctx.readiness, hdmiPort, verifiedAt });
      if (!check.ok) throw new Error(check.error);
      set.autoSwitchEnabled = true;
    } else {
      set.autoSwitchEnabled = false;
    }
  }

  const [row] = await db.update(tvScreens).set(set).where(and(eq(tvScreens.id, screenId), eq(tvScreens.outletId, outletId))).returning();
  return row;
}
