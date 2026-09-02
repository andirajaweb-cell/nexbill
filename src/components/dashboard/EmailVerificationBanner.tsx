"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { Mail } from "lucide-react";

/**
 * Slim reminder bar shown above dashboard content while the logged-in account's email is
 * unverified (see schema.ts's staffUsers.emailVerified + /api/auth/verify-email). Deliberately
 * NOT a full-page lock like SubscriptionGate — an unverified email doesn't block anything
 * functionally, it's just a nudge, so the merchant keeps working uninterrupted underneath it.
 *
 * Google-signup accounts never see this: emailVerified defaults true for them (proven by the
 * OAuth handshake itself — see the /api/onboarding/register comment), so user.emailVerified is
 * already true and this component renders nothing.
 */
export function EmailVerificationBanner() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);

  // undefined (route not yet loaded / older cached response) is treated as verified — never
  // flash this banner for a split second on every single page load just because the fetch
  // hasn't resolved yet.
  if (dismissed || user?.emailVerified !== false) return null;

  const resend = async () => {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        return;
      }
      if (data.alreadyVerified) {
        // Covers the rare race where the account got verified in another tab moments ago —
        // refresh() re-pulls /api/auth/me so this banner disappears immediately instead of
        // staying stuck offering a resend that's no longer needed.
        await refresh();
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm">
      <Mail size={18} className="shrink-0 text-amber-400" />
      <p className="flex-1 min-w-[220px] text-amber-200">
        Email <span className="font-medium text-amber-100">{user?.email}</span> belum diverifikasi.
        {status === "sent" && " Link verifikasi baru sudah dikirim — cek inbox (atau folder spam) kamu."}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={resend}
          disabled={status === "sending" || status === "sent"}
          className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-400/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Mengirim..." : status === "sent" ? "Terkirim" : "Kirim Ulang Email Verifikasi"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-amber-300/70 hover:text-amber-200 transition"
        >
          Tutup
        </button>
      </div>
      {status === "error" && <p className="w-full text-xs text-rose-400">Gagal mengirim ulang. Coba lagi beberapa saat lagi.</p>}
    </div>
  );
}
