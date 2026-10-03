"use client";

import { bytesToBase64, chunkBytes } from "./escpos";

/**
 * Pengiriman byte ESC/POS ke printer thermal dari HP.
 *
 *  1. Web Bluetooth (BLE) — didukung Chrome Android dan aplikasi NEXBILL Android (TWA = Chrome).
 *     Printer harus mendukung Bluetooth Low Energy. Tidak didukung di iPhone/Safari.
 *  2. RawBT — aplikasi Android gratis yang meneruskan data ke printer Bluetooth Classic (SPP);
 *     dipanggil lewat intent URL sehingga tidak butuh izin Bluetooth di web sama sekali.
 *
 * Tipe Web Bluetooth didefinisikan minimal di sini (lib.dom TypeScript belum memuatnya) supaya
 * tidak perlu dependency tambahan.
 */

interface GattCharacteristic {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue?: (v: BufferSource) => Promise<void>;
  writeValueWithResponse?: (v: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (v: BufferSource) => Promise<void>;
}
interface GattService {
  uuid: string;
  getCharacteristics(): Promise<GattCharacteristic[]>;
}
interface GattServer {
  connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<GattService[]>;
}
interface BtDevice {
  id: string;
  name?: string;
  gatt?: GattServer;
}
interface BluetoothApi {
  requestDevice(opts: { acceptAllDevices?: boolean; filters?: unknown[]; optionalServices?: (string | number)[] }): Promise<BtDevice>;
  getDevices?: () => Promise<BtDevice[]>;
  getAvailability?: () => Promise<boolean>;
}

/**
 * Service GATT yang umum dipakai printer thermal BLE murah (58/80mm) — Web Bluetooth hanya mau
 * membuka service yang disebut di optionalServices, jadi daftar ini menentukan printer mana yang
 * bisa dipakai. Characteristic yang dipakai = yang pertama punya properti write.
 */
export const PRINTER_SERVICE_UUIDS: string[] = [
  "000018f0-0000-1000-8000-00805f9b34fb", // banyak printer 58mm (char 2af1)
  "0000ff00-0000-1000-8000-00805f9b34fb", // char ff02
  "0000ffe0-0000-1000-8000-00805f9b34fb", // modul HM-10 (char ffe1)
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb", // printer "mini"/kucing (char ae01)
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // banyak printer POS China (char bef8d6c9-…)
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Microchip/ISSC transparent UART
];

export class PrinterError extends Error {
  constructor(
    message: string,
    public code: "unsupported" | "cancelled" | "no_characteristic" | "connect_failed" | "write_failed" | "needs_gesture"
  ) {
    super(message);
  }
}

function bluetooth(): BluetoothApi | null {
  if (typeof navigator === "undefined") return null;
  const bt = (navigator as unknown as { bluetooth?: BluetoothApi }).bluetooth;
  return bt ?? null;
}

export function isWebBluetoothSupported(): boolean {
  return !!bluetooth() && typeof window !== "undefined" && window.isSecureContext;
}

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

/** True saat halaman berjalan di dalam aplikasi NEXBILL Android (TWA) atau dipasang sebagai PWA. */
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (document.referrer.startsWith("android-app://")) return true;
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

let active: { device: BtDevice; characteristic: GattCharacteristic } | null = null;

async function findWritable(server: GattServer): Promise<GattCharacteristic | null> {
  const services = await server.getPrimaryServices();
  // Utamakan service printer yang dikenal, lalu service lain yang ikut terbuka.
  services.sort((a, b) => {
    const ia = PRINTER_SERVICE_UUIDS.indexOf(a.uuid);
    const ib = PRINTER_SERVICE_UUIDS.indexOf(b.uuid);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  for (const svc of services) {
    let chars: GattCharacteristic[] = [];
    try {
      chars = await svc.getCharacteristics();
    } catch {
      continue;
    }
    const writable = chars.find((c) => c.properties.writeWithoutResponse || c.properties.write);
    if (writable) return writable;
  }
  return null;
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new PrinterError(msg, "connect_failed")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function openDevice(device: BtDevice): Promise<{ device: BtDevice; characteristic: GattCharacteristic }> {
  if (!device.gatt) throw new PrinterError("Perangkat ini bukan printer Bluetooth LE.", "connect_failed");
  const server = device.gatt.connected ? device.gatt : await withTimeout(device.gatt.connect(), 8000, "Printer tidak merespons. Pastikan printer menyala dan dekat dengan HP.");
  const characteristic = await findWritable(server);
  if (!characteristic) {
    throw new PrinterError(
      "Printer tersambung tapi tidak menyediakan jalur cetak BLE yang dikenali. Coba mode RawBT (Pengaturan → Printer) untuk printer Bluetooth Classic.",
      "no_characteristic"
    );
  }
  return { device, characteristic };
}

/**
 * Pilih printer lewat dialog Bluetooth Chrome (WAJIB dipanggil langsung dari klik pengguna).
 * Mengembalikan id & nama untuk disimpan di preferensi perangkat.
 */
export async function pairPrinter(): Promise<{ id: string; name: string }> {
  const bt = bluetooth();
  if (!bt) throw new PrinterError("Browser ini tidak mendukung Bluetooth. Pakai Chrome di Android atau aplikasi NEXBILL Android.", "unsupported");
  let device: BtDevice;
  try {
    device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICE_UUIDS });
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "NotFoundError") throw new PrinterError("Pemilihan printer dibatalkan.", "cancelled");
    if (name === "SecurityError") throw new PrinterError("Ketuk tombolnya sekali lagi untuk memilih printer.", "needs_gesture");
    throw new PrinterError(e instanceof Error ? e.message : String(e), "connect_failed");
  }
  active = await openDevice(device);
  return { id: device.id, name: device.name || "Printer Bluetooth" };
}

/** Sambungkan ke printer yang tersimpan; kalau tidak bisa tanpa dialog, buka dialog pemilihan. */
async function ensureConnected(savedId?: string | null): Promise<void> {
  if (active?.device.gatt?.connected) return;
  if (active) {
    try {
      active = await openDevice(active.device);
      return;
    } catch {
      active = null;
    }
  }
  const bt = bluetooth();
  if (!bt) throw new PrinterError("Browser ini tidak mendukung Bluetooth. Pakai Chrome di Android atau aplikasi NEXBILL Android.", "unsupported");
  if (savedId && bt.getDevices) {
    try {
      const known = (await bt.getDevices()).find((d) => d.id === savedId);
      if (known) {
        active = await openDevice(known);
        return;
      }
    } catch {
      // jatuh ke dialog pemilihan di bawah
    }
  }
  await pairPrinter();
}

/** Pastikan printer tersambung (pakai yang tersimpan, atau buka dialog pemilihan). Panggil dari klik. */
export async function prepareBluetoothPrinter(savedId?: string | null): Promise<{ id: string; name: string }> {
  await ensureConnected(savedId);
  return { id: active!.device.id, name: active!.device.name || "Printer Bluetooth" };
}

/** Kirim byte ESC/POS ke printer BLE (dipotong 20 byte — aman untuk MTU BLE default). */
export async function printViaBluetooth(bytes: Uint8Array, opts: { savedDeviceId?: string | null; chunkSize?: number } = {}): Promise<{ id: string; name: string }> {
  await ensureConnected(opts.savedDeviceId);
  const target = active!;
  const ch = target.characteristic;
  const useNoResponse = ch.properties.writeWithoutResponse && typeof ch.writeValueWithoutResponse === "function";
  try {
    for (const part of chunkBytes(bytes, opts.chunkSize ?? 20)) {
      // Salin ke ArrayBuffer baru: beberapa implementasi menolak view yang berbagi buffer.
      const buf = part.slice().buffer;
      if (useNoResponse) {
        await ch.writeValueWithoutResponse!(buf);
        await new Promise((r) => setTimeout(r, 8));
      } else if (ch.writeValueWithResponse) {
        await ch.writeValueWithResponse(buf);
      } else {
        await ch.writeValue!(buf);
      }
    }
  } catch (e) {
    active = null;
    throw new PrinterError(`Gagal mengirim ke printer: ${e instanceof Error ? e.message : String(e)}. Coba lagi — printer akan disambungkan ulang.`, "write_failed");
  }
  return { id: target.device.id, name: target.device.name || "Printer Bluetooth" };
}

export function disconnectPrinter() {
  try {
    active?.device.gatt?.disconnect();
  } catch {
    // abaikan
  }
  active = null;
}

/**
 * Cetak lewat aplikasi RawBT (Android). Intent URL: kalau RawBT belum terpasang, Android membuka
 * halamannya di Play Store. Harus dipicu dari klik pengguna.
 */
export function printViaRawBt(bytes: Uint8Array): void {
  const b64 = bytesToBase64(bytes);
  window.location.href = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}
