"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { lobbyClock, type LobbyCard } from "@/lib/lobby/board";

/**
 * Papan lobi publik — buka di TV/monitor lobi: status setiap unit, sisa waktu, unit yang segera
 * kosong, booking terdekat, pengumuman berjalan, dan QR booking. Tanpa nama pelanggan. Data dari
 * /api/public/lobby (diambil ulang tiap 10 detik; timer berjalan tiap detik di layar).
 */

type Lang = "id" | "en" | "ms" | "th" | "vi" | "fil";
const TXT: Record<Lang, Record<string, string>> = {
  id: { available: "KOSONG", playing: "Bermain", paused: "Dijeda", maintenance: "Perbaikan", soon: "Segera kosong", left: "sisa", running: "berjalan", package: "Paket", fixed: "Durasi tetap", open: "Bebas", booked: "Booking {time}", free: "{n} unit kosong", of: "dari {n}", book: "Booking online", disabled: "Papan unit sedang tidak ditampilkan.", error: "Tidak bisa memuat data. Mencoba lagi…", loading: "Memuat…" },
  en: { available: "FREE", playing: "Playing", paused: "Paused", maintenance: "Maintenance", soon: "Free soon", left: "left", running: "running", package: "Package", fixed: "Fixed time", open: "Open", booked: "Booked {time}", free: "{n} units free", of: "of {n}", book: "Book online", disabled: "The unit board is currently hidden.", error: "Couldn't load data. Retrying…", loading: "Loading…" },
  ms: { available: "KOSONG", playing: "Bermain", paused: "Dijeda", maintenance: "Penyelenggaraan", soon: "Akan kosong", left: "baki", running: "berjalan", package: "Pakej", fixed: "Masa tetap", open: "Bebas", booked: "Tempahan {time}", free: "{n} unit kosong", of: "daripada {n}", book: "Tempah dalam talian", disabled: "Papan unit tidak dipaparkan buat masa ini.", error: "Gagal memuat data. Mencuba lagi…", loading: "Memuatkan…" },
  th: { available: "ว่าง", playing: "กำลังเล่น", paused: "พักไว้", maintenance: "ซ่อมบำรุง", soon: "ใกล้ว่าง", left: "เหลือ", running: "เล่นมา", package: "แพ็กเกจ", fixed: "เวลาคงที่", open: "ไม่จำกัด", booked: "จองไว้ {time}", free: "ว่าง {n} เครื่อง", of: "จาก {n}", book: "จองออนไลน์", disabled: "ขณะนี้ไม่แสดงกระดานเครื่อง", error: "โหลดข้อมูลไม่ได้ กำลังลองใหม่…", loading: "กำลังโหลด…" },
  vi: { available: "TRỐNG", playing: "Đang chơi", paused: "Tạm dừng", maintenance: "Bảo trì", soon: "Sắp trống", left: "còn", running: "đã chơi", package: "Gói", fixed: "Cố định", open: "Tự do", booked: "Đặt lúc {time}", free: "{n} máy trống", of: "trên {n}", book: "Đặt chỗ online", disabled: "Bảng máy hiện không hiển thị.", error: "Không tải được dữ liệu. Đang thử lại…", loading: "Đang tải…" },
  fil: { available: "BAKANTE", playing: "Naglalaro", paused: "Naka-pause", maintenance: "Maintenance", soon: "Malapit nang bakante", left: "natitira", running: "tumatakbo", package: "Package", fixed: "Fixed na oras", open: "Open", booked: "Naka-book {time}", free: "{n} bakanteng unit", of: "sa {n}", book: "Mag-book online", disabled: "Hindi muna ipinapakita ang unit board.", error: "Hindi ma-load ang data. Sinusubukan ulit…", loading: "Naglo-load…" },
};
const LOCALE: Record<Lang, string> = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", vi: "vi-VN", fil: "en-PH" };

interface LobbyData {
  enabled: boolean;
  outlet: { name: string; logoUrl: string | null; slug?: string | null };
  announcement?: string | null;
  serverTime?: string;
  units?: LobbyCard[];
}

function pickLang(param: string | null): Lang {
  const all: Lang[] = ["id", "en", "ms", "th", "vi", "fil"];
  if (param && (all as string[]).includes(param)) return param as Lang;
  if (typeof navigator !== "undefined") {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("tl") || nav.startsWith("fil")) return "fil";
    const two = nav.slice(0, 2);
    if ((all as string[]).includes(two)) return two as Lang;
  }
  return "id";
}

export default function LobbyPage() {
  // useSearchParams() wajib di dalam Suspense (Next.js App Router).
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#050914]" />}>
      <LobbyBoard />
    </Suspense>
  );
}

function LobbyBoard() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params?.slug ?? "");
  const [lang, setLang] = useState<Lang>("id");
  const [data, setData] = useState<LobbyData | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [qr, setQr] = useState<string | null>(null);
  const t = TXT[lang];

  useEffect(() => setLang(pickLang(search.get("lang"))), [search]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/public/lobby?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: LobbyData) => {
          if (!alive) return;
          setData(d);
          setFetchedAt(Date.now());
          setFailed(false);
        })
        .catch(() => alive && setFailed(true));
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [slug]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const bookUrl = typeof window !== "undefined" && slug ? `${window.location.origin}/book/${slug}` : "";
  useEffect(() => {
    if (!bookUrl) return;
    QRCode.toDataURL(bookUrl, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(null));
  }, [bookUrl]);

  const passed = fetchedAt ? Math.floor((now - fetchedAt) / 1000) : 0;
  const units = data?.units ?? [];
  const freeCount = units.filter((u) => u.status === "available").length;
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(LOCALE[lang], { hour: "2-digit", minute: "2-digit" }), [lang]);

  if (!data) {
    return <main className="flex min-h-screen items-center justify-center bg-[#050914] text-2xl text-slate-400">{failed ? t.error : t.loading}</main>;
  }
  if (!data.enabled) {
    return <main className="flex min-h-screen items-center justify-center bg-[#050914] px-6 text-center text-2xl text-slate-400">{data.outlet.name} — {t.disabled}</main>;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#050914] text-slate-100">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-10">
        <div className="flex min-w-0 items-center gap-4">
          {data.outlet.logoUrl && <img src={data.outlet.logoUrl} alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />}
          <h1 className="truncate text-2xl font-bold md:text-4xl">{data.outlet.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400 md:text-5xl">{t.free.replace("{n}", String(freeCount))}</div>
            <div className="text-sm text-slate-400 md:text-base">{t.of.replace("{n}", String(units.length))}</div>
          </div>
          <div className="hidden text-4xl font-semibold tabular-nums text-slate-300 md:block">{timeFmt.format(new Date(now))}</div>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-2 content-start gap-3 p-4 sm:grid-cols-3 md:gap-4 md:p-8 lg:grid-cols-4 xl:grid-cols-5">
        {units.map((u) => {
          const remaining = u.remainingSeconds !== null ? Math.max(0, u.remainingSeconds - (u.status === "playing" ? passed : 0)) : null;
          const elapsed = u.elapsedSeconds !== null ? u.elapsedSeconds + (u.status === "playing" ? passed : 0) : null;
          const soon = u.status === "playing" && remaining !== null && remaining <= 600;
          const tone =
            u.status === "available"
              ? "border-emerald-400/60 bg-emerald-500/15"
              : u.status === "maintenance"
                ? "border-red-400/40 bg-red-500/10"
                : u.status === "paused"
                  ? "border-slate-500/40 bg-slate-500/10"
                  : soon
                    ? "border-amber-400/70 bg-amber-500/15"
                    : "border-sky-400/40 bg-sky-500/10";
          return (
            <div key={u.id} className={`flex flex-col justify-between rounded-2xl border-2 p-4 md:p-5 ${tone}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-xl font-bold leading-tight md:text-2xl">{u.name}</div>
                <span className="rounded-md bg-black/30 px-2 py-0.5 text-xs font-semibold uppercase text-slate-300">{u.consoleType.replace("_", " ")}</span>
              </div>
              {u.status === "available" ? (
                <div className="mt-4">
                  <div className="text-3xl font-black tracking-wide text-emerald-300 md:text-4xl">{t.available}</div>
                  {u.nextBookingAt && <div className="mt-1 text-sm text-slate-300">{t.booked.replace("{time}", timeFmt.format(new Date(u.nextBookingAt)))}</div>}
                </div>
              ) : u.status === "maintenance" ? (
                <div className="mt-4 text-2xl font-bold text-red-300">{t.maintenance}</div>
              ) : (
                <div className="mt-4">
                  <div className={`text-4xl font-black tabular-nums md:text-5xl ${soon ? "text-amber-300" : u.status === "paused" ? "text-slate-400" : "text-sky-200"}`}>
                    {remaining !== null ? lobbyClock(remaining) : lobbyClock(elapsed ?? 0)}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    {u.status === "paused" ? t.paused : soon ? t.soon : remaining !== null ? t.left : t.running}
                    {u.mode && ` · ${t[u.mode]}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <footer className="flex items-center gap-4 border-t border-white/10 bg-black/30 px-6 py-3 md:px-10">
        <div className="min-w-0 flex-1 overflow-hidden">
          {data.announcement ? (
            <div className="lobby-marquee whitespace-nowrap text-xl font-medium text-amber-200 md:text-2xl">{data.announcement}</div>
          ) : (
            <div className="text-lg text-slate-400">{failed ? t.error : ""}</div>
          )}
        </div>
        {qr && (
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right text-sm text-slate-300 md:text-base">
              <div className="font-semibold text-white">{t.book}</div>
              <div className="text-slate-400">{bookUrl.replace(/^https?:\/\//, "")}</div>
            </div>
            <img src={qr} alt="" className="h-20 w-20 rounded-lg bg-white p-1 md:h-24 md:w-24" />
          </div>
        )}
      </footer>
      <style>{`.lobby-marquee{display:inline-block;padding-left:100%;animation:lobby-marquee 22s linear infinite}@keyframes lobby-marquee{to{transform:translateX(-100%)}}@media (prefers-reduced-motion:reduce){.lobby-marquee{animation:none;padding-left:0}}`}</style>
    </main>
  );
}
