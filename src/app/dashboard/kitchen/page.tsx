"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-kitchen";

interface QueueItem {
  itemId: string;
  orderId: string;
  description: string;
  qty: number;
  kitchenStatus: "new" | "confirmed" | "preparing" | "ready";
  createdAt: string;
  unitName: string | null;
  customerLabel: string;
}

interface Toast {
  id: string;
  kind: "new" | "ready";
  text: string;
}

const STATUS_COLOR: Record<string, string> = {
  new: "border-red-500/40 bg-red-500/5",
  confirmed: "border-amber-500/40 bg-amber-500/5",
  preparing: "border-blue-500/40 bg-blue-500/5",
  ready: "border-emerald-500/40 bg-emerald-500/5",
};
const COLUMNS = ["new", "confirmed", "preparing", "ready"] as const;
const SOUND_PREF_KEY = "kds_sound_enabled";

function minutesAgo(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

/** Bright ascending double-beep for a brand new order landing in the queue — meant to grab
 * attention even if the cook isn't looking at the screen right now. */
function playNewOrderBeep() {
  playTones([
    { freq: 988, at: 0, duration: 0.16 },
    { freq: 1319, at: 0.18, duration: 0.22 },
  ]);
}

/** Lower, mellower triple-beep for "food ready" — deliberately different from the new-order
 * tone so kitchen/waitstaff can tell the two apart without looking up. */
function playReadyBeep() {
  playTones([
    { freq: 784, at: 0, duration: 0.14 },
    { freq: 659, at: 0.18, duration: 0.14 },
    { freq: 523, at: 0.36, duration: 0.28 },
  ]);
}

function playTones(notes: { freq: number; at: number; duration: number }[]) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + note.at);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + note.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.at + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.at);
      osc.stop(ctx.currentTime + note.at + note.duration + 0.02);
    }
  } catch {
    // Autoplay/permission restrictions — silently skip the sound, the visual toast still shows.
  }
}

export default function KitchenDisplayPage() {
  const { t } = useDashboardLang();
  const STATUS_LABEL: Record<string, string> = {
    new: t("kitchen.status.new", "Baru"),
    confirmed: t("kitchen.status.confirmed", "Dikonfirmasi"),
    preparing: t("kitchen.status.preparing", "Diproses"),
    ready: t("kitchen.status.ready", "Siap"),
  };
  const NEXT_ACTION_LABEL: Record<string, string> = {
    new: t("kitchen.nextAction.new", "Konfirmasi"),
    confirmed: t("kitchen.nextAction.confirmed", "Mulai Masak"),
    preparing: t("kitchen.nextAction.preparing", "Siap Diantar"),
    ready: t("kitchen.nextAction.ready", "Sudah Diantar"),
  };
  const [outletId, setOutletId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [staffUserId, setStaffUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  // itemId -> last known kitchenStatus, used to diff each poll and only fire a notification
  // once per transition (new item lands, or an item first reaches "ready") instead of on every
  // 4s refresh. Starts empty and is deliberately NOT populated from the first load — otherwise
  // every item already sitting in the queue when the page opens would fire a false alert.
  const seenStatusRef = useRef<Map<string, QueueItem["kitchenStatus"]>>(new Map());
  const initializedRef = useRef(false);
  const soundOnRef = useRef(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SOUND_PREF_KEY) : null;
    const enabled = saved !== "off";
    setSoundOn(enabled);
    soundOnRef.current = enabled;
    if (typeof window !== "undefined" && "Notification" in window) setNotifPermission(Notification.permission);
    else setNotifPermission("unsupported");
  }, []);

  const pushToast = (kind: Toast["kind"], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 6000);
  };

  const notify = (kind: Toast["kind"], title: string, body: string) => {
    pushToast(kind, body);
    if (soundOnRef.current) kind === "new" ? playNewOrderBeep() : playReadyBeep();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch { /* ignore — some browsers restrict this outside a user gesture */ }
    }
  };

  const load = (oid: string) => {
    fetchJsonArray<QueueItem>(`/api/kitchen/queue?outletId=${oid}`).then((rows) => {
      const prev = seenStatusRef.current;
      if (initializedRef.current) {
        for (const item of rows) {
          const prevStatus = prev.get(item.itemId);
          const unitLabel = item.unitName ?? t("kitchen.walkInPos", "Walk-in POS");
          if (prevStatus === undefined) {
            notify(
              "new",
              t("kitchen.notif.newOrderTitle", "Pesanan Baru"),
              t("kitchen.notif.newBody", "{qty}x {desc} — {unit}").replace("{qty}", String(item.qty)).replace("{desc}", item.description).replace("{unit}", unitLabel)
            );
          } else if (prevStatus !== "ready" && item.kitchenStatus === "ready") {
            notify(
              "ready",
              t("kitchen.notif.readyTitle", "Makanan Siap"),
              t("kitchen.notif.readyBody", "{qty}x {desc} — {unit} siap diantar").replace("{qty}", String(item.qty)).replace("{desc}", item.description).replace("{unit}", unitLabel)
            );
          }
        }
      }
      seenStatusRef.current = new Map(rows.map((r) => [r.itemId, r.kitchenStatus]));
      initializedRef.current = true;
      setQueue(rows);
    });
  };

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (!outlet) return;
    setOutletId(outlet.id);
    fetchJsonArray(`/api/staff?outletId=${outlet.id}`).then((rows) => { if (rows[0]) setStaffUserId(rows[0].id); });
    load(outlet.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  useEffect(() => {
    if (!outletId) return;
    const id = setInterval(() => load(outletId), 4000);
    return () => clearInterval(id);
  }, [outletId]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    window.localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
  };

  const requestNotifPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const advance = async (itemId: string) => {
    await fetch(`/api/order-items/${itemId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffUserId }),
    });
    if (outletId) load(outletId);
  };

  const cancel = async (itemId: string) => {
    const reason = prompt(t("kitchen.cancelPromptMessage", "Alasan batal (mis. bahan habis)?"), t("kitchen.cancelPromptDefault", "Bahan habis"));
    if (reason === null) return;
    const res = await fetch(`/api/order-items/${itemId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, staffUserId }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    if (outletId) load(outletId);
  };

  return (
    <div className="space-y-6">
      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-72">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur ${toast.kind === "new" ? "border-red-500/50 bg-red-950/90 text-red-200" : "border-emerald-500/50 bg-emerald-950/90 text-emerald-200"}`}
          >
            <div className="font-semibold mb-0.5">{toast.kind === "new" ? `🔔 ${t("kitchen.notif.newOrderTitle", "Pesanan Baru")}` : `✅ ${t("kitchen.notif.readyTitle", "Makanan Siap")}`}</div>
            <div>{toast.text}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("kitchen.title", "Kitchen Display System")}</h1>
          <p className="text-sm text-neutral-500">{t("kitchen.subtitle", "Semua pesanan F&B dari sesi rental & POS yang masih perlu diproses dapur. Refresh otomatis tiap 4 detik.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${soundOn ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-neutral-700 text-neutral-400"}`}
          >
            {soundOn ? `🔊 ${t("kitchen.soundOn", "Suara Aktif")}` : `🔇 ${t("kitchen.soundOff", "Suara Mati")}`}
          </button>
          {notifPermission !== "unsupported" && notifPermission !== "granted" && (
            <Button variant="ghost" className="text-xs" onClick={requestNotifPermission}>
              {t("kitchen.enableBrowserNotif", "Aktifkan Notifikasi Browser")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((status) => {
          const items = queue.filter((q) => q.kitchenStatus === status);
          return (
            <div key={status} className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide flex items-center justify-between">
                {STATUS_LABEL[status]} <span className="text-neutral-600">({items.length})</span>
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.itemId} className={`border ${STATUS_COLOR[status]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-300">{item.unitName ?? t("kitchen.walkInPos", "Walk-in POS")}</span>
                      <span className="text-[10px] text-neutral-500">{t("kitchen.minutesAgo", "{n} menit lalu").replace("{n}", String(minutesAgo(item.createdAt)))}</span>
                    </div>
                    <div className="text-sm font-medium mb-1">{item.qty}x {item.description}</div>
                    <div className="text-xs text-neutral-500 mb-3">{item.customerLabel}</div>
                    <div className="flex gap-2">
                      <Button className="flex-1 text-xs" onClick={() => advance(item.itemId)}>{NEXT_ACTION_LABEL[status]}</Button>
                      {status === "new" && (
                        <Button variant="ghost" className="text-xs" onClick={() => cancel(item.itemId)}>{t("kitchen.cancel", "Batal")}</Button>
                      )}
                    </div>
                  </Card>
                ))}
                {items.length === 0 && <p className="text-xs text-neutral-600 italic">{t("kitchen.empty", "Kosong")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
