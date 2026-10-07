"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarPlus, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/Button";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { scaledGain } from "@/lib/ui/notification-sound";
import { OPEN_BOOKING_EVENT, BOOKINGS_CHANGED_EVENT } from "@/lib/rental/booking-events";
import "@/lib/i18n/dict-booking";

interface IncomingBooking {
  id: string;
  bookingCode: string | null;
  customerName: string | null;
  phone: string | null;
  rentalUnitId: string | null;
  unitName: string | null;
  consoleType: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  source: "online" | "whatsapp" | "kasir";
  dpAmount: number;
  dpPaid: boolean;
  notes: string | null;
  waitlistPosition: number | null;
  createdAt: string;
}

const POLL_MS = 20_000;
/** Booking yang masuk saat dashboard tertutup tetap dimunculkan, tapi paling jauh 12 jam ke belakang. */
const MAX_BACKFILL_MS = 12 * 3600_000;
/** Jeda keamanan: booking yang tercatat tepat saat polling berjalan tidak boleh terlewat (dedupe pakai id). */
const OVERLAP_MS = 60_000;

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

function waLink(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  return d.length >= 9 ? `https://wa.me/${d}` : null;
}

function chime() {
  const peak = scaledGain(0.3);
  if (peak <= 0) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.32);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // autoplay diblokir sebelum ada interaksi — pop-up tetap tampil
  }
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage penuh/diblokir */ } };

/**
 * Pop-up "Booking Baru" di semua halaman dashboard: begitu pelanggan booking lewat halaman booking
 * online atau WhatsApp, kasir langsung melihat modal berisi detailnya (dengan bunyi), lalu bisa
 * Konfirmasi, membuka Map Booking, atau chat WhatsApp pelanggan. Notifikasi push HP tetap berjalan
 * terpisah (lib/push) untuk saat dashboard tidak dibuka.
 */
export function NewBookingPopup() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = !!user && hasPermission(user.role as StaffRole, "manage_bookings");
  const outletId = user?.outletId ?? "";
  const sinceKey = `nb_booking_since:${outletId}`;
  const seenKey = `nb_booking_seen:${outletId}`;

  const [queue, setQueue] = useState<IncomingBooking[]>([]);
  const [busy, setBusy] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const queueIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!outletId) return;
    try { seenRef.current = new Set(JSON.parse(read(seenKey) ?? "[]")); } catch { seenRef.current = new Set(); }
  }, [outletId, seenKey]);

  const markSeen = useCallback((ids: string[]) => {
    for (const id of ids) seenRef.current.add(id);
    write(seenKey, JSON.stringify([...seenRef.current].slice(-100)));
  }, [seenKey]);

  const poll = useCallback(async () => {
    if (!allowed || !outletId) return;
    const stored = read(sinceKey);
    const floor = new Date(Date.now() - MAX_BACKFILL_MS).toISOString();
    const since = stored ? (stored > floor ? stored : floor) : null;
    try {
      const res = await fetch(`/api/bookings/incoming${since ? `?since=${encodeURIComponent(since)}` : ""}`);
      if (!res.ok) return;
      const data: { serverNow: string; items: IncomingBooking[] } = await res.json();
      write(sinceKey, new Date(new Date(data.serverNow).getTime() - OVERLAP_MS).toISOString());
      const fresh = (data.items ?? []).filter((b) => !seenRef.current.has(b.id));
      if (!fresh.length) return;
      const add = fresh.filter((b) => !queueIdsRef.current.has(b.id));
      if (!add.length) return;
      for (const b of add) queueIdsRef.current.add(b.id);
      chime();
      setQueue((q) => [...q, ...add.filter((b) => !q.some((x) => x.id === b.id))]);
      window.dispatchEvent(new Event(BOOKINGS_CHANGED_EVENT));
    } catch {
      // jaringan putus — coba lagi di putaran berikutnya
    }
  }, [allowed, outletId, sinceKey]);

  useEffect(() => {
    if (!allowed) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [allowed, poll]);

  // Penanda di judul tab supaya tetap terlihat walau kasir sedang di tab browser lain.
  useEffect(() => {
    if (!queue.length) return;
    const base = document.title.replace(/^\(\d+\) [^·]+· /, "");
    document.title = `(${queue.length}) ${t("booking.popup.tabTitle", "Booking baru")} · ${base}`;
    return () => { document.title = base; };
  }, [queue.length, t]);

  const current = queue[0];
  if (!allowed || !current) return null;

  const dismiss = (ids: string[]) => {
    markSeen(ids);
    for (const id of ids) queueIdsRef.current.delete(id);
    setQueue((q) => q.filter((b) => !ids.includes(b.id)));
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${current.id}/confirm`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQueue((q) => q.map((b) => (b.id === current.id ? { ...b, notes: `⚠ ${data.error ?? t("booking.popup.failed", "Gagal")}${b.notes ? ` · ${b.notes}` : ""}` } : b)));
        return;
      }
      dismiss([current.id]);
      window.dispatchEvent(new Event(BOOKINGS_CHANGED_EVENT));
    } finally {
      setBusy(false);
    }
  };

  const openInMap = () => {
    dismiss([current.id]);
    if (pathname?.startsWith("/dashboard/booking")) window.dispatchEvent(new CustomEvent(OPEN_BOOKING_EVENT, { detail: current.id }));
    else router.push(`/dashboard/booking?b=${current.id}`);
  };

  const start = new Date(current.scheduledStart);
  const end = new Date(current.scheduledEnd);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const unit = current.unitName ?? (current.consoleType && current.consoleType !== "any" ? `${t("booking.popup.anyUnitOf", "Unit apa saja")} · ${current.consoleType.toUpperCase()}` : t("booking.anyConsoleOption", "Konsol apa saja"));
  const wa = waLink(current.phone);
  const canConfirm = current.status === "pending" || current.status === "waitlisted";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#0b0f1e] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 bg-cyan-500/10 px-5 py-3">
          <div className="flex items-center gap-2 text-cyan-300">
            <CalendarPlus size={18} className="animate-pulse" />
            <span className="font-semibold">{t("booking.popup.title", "Booking baru masuk!")}</span>
            {queue.length > 1 && <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px]">{t("booking.popup.counter", "1 dari {n}").replace("{n}", String(queue.length))}</span>}
          </div>
          <button type="button" onClick={() => dismiss([current.id])} className="rounded-lg p-1 text-neutral-400 hover:bg-white/10" aria-label={t("booking.popup.later", "Nanti")}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              {current.bookingCode && <span className="font-mono text-emerald-400 text-sm">{current.bookingCode}</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${current.source === "whatsapp" ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-sky-950 text-sky-400 border-sky-800"}`}>
                {current.source === "whatsapp" ? t("booking.source.whatsapp", "WhatsApp") : t("booking.source.online", "Online")}
              </span>
              {current.status === "waitlisted" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-violet-700 bg-violet-950 text-violet-300">
                  {t("booking.popup.waitlisted", "Waiting list #{n}").replace("{n}", String(current.waitlistPosition ?? "?"))}
                </span>
              )}
            </div>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{current.customerName || t("booking.noName", "Tanpa nama")}</div>
            {current.phone && <div className="text-sm text-neutral-400">{current.phone}</div>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-2 rounded-lg bg-neutral-800/60 p-2.5">
              <div className="text-[11px] text-neutral-500">{t("booking.popup.schedule", "Jadwal")}</div>
              <div className="font-semibold text-neutral-100">
                {start.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="text-neutral-200">
                {start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                <span className="text-neutral-500"> · {minutes >= 60 ? `${Math.floor(minutes / 60)} ${t("booking.popup.hours", "jam")}${minutes % 60 ? ` ${minutes % 60} ${t("booking.popup.minutes", "mnt")}` : ""}` : `${minutes} ${t("booking.popup.minutes", "mnt")}`}</span>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-800/60 p-2.5">
              <div className="text-[11px] text-neutral-500">{t("booking.popup.unit", "Unit")}</div>
              <div className="font-medium text-neutral-100">{unit}</div>
            </div>
            <div className="rounded-lg bg-neutral-800/60 p-2.5">
              <div className="text-[11px] text-neutral-500">DP</div>
              <div className="font-medium text-neutral-100">{current.dpAmount > 0 ? `${rupiah(current.dpAmount)} · ${current.dpPaid ? t("booking.popup.dpPaid", "lunas") : t("booking.popup.dpUnpaid", "belum dibayar")}` : t("booking.popup.noDp", "Tanpa DP")}</div>
            </div>
            {current.notes && <div className="col-span-2 rounded-lg bg-neutral-800/60 p-2.5 text-neutral-300 text-xs">{current.notes}</div>}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {canConfirm && (
              <Button onClick={confirm} disabled={busy} className="flex-1">
                {busy ? "..." : t("booking.confirmButton", "Konfirmasi")}
              </Button>
            )}
            <Button variant="secondary" onClick={openInMap} className="flex-1">{t("booking.popup.openMap", "Lihat di Map Booking")}</Button>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-emerald-700/60 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10">
                <MessageCircle size={14} /> WA
              </a>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>{t("booking.popup.receivedAt", "Masuk {time}").replace("{time}", new Date(current.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</span>
            <div className="flex gap-3">
              {queue.length > 1 && <button type="button" className="hover:text-neutral-300" onClick={() => dismiss(queue.map((b) => b.id))}>{t("booking.popup.dismissAll", "Tutup semua")}</button>}
              <button type="button" className="hover:text-neutral-300" onClick={() => dismiss([current.id])}>{t("booking.popup.later", "Nanti")}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
