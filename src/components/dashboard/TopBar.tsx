"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { roleLabel, type StaffRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/lib/api/use-api";
import { LogOut, Bell, ShieldCheck, Building2, Check, ChevronDown } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { LanguageSwitcher } from "@/components/dashboard/LanguageSwitcher";

/**
 * Role -> Badge status mapping. Superuser (the sole top-level role) is
 * highlighted green (full access). Every other role falls back to the
 * neutral "unknown" grey.
 */
const ROLE_BADGE_STATUS: Record<string, string> = {
  superuser: "success",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]",
  warning: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  info: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]",
};

// How many notifications the dropdown itself shows before falling back to "+N lainnya" —
// the full, unclipped list always lives at /dashboard/notifikasi.
const DROPDOWN_LIMIT = 5;

/**
 * Persistent bar shown above every /dashboard/** page's content, right at the
 * top where it can't be missed — added after a real mix-up where a user was
 * logged in as Kasir but couldn't tell, because the only role indicator was
 * a text line at the very bottom of the sidebar's nav list, off-screen
 * unless you scrolled all the way down past every menu item.
 */
export function TopBar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { t } = useDashboardLang();
  // Was a hand-rolled useEffect + setInterval(load, 60000) — moved to useApi/SWR so this poll
  // (which runs on every dashboard page, since TopBar lives in the persistent layout) pauses
  // automatically when the browser tab is backgrounded, and so `mutate()` below can do an
  // optimistic local update on mark-as-read without a full extra round trip. See
  // src/lib/api/use-api.ts for what this wrapper adds over a plain fetch.
  const { data, mutate } = useApi<{ items: NotificationItem[]; unreadCount: number }>("/api/notifications", { refreshInterval: 60000 });
  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [outletMenuOpen, setOutletMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const outletPanelRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on an outside click, same as any standard notification bell.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!outletMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (outletPanelRef.current && !outletPanelRef.current.contains(e.target as Node)) setOutletMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [outletMenuOpen]);

  const switchOutlet = async (outletId: string) => {
    if (switching || outletId === user?.outletId) { setOutletMenuOpen(false); return; }
    setSwitching(true);
    try {
      const res = await fetch("/api/session/switch-outlet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId }),
      });
      if (res.ok) {
        setOutletMenuOpen(false);
        // Use client-side navigation so the active outlet change triggers a fresh dashboard load
        // without violating Next.js routing rules in a Client Component.
        router.push("/dashboard");
      } else {
        setSwitching(false);
      }
    } catch {
      setSwitching(false);
    }
  };

  const markRead = async (key: string) => {
    await mutate(
      async (current) => {
        await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
        if (!current) return current ?? null;
        return { items: current.items.map((i) => (i.key === key ? { ...i, read: true } : i)), unreadCount: Math.max(0, current.unreadCount - 1) };
      },
      {
        optimisticData: (current) =>
          current ? { items: current.items.map((i) => (i.key === key ? { ...i, read: true } : i)), unreadCount: Math.max(0, current.unreadCount - 1) } : (current ?? null),
        rollbackOnError: true,
        revalidate: false,
      }
    );
  };

  const markAllRead = async () => {
    await mutate(
      async (current) => {
        await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
        if (!current) return current ?? null;
        return { items: current.items.map((i) => ({ ...i, read: true })), unreadCount: 0 };
      },
      {
        optimisticData: (current) => (current ? { items: current.items.map((i) => ({ ...i, read: true })), unreadCount: 0 } : (current ?? null)),
        rollbackOnError: true,
        revalidate: false,
      }
    );
  };

  const visible = items.slice(0, DROPDOWN_LIMIT);
  const remaining = items.length - visible.length;

  return (
    <div className="relative z-30 flex items-center justify-between border-b border-white/10 bg-[#070b18]/80 backdrop-blur-md px-6 py-2.5">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="gm-heading tracking-wide">{t("topbar.controlCenterOnline")}</span>
      </div>
      <div className="flex items-center gap-3">
        {loading ? (
          <span className="text-xs text-neutral-500">{t("topbar.loadingSession")}</span>
        ) : user ? (
          <>
            <span className="text-sm text-neutral-300">
              {t("topbar.loginAs")} <span className="font-medium text-neutral-100">{user.name}</span>
            </span>
            <Badge status={ROLE_BADGE_STATUS[user.role] ?? "unknown"}>{roleLabel(user.role as StaffRole)}</Badge>
            {user.linkedOutlets && user.linkedOutlets.length > 1 && (
              <div className="relative" ref={outletPanelRef}>
                <button
                  onClick={() => setOutletMenuOpen((v) => !v)}
                  disabled={switching}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-300 hover:border-cyan-400/30 hover:text-cyan-300 transition disabled:opacity-60"
                  title={t("topbar.switchOutletTitle")}
                >
                  <Building2 size={12} />
                  <span className="max-w-[140px] truncate">{user.linkedOutlets.find((o) => o.id === user.outletId)?.name ?? "Outlet"}</span>
                  <ChevronDown size={12} />
                </button>
                {outletMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-xl border border-white/10 bg-[#0a0f1e] shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-white/10 text-[11px] uppercase tracking-wide text-neutral-500">
                      {t("topbar.yourOutlets")} ({user.linkedOutlets.length})
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {user.linkedOutlets.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => switchOutlet(o.id)}
                          className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/5 last:border-b-0 text-left hover:bg-white/5 transition"
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-medium text-neutral-100 truncate">{o.name}</span>
                            {o.isHome && <span className="block text-[10px] text-neutral-500">{t("topbar.mainOutlet")}</span>}
                          </span>
                          {o.id === user.outletId && <Check size={14} className="shrink-0 text-cyan-400" />}
                        </button>
                      ))}
                    </div>
                    <Link
                      href="/dashboard/semua-outlet"
                      onClick={() => setOutletMenuOpen(false)}
                      className="block px-3.5 py-2.5 text-center text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-white/5 transition"
                    >
                      {t("topbar.viewAllOutlets")}
                    </Link>
                  </div>
                )}
              </div>
            )}
            {user.role === "superuser" && (
              <Link
                href="/platform-admin/login"
                target="_blank"
                rel="noopener noreferrer"
                title={t("topbar.adminPlatformTitle")}
                className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-400/20 hover:text-amber-200 transition"
              >
                <ShieldCheck size={12} /> {t("topbar.adminPlatform")}
              </Link>
            )}
          </>
        ) : (
          <span className="text-xs text-amber-400">{t("topbar.invalidSession")}</span>
        )}
        <LanguageSwitcher />
        <div className="relative" ref={panelRef}>
          <button
            className="relative rounded-lg p-1.5 text-neutral-400 hover:text-cyan-300 hover:bg-white/5 transition"
            title={unreadCount > 0 ? t("topbar.unreadTooltip").replace("{n}", String(unreadCount)) : t("topbar.noNotificationsTooltip")}
            onClick={() => setOpen((v) => !v)}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-xl border border-white/10 bg-[#0a0f1e] shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
                <span className="text-sm font-medium text-neutral-100">{t("topbar.notifications")}</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-cyan-400 hover:text-cyan-300 transition">
                    {t("topbar.markAllRead")}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {visible.length === 0 ? (
                  <div className="px-3.5 py-6 text-center text-xs text-neutral-500">{t("topbar.noNotifications")}</div>
                ) : (
                  visible.map((item) => (
                    <Link
                      key={item.key}
                      href={item.link}
                      onClick={() => {
                        setOpen(false);
                        if (!item.read) markRead(item.key);
                      }}
                      className={`flex items-start gap-2.5 px-3.5 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition ${item.read ? "opacity-50" : ""}`}
                    >
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-neutral-100 truncate">{item.title}</span>
                        <span className="block text-[11px] text-neutral-400 line-clamp-2">{item.message}</span>
                      </span>
                    </Link>
                  ))
                )}
                {remaining > 0 && (
                  <div className="px-3.5 py-2 text-[11px] text-neutral-500 text-center border-b border-white/5">{t("topbar.moreNotifications").replace("{n}", String(remaining))}</div>
                )}
              </div>
              <Link
                href="/dashboard/notifikasi"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2.5 text-center text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-white/5 transition"
              >
                {t("topbar.viewAllNotifications")}
              </Link>
            </div>
          )}
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-400 transition">
          <LogOut size={13} /> {t("sidebar.logout")}
        </button>
      </div>
    </div>
  );
}
