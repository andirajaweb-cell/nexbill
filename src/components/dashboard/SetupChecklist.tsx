"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/lib/api/use-api";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import type { Checklist } from "@/lib/onboarding/checklist";
import "@/lib/i18n/dict-setup";

type Resp = (Checklist & { outletId: string; hidden?: false }) | { hidden: true };

const storageKey = (outletId: string) => `nexbill.setupChecklist.hidden.${outletId}`;

/**
 * Daftar "Siap Buka Outlet" di atas Ringkasan. Langkahnya tercentang sendiri dari data outlet
 * (lib/onboarding/checklist.ts), tiap langkah punya tombol "Kerjakan" yang langsung membuka layar
 * yang tepat. Hanya untuk pemilik/manajer (API mengembalikan hidden untuk peran lain). Hilang sendiri
 * setelah semua selesai; setelah langkah wajib selesai, daftar dilipat dan bisa disembunyikan.
 */
export function SetupChecklist() {
  const { t } = useDashboardLang();
  const { data } = useApi<Resp>("/api/onboarding/checklist", { refreshInterval: 60000 });
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);

  const outletId = data && !data.hidden ? data.outletId : null;
  useEffect(() => {
    if (!outletId) return;
    try {
      setHidden(localStorage.getItem(storageKey(outletId)) === "1");
    } catch {
      setHidden(false);
    }
  }, [outletId]);

  if (!data || data.hidden || data.allDone || hidden === null) return null;

  const toggleHidden = (v: boolean) => {
    setHidden(v);
    try {
      if (v) localStorage.setItem(storageKey(data.outletId), "1");
      else localStorage.removeItem(storageKey(data.outletId));
    } catch {
      /* penyimpanan tidak tersedia — cukup untuk sesi ini */
    }
  };

  if (hidden) {
    return (
      <button type="button" onClick={() => toggleHidden(false)} className="text-xs text-cyan-300 hover:underline">
        {t("setup.checklist.show", "Tampilkan daftar persiapan outlet")} ({data.done}/{data.total})
      </button>
    );
  }

  const expanded = open ?? !data.allRequiredDone;
  const pct = Math.round((data.done / data.total) * 100);
  const requiredLeft = data.requiredTotal - data.requiredDone;

  return (
    <Card className="space-y-3 border border-cyan-500/25">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
            <Rocket size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="gm-heading font-semibold">{t("setup.checklist.title", "Siap Buka Outlet")}</h2>
            <p className="text-xs text-neutral-500">
              {data.allRequiredDone
                ? t("setup.checklist.ready", "Outlet siap dipakai — langkah yang tersisa opsional.")
                : t("setup.checklist.subtitle", "Langkah persiapan ini tercentang sendiri begitu dikerjakan.")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.allRequiredDone && (
            <button type="button" onClick={() => toggleHidden(true)} className="text-xs text-neutral-500 hover:text-neutral-300">
              {t("setup.checklist.hide", "Sembunyikan")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(!expanded)}
            aria-expanded={expanded}
            className="rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:text-neutral-100"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>
            {t("setup.checklist.progress", "{done} dari {total} selesai").replace("{done}", String(data.done)).replace("{total}", String(data.total))}
          </span>
          {requiredLeft > 0 && (
            <span className="text-amber-300">{t("setup.checklist.requiredLeft", "{n} langkah wajib lagi").replace("{n}", String(requiredLeft))}</span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {expanded && (
        <ol className="space-y-1.5">
          {data.items.map((item) => (
            <li
              key={item.key}
              className={`flex items-start gap-3 rounded-xl border p-2.5 ${item.done ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.02]"}`}
            >
              <div className="pt-0.5">
                {item.done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} className="text-neutral-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${item.done ? "text-neutral-500 line-through" : "text-neutral-100"}`}>
                  {t(`setup.item.${item.key}.title`)}
                  {!item.required && (
                    <span className="ml-2 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-normal text-neutral-500 no-underline">
                      {t("setup.checklist.optional", "opsional")}
                    </span>
                  )}
                </div>
                {!item.done && <p className="text-xs text-neutral-500">{t(`setup.item.${item.key}.desc`)}</p>}
              </div>
              {!item.done && (
                <Link
                  href={item.href}
                  className="shrink-0 rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
                >
                  {t("setup.checklist.doIt", "Kerjakan")}
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}

      {expanded && (
        <Link href="/dashboard/help" className="inline-block text-xs text-neutral-500 hover:text-cyan-300">
          {t("setup.checklist.guide", "Panduan lengkap")} →
        </Link>
      )}
    </Card>
  );
}
