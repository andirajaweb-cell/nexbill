"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Login for NEXBILL's own platform control panel — deliberately a separate page, separate
 * form submission target (/api/platform-admin/auth/login), and separate cookie from the
 * outlet staff login at /login. No link to/from the regular login page on purpose: an outlet
 * merchant browsing this app should never stumble onto this URL via a visible nav link.
 */
export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login gagal.");
        return;
      }
      router.push("/platform-admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05060d] px-4">
      <Card className="w-full max-w-sm space-y-4 border-amber-500/20">
        <div>
          <div className="gm-display text-lg font-bold text-amber-400">NEXBILL Platform Control</div>
          <p className="text-sm text-neutral-500">Khusus akun platform admin (Digitrajasa) — bukan login outlet/merchant.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500">Email</label>
            <input
              type="email"
              autoFocus
              required
              className="w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Password</label>
            <input
              type="password"
              required
              className="w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <Button type="submit" className="w-full !from-amber-500 !to-rose-500" disabled={busy}>
            {busy ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
