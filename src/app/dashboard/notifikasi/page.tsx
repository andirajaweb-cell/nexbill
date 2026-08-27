"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import type { NotificationItem } from "@/lib/notifications";
import "@/lib/i18n/dict-notifikasi";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]",
  warning: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  info: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]",
};

const TYPE_LABEL_META: Record<string, { key: string; fallback: string }> = {
  low_stock: { key: "notifikasi.type.lowStock", fallback: "Stok" },
  approval_pending: { key: "notifikasi.type.approvalPending", fallback: "Approval" },
  expense_pending: { key: "notifikasi.type.expensePending", fallback: "Expense" },
  booking_pending: { key: "notifikasi.type.bookingPending", fallback: "Booking" },
  subscription_trial: { key: "notifikasi.type.subscriptionTrial", fallback: "Langganan" },
  announcement: { key: "notifikasi.type.announcement", fallback: "Pengumuman" },
};

export default function NotifikasiPage() {
  const { t } = useDashboardLang();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = () => {
    fetchJsonObject<{ items: NotificationItem[]; unreadCount: number }>("/api/notifications").then((data) => {
      if (data) setItems(data.items);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, read: true } : i)));
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  };

  const unreadCount = items.filter((i) => !i.read).length;
  const visible = filter === "unread" ? items.filter((i) => !i.read) : items;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("notifikasi.title", "Notifikasi")}
        subtitle={t("notifikasi.subtitle", "Semua hal yang butuh perhatianmu di outlet ini — stok menipis, approval tertunda, dan lainnya.")}
        actions={
          unreadCount > 0 ? (
            <Button variant="ghost" onClick={markAllRead}>
              {t("notifikasi.markAllRead", "Tandai semua dibaca")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 border-b border-neutral-800">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              filter === f ? "border-cyan-400 text-cyan-400" : "border-transparent text-neutral-500 hover:text-neutral-200"
            }`}
          >
            {f === "all"
              ? t("notifikasi.filterAll", "Semua ({n})").replace("{n}", String(items.length))
              : t("notifikasi.filterUnread", "Belum Dibaca ({n})").replace("{n}", String(unreadCount))}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="py-10 text-center text-sm text-neutral-500">{t("notifikasi.loading", "Memuat…")}</div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500">
            {filter === "unread" ? t("notifikasi.emptyUnread", "Tidak ada notifikasi yang belum dibaca.") : t("notifikasi.emptyAll", "Tidak ada notifikasi.")}
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {visible.map((item) => {
              const typeMeta = TYPE_LABEL_META[item.type];
              return (
                <div key={item.key} className={`flex items-start gap-3 py-3.5 ${item.read ? "opacity-60" : ""}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-neutral-500">{typeMeta ? t(typeMeta.key, typeMeta.fallback) : item.type}</span>
                      <span className="text-[10px] text-neutral-600">{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                    <Link href={item.link} onClick={() => !item.read && markRead(item.key)} className="block text-sm font-medium text-neutral-100 hover:text-cyan-300 transition">
                      {item.title}
                    </Link>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.message}</p>
                  </div>
                  {!item.read && (
                    <button onClick={() => markRead(item.key)} className="shrink-0 text-[11px] text-cyan-400 hover:text-cyan-300 transition whitespace-nowrap">
                      {t("notifikasi.markRead", "Tandai dibaca")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
