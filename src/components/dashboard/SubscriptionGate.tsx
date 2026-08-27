"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  trial_expired: {
    title: "Masa Percobaan Berakhir",
    body: "Masa percobaan 30 hari NEXBILL sudah berakhir. Selesaikan pembayaran langganan di halaman Langganan untuk membuka akses penuh kembali.",
  },
  pending_payment: {
    title: "Menunggu Pembayaran",
    body: "Checkout sudah dibuat tapi belum lunas. Selesaikan tagihan di halaman Langganan untuk mengaktifkan akses.",
  },
  suspended: {
    title: "Langganan Ditangguhkan",
    body: "Masa tenggang (toleransi) pembayaran sudah habis tanpa pelunasan. Selesaikan tagihan di halaman Langganan untuk membuka akses kembali — data outlet-mu tetap aman.",
  },
  cancelled: {
    title: "Langganan Dibatalkan",
    body: "Langganan outlet ini sudah dibatalkan. Berlangganan kembali lewat halaman Langganan untuk membuka akses.",
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
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [gate, setGate] = useState<{ isLocked: boolean; status: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.subscription) return;
        setGate({ isLocked: !!data.isLocked, status: data.subscription.status });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Re-check on every navigation — cheap enough at this app's scale, and it also drives the
    // lazy lifecycle self-heal in getOrCreateSubscription so status never goes stale between visits.
  }, [pathname]);

  if (user?.role === "superuser") return <>{children}</>;
  if (pathname?.startsWith("/dashboard/billing")) return <>{children}</>;
  // Still loading auth/gate status — render children optimistically rather than flash a lock
  // screen for every paid outlet on every single page load.
  if (authLoading || !gate || !gate.isLocked) return <>{children}</>;

  const copy = STATUS_COPY[gate.status] ?? STATUS_COPY.suspended;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-rose-400/30 bg-[#0f1426]/80 backdrop-blur-md p-8 text-center space-y-4 shadow-[0_0_40px_-10px_rgba(244,63,94,0.35)]">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-400/30 flex items-center justify-center">
          <Lock size={24} className="text-rose-400" />
        </div>
        <h1 className="text-xl font-bold text-rose-300 gm-display">{copy.title}</h1>
        <p className="text-sm text-neutral-400">{copy.body}</p>
        <Button className="w-full" onClick={() => router.push("/dashboard/billing")}>
          Perpanjang / Bayar Sekarang
        </Button>
        <p className="text-[11px] text-neutral-600">Data outlet-mu aman dan tidak hilang — semua fitur terbuka otomatis begitu pembayaran diterima.</p>
      </div>
    </div>
  );
}
