"use client";
import { useEffect, useState } from "react";
import { WifiOff, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-local-control";
import type { LocalUncoveredReason } from "@/lib/relay/local-control";

interface LocalAgentView {
  id: string;
  name: string;
  status: "online" | "offline";
  agentVersion: string | null;
  supportsLocal: boolean;
  urls: string[];
  pin: string | null;
  covered: { id: string; name: string; kind: "android_tv" | "tasmota" }[];
  uncovered: { id: string; name: string; reason: LocalUncoveredReason; protocol?: string; deviceId?: string }[];
}

/**
 * Kontrol Lokal saat internet putus (NexbillAgent v1.4, lib/relay/local-control.ts): unit mana yang
 * tetap bisa dikontrol lewat WiFi outlet, alamat & PIN halaman Kontrol Lokal, dan cara melengkapi
 * yang belum (IP lokal smart plug, versi agent).
 */
/** reloadSignal: dimuat ulang setiap nilai ini berganti (daftar perangkat halaman ini dimuat ulang). */
export function LocalControlCard({ canManage, reloadSignal, onDeviceChanged }: { canManage: boolean; reloadSignal: unknown; onDeviceChanged: () => void }) {
  const { t } = useDashboardLang();
  const [agents, setAgents] = useState<LocalAgentView[] | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [detecting, setDetecting] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    void fetchJsonObject<{ agents: LocalAgentView[] }>("/api/devices/local-control").then((r) => {
      if (alive) setAgents(r?.agents ?? []);
    });
    return () => {
      alive = false;
    };
  }, [reloadSignal, tick]);

  const reasonText = (reason: LocalUncoveredReason) => {
    switch (reason) {
      case "no_device":
        return t("devices.local.reason.noDevice", "belum ada perangkat");
      case "cloud_only":
        return t("devices.local.reason.cloudOnly", "Tuya/eWeLink hanya bisa lewat internet");
      case "no_local_ip":
        return t("devices.local.reason.noLocalIp", "IP lokal belum diisi");
      case "unsupported":
        return t("devices.local.reason.unsupported", "jenis perangkat ini belum didukung");
      default:
        return t("devices.local.reason.otherAgent", "dikontrol agent lain");
    }
  };

  const detectIp = async (deviceId: string) => {
    setDetecting(deviceId);
    try {
      const res = await fetch(`/api/devices/${deviceId}/detect-ip`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ip?: string; error?: string };
      if (!res.ok) return showAlert(data.error ?? t("devices.local.detectFailed", "IP smart plug tidak terdeteksi."));
      void showAlert(t("devices.local.detected", "IP lokal smart plug terdeteksi: {ip}").replace("{ip}", data.ip ?? ""));
      setTick((n) => n + 1);
      onDeviceChanged();
    } finally {
      setDetecting(null);
    }
  };

  if (agents === null) return null;

  return (
    <Card className="space-y-3 border border-sky-700/40 bg-sky-950/10">
      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <WifiOff size={16} /> {t("devices.local.title", "Kontrol Lokal saat Internet Putus")}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {t(
            "devices.local.desc",
            "Selama router/WiFi outlet masih menyala, NexbillAgent tetap bisa menyalakan & mematikan Android TV dan smart plug Tasmota tanpa internet: otomatis dari Kasir Rental (Mode Offline), dan manual dari halaman Kontrol Lokal di HP/PC yang satu WiFi. Waktu sesi tetap dipantau agent — perangkat dimatikan saat waktunya habis."
          )}
        </p>
      </div>

      {agents.length === 0 && (
        <p className="text-xs text-amber-400">
          {t("devices.local.noAgent", "Butuh NexbillAgent yang berjalan di PC atau HP Android outlet. Hubungi tim NEXBILL untuk aktivasi.")}
        </p>
      )}

      {agents.map((a) => {
        const uncovered = a.uncovered.filter((u) => u.reason !== "other_agent" && u.reason !== "no_device");
        return (
          <div key={a.id} className="space-y-2 rounded-lg border border-neutral-800 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{a.name}</span>
              <Badge status={a.status === "online" ? "success" : "pending"}>
                {a.status === "online" ? t("devices.status.online", "online") : t("devices.status.offline", "offline")}
              </Badge>
              {a.agentVersion && <span className="text-xs text-neutral-500">v{a.agentVersion}</span>}
            </div>

            {!a.supportsLocal ? (
              <p className="text-xs text-amber-400">
                {t(
                  "devices.local.needsUpdate",
                  "Versi NexbillAgent ini belum punya Kontrol Lokal. Perbarui ke versi 1.4: di HP Android jalankan nexbill-update di Termux; di PC Windows unduh NexbillAgent terbaru lalu timpa file lama (token tetap tersimpan)."
                )}
              </p>
            ) : (
              <>
                <div className="grid gap-1 text-xs sm:grid-cols-2">
                  <div>
                    <div className="text-neutral-500">{t("devices.local.pageUrl", "Halaman Kontrol Lokal (buka dari HP/PC di WiFi outlet)")}</div>
                    {a.urls.length ? (
                      a.urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-emerald-300 underline">
                          {url} <ExternalLink size={11} />
                        </a>
                      ))
                    ) : (
                      <span className="text-neutral-400">{t("devices.local.urlUnknown", "Alamat tampil di jendela NexbillAgent")}</span>
                    )}
                  </div>
                  {a.pin && (
                    <div>
                      <div className="text-neutral-500">{t("devices.local.pin", "PIN Kontrol Lokal")}</div>
                      <button className="inline-flex items-center gap-1 font-mono text-base tracking-widest" onClick={() => setShowPin((v) => !v)}>
                        {showPin ? a.pin : "••••••"} {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs">
                  <span className="text-neutral-500">{t("devices.local.covered", "Bisa dikontrol saat offline:")} </span>
                  {a.covered.length ? (
                    a.covered.map((u) => (
                      <span key={u.id} className="mr-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-200">
                        {u.name} · {u.kind === "tasmota" ? t("devices.local.kind.plug", "Smart plug") : t("devices.local.kind.tv", "Android TV")}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-400">{t("devices.local.none", "belum ada")}</span>
                  )}
                </div>
                {uncovered.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {uncovered.map((u) => (
                      <li key={u.id} className="flex flex-wrap items-center gap-2 text-neutral-400">
                        <span>
                          {u.name}: {reasonText(u.reason)}
                        </span>
                        {canManage && u.reason === "no_local_ip" && u.protocol === "tasmota_mqtt" && u.deviceId && (
                          <Button variant="secondary" className="px-2 py-0.5 text-[11px]" disabled={detecting === u.deviceId} onClick={() => void detectIp(u.deviceId!)}>
                            {detecting === u.deviceId ? t("devices.local.detecting", "Mendeteksi...") : t("devices.local.detect", "Deteksi IP otomatis")}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        );
      })}
    </Card>
  );
}
