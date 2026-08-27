"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";

export function PlatformAdminTopBar({ name }: { name: string }) {
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/platform-admin/auth/logout", { method: "POST" });
    router.push("/platform-admin/login");
    router.refresh();
  };
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-[#07080f] px-6 py-2.5">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="gm-heading tracking-wide">PLATFORM CONTROL — DATA LINTAS-OUTLET</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Platform-admin is a completely separate auth system from outlet staff sessions (see
            layout.tsx) — this just navigates to /dashboard, which relies on that route's own
            middleware/session check (redirects to /login if there's no outlet staff session in
            this browser). It's a convenience exit back to the regular app, not a guarantee this
            platform-admin account also has outlet access. */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-400 hover:text-amber-300 hover:border-amber-400/30 transition"
        >
          <LayoutDashboard size={13} /> Kembali ke Dashboard
        </Link>
        <span className="text-sm text-neutral-300">
          <span className="font-medium text-neutral-100">{name}</span>
        </span>
        <button onClick={logout} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-400 transition">
          <LogOut size={13} /> Keluar
        </button>
      </div>
    </div>
  );
}
