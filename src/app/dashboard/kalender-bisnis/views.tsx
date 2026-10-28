"use client";
import { clsx } from "clsx";
import { Trophy } from "lucide-react";
import type { DailyActual } from "@/lib/activity-calendar/insights-rules";
import type { Next7Day } from "@/lib/activity-calendar/calendar";
import {
  RAIN_STYLE,
  STATUS_STYLE,
  WeatherIcon,
  fill,
  fmtDate,
  isPrime,
  monthGrid,
  rainLabel,
  slotLabel,
  startOfWeek,
  statusLabel,
  addDays,
  type CalendarMatch,
  type CalendarWeatherDay,
  type Filters,
  type TFn,
  type WeatherSlot,
} from "./shared";

export interface ViewData {
  today: string;
  weatherByDate: Map<string, CalendarWeatherDay>;
  slotsByDate: Map<string, WeatherSlot[]>;
  matchesByDate: Map<string, CalendarMatch[]>;
  actualByDate: Map<string, DailyActual>;
  predictionByDate: Map<string, Next7Day>;
  hourly: number[] | null;
}

interface ViewProps {
  data: ViewData;
  filters: Filters;
  selected: string | null;
  onSelect: (date: string) => void;
  anchor: string;
  t: TFn;
  locale: string;
  lang: string;
  money: (n: number) => string;
}

const isRainy = (w: CalendarWeatherDay | undefined) => !!w && w.rainSlots > 0;

/* ================================================================ BULAN ================================================================ */

export function MonthView({ data, filters, selected, onSelect, anchor, t, locale, money }: ViewProps) {
  const { days } = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const weekdays = days.slice(0, 7).map((d) => fmtDate(d, locale, { weekday: "short" }));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {weekdays.map((w, i) => (
            <div key={i} className={clsx("px-2 text-[11px] font-medium uppercase tracking-wide", i >= 5 ? "text-cyan-300/80" : "text-neutral-500")}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const inMonth = d.slice(0, 7) === month;
            const w = filters.weather ? data.weatherByDate.get(d) : undefined;
            const matches = filters.matches ? data.matchesByDate.get(d) ?? [] : [];
            const prime = matches.filter(isPrime);
            const actual = filters.actual && d <= data.today ? data.actualByDate.get(d) : undefined;
            const pred = d >= data.today ? data.predictionByDate.get(d)?.baseline : null;
            const dim = filters.rainOnly && !isRainy(w);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelect(d)}
                className={clsx(
                  "group relative flex min-h-[104px] flex-col rounded-xl border p-2 text-left transition",
                  w && w.rainSlots > 0 ? RAIN_STYLE[w.worstRain]?.cell : "bg-white/[0.02]",
                  selected === d ? "border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.5),0_0_24px_-6px_rgba(34,211,238,0.5)]" : "border-white/[0.07] hover:border-cyan-400/30 hover:bg-white/[0.04]",
                  !inMonth && "opacity-45",
                  dim && "opacity-25"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={clsx(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold",
                      d === data.today ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-neutral-950" : "text-neutral-200"
                    )}
                  >
                    {Number(d.slice(8, 10))}
                  </span>
                  {w && (
                    <span className={clsx("flex items-center gap-1 text-[10px]", w.source === "archive" && "opacity-60")} title={rainLabel(w.worstRain, t)}>
                      <WeatherIcon sky={w.sky} rain={w.worstRain} size={15} />
                      {w.tempMax != null && <span className="text-neutral-300">{Math.round(w.tempMax)}°</span>}
                    </span>
                  )}
                </div>
                {w && w.rainSlots > 0 && (
                  <span className={clsx("mt-1 w-fit rounded-md border px-1.5 py-px text-[10px]", RAIN_STYLE[w.worstRain]?.chip, w.source === "archive" && "opacity-60")}>
                    {rainLabel(w.worstRain, t)}
                  </span>
                )}
                {matches.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {matches.slice(0, 2).map((m) => (
                      <div key={m.matchId} className={clsx("truncate text-[10px]", isPrime(m) ? "text-lime-200" : "text-neutral-400")}>
                        <span className="font-mono">{m.localTime}</span> {m.homeTeam} {t("act.vs", "vs")} {m.awayTeam}
                      </div>
                    ))}
                    {matches.length > 2 && <div className="text-[10px] text-neutral-500">{fill(t("act.day.more", "+{n} lagi"), { n: matches.length - 2 })}</div>}
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                  {prime.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-lime-400/15 px-1 text-[10px] text-lime-200">
                      <Trophy size={10} /> {prime.length}
                    </span>
                  )}
                  {actual && (actual.sessions > 0 || actual.revenue > 0) && (
                    <span className="rounded-md bg-emerald-500/15 px-1 text-[10px] text-emerald-200" title={money(actual.revenue)}>
                      {actual.sessions}
                    </span>
                  )}
                  {pred && !actual && (
                    <span className="rounded-md border border-dashed border-fuchsia-400/40 px-1 text-[10px] text-fuchsia-200">≈{pred.sessions}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ MINGGU ================================================================ */

const BANDS = [0, 3, 6, 9, 12, 15, 18, 21];

export function WeekView({ data, filters, selected, onSelect, anchor, t, locale, lang, money }: ViewProps) {
  const from = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1.5">
        <div />
        {days.map((d) => {
          const w = filters.weather ? data.weatherByDate.get(d) : undefined;
          const actual = filters.actual && d <= data.today ? data.actualByDate.get(d) : undefined;
          const pred = d >= data.today ? data.predictionByDate.get(d)?.baseline : null;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className={clsx(
                "rounded-xl border px-2 py-2 text-left transition",
                selected === d ? "border-cyan-400/70 bg-cyan-500/10" : "border-white/[0.07] bg-white/[0.02] hover:border-cyan-400/30",
                filters.rainOnly && !isRainy(w) && "opacity-30"
              )}
            >
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">{fmtDate(d, locale, { weekday: "short" })}</div>
              <div className="flex items-center justify-between">
                <span className={clsx("text-lg font-semibold", d === data.today ? "text-cyan-300" : "text-neutral-100")}>{Number(d.slice(8, 10))}</span>
                {w && <WeatherIcon sky={w.sky} rain={w.worstRain} size={18} className={w.source === "archive" ? "opacity-60" : ""} />}
              </div>
              <div className="mt-0.5 h-4 text-[10px]">
                {actual && (actual.sessions > 0 || actual.revenue > 0) ? (
                  <span className="text-emerald-200">
                    {actual.sessions} · {money(actual.revenue)}
                  </span>
                ) : pred ? (
                  <span className="text-fuchsia-200">≈{pred.sessions}</span>
                ) : null}
              </div>
            </button>
          );
        })}
        {BANDS.map((b) => (
          <BandRow key={b} band={b} days={days} {...{ data, filters, t, lang, onSelect }} />
        ))}
      </div>
    </div>
  );
}

function BandRow({ band, days, data, filters, t, lang, onSelect }: { band: number; days: string[]; data: ViewData; filters: Filters; t: TFn; lang: string; onSelect: (d: string) => void }) {
  return (
    <>
      <div className="pt-1.5 text-right font-mono text-[10px] text-neutral-500">{String(band).padStart(2, "0")}:00</div>
      {days.map((d) => {
        const slot = filters.weather ? (data.slotsByDate.get(d) ?? []).find((s) => s.hour >= band && s.hour < band + 3) : undefined;
        const matches = filters.matches ? (data.matchesByDate.get(d) ?? []).filter((m) => {
          const h = Number(m.localTime.slice(0, 2));
          return h >= band && h < band + 3;
        }) : [];
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={clsx("min-h-[46px] rounded-lg border border-white/[0.05] p-1 text-left transition hover:border-cyan-400/25", slot && slot.rain !== "none" ? RAIN_STYLE[slot.rain]?.cell : "bg-white/[0.015]")}
          >
            {slot && (
              <div className="flex items-center gap-1 text-[10px] text-neutral-300" title={slotLabel(slot, lang, t)}>
                <WeatherIcon sky={slot.sky} rain={slot.rain} size={12} />
                {slot.tempC != null && <span>{Math.round(slot.tempC)}°</span>}
                {slot.precipMm != null && slot.precipMm > 0 && <span className="text-sky-300">{slot.precipMm}mm</span>}
              </div>
            )}
            {matches.map((m) => (
              <div key={m.matchId} className={clsx("mt-0.5 truncate rounded px-1 text-[10px]", isPrime(m) ? "bg-lime-400/15 text-lime-100" : "bg-white/5 text-neutral-300")}>
                {m.localTime} {m.homeTeam}–{m.awayTeam}
              </div>
            ))}
          </button>
        );
      })}
    </>
  );
}

/* ================================================================ HARI ================================================================ */

export function DayView({ data, filters, anchor, t, lang }: ViewProps) {
  const slots = filters.weather ? data.slotsByDate.get(anchor) ?? [] : [];
  const matches = filters.matches ? data.matchesByDate.get(anchor) ?? [] : [];
  const hourly = filters.actual && anchor <= data.today ? data.hourly : null;
  const maxHourly = hourly ? Math.max(1, ...hourly) : 1;
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[52px_1fr_1.4fr_1fr] gap-2 px-1 text-[10px] uppercase tracking-wide text-neutral-500">
        <span>{t("act.hourCol", "Jam")}</span>
        <span>{t("act.filter.weather", "Cuaca")}</span>
        <span>{t("act.filter.matches", "Pertandingan")}</span>
        <span>{t("act.detail.hourly", "Sesi rental per jam (mulai)")}</span>
      </div>
      {BANDS.map((b) => {
        const slot = slots.find((s) => s.hour >= b && s.hour < b + 3);
        const ms = matches.filter((m) => {
          const h = Number(m.localTime.slice(0, 2));
          return h >= b && h < b + 3;
        });
        return (
          <div key={b} className={clsx("grid grid-cols-[52px_1fr_1.4fr_1fr] items-start gap-2 rounded-xl border border-white/[0.06] p-2", slot && slot.rain !== "none" ? RAIN_STYLE[slot.rain]?.cell : "bg-white/[0.02]")}>
            <div className="font-mono text-xs text-neutral-400">
              {String(b).padStart(2, "0")}–{String(b + 3).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              {slot ? (
                <div className="flex items-start gap-2">
                  <WeatherIcon sky={slot.sky} rain={slot.rain} size={20} />
                  <div className="min-w-0 text-xs">
                    <div className="truncate text-neutral-100">{slotLabel(slot, lang, t)}</div>
                    <div className="text-[11px] text-neutral-400">
                      {slot.tempC != null && `${Math.round(slot.tempC)}°C`}
                      {slot.precipMm != null && ` · ${slot.precipMm} mm`}
                      {slot.humidity != null && ` · ${slot.humidity}%`}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-neutral-600">—</span>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              {ms.map((m) => (
                <div key={m.matchId} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lime-200">{m.localTime}</span>
                    <span className={clsx("rounded-full border px-1.5 text-[9px]", STATUS_STYLE[m.status])}>{statusLabel(m.status, t)}</span>
                  </div>
                  <div className="truncate text-neutral-100">
                    {m.homeTeam} {m.scoreHome != null && m.scoreAway != null ? `${m.scoreHome}–${m.scoreAway}` : t("act.vs", "vs")} {m.awayTeam}
                  </div>
                  <div className="truncate text-[10px] text-neutral-500">{m.leagueName}</div>
                </div>
              ))}
            </div>
            <div className="space-y-0.5">
              {hourly
                ? [b, b + 1, b + 2].map((h) => (
                    <div key={h} className="flex items-center gap-1.5">
                      <span className="w-5 font-mono text-[9px] text-neutral-500">{String(h).padStart(2, "0")}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${(hourly[h] / maxHourly) * 100}%` }} />
                      </div>
                      <span className="w-4 text-right text-[10px] text-neutral-300">{hourly[h] || ""}</span>
                    </div>
                  ))
                : <span className="text-xs text-neutral-600">—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
