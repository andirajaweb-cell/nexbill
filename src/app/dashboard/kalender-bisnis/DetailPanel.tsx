"use client";
import { clsx } from "clsx";
import { Clock, GraduationCap, PartyPopper, Pencil, Plus, X } from "lucide-react";
import {
  ACADEMIC_STYLE,
  HOLIDAY_STYLE,
  academicKindLabel,
  academicLevelLabel,
  holidayKindLabel,
  RAIN_STYLE,
  STATUS_STYLE,
  SourceTag,
  WeatherIcon,
  bucketLabel,
  fill,
  fmtDate,
  isPrime,
  rainLabel,
  skyLabel,
  slotLabel,
  statusLabel,
  type CalendarAcademic,
  type TFn,
} from "./shared";
import type { ViewData } from "./views";

export function DetailPanel({
  date,
  data,
  t,
  locale,
  lang,
  tzAbbr,
  money,
  onClose,
  canEditAcademic = false,
  showExtras = true,
  onAddAcademic,
  onEditAcademic,
}: {
  date: string | null;
  data: ViewData;
  t: TFn;
  locale: string;
  lang: string;
  tzAbbr: string;
  money: (n: number) => string;
  onClose: () => void;
  canEditAcademic?: boolean;
  /** false = migrasi 0040 belum dijalankan (bagian libur/akademik disembunyikan). */
  showExtras?: boolean;
  onAddAcademic?: (date: string) => void;
  onEditAcademic?: (a: CalendarAcademic) => void;
}) {
  if (!date) return <p className="py-10 text-center text-sm text-neutral-500">{t("act.detail.select", "Pilih tanggal untuk melihat detail.")}</p>;
  const w = data.weatherByDate.get(date);
  const slots = data.slotsByDate.get(date) ?? [];
  const matches = data.matchesByDate.get(date) ?? [];
  const actual = date <= data.today ? data.actualByDate.get(date) : undefined;
  const pred = data.predictionByDate.get(date)?.baseline ?? null;
  const holidays = data.holidaysByDate.get(date) ?? [];
  const academic = data.academicByDate.get(date) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">{fmtDate(date, locale, { weekday: "long" })}</div>
          <div className="text-lg font-semibold text-neutral-100">{fmtDate(date, locale, { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={t("act.detail.close", "Tutup")} className="rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-neutral-200">
          <X size={16} />
        </button>
      </div>

      {/* ---------------- libur nasional & kalender akademik ---------------- */}
      {showExtras && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-neutral-200">
              <PartyPopper size={14} className="text-rose-300" /> {t("act.detail.holidays", "Libur & kalender akademik")}
            </h3>
            {canEditAcademic && onAddAcademic && (
              <button type="button" onClick={() => onAddAcademic(date)} className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 px-1.5 py-0.5 text-[11px] text-amber-200 hover:bg-amber-500/10">
                <Plus size={11} /> {t("act.acad.add", "Tambah jadwal akademik")}
              </button>
            )}
          </div>
          {holidays.length === 0 && academic.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("act.detail.noHoliday", "Bukan hari libur dan tidak ada jadwal akademik.")}</p>
          ) : (
            <div className="space-y-1.5">
              {holidays.map((h) => (
                <div key={h.id} className={clsx("rounded-xl border p-2.5", HOLIDAY_STYLE[h.kind] ?? HOLIDAY_STYLE.other)}>
                  <div className="text-[10px] uppercase tracking-wide opacity-80">{holidayKindLabel(h.kind, t)}</div>
                  <div className="text-sm font-medium">{h.name}</div>
                  {h.nameEn && h.nameEn !== h.name && <div className="text-[11px] opacity-70">{h.nameEn}</div>}
                  {h.endDate !== h.date && (
                    <div className="text-[11px] opacity-80">
                      {fmtDate(h.date, locale, { day: "numeric", month: "short" })} – {fmtDate(h.endDate, locale, { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              ))}
              {academic.map((a) => (
                <div key={a.id} className={clsx("flex items-start justify-between gap-2 rounded-xl border p-2.5", ACADEMIC_STYLE[a.kind] ?? ACADEMIC_STYLE.other)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-80">
                      <GraduationCap size={11} /> {academicKindLabel(a.kind, t)} · {academicLevelLabel(a.level, t)}
                    </div>
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-[11px] opacity-80">
                      {fmtDate(a.startDate, locale, { day: "numeric", month: "short" })} – {fmtDate(a.endDate, locale, { day: "numeric", month: "short", year: "numeric" })}
                      {a.province ? ` · ${a.province}` : ""}
                    </div>
                    {a.note && <div className="mt-0.5 text-[11px] opacity-80">{a.note}</div>}
                  </div>
                  {canEditAcademic && onEditAcademic && (
                    <button type="button" onClick={() => onEditAcademic(a)} aria-label={t("act.acad.edit", "Ubah")} className="shrink-0 rounded-md p-1 opacity-80 hover:bg-white/10 hover:opacity-100">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-neutral-500">{t("act.detail.academicSource", "Libur nasional: Google Calendar. Jadwal akademik: diisi outlet.")}</p>
        </section>
      )}

      {/* ---------------- cuaca ---------------- */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-neutral-200">{t("act.detail.weather", "Cuaca per 3 jam")}</h3>
          {w && <SourceTag kind={w.source === "forecast" ? "forecast" : "archive"} t={t} />}
        </div>
        {w ? (
          <div className={clsx("flex items-center gap-3 rounded-xl border p-3", w.rainSlots > 0 ? RAIN_STYLE[w.worstRain]?.chip : "border-white/10 bg-white/[0.03]")}>
            <WeatherIcon sky={w.sky} rain={w.worstRain} size={28} />
            <div className="text-sm">
              <div className="font-medium">{w.rainSlots > 0 ? rainLabel(w.worstRain, t) : skyLabel(w.sky, t)}</div>
              <div className="text-xs opacity-80">
                {w.tempMin != null && w.tempMax != null && fill(t("act.detail.tempRange", "{min}–{max}°C"), { min: Math.round(w.tempMin), max: Math.round(w.tempMax) })}
                {w.precipTotal != null && ` · ${t("act.detail.precip", "Curah hujan")} ${w.precipTotal} mm`}
              </div>
              {w.rainHours.length > 0 && (
                <div className="text-xs opacity-80">
                  {fill(t("act.detail.rainHours", "Hujan sekitar {hours}"), { hours: w.rainHours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ") })} {tzAbbr}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-500">{t("act.detail.noWeather", "Tidak ada data cuaca untuk tanggal ini.")}</p>
        )}
        {slots.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {slots.map((s) => (
              <div key={s.utc} className={clsx("rounded-lg border p-1.5 text-center", s.rain !== "none" ? RAIN_STYLE[s.rain]?.chip : "border-white/10 bg-white/[0.03]")} title={slotLabel(s, lang, t)}>
                <div className="font-mono text-[10px] text-neutral-400">{String(s.hour).padStart(2, "0")}:00</div>
                <WeatherIcon sky={s.sky} rain={s.rain} size={18} className="mx-auto my-0.5" />
                <div className="text-[11px] text-neutral-100">{s.tempC != null ? `${Math.round(s.tempC)}°` : "—"}</div>
                <div className="text-[9px] text-neutral-400">{s.precipMm != null ? `${s.precipMm} mm` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- pertandingan ---------------- */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-neutral-200">{t("act.detail.matches", "Pertandingan")}</h3>
          {matches.length > 0 && <SourceTag kind="schedule" t={t} />}
        </div>
        {matches.length === 0 ? (
          <p className="text-xs text-neutral-500">{t("act.detail.noMatches", "Tidak ada pertandingan liga pilihan.")}</p>
        ) : (
          <div className="space-y-1.5">
            {matches.map((m) => (
              <div key={m.matchId} className={clsx("rounded-xl border p-2.5", isPrime(m) ? "border-lime-400/30 bg-lime-400/[0.06]" : "border-white/10 bg-white/[0.03]")}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1 font-mono text-lime-200">
                    <Clock size={11} /> {m.localTime} {tzAbbr}
                    <span className="font-sans text-neutral-500">· {bucketLabel(m.bucket, t)}</span>
                  </span>
                  <span className={clsx("rounded-full border px-1.5 py-px text-[9px]", STATUS_STYLE[m.status])}>{statusLabel(m.status, t)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-neutral-100">
                  {m.homeLogo && <img src={m.homeLogo} alt="" className="h-4 w-4 object-contain" loading="lazy" />}
                  <span className="truncate">{m.homeTeam}</span>
                  <span className="shrink-0 text-xs text-neutral-400">{m.scoreHome != null && m.scoreAway != null ? `${m.scoreHome} – ${m.scoreAway}` : t("act.vs", "vs")}</span>
                  <span className="truncate">{m.awayTeam}</span>
                  {m.awayLogo && <img src={m.awayLogo} alt="" className="h-4 w-4 object-contain" loading="lazy" />}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-neutral-500">
                  {m.leagueName}
                  {m.country ? ` · ${m.country}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- aktual vs prediksi ---------------- */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-xs text-neutral-300">{t("act.detail.actual", "Transaksi aktual")}</span>
            <SourceTag kind="actual" t={t} />
          </div>
          {actual && (actual.sessions > 0 || actual.revenue > 0) ? (
            <dl className="space-y-0.5 text-xs">
              <Row label={t("act.detail.sessions", "Sesi rental")} value={String(actual.sessions)} />
              <Row label={t("act.detail.revenue", "Omzet")} value={money(actual.revenue)} />
              <Row label={t("act.detail.duration", "Durasi rata-rata")} value={actual.avgDurationMin != null ? fill(t("act.detail.minutes", "{n} menit"), { n: actual.avgDurationMin }) : "—"} />
            </dl>
          ) : (
            <p className="text-xs text-neutral-500">{date <= data.today ? t("act.detail.noActual", "Belum ada transaksi.") : "—"}</p>
          )}
        </div>
        <div className="rounded-xl border border-dashed border-fuchsia-400/30 bg-fuchsia-500/[0.04] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-xs text-neutral-300">{t("act.detail.prediction", "Prediksi")}</span>
            <SourceTag kind="prediction" t={t} />
          </div>
          {pred ? (
            <dl className="space-y-0.5 text-xs">
              <Row label={t("act.detail.sessions", "Sesi rental")} value={`≈${pred.sessions}`} />
              <Row label={t("act.detail.revenue", "Omzet")} value={`≈${money(pred.revenue)}`} />
              <Row label={t("act.detail.duration", "Durasi rata-rata")} value={pred.avgDurationMin != null ? fill(t("act.detail.minutes", "{n} menit"), { n: pred.avgDurationMin }) : "—"} />
              <div className="pt-1 text-[10px] text-neutral-500">{fill(t("act.detail.basedOn", "dari {n} hari"), { n: pred.n })}</div>
            </dl>
          ) : (
            <p className="text-xs text-neutral-500">{date >= data.today ? t("act.ins.baselineNone", "Data belum cukup") : "—"}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="text-right font-medium text-neutral-100">{value}</dd>
    </div>
  );
}
