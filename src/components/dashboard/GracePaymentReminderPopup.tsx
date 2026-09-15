"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { useApi } from "@/lib/api/use-api";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-shell";

interface SubscriptionSnapshot {
  subscription: { id: string; status: string; currentPeriodEnd: string | null; graceUntil: string | null };
  graceReminderKey: string | null;
  graceReminderDismissedToday: boolean;
}

/**
 * Daily payment-due reminder shown throughout the "Masa Tenggang" (grace) window — explicit spec
 * (2026-09-13): once access enters grace (unpaid past currentPeriodEnd, up to RENEWAL_GRACE_DAYS =
 * 7 days before full lockout — see subscription/config.ts), show a popup once per calendar day
 * with exactly two choices: "Nanti Dulu" (dismiss for today only — reappears tomorrow if still
 * unpaid) or "Bayar Sekarang" (straight to checkout). Deliberately distinct from:
 *  - AnnouncementPopup.tsx: platform-broadcast announcements, unrelated to billing.
 *  - The bell notification's `subscription:{id}:grace` item (lib/notifications/index.ts): a
 *    single dismiss-once item, which would never come back after the first click — wrong for a
 *    "remind every day" requirement.
 *  - SubscriptionGate.tsx: only renders once grace has expired into "suspended" (a locked status)
 *    and blocks the whole app; this popup renders ON TOP of a still-fully-usable app during grace
 *    itself, since "grace" is deliberately not in LOCKED_STATUSES.
 * The dismiss key is date-scoped server-side (see /api/subscription's graceReminderKey), so this
 * component doesn't need its own date math for "have I shown this today" — it just trusts
 * graceReminderDismissedToday from the API, which is the source of truth across devices/tabs.
 */
export function GracePaymentReminderPopup() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const router = useRouter();
  const { data, mutate } = useApi<SubscriptionSnapshot>(user && user.role !== "superuser" ? "/api/subscription" : null);
  const [dismissing, setDismissing] = useState<"later" | "pay" | null>(null);
  const [hiddenLocally, setHiddenLocally] = useState(false);

  const sub = data?.subscription;
  const shouldShow = !!sub && sub.status === "grace" && !!data?.graceReminderKey && !data?.graceReminderDismissedToday && !hiddenLocally;
  if (!shouldShow || !sub) return null;

  const graceUntil = sub.graceUntil ? new Date(sub.graceUntil) : null;
  const daysLeft = graceUntil ? Math.max(0, Math.ceil((graceUntil.getTime() - Date.now()) / 86_400_000)) : null;
  const outletName = user?.linkedOutlets?.find((o) => o.id === user.outletId)?.name ?? t("gracePay.yourOutletFallback", "outlet Anda");

  const dismiss = async (choice: "later" | "pay") => {
    setDismissing(choice);
    try {
      if (data?.graceReminderKey) {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: data.graceReminderKey }),
        });
      }
      setHiddenLocally(true);
      mutate();
      if (choice === "pay") router.push("/dashboard/billing");
    } finally {
      setDismissing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0b0f1e] shadow-2xl overflow-hidden">
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 flex items-center gap-1">
              <AlertTriangle size={11} /> {t("gracePay.badge", "Masa Tenggang")}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">{t("gracePay.header", "Pengingat Pembayaran NEXBILL")}</span>
          </div>
          <h2 className="text-base font-semibold text-neutral-100">{t("gracePay.title", "Tagihan langganan {outlet} belum lunas").replace("{outlet}", outletName)}</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {t("gracePay.bodyIntro", "Periode langganan sudah berakhir dan tagihan perpanjangan belum dibayar.")}{" "}
            {daysLeft !== null && daysLeft > 0
              ? t("gracePay.daysLeft", "Kamu masih punya masa tenggang {n} hari lagi sebelum akses NEXBILL dikunci sepenuhnya.").replace("{n}", String(daysLeft))
              : t("gracePay.expiringSoon", "Masa tenggang akan segera habis — akses NEXBILL bisa dikunci sepenuhnya kapan saja.")}{" "}
            {t("gracePay.resolveHint", "Selesaikan pembayaran kapan saja di halaman Langganan supaya akses tidak terganggu.")}
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => dismiss("later")} disabled={dismissing !== null}>
              {dismissing === "later" ? "..." : t("gracePay.later", "Nanti Dulu")}
            </Button>
            <Button onClick={() => dismiss("pay")} disabled={dismissing !== null}>
              {dismissing === "pay" ? "..." : t("gracePay.payNow", "Bayar Sekarang")}
            </Button>
          </div>
          <p className="text-[11px] text-neutral-600">{t("gracePay.footerNote", "Pengingat ini muncul sekali sehari selama tagihan belum lunas. Data outlet-mu tetap aman.")}</p>
        </div>
      </div>
    </div>
  );
}
