/**
 * Unit mana yang boleh — dan yang benar-benar BISA — memakai TV Screensaver. MURNI: tanpa db,
 * supaya aturannya bisa diuji dan dipakai ulang di service maupun di mana pun nanti.
 *
 * ATURAN DARI PEMILIK (2026-09-23): fitur ini untuk setup TV Android, BUKAN untuk TV analog dan
 * BUKAN untuk Smart TV (yang di outlet dikontrol smart plug Tuya / Tasmota MQTT).
 *
 * Alasan teknis di balik tiap keputusan, supaya tidak dilonggarkan tanpa sengaja:
 *
 *   - TV analog: tidak punya sistem operasi. Tidak ada yang bisa membuka halaman /tv.
 *
 *   - Smart TV non-Android (Tizen, webOS, dll.): secara teori punya browser, tapi dua hal membuatnya
 *     tidak bisa berjalan sendiri. (1) NEXBILL tidak punya jalur kontrol apa pun ke OS itu, jadi
 *     tidak ada yang bisa memindahkan layar dari input HDMI PlayStation ke halaman screensaver —
 *     TV akan diam di input HDMI menampilkan "No Signal". (2) Unit smart TV di outlet dikontrol
 *     smart plug yang MEMUTUS DAYA saat sesi berhenti (lihat stopRentalSession), jadi layarnya mati
 *     tepat pada saat screensaver seharusnya muncul.
 *
 *   - TV Android + ADB (android_tv_adb / android_tv_relay): jalur yang paling cocok. TV tidak
 *     pernah kehilangan daya, dan NEXBILL sudah punya saluran perintah ke dalam TV-nya. Satu
 *     catatan jujur: saat ini perintah "sesi selesai" adalah KEYCODE_SLEEP (lihat adbSleep di
 *     lib/devices/adb-shell.ts), jadi layar ditidurkan dan screensaver baru tampil setelah TV
 *     dibangunkan lagi.
 *
 *   - TV Android + smart plug: DIIZINKAN tapi diberi peringatan, bukan diblokir. NEXBILL tidak
 *     bisa tahu apa yang dicolokkan ke plug itu. Kalau plug-nya memutus daya TV, screensaver tidak
 *     akan pernah tampil; tapi kalau plug hanya mengontrol konsol, TV tetap menyala dan fitur ini
 *     berjalan normal. Memblokirnya akan menghukum setup kedua yang sah.
 *
 *   - TV Android tanpa perangkat kontrol: diizinkan. TV tetap menyala, hanya saja tidak ada yang
 *     otomatis memindahkan input kembali ke screensaver setelah sesi — staf yang melakukannya.
 */

export type TvEligibilityLevel = "ready" | "warning" | "unsupported";

export interface TvEligibility {
  level: TvEligibilityLevel;
  /** Label singkat untuk lencana di dashboard. */
  label: string;
  /** Satu-dua kalimat untuk merchant: apa artinya, dan kalau perlu, apa yang harus dilakukan. */
  reason: string;
  /** Jenis kontrol yang terdeteksi — dipakai dashboard untuk mengelompokkan unit. */
  control: "adb" | "smart_plug" | "none" | "n/a";
}

/** Disalin dari SMART_PLUG_PROTOCOLS / ANDROID_TV_PROTOCOLS di lib/subscription/config.ts — dan diuji tetap sinkron (lihat eligibility.test.ts). */
const SMART_PLUG = new Set(["tuya", "tasmota_mqtt", "sonoff_ewelink", "http_generic"]);
const ADB = new Set(["android_tv_adb", "android_tv_relay"]);

export function assessTvEligibility(tvType: string | null | undefined, deviceProtocol: string | null | undefined): TvEligibility {
  if (tvType === "analog_tv") {
    return {
      level: "unsupported",
      label: "Tidak didukung",
      reason: "TV analog tidak punya sistem operasi, jadi tidak bisa membuka halaman screensaver NEXBILL.",
      control: "n/a",
    };
  }

  if (tvType === "smart_tv") {
    return {
      level: "unsupported",
      label: "Tidak didukung",
      reason:
        "Smart TV non-Android tidak didukung: NEXBILL tidak bisa memindahkan layarnya dari input PlayStation ke screensaver, dan smart plug memutus dayanya saat sesi selesai. Kalau TV ini sebenarnya TV Android / Google TV, ubah Tipe TV unit ini di menu Rental PS.",
      control: "n/a",
    };
  }

  if (tvType !== "android_tv") {
    return {
      level: "unsupported",
      label: "Tidak didukung",
      reason: "Tipe TV unit ini belum diisi. Atur Tipe TV-nya menjadi Android TV di menu Rental PS.",
      control: "n/a",
    };
  }

  if (deviceProtocol && ADB.has(deviceProtocol)) {
    return {
      level: "ready",
      label: "Siap — kontrol ADB",
      reason:
        "Setup paling cocok: TV tidak pernah kehilangan daya dan NEXBILL sudah terhubung ke TV-nya. Catatan: saat sesi selesai, TV saat ini masih ditidurkan (sleep), jadi screensaver tampil setelah TV dibangunkan.",
      control: "adb",
    };
  }

  if (deviceProtocol && SMART_PLUG.has(deviceProtocol)) {
    return {
      level: "warning",
      label: "Perlu dicek — smart plug",
      reason:
        "TV Android ini dikontrol smart plug. Kalau plug itu memutus daya TV, screensaver tidak akan pernah tampil setelah sesi selesai. Saran: kontrol TV-nya lewat Android TV (Relay Agent) di Kontrol Perangkat, dan pakai smart plug hanya untuk konsol.",
      control: "smart_plug",
    };
  }

  return {
    level: "ready",
    label: "Siap — tanpa kontrol",
    reason: "TV tetap menyala karena tidak dikontrol perangkat apa pun. Setelah sesi selesai, staf perlu memindahkan input TV kembali ke NEXBILL.",
    control: "none",
  };
}

/** Boleh dipasangkan layar? Hanya "unsupported" yang ditolak. */
export function canPairScreen(e: TvEligibility): boolean {
  return e.level !== "unsupported";
}
