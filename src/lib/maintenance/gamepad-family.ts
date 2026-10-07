/**
 * Kenali jenis stik dari `Gamepad.id`. Formatnya berbeda per browser/OS:
 *
 *   Chrome/Edge desktop : "DUALSHOCK 4 Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)"
 *   Firefox             : "054c-09cc-Wireless Controller"
 *   Chrome ANDROID      : hanya nama perangkat dari Android/Linux, TANPA vendor/product id, mis.
 *                         "Sony PLAYSTATION(R)3 Controller", "Wireless Controller" (DS4),
 *                         "Sony Interactive Entertainment Wireless Controller" (DS4 via USB),
 *                         "DualSense Wireless Controller" (PS5).
 *
 * Versi lama hanya mengenali vendor id 054c → di HP Android stik PS3 dan PS4 tampil sebagai
 * "Controller generik / non-Sony" (label tombol A/B/X/Y). Sekarang nama Android ikut dikenali.
 */
export type GamepadFamily = "ps3" | "ps4" | "ps5" | "sony_other" | "generic";

const PS3_PRODUCTS = ["0268"];
const PS4_PRODUCTS = ["05c4", "09cc", "0ba0"]; // DS4 v1, DS4 v2, USB wireless adaptor
const PS5_PRODUCTS = ["0ce6", "0df2"]; // DualSense, DualSense Edge

/** Merek lain yang kadang juga menamai stiknya "Wireless Controller". */
const OTHER_BRANDS = ["xbox", "microsoft", "8bitdo", "nintendo", "switch", "pro controller", "logitech", "razer", "gamesir", "ipega", "flydigi", "stadia", "nvidia", "steam"];

function productId(s: string): string | null {
  const chrome = s.match(/product:\s*([0-9a-f]{4})/);
  if (chrome) return chrome[1];
  const firefox = s.match(/^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/);
  if (firefox && firefox[1].padStart(4, "0") === "054c") return firefox[2].padStart(4, "0");
  return null;
}

function isSonyVendor(s: string): boolean {
  return /vendor:\s*054c/.test(s) || /^0*54c-/.test(s);
}

export function detectGamepadFamily(id: string): GamepadFamily {
  const s = (id || "").toLowerCase().trim();
  if (!s) return "generic";

  if (isSonyVendor(s)) {
    const p = productId(s);
    if (p && PS3_PRODUCTS.includes(p)) return "ps3";
    if (p && PS4_PRODUCTS.includes(p)) return "ps4";
    if (p && PS5_PRODUCTS.includes(p)) return "ps5";
    // Nama di depan id masih bisa membantu (mis. vendor Sony, product baru).
    const byName = detectByName(s);
    return byName === "generic" ? "sony_other" : byName;
  }
  return detectByName(s);
}

function detectByName(s: string): GamepadFamily {
  if (s.includes("dualsense")) return "ps5";
  if (s.includes("playstation(r)3") || s.includes("playstation 3") || s.includes("playstation3") || s.includes("dualshock 3") || s.includes("dualshock3") || s.includes("sixaxis") || /\bps3\b/.test(s)) return "ps3";
  if (s.includes("dualshock 4") || s.includes("dualshock4") || /\bps4\b/.test(s)) return "ps4";
  // Android menamai DualShock 4 cukup "Wireless Controller" (Bluetooth) atau
  // "Sony ... Entertainment Wireless Controller" (USB). Abaikan bila ada merek lain di namanya.
  if (/(^|\s|\b)wireless controller\b/.test(s) && !OTHER_BRANDS.some((b) => s.includes(b))) return "ps4";
  if (s.includes("sony") || s.includes("playstation")) return "sony_other";
  return "generic";
}

/** HP/tablet Android (termasuk aplikasi NEXBILL Android, yang memakai Chrome). */
export function isAndroidUserAgent(ua: string): boolean {
  return /android/i.test(ua || "");
}
