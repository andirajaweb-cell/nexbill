"use client";

/**
 * Per-PC/per-terminal printer preference — deliberately NOT stored in the
 * database. Printing in this app is plain browser `window.print()` (no
 * server-side driver, no ESC/POS, no local print-agent — the server has no
 * physical presence at any outlet), so the printer that actually receives a
 * job is always whichever one is set as default in THIS computer's own
 * OS/browser print dialog. That part already works per-PC with zero app
 * involvement.
 *
 * What this module adds is a *local, this-computer-only* memory of which
 * physical printer + paper width the cashier at this PC uses, so the receipt
 * page can render at the right width automatically and remind the cashier
 * which printer to expect — without affecting any other PC at the same
 * outlet. Falls back to the outlet's shared default (Settings → Business &
 * Tax → Printer & Struk) when nothing has been saved locally yet.
 *
 * Keyed by outletId (not just a flat object) so a shared PC used to log into
 * more than one outlet keeps a separate preference per outlet.
 */

export interface DevicePrinterSettings {
  printerName: string;
  paperWidthMm: 58 | 80;
}

const STORAGE_KEY = "nexbill_device_printer_settings_v1";

type StoredMap = Record<string, DevicePrinterSettings>;

function readAll(): StoredMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getDevicePrinterSettings(outletId: string): DevicePrinterSettings | null {
  if (!outletId) return null;
  const all = readAll();
  return all[outletId] ?? null;
}

export function saveDevicePrinterSettings(outletId: string, settings: DevicePrinterSettings) {
  if (typeof window === "undefined" || !outletId) return;
  const all = readAll();
  all[outletId] = settings;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function clearDevicePrinterSettings(outletId: string) {
  if (typeof window === "undefined" || !outletId) return;
  const all = readAll();
  delete all[outletId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Receipt container width in px for each supported paper size — used by the receipt page. */
export const PAPER_WIDTH_PX: Record<58 | 80, number> = { 58: 320, 80: 420 };
