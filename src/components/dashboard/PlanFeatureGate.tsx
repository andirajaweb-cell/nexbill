"use client";
import { usePathname, useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useApi } from "@/lib/api/use-api";
import { Button } from "@/components/ui/Button";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { featureForDashboardPath, type PlanFeature } from "@/lib/subscription/pricing";
import "@/lib/i18n/dict-plan";

/**
 * Kunci halaman per paket (struktur harga 2026-10): halaman modul Pro (Akuntansi, Pengeluaran,
 * Pendapatan Lain, Aset, PPOB, Rental ke Rumah, Semua Outlet) menampilkan kartu upgrade untuk
 * outlet paket Starter. Penegakan sebenarnya ada di server (getSession + header dari middleware);
 * ini hanya supaya pengguna melihat penjelasan yang jelas, bukan deretan error. Trial,
 * free_forever, Pro, dan Superuser tidak pernah melihat ini. Data /api/subscription dibagi lewat
 * SWR dengan SubscriptionGate/Sidebar — tidak ada request tambahan.
 */
export function PlanFeatureGate({ children }: { children: React.ReactNode }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useApi<{ entitlements?: { features: PlanFeature[] }; isLocked?: boolean }>(user ? "/api/subscription" : null);

  const feature = pathname ? featureForDashboardPath(pathname) : null;
  if (!feature || user?.role === "superuser") return <>{children}</>;
  const features = data?.entitlements?.features;
  // Belum dimuat / status terkunci (sudah ditangani SubscriptionGate) → jangan tampilkan apa-apa ekstra.
  if (!features || data?.isLocked || features.includes(feature)) return <>{children}</>;

  const featureLabel = t(`plan.feature.${feature}`, feature);
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-amber-400/30 bg-[#0f1426]/80 backdrop-blur-md p-8 text-center space-y-4 shadow-[0_0_40px_-10px_rgba(251,191,36,0.35)]">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center">
          <Crown size={24} className="text-amber-300" />
        </div>
        <h1 className="text-xl font-bold text-amber-200 gm-display">{t("planGate.title", "Fitur Paket Pro")}</h1>
        <p className="text-sm text-neutral-400">{t("planGate.body", "{feature} termasuk paket NEXBILL Pro.").replace("{feature}", featureLabel)}</p>
        <Button className="w-full" onClick={() => router.push("/dashboard/billing")}>
          {t("planGate.upgrade", "Lihat Paket & Upgrade")}
        </Button>
        <p className="text-[11px] text-neutral-600">{t("planGate.dataSafe", "Data penjualan tetap tercatat — semuanya langsung terbuka begitu upgrade.")}</p>
      </div>
    </div>
  );
}
