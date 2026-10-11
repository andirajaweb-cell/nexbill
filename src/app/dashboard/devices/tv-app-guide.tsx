"use client";
import Link from "next/link";
import { AlertTriangle, ListChecks } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-devices-tvapp";
import "@/lib/i18n/dict-devices-guide-levels";

export type GuideLevel = "full" | "quick";

const linkBtn =
  "inline-block rounded-lg px-3 py-2 text-xs font-medium transition bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10 hover:border-cyan-400/40";

/** Daftar bernomor kecil di dalam satu langkah. */
function Sub({ items }: { items: React.ReactNode[] }) {
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

/**
 * Panduan "Aplikasi NEXBILL TV" (folder android-tv/): cara kontrol TV paling mudah untuk Android TV /
 * Google TV — tanpa PC, tanpa HP, tanpa Developer options/ADB. Dua tingkat:
 *  - "full"  : untuk pemilik yang awam teknologi — setiap tombol dan layar disebut satu per satu;
 *  - "quick" : untuk yang sudah paham dan tidak mau ribet — lima baris.
 * Teks menu staf (Pilih input HDMI, Jadikan aplikasi utama TV, …) sama persis dengan strings.xml aplikasi.
 */
export function TvAppGuide({ level = "full" }: { level?: GuideLevel }) {
  const { t, lang } = useDashboardLang();
  const printable = (
    <a href={`/downloads/nexbill-tv/panduan-nexbill-tv.html?lang=${lang}`} target="_blank" rel="noopener noreferrer" className={linkBtn}>
      {t("devices.guide.tvFull.printable", "Buka panduan lengkap (bisa dicetak / disimpan PDF)")}
    </a>
  );
  const settingsLink = (
    <Link href="/dashboard/settings?tab=tv" className={linkBtn}>
      {t("devices.guide.tvApp.s2Link", "Buka TV Screensaver")}
    </Link>
  );
  const footer = (
    <>
      {printable}
      <p className="text-neutral-500">
        {t(
          "devices.guide.tvApp.updateNote",
          "Memperbarui aplikasi: di TV tahan OK 3 detik → \"Cek pembaruan aplikasi\". Kalau ada versi baru, buka Downloader dan ketik nexbill.id/tvapk lagi — pairing dan pengaturan tetap tersimpan."
        )}
      </p>
      <p className="text-neutral-500">
        {t(
          "devices.guide.tvApp.otherWays",
          "TV yang tidak bisa memasang aplikasi tetap bisa dikontrol lewat Relay Agent di PC Windows atau HP Android (tab di atas), atau smart plug untuk TV non-Android."
        )}
      </p>
    </>
  );

  if (level === "quick") {
    return (
      <div className="space-y-3">
        <ol className="space-y-2">
          {[
            t("devices.guide.tvQuick.q1", "TV: Google Play → pasang Downloader (AFTVnews) → buka → ketik nexbill.id/tvapk → Install (izinkan Unknown sources untuk Downloader)."),
            t("devices.guide.tvQuick.q2", "Dashboard: Feature Management › TV Screensaver ON · unit tipe TV = Android TV · Pengaturan › TV Screensaver › tambah layar → kode 6 digit (30 menit)."),
            t("devices.guide.tvQuick.q3", "Buka NEXBILL TV → ketik kode."),
            t("devices.guide.tvQuick.q4", "Tahan OK 3 detik → \"Pilih input HDMI\" konsol → \"Jadikan aplikasi utama TV\"."),
            t("devices.guide.tvQuick.q5", "Tes sesi 5 menit di kasir: game + timer tampil, waktu habis → layar terkunci & suara berhenti."),
          ].map((text, i) => (
            <li key={i} className="flex gap-2.5 rounded-lg border border-neutral-800 bg-white/[0.015] p-2.5">
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">{i + 1}</span>
              <span className="min-w-0">
                {text}
                {i === 1 && <div className="mt-1.5">{settingsLink}</div>}
              </span>
            </li>
          ))}
        </ol>
        {footer}
      </div>
    );
  }

  const steps: { title: string; items: React.ReactNode[] }[] = [
    {
      title: t("devices.guide.tvFull.s1Title", "Pasang aplikasi NEXBILL TV di TV"),
      items: [
        t("devices.guide.tvFull.s1a", "Di TV, buka Google Play (ikon segitiga warna-warni). Pilih kaca pembesar (Cari), ketik \"Downloader\" dengan remote atau tombol mikrofon."),
        t("devices.guide.tvFull.s1b", "Pilih aplikasi \"Downloader\" (logo oranye, by AFTVnews) → Instal → Buka. Kalau ditanya izin akses file, pilih Izinkan."),
        <>
          {t("devices.guide.tvFull.s1c", "Di kotak alamat Downloader, ketik persis: nexbill.id/tvapk lalu tekan Go.")}
          <code className="mt-1 block w-fit rounded-md border border-neutral-700 bg-black/40 px-2 py-1 font-mono text-emerald-300">nexbill.id/tvapk</code>
        </>,
        t("devices.guide.tvFull.s1d", "Kalau muncul pesan pemasangan diblokir, pilih Settings/Setelan → nyalakan Downloader (\"Izinkan dari sumber ini\" / \"Unknown sources\") → tekan Back."),
        t("devices.guide.tvFull.s1e", "Pilih Install, tunggu sampai selesai, lalu pilih Done. Kalau Downloader menawarkan menghapus file pemasang, pilih Delete (aplikasinya tetap ada)."),
      ],
    },
    {
      title: t("devices.guide.tvFull.s2Title", "Buat kode pairing di dashboard"),
      items: [
        t("devices.guide.tvFull.s2a", "Pengaturan › Feature Management: pastikan TV Screensaver aktif."),
        t("devices.guide.tvFull.s2b", "Rental PS › Kelola Unit: tipe TV unit itu = Android TV."),
        <>
          {t("devices.guide.tvFull.s2c", "Pengaturan › TV Screensaver → tambah layar untuk unit itu → catat kode 6 angka yang muncul. Kode berlaku 30 menit.")}
          <div className="mt-1.5">{settingsLink}</div>
        </>,
      ],
    },
    {
      title: t("devices.guide.tvFull.s3Title", "Ketik kode di TV"),
      items: [
        t("devices.guide.tvFull.s3a", "Di TV, buka aplikasi NEXBILL TV (ada di deretan aplikasi). Layar menampilkan kotak kode."),
        t("devices.guide.tvFull.s3b", "Ketik 6 angka dengan tombol angka di remote (atau keyboard di layar), lalu OK. Berhasil kalau tampil layar NEXBILL dengan nama unit."),
      ],
    },
    {
      title: t("devices.guide.tvFull.s4Title", "Pilih HDMI tempat PlayStation dicolok (sekali saja)"),
      items: [
        t("devices.guide.tvFull.s4a", "Tahan tombol OK di remote selama 3 detik (atau tekan tombol Menu). Menu staf terbuka. Kalau diminta PIN, isi PIN layar dari Pengaturan › TV Screensaver."),
        t("devices.guide.tvFull.s4b", "Pilih \"Pilih input HDMI\", lalu pilih HDMI tempat PlayStation dicolok (mis. HDMI 2)."),
        t("devices.guide.tvFull.s4c", "Coba di menu staf: \"Buka layar game (tanpa sesi)\" → 10 menit. Gambar PlayStation harus tampil dengan timer di pojok kanan atas."),
      ],
    },
    {
      title: t("devices.guide.tvFull.s5Title", "Jadikan NEXBILL TV aplikasi utama TV (disarankan)"),
      items: [
        t("devices.guide.tvFull.s5a", "Menu staf → \"Jadikan aplikasi utama TV\" → pilih NEXBILL TV. Tombol Home dan TV yang baru dinyalakan langsung kembali ke NEXBILL TV, jadi pelanggan tidak bisa keluar ke menu TV."),
        t("devices.guide.tvFull.s5b", "Sebagian merek TV tidak menyediakan pilihan ini. Tidak apa-apa: NEXBILL TV tetap menyala sendiri setelah TV restart pada kebanyakan TV."),
      ],
    },
    {
      title: t("devices.guide.tvFull.s6Title", "Tes dengan sesi pendek"),
      items: [
        t("devices.guide.tvFull.s6a", "Di Rental PS, mulai sesi 5 menit untuk unit itu. TV harus menampilkan PlayStation dan timer."),
        t("devices.guide.tvFull.s6b", "Saat waktu habis, layar NEXBILL menutup game dan suara game berhenti. Selesai — ulangi Langkah 1–6 untuk TV berikutnya."),
      ],
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

      <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-cyan-200">
          <ListChecks size={14} /> {t("devices.guide.tvFull.needTitle", "Yang perlu disiapkan")}
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("devices.guide.tvFull.need1", "TV Android TV / Google TV (TV pintar yang punya Google Play). TV biasa tanpa Google Play memakai smart plug.")}</li>
          <li>{t("devices.guide.tvFull.need2", "TV tersambung ke WiFi/internet outlet, dan PlayStation dicolok ke salah satu lubang HDMI TV.")}</li>
          <li>{t("devices.guide.tvFull.need3", "Remote TV, dan dashboard NEXBILL terbuka di HP/PC kasir (untuk membuat kode pairing).")}</li>
        </ul>
      </div>

      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-neutral-800 bg-white/[0.015] p-3">
            <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-300">{i + 1}</div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-neutral-200 font-medium">{s.title}</div>
              <Sub items={s.items} />
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-amber-300">
          <AlertTriangle size={14} /> {t("devices.guide.tvFull.troubleTitle", "Kalau ada masalah")}
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("devices.guide.tvFull.t1", "Gambar game tidak muncul (\"menunggu sinyal\"): pastikan PlayStation menyala dan HDMI-nya benar, lalu pilih ulang input di menu staf. Kalau TV tidak mengizinkan HDMI tampil di dalam aplikasi, NEXBILL TV pindah sendiri ke mode \"Pindah input TV\" — izinkan \"Tampil di atas aplikasi lain\" lewat menu staf.")}</li>
          <li>{t("devices.guide.tvFull.t2", "Kode ditolak: kode berlaku 30 menit dan hanya sekali pakai. Buat kode baru di Pengaturan › TV Screensaver.")}</li>
          <li>{t("devices.guide.tvFull.t3", "TV kembali menampilkan kotak kode: layar itu dihapus atau dilepas di dashboard. Buat kode baru lalu ketik lagi.")}</li>
          <li>{t("devices.guide.tvFull.t4", "Downloader tidak bisa membuka nexbill.id/tvapk: pastikan TV tersambung internet dan alamat diketik tanpa spasi. Masih gagal? Kirim foto layar TV ke menu Chat/Bantuan.")}</li>
        </ul>
      </div>

      {footer}
    </div>
  );
}
