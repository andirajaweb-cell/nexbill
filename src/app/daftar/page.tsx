"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/client";

interface PlanInfo {
  name: string;
  priceCurrent: number;
  includedConsoles: number;
  extraConsolePrice: number;
  smartPlugPrice: number;
  setupServicePrice: number;
}

const inputClass =
  "w-full mt-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400/50 focus:bg-white/[0.07]";
const labelClass = "text-xs text-neutral-400";

function rupiah(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

const STEPS = ["Usaha", "Cabang", "TV & Konsol", "Operasional", "Akun Owner", "Review"];

export default function DaftarPage() {
  return (
    <Suspense fallback={null}>
      <DaftarPageInner />
    </Suspense>
  );
}

// useSearchParams() below requires a Suspense boundary around it during static generation
// (Next.js bails out to client-side rendering for the part that reads the URL otherwise) —
// see https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout. Split into an inner
// component so the outer default export can provide that boundary.
function DaftarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Referral link attribution — /daftar?ref=CODE. Captured once on mount so it survives even if
  // the URL later changes (e.g. back/forward through the wizard steps); silently ignored server-
  // side if the code turns out invalid. See lib/referral/service.ts.
  const refCode = useMemo(() => searchParams.get("ref") || undefined, [searchParams]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [result, setResult] = useState<any>(null);

  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [branchCount, setBranchCount] = useState(1);

  const [tvAndroid, setTvAndroid] = useState(0);
  const [tvSmart, setTvSmart] = useState(0);
  const [tvAnalog, setTvAnalog] = useState(0);

  const [shifts, setShifts] = useState(1);
  const [empKasir, setEmpKasir] = useState(1);
  const [empDapur, setEmpDapur] = useState(0);
  const [empLainnya, setEmpLainnya] = useState(0);

  const [outletName, setOutletName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Set once a verified Google identity is confirmed (either freshly returned from
  // /api/auth/google/callback via ?google=1, or after clicking "Daftar dengan Google" below).
  // When true, step 4 skips the password fields entirely — the account is Google-only, see
  // /api/onboarding/register which reads the same identity server-side from the google_pending
  // cookie rather than trusting anything in this component's state.
  const [viaGoogle, setViaGoogle] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/plan")
      .then((r) => r.json())
      .then((d) => (d && !d.error ? setPlan(d) : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("google") !== "1") return;
    fetch("/api/auth/google/pending")
      .then((r) => r.json())
      .then((d) => {
        if (d?.pending?.email) {
          setEmail(d.pending.email);
          setOwnerName((prev) => prev || d.pending.name || "");
          setViaGoogle(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGoogleSignup = async () => {
    setGoogleBusy(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        // No ?next= — a brand-new email lands back on /daftar?google=1 automatically (see
        // /api/auth/google/callback); an email that already has an account is sent straight to
        // /dashboard instead, since there's nothing left to register.
        options: { redirectTo: `${window.location.origin}/api/auth/google/callback` },
      });
      if (oauthError) {
        setError("Daftar dengan Google gagal. Coba lagi, atau isi manual di bawah.");
        setGoogleBusy(false);
      }
    } catch {
      setError("Daftar dengan Google gagal. Coba lagi, atau isi manual di bawah.");
      setGoogleBusy(false);
    }
  };

  const totalTv = tvAndroid + tvSmart + tvAnalog;
  const nonAndroidTv = tvSmart + tvAnalog;
  const preview = useMemo(() => {
    if (!plan) return null;
    const smartPlugQty = nonAndroidTv;
    const extraConsoleQty = Math.max(0, totalTv - plan.includedConsoles);
    const smartPlugCost = smartPlugQty * plan.smartPlugPrice;
    const extraConsoleCost = extraConsoleQty * plan.extraConsolePrice;
    return { smartPlugQty, extraConsoleQty, smartPlugCost, extraConsoleCost };
  }, [plan, totalTv, nonAndroidTv]);

  const staffTotal = empKasir + empDapur + empLainnya;

  const goNext = () => {
    setError("");
    if (step === 0 && !businessName.trim()) {
      setError("Nama usaha wajib diisi.");
      return;
    }
    if (step === 4) {
      if (!outletName.trim()) return setError("Nama outlet/merchant wajib diisi.");
      if (!ownerName.trim()) return setError("Nama pemilik (owner) wajib diisi.");
      if (!email.trim() || !email.includes("@")) return setError("Email tidak valid.");
      if (!viaGoogle) {
        if (password.length < 8) return setError("Password minimal 8 karakter.");
        if (password !== confirmPassword) return setError("Konfirmasi password tidak sama.");
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async () => {
    setError("");
    setBusy(true);
    // Without a client-side timeout, a hung request (DB pool exhaustion, cold serverless
    // function, etc.) leaves the "Memproses..." button stuck forever with no feedback — the
    // fetch promise just never resolves. 25s is generous for outlet provisioning (COA seed +
    // account mapping + subscription setup can take a few seconds) but still bounded.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          businessName,
          outletName,
          address,
          phone,
          branchCount,
          tv: { android: tvAndroid, smart: tvSmart, analog: tvAnalog },
          shifts,
          employees: { kasir: empKasir, dapur: empDapur, lainnya: empLainnya },
          owner: { name: ownerName, email, password },
          ref: refCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Pendaftaran gagal.");
        return;
      }
      setResult(data);
    } catch (err: unknown) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Pendaftaran butuh waktu lebih lama dari biasanya (kemungkinan server sedang sibuk). Coba lagi sebentar lagi."
          : "Tidak bisa terhubung ke server. Cek koneksi internet kamu dan coba lagi."
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070f] px-4 py-10">
        <Card className="w-full max-w-lg space-y-5">
          <div>
            <div className="text-lg font-bold text-cyan-400">Pendaftaran Berhasil 🎉</div>
            <p className="text-sm text-neutral-400 mt-1">
              Outlet <span className="text-neutral-100 font-medium">{result.outlet.name}</span> sudah dibuat
              {result.branchesCreated > 0 ? ` beserta ${result.branchesCreated} cabang lainnya` : ""}. Masa percobaan 30 hari sudah aktif.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="text-xs font-semibold text-neutral-300">Rekomendasi Berdasarkan Jawabanmu</div>
            <div className="text-sm text-neutral-300 space-y-1">
              <div>
                Smart Plug dibutuhkan: <span className="text-cyan-400 font-medium">{result.recommendation.smartPlugQty} unit</span> (untuk TV
                analog/smart TV)
              </div>
              <div>
                Slot konsol tambahan: <span className="text-cyan-400 font-medium">{result.recommendation.extraConsoleQty} unit</span> (di luar
                jatah paket)
              </div>
              <div>
                Estimasi akun staf yang perlu dibuat:{" "}
                <span className="text-cyan-400 font-medium">{result.recommendation.staffAccountsSuggested} akun</span> (kasir/dapur/lainnya),
                untuk {result.recommendation.shifts} shift
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            Kamu sudah otomatis masuk (login). Lanjutkan ke halaman Langganan untuk menyelesaikan checkout smart plug/konsol tambahan, atau
            langsung ke Dashboard.
          </p>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                router.push(result.redirectTo || "/dashboard/billing");
                router.refresh();
              }}
            >
              Ke Halaman Langganan
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Ke Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070f] px-4 py-10">
      <Card className="w-full max-w-lg space-y-4 relative">
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-[#05070f]/90 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            <p className="text-sm text-neutral-300">Menyiapkan outlet & akun kamu...</p>
          </div>
        )}
        <div>
          <div className="text-lg font-bold text-cyan-400">Daftar NEXBILL</div>
          <p className="text-sm text-neutral-500">Coba gratis 30 hari — beberapa pertanyaan singkat dulu untuk menyiapkan akunmu.</p>
        </div>

        {refCode && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Kode referral <span className="font-mono font-semibold">{refCode}</span> terdeteksi — kamu dapat diskon{" "}
            <span className="font-semibold">20%</span> untuk tagihan langganan pertama.
          </div>
        )}

        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded-full ${i <= step ? "bg-cyan-400" : "bg-white/10"}`} />
            </div>
          ))}
        </div>
        <div className="text-xs text-neutral-500">
          Langkah {step + 1}/{STEPS.length} — {STEPS[step]}
        </div>

        <div className="space-y-3 min-h-[220px]">
          {step === 0 && (
            <>
              {viaGoogle ? (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  Terverifikasi via Google: <span className="font-medium">{email}</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startGoogleSignup}
                    disabled={googleBusy}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.07] hover:border-white/20 disabled:opacity-60"
                  >
                    {googleBusy ? "Membuka Google..." : "Daftar dengan Google"}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] uppercase tracking-wider text-neutral-500">atau isi manual</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>Nama Usaha</label>
                <input
                  autoFocus
                  className={inputClass}
                  placeholder="cth. Rental PS Jaya Bersama"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (!outletName) setOutletName(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Alamat (opsional)</label>
                <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>No. Telepon/WhatsApp (opsional)</label>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className={labelClass}>Berapa jumlah cabang yang kamu miliki (termasuk yang ini)?</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputClass}
                  value={branchCount}
                  onChange={(e) => setBranchCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                />
              </div>
              <p className="text-xs text-neutral-500">
                Kalau lebih dari 1, cabang lain otomatis dibuat sekaligus dan digabung dalam satu tagihan (billing group) — bisa diganti
                nama/alamatnya nanti di menu Pengaturan.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-neutral-500">Berapa banyak unit TV di outlet ini, berdasarkan jenisnya?</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>TV Android</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={tvAndroid}
                    onChange={(e) => setTvAndroid(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Smart TV</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={tvSmart}
                    onChange={(e) => setTvSmart(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>TV Analog</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={tvAnalog}
                    onChange={(e) => setTvAnalog(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
              {preview && (
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-neutral-300 space-y-1">
                  {preview.smartPlugQty > 0 && (
                    <div>
                      TV analog/smart TV butuh Smart Plug agar bisa dikontrol otomatis dari sistem —{" "}
                      <span className="text-cyan-400 font-medium">{preview.smartPlugQty} unit</span> (~{rupiah(preview.smartPlugCost)})
                    </div>
                  )}
                  {preview.extraConsoleQty > 0 && (
                    <div>
                      Total unit lebih dari {plan?.includedConsoles} (jatah paket) — butuh{" "}
                      <span className="text-cyan-400 font-medium">{preview.extraConsoleQty} slot konsol tambahan</span> (~
                      {rupiah(preview.extraConsoleCost)})
                    </div>
                  )}
                  {preview.smartPlugQty === 0 && preview.extraConsoleQty === 0 && totalTv > 0 && (
                    <div>Semua unit TV Android dan masih dalam jatah paket — tidak perlu tambahan apa pun untuk memulai.</div>
                  )}
                  {totalTv === 0 && <div>Belum ada unit diisi — bisa ditambah kapan saja nanti di menu Kelola Unit.</div>}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className={labelClass}>Berapa shift kerja saat ini?</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className={inputClass}
                  value={shifts}
                  onChange={(e) => setShifts(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <p className="text-xs text-neutral-500 pt-1">Berapa karyawan per peran (di luar owner)?</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Kasir</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={empKasir}
                    onChange={(e) => setEmpKasir(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Dapur</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={empDapur}
                    onChange={(e) => setEmpDapur(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Lainnya</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={empLainnya}
                    onChange={(e) => setEmpLainnya(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
              <div className="text-xs text-neutral-500">
                Total {staffTotal} akun staf disarankan (akan dibuatkan manual di menu Staf setelah masuk — biar kamu yang atur email/password
                masing-masing).
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className={labelClass}>Nama Outlet/Merchant (tampil di struk & halaman booking publik)</label>
                <input className={inputClass} value={outletName} onChange={(e) => setOutletName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Nama Pemilik (Owner)</label>
                <input className={inputClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Email Owner (untuk login)</label>
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={viaGoogle}
                  disabled={viaGoogle}
                />
              </div>
              {viaGoogle ? (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  Terverifikasi via Google — tidak perlu password, login berikutnya cukup pakai tombol "Masuk dengan Google".
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Password</label>
                    <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Konfirmasi Password</label>
                    <input type="password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1 text-neutral-300">
                <div>
                  <span className="text-neutral-500">Usaha:</span> {businessName || "-"}
                </div>
                <div>
                  <span className="text-neutral-500">Outlet pertama:</span> {outletName || "-"}
                </div>
                <div>
                  <span className="text-neutral-500">Jumlah cabang:</span> {branchCount}
                </div>
                <div>
                  <span className="text-neutral-500">Unit TV:</span> {tvAndroid} Android, {tvSmart} Smart TV, {tvAnalog} Analog (total {totalTv})
                </div>
                <div>
                  <span className="text-neutral-500">Shift:</span> {shifts} — <span className="text-neutral-500">Karyawan:</span> {empKasir}{" "}
                  kasir, {empDapur} dapur, {empLainnya} lainnya
                </div>
                <div>
                  <span className="text-neutral-500">Owner:</span> {ownerName || "-"} ({email || "-"})
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                Dengan mendaftar, satu outlet {branchCount > 1 ? `(+${branchCount - 1} cabang) ` : ""}dan satu akun Owner akan langsung dibuat,
                lengkap dengan masa percobaan 30 hari.
              </p>
            </div>
          )}
        </div>

        {error && <div className="text-xs text-red-400">{error}</div>}

        <div className="flex gap-2 pt-1">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={goBack} disabled={busy}>
              Kembali
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={goNext}>
              Lanjut
            </Button>
          ) : (
            <Button className="flex-1" onClick={submit} disabled={busy}>
              {busy ? "Memproses..." : "Daftar Sekarang"}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-neutral-600">
          Sudah punya akun?{" "}
          <a href="/login" className="text-cyan-400 hover:underline">
            Masuk di sini
          </a>
        </p>
      </Card>
    </div>
  );
}
