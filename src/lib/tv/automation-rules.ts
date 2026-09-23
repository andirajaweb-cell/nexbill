/**
 * Aturan otomatisasi "sesi selesai → screensaver, sesi mulai → HDMI" — MURNI, supaya bisa diuji
 * tanpa database dan tanpa TV. Bagian yang menyentuh database dan mengirim perintah ada di
 * lib/tv/automation.ts. Rancangan: AGENT-V1.2-DESIGN.md bagian 5.
 */

import type { RelayCapability } from "@/lib/relay/capabilities";

export interface AgentSnapshot {
  name: string;
  status: string | null;
  agentVersion: string | null;
  capabilities: RelayCapability[];
}

export interface AutomationReadiness {
  /** Layar ini dikontrol lewat Relay Agent sama sekali. */
  viaRelay: boolean;
  canOpenScreensaver: boolean;
  canSwitchHdmi: boolean;
  canReadTvInfo: boolean;
  agentName: string | null;
  agentVersion: string | null;
  agentOnline: boolean;
  /** Kalimat untuk merchant: kenapa otomatisasi belum bisa dipakai. null = tidak ada penghalang. */
  blocker: string | null;
}

/**
 * Menilai kesiapan satu layar untuk otomatisasi, dari protokol perangkat unitnya dan agent yang
 * mengontrolnya.
 *
 * Kemampuan dibaca dari yang TERAKHIR DICATAT hub. Itu cukup untuk menampilkan tombol di
 * dashboard, tapi bukan kata akhir: kalau outlet diam-diam kembali ke agent lama, hub yang
 * menolak perintahnya (UNSUPPORTED_ACTION) dan automation.ts jatuh kembali ke perilaku lama.
 */
export function assessAutomationReadiness(input: {
  hasUnit: boolean;
  deviceProtocol: string | null;
  agent: AgentSnapshot | null;
}): AutomationReadiness {
  const base: AutomationReadiness = {
    viaRelay: false,
    canOpenScreensaver: false,
    canSwitchHdmi: false,
    canReadTvInfo: false,
    agentName: null,
    agentVersion: null,
    agentOnline: false,
    blocker: null,
  };

  if (!input.hasUnit) {
    return { ...base, blocker: "Layar tanpa unit (branding saja) tidak punya sesi, jadi tidak ada yang perlu diotomatisasi." };
  }
  if (input.deviceProtocol !== "android_tv_relay") {
    return {
      ...base,
      blocker:
        input.deviceProtocol === null
          ? "Unit ini belum terhubung ke perangkat apa pun. Otomatisasi butuh TV yang dikontrol lewat Relay Agent (Kontrol Perangkat › TV (Android/Google TV))."
          : "Unit ini tidak dikontrol lewat Relay Agent. Otomatisasi hanya untuk TV Android yang dikontrol lewat Relay Agent.",
    };
  }
  if (!input.agent) {
    return { ...base, viaRelay: true, blocker: "Relay Agent untuk TV ini tidak ditemukan. Periksa pengaturannya di Kontrol Perangkat." };
  }

  const caps = input.agent.capabilities;
  const readiness: AutomationReadiness = {
    viaRelay: true,
    canOpenScreensaver: caps.includes("open_screensaver"),
    canSwitchHdmi: caps.includes("switch_hdmi"),
    canReadTvInfo: caps.includes("tv_info"),
    agentName: input.agent.name,
    agentVersion: input.agent.agentVersion,
    agentOnline: input.agent.status === "online",
    blocker: null,
  };

  if (!readiness.canOpenScreensaver || !readiness.canSwitchHdmi) {
    readiness.blocker = input.agent.agentVersion
      ? `NexbillAgent di outlet ini masih versi ${input.agent.agentVersion}. Perbarui ke versi 1.2 atau lebih baru untuk memakai otomatisasi.`
      : "NexbillAgent di outlet ini belum pernah tersambung sejak fitur ini ada, atau masih versi lama. Jalankan NexbillAgent versi 1.2 lalu muat ulang halaman ini.";
  }
  return readiness;
}

/**
 * Boleh menyalakan otomatisasi? Ketiga syarat wajib:
 *   1. agent-nya mampu (versi 1.2+),
 *   2. port HDMI PlayStation sudah diisi — tanpa itu "sesi mulai" tidak tahu harus pindah ke mana,
 *      dan pelanggan akan duduk di depan screensaver,
 *   3. staf sudah MENGONFIRMASI dengan mata sendiri bahwa kedua tes berhasil di TV itu.
 */
export function canEnableAutoSwitch(input: { readiness: AutomationReadiness; hdmiPort: number | null; verifiedAt: string | null }): { ok: true } | { ok: false; error: string } {
  if (input.readiness.blocker) return { ok: false, error: input.readiness.blocker };
  if (!input.hdmiPort) return { ok: false, error: "Isi dulu port HDMI tempat PlayStation dicolokkan." };
  if (!input.verifiedAt) return { ok: false, error: "Jalankan dan konfirmasi kedua tes (buka screensaver dan pindah ke HDMI) di TV ini dulu." };
  return { ok: true };
}

/**
 * Apakah perubahan pengaturan ini membatalkan hasil tes sebelumnya? Tes berlaku untuk kombinasi
 * unit + port HDMI + browser TERTENTU. Mengganti salah satunya berarti yang dites dulu bukan lagi
 * yang akan dijalankan — jadi otomatisasi dimatikan dan harus dites ulang.
 */
export function changeInvalidatesVerification(
  before: { rentalUnitId: string | null; hdmiPort: number | null; browserPackage: string | null },
  after: { rentalUnitId?: string | null; hdmiPort?: number | null; browserPackage?: string | null }
): boolean {
  if (after.rentalUnitId !== undefined && (after.rentalUnitId || null) !== before.rentalUnitId) return true;
  if (after.hdmiPort !== undefined && (after.hdmiPort ?? null) !== before.hdmiPort) return true;
  if (after.browserPackage !== undefined && (after.browserPackage || null) !== before.browserPackage) return true;
  return false;
}
