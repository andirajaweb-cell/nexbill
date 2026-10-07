"use client";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePollingWhenVisible } from "@/lib/api/use-polling";
import { showAlert, showPrompt } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-unit-qr";

/**
 * Panel "Permintaan Pelanggan" di Rental PS — pesanan F&B, minta tambah waktu, dan panggil kasir
 * yang dikirim pelanggan dari QR di bilik. Kasir menerima/menolak di sini; pesanan yang diterima
 * langsung masuk tagihan sesi & Kitchen Display, tambah waktu langsung menambah durasi sesi.
 */

interface RequestRow {
  id: string;
  type: "order_fnb" | "extend_time" | "call_staff";
  status: string;
  createdAt: string;
  handledAt: string | null;
  handledByName: string | null;
  rejectReason: string | null;
  unitName: string;
  sessionActive: boolean;
  summary: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  minutes: number | null;
  reason: string | null;
  note: string | null;
}

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}j`;
}

export function UnitRequestsPanel({
  onNewRequest,
  onHandled,
  money,
}: {
  /** Dipanggil saat ada permintaan baru yang belum pernah terlihat (mis. untuk membunyikan beep). */
  onNewRequest?: () => void;
  /** Dipanggil setelah kasir menerima permintaan (Rental PS memuat ulang tagihan/timer). */
  onHandled?: () => void;
  money: (n: number) => string;
}) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/unit-requests", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { requests: RequestRow[] };
      const list = data.requests ?? [];
      const pendingIds = list.filter((r) => r.status === "pending").map((r) => r.id);
      if (seen.current === null) {
        seen.current = new Set(pendingIds); // muat pertama: jangan berbunyi untuk yang sudah ada
      } else if (pendingIds.some((id) => !seen.current!.has(id))) {
        pendingIds.forEach((id) => seen.current!.add(id));
        onNewRequest?.();
      }
      setRows(list);
    } catch {
      /* jaringan putus sesaat — coba lagi di polling berikutnya */
    }
  };
  usePollingWhenVisible(load, 5000);

  const act = async (r: RequestRow, action: "accept" | "reject" | "done") => {
    let rejectReason: string | undefined;
    if (action === "reject") {
      const answer = await showPrompt(t("unitQr.rejectPrompt", "Alasan ditolak (opsional, terlihat di HP pelanggan):"));
      if (answer === null) return; // dibatalkan
      rejectReason = answer;
    }
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/unit-requests/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) showAlert(data.error ?? t("rental.requests.actionFailed", "Gagal memproses permintaan."));
      else if (action === "accept") onHandled?.();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending").slice(0, 15);
  if (rows.length === 0) return null;
  const now = Date.now();

  const typeLabel = (type: RequestRow["type"]) =>
    type === "order_fnb" ? t("unitQr.type.order", "🍜 Pesan F&B") : type === "extend_time" ? t("unitQr.type.extend", "⏱️ Tambah waktu") : t("unitQr.type.call", "🙋 Panggil kasir");
  const reasonLabel = (reason: string | null) =>
    reason === "bill"
      ? t("unitQr.reason.bill", "Minta bill / bayar")
      : reason === "controller"
        ? t("unitQr.reason.controller", "Stik bermasalah")
        : reason === "other"
          ? t("unitQr.reason.other", "Lainnya")
          : t("unitQr.reason.help", "Butuh bantuan");

  return (
    <Card className={`space-y-3 ${pending.length > 0 ? "border-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.2)]" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="gm-heading font-semibold">
          {t("unitQr.panelTitle", "Permintaan Pelanggan (QR Bilik)")}
          {pending.length > 0 && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">{pending.length}</span>}
        </h2>
        {history.length > 0 && (
          <button className="text-xs text-neutral-400 hover:text-neutral-200" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? t("unitQr.hideHistory", "Sembunyikan riwayat") : t("unitQr.showHistory", "Lihat riwayat")}
          </button>
        )}
      </div>

      {pending.length === 0 && <p className="text-xs text-neutral-500">{t("unitQr.noPending", "Tidak ada permintaan yang menunggu.")}</p>}

      <div className="space-y-2">
        {pending.map((r) => (
          <div key={r.id} className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">
                {r.unitName} · <span className="text-amber-300">{typeLabel(r.type)}</span>
              </div>
              <div className="text-[11px] text-neutral-500">{timeAgo(r.createdAt, now)}</div>
            </div>
            {r.type === "order_fnb" && (
              <div className="mt-1 text-sm text-neutral-200">
                {r.items.map((i) => (
                  <div key={i.productId} className="flex justify-between gap-2">
                    <span>
                      {i.qty}× {i.name}
                    </span>
                    <span className="text-neutral-400">{money(i.qty * i.price)}</span>
                  </div>
                ))}
              </div>
            )}
            {r.type === "extend_time" && <div className="mt-1 text-sm">+{r.minutes} {t("unitQr.minutes", "menit")}</div>}
            {r.type === "call_staff" && (
              <div className="mt-1 text-sm">
                {reasonLabel(r.reason)}
                {r.note ? <span className="text-neutral-400"> — {r.note}</span> : null}
              </div>
            )}
            {r.type !== "call_staff" && !r.sessionActive && (
              <div className="mt-1 text-[11px] text-rose-300">{t("unitQr.sessionEnded", "Sesi sudah selesai — tolak lalu layani langsung di kasir.")}</div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {r.type === "call_staff" ? (
                <Button className="text-xs" disabled={busyId === r.id} onClick={() => act(r, "done")}>
                  {t("unitQr.markDone", "Sudah ditangani")}
                </Button>
              ) : (
                <>
                  <Button className="text-xs" disabled={busyId === r.id || !r.sessionActive} onClick={() => act(r, "accept")}>
                    {r.type === "order_fnb" ? t("unitQr.acceptOrder", "Terima & masukkan ke bill") : t("unitQr.acceptExtend", "Terima & tambah waktu")}
                  </Button>
                  <Button variant="ghost" className="text-xs text-rose-300" disabled={busyId === r.id} onClick={() => act(r, "reject")}>
                    {t("unitQr.reject", "Tolak")}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showHistory && history.length > 0 && (
        <div className="border-t border-white/10 pt-2 space-y-1">
          {history.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 text-xs text-neutral-400">
              <span>
                {r.unitName} · {typeLabel(r.type)} — {r.summary}
              </span>
              <span>
                {r.status === "rejected" ? t("unitQr.st.rejected", "Ditolak") : t("unitQr.st.done", "Selesai")}
                {r.handledByName ? ` · ${r.handledByName}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
