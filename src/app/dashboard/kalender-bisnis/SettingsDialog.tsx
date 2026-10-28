"use client";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fill, TZ_ABBR, type TFn } from "./shared";

interface League {
  leagueId: string;
  name: string;
  country: string | null;
  image: string | null;
}
interface SettingsInfo {
  settings: { adm4Code: string | null; locationLabel: string | null; timezone: string; leagueIds: string[] | null; showWeather: boolean; showMatches: boolean };
  canEdit: boolean;
  leagues: League[];
  indonesianLeagueAvailable: boolean;
  football: { configured: boolean; plan: string | null; requestsUsed: number | null; requestsLimit: number | null; lastError: string | null; quotaLow: boolean };
}
interface Item {
  code: string;
  name: string;
}

const LEVELS = ["provinces", "regencies", "districts", "villages"] as const;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const d = await res.json().catch(() => null);
  if (!res.ok) throw new Error(d?.error ?? `HTTP ${res.status}`);
  return d as T;
}

export function SettingsDialog({ t, onClose, onSaved }: { t: TFn; onClose: () => void; onSaved: () => void }) {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<Item[][]>([[], [], [], []]);
  const [picked, setPicked] = useState<string[]>(["", "", "", ""]);
  const [wilayahError, setWilayahError] = useState(false);
  const [code, setCode] = useState("");
  const [leagues, setLeagues] = useState<string[]>([]);
  const [showWeather, setShowWeather] = useState(true);
  const [showMatches, setShowMatches] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getJson<SettingsInfo>("/api/activity-calendar/settings")
      .then((d) => {
        setInfo(d);
        setCode(d.settings.adm4Code ?? "");
        setLeagues(d.settings.leagueIds ?? []);
        setShowWeather(d.settings.showWeather);
        setShowMatches(d.settings.showMatches);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    getJson<{ items: Item[] }>("/api/activity-calendar/wilayah?level=provinces")
      .then((d) => setLists((l) => [d.items, l[1], l[2], l[3]]))
      .catch(() => setWilayahError(true));
  }, []);

  const choose = async (level: number, value: string) => {
    const nextPicked = picked.map((p, i) => (i < level ? p : i === level ? value : ""));
    setPicked(nextPicked);
    setLists((l) => l.map((x, i) => (i > level ? [] : x)));
    if (!value) return;
    if (level === 3) {
      setCode(value);
      return;
    }
    try {
      const d = await getJson<{ items: Item[] }>(`/api/activity-calendar/wilayah?level=${LEVELS[level + 1]}&parent=${encodeURIComponent(value)}`);
      setLists((l) => l.map((x, i) => (i === level + 1 ? d.items : x)));
    } catch {
      setWilayahError(true);
    }
  };

  const toggleLeague = (id: string) => setLeagues((ls) => (ls.includes(id) ? ls.filter((x) => x !== id) : [...ls, id]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/activity-calendar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adm4Code: code.trim() || null, leagueIds: leagues, showWeather, showMatches }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const labels = [t("act.set.province", "Provinsi"), t("act.set.regency", "Kabupaten/Kota"), t("act.set.district", "Kecamatan"), t("act.set.village", "Desa/Kelurahan")];
  const editable = !!info?.canEdit;
  const fb = info?.football;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b1020] p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-100">{t("act.set.title", "Pengaturan Kalender Bisnis")}</h2>
          <button type="button" onClick={onClose} aria-label={t("act.set.cancel", "Batal")} className="rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-neutral-200">
            <X size={18} />
          </button>
        </div>

        {!info && !error && <p className="text-sm text-neutral-500">{t("act.set.loading", "Memuat…")}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

        {info && (
          <div className="space-y-6">
            {!editable && <p className="text-xs text-amber-200">{t("act.set.readOnly", "Hanya Owner/Manajer dengan izin Pengaturan yang dapat mengubah.")}</p>}

            <section className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                <MapPin size={15} className="text-cyan-300" /> {t("act.set.location", "Lokasi outlet (BMKG)")}
              </h3>
              {info.settings.locationLabel && (
                <p className="text-xs text-neutral-400">
                  {fill(t("act.set.current", "Lokasi sekarang: {label}"), { label: info.settings.locationLabel })} ·{" "}
                  {fill(t("act.set.timezone", "Zona waktu: {tz}"), { tz: TZ_ABBR[info.settings.timezone] ?? info.settings.timezone })}
                </p>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {labels.map((label, i) => (
                  <label key={i} className="space-y-1 text-xs text-neutral-400">
                    <span>{label}</span>
                    <select
                      disabled={!editable || (i > 0 && !picked[i - 1]) || lists[i].length === 0}
                      value={picked[i]}
                      onChange={(e) => void choose(i, e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-2 text-sm text-neutral-100 disabled:opacity-40"
                    >
                      <option value="">{t("act.set.choose", "Pilih…")}</option>
                      {lists[i].map((it) => (
                        <option key={it.code} value={it.code}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {wilayahError && <p className="text-xs text-amber-200">{t("act.set.wilayahError", "Daftar wilayah tidak tersedia — ketik kode langsung.")}</p>}
              <label className="block space-y-1 text-xs text-neutral-400">
                <span>{t("act.set.code", "Kode wilayah desa/kelurahan")}</span>
                <input
                  value={code}
                  disabled={!editable}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="31.71.03.1001"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-2 font-mono text-sm text-neutral-100"
                />
                <span className="block text-[11px] text-neutral-500">{t("act.set.codeHint", "Format 4 bagian, mis. 31.71.03.1001. Terisi otomatis dari pilihan di atas, atau ketik langsung.")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-200">
                <input type="checkbox" checked={showWeather} disabled={!editable} onChange={(e) => setShowWeather(e.target.checked)} />
                {t("act.set.showWeather", "Tampilkan cuaca")}
              </label>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">{t("act.set.leagues", "Liga/kompetisi")}</h3>
              {!fb?.configured ? (
                <p className="text-xs text-amber-200">{t("act.football.notConfigured", "Jadwal sepak bola belum aktif: sumber data jadwal belum dipasang di server NEXBILL.")}</p>
              ) : (
                <>
                  <p className="text-[11px] text-neutral-500">{t("act.set.leaguesHint", "Tidak memilih apa pun = semua liga yang tersedia. Liga Indonesia diurutkan paling atas bila tersedia.")}</p>
                  {!info.indonesianLeagueAvailable && info.leagues.length > 0 && (
                    <p className="rounded-lg border border-amber-400/25 bg-amber-500/[0.07] px-3 py-2 text-[11px] text-amber-100">
                      {t("act.set.indonesiaMissing", "Liga Indonesia belum tersedia dari sumber jadwal saat ini. Yang tampil di sini adalah liga yang tersedia.")}
                    </p>
                  )}
                  {info.leagues.length === 0 ? (
                    <p className="text-xs text-neutral-500">{t("act.set.noLeagues", "Daftar liga belum tersedia.")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => setLeagues([])}
                        className={clsx("rounded-full border px-2.5 py-1 text-xs transition", leagues.length === 0 ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-neutral-300 hover:bg-white/5")}
                      >
                        {t("act.filter.allLeagues", "Semua liga")}
                      </button>
                      {info.leagues.map((l) => (
                        <button
                          key={l.leagueId}
                          type="button"
                          disabled={!editable}
                          onClick={() => toggleLeague(l.leagueId)}
                          className={clsx(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                            leagues.includes(l.leagueId) ? "border-lime-400/60 bg-lime-400/15 text-lime-100" : "border-white/10 text-neutral-300 hover:bg-white/5"
                          )}
                        >
                          {l.image && <img src={l.image} alt="" className="h-3.5 w-3.5 object-contain" loading="lazy" />}
                          {l.name}
                          {l.country && <span className="text-neutral-500">· {l.country}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {fb.requestsLimit != null && (
                    <p className={clsx("text-[11px]", fb.quotaLow ? "text-amber-200" : "text-neutral-500")}>
                      {fill(t("act.set.usage", "Kuota data jadwal: {used}/{limit} permintaan bulan ini."), {
                        used: fb.requestsUsed ?? 0,
                        limit: fb.requestsLimit,
                        plan: fb.plan ?? "—",
                      })}
                    </p>
                  )}
                </>
              )}
              <label className="flex items-center gap-2 text-sm text-neutral-200">
                <input type="checkbox" checked={showMatches} disabled={!editable} onChange={(e) => setShowMatches(e.target.checked)} />
                {t("act.set.showMatches", "Tampilkan pertandingan")}
              </label>
            </section>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button variant="secondary" onClick={onClose}>
                {t("act.set.cancel", "Batal")}
              </Button>
              {editable && (
                <Button onClick={save} disabled={saving}>
                  {saving ? t("act.set.saving", "Menyimpan & mengecek ke BMKG…") : t("act.set.save", "Simpan")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
