"use client";
import { useState } from "react";
import Link from "next/link";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim link reset password.");
        return;
      }
      // Server always returns the same generic response whether the email exists or not — see
      // /api/auth/forgot-password for why (avoids revealing which emails have an account).
      setSent(true);
    } catch {
      setError("Tidak bisa terhubung ke server. Cek koneksi internet kamu dan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(480px circle at 15% 20%, rgba(59,130,246,0.16), transparent 60%), radial-gradient(520px circle at 85% 80%, rgba(37,99,235,0.16), transparent 60%)",
          }}
        />

        <div className="flex items-center justify-center mb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center">
              <span className="gm-display font-bold text-neutral-950 text-sm">N</span>
            </div>
            <span className="gm-display font-bold text-lg tracking-wide text-white">NEXBILL</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] bg-[#0a0d1a] p-8 sm:p-10 space-y-6">
          {!sent ? (
            <>
              <div className="space-y-1.5">
                <h1 className="gm-display text-[1.5rem] font-bold text-white">Lupa Password</h1>
                <p className="text-sm text-neutral-400">Masukkan email akun kamu — kami akan kirim link untuk membuat password baru.</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-400">Email</label>
                  <input
                    type="email"
                    autoFocus
                    required
                    placeholder="nama@outlet.com"
                    className="w-full mt-1.5 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && <div className="text-xs text-rose-400">{error}</div>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)] hover:shadow-[0_14px_38px_-8px_rgba(37,99,235,0.85)] hover:brightness-110"
                >
                  {busy ? "Mengirim..." : "Kirim Link Reset Password"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-3 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6l8 6 8-6M4 6h16v12H4V6z" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="gm-display text-lg font-bold text-white">Cek Email Kamu</h1>
              <p className="text-sm text-neutral-400">
                Kalau email <span className="text-neutral-200">{email}</span> terdaftar, link reset password sudah dikirim. Link berlaku 30 menit.
              </p>
            </div>
          )}

          <p className="text-center text-sm text-neutral-400">
            <Link href="/login" className="font-medium text-blue-300 hover:text-blue-200 transition">
              &larr; Kembali ke halaman masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
