"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "verifying" | "done" | "error";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Link verifikasi tidak valid — token tidak ditemukan di URL.");
      return;
    }
    let cancelled = false;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error ?? "Gagal memverifikasi email.");
          return;
        }
        setStatus("done");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setError("Tidak bisa terhubung ke server. Cek koneksi internet kamu dan coba lagi.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

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

        <div className="rounded-3xl border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] bg-[#0a0d1a] p-8 sm:p-10 space-y-6 text-center">
          {status === "verifying" && (
            <div className="space-y-3 py-2">
              <div className="mx-auto w-12 h-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              <p className="text-sm text-neutral-400">Memverifikasi email kamu...</p>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-3 py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="gm-display text-lg font-bold text-white">Email Telah Terverifikasi</h1>
              <p className="text-sm text-neutral-400">Terima kasih — alamat email akun kamu sudah berhasil diverifikasi.</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3 py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-400/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="gm-display text-lg font-bold text-white">Verifikasi Gagal</h1>
              <p className="text-sm text-neutral-400">{error}</p>
              <p className="text-xs text-neutral-500">Sudah login? Buka menu Pengaturan di dashboard untuk kirim ulang link verifikasi.</p>
            </div>
          )}

          <Link href="/dashboard" className="inline-block text-sm font-medium text-blue-300 hover:text-blue-200 transition">
            &larr; Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
