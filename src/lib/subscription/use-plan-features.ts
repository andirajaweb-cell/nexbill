"use client";
import { useAuth } from "@/lib/auth/client";
import { useApi } from "@/lib/api/use-api";
import type { PlanFeature } from "./pricing";

/**
 * Fitur paket outlet ini di sisi klien (data /api/subscription, dibagi lewat SWR dengan Sidebar dan
 * PlanFeatureGate — tidak ada request tambahan). `has()` bernilai true selama data belum dimuat dan
 * untuk Superuser: kunci di layar hanya penjelasan, penegakan sebenarnya ada di server.
 */
export function usePlanFeatures() {
  const { user } = useAuth();
  const { data } = useApi<{ entitlements?: { features: PlanFeature[] }; isLocked?: boolean }>(user ? "/api/subscription" : null);
  const features = data?.entitlements?.features ?? null;
  const superuser = user?.role === "superuser";
  return {
    loaded: features !== null,
    has: (f: PlanFeature) => superuser || features === null || features.includes(f),
  };
}
