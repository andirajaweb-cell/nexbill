"use client";
import Link from "next/link";
import { MonitorPlay } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-shell";

/** Pita di atas dashboard saat login dengan akun demo publik (kredensialnya ada di nexbill.id). */
export function DemoAccountBanner() {
  const { user } = useAuth();
  const { t } = useDashboardLang();
  if (!user?.isDemo) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
      <MonitorPlay size={15} className="shrink-0 text-cyan-300" />
      <span className="flex-1 min-w-[200px]">
        {t("demo.banner", "Anda memakai AKUN DEMO publik — dipakai bersama banyak orang. Jangan masukkan data asli; data bisa berubah atau direset sewaktu-waktu. Password & data akun tidak bisa diubah.")}
      </span>
      <Link href="/daftar" className="rounded-lg bg-cyan-500 px-3 py-1 font-semibold text-neutral-950 hover:bg-cyan-400">
        {t("demo.bannerCta", "Daftar gratis")}
      </Link>
    </div>
  );
}
