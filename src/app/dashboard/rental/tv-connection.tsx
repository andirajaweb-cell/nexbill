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

export function TvConnectionChip({ conn }: { conn: TvConn | undefined }) {
  const { t } = useDashboardLang();
  if (!conn) return null;
  if (conn.state === "online") {
    return (
      <span
        title={`${conn.screenName}${conn.appVersion ? ` · NEXBILL TV ${conn.appVersion}` : ""}`}
        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-400/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
      >
        <Tv size={10} /> {t("tvConn.online", "TV terhubung")}
      </span>
    );
  }
  const label =
    conn.state === "never"
      ? t("tvConn.never", "TV belum dipasangkan")
      : t("tvConn.offline", "TV offline {n} mnt").replace("{n}", String(conn.minutes ?? 0));
  return (
    <span title={conn.screenName} className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-400/30 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
      <Tv size={10} /> {label}
    </span>
  );
}
