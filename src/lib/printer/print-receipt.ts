"use client";

import { uiText } from "@/lib/i18n/client-text";
import "@/lib/i18n/dict-printer";
import { buildReceiptEscPos, receiptDocFromOrder, testReceiptDoc, type PaperWidth } from "./escpos";
import { getDevicePrinterSettings, saveDevicePrinterSettings, printConnectionOf, type DevicePrinterSettings } from "./deviceSettings";
import { printViaBluetooth, printViaRawBt, prepareBluetoothPrinter } from "./bluetooth-printer";

/**
 * Satu pintu "Cetak Struk" untuk Kasir, Transaksi, dan halaman struk:
 *  - mode "system"    → buka /receipt/[id] (dialog print seperti biasa),
 *  - mode "bluetooth" → ESC/POS langsung ke printer BLE,
 *  - mode "rawbt"     → ESC/POS lewat aplikasi RawBT.
 * Harus dipanggil dari handler klik (Web Bluetooth & intent butuh gesture pengguna).
 */
export async function printOrderReceipt(orderId: string, outletId: string | null | undefined): Promise<"opened" | "printed"> {
  const settings = outletId ? getDevicePrinterSettings(outletId) : null;
  const conn = printConnectionOf(settings);
  if (conn === "system") {
    window.open(`/receipt/${orderId}`, "_blank");
    return "opened";
  }
  // Sambungkan printer DULU (selagi gesture klik masih berlaku), baru ambil data struk.
  if (conn === "bluetooth") await rememberDevice(outletId, settings, await prepareBluetoothPrinter(settings?.bluetoothDeviceId));

  const res = await fetch(`/api/orders/${orderId}/receipt`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.order) throw new Error(data?.error ?? uiText("printer.receipt.loadFailed", "Gagal memuat data struk."));
  const paper: PaperWidth = settings?.paperWidthMm ?? (data.outlet?.printerPaperWidthMm === 80 ? 80 : 58);
  const bytes = buildReceiptEscPos(receiptDocFromOrder(data), paper, { cut: !!settings?.autoCut });

  if (conn === "rawbt") printViaRawBt(bytes);
  else await printViaBluetooth(bytes, { savedDeviceId: settings?.bluetoothDeviceId });
  return "printed";
}

/** Struk uji dari Pengaturan → Printer. */
export async function printTestReceipt(outletId: string, settings: DevicePrinterSettings, outletName: string): Promise<{ id: string; name: string } | null> {
  const paper: PaperWidth = settings.paperWidthMm;
  const bytes = buildReceiptEscPos(testReceiptDoc(outletName, paper, new Date().toLocaleString("id-ID")), paper, { cut: !!settings.autoCut });
  if (printConnectionOf(settings) === "rawbt") {
    printViaRawBt(bytes);
    return null;
  }
  const dev = await printViaBluetooth(bytes, { savedDeviceId: settings.bluetoothDeviceId });
  await rememberDevice(outletId, settings, dev);
  return dev;
}

async function rememberDevice(outletId: string | null | undefined, settings: DevicePrinterSettings | null, dev: { id: string; name: string }) {
  if (!outletId || !settings) return;
  if (settings.bluetoothDeviceId === dev.id && settings.bluetoothDeviceName === dev.name) return;
  saveDevicePrinterSettings(outletId, { ...settings, bluetoothDeviceId: dev.id, bluetoothDeviceName: dev.name });
}
