"use client";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CloudRain, Info, MapPin, RefreshCw, Settings2, Trophy, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useDashboardLang, DATE_LOCALE } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";
import type { DailyActual } from "@/lib/activity-calendar/insights-rules";
import "@/lib/i18n/dict-activity";
import {
  SourceTag,
  TZ_ABBR,
  WeatherIcon,
  fill,
  fmtDate,
  fmtDateTime,
  rainLabel,
  rangeFor,
  shiftAnchor,
  type CalendarMatch,
  type CalendarResponse,
  type CalendarWeatherDay,
  type Filters,
  type View,
  type WeatherSlot,
} from "./shared";
import { DayView, MonthView, WeekView, type ViewData } from "./views";
import { DetailPanel } from "./DetailPanel";
import { SettingsDialog } from "./SettingsDialog";

function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

type LoadState = { kind: "loading" } | { kind: "ready"; data: CalendarResponse } | { kind: "error"; message: string; migration?: boolean };

/**
 * Kalender Bisnis — cuaca BMKG + jadwal sepak bola + insight transaksi untuk mengantisipasi hari sepi/ramai.
 * Angka selalu diberi label sumbernya: Aktual (transaksi), Prakiraan/Arsip (BMKG), Jadwal (penyedia jadwal),
 * Prediksi (rata-rata hari yang sama 8 minggu). Data diambil dari /api/activity-calendar (cache server).
 */
export default function BusinessCalendarPage() {
  const { t, lang } = useDashboardLang();
  const locale = DATE_LOCALE[lang] ?? "id-ID";
  const { formatMoney } = useCurrency();
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<string>(localToday);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ weather: true, matches: true, actual: true, rainOnly: false, leagues: [] });
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const dayParam = view === "day" ? anchor : null;

  const url = useMemo(() => `/api/activity-calendar?${new URLSearchParams({ from: range.from, to: range.to, ...(dayParam ? { day: dayParam } : {}) }).toString()}`, [range.from, range.to, dayParam]);

  useEffect(() => {
    let alive = true;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const d = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok) setState({ kind: "error", message: d?.error ?? `HTTP ${res.status}`, migration: d?.migration === false });
        else setState({ kind: "ready", data: d as CalendarResponse });
      })
      .catch((e) => {
        if (alive) setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      alive = false;
    };
  }, [url, reloadKey]);

  // Server memperbarui data basi di latar belakang — muat ulang sekali setelah ±12 detik.
  const data = state.kind === "ready" ? state.data : null;
  useEffect(() => {
    if (!data?.refreshing?.weather && !data?.refreshing?.football) return;
    const h = window.setTimeout(() => setReloadKey((k) => k + 1), 12_000);
    return () => window.clearTimeout(h);
  }, [data?.refreshing?.weather, data?.refreshing?.football]);

  const viewData: ViewData | null = useMemo(() => {
    if (!data) return null;
    const leagueOk = (m: CalendarMatch) => filters.leagues.length === 0 || (m.leagueId != null && filters.leagues.includes(m.leagueId));
    const weatherByDate = new Map<string, CalendarWeatherDay>(data.weather.days.map((w) => [w.date, w]));
    const slotsByDate = new Map<string, WeatherSlot[]>();
    for (const s of data.weather.slots) {
      if (!slotsByDate.has(s.date)) slotsByDate.set(s.date, []);
      slotsByDate.get(s.date)!.push(s);
    }
    const matchesByDate = new Map<string, CalendarMatch[]>();
    for (const m of data.football.matches.filter(leagueOk)) {
      if (!matchesByDate.has(m.localDate)) matchesByDate.set(m.localDate, []);
      matchesByDate.get(m.localDate)!.push(m);
    }
    return {
      today: data.today,
      weatherByDate,
      slotsByDate,
      matchesByDate,
      actualByDate: new Map<string, DailyActual>(data.actuals.map((a) => [a.date, a])),
      predictionByDate: new Map(data.insights.next7.map((d) => [d.date, d])),
      hourly: data.hourly?.date === (view === "day" ? anchor : selected) ? data.hourly.sessions : null,
    };
  }, [data, filters.leagues, view, anchor, selected]);

  const refreshNow = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      const res = await fetch("/api/activity-calendar/refresh", { method: "POST" });
      const d = await res.json().catch(() => null);
      if (!res.ok) setNotice(d?.error ?? t("act.loadError", "Gagal memuat kalender."));
      else if (d?.weather === "recent" || d?.football === "recent") setNotice(t("act.refreshRecent", "Baru saja diperbarui — coba lagi dalam 15 menit."));
      else setNotice(t("act.refreshDone", "Data diperbarui."));
      setReloadKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  };

  const tz = data?.timezone ?? "Asia/Jakarta";
  const tzAbbr = TZ_ABBR[tz] ?? tz;
  const title =
    view === "month"
      ? fmtDate(anchor, locale, { month: "long", year: "numeric" })
      : view === "week"
        ? `${fmtDate(range.from, locale, { day: "numeric", month: "short" })} – ${fmtDate(range.to, locale, { day: "numeric", month: "short", year: "numeric" })}`
        : fmtDate(anchor, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const leagueChips = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of data?.football.matches ?? []) if (m.leagueId && m.leagueName) map.set(m.leagueId, m.leagueName);
    return [...map.entries()];
  }, [data?.football.matches]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("act.title", "Kalender Bisnis")}
        subtitle={t("act.subtitle", "Prakiraan cuaca BMKG dan jadwal sepak bola dalam satu kalender — untuk mengantisipasi hari sepi dan ramai.")}
        actions={
          <>
            {data?.canEdit && (
              <Button variant="secondary" onClick={refreshNow} disabled={refreshing}>
                <RefreshCw size={14} className={clsx("mr-1.5 inline", refreshing && "animate-spin")} />
                {refreshing ? t("act.refreshing", "Memperbarui…") : t("act.refresh", "Perbarui sekarang")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={14} className="mr-1.5 inline" />
              {t("act.settings", "Pengaturan")}
            </Button>
          </>
        }
      />

      {notice && <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/[0.07] px-3 py-2 text-sm text-cyan-100">{notice}</div>}

      {state.kind === "loading" && <LoadingSkeleton label={t("act.loading", "Memuat kalender…")} />}

      {state.kind === "error" && (
        <Card className="space-y-3 p-6 text-center">
          <AlertTriangle className="mx-auto text-amber-300" />
          <p className="text-sm text-neutral-200">{state.migration ? t("act.migration", "Fitur ini menunggu pembaruan database. Hubungi tim NEXBILL.") : t("act.loadError", "Gagal memuat kalender.")}</p>
          {!state.migration && <p className="text-xs text-neutral-500">{state.message}</p>}
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            {t("act.retry", "Coba lagi")}
          </Button>
        </Card>
      )}

      {data && viewData && (
        <>
          <StatusBar data={data} t={t} locale={locale} tz={tz} tzAbbr={tzAbbr} onSetup={() => setSettingsOpen(true)} />
          <InsightsSection data={data} t={t} locale={locale} money={formatMoney} onSelect={(d) => setSelected(d)} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="space-y-4 p-3 sm:p-4">
              {/* ---------------- navigasi & tampilan ---------------- */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" className="px-2" aria-label={t("act.prev", "Sebelumnya")} onClick={() => setAnchor((a) => shiftAnchor(view, a, -1))}>
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant="secondary" onClick={() => setAnchor(data.today)}>
                    {t("act.today", "Hari ini")}
                  </Button>
                  <Button variant="secondary" className="px-2" aria-label={t("act.next", "Berikutnya")} onClick={() => setAnchor((a) => shiftAnchor(view, a, 1))}>
                    <ChevronRight size={16} />
                  </Button>
                  <h2 className="ml-2 text-base font-semibold capitalize text-neutral-100">{title}</h2>
                </div>
                <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                  {(["month", "week", "day"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setView(v);
                        if (v === "day" && selected) setAnchor(selected);
                      }}
                      className={clsx("rounded-md px-3 py-1.5 text-xs font-medium transition", view === v ? "bg-cyan-500/20 text-cyan-100 shadow-inner" : "text-neutral-400 hover:text-neutral-100")}
                    >
                      {v === "month" ? t("act.view.month", "Bulan") : v === "week" ? t("act.view.week", "Minggu") : t("act.view.day", "Hari")}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---------------- filter ---------------- */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Toggle on={filters.weather} onClick={() => setFilters((f) => ({ ...f, weather: !f.weather }))} label={t("act.filter.weather", "Cuaca")} />
                <Toggle on={filters.matches} onClick={() => setFilters((f) => ({ ...f, matches: !f.matches }))} label={t("act.filter.matches", "Pertandingan")} />
                <Toggle on={filters.actual} onClick={() => setFilters((f) => ({ ...f, actual: !f.actual }))} label={t("act.filter.actual", "Transaksi aktual")} />
                <Toggle on={filters.rainOnly} onClick={() => setFilters((f) => ({ ...f, rainOnly: !f.rainOnly }))} label={t("act.filter.rainOnly", "Hanya hari hujan")} />
                {filters.matches && leagueChips.length > 1 && (
                  <>
                    <span className="mx-1 h-4 w-px bg-white/10" />
                    <Toggle on={filters.leagues.length === 0} onClick={() => setFilters((f) => ({ ...f, leagues: [] }))} label={t("act.filter.allLeagues", "Semua liga")} tone="lime" />
                    {leagueChips.map(([id, name]) => (
                      <Toggle
                        key={id}
                        tone="lime"
                        on={filters.leagues.includes(id)}
                        onClick={() => setFilters((f) => ({ ...f, leagues: f.leagues.includes(id) ? f.leagues.filter((x) => x !== id) : [...f.leagues, id] }))}
                        label={name}
                      />
                    ))}
                  </>
                )}
              </div>

              {view === "month" && <MonthView data={viewData} filters={filters} selected={selected} onSelect={setSelected} anchor={anchor} t={t} locale={locale} lang={lang} money={formatMoney} />}
              {view === "week" && <WeekView data={viewData} filters={filters} selected={selected} onSelect={setSelected} anchor={anchor} t={t} locale={locale} lang={lang} money={formatMoney} />}
              {view === "day" && <DayView data={viewData} filters={filters} selected={selected} onSelect={setSelected} anchor={anchor} t={t} locale={locale} lang={lang} money={formatMoney} />}

              <Legend t={t} />
            </Card>

            <Card className="h-fit p-4 xl:sticky xl:top-4">
              <DetailPanel date={view === "day" ? anchor : selected} data={viewData} t={t} locale={locale} lang={lang} tzAbbr={tzAbbr} money={formatMoney} onClose={() => setSelected(null)} />
            </Card>
          </div>

          <AnalysisSection data={data} t={t} />

          <p className="text-[11px] text-neutral-500">
            {t("act.attrBmkg", "Sumber data cuaca: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)")}
            {data.football.status.attributionRequired && <> · {t("act.attrFootball", "Data pertandingan: Footballdata.io")}</>}
          </p>
        </>
      )}

      {settingsOpen && (
        <SettingsDialog
          t={t}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            setNotice(t("act.set.saved", "Pengaturan disimpan."));
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

/* ================================================================ bagian kecil ================================================================ */

function Toggle({ on, onClick, label, tone = "cyan" }: { on: boolean; onClick: () => void; label: string; tone?: "cyan" | "lime" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        "rounded-full border px-2.5 py-1 text-xs transition",
        on ? (tone === "lime" ? "border-lime-400/50 bg-lime-400/15 text-lime-100" : "border-cyan-400/50 bg-cyan-500/15 text-cyan-100") : "border-white/10 text-neutral-400 hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
}

function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
        ))}
      </div>
      <p className="text-center text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function StatusBar({ data, t, locale, tz, tzAbbr, onSetup }: { data: CalendarResponse; t: (k: string, f: string) => string; locale: string; tz: string; tzAbbr: string; onSetup: () => void }) {
  const w = data.weather;
  const fb = data.football.status;
  if (!w.configured) {
    return (
      <Card className="flex flex-col items-start gap-3 border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.07] to-transparent p-5 sm:flex-row sm:items-center">
        <MapPin className="shrink-0 text-cyan-300" />
        <div className="flex-1">
          <div className="font-medium text-neutral-100">{t("act.noLocation.title", "Atur lokasi outlet dulu")}</div>
          <p className="text-sm text-neutral-400">
            {t("act.noLocation.body", "Pilih desa/kelurahan outlet supaya prakiraan BMKG sesuai lokasi dan jam ditampilkan sesuai zona waktu outlet.")}
          </p>
          {!data.canEdit && <p className="mt-1 text-xs text-amber-200">{t("act.noLocation.ask", "Minta Owner atau Manajer mengatur lokasi di Kalender Bisnis.")}</p>}
        </div>
        {data.canEdit && <Button onClick={onSetup}>{t("act.noLocation.cta", "Atur lokasi")}</Button>}
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5 text-neutral-200">
          <MapPin size={13} className="text-cyan-300" /> {w.locationLabel} · {tzAbbr}
        </span>
        {w.analysisDate && (
          <span>
            {fill(t("act.updatedBmkg", "Prakiraan BMKG {time}"), { time: fmtDateTime(w.analysisDate, locale, tz) })} · {fill(t("act.fetched", "diambil {time}"), { time: fmtDateTime(w.fetchedAt, locale, tz) })}
          </span>
        )}
        {fb.lastSuccessAt && <span>{fill(t("act.matchesSynced", "Jadwal diperbarui {time}"), { time: fmtDateTime(fb.lastSuccessAt, locale, tz) })}</span>}
      </div>
      {(w.error || w.stale) && (
        <Alert>
          {w.error ? fill(t("act.weatherError", "Cuaca: {msg}"), { msg: w.error }) : t("act.staleWarn", "Data cuaca lebih dari 12 jam — sedang dicoba diperbarui otomatis.")}
          {w.fetchedAt && ` ${t("act.showingLastGood", "Menampilkan data terakhir yang berhasil diambil.")}`}
        </Alert>
      )}
      {data.settings.showMatches && !fb.configured && <Alert tone="info">{t("act.football.notConfigured", "Jadwal sepak bola belum aktif: sumber data jadwal belum dipasang di server NEXBILL.")}</Alert>}
      {fb.configured && fb.lastError && <Alert>{fill(t("act.footballError", "Jadwal: {msg}"), { msg: fb.lastError })}</Alert>}
      {fb.configured && fb.quotaLow && <Alert>{t("act.football.quotaLow", "Kuota bulanan sumber data jadwal hampir habis — pembaruan otomatis dihentikan sementara, jadwal tersimpan tetap tampil.")}</Alert>}
      {w.forecastUntil && data.range.to > w.forecastUntil && (
        <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Info size={12} /> {t("act.forecastLimit", "BMKG hanya memberi prakiraan 3 hari ke depan; tanggal setelahnya belum punya data cuaca.")}
        </p>
      )}
    </div>
  );
}

function Alert({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "info" }) {
  return (
    <div className={clsx("flex items-start gap-2 rounded-xl border px-3 py-2 text-xs", tone === "warn" ? "border-amber-400/30 bg-amber-500/[0.08] text-amber-100" : "border-white/10 bg-white/[0.03] text-neutral-300")}>
      {tone === "warn" ? <AlertTriangle size={14} className="mt-px shrink-0" /> : <Info size={14} className="mt-px shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function InsightsSection({ data, t, locale, money, onSelect }: { data: CalendarResponse; t: (k: string, f: string) => string; locale: string; money: (n: number) => string; onSelect: (d: string) => void }) {
  const ins = data.insights;
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<CloudRain size={18} className="text-sky-300" />} label={t("act.ins.rainyDays", "Hari berpotensi hujan")} value={ins.forecastDays ? fill(t("act.ins.rainyValue", "{n} dari {m} hari berprakiraan"), { n: ins.rainyDays, m: ins.forecastDays }) : t("act.ins.noForecast", "Belum ada prakiraan")} tag={<SourceTag kind="forecast" t={t} />} />
        <Stat icon={<Trophy size={18} className="text-lime-300" />} label={t("act.ins.matches", "Pertandingan liga pilihan")} value={fill(t("act.ins.matchesValue", "{n} laga · {p} di jam 15.00–23.59"), { n: ins.matches, p: ins.primeTimeMatches })} tag={<SourceTag kind="schedule" t={t} />} />
        <Stat icon={<TrendingUp size={18} className="text-emerald-300" />} label={t("act.ins.history", "Riwayat transaksi untuk prediksi")} value={fill(t("act.ins.historyValue", "{n} hari buka dalam 90 hari"), { n: ins.historyDays })} tag={<SourceTag kind="actual" t={t} />} />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays size={16} className="text-cyan-300" />
          <h3 className="text-sm font-semibold text-neutral-100">{t("act.ins.title", "7 hari ke depan")}</h3>
        </div>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {ins.next7.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelect(d.date)}
              className={clsx(
                "min-w-[150px] flex-1 snap-start rounded-xl border p-3 text-left transition hover:border-cyan-400/40",
                d.weather && d.weather.rainSlots > 0 ? "border-sky-400/25 bg-sky-500/[0.06]" : "border-white/[0.07] bg-white/[0.02]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize text-neutral-200">{d.date === data.today ? t("act.today", "Hari ini") : fmtDate(d.date, locale, { weekday: "short", day: "numeric" })}</span>
                {d.weather && <WeatherIcon sky={d.weather.sky} rain={d.weather.worstRain} size={18} />}
              </div>
              <div className="mt-1 text-[11px] text-neutral-400">{d.weather ? rainLabel(d.weather.worstRain, t) : t("act.ins.noForecast", "Belum ada prakiraan")}</div>
              <div className="mt-1 text-[11px] text-lime-200">
                {d.matches > 0 ? `${fill(t("act.day.matches", "{n} laga"), { n: d.matches })}${d.firstPrimeKickoff ? ` · ${fill(t("act.ins.kickoff", "Kick-off {time}"), { time: d.firstPrimeKickoff })}` : ""}` : <span className="text-neutral-500">{t("act.ins.noMatch", "Tanpa laga")}</span>}
              </div>
              <div className="mt-1.5 border-t border-white/5 pt-1.5 text-[11px] text-fuchsia-200">
                {d.baseline ? fill(t("act.ins.baseline", "{sessions} sesi · {revenue}"), { sessions: `≈${d.baseline.sessions}`, revenue: money(d.baseline.revenue) }) : <span className="text-neutral-500">{t("act.ins.baselineNone", "Data belum cukup")}</span>}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </section>
  );
}

function Stat({ icon, label, value, tag }: { icon: React.ReactNode; label: string; value: string; tag: React.ReactNode }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">{icon}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          {label} {tag}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-neutral-100">{value}</div>
      </div>
    </Card>
  );
}

function AnalysisSection({ data, t }: { data: CalendarResponse; t: (k: string, f: string) => string }) {
  const metricLabel = (m: string) =>
    m === "sessions" ? t("act.an.metric.sessions", "Sesi rental") : m === "revenue" ? t("act.an.metric.revenue", "Omzet") : t("act.an.metric.avgDurationMin", "Durasi rata-rata");
  const blocks = [
    { key: "rain", title: t("act.an.rain", "Hari dengan prakiraan hujan di jam buka (09.00–23.59)"), block: data.insights.rain, icon: <CloudRain size={15} className="text-sky-300" /> },
    { key: "match", title: t("act.an.match", "Hari dengan pertandingan jam 15.00–23.59"), block: data.insights.match, icon: <Trophy size={15} className="text-lime-300" /> },
  ];
  return (
    <Card className="space-y-4 p-4">
      <h3 className="text-sm font-semibold text-neutral-100">{t("act.an.title", "Hubungan dengan transaksi outlet (90 hari terakhir)")}</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {blocks.map((b) => (
          <div key={b.key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-200">
              {b.icon} {b.title}
            </div>
            <div className="space-y-1.5">
              {b.block.comparisons.map((c) => (
                <div key={c.metric} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-400">{metricLabel(c.metric)}</span>
                  <span
                    className={clsx(
                      "text-right font-medium",
                      c.direction === "higher" ? "text-emerald-300" : c.direction === "lower" ? "text-rose-300" : c.direction === "similar" ? "text-neutral-200" : "text-neutral-500"
                    )}
                  >
                    {c.direction === "higher"
                      ? fill(t("act.an.higher", "{pct}% lebih tinggi"), { pct: Math.abs(c.diffPct ?? 0) })
                      : c.direction === "lower"
                        ? fill(t("act.an.lower", "{pct}% lebih rendah"), { pct: Math.abs(c.diffPct ?? 0) })
                        : c.direction === "similar"
                          ? t("act.an.similar", "Tidak terlihat perbedaan berarti")
                          : t("act.an.insufficient", "Data belum cukup")}
                    <span className="block text-[10px] font-normal text-neutral-500">{fill(t("act.an.n", "{a} hari vs {b} hari pembanding"), { a: c.withN, b: c.withoutN })}</span>
                  </span>
                </div>
              ))}
            </div>
            {b.key === "rain" && <p className="mt-2 text-[10px] text-neutral-500">{fill(t("act.an.archiveNote", "Arsip prakiraan cuaca terkumpul {n} hari sejak lokasi diatur — analisis cuaca makin akurat seiring waktu."), { n: b.block.coveredDays })}</p>}
          </div>
        ))}
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-500">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          {t("act.an.disclaimer", "Dibandingkan dengan hari yang sama dalam seminggu, pada data outlet ini. Ini korelasi — bukan bukti bahwa cuaca atau pertandingan menyebabkan perubahan. Hari hujan memakai arsip prakiraan BMKG, bukan pengamatan cuaca aktual.")}{" "}
          {t("act.an.minNote", "Minimal 5 hari di tiap kelompok.")}
        </span>
      </p>
    </Card>
  );
}

function Legend({ t }: { t: (k: string, f: string) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-3 text-[11px] text-neutral-400">
      <span className="flex items-center gap-1.5">
        <WeatherIcon sky="partly" size={13} /> {t("act.legend.forecast", "Prakiraan BMKG")}
      </span>
      <span className="flex items-center gap-1.5 opacity-60">
        <WeatherIcon sky="cloudy" size={13} /> {t("act.legend.archive", "Arsip prakiraan")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-sky-400/60" /> {t("act.rain.light", "Hujan ringan")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-blue-500/70" /> {t("act.rain.heavy", "Hujan lebat")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/70" /> {t("act.rain.thunder", "Hujan petir")}
      </span>
      <span className="flex items-center gap-1.5">
        <Trophy size={12} className="text-lime-300" /> {t("act.legend.prime", "Laga jam 15.00–23.59")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded bg-emerald-500/20 px-1 text-emerald-200">12</span> {t("act.legend.actual", "Aktual (transaksi)")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded border border-dashed border-fuchsia-400/50 px-1 text-fuchsia-200">≈12</span> {t("act.legend.prediction", "Prediksi: rata-rata hari yang sama, 8 minggu")}
      </span>
    </div>
  );
}
