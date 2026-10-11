"use client";
import Link from "next/link";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-devices-tvapp";

/**
 * Panduan "Aplikasi NEXBILL TV" (folder android-tv/): cara kontrol TV paling mudah untuk Android TV /
 * Google TV — tanpa PC, tanpa HP, tanpa Developer options/ADB. Aplikasi memakai pairing kode 6 digit
 * yang sama dengan TV Screensaver (Pengaturan › TV Screensaver), lalu menampilkan HDMI saat sesi
 * berjalan dan menutupnya dengan halaman /tv saat waktu habis.
 */
export function TvAppGuide() {
  const { t } = useDashboardLang();
  const steps: { title: string; body: string; link?: { href: string; label: string } }[] = [
    {
      title: t("devices.guide.tvApp.s1Title", "Pasang aplikasi NEXBILL TV di TV"),
      body: t(
        "devices.guide.tvApp.s1Body",
        "Di TV, buka Google Play dan pasang aplikasi gratis \"Downloader\" (by AFTVnews). Buka Downloader, ketik alamat nexbill.id/tvapk lalu Go — file NEXBILL TV terunduh, pilih Install. Kalau TV bertanya, izinkan Downloader memasang aplikasi tidak dikenal. Setelah NEXBILL TV terbit di Google Play, cukup cari \"NEXBILL TV\" di Google Play."
      ),
    },
    {
      title: t("devices.guide.tvApp.s2Title", "Buat layar dan kode pairing"),
      body: t(
        "devices.guide.tvApp.s2Body",
        "Buka Pengaturan › TV Screensaver, tambah layar untuk unit ini, lalu lihat kode 6 digitnya (berlaku 30 menit). Pastikan TV Screensaver aktif di Pengaturan › Feature Management dan tipe TV unitnya \"Android TV\"."
      ),
      link: { href: "/dashboard/settings?tab=tv", label: t("devices.guide.tvApp.s2Link", "Buka TV Screensaver") },
    },
    {
      title: t("devices.guide.tvApp.s3Title", "Ketik kode di TV"),
      body: t(
        "devices.guide.tvApp.s3Body",
        "Buka aplikasi NEXBILL TV, lalu ketik kode 6 digit dengan tombol angka di remote. Selesai — mulai sekarang TV mengikuti sesi di kasir."
      ),
    },
    {
      title: t("devices.guide.tvApp.s4Title", "Pilih input HDMI konsol (sekali saja)"),
      body: t(
        "devices.guide.tvApp.s4Body",
        "Tahan tombol OK di remote selama 3 detik untuk membuka menu staf, pilih \"Pilih input HDMI\", lalu pilih HDMI tempat PlayStation dicolok. Kalau layar meminta PIN, pakai PIN layar dari Pengaturan › TV Screensaver."
      ),
    },
    {
      title: t("devices.guide.tvApp.s5Title", "Disarankan: jadikan aplikasi utama TV"),
      body: t(
        "devices.guide.tvApp.s5Body",
        "Di menu staf pilih \"Jadikan aplikasi utama TV\". Tombol Home dan TV yang baru dinyalakan akan langsung kembali ke NEXBILL TV, jadi pelanggan tidak bisa keluar ke menu TV."
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p>
        {t(
          "devices.guide.tvApp.intro",
          "Cara paling mudah untuk Android TV / Google TV: pasang aplikasi NEXBILL TV langsung di TV. Tidak perlu PC, HP, Developer options, atau ADB. Saat sesi dimulai, TV menampilkan game dari HDMI dengan timer di pojok. Saat waktu habis, layar ditutup halaman NEXBILL dan suara game berhenti."
        )}
      </p>

      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-neutral-800 bg-white/[0.015] p-3">
            <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-300">{i + 1}</div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-neutral-200 font-medium">{s.title}</div>
              <p>{s.body}</p>
              {s.link && (
                <Link
                  href={s.link.href}
                  className="inline-block rounded-lg px-3 py-2 text-xs font-medium transition bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10 hover:border-cyan-400/40"
                >
                  {s.link.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
        <div className="font-medium text-amber-300">{t("devices.guide.tvApp.noteTitle", "Kalau gambar HDMI tidak muncul di dalam aplikasi")}</div>
        <p>
          {t(
            "devices.guide.tvApp.noteBody",
            "Sebagian merek TV tidak mengizinkan HDMI tampil di dalam aplikasi. Aplikasi lalu beralih sendiri ke mode \"Pindah input TV\": TV dipindah ke HDMI dan timer tampil di atasnya. Untuk mode ini, izinkan NEXBILL TV \"Tampil di atas aplikasi lain\" di Pengaturan TV › Aplikasi › Akses aplikasi khusus (atau lewat menu staf)."
          )}
        </p>
      </div>

      <p className="text-neutral-500">{t("devices.guide.tvApp.updateNote", "Memperbarui aplikasi: di TV tahan OK 3 detik → \"Cek pembaruan aplikasi\". Kalau ada versi baru, buka Downloader dan ketik nexbill.id/tvapk lagi — pairing dan pengaturan tetap tersimpan.")}</p>

      <p className="text-neutral-500">
        {t(
          "devices.guide.tvApp.otherWays",
          "TV yang tidak bisa memasang aplikasi tetap bisa dikontrol lewat Relay Agent di PC Windows atau HP Android (tab di atas), atau smart plug untuk TV non-Android."
        )}
      </p>
    </div>
  );
}
