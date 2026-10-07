"use client";
import Link from "next/link";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { RelayIllustration, type RelayIllustrationKind } from "./AndroidRelayIllustrations";
import "@/lib/i18n/dict-devices-guide";

/** Panduan cetak/bergambar lengkap (6 bahasa) — dibangun oleh scripts/build-android-guide.tsx. */
export const ANDROID_GUIDE_URL = "/downloads/nexbill-agent/panduan-android.html";

const STEPS: { kind: RelayIllustrationKind; key: string; fallback: string }[] = [
  { kind: "prepare", key: "devices.guide.android.s0Title", fallback: "Siapkan HP" },
  { kind: "token", key: "devices.guide.android.s1Title", fallback: "Minta Token" },
  { kind: "install", key: "devices.guide.android.s2Title", fallback: "Pasang aplikasi Termux dan Termux:Boot" },
  { kind: "paste", key: "devices.guide.android.s3Title", fallback: "Salin satu perintah ke Termux" },
  { kind: "language", key: "devices.guide.android.s4Title", fallback: "Pilih bahasa dan tempel token" },
  { kind: "tv", key: "devices.guide.android.s5Title", fallback: "Sambungkan setiap TV (sekali per TV)" },
  { kind: "battery", key: "devices.guide.android.s6Title", fallback: "Supaya tidak dimatikan oleh HP (penting!)" },
  { kind: "done", key: "devices.guide.android.s7Title", fallback: "Tambahkan TV di NEXBILL" },
];

/**
 * Galeri langkah bergambar "Relay Agent di HP Android" untuk Pusat Bantuan (kategori Kontrol
 * Perangkat, sub-bagian dengan visual: "android-relay").
 */
export function AndroidRelayVisualGuide() {
  const { t, lang } = useDashboardLang();
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <figure key={s.kind} className="rounded-lg border border-neutral-800 bg-white/[0.02] p-1.5">
            <RelayIllustration kind={s.kind} />
            <figcaption className="px-1 pt-1.5 text-[11px] leading-snug text-neutral-300">
              <span className="mr-1 font-semibold text-cyan-300">{i}.</span>
              {t(s.key, s.fallback)}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <a href={`${ANDROID_GUIDE_URL}?lang=${lang}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-200 hover:bg-cyan-500/20">
          {t("devices.guide.android.fullGuide", "Buka panduan bergambar lengkap (bisa dicetak)")}
        </a>
        <Link href="/dashboard/devices" className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-white/5">
          {t("devices.guide.android.openDevices", "Ke Kontrol Perangkat")}
        </Link>
      </div>
    </div>
  );
}
