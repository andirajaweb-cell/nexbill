"use client";
import { useState } from "react";
import { MonitorSmartphone, Plus, ExternalLink, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/api/use-api";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import type { DiscoveredTvState } from "@/lib/relay/tv-discovery";
import "@/lib/i18n/dict-devices-tvsetup";

export interface DiscoveredTvsResponse {
  canManage: boolean;
  agents: { id: string; name: string; status: string; agentVersion: string | null; supportsSetup: boolean }[];
  tvs: {
    ip: string;
    port: number;
    state: DiscoveredTvState;
    brand?: string;
    model?: string;
    agentId: string;
    agentName: string;
    agentOnline: boolean;
    reportedAt: string | null;
    suggestedName: string;
    added: boolean;
    deviceName: string | null;
  }[];
}

/** Alamat layar Hubungkan TV milik NexbillAgent v1.5 — hanya terbuka di PC tempat agent berjalan. */
export const AGENT_SETUP_URL = "http://localhost:8737/setup";

const STATE_CLASS: Record<DiscoveredTvState, string> = {
  ready: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  unauthorized: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  offline: "border-white/10 bg-white/5 text-neutral-400",
  found: "border-sky-400/40 bg-sky-500/10 text-sky-200",
};

/**
 * "TV yang ditemukan NexbillAgent" di Kontrol Perangkat. Merchant tidak lagi membuka Command Prompt
 * untuk `adb connect` atau mengetik IP: TV dihubungkan di layar Hubungkan TV milik agent v1.5, dan
 * TV yang siap muncul di sini dengan tombol "Tambahkan" (membuat perangkat android_tv_relay).
 */
export function DiscoveredTvsCard({ onAdded }: { onAdded: () => void }) {
  const { t } = useDashboardLang();
  const { data, mutate } = useApi<DiscoveredTvsResponse>("/api/devices/discovered-tvs", { refreshInterval: 10000 });
  const [adding, setAdding] = useState<string | null>(null);

  if (!data || data.agents.length === 0) return null;
  const anySetup = data.agents.some((a) => a.supportsSetup);
  const stateLabel: Record<DiscoveredTvState, string> = {
    ready: t("devices.tvSetup.state.ready", "Siap dikontrol"),
    unauthorized: t("devices.tvSetup.state.unauthorized", "Tekan Izinkan di TV"),
    offline: t("devices.tvSetup.state.offline", "Tidak tersambung"),
    found: t("devices.tvSetup.state.found", "Ditemukan"),
  };

  const add = async (tv: DiscoveredTvsResponse["tvs"][number]) => {
    const key = `${tv.agentId}:${tv.ip}`;
    setAdding(key);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tv.suggestedName,
          protocol: "android_tv_relay",
          config: JSON.stringify({ relayAgentId: tv.agentId, ip: tv.ip, port: tv.port }),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(body.error ?? res.statusText);
      await mutate();
      onAdded();
    } finally {
      setAdding(null);
    }
  };

  return (
    <Card className="space-y-3 border border-cyan-500/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
            <MonitorSmartphone size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-medium">{t("devices.tvSetup.title", "Hubungkan TV tanpa Command Prompt")}</h2>
            <p className="text-xs text-neutral-500">
              {t(
                "devices.tvSetup.desc",
                "Di PC kasir yang menjalankan NexbillAgent, buka layar Hubungkan TV, klik Cari TV, lalu tekan Izinkan di layar TV. TV yang sudah siap muncul di bawah ini — tinggal klik Tambahkan, IP tidak perlu diketik."
              )}
            </p>
          </div>
        </div>
        <a
          href={AGENT_SETUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
        >
          <ExternalLink size={14} /> {t("devices.tvSetup.open", "Buka layar Hubungkan TV")}
        </a>
      </div>
      <p className="text-[11px] text-neutral-500">
        {t("devices.tvSetup.openHint", "Layar ini hanya bisa dibuka di PC tempat NexbillAgent berjalan. Di PC itu juga ada pintasan \"NEXBILL - Hubungkan TV\" di Desktop.")}
      </p>

      {!anySetup && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {t(
            "devices.tvSetup.needUpdate",
            "NexbillAgent di outlet ini belum versi 1.5. Agent akan memperbarui diri sendiri pada malam hari (03.00–06.00) bila update otomatis aktif; setelah itu layar Hubungkan TV tersedia."
          )}
        </div>
      )}

      {data.tvs.length === 0 ? (
        anySetup && <p className="text-xs text-neutral-500">{t("devices.tvSetup.empty", "Belum ada TV yang dilaporkan. Buka layar Hubungkan TV di PC kasir lalu klik Cari TV.")}</p>
      ) : (
        <div className="divide-y divide-white/5">
          {data.tvs.map((tv) => {
            const key = `${tv.agentId}:${tv.ip}`;
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{tv.suggestedName}</div>
                  <div className="text-[11px] text-neutral-500">
                    {tv.ip}:{tv.port}
                    {data.agents.length > 1 ? ` · ${tv.agentName}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATE_CLASS[tv.state]}`}>{stateLabel[tv.state]}</span>
                  {tv.added ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                      <CheckCircle2 size={13} /> {t("devices.tvSetup.added", "Sudah ditambahkan: {name}").replace("{name}", tv.deviceName ?? "")}
                    </span>
                  ) : data.canManage && tv.state === "ready" ? (
                    <Button className="text-xs" onClick={() => add(tv)} disabled={adding === key}>
                      <span className="inline-flex items-center gap-1">
                        <Plus size={13} /> {adding === key ? t("devices.tvSetup.adding", "Menambahkan...") : t("devices.tvSetup.add", "Tambahkan")}
                      </span>
                    </Button>
                  ) : tv.state !== "ready" ? (
                    <span className="text-[11px] text-neutral-500">{t("devices.tvSetup.finishOnPc", "Selesaikan di layar Hubungkan TV")}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
