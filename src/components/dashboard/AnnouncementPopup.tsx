"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/client";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  imageUrl?: string | null;
}

const SEVERITY_STYLE: Record<string, { border: string; badge: string; label: string }> = {
  info: { border: "border-cyan-500/40", badge: "bg-cyan-500/15 text-cyan-300", label: "Info" },
  warning: { border: "border-amber-500/40", badge: "bg-amber-500/15 text-amber-300", label: "Peringatan" },
  critical: { border: "border-rose-500/40", badge: "bg-rose-500/15 text-rose-300", label: "Penting" },
};

/**
 * One-time popup for platform-broadcast announcements (see platformAnnouncements in
 * src/db/schema.ts) — mounted once in the outlet dashboard's root layout so it can interrupt any
 * page on load. Queues multiple undismissed announcements one at a time (dismissing one reveals
 * the next) rather than stacking them. Dismissing POSTs the same `announcement:{id}` key the
 * notification bell uses, so it disappears from both places at once.
 */
export function AnnouncementPopup() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<AnnouncementItem[]>([]);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/announcements/active")
      .then((r) => r.json())
      .then((d) => setQueue(d?.items ?? []))
      .catch(() => {});
  }, [user]);

  const current = queue[0];
  if (!current) return null;

  const dismiss = async () => {
    setDismissing(true);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `announcement:${current.id}` }),
      });
      setQueue((prev) => prev.slice(1));
    } finally {
      setDismissing(false);
    }
  };

  const style = SEVERITY_STYLE[current.severity] ?? SEVERITY_STYLE.info;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border ${style.border} bg-[#0b0f1e] shadow-2xl overflow-hidden`}>
        {current.imageUrl && (
          <div className="w-full aspect-video bg-neutral-900">
            <img src={current.imageUrl} alt={current.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Pengumuman dari NEXBILL</span>
          </div>
          <h2 className="text-base font-semibold text-neutral-100">{current.title}</h2>
          <p className="text-sm text-neutral-400 whitespace-pre-line leading-relaxed">{current.message}</p>
          <div className="flex items-center justify-between pt-1">
            {queue.length > 1 && <span className="text-xs text-neutral-600">{queue.length - 1} pengumuman lain menyusul</span>}
            <Button className="ml-auto" onClick={dismiss} disabled={dismissing}>
              {dismissing ? "..." : "Mengerti"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
