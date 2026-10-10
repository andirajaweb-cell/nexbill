"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { useApi } from "@/lib/api/use-api";
import { featureForDashboardPath, type PlanFeature } from "@/lib/subscription/pricing";
import { LockedFeaturePreview } from "./LockedFeaturePreview";

/**
 * Kunci halaman per paket. Halaman modul Pro (Aset, PPOB, Pendapatan Lain, Semua Outlet) tetap
 * TERLIHAT oleh outlet Starter, tapi isinya diganti pratinjau terkunci: contoh layar yang
 * diburamkan, manfaatnya, dan tombol upgrade (LockedFeaturePreview). Halaman Akuntansi terbuka
 * untuk Starter (Laba Rugi ringkas) dan mengunci tab lainnya sendiri.
 *
 * Penegakan sebenarnya ada di server (getSession + header dari middleware); ini hanya supaya
 * pengguna melihat penjelasan yang jelas, bukan deretan error. Trial, free_forever, Pro, dan
 * Superuser tidak pernah melihat ini. Data /api/subscription dibagi lewat SWR dengan
 * SubscriptionGate/Sidebar — tidak ada request tambahan.
 */
export function PlanFeatureGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { data } = useApi<{ entitlements?: { features: PlanFeature[] }; isLocked?: boolean }>(user ? "/api/subscription" : null);

  const feature = pathname ? featureForDashboardPath(pathname) : null;
  if (!feature || user?.role === "superuser") return <>{children}</>;
  const features = data?.entitlements?.features;
  // Belum dimuat / status terkunci (sudah ditangani SubscriptionGate) → jangan tampilkan apa-apa ekstra.
  if (!features || data?.isLocked || features.includes(feature)) return <>{children}</>;

  return <LockedFeaturePreview feature={feature} />;
}
