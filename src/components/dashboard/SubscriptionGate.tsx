"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { useApi } from "@/lib/api/use-api";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-shell";

// i18n key pairs per status — resolved via t() inside the component (hooks can't run at module
// scope, so this can't be a plain STATUS_COPY string map like it used to be).
const STATUS_COPY_KEYS: Record<string, { titleKey: string; titleFallback: string; bodyKey: string; bodyFallback: string }> = {
  trial_expired: {
    titleKey: "subGate.trialExpired.title",
    titleFallback: "Masa Percobaan Berakhir",
    bodyKey: "subGate.trialExpired.body",
    bodyFallback: "Masa percobaan 30 hari NEXBILL sudah berakhir. Selesaikan pembayaran langganan di halaman Langganan untuk membuka akses penuh kembali.",
  },
  pending_payment: {
    titleKey: "subGate.pendingPayment.title",
    titleFallback: "Menunggu Pembayaran",
    bodyKey: "subGate.pendingPayment.body",
    bodyFallback: "Checkout sudah dibuat tapi belum lunas. Selesaikan tagihan di halaman Langganan untuk mengaktifkan akses.",
  },
  suspended: {
    titleKey: "subGate.suspended.title",
    titleFallback: "Langganan Ditangguhkan",
    bodyKey: "subGate.suspended.body",
    bodyFallback: "Masa tenggang (toleransi) pembayaran sudah habis tanpa pelunasan. Selesaikan tagihan di halaman Langganan untuk membuka akses kembali — data outlet-mu tetap aman.",
  },
  cancelled: {
    titleKey: "subGate.cancelled.title",
    titleFallback: "Langganan Dibatalkan",
    bodyKey: "subGate.cancelled.body",
    bodyFallback: "Langganan outlet ini sudah dibatalkan. Berlangganan kembali lewat halaman Langganan untuk membuka akses.",
  },
};

/**
 * Site-wide lock screen: wraps every /dashboard/** page (mounted once in dashboard/layout.tsx,
 * inside <main> so Sidebar/TopBar stay usable for navigation + logout). When the outlet's
 * subscription is in a locked status (trial_expired / pending_payment / suspended / cancelled —
 * see isLockedStatus in lib/subscription/service.ts), every route EXCEPT /dashboard/billing
 * itself renders this dedicated locked page instead of its normal content, with a button
 * straight to the renewal/payment flow. Only Superuser (NEXBILL's own internal/testing account)
 * bypasses this — Owner is the role every real paying merchant uses day to day and must actually
 * be locked out like any other customer once trial/payment lapses (see assertDeviceAllowed in
 * lib/subscription/service.ts for the matching device-limit rule; assertAiAllowed never bypassed
 * either role in the first place).
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { t } = useDashboardLang();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // Was a raw fetch("/api/subscription") in a useEffect keyed on [pathname] — refired on every
  // single dashboard navigation since this component lives once in the persistent layout and
  // never unmounts. Billing and AI pages independently fetch the same endpoint too, so on a
  // typical session this was N redundant round trips to the same data. useApi/SWR shares one
  // cached entry keyed by URL across all of them: `mutate()` below still re-checks on every
  // navigation (same "never go stale" intent as before, and still drives the lazy lifecycle
  // self-heal in getOrCreateSubscription), but a call already in flight or freshly resolved
  // within the dedupingInterval is reused instead of firing a brand new request.
  const { data, mutate } = useApi<{ isLocked: boolean; subscription: { status: string } }>("/api/subscription");
  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  const gate = data?.subscription ? { isLocked: !!data.isLocked, status: data.subscription.status } : null;

  if (user?.role === "superuser") return <>{children}</>;
  if (pathname?.startsWith("/dashboard/billing")) return <>{children}</>;
  // Still loading auth/gate status — render children optimistically rather than flash a lock
  // screen for every paid outlet on every single page load.
  if (authLoading || !gate || !gate.isLocked) return <>{children}</>;

  const copyKeys = STATUS_COPY_KEYS[gate.status] ?? STATUS_COPY_KEYS.suspended;
  const copy = { title: t(copyKeys.titleKey, copyKeys.titleFallback), body: t(copyKeys.bodyKey, copyKeys.bodyFallback) };
  // Which outlet is locked — the owner's spec explicitly asked for the merchant/outlet identity to
  // appear on this screen, not just generic copy (useful when an Owner account is linked to
  // multiple outlets and needs to tell at a glance which one this lockout is for).
  const outletName = user?.linkedOutlets?.find((o) => o.id === user.outletId)?.name ?? null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-rose-400/30 bg-[#0f1426]/80 backdrop-blur-md p-8 text-center space-y-4 shadow-[0_0_40px_-10px_rgba(244,63,94,0.35)]">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-400/30 flex items-center justify-center">
          <Lock size={24} className="text-rose-400" />
        </div>
        {outletName && <p className="text-[11px] text-neutral-500 uppercase tracking-wide">{outletName}</p>}
        <h1 className="text-xl font-bold text-rose-300 gm-display">{copy.title}</h1>
        <p className="text-sm text-neutral-400">{copy.body}</p>
        <Button className="w-full" onClick={() => router.push("/dashboard/billing")}>
          {t("subGate.renewNow", "Perpanjang / Bayar Sekarang")}
        </Button>
        <p className="text-[11px] text-neutral-600">{t("subGate.footerNote", "Data outlet-mu aman dan tidak hilang — semua fitur terbuka otomatis begitu pembayaran diterima.")}</p>
      </div>
    </div>
  );
}
