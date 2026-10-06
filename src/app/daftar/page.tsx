"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/client";
import { SEA_BANKS } from "@/lib/data/sea-banks";
import { DAFTAR_COPY, DAFTAR_LANGS, DAFTAR_LANG_STORAGE_KEY, LANDING_LANG_STORAGE_KEY, type DaftarLang } from "./copy";

interface PlanInfo {
  starter: { name: string; pricePerUnit: number; minUnits: number } | null;
  pro: { name: string; priceFlat: number; multiOutletDiscountPct: number } | null;
  annualMonthsCharged: number;
}

const inputClass =
  "w-full mt-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400/50 focus:bg-white/[0.07]";
const labelClass = "text-xs text-neutral-400";

function rupiah(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

const STEP_COUNT = 6;

/** "{a} dan {b}" → teks dengan placeholder diganti. */
function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Seperti fmt(), tapi nilai placeholder boleh berupa elemen React (mis. teks tebal/berwarna/link). */
function rich(template: string, vars: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    return m && m[1] in vars ? <span key={i}>{vars[m[1]]}</span> : <span key={i}>{part}</span>;
  });
}

const isDaftarLang = (v: string | null | undefined): v is DaftarLang => !!v && DAFTAR_LANGS.some((l) => l.code === v);

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

  // Bahasa halaman: ?lang= → pilihan di /login (disimpan bersama) → bahasa landing page → Indonesia.
  const [lang, setLang] = useState<DaftarLang>("id");
  useEffect(() => {
    const q = searchParams.get("lang");
    let saved: string | null = null;
    let landing: string | null = null;
    try {
      saved = window.localStorage.getItem(DAFTAR_LANG_STORAGE_KEY);
      landing = window.localStorage.getItem(LANDING_LANG_STORAGE_KEY);
    } catch {
      // storage diblokir — pakai bawaan
    }
    const pick = [q, saved, landing].find(isDaftarLang);
    if (pick) setLang(pick);
    if (isDaftarLang(q)) {
      try {
        window.localStorage.setItem(DAFTAR_LANG_STORAGE_KEY, q);
      } catch {
        // abaikan
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const changeLang = (code: DaftarLang) => {
    setLang(code);
    try {
      window.localStorage.setItem(DAFTAR_LANG_STORAGE_KEY, code);
    } catch {
      // abaikan
    }
  };
  const t = DAFTAR_COPY[lang];
  const STEPS = t.steps;

  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  // Drives the outlet's display-currency symbol everywhere in the dashboard from day one (see
  // lib/currency/format.ts) — same field editable later in Settings > Business & Tax > Negara.
  // Defaults to Indonesia since that's still NEXBILL's primary market.
  const [country, setCountry] = useState("ID");

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
        setError(t.googleError);
        setGoogleBusy(false);
      }
    } catch {
      setError(t.googleError);
      setGoogleBusy(false);
    }
  };

  const totalTv = tvAndroid + tvSmart + tvAnalog;
  const nonAndroidTv = tvSmart + tvAnalog;
  const preview = useMemo(() => {
    if (!plan) return null;
    const smartPlugQty = nonAndroidTv;
    // Biaya smart plug sengaja TIDAK dihitung/ditampilkan di halaman daftar — cukup jumlah unitnya.
    // Pembelian diarahkan lewat Rekomendasi Produk (kategori smart plug) dari menu Kontrol Perangkat.
    // Estimasi paket: Starter per unit (minimal N unit) vs Pro flat per outlet.
    const starterUnits = plan.starter ? Math.max(plan.starter.minUnits, totalTv) : 0;
    const starterMonthly = plan.starter ? starterUnits * plan.starter.pricePerUnit : null;
    const proMonthly = plan.pro ? plan.pro.priceFlat : null;
    return { smartPlugQty, starterUnits, starterMonthly, proMonthly };
  }, [plan, totalTv, nonAndroidTv]);

  const staffTotal = empKasir + empDapur + empLainnya;

  const goNext = () => {
    setError("");
    if (step === 0 && !businessName.trim()) {
      setError(t.errBusinessName);
      return;
    }
    if (step === 4) {
      if (!outletName.trim()) return setError(t.errOutletName);
      if (!ownerName.trim()) return setError(t.errOwnerName);
      if (!email.trim() || !email.includes("@")) return setError(t.errEmail);
      if (!viaGoogle) {
        if (password.length < 8) return setError(t.errPasswordMin);
        if (password !== confirmPassword) return setError(t.errPasswordMatch);
      }
    }
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
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
    // fetch promise just never resolves. 45s covers even a several-branch signup (each branch
    // re-runs seedChartOfAccounts + ensureDefaultAccountMappings) with real margin — bumped up
    // from the previous 25s, which real registrations were actually exceeding: those two
    // functions used to issue roughly one DB round-trip PER chart-of-accounts/mapping row
    // (~600+ sequential queries for one outlet), so a normal signup could legitimately take
    // longer than 25s even though every row eventually landed in the database in the background
    // (visible in Supabase) — the user just saw this exact timeout error despite the account
    // having been created successfully underneath it. Now fixed at the query level (bulk
    // inserts instead of one-row-at-a-time — see coa.ts/account-mapping.ts), so this should
    // rarely if ever be hit, but the wider margin stays as a safety net.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
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
          country,
          branchCount,
          tv: { android: tvAndroid, smart: tvSmart, analog: tvAnalog },
          shifts,
          employees: { kasir: empKasir, dapur: empDapur, lainnya: empLainnya },
          owner: { name: ownerName, email, password },
          ref: refCode,
          viaGoogleHint: viaGoogle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "google_session_expired") {
          // The bridge cookie (30 min TTL — see google-pending.ts) expired mid-wizard. Drop back
          // to the account step with password fields now visible instead of leaving the user
          // stuck on Review with an error about a field they never saw — they can just set a
          // password and continue without redoing the whole Google flow.
          setViaGoogle(false);
          setStep(4);
        }
        setError(data.error ?? t.errRegister);
        return;
      }
      setResult(data);
    } catch (err: unknown) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? t.errTimeout
          : t.errNetwork
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#05070f] px-3 sm:px-4 py-5 sm:py-10">
        <Card className="w-full max-w-lg space-y-5">
          <div>
            <div className="text-lg font-bold text-cyan-400">{t.successTitle}</div>
            <p className="text-sm text-neutral-400 mt-1">
              {rich(t.successBody, {
                outlet: <span className="text-neutral-100 font-medium">{result.outlet.name}</span>,
                branches: result.branchesCreated > 0 ? fmt(t.successBranches, { n: result.branchesCreated }) : "",
              })}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="text-xs font-semibold text-neutral-300">{t.recTitle}</div>
            <div className="text-sm text-neutral-300 space-y-1">
              <div>
                {t.recSmartPlug} <span className="text-cyan-400 font-medium">{fmt(t.units, { n: result.recommendation.smartPlugQty })}</span> {t.recSmartPlugNote}
              </div>
              {result.recommendation.starterMonthly != null && result.recommendation.proMonthly != null && (
                <div>
                  {t.recPlan} <span className="text-cyan-400 font-medium">{result.recommendation.recommendedPlan === "pro" ? "Pro" : "Starter"}</span> —{" "}
                  {fmt(t.recPlanDetail, { starter: rupiah(result.recommendation.starterMonthly), units: result.recommendation.totalUnits, pro: rupiah(result.recommendation.proMonthly) })}
                </div>
              )}
              <div>
                {t.recStaff} <span className="text-cyan-400 font-medium">{fmt(t.recStaffValue, { n: result.recommendation.staffAccountsSuggested })}</span>{" "}
                {fmt(t.recStaffNote, { shifts: result.recommendation.shifts })}
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500">{t.successNote}</p>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                router.push(result.redirectTo || "/dashboard/billing");
                router.refresh();
              }}
            >
              {t.toBilling}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              {t.toDashboard}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#05070f] px-3 sm:px-4 py-5 sm:py-10">
      <Card className="w-full max-w-lg space-y-4 relative">
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-[#05070f]/90 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            <p className="text-sm text-neutral-300">{t.busyOverlay}</p>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-cyan-400">{t.title}</div>
            <p className="text-sm text-neutral-500">{t.subtitle}</p>
          </div>
          <label className="shrink-0">
            <span className="sr-only">{t.language}</span>
            <select
              aria-label={t.language}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-cyan-400/50"
              value={lang}
              onChange={(e) => changeLang(e.target.value as DaftarLang)}
            >
              {DAFTAR_LANGS.map((l) => (
                <option key={l.code} value={l.code} className="bg-neutral-900">
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {refCode && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {rich(t.referral, { code: <span className="font-mono font-semibold">{refCode}</span>, pct: <span className="font-semibold">20%</span> })}
          </div>
        )}

        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1 rounded-full ${i <= step ? "bg-cyan-400" : "bg-white/10"}`} />
            </div>
          ))}
        </div>
        <div className="text-xs text-neutral-500">
          {fmt(t.stepLabel, { n: step + 1, total: STEP_COUNT, name: STEPS[step] })}
        </div>

        <div className="space-y-3 min-h-[220px]">
          {step === 0 && (
            <>
              {viaGoogle ? (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {rich(t.verifiedGoogle, { email: <span className="font-medium">{email}</span> })}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startGoogleSignup}
                    disabled={googleBusy}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.07] hover:border-white/20 disabled:opacity-60"
                  >
                    {googleBusy ? t.googleButtonBusy : t.googleButton}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] uppercase tracking-wider text-neutral-500">{t.orManual}</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>{t.businessName}</label>
                <input
                  autoFocus
                  className={inputClass}
                  placeholder={t.businessPlaceholder}
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (!outletName) setOutletName(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>{t.address}</label>
                <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t.phone}</label>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t.country}</label>
                <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                  {SEA_BANKS.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-600 mt-1">{t.countryHint}</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className={labelClass}>{t.branchQuestion}</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputClass}
                  value={branchCount}
                  onChange={(e) => setBranchCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                />
              </div>
              <p className="text-xs text-neutral-500">{t.branchHint}</p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-neutral-500">{t.tvQuestion}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>{t.tvAndroid}</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={tvAndroid}
                    onChange={(e) => setTvAndroid(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t.tvSmart}</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={tvSmart}
                    onChange={(e) => setTvSmart(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t.tvAnalog}</label>
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
                      {rich(t.tvSmartPlugNeeded, { n: <span className="text-cyan-400 font-medium">{fmt(t.units, { n: preview.smartPlugQty })}</span> })}
                    </div>
                  )}
                  {totalTv > 0 && preview.starterMonthly != null && preview.proMonthly != null && (
                    <div>
                      {rich(t.tvEstimate, {
                        starter: <span className="text-cyan-400 font-medium">Starter {rupiah(preview.starterMonthly)}{t.perMonth}</span>,
                        units: fmt(t.units, { n: preview.starterUnits }),
                        price: rupiah(plan?.starter?.pricePerUnit ?? 0),
                        min: totalTv < (plan?.starter?.minUnits ?? 0) ? fmt(t.tvMinUnits, { n: plan?.starter?.minUnits ?? 0 }) : "",
                        pro: <span className="text-cyan-400 font-medium">Pro {rupiah(preview.proMonthly)}{t.perMonth}</span>,
                        months: plan?.annualMonthsCharged ?? 10,
                      })}
                    </div>
                  )}
                  {preview.smartPlugQty === 0 && totalTv > 0 && (
                    <div>{t.tvAllAndroid}</div>
                  )}
                  {totalTv === 0 && <div>{t.tvNone}</div>}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className={labelClass}>{t.shiftsQuestion}</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className={inputClass}
                  value={shifts}
                  onChange={(e) => setShifts(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <p className="text-xs text-neutral-500 pt-1">{t.employeesQuestion}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>{t.roleKasir}</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={empKasir}
                    onChange={(e) => setEmpKasir(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t.roleDapur}</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={empDapur}
                    onChange={(e) => setEmpDapur(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t.roleLainnya}</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={empLainnya}
                    onChange={(e) => setEmpLainnya(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
              <div className="text-xs text-neutral-500">{fmt(t.staffTotal, { n: staffTotal })}</div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className={labelClass}>{t.outletName}</label>
                <input className={inputClass} value={outletName} onChange={(e) => setOutletName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t.ownerName}</label>
                <input className={inputClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t.ownerEmail}</label>
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
                  {t.googleNoPassword}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>{t.password}</label>
                    <PasswordInput className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.confirmPassword}</label>
                    <PasswordInput className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1 text-neutral-300">
                <div>
                  <span className="text-neutral-500">{t.reviewBusiness}</span> {businessName || "-"}
                </div>
                <div>
                  <span className="text-neutral-500">{t.reviewOutlet}</span> {outletName || "-"}
                </div>
                <div>
                  <span className="text-neutral-500">{t.reviewBranches}</span> {branchCount}
                </div>
                <div>
                  <span className="text-neutral-500">{t.reviewUnits}</span> {fmt(t.reviewUnitsValue, { a: tvAndroid, s: tvSmart, g: tvAnalog, t: totalTv })}
                </div>
                <div>
                  <span className="text-neutral-500">{t.reviewShift}</span> {shifts} — <span className="text-neutral-500">{t.reviewStaff}</span>{" "}
                  {fmt(t.reviewStaffValue, { k: empKasir, d: empDapur, l: empLainnya })}
                </div>
                <div>
                  <span className="text-neutral-500">{t.reviewOwner}</span> {ownerName || "-"} ({email || "-"})
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                {fmt(t.reviewNote, { branches: branchCount > 1 ? fmt(t.reviewBranchesExtra, { n: branchCount - 1 }) : "" })}
              </p>
            </div>
          )}
        </div>

        {error && <div className="text-xs text-red-400">{error}</div>}

        <div className="flex gap-2 pt-1">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={goBack} disabled={busy}>
              {t.back}
            </Button>
          )}
          {step < STEP_COUNT - 1 ? (
            <Button className="flex-1" onClick={goNext}>
              {t.next}
            </Button>
          ) : (
            <Button className="flex-1" onClick={submit} disabled={busy}>
              {busy ? t.processing : t.submit}
            </Button>
          )}
        </div>

        <p className="text-center text-[11px] text-neutral-600">
          {rich(t.consent, {
            terms: (
              <a href="/syarat-ketentuan" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                {t.terms}
              </a>
            ),
            privacy: (
              <a href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                {t.privacy}
              </a>
            ),
          })}
        </p>

        <p className="text-center text-xs text-neutral-600">
          {t.haveAccount}{" "}
          <a href="/login" className="text-cyan-400 hover:underline">
            {t.loginHere}
          </a>
        </p>
        {/* Catalog auto-picks the language from the browser (no ?lang=). */}
        <p className="text-center text-xs text-neutral-600">
          {t.catalogQuestion}{" "}
          <a href="/downloads/katalog-fitur-nexbill.html" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">
            {t.catalogLink}
          </a>
        </p>
      </Card>
    </div>
  );
}
