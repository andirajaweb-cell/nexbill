"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getConnectivity, startConnectivityMonitor, subscribeConnectivity } from "./connectivity";
import { isSyncing, subscribeSyncing } from "./sync-client";
import { OFFLINE_CHANGE_EVENT, getQueue, getSnapshot, getSyncReport, type QueuedAction, type SyncReport } from "./store";
import type { OfflineSnapshot } from "./engine";

/** Online/offline menurut ping aktif (lihat connectivity.ts). Render server: selalu online. */
export function useConnectivity(): boolean {
  useEffect(() => startConnectivityMonitor(), []);
  return useSyncExternalStore(subscribeConnectivity, () => getConnectivity().online, () => true);
}

export function useSyncing(): boolean {
  return useSyncExternalStore(subscribeSyncing, isSyncing, () => false);
}

interface OfflineData {
  queue: QueuedAction[];
  snapshot: OfflineSnapshot | null;
  report: SyncReport | null;
}

/** Antrean, snapshot, dan laporan sinkron untuk outlet ini; ikut berubah saat tab lain mengubahnya. */
export function useOfflineData(outletId: string | null): OfflineData {
  const [data, setData] = useState<OfflineData>({ queue: [], snapshot: null, report: null });
  useEffect(() => {
    if (!outletId) return;
    const reload = () => setData({ queue: getQueue(outletId), snapshot: getSnapshot(outletId), report: getSyncReport(outletId) });
    reload();
    window.addEventListener(OFFLINE_CHANGE_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(OFFLINE_CHANGE_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [outletId]);
  return data;
}
