"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { TELEGRAM_GROUP_URL } from "@/lib/support/community";
import "@/lib/i18n/dict-community";

/** Disembunyikan 30 hari setelah merchant menekan "Gabung" / "Sudah bergabung". */
const DISMISS_KEY = "nexbill.tgGroup.hiddenUntil";
const DISMISS_MS = 30 * 86400_000;
/** Kartu mengecil jadi gelembung setelah beberapa detik supaya tidak menutupi halaman. */
const AUTO_COLLAPSE_MS = 12_000;
/** Halaman kerja cepat/layar tampilan: hanya gelembung kecil, kartu tidak muncul sendiri. */
const QUIET_PATHS = ["/dashboard/pos", "/dashboard/kitchen", "/dashboard/billing-board"];

type View = "card" | "bubble" | "hidden";

function readHiddenUntil(): number {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0);
  } catch {
    return 0;
  }
}

/**
 * Ajakan gabung grup Telegram NEXBILL — tombol melayang kanan bawah di dashboard merchant. Setiap kali
 * membuka halaman fitur, kartu muncul dengan animasi lalu mengecil jadi gelembung; X menutupnya di halaman
 * itu. Setelah merchant bergabung, widget tidak tampil lagi selama 30 hari.
 */
export function TelegramCommunityFab() {
  const { t } = useDashboardLang();
  const pathname = usePathname();
  const [view, setView] = useState<View>("hidden");
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const showCard = useCallback(() => {
    clearTimer();
    setRound((r) => r + 1);
    setView("card");
    timer.current = setTimeout(() => setView((v) => (v === "card" ? "bubble" : v)), AUTO_COLLAPSE_MS);
  }, []);

  // Muncul (dengan animasi) setiap kali halaman fitur dibuka.
  useEffect(() => {
    if (readHiddenUntil() > Date.now()) {
      setView("hidden");
      return;
    }
    const quiet = QUIET_PATHS.some((p) => pathname?.startsWith(p));
    if (quiet) {
      clearTimer();
      setRound((r) => r + 1);
      setView("bubble");
      return;
    }
    const delay = setTimeout(showCard, 900);
    return () => clearTimeout(delay);
  }, [pathname, showCard]);

  useEffect(() => clearTimer, []);

  const dismissLong = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      // penyimpanan diblokir — cukup sembunyikan untuk halaman ini
    }
    clearTimer();
    setView("hidden");
  };

  if (view === "hidden") return null;
  // Kasir (mobile) punya bar keranjang di bawah — gelembung dinaikkan supaya tidak menutupinya.
  const quiet = QUIET_PATHS.some((p) => pathname?.startsWith(p));

  return (
    <div className={`nbx-tg-fab fixed right-3 sm:right-5 z-40 print:hidden ${quiet ? "bottom-24 lg:bottom-5" : "bottom-3 sm:bottom-5"}`} aria-live="polite">
      <style>{`
        @keyframes nbxTgIn { 0% { opacity: 0; transform: translateY(24px) scale(.92); } 60% { opacity: 1; transform: translateY(-4px) scale(1.01); } 100% { transform: translateY(0) scale(1); } }
        @keyframes nbxTgPop { 0% { opacity: 0; transform: scale(.4) rotate(-20deg); } 70% { transform: scale(1.12) rotate(4deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes nbxTgPulse { 0% { box-shadow: 0 0 0 0 rgba(42,171,238,.55); } 100% { box-shadow: 0 0 0 16px rgba(42,171,238,0); } }
        @keyframes nbxTgFly { 0%,100% { transform: translate(0,0) rotate(0); } 50% { transform: translate(2px,-2px) rotate(-8deg); } }
        .nbx-tg-card { animation: nbxTgIn .55s cubic-bezier(.2,.9,.3,1.2) both; }
        .nbx-tg-bubble { animation: nbxTgPop .5s cubic-bezier(.2,.9,.3,1.3) both, nbxTgPulse 2.2s ease-out .6s 3; }
        .nbx-tg-plane { animation: nbxTgFly 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .nbx-tg-card, .nbx-tg-bubble, .nbx-tg-plane { animation: none; } }
      `}</style>

      {view === "card" ? (
        <div
          key={`card-${round}`}
          className="nbx-tg-card relative w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-sky-400/30 bg-neutral-950/95 shadow-2xl shadow-sky-900/40 backdrop-blur"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500" />
          <button
            type="button"
            onClick={() => {
              clearTimer();
              setView("hidden");
            }}
            aria-label={t("community.close", "Tutup")}
            className="absolute right-2 top-2 rounded-full p-1 text-neutral-500 transition hover:bg-white/10 hover:text-neutral-200"
          >
            <X size={14} />
          </button>
          <div className="flex gap-3 p-4 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/30">
              <Send size={20} className="nbx-tg-plane -ml-0.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                {t("community.badge", "Komunitas")}
              </span>
              <div className="mt-1 text-sm font-semibold text-neutral-100">{t("community.title", "Gabung Grup Telegram NEXBILL")}</div>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                {t("community.body", "Info fitur terbaru, tips ramaikan rental, dan ngobrol bareng sesama pemilik outlet & Tim NEXBILL.")}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={TELEGRAM_GROUP_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={dismissLong}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-400"
                >
                  <Send size={12} /> {t("community.join", "Gabung sekarang")}
                </a>
                <button type="button" onClick={dismissLong} className="text-[11px] text-neutral-500 transition hover:text-neutral-300">
                  {t("community.joined", "Sudah bergabung")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div key={`bubble-${round}`} className="nbx-tg-bubble relative">
          <button
            type="button"
            onClick={showCard}
            aria-label={t("community.open", "Grup Telegram NEXBILL")}
            title={t("community.open", "Grup Telegram NEXBILL")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-500/40 transition hover:scale-105"
          >
            <Send size={20} className="-ml-0.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              clearTimer();
              setView("hidden");
            }}
            aria-label={t("community.close", "Tutup")}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-neutral-900 text-neutral-400 transition hover:text-white"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
