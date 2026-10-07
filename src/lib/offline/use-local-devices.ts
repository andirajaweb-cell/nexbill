"use client";
import { useEffect, useRef, useState } from "react";
import type { OfflineLocalControl } from "@/lib/relay/local-control";
import type { LocalUnit } from "./engine";
import { planDeviceCommands, sendAgentCommand, sentDevicesKey, type SentDeviceState } from "./local-devices";

export type DeviceSyncStatus = { state: "ok" } | { state: "failed"; message: string | null };

const RETRY_MS = 15_000;

function loadSent(outletId: string | null): Record<string, SentDeviceState> {
  if (!outletId) return {};
  try {
    return JSON.parse(localStorage.getItem(sentDevicesKey(outletId)) ?? "{}") as Record<string, SentDeviceState>;
  } catch {
    return {};
  }
}

/**
 * Menyelaraskan TV/plug tiap unit dengan papan kasir offline lewat NexbillAgent di LAN (lihat
 * planDeviceCommands). Yang sudah terkirim disimpan per outlet, jadi memuat ulang halaman tidak
 * menyalakan ulang TV. Kegagalan dicoba lagi tiap 15 detik dan ditampilkan di kartu unit.
 */
export function useLocalDeviceSync(outletId: string | null, lc: OfflineLocalControl | undefined, units: LocalUnit[] | null, nowMs: number) {
  const sent = useRef<Record<string, SentDeviceState> | null>(null);
  const inflight = useRef(new Set<string>());
  const lastTry = useRef<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, DeviceSyncStatus>>({});

  useEffect(() => {
    if (!outletId || !lc || !units) return;
    if (sent.current === null) sent.current = loadSent(outletId);
    const current = sent.current;
    for (const plan of planDeviceCommands(units, current, lc.units, nowMs)) {
      if (inflight.current.has(plan.unitId)) continue;
      if (nowMs - (lastTry.current[plan.unitId] ?? 0) < RETRY_MS) continue;
      inflight.current.add(plan.unitId);
      lastTry.current[plan.unitId] = nowMs;
      void sendAgentCommand(lc, plan.unitId, plan.body).then((r) => {
        inflight.current.delete(plan.unitId);
        if (r.ok) {
          current[plan.unitId] = plan.next;
          lastTry.current[plan.unitId] = 0;
          try {
            localStorage.setItem(sentDevicesKey(outletId), JSON.stringify(current));
          } catch {
            /* tanpa penyimpanan: paling buruk perintah yang sama dikirim ulang setelah reload */
          }
          setStatus((s) => ({ ...s, [plan.unitId]: { state: "ok" } }));
        } else {
          setStatus((s) => ({ ...s, [plan.unitId]: { state: "failed", message: r.reason === "rejected" ? r.message ?? null : null } }));
        }
      });
    }
  }, [outletId, lc, units, nowMs]);

  return status;
}
