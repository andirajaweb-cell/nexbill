"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Link reset password tidak valid — token tidak ditemukan di URL.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal reset password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
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
          {!done ? (
            <>
              <div className="space-y-1.5">
                <h1 className="gm-display text-[1.5rem] font-bold text-white">Buat Password Baru</h1>
                <p className="text-sm text-neutral-400">Masukkan password baru untuk akun kamu.</p>
              </div>

              {!token && (
                <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                  Token tidak ditemukan di URL. Pastikan kamu membuka link lengkap dari email reset password.
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-400">Password Baru</label>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Minimal 8 karakter"
                    className="w-full mt-1.5 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password baru"
                    className="w-full mt-1.5 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                {error && <div className="text-xs text-rose-400">{error}</div>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)] hover:shadow-[0_14px_38px_-8px_rgba(37,99,235,0.85)] hover:brightness-110"
                >
                  {busy ? "Menyimpan..." : "Simpan Password Baru"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-3 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="gm-display text-lg font-bold text-white">Password Berhasil Diubah</h1>
              <p className="text-sm text-neutral-400">Mengalihkan ke halaman masuk...</p>
            </div>
          )}

          {!done && (
            <p className="text-center text-sm text-neutral-400">
              <Link href="/login" className="font-medium text-blue-300 hover:text-blue-200 transition">
                &larr; Kembali ke halaman masuk
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
