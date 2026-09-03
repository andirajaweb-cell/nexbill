"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, UtensilsCrossed, Gamepad2 } from "lucide-react";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing-board";

interface BoardRow {
  sessionId: string;
  unitId: string;
  unitName: string;
  consoleType: string;
  status: "running" | "paused";
  customerName: string;
  gameName: string | null;
  startedAt: string;
  accumulatedPauseMs: number;
  extendedMinutes: number;
  ratePerHour: number;
  rentalEstimate: number;
  fnbSubtotal: number;
  fnbItemCount: number;
  accessoryEstimate: number;
  accessoryCount: number;
  runningTotal: number;
  billId: string | null;
  billStatus: string | null;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

function LiveTimer({ startedAt, accumulatedPauseMs, paused }: { startedAt: string; accumulatedPauseMs: number; paused: boolean }) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    const tick = () => {
      const diff = Date.now() - new Date(startedAt).getTime() - accumulatedPauseMs;
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    if (paused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, accumulatedPauseMs, paused]);
  return <span className={`font-mono text-2xl font-semibold tabular-nums ${paused ? "text-amber-400" : "text-emerald-400"}`}>{elapsed}</span>;
}

export default function BillingBoardPage() {
  const { t } = useDashboardLang();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = (id: string) => {
    fetchJsonArray<BoardRow>(`/api/billing-board?outletId=${id}`).then((data) => {
      setRows(data);
      setLastUpdated(new Date());
    });
  };

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (!outlet) return;
    setOutletId(outlet.id);
    load(outlet.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  useEffect(() => {
    if (!outletId) return;
    const id = setInterval(() => load(outletId), 3000);
    return () => clearInterval(id);
  }, [outletId]);

  const totalRunning = rows.reduce((s, r) => s + r.runningTotal, 0);
  const totalFnbItems = rows.reduce((s, r) => s + r.fnbItemCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("billingBoard.title", "Live Billing Board")}</h1>
          <p className="text-sm text-neutral-500">{t("billingBoard.subtitle", "Semua sesi PS aktif, timer, dan bill berjalan dalam satu layar. Auto-refresh setiap 3 detik.")}</p>
        </div>
        <div className="text-xs text-neutral-500">
          {lastUpdated ? t("billingBoard.updatedAt", "Diperbarui {time}").replace("{time}", lastUpdated.toLocaleTimeString("id-ID")) : t("billingBoard.loading", "Memuat...")}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center py-3">
          <div className="text-2xl font-semibold">{rows.length}</div>
          <div className="text-xs text-neutral-500">{t("billingBoard.activeSessions", "Sesi Aktif")}</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-semibold">{rows.filter((r) => r.status === "running").length}</div>
          <div className="text-xs text-neutral-500">{t("billingBoard.playingStat", "Sedang Bermain")}</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-semibold">{totalFnbItems}</div>
          <div className="text-xs text-neutral-500">{t("billingBoard.fnbOrdersRunning", "Order F&B Berjalan")}</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-semibold">{rupiah(totalRunning)}</div>
          <div className="text-xs text-neutral-500">{t("billingBoard.totalRunningBill", "Total Bill Berjalan")}</div>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">{t("billingBoard.noActiveSessions", "Tidak ada sesi rental yang sedang aktif.")}</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Card key={r.sessionId} className={`space-y-3 ${r.status === "paused" ? "border-amber-500/40" : "border-emerald-500/30"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.unitName}</div>
                  <div className="text-xs text-neutral-500 uppercase">{r.consoleType}</div>
                </div>
                <Badge status={r.status === "paused" ? "pending" : "success"}>{r.status === "paused" ? t("billingBoard.statusPaused", "Jeda") : t("billingBoard.statusPlaying", "Bermain")}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{r.customerName}</div>
                  {r.gameName && (
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <Gamepad2 size={12} /> {r.gameName}
                    </div>
                  )}
                </div>
                <LiveTimer startedAt={r.startedAt} accumulatedPauseMs={r.accumulatedPauseMs} paused={r.status === "paused"} />
              </div>

              {r.extendedMinutes > 0 && (
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Clock size={10} /> {t("billingBoard.extendMinutes", "+{n} menit extend").replace("{n}", String(r.extendedMinutes))}
                </div>
              )}

              <div className="rounded-lg bg-neutral-800/60 px-3 py-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("billingBoard.rentalEstimate", "Estimasi Rental ({rate}/jam)").replace("{rate}", rupiah(r.ratePerHour))}</span>
                  <span>{rupiah(r.rentalEstimate)}</span>
                </div>
                {r.accessoryCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500 flex items-center gap-1">
                      <Gamepad2 size={12} /> {t("billingBoard.accessories", "Aksesoris ({n})").replace("{n}", String(r.accessoryCount))}
                    </span>
                    <span>{rupiah(r.accessoryEstimate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500 flex items-center gap-1">
                    <UtensilsCrossed size={12} /> {t("billingBoard.fnbItems", "F&B ({n} item)").replace("{n}", String(r.fnbItemCount))}
                  </span>
                  <span>{rupiah(r.fnbSubtotal)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-neutral-700 text-sm">
                  <span>{t("billingBoard.runningBill", "Bill Berjalan")}</span>
                  <span>{rupiah(r.runningTotal)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
