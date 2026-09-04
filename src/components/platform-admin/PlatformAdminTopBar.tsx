"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { showAlert } from "@/lib/ui/dialog";

export function PlatformAdminTopBar({ name }: { name: string }) {
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
    <div className="flex items-center justify-between border-b border-white/10 bg-[#07080f] px-6 py-2.5">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="gm-heading tracking-wide">PLATFORM CONTROL — DATA LINTAS-OUTLET</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={enterAsSuperuser}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-400 hover:text-amber-300 hover:border-amber-400/30 transition disabled:opacity-50"
        >
          <ShieldCheck size={13} /> {busy ? "Masuk..." : "Masuk sebagai Superuser"}
        </button>
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
