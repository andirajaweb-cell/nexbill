"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { layoutBookingMap, mapWindow, timeAtPosition, type MapBooking, type MapUnit } from "@/lib/rental/booking-map";
import "@/lib/i18n/dict-booking";

export interface MapBookingRow extends MapBooking {
  bookingCode: string | null;
  customerName: string | null;
  phone: string | null;
  source: string;
  dpAmount: number;
}

const HOUR_PX = 56;
const LANE_PX = 34;
const LABEL_PX = 128;

/** Warna blok per status — sama artinya dengan badge di daftar booking. */
const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/25 border-amber-400/70 text-amber-100",
  confirmed: "bg-sky-500/25 border-sky-400/70 text-sky-100",
  checked_in: "bg-emerald-500/30 border-emerald-400/80 text-emerald-50",
  completed: "bg-neutral-600/30 border-neutral-500/60 text-neutral-300",
  no_show: "bg-red-500/15 border-red-500/50 text-red-200 opacity-70",
  waitlisted: "bg-violet-500/20 border-violet-400/70 border-dashed text-violet-100",
  cancelled: "bg-neutral-800 border-neutral-700 text-neutral-500 line-through",
  expired: "bg-neutral-800 border-neutral-700 text-neutral-500",
};

export function toLocalYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return toLocalYmd(new Date(y, m - 1, d + days));
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;

export function BookingMap({
  bookings,
  units,
  date,
  setDate,
  statusLabel,
  onSlotClick,
  onBookingClick,
}: {
  bookings: MapBookingRow[];
  units: MapUnit[];
  date: string;
  setDate: (ymd: string) => void;
  statusLabel: (status: string) => string;
  onSlotClick: (unitId: string | null, consoleType: string | null, start: Date) => void;
  onBookingClick: (b: MapBookingRow) => void;
}) {
  const { t } = useDashboardLang();
  const [showHidden, setShowHidden] = useState(false);
  const win = useMemo(() => mapWindow(date), [date]);
  const rows = useMemo(
    () =>
      layoutBookingMap(bookings, units, win, {
        includeHidden: showHidden,
        unassignedLabel: (ct) => t("booking.map.unassignedRow", "Belum dapat unit · {console}").replace("{console}", ct ? ct.toUpperCase() : t("booking.anyConsoleOption", "Konsol apa saja")),
      }),
    [bookings, units, win, showHidden, t]
  );
  const total = rows.reduce((s, r) => s + r.blocks.length, 0);

  // Garis "sekarang", diperbarui tiap menit.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowPct = now >= win.start.getTime() && now <= win.end.getTime() ? ((now - win.start.getTime()) / (win.end.getTime() - win.start.getTime())) * 100 : null;

  // Saat membuka hari ini, gulir supaya jam sekarang terlihat.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (nowPct === null || !scrollRef.current) return;
    const x = (nowPct / 100) * win.hours * HOUR_PX - 2 * HOUR_PX;
    scrollRef.current.scrollLeft = Math.max(0, x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const hours = Array.from({ length: win.hours }, (_, i) => new Date(win.start.getTime() + i * 3600_000));
  const timelineWidth = win.hours * HOUR_PX;
  const isToday = date === toLocalYmd(new Date());

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setDate(shiftYmd(date, -1))} className="rounded-lg border border-neutral-700 p-1.5 hover:bg-neutral-800" aria-label={t("booking.map.prevDay", "Hari sebelumnya")}>
          <ChevronLeft size={16} />
        </button>
        <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button type="button" onClick={() => setDate(shiftYmd(date, 1))} className="rounded-lg border border-neutral-700 p-1.5 hover:bg-neutral-800" aria-label={t("booking.map.nextDay", "Hari berikutnya")}>
          <ChevronRight size={16} />
        </button>
        {!isToday && (
          <button type="button" onClick={() => setDate(toLocalYmd(new Date()))} className="rounded-full border border-cyan-600/60 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10">
            {t("booking.map.today", "Hari ini")}
          </button>
        )}
        <span className="text-xs text-neutral-500">
          {t("booking.map.windowInfo", "{date}, 08.00 s/d 08.00 besok · {n} booking").replace("{date}", win.start.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })).replace("{n}", String(total))}
        </span>
        <label className="ml-auto flex items-center gap-1 text-xs text-neutral-400">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> {t("booking.map.showCancelled", "Tampilkan yang batal/kedaluwarsa")}
        </label>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
        {["pending", "confirmed", "checked_in", "waitlisted", "no_show"].map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-4 rounded border ${STATUS_CLASS[s]}`} /> {statusLabel(s)}
          </span>
        ))}
        <span className="text-neutral-500">· {t("booking.map.slotHint", "Klik bagian kosong untuk membuat booking di jam itu.")}</span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/40">
        <div style={{ width: LABEL_PX + timelineWidth }} className="relative">
          {/* Header jam */}
          <div className="flex sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800">
            <div style={{ width: LABEL_PX }} className="sticky left-0 z-20 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-500 border-r border-neutral-800">
              {t("booking.map.unitColumn", "Unit")}
            </div>
            {hours.map((h) => (
              <div key={h.getTime()} style={{ width: HOUR_PX }} className={`px-1 py-1 text-[11px] border-r border-neutral-800/60 ${h.getHours() === 0 ? "text-cyan-300 font-semibold" : "text-neutral-400"}`}>
                {h.getHours() === 0 ? h.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : `${String(h.getHours()).padStart(2, "0")}.00`}
              </div>
            ))}
          </div>

          {rows.length === 0 && <div className="p-4 text-sm text-neutral-500">{t("booking.map.noUnits", "Belum ada unit rental aktif.")}</div>}

          {rows.map((row) => {
            const height = row.lanes * LANE_PX + 8;
            return (
              <div key={row.key} className="flex border-b border-neutral-800/70" style={{ height }}>
                <div style={{ width: LABEL_PX }} className={`sticky left-0 z-10 flex flex-col justify-center px-2 border-r border-neutral-800 ${row.unitId ? "bg-neutral-900" : "bg-amber-950/40"}`}>
                  <span className="text-xs font-medium truncate" title={row.label}>{row.label}</span>
                  {row.unitId && <span className="text-[10px] text-neutral-500 uppercase">{row.consoleType}</span>}
                </div>
                <div
                  className="relative cursor-pointer"
                  style={{
                    width: timelineWidth,
                    backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${HOUR_PX - 1}px, rgba(115,115,115,0.18) ${HOUR_PX - 1}px, rgba(115,115,115,0.18) ${HOUR_PX}px)`,
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onSlotClick(row.unitId, row.consoleType, timeAtPosition(win, (e.clientX - rect.left) / rect.width));
                  }}
                >
                  {row.blocks.map((blk) => {
                    const b = blk.booking;
                    const s = new Date(b.scheduledStart);
                    const e = new Date(b.scheduledEnd);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); onBookingClick(b); }}
                        title={`${b.bookingCode ?? ""} · ${b.customerName ?? ""} · ${b.phone ?? ""}\n${hhmm(s)}–${hhmm(e)} · ${statusLabel(b.status)}`}
                        className={`absolute rounded-md border px-1.5 text-left text-[11px] leading-tight overflow-hidden hover:brightness-125 hover:z-10 ${STATUS_CLASS[b.status] ?? STATUS_CLASS.pending} ${blk.clippedStart ? "rounded-l-none border-l-0" : ""} ${blk.clippedEnd ? "rounded-r-none border-r-0" : ""}`}
                        style={{ left: `${blk.left}%`, width: `${blk.width}%`, top: 4 + blk.lane * LANE_PX, height: LANE_PX - 4 }}
                      >
                        <div className="font-semibold truncate">{b.customerName || b.bookingCode || "—"}</div>
                        <div className="truncate opacity-80">{hhmm(s)}–{hhmm(e)}{b.source !== "kasir" ? ` · ${b.source === "whatsapp" ? "WA" : "Online"}` : ""}</div>
                      </button>
                    );
                  })}
                  {nowPct !== null && <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-rose-500/80" style={{ left: `${nowPct}%` }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
