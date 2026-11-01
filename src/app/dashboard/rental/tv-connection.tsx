"use client";
import { useCallback, useEffect, useState } from "react";
import { Tv } from "lucide-react";
import { usePollingWhenVisible } from "@/lib/api/use-polling";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { minutesSince, tvConnState, type TvConnState } from "@/lib/tv/connection-rules";
import "@/lib/i18n/dict-tv-connection";

export interface TvConn {
  state: TvConnState;
  minutes: number | null;
  screenName: string;
  appVersion: string | null;
}

interface Row {
  unitId: string;
  screenName: string;
  isPaired: boolean;
  lastSeenAt: string | null;
  appVersion: string | null;
}

/**
 * Status sambungan NEXBILL TV per unit (lib/tv/connection-rules.ts), diperbarui tiap 15 detik.
 * Unit tanpa layar TV tidak ada di peta → tidak ada chip.
 */
export function useTvConnection(): Map<string, TvConn> {
  const [map, setMap] = useState<Map<string, TvConn>>(new Map());
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tv/connection", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { serverTime: string; screens: Row[] };
      // Pakai jam server supaya jam komputer kasir yang melenceng tidak membuat TV tampak offline.
      const now = Date.parse(d.serverTime) || Date.now();
      const next = new Map<string, TvConn>();
      for (const r of d.screens) {
        const conn: TvConn = { state: tvConnState(r.lastSeenAt, now, r.isPaired), minutes: minutesSince(r.lastSeenAt, now), screenName: r.screenName, appVersion: r.appVersion };
        const prev = next.get(r.unitId);
        // Dua layar untuk satu unit: yang online yang dipakai.
        if (!prev || (prev.state !== "online" && conn.state === "online")) next.set(r.unitId, conn);
      }
      setMap(next);
    } catch {
      /* offline — chip terakhir dipertahankan */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  usePollingWhenVisible(() => {
    void load();
  }, 15_000);
  return map;
}

/** "18 jam 36 mnt" / "2 hari 3 jam" — menit mentah (mis. 1116 mnt) sulit dibaca sekilas. */
function offlineDuration(minutes: number, t: (k: string, f: string) => string): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return t("tvConn.durMin", "{m} mnt").replace("{m}", String(m));
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? t("tvConn.durHourMin", "{h} jam {m} mnt").replace("{h}", String(h)).replace("{m}", String(r)) : t("tvConn.durHour", "{h} jam").replace("{h}", String(h));
  }
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return h ? t("tvConn.durDayHour", "{d} hari {h} jam").replace("{d}", String(d)).replace("{h}", String(h)) : t("tvConn.durDay", "{d} hari").replace("{d}", String(d));
}

/**
 * Baris status NEXBILL TV di kartu unit — ditaruh di bawah tombol utama (Pilih Stasiun Ini / End Session),
 * dengan penanda merek "NEXBILL TV" supaya jelas bilik ini memakai aplikasi NEXBILL TV (bukan smart plug
 * atau Relay Agent). Unit tanpa layar NEXBILL TV tidak menampilkan apa pun.
 */
export function TvConnectionChip({ conn }: { conn: TvConn | undefined }) {
  const { t } = useDashboardLang();
  if (!conn) return null;
  const online = conn.state === "online";
  const never = conn.state === "never";
  const status = online
    ? t("tvConn.online", "TV terhubung")
    : never
      ? t("tvConn.never", "TV belum dipasangkan")
      : t("tvConn.offlineFor", "TV offline {d}").replace("{d}", offlineDuration(conn.minutes ?? 0, t));
  const tone = online
    ? "border-emerald-400/25 bg-emerald-500/[0.06]"
    : never
      ? "border-amber-400/25 bg-amber-500/[0.06]"
      : "border-rose-400/30 bg-rose-500/[0.07]";
  const dot = online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : never ? "bg-amber-400" : "bg-rose-400";
  const text = online ? "text-emerald-300" : never ? "text-amber-300" : "text-rose-300";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] ${tone}`}
      title={`${conn.screenName}${conn.appVersion ? ` · NEXBILL TV ${conn.appVersion}` : ""}`}
    >
      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-cyan-500/15 border border-cyan-400/30 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-cyan-200">
        <Tv size={10} /> NEXBILL TV
      </span>
      <span className={`inline-flex min-w-0 items-center gap-1.5 font-semibold ${text}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{status}</span>
      </span>
      {conn.appVersion && <span className="ml-auto shrink-0 text-[10px] text-neutral-500">v{conn.appVersion}</span>}
    </div>
  );
}
