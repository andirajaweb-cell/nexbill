"use client";
import { useState } from "react";
import { Check, Copy, Smartphone, BatteryCharging, Wifi, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-devices-guide";
import { RelayIllustration, type RelayIllustrationKind } from "@/components/devices/AndroidRelayIllustrations";
import { ANDROID_GUIDE_URL } from "@/components/devices/AndroidRelayVisualGuide";

/**
 * Panduan memasang Relay Agent di HP ANDROID (bukan PC) untuk outlet yang awam teknologi.
 * Agent yang sama dengan versi PC (nexbill-agent-dist/index.js, di-host di
 * public/downloads/nexbill-agent/android/) dijalankan lewat aplikasi Termux; install.sh memasang
 * Node.js + adb, mengunduh agent, membuat perintah pintas (nexbill, nexbill-tv, nexbill-update),
 * dan autostart lewat Termux:Boot. Setiap perintah di sini punya tombol Salin supaya pemilik
 * outlet tidak perlu mengetik apa pun.
 */
export const ANDROID_INSTALL_COMMAND =
  "pkg install -y curl && curl -fsSL https://www.nexbill.id/downloads/nexbill-agent/android/install.sh | bash";
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

function Step({ n, title, illus, children }: { n: number; title: string; illus: RelayIllustrationKind; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[150px_1fr] items-start rounded-xl border border-neutral-800 bg-white/[0.015] p-3">
      <div className="max-w-[220px] sm:max-w-none">
        <RelayIllustration kind={illus} />
      </div>
      <div className="flex gap-3">
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
        <p>
          {t(
            "devices.guide.android.s2Body",
            "Buka dua link di bawah dari HP tersebut. Di setiap halaman, gulir ke bawah dan tekan \"Download APK\", lalu buka file-nya dan pasang. Kalau HP bertanya \"Izinkan dari sumber ini?\", pilih Izinkan. Pasang KEDUANYA dari F-Droid (jangan campur dengan versi Play Store, nanti tidak cocok)."
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <a className={linkButtonCls} href={TERMUX_URL} target="_blank" rel="noopener noreferrer">Termux</a>
          <a className={linkButtonCls} href={TERMUX_BOOT_URL} target="_blank" rel="noopener noreferrer">Termux:Boot</a>
        </div>
        <p className="text-neutral-500">{t("devices.guide.android.s2Note", "Setelah terpasang, buka Termux:Boot SEKALI saja (cukup dibuka lalu ditutup) supaya agent bisa menyala otomatis saat HP dinyalakan ulang.")}</p>
      </Step>

      <Step n={3} illus="paste" title={t("devices.guide.android.s3Title", "Salin satu perintah ke Termux")}>
        <p>
          {t(
            "devices.guide.android.s3Body",
            "Tekan Salin di bawah. Buka Termux, tekan lama di layar hitam, pilih Paste/Tempel, lalu tekan Enter. Tunggu 2–5 menit sampai muncul pilihan bahasa. Kalau ditanya \"Do you want to continue? [Y/n]\", ketik y lalu Enter."
          )}
        </p>
        <CopyCommand command={ANDROID_INSTALL_COMMAND} />
      </Step>

      <Step n={4} illus="language" title={t("devices.guide.android.s4Title", "Pilih bahasa dan tempel token")}>
        <p>
          {t(
            "devices.guide.android.s4Body",
            "Ketik angka bahasa (atau langsung Enter untuk Bahasa Indonesia). Saat diminta \"Masukkan Agent Token\", tempel token dari Langkah 1 lalu Enter. Berhasil kalau muncul tulisan \"Terhubung… Menunggu perintah dari NEXBILL\" dan status Relay Agent di halaman ini berubah menjadi online. Biarkan Termux tetap terbuka (boleh ditinggal di belakang)."
          )}
        </p>
      </Step>

      <Step n={5} illus="tv" title={t("devices.guide.android.s5Title", "Sambungkan setiap TV (sekali per TV)")}>
        <p>
          {t(
            "devices.guide.android.s5Body",
            "Di TV: aktifkan Developer options dan Network debugging, lalu catat alamat IP TV (caranya sama seperti panduan PC, Langkah 4). Kembali ke HP, buka Termux, geser dari kiri layar dan pilih NEW SESSION, lalu ketik perintah di bawah dengan IP TV Anda. Di layar TV akan muncul \"Allow debugging?\" — centang \"Always allow\" lalu pilih Izinkan."
          )}
        </p>
        <CopyCommand command="nexbill-tv 192.168.1.50" />
        <p className="text-neutral-500">{t("devices.guide.android.s5Note", "Ganti 192.168.1.50 dengan IP TV Anda. Berhasil kalau tertulis \"device\" di samping IP TV.")}</p>
      </Step>

      <Step n={6} illus="battery" title={t("devices.guide.android.s6Title", "Supaya tidak dimatikan oleh HP (penting!)")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("devices.guide.android.s6a", "Pengaturan → Aplikasi → Termux → Baterai → pilih \"Tidak dibatasi\" / \"Unrestricted\". Lakukan juga untuk Termux:Boot.")}</li>
          <li>{t("devices.guide.android.s6b", "Buka daftar aplikasi terbaru, tekan lama Termux, lalu pilih Kunci (ikon gembok) supaya tidak ikut tertutup saat \"Bersihkan semua\".")}</li>
          <li>{t("devices.guide.android.s6c", "Jangan hapus notifikasi Termux — itu tanda agent sedang berjalan.")}</li>
        </ul>
      </Step>

      <Step n={7} illus="done" title={t("devices.guide.android.s7Title", "Tambahkan TV di NEXBILL")}>
        <p>{t("devices.guide.tv.step5Body", "Kembali ke halaman ini, klik \"Tambah Perangkat\", pilih protokol \"TV (Android/Google TV)\", isi nama dan IP TV dari Langkah 4, lalu Simpan. Selesai — TV bisa dinyalakan/dimatikan dari dashboard ini.")}</p>
      </Step>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-amber-300">
          <AlertTriangle size={14} /> {t("devices.guide.android.troubleTitle", "Kalau ada masalah")}
        </div>
        <ul className="list-disc pl-4 space-y-1">
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
