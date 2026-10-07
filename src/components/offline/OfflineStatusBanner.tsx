"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-offline";
import { useConnectivity, useOfflineData, useSyncing } from "@/lib/offline/hooks";
import { refreshSnapshot, syncQueue, type SyncOutcome } from "@/lib/offline/sync-client";
import { getLastOutletId, saveSyncReport, setLastOutletId, type SyncReportNote } from "@/lib/offline/store";
import { useCurrency } from "@/lib/currency/client";

const SNAPSHOT_REFRESH_MS = 60_000;
const RETRY_FAILED_MS = 5 * 60_000;

/** Catatan hasil sinkron (lihat SyncNoteCode di lib/offline/protocol.ts) dalam bahasa dashboard. */
function noteText(n: SyncReportNote, t: (key: string, fallback: string) => string, formatMoney: (amount: number) => string): string {
  const amount = formatMoney(n.amount ?? 0);
  switch (n.code) {
    case "reopened":
      return t("offline.note.reopened", "Sesi dibuka kembali: server sempat menghentikannya otomatis saat outlet offline.");
    case "alreadyStopped":
      return t("offline.note.alreadyStopped", "Sesi sudah dihentikan otomatis oleh server saat outlet offline.");
    case "alreadyPaid":
      return t("offline.note.alreadyPaid", "Tagihan sudah lunas di server — uang tunai {amount} perlu dicek di laci.").replace("{amount}", amount);
    case "overpaid":
      return t("offline.note.overpaid", "Uang diterima melebihi tagihan final — kelebihan {amount} adalah kembalian.").replace("{amount}", amount);
    case "underpaid":
      return t("offline.note.underpaid", "Tagihan final lebih besar {amount} dari uang yang diterima — sisanya menunggu pelunasan.").replace("{amount}", amount);
    default:
      return n.note;
  }
}

/**
 * Pengelola Mode Offline untuk seluruh dashboard (dipasang sekali di layout):
 *  - menampilkan status: internet putus / mengirim transaksi offline / ada yang perlu ditinjau;
 *  - selama online: memperbarui snapshot data offline tiap menit (hanya bila antrean kosong, supaya
 *    snapshot tidak pernah memuat sebagian aksi yang masih antre), dan mengirim antrean otomatis
 *    begitu koneksi kembali — dari halaman mana pun, bukan hanya halaman Rental.
 */
export function OfflineStatusBanner() {
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const { formatMoney } = useCurrency();
  const pathname = usePathname();
  const online = useConnectivity();
  const syncing = useSyncing();
  const outletId = user?.outletId ?? getLastOutletId();
  const { queue, report } = useOfflineData(outletId);
  const pending = queue.filter((q) => !q.error).length;
  const failed = queue.length - pending;
  const [lastOutcome, setLastOutcome] = useState<SyncOutcome | null>(null);

  useEffect(() => {
    if (user?.outletId) setLastOutletId(user.outletId);
  }, [user?.outletId]);

  // Make sure the offline cashier page (+ its JS/CSS) is saved on this device by the service
  // worker, even if the cashier hasn't opened it since the worker was installed. At most every 30 min.
  useEffect(() => {
    if (!online || !user?.outletId || typeof navigator === "undefined" || !navigator.serviceWorker) return;
    try {
      const last = Number(window.sessionStorage.getItem("nexbill_offline_warm") ?? 0);
      if (Date.now() - last < 30 * 60_000) return;
      window.sessionStorage.setItem("nexbill_offline_warm", String(Date.now()));
    } catch {
      // sessionStorage blocked — warm anyway
    }
    navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "warm", urls: ["/dashboard/rental"] })).catch(() => undefined);
  }, [online, user?.outletId]);

  // Keep the offline snapshot fresh while online and nothing is queued.
  useEffect(() => {
    if (!online || !user?.outletId || queue.length > 0) return;
    void refreshSnapshot();
    const id = window.setInterval(() => void refreshSnapshot(), SNAPSHOT_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [online, user?.outletId, queue.length]);

  // Send the queue as soon as we're online; failed actions are retried every few minutes.
  useEffect(() => {
    if (!online || !user?.outletId || queue.length === 0) return;
    const oid = user.outletId;
    const run = () =>
      syncQueue(oid).then((outcome) => {
        setLastOutcome(outcome);
        if (outcome.status === "ok") void refreshSnapshot();
      });
    if (pending > 0) void run();
    const id = window.setInterval(() => void run(), RETRY_FAILED_MS);
    return () => window.clearInterval(id);
  }, [online, user?.outletId, pending, queue.length]);

  const onRental = pathname?.startsWith("/dashboard/rental");

  if (!online) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        <WifiOff size={16} />
        <span>{t("offline.banner.offline", "Internet terputus — Mode Offline aktif. Transaksi rental disimpan di perangkat ini dan dikirim otomatis saat online.")}</span>
        {queue.length > 0 && <span className="text-xs text-amber-300/80">{t("offline.queued", "{n} transaksi menunggu dikirim").replace("{n}", String(queue.length))}</span>}
        {!onRental && (
          <Link href="/dashboard/rental" className="ml-auto rounded-md bg-amber-500/20 px-2 py-1 text-xs font-medium hover:bg-amber-500/30">
            {t("offline.banner.openRental", "Buka Kasir Rental (Offline)")}
          </Link>
        )}
      </div>
    );
  }

  if (!syncing && pending > 0 && (lastOutcome?.status === "unauthorized" || lastOutcome?.status === "error")) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        <AlertTriangle size={16} />
        <span>
          {lastOutcome.status === "unauthorized"
            ? t("offline.banner.loginAgain", "Sesi login berakhir — login lagi di perangkat ini untuk mengirim {n} transaksi offline (datanya tetap aman tersimpan).").replace("{n}", String(pending))
            : t("offline.banner.syncError", "Gagal mengirim transaksi offline: {error}. Akan dicoba lagi otomatis.").replace("{error}", lastOutcome.message ?? "")}
        </span>
        <button className="ml-auto rounded-md bg-amber-500/20 px-2 py-1 text-xs font-medium hover:bg-amber-500/30" onClick={() => user?.outletId && void syncQueue(user.outletId).then(setLastOutcome)}>
          {t("offline.retry", "Coba kirim ulang")}
        </button>
      </div>
    );
  }

  if (syncing || pending > 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-200">
        <RefreshCw size={16} className="animate-spin" />
        <span>{t("offline.banner.syncing", "Internet kembali — mengirim {n} transaksi offline ke server...").replace("{n}", String(pending || queue.length))}</span>
      </div>
    );
  }

  if (failed > 0) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
        <AlertTriangle size={16} />
        <span>{t("offline.failedTitle", "{n} transaksi offline perlu ditinjau").replace("{n}", String(failed))}</span>
        {!onRental && (
          <Link href="/dashboard/rental" className="ml-auto rounded-md bg-rose-500/20 px-2 py-1 text-xs font-medium hover:bg-rose-500/30">
            {t("offline.banner.review", "Tinjau")}
          </Link>
        )}
      </div>
    );
  }

  if (report && outletId && (report.done > 0 || report.notes.length > 0)) {
    return (
      <div className="mb-3 space-y-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{t("offline.banner.synced", "Transaksi offline terkirim: {n} berhasil.").replace("{n}", String(report.done))}</span>
          <button className="ml-auto text-emerald-300/70 hover:text-emerald-200" onClick={() => saveSyncReport(outletId, null)} aria-label={t("offline.dismiss", "Tutup")}>
            <X size={14} />
          </button>
        </div>
        {report.clockFlagged && (
          <div className="text-xs text-amber-300">{t("offline.banner.clockFlagged", "Jam perangkat terdeteksi berubah selama offline — tercatat di Audit Log untuk diperiksa owner.")}</div>
        )}
        {report.notes.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-emerald-100/80">
            {report.notes.map((n, i) => (
              <li key={i}>{noteText(n, t, formatMoney)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}
