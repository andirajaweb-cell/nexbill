"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useDashboardLang, type LangCode } from "@/lib/i18n/dashboard-lang";
import { showAlert } from "@/lib/ui/dialog";
import { setPsCursorLoading } from "@/lib/ui/ps-cursor";
import "@/lib/i18n/dict-devices-guide";

/**
 * NexbillAgent v1.2 (2026-09-24): SATU zip untuk semua bahasa. Agent v1.2 memuat enam bahasa dalam
 * satu .exe dan menampilkan menu bahasa saat pertama kali dijalankan (lihat nexbill-agent-dist/
 * index.js, chooseLanguage) — enam zip per bahasa seperti di v1.0 tidak lagi dibutuhkan.
 *
 * ISI ZIP HANYA EMPAT FILE: NexbillAgent.exe, adb.exe, AdbWinApi.dll, AdbWinUsbApi.dll. Jangan pernah
 * ikut memasukkan config.json, agent.lock, atau agent.log — config.json berisi TOKEN relay agent
 * outlet yang menjalankannya, dan file di public/ bisa diunduh siapa saja yang tahu alamatnya.
 *
 * Zip v1.0 lama masih ada di folder yang sama tapi sudah tidak ditautkan dari sini.
 */
const AGENT_DOWNLOAD_URL = "/downloads/nexbill-agent/NexbillRelay-v1.2.zip";
const DOWNLOAD_BY_LANG: Record<LangCode, string> = {
  id: AGENT_DOWNLOAD_URL,
  en: AGENT_DOWNLOAD_URL,
  ms: AGENT_DOWNLOAD_URL,
  th: AGENT_DOWNLOAD_URL,
  fil: AGENT_DOWNLOAD_URL,
  vi: AGENT_DOWNLOAD_URL,
};

/**
 * Panduan lengkap untuk outlet (PC kasir, TV Android, masalah P01–P28, risiko). Satu file HTML
 * mandiri berisi enam bahasa; bahasa dipilih lewat ?lang= (lalu bahasa browser, lalu Indonesia),
 * dan punya tombol "Cetak / Simpan PDF" sendiri. Kode masalah P01–P28 sama di semua bahasa, jadi
 * Customer Service bisa merujuk kode yang sama apa pun bahasa outlet-nya.
 */
const FULL_GUIDE_URL = "/downloads/nexbill-agent/panduan-nexbillagent.html";

const linkButtonCls =
  "inline-block rounded-lg px-3 py-2 text-xs font-medium transition bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10 hover:border-cyan-400/40";

type SectionKey = "http" | "tuya" | "ewelink" | "tv";

/**
 * Step-by-step, outlet-facing setup guide for every device protocol on this page. Lives as its
 * own component (rather than inline in page.tsx) purely because of size — four full walkthroughs
 * across 6 languages is a lot of copy. The TV section is the deep one: request a token (opens a
 * real support ticket via /api/support-chat so it lands in platform-admin's inbox — see
 * /platform-admin/relay-agents), download NexbillAgent for the outlet's own dashboard language,
 * run it once, pair the TV once, then come back and use the normal "Tambah Perangkat" form.
 */
export function DeviceSetupGuide() {
  const { t, lang } = useDashboardLang();
  const [open, setOpen] = useState<SectionKey | null>("tv");
  const [requesting, setRequesting] = useState(false);

  // Fully automatic since the /api/devices/relay-agent-token-request endpoint shipped — no
  // platform-admin action needed, the token is minted and delivered into a support ticket
  // synchronously within this one request. One token per outlet ever via this button; a second
  // click gets the backend's own "sudah pernah meminta, hubungi Customer Service" message verbatim.
  const requestToken = async () => {
    setRequesting(true);
    setPsCursorLoading(true); // demo of the "Spinning Symbols" cursor — see lib/ui/ps-cursor.ts
    try {
      const res = await fetch("/api/devices/relay-agent-token-request", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      showAlert(
        t(
          "devices.guide.tv.ticketSent",
          "Token Relay Agent sudah dibuat dan dikirim! Cek menu Chat/Bantuan untuk melihat tokennya, lalu lanjut ke Langkah 2 di bawah."
        )
      );
    } catch {
      showAlert(t("devices.guide.tv.ticketFailed", "Gagal mengirim permintaan. Coba lagi, atau hubungi tim NEXBILL lewat menu Chat/Bantuan."));
    } finally {
      setRequesting(false);
      setPsCursorLoading(false);
    }
  };

  // "http" (HTTP Generik) and "ewelink" (Sonoff eWeLink) are deliberately left out of this list —
  // both protocols still work for any device already set up on them (see page.tsx's
  // DeviceFormFields, which keeps their dropdown option visible only while editing such a
  // device), but they're not offered or documented as a setup path for NEW devices right now. The
  // guide content itself (below, s.key === "http" / "ewelink") is left in place, just unreachable,
  // so re-enabling either one later is a one-line change back to this array.
  const sections: { key: SectionKey; title: string }[] = [
    { key: "tuya", title: t("devices.guide.tuya.title", "Tuya Smart Life") },
    { key: "tv", title: t("devices.guide.tv.title", "TV (Android/Google TV) via NexbillAgent") },
  ];

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-medium">{t("devices.guide.heading", "Panduan Setup Perangkat")}</h2>
        <p className="text-xs text-neutral-500">
          {t("devices.guide.subheading", "Klik salah satu jenis perangkat di bawah untuk lihat cara settingnya, langkah demi langkah.")}
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((s) => (
          <div key={s.key} className="rounded-lg border border-neutral-800 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-left hover:bg-white/5"
              onClick={() => setOpen(open === s.key ? null : s.key)}
            >
              <span>{s.title}</span>
              <span className="text-neutral-500 text-xs">{open === s.key ? "▲" : "▼"}</span>
            </button>

            {open === s.key && (
              <div className="px-3 pb-3 text-xs text-neutral-400 space-y-3 border-t border-neutral-800 pt-3">
                {s.key === "http" && (
                  <p>
                    {t(
                      "devices.guide.http.body",
                      'Untuk smart plug/relay yang punya URL HTTP sendiri untuk ON/OFF (mis. Shelly, Sonoff dengan firmware custom). Langkah: 1) Buka aplikasi/dashboard bawaan perangkat, cari URL untuk menyalakan dan mematikan (biasanya seperti http://192.168.1.xx/relay/0?turn=on dan .../turn=off). 2) Di sini, pilih protokol "HTTP Generik", isi kedua URL itu di kolom "URL untuk ON" dan "URL untuk OFF". 3) Simpan — coba tombol Nyalakan/Matikan di kartu perangkat untuk pastikan berhasil.'
                    )}
                  </p>
                )}

                {s.key === "tuya" && (
                  <div className="space-y-2">
                    <p>
                      {t(
                        "devices.guide.tuya.body",
                        'Untuk smart plug yang pakai aplikasi Tuya Smart / Smart Life. PENTING: outlet ini wajib punya akun Tuya Cloud API sendiri dulu (isi di Pengaturan > Integrasi Tuya Cloud API) — lihat langkah lengkapnya di Pusat Bantuan > Kontrol Perangkat. Setelah itu: 1) Pasang perangkat & hubungkan ke WiFi lewat aplikasi Tuya Smart / Smart Life seperti biasa. 2) Buka aplikasi itu, masuk ke detail perangkat > ikon pensil/Device Information, salin "Device ID"-nya. 3) Di sini, pilih protokol "Tuya Smart Life", tempel Device ID itu — kolom "Kode DP Switch" boleh dikosongkan (default switch_1). 4) Simpan dan coba tombol Nyalakan/Matikan.'
                      )}
                    </p>
                    <p className="text-amber-400/90">
                      {t(
                        "devices.guide.tuya.activationNote",
                        'Kalau tombol Nyalakan/Matikan belum berfungsi setelah Langkah 4, cek dulu: (1) sudah isi Access ID/Secret Tuya Cloud API outlet ini di Pengaturan? (2) langganan IoT Core di akun Tuya itu masih aktif (belum expired)? Kalau sudah benar tapi tetap gagal, hubungi tim NEXBILL lewat menu Chat/Bantuan.'
                      )}
                    </p>
                  </div>
                )}

                {s.key === "ewelink" && (
                  <p>
                    {t(
                      "devices.guide.ewelink.body",
                      'Untuk perangkat Sonoff yang pakai aplikasi eWeLink bawaan. Langkah: 1) Pasang & hubungkan perangkat ke WiFi lewat aplikasi eWeLink. 2) Di sini, pilih protokol "Sonoff eWeLink", isi nama perangkat lalu simpan — tidak ada kolom tambahan yang wajib diisi. 3) Kalau tombol Nyalakan/Matikan belum berfungsi, hubungi tim NEXBILL lewat menu Chat/Bantuan.'
                    )}
                  </p>
                )}

                {s.key === "tv" && (
                  <div className="space-y-3">
                    <p>
                      {t(
                        "devices.guide.tv.intro",
                        "Untuk mengontrol Android TV / Google TV (nyalakan-matikan dari jauh) lewat aplikasi kecil bernama NexbillAgent yang jalan di PC outlet. Ikuti 5 langkah ini secara berurutan — cukup sekali saja per outlet."
                      )}
                    </p>

                    <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3 space-y-2">
                      <div className="text-neutral-200 font-medium">
                        {t("devices.guide.tv.fullGuideHeading", "Panduan Lengkap NexbillAgent")}
                      </div>
                      <p>
                        {t(
                          "devices.guide.tv.fullGuideBody",
                          "Baca dulu sebelum memasang. Berisi langkah demi langkah untuk PC kasir dan TV Android, cara mengunci IP TV, pengaturan daya TV, TV Screensaver, 28 masalah umum beserta solusinya (kode P01–P28), risiko dan cara mencegahnya, serta daftar cek harian. Tersedia dalam 6 bahasa dan bisa dicetak atau disimpan sebagai PDF."
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          className={linkButtonCls}
                          href={`${FULL_GUIDE_URL}?lang=${lang}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("devices.guide.tv.fullGuideRead", "Baca Panduan")}
                        </a>
                        <a className={linkButtonCls} href={FULL_GUIDE_URL} download="Panduan-NexbillAgent.html">
                          {t("devices.guide.tv.fullGuideDownload", "Unduh Panduan")}
                        </a>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-neutral-300 font-medium">{t("devices.guide.tv.step1Heading", "Langkah 1 — Minta Token")}</div>
                      <p>
                        {t(
                          "devices.guide.tv.step1Body",
                          "Klik tombol di bawah — token dibuat otomatis dan langsung dikirim ke menu Chat/Bantuan, tidak perlu menunggu tim NEXBILL. Token ini rahasia, hanya dipakai satu kali di aplikasi NexbillAgent nanti, dan hanya bisa diminta sekali per outlet lewat tombol ini — kalau butuh token lagi (mis. TV/PC kedua), hubungi Customer Service lewat menu Chat/Bantuan."
                        )}
                      </p>
                      <Button className="text-xs" onClick={requestToken} disabled={requesting}>
                        {requesting ? t("devices.guide.tv.requesting", "Mengirim...") : t("devices.guide.tv.requestTokenButton", "Minta Token Relay Agent")}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <div className="text-neutral-300 font-medium">{t("devices.guide.tv.step2Heading", "Langkah 2 — Unduh Aplikasi NexbillAgent")}</div>
                      <p>
                        {t(
                          "devices.guide.tv.step2Body",
                          "Unduh file zip-nya, lalu extract ke folder mana saja di PC outlet. Satu file untuk semua bahasa — bahasanya dipilih saat aplikasi pertama kali dijalankan."
                        )}
                      </p>
                      <a className={linkButtonCls} href={DOWNLOAD_BY_LANG[lang] ?? DOWNLOAD_BY_LANG.id} download>
                        {t("devices.guide.tv.downloadButton", "Unduh NexbillAgent")}
                      </a>
                    </div>

                    <div className="space-y-1">
                      <div className="text-neutral-300 font-medium">{t("devices.guide.tv.step3Heading", "Langkah 3 — Jalankan & Tempel Token")}</div>
                      <p>
                        {t(
                          "devices.guide.tv.step3Body",
                          'Buka folder hasil extract, jalankan NexbillAgent.exe. Saat pertama kali dijalankan, pilih bahasa (ketik angkanya, atau langsung Enter untuk Bahasa Indonesia), lalu aplikasi akan minta "Masukkan Agent Token" — tempel token dari Langkah 1. Setelah itu token tersimpan otomatis, dan NexbillAgent menyala sendiri setiap kali PC ini login.'
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-neutral-300 font-medium">{t("devices.guide.tv.step4Heading", "Langkah 4 — Setup TV (sekali per TV)")}</div>
                      <p>
                        {t(
                          "devices.guide.tv.step4Body",
                          'Di TV: buka Settings > Device Preferences (System) > About > tekan baris versi build 7x sampai muncul "Developer options". Masuk ke Developer options, aktifkan "Network debugging", catat alamat IP yang muncul di layar. Saat NexbillAgent pertama kali konek ke TV ini, layar TV akan menampilkan popup "Allow debugging?" — centang "Always allow from this computer" lalu pilih Izinkan. Setelah itu tidak perlu approve lagi.'
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-neutral-300 font-medium">{t("devices.guide.tv.step5Heading", "Langkah 5 — Tambahkan di NEXBILL")}</div>
                      <p>
                        {t(
                          "devices.guide.tv.step5Body",
                          'Kembali ke halaman ini, klik "Tambah Perangkat", pilih protokol "TV (Android/Google TV)", isi nama dan IP TV dari Langkah 4, lalu Simpan. Selesai — TV bisa dinyalakan/dimatikan dari dashboard ini.'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
