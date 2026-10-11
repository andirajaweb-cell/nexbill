"use client";
import { useState } from "react";
import { Check, Copy, Smartphone, BatteryCharging, Wifi, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-devices-guide";
import "@/lib/i18n/dict-devices-guide-detail";
import { RelayIllustration, relayIllustrationLang, type RelayIllustrationKind } from "@/components/devices/AndroidRelayIllustrations";
import { ANDROID_GUIDE_URL } from "@/components/devices/AndroidRelayVisualGuide";

/**
 * Panduan memasang Relay Agent di HP ANDROID (bukan PC) untuk outlet yang awam teknologi.
 * Agent yang sama dengan versi PC (nexbill-agent-dist/index.js, di-host di
 * public/downloads/nexbill-agent/android/) dijalankan lewat aplikasi Termux; install.sh memasang
 * Node.js + adb, mengunduh agent, membuat perintah pintas (nexbill, nexbill-tv, nexbill-update),
 * dan autostart lewat Termux:Boot. Setiap perintah di sini punya tombol Salin supaya pemilik
 * outlet tidak perlu mengetik apa pun.
 */
// Upgrade penuh dulu: Termux lama yang langsung memasang curl baru berakhir dengan "CANNOT LINK
// EXECUTABLE curl … SSL_set_quic_tls_early_data_enabled" (curl baru, openssl lama). Pakai `apt`, bukan
// `pkg`: pkg memakai curl untuk memilih mirror, sehingga ikut gagal saat curl rusak.
export const ANDROID_INSTALL_COMMAND =
  "apt update && yes | apt full-upgrade && apt install -y curl && curl -fsSL https://www.nexbill.id/downloads/nexbill-agent/android/install.sh | bash";
const TERMUX_URL = "https://f-droid.org/packages/com.termux/";
const TERMUX_BOOT_URL = "https://f-droid.org/packages/com.termux.boot/";

const linkButtonCls =
  "inline-block rounded-lg px-3 py-2 text-xs font-medium transition bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10 hover:border-cyan-400/40";

function CopyCommand({ command }: { command: string }) {
  const { t } = useDashboardLang();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-1 rounded-lg border border-neutral-700 bg-black/40">
      <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap px-2 py-2 font-mono text-[11px] text-emerald-300">{command}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(command).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }).catch(() => {});
        }}
        className="shrink-0 flex items-center gap-1 border-l border-neutral-700 px-2 text-[11px] text-cyan-300 hover:bg-white/5"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("devices.guide.android.copied", "Tersalin") : t("devices.guide.android.copy", "Salin")}
      </button>
    </div>
  );
}

/** Daftar langkah bernomor kecil di dalam satu Step (1, 2, 3 …). */
function SubSteps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-neutral-300">{i + 1}</span>
          <span className="min-w-0">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Step({ n, title, illus, children }: { n: number; title: string; illus: RelayIllustrationKind; children: React.ReactNode }) {
  const { lang } = useDashboardLang();
  return (
    // grid-cols-1 (= minmax(0, 1fr)) di HP: tanpa itu kolom grid ikut melebar mengikuti perintah
    // panjang yang tidak boleh terpotong (whitespace-nowrap) dan teks langkah keluar dari kartu.
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_minmax(0,1fr)] items-start rounded-xl border border-neutral-800 bg-white/[0.015] p-3">
      <div className="max-w-[220px] sm:max-w-none">
        <RelayIllustration kind={illus} lang={relayIllustrationLang(lang)} />
      </div>
      <div className="flex min-w-0 gap-3">
        <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-300">{n}</div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-neutral-200 font-medium">{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AndroidRelayGuide({ onRequestToken, requesting }: { onRequestToken: () => void; requesting: boolean }) {
  const { t, lang } = useDashboardLang();
  return (
    <div className="space-y-4">
      <p>
        {t(
          "devices.guide.android.intro",
          "Tidak punya PC di outlet? HP Android bisa menggantikannya. HP ini menjadi \"jembatan\" antara NEXBILL dan Android TV di outlet. Ikuti langkah di bawah pelan-pelan — semua perintah tinggal disalin, tidak perlu mengetik. Cukup sekali per outlet."
        )}
      </p>

      <a href={`${ANDROID_GUIDE_URL}?lang=${lang}`} target="_blank" rel="noopener noreferrer" className={linkButtonCls}>
        {t("devices.guide.android.fullGuide", "Buka panduan bergambar lengkap (bisa dicetak)")}
      </a>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { icon: Smartphone, text: t("devices.guide.android.req1", "HP Android 7 ke atas — sebaiknya HP bekas khusus untuk ini, bukan HP pribadi yang dibawa pulang.") },
          { icon: Wifi, text: t("devices.guide.android.req2", "Tersambung ke WiFi yang SAMA dengan TV di outlet, dan selalu berada di outlet.") },
          { icon: BatteryCharging, text: t("devices.guide.android.req3", "Selalu dicas (colok charger terus) dan layar boleh mati.") },
        ].map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex gap-2 rounded-lg border border-neutral-800 bg-white/[0.02] p-2">
            <Icon size={16} className="shrink-0 text-cyan-300" />
            <span>{text}</span>
          </div>
        ))}
      </div>

      <Step n={1} illus="token" title={t("devices.guide.android.s1Title", "Minta Token")}>
        <p>{t("devices.guide.android.s1Body", "Tekan tombol di bawah. Token dikirim ke menu Chat/Bantuan. Buka menu itu di HP yang akan dipakai, supaya token mudah disalin nanti.")}</p>
        <Button className="text-xs" onClick={onRequestToken} disabled={requesting}>
          {requesting ? t("devices.guide.tv.requesting", "Mengirim...") : t("devices.guide.tv.requestTokenButton", "Minta Token Relay Agent")}
        </Button>
      </Step>

      <Step n={2} illus="install" title={t("devices.guide.android.s2Title", "Pasang aplikasi Termux dan Termux:Boot")}>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-amber-200">{t("devices.guide.android.s2Warn", "Pernah memasang Termux dari Play Store? Hapus dulu (uninstall). Termux versi Play Store sudah lama dan tidak cocok dengan Termux:Boot dari F-Droid.")}</div>
        <SubSteps
          items={[
            <>
              {t("devices.guide.android.s2a", "Di HP yang akan dipakai, buka link Termux di bawah dengan Chrome.")}
              <div className="mt-1.5 flex flex-wrap gap-2">
                <a className={linkButtonCls} href={TERMUX_URL} target="_blank" rel="noopener noreferrer">Termux</a>
                <a className={linkButtonCls} href={TERMUX_BOOT_URL} target="_blank" rel="noopener noreferrer">Termux:Boot</a>
              </div>
            </>,
            t("devices.guide.android.s2b", "Gulir ke bagian \"Packages\" / \"Paket\", lalu tekan \"Download APK\" / \"Unduh APK\" pada versi PALING ATAS. Jangan tekan tombol besar \"Download F-Droid\"."),
            t("devices.guide.android.s2c", "Setelah unduhan selesai, tekan \"Buka\" (atau buka file .apk dari notifikasi / folder Download)."),
            t("devices.guide.android.s2d", "Kalau muncul \"Untuk keamanan, HP Anda tidak diizinkan memasang aplikasi tidak dikenal dari sumber ini\": tekan Setelan, aktifkan \"Izinkan dari sumber ini\", lalu kembali dan tekan Instal."),
            t("devices.guide.android.s2e", "Kalau Google Play Protect memperingatkan, pilih \"Detail lainnya\" → \"Tetap instal\". Termux dari F-Droid adalah aplikasi resmi yang aman."),
            t("devices.guide.android.s2f", "Ulangi langkah yang sama untuk Termux:Boot (link kedua)."),
            t("devices.guide.android.s2g", "Buka aplikasi Termux:Boot SEKALI (cukup dibuka lalu ditutup), lalu buka Termux dan tunggu sampai muncul tanda $ di layar hitam."),
          ]}
        />
      </Step>

      <Step n={3} illus="paste" title={t("devices.guide.android.s3Title", "Salin satu perintah ke Termux")}>
        <p>
          {t(
            "devices.guide.android.s3Body",
            "Tekan Salin di bawah. Buka Termux, tekan lama di layar hitam, pilih Paste/Tempel, lalu tekan Enter. Tunggu 2–5 menit sampai muncul pilihan bahasa. Kalau ditanya \"Do you want to continue? [Y/n]\", ketik y lalu Enter."
          )}
        </p>
        <CopyCommand command={ANDROID_INSTALL_COMMAND} />
        <p className="text-neutral-500">{t("devices.guide.android.s3Done", "Selesai kalau muncul tulisan \"[5/5] Selesai dipasang\" lalu \"Pilih bahasa / Choose language\". Muncul tulisan \"WARNING: apt does not have a stable CLI interface\"? Itu normal, abaikan saja.")}</p>
      </Step>

      <Step n={4} illus="language" title={t("devices.guide.android.s4Title", "Pilih bahasa dan tempel token")}>
        <SubSteps items={[t("devices.guide.android.s4a", "Di Termux ketik angka bahasa lalu Enter (1 = Bahasa Indonesia, atau langsung Enter)."), t("devices.guide.android.s4b", "Ambil token: buka NEXBILL di Chrome HP ini → menu Chat/Bantuan → pesan berisi token → tekan lama teks token → Salin."), t("devices.guide.android.s4c", "Kembali ke Termux (tulisan \"Masukkan Agent Token\" masih tampil), tekan lama layar hitam → Paste → Enter."), t("devices.guide.android.s4d", "Berhasil kalau muncul \"Terhubung … Menunggu perintah dari NEXBILL\" dan status Relay Agent di halaman ini menjadi online.")]} />
      </Step>

      <Step n={5} illus="tv" title={t("devices.guide.android.s5Title", "Sambungkan setiap TV (sekali per TV)")}>
        <SubSteps
          items={[
            t("devices.guide.android.s5a", "Di TV: Settings → Device Preferences (atau System) → About → tekan baris \"Build\" 7 kali sampai muncul \"You are now a developer\"."),
            t("devices.guide.android.s5b", "Kembali ke Device Preferences → Developer options → aktifkan \"Network debugging\" (atau \"ADB debugging\"). Catat IP TV — biasanya tampil di bawahnya, mis. 192.168.1.23. Tidak terlihat? Lihat di Settings → Network & Internet → nama WiFi."),
            <>
              {t("devices.guide.android.s5c", "Di HP: buka Termux, geser dari tepi KIRI layar → tekan NEW SESSION, lalu ketik perintah di bawah dengan IP TV Anda dan Enter.")}
              <div className="mt-1.5">
                <CopyCommand command="nexbill-tv 192.168.1.50" />
              </div>
            </>,
            t("devices.guide.android.s5d", "Lihat layar TV: muncul \"Allow USB debugging?\" / \"Allow network debugging?\" — centang \"Always allow from this computer\", lalu pilih Allow/OK. Ulangi Langkah 5 untuk setiap TV."),
          ]}
        />
        <p className="text-neutral-500">{t("devices.guide.android.s5Note", "Ganti 192.168.1.50 dengan IP TV Anda. Berhasil kalau tertulis \"device\" di samping IP TV.")}</p>
      </Step>

      <Step n={6} illus="battery" title={t("devices.guide.android.s6Title", "Supaya tidak dimatikan oleh HP (penting!)")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("devices.guide.android.s6a", "Pengaturan → Aplikasi → Termux → Baterai → pilih \"Tidak dibatasi\" / \"Unrestricted\". Lakukan juga untuk Termux:Boot.")}</li>
          <li>{t("devices.guide.android.s6b", "Buka daftar aplikasi terbaru, tekan lama Termux, lalu pilih Kunci (ikon gembok) supaya tidak ikut tertutup saat \"Bersihkan semua\".")}</li>
          <li>{t("devices.guide.android.s6c", "Jangan hapus notifikasi Termux — itu tanda agent sedang berjalan.")}</li>
          <li>{t("devices.guide.android.s6g", "Tarik panel notifikasi, cari notifikasi Termux, lalu tekan \"Acquire wakelock\" supaya HP tidak menidurkan agent saat layar mati.")}</li>
        </ul>
        <ul className="list-disc pl-4 space-y-1 text-neutral-400">
          <li>{t("devices.guide.android.s6d", "Xiaomi / Redmi / POCO: Setelan → Aplikasi → Kelola aplikasi → Termux → aktifkan \"Mulai otomatis\", lalu Penghemat baterai → \"Tanpa batasan\".")}</li>
          <li>{t("devices.guide.android.s6e", "OPPO / realme / vivo: Setelan → Aplikasi → Termux → Penggunaan baterai → aktifkan \"Izinkan aktivitas latar belakang\" dan \"Izinkan mulai otomatis\".")}</li>
          <li>{t("devices.guide.android.s6f", "Samsung: Setelan → Aplikasi → Termux → Baterai → \"Tidak dibatasi\". Pastikan Termux tidak masuk daftar \"Aplikasi tidur\" di Setelan → Baterai → Batas penggunaan latar belakang.")}</li>
        </ul>
      </Step>

      <Step n={7} illus="done" title={t("devices.guide.android.s7Title", "Tambahkan TV di NEXBILL")}>
        <p>{t("devices.guide.android.s7Body", "Kembali ke halaman ini, klik \"Tambah Perangkat\", pilih protokol \"TV (Android/Google TV)\", isi nama dan IP TV dari Langkah 5, lalu Simpan. Selesai — TV bisa dinyalakan/dimatikan dari dashboard ini.")}</p>
      </Step>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-emerald-300">
          <Check size={14} /> {t("devices.guide.android.checkTitle", "Cara cek semuanya berjalan")}
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("devices.guide.android.check1", "Di halaman ini, status Relay Agent tertulis online.")}</li>
          <li>{t("devices.guide.android.check2", "Di HP ada notifikasi Termux (\"1 session\"). Kalau hilang, buka Termux dan ketik nexbill.")}</li>
          <li>{t("devices.guide.android.check3", "Di daftar perangkat di bawah, tombol Nyalakan/Matikan pada TV benar-benar menyalakan dan mematikan TV.")}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-amber-300">
          <AlertTriangle size={14} /> {t("devices.guide.android.troubleTitle", "Kalau ada masalah")}
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("devices.guide.android.troubleCurl", "Muncul \"CANNOT LINK EXECUTABLE curl\" atau \"cannot locate symbol\": paket Termux belum diperbarui semua. Di Termux ketik: apt update && yes | apt full-upgrade — tunggu selesai, lalu tempel lagi perintah Langkah 3.")}</li>
          <li>{t("devices.guide.android.trouble1", "Relay Agent \"offline\": buka Termux, ketik nexbill lalu Enter.")}</li>
          <li>{t("devices.guide.android.trouble2", "TV tidak merespons: pastikan TV menyala/standby dan di WiFi yang sama, lalu di Termux ketik nexbill-tv diikuti IP TV.")}</li>
          <li>{t("devices.guide.android.trouble3", "Setelah HP dinyalakan ulang, agent menyala sendiri (Termux:Boot). Kalau tidak, buka Termux dan ketik nexbill.")}</li>
          <li>{t("devices.guide.android.trouble4", "Agent memperbarui diri otomatis (diperiksa tiap 6 jam, dipasang pukul 03.00–06.00). Ingin langsung versi terbaru? Di Termux ketik nexbill-update — token tidak perlu dimasukkan ulang.")}</li>
          <li>{t("devices.guide.android.trouble5", "Masih bingung? Kirim foto layar Termux ke menu Chat/Bantuan — tim NEXBILL akan membantu.")}</li>
        </ul>
      </div>
    </div>
  );
}
