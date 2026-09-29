"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { showAlert } from "@/lib/ui/dialog";

export function PlatformAdminTopBar({ name, onMenu }: { name: string; onMenu?: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    await fetch("/api/platform-admin/auth/logout", { method: "POST" });
    router.push("/platform-admin/login");
    router.refresh();
  };

  // Replaces the old plain "Kembali ke Dashboard" link, which just navigated to /dashboard and
  // relied on whatever outlet staff session already happened to be in the browser — no real
  // connection to this platform-admin login at all. This mints an actual superuser dashboard
  // session via /api/platform-admin/superuser/impersonate, the only supported way to reach one
  // (see that route's comment — superuser is deliberately unreachable from the public /login
  // form, Google or password, no matter the credentials).
  const enterAsSuperuser = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/superuser/impersonate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        await showAlert(data.error ?? "Gagal masuk sebagai superuser.");
        return;
      }
      router.push("/dashboard");
    } catch {
      await showAlert("Gagal masuk sebagai superuser.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-white/10 bg-[#07080f]/95 px-3 backdrop-blur sm:px-6 pt-[env(safe-area-inset-top)]">
      <div className="flex min-w-0 items-center gap-2">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            className="lg:hidden -ml-1 rounded-lg p-2 text-neutral-300 hover:bg-white/5 hover:text-amber-300"
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
        )}
        {/* Merek hanya tampil di layar kecil (di desktop sudah ada di sidebar). */}
        <span className="lg:hidden gm-display text-sm font-bold text-amber-400">NEXBILL</span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="gm-heading truncate text-xs tracking-wide text-neutral-500">
          <span className="hidden md:inline">PLATFORM CONTROL — DATA LINTAS-OUTLET</span>
          <span className="md:hidden">PLATFORM</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={enterAsSuperuser}
          disabled={busy}
          title="Masuk sebagai Superuser"
          aria-label="Masuk sebagai Superuser"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-neutral-400 hover:text-amber-300 hover:border-amber-400/30 transition disabled:opacity-50 sm:px-2.5 sm:py-1"
        >
          <ShieldCheck size={14} />
          <span className="hidden sm:inline">{busy ? "Masuk..." : "Masuk sebagai Superuser"}</span>
        </button>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-neutral-100 md:inline" title={name}>
          {name}
        </span>
        <button
          onClick={logout}
          title="Keluar"
          aria-label="Keluar"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:text-rose-400 transition"
        >
          <LogOut size={14} /> <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
