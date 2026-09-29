import { SMART_PLUG_PROTOCOLS } from "@/lib/subscription/config";

/**
 * Unit mana yang masih BUTUH smart plug agar bisa dikontrol otomatis.
 *
 * TV non-Android (smart_tv: Viva OS/Hisense OS/webOS dll, dan analog_tv) tidak bisa dikendalikan
 * lewat NexbillAgent/ADB — satu-satunya jalur adalah smart plug yang memutus/menyambung listriknya.
 * Unit seperti itu dianggap "sudah beres" hanya kalau sudah terhubung ke perangkat berprotokol
 * smart plug; tanpa perangkat, atau terhubung ke perangkat Android TV (salah pasang), tetap
 * dihitung butuh smart plug.
 *
 * Modul murni (tanpa DB/React) supaya bisa diuji — lihat smart-plug-need.test.ts.
 */

export interface UnitUntukCekSmartPlug {
  id: string;
  name: string;
  tvType: string | null;
  deviceId: string | null;
  isActive?: boolean | null;
}

export interface PerangkatUntukCekSmartPlug {
  id: string;
  protocol: string;
}

const NON_ANDROID = new Set(["smart_tv", "analog_tv"]);
const PROTOKOL_SMART_PLUG = new Set<string>(SMART_PLUG_PROTOCOLS);

export function unitButuhSmartPlug<U extends UnitUntukCekSmartPlug>(units: U[], devices: PerangkatUntukCekSmartPlug[]): U[] {
  const protokolPerangkat = new Map(devices.map((d) => [d.id, d.protocol]));
  return units.filter((u) => {
    if (u.isActive === false) return false;
    if (!u.tvType || !NON_ANDROID.has(u.tvType)) return false;
    const protokol = u.deviceId ? protokolPerangkat.get(u.deviceId) : undefined;
    return !(protokol && PROTOKOL_SMART_PLUG.has(protokol));
  });
}

/** URL halaman Rekomendasi Produk yang langsung difilter ke smart plug. */
export const URL_REKOMENDASI_SMART_PLUG = "/dashboard/rekomendasi-produk?fokus=smart-plug&dari=devices";
