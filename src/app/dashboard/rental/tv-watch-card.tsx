"use client";
import { useState } from "react";
import { AlertTriangle, MonitorPlay } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/api/use-api";
import { usePollingWhenVisible } from "@/lib/api/use-polling";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { DATE_LOCALE, useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-tv-watch";

/**
 * Pengawasan NEXBILL TV (lib/tv/tv-watch.ts): sesi yang diatur kasir di TV tapi DITOLAK dashboard
 * (dimainkan, belum tertagih) dan pemakaian mode staf/tes 10 menit. Hanya tampil bila ada isinya.
 */

interface Failed {
  id: string;
  kind: string;
  occurredAt: string;
  device: string;
  error: string | null;
  plannedMinutes: number | null;
  minutes: number | null;
}
interface StaffTest {
  id: string;
  occurredAt: string;
  device: string;
  minutes: number;
}
interface WatchData {
  failed: Failed[];
  staffTests: StaffTest[];
  canReview: boolean;
}

const WEEK_MS = 7 * 86400000;

export function TvWatchCard() {
  const { t, lang } = useDashboardLang();
  const { data, mutate } = useApi<WatchData>("/api/tv/watch");
  usePollingWhenVisible(() => {
    void mutate();
  }, 60_000);
  const [busy, setBusy] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);
  if (!data) return null;
  const recentTests = data.staffTests.filter((s) => Date.now() - Date.parse(s.occurredAt) < WEEK_MS);
  if (data.failed.length === 0 && recentTests.length === 0) return null;
  const fmt = new Intl.DateTimeFormat(DATE_LOCALE[lang], { dateStyle: "medium", timeStyle: "short" });

  const kindLabel = (f: Failed) => {
    if (f.kind === "start") return f.plannedMinutes ? t("tvWatch.kind.startFor", "Mulai sesi {n} menit").replace("{n}", String(f.plannedMinutes)) : t("tvWatch.kind.startOpen", "Mulai sesi bebas");
    if (f.kind === "extend") return t("tvWatch.kind.extend", "Tambah waktu {n} menit").replace("{n}", String(f.minutes ?? 0));
    if (f.kind === "stop") return t("tvWatch.kind.stop", "Akhiri sesi");
    return f.kind;
  };

  const review = async (id: string) => {
    if (!(await showConfirm(t("tvWatch.reviewConfirm", "Tandai sudah ditangani? Pastikan sesinya sudah dicatat (mis. lewat Mulai Sesi di halaman ini) supaya tertagih.")))) return;
    setBusy(id);
    try {
      const res = await fetch("/api/tv/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(body.error ?? t("tvWatch.reviewFailed", "Gagal menyimpan."));
      await mutate();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="space-y-3 border-red-500/40">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
          <MonitorPlay size={18} />
        </div>
        <div>
          <h2 className="font-medium">{t("tvWatch.title", "Pengawasan NEXBILL TV")}</h2>
          <p className="text-xs text-neutral-500">{t("tvWatch.desc", "Sesi yang diatur kasir di TV tapi ditolak dashboard, dan pemakaian mode staf (tes) di TV.")}</p>
        </div>
      </div>

      {data.failed.length > 0 && (
        <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-200">
            <AlertTriangle size={15} /> {t("tvWatch.failedTitle", "{n} aksi dari TV belum tercatat — sesi ini dimainkan tapi BELUM tertagih").replace("{n}", String(data.failed.length))}
          </div>
          <div className="divide-y divide-red-500/10 text-xs">
            {data.failed.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="font-medium text-neutral-100">
                    {f.device} · {kindLabel(f)}
                  </div>
                  <div className="text-neutral-400">{fmt.format(new Date(f.occurredAt))}</div>
                  {f.error && <div className="text-red-300">{f.error}</div>}
                </div>
                {data.canReview && (
                  <Button variant="secondary" className="px-2 py-1 text-xs" disabled={busy === f.id} onClick={() => review(f.id)}>
                    {t("tvWatch.reviewButton", "Tandai sudah ditangani")}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500">{t("tvWatch.failedHelp", "Catat sesinya lewat Mulai Sesi (atau ubah sesi yang ada), lalu tandai sudah ditangani. Daftar ini juga terlihat di TV pada menu Status sinkron.")}</p>
        </div>
      )}

      {recentTests.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <button type="button" className="text-left font-medium text-amber-200" onClick={() => setShowTests((v) => !v)}>
            {t("tvWatch.testsTitle", "Mode staf (tes, tidak ditagih) dibuka {n} kali dalam 7 hari").replace("{n}", String(recentTests.length))}
          </button>
          {showTests && (
            <ul className="space-y-0.5 text-neutral-300">
              {recentTests.slice(0, 20).map((s) => (
                <li key={s.id}>
                  {fmt.format(new Date(s.occurredAt))} · {s.device} · {t("tvWatch.minutes", "{n} menit").replace("{n}", String(s.minutes))}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-neutral-500">{t("tvWatch.testsHelp", "Mode staf membuka layar game tanpa sesi dan tanpa tagihan (maksimal 3 kali per TV per hari). Bila sering terjadi di jam ramai, periksa siapa yang memegang PIN layar.")}</p>
        </div>
      )}
    </Card>
  );
}
