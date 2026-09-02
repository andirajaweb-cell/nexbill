"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { showAlert } from "@/lib/ui/dialog";
import { createClient } from "@/lib/client";
import { PasswordInput } from "@/components/ui/PasswordInput";

type LangCode = "id" | "en" | "ms" | "th" | "fil" | "vi";

interface Copy {
  langName: string;
  flag: string;
  eyebrow: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  badgeOutlets: string;
  badgeUptime: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginButton: string;
  loginButtonBusy: string;
  orDivider: string;
  googleButton: string;
  googleButtonBusy: string;
  googleErrorInactive: string;
  googleErrorGeneric: string;
  noAccount: string;
  signUpLink: string;
  forgotHint: string;
  forgotLink: string;
  footerNote: string;
}

const COPY: Record<LangCode, Copy> = {
  id: {
    langName: "Bahasa Indonesia",
    flag: "🇮🇩",
    eyebrow: "SISTEM BILLING RENTAL PLAYSTATION",
    heroTitle1: "Kelola Rental PS",
    heroTitle2: "Level Premium.",
    heroSubtitle: "Kasir, kontrol TV/konsol otomatis, booking online, dan laporan keuangan — dalam satu dashboard elegan.",
    badgeOutlets: "500+ Outlet Aktif",
    badgeUptime: "Uptime 99.9%",
    welcomeTitle: "Selamat Datang Kembali",
    welcomeSubtitle: "Masuk dengan akun staf outlet kamu.",
    emailLabel: "Email",
    emailPlaceholder: "nama@outlet.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    loginButton: "Masuk",
    loginButtonBusy: "Memproses...",
    orDivider: "atau",
    googleButton: "Masuk dengan Google",
    googleButtonBusy: "Membuka Google...",
    googleErrorInactive: "Akun ini nonaktif — hubungi Superuser outlet kamu.",
    googleErrorGeneric: "Login dengan Google gagal. Coba lagi, atau pakai email & password.",
    noAccount: "Belum punya outlet terdaftar?",
    signUpLink: "Daftar Sekarang",
    forgotHint: "Lupa password?",
    forgotLink: "Reset di sini",
    footerNote: "Sistem billing all-in-one untuk rental PlayStation.",
  },
  en: {
    langName: "English",
    flag: "🇬🇧",
    eyebrow: "PLAYSTATION RENTAL BILLING SYSTEM",
    heroTitle1: "Run Your PS Rental",
    heroTitle2: "Like a Premium Brand.",
    heroSubtitle: "POS checkout, automatic TV/console control, online booking, and financial reports — all in one elegant dashboard.",
    badgeOutlets: "500+ Active Outlets",
    badgeUptime: "99.9% Uptime",
    welcomeTitle: "Welcome Back",
    welcomeSubtitle: "Sign in with your outlet staff account.",
    emailLabel: "Email",
    emailPlaceholder: "name@outlet.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    loginButton: "Sign In",
    loginButtonBusy: "Signing in...",
    orDivider: "or",
    googleButton: "Sign in with Google",
    googleButtonBusy: "Opening Google...",
    googleErrorInactive: "This account is inactive — contact your outlet's Superuser.",
    googleErrorGeneric: "Google sign-in failed. Try again, or use email & password.",
    noAccount: "Don't have an outlet yet?",
    signUpLink: "Sign Up Now",
    forgotHint: "Forgot your password?",
    forgotLink: "Reset it here",
    footerNote: "The all-in-one billing system for PlayStation rentals.",
  },
  ms: {
    langName: "Bahasa Malaysia",
    flag: "🇲🇾",
    eyebrow: "SISTEM PENGEBILAN SEWAAN PLAYSTATION",
    heroTitle1: "Urus Sewaan PS",
    heroTitle2: "Bertaraf Premium.",
    heroSubtitle: "Kaunter jualan, kawalan TV/konsol automatik, tempahan dalam talian, dan laporan kewangan — dalam satu papan pemuka yang elegan.",
    badgeOutlets: "500+ Outlet Aktif",
    badgeUptime: "Masa Aktif 99.9%",
    welcomeTitle: "Selamat Kembali",
    welcomeSubtitle: "Log masuk dengan akaun staf outlet anda.",
    emailLabel: "Emel",
    emailPlaceholder: "nama@outlet.com",
    passwordLabel: "Kata Laluan",
    passwordPlaceholder: "••••••••",
    loginButton: "Log Masuk",
    loginButtonBusy: "Memproses...",
    orDivider: "atau",
    googleButton: "Log Masuk dengan Google",
    googleButtonBusy: "Membuka Google...",
    googleErrorInactive: "Akaun ini tidak aktif — hubungi Superuser outlet anda.",
    googleErrorGeneric: "Log masuk Google gagal. Cuba lagi, atau guna emel & kata laluan.",
    noAccount: "Belum ada outlet berdaftar?",
    signUpLink: "Daftar Sekarang",
    forgotHint: "Lupa kata laluan?",
    forgotLink: "Tetapkan semula di sini",
    footerNote: "Sistem pengebilan lengkap untuk sewaan PlayStation.",
  },
  th: {
    langName: "ภาษาไทย",
    flag: "🇹🇭",
    eyebrow: "ระบบเรียกเก็บเงินร้านเช่าเพลย์สเตชัน",
    heroTitle1: "บริหารร้านเช่า PS",
    heroTitle2: "ระดับพรีเมียม",
    heroSubtitle: "ระบบขายหน้าร้าน ควบคุมทีวี/เครื่องเล่นอัตโนมัติ จองออนไลน์ และรายงานการเงิน — ในแดชบอร์ดเดียวที่หรูหรา",
    badgeOutlets: "ร้านค้าใช้งานกว่า 500 แห่ง",
    badgeUptime: "อัปไทม์ 99.9%",
    welcomeTitle: "ยินดีต้อนรับกลับ",
    welcomeSubtitle: "เข้าสู่ระบบด้วยบัญชีพนักงานร้านของคุณ",
    emailLabel: "อีเมล",
    emailPlaceholder: "name@outlet.com",
    passwordLabel: "รหัสผ่าน",
    passwordPlaceholder: "••••••••",
    loginButton: "เข้าสู่ระบบ",
    loginButtonBusy: "กำลังดำเนินการ...",
    orDivider: "หรือ",
    googleButton: "เข้าสู่ระบบด้วย Google",
    googleButtonBusy: "กำลังเปิด Google...",
    googleErrorInactive: "บัญชีนี้ไม่ได้ใช้งาน — ติดต่อ Superuser ของร้านคุณ",
    googleErrorGeneric: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองอีกครั้ง หรือใช้อีเมลและรหัสผ่าน",
    noAccount: "ยังไม่มีร้านที่ลงทะเบียน?",
    signUpLink: "สมัครตอนนี้",
    forgotHint: "ลืมรหัสผ่าน?",
    forgotLink: "รีเซ็ตที่นี่",
    footerNote: "ระบบเรียกเก็บเงินครบวงจรสำหรับร้านเช่าเพลย์สเตชัน",
  },
  fil: {
    langName: "Filipino",
    flag: "🇵🇭",
    eyebrow: "SISTEMA NG BILLING PARA SA PS RENTAL",
    heroTitle1: "Pamahalaan ang PS Rental Mo",
    heroTitle2: "Nang Premium.",
    heroSubtitle: "POS checkout, awtomatikong kontrol ng TV/console, online booking, at mga ulat pinansyal — lahat sa isang eleganteng dashboard.",
    badgeOutlets: "500+ Aktibong Outlet",
    badgeUptime: "99.9% Uptime",
    welcomeTitle: "Maligayang Pagbabalik",
    welcomeSubtitle: "Mag-sign in gamit ang account ng staff ng outlet mo.",
    emailLabel: "Email",
    emailPlaceholder: "pangalan@outlet.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    loginButton: "Mag-sign In",
    loginButtonBusy: "Nagpo-proseso...",
    orDivider: "o",
    googleButton: "Mag-sign in gamit ang Google",
    googleButtonBusy: "Binubuksan ang Google...",
    googleErrorInactive: "Hindi aktibo ang account na ito — makipag-ugnayan sa Superuser ng outlet mo.",
    googleErrorGeneric: "Nabigo ang pag-sign in gamit ang Google. Subukan ulit, o gamitin ang email at password.",
    noAccount: "Wala ka pang naka-rehistrong outlet?",
    signUpLink: "Mag-sign Up Ngayon",
    forgotHint: "Nakalimutan ang password?",
    forgotLink: "I-reset dito",
    footerNote: "Ang all-in-one na billing system para sa PS rental.",
  },
  vi: {
    langName: "Tiếng Việt",
    flag: "🇻🇳",
    eyebrow: "HỆ THỐNG TÍNH TIỀN CHO THUÊ PLAYSTATION",
    heroTitle1: "Vận Hành Cửa Hàng Cho Thuê PS",
    heroTitle2: "Đẳng Cấp Cao Cấp.",
    heroSubtitle: "Thu ngân, điều khiển TV/máy chơi game tự động, đặt chỗ trực tuyến và báo cáo tài chính — tất cả trong một dashboard sang trọng.",
    badgeOutlets: "500+ Cửa Hàng Hoạt Động",
    badgeUptime: "Uptime 99.9%",
    welcomeTitle: "Chào Mừng Trở Lại",
    welcomeSubtitle: "Đăng nhập bằng tài khoản nhân viên cửa hàng của bạn.",
    emailLabel: "Email",
    emailPlaceholder: "ten@outlet.com",
    passwordLabel: "Mật khẩu",
    passwordPlaceholder: "••••••••",
    loginButton: "Đăng Nhập",
    loginButtonBusy: "Đang xử lý...",
    orDivider: "hoặc",
    googleButton: "Đăng nhập với Google",
    googleButtonBusy: "Đang mở Google...",
    googleErrorInactive: "Tài khoản này không hoạt động — liên hệ Superuser của cửa hàng bạn.",
    googleErrorGeneric: "Đăng nhập bằng Google thất bại. Thử lại, hoặc dùng email & mật khẩu.",
    noAccount: "Chưa có cửa hàng đăng ký?",
    signUpLink: "Đăng Ký Ngay",
    forgotHint: "Quên mật khẩu?",
    forgotLink: "Đặt lại tại đây",
    footerNote: "Hệ thống tính tiền trọn gói cho dịch vụ cho thuê PlayStation.",
  },
};

const LANG_OPTIONS: LangCode[] = ["id", "en", "ms", "th", "fil", "vi"];
const LANG_STORAGE_KEY = "nexbill_login_lang";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.6 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.6 3.5 24 3.5c-7.5 0-14 4.2-17.7 10.4z" />
      <path fill="#4CAF50" d="M24 44.5c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 26.9 36.5 24 36.5c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.9 40.2 16.4 44.5 24 44.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.4-4.5 5.9l6.6 5.4c-.5.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Both fields start readOnly purely to defeat Chrome/Edge's on-load autofill (a plain
  // autoComplete="off" is ignored on login forms) — state-driven, not a raw DOM
  // removeAttribute(), because React re-asserts a literal `readOnly` prop on every re-render
  // (e.g. the one triggered by the very first keystroke's onChange), which silently made the
  // field un-typable again after one character. Flipping real state on focus means React itself
  // drops the attribute and keeps it dropped across every future re-render.
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [lang, setLang] = useState<LangCode>("id");
  const [langOpen, setLangOpen] = useState(false);
  const t = COPY[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY) as LangCode | null;
    if (saved && LANG_OPTIONS.includes(saved)) setLang(saved);
  }, []);

  // Surfaces the redirect from /api/auth/google/callback when Google sign-in couldn't complete
  // (?error=google_inactive|google_failed|google_no_code) — see that route for when each fires.
  useEffect(() => {
    const err = params.get("error");
    if (!err) return;
    showAlert(err === "google_inactive" ? t.googleErrorInactive : t.googleErrorGeneric);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const startGoogleLogin = async () => {
    setGoogleBusy(true);
    try {
      const supabase = createClient();
      const next = params.get("next") || "/dashboard";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/api/auth/google/callback?next=${encodeURIComponent(next)}` },
      });
      if (oauthError) {
        showAlert(t.googleErrorGeneric);
        setGoogleBusy(false);
      }
      // On success the browser navigates away to Google immediately, so no need to reset busy.
    } catch {
      showAlert(t.googleErrorGeneric);
      setGoogleBusy(false);
    }
  };

  const pickLang = (code: LangCode) => {
    setLang(code);
    window.localStorage.setItem(LANG_STORAGE_KEY, code);
    setLangOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login gagal.");
        return;
      }
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 lg:px-8">
      <div className="relative w-full max-w-6xl">
        {/* Ambient premium glow specific to this page, layered on top of the global gm-body ambience */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(480px circle at 15% 20%, rgba(59,130,246,0.16), transparent 60%), radial-gradient(520px circle at 85% 80%, rgba(37,99,235,0.16), transparent 60%)",
          }}
        />

        {/* Top bar: brand + language selector */}
        <div className="flex items-center justify-between mb-6 px-1">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center">
              <span className="gm-display font-bold text-neutral-950 text-sm">N</span>
            </div>
            <span className="gm-display font-bold text-lg tracking-wide text-white">NEXBILL</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-neutral-200 hover:border-blue-400/40 hover:bg-white/10 transition"
            >
              <span className="text-base leading-none">{t.flag}</span>
              <span className="hidden sm:inline">{t.langName}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${langOpen ? "rotate-180" : ""}`}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0b0f1e]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-20">
                {LANG_OPTIONS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => pickLang(code)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
                      code === lang ? "bg-blue-400/10 text-blue-300" : "text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base leading-none">{COPY[code].flag}</span>
                    {COPY[code].langName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main split panel */}
        <div className="grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] bg-[#080b16]">
          {/* Left: hero image */}
          <div className="relative hidden lg:block min-h-[640px]">
            <Image
              src="/login/hero-ps-rental.jpg"
              alt="NEXBILL — rental PlayStation"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 0px"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(5,7,15,0.15) 0%, rgba(5,7,15,0.35) 55%, rgba(5,7,15,0.92) 100%), linear-gradient(90deg, rgba(5,7,15,0.55) 0%, transparent 35%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-10 space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-blue-300">
                {t.eyebrow}
              </span>
              <h1 className="gm-display text-4xl xl:text-[2.6rem] font-extrabold leading-[1.08] text-white">
                {t.heroTitle1}
                <br />
                <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-sky-500 bg-clip-text text-transparent">{t.heroTitle2}</span>
              </h1>
              <p className="gm-heading text-sm text-neutral-300 max-w-sm leading-relaxed">{t.heroSubtitle}</p>
              <div className="flex items-center gap-3 pt-2">
                <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] text-neutral-300 backdrop-blur">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  {t.badgeOutlets}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] text-neutral-300 backdrop-blur">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
                  {t.badgeUptime}
                </span>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="flex items-center justify-center p-8 sm:p-12 lg:p-14 bg-[#0a0d1a]">
            <div className="w-full max-w-sm space-y-7">
              <div className="space-y-1.5">
                <h2 className="gm-display text-[1.65rem] font-bold text-white">{t.welcomeTitle}</h2>
                <p className="text-sm text-neutral-400">{t.welcomeSubtitle}</p>
              </div>

              <form onSubmit={submit} className="space-y-4" autoComplete="off">
                <div>
                  <label className="text-xs font-medium text-neutral-400">{t.emailLabel}</label>
                  <input
                    type="email"
                    name="nexbill_login_email"
                    autoFocus
                    required
                    autoComplete="off"
                    readOnly={!emailUnlocked}
                    onFocus={() => setEmailUnlocked(true)}
                    placeholder={t.emailPlaceholder}
                    className="w-full mt-1.5 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400">{t.passwordLabel}</label>
                  <PasswordInput
                    name="nexbill_login_password"
                    required
                    autoComplete="new-password"
                    readOnly={!passwordUnlocked}
                    onFocus={() => setPasswordUnlocked(true)}
                    placeholder={t.passwordPlaceholder}
                    wrapperClassName="mt-1.5"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && <div className="text-xs text-rose-400">{error}</div>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)] hover:shadow-[0_14px_38px_-8px_rgba(37,99,235,0.85)] hover:brightness-110"
                >
                  {busy ? t.loginButtonBusy : t.loginButton}
                </button>

                <p className="text-center text-[11px] text-neutral-500">
                  {t.forgotHint}{" "}
                  <Link href="/lupa-password" className="font-medium text-blue-300 hover:text-blue-200 transition">
                    {t.forgotLink}
                  </Link>
                </p>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">{t.orDivider}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={startGoogleLogin}
                disabled={googleBusy}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.07] hover:border-white/20 disabled:opacity-60"
              >
                <GoogleIcon />
                {googleBusy ? t.googleButtonBusy : t.googleButton}
              </button>

              <p className="text-center text-sm text-neutral-400">
                {t.noAccount}{" "}
                <Link href="/daftar" className="font-medium text-blue-300 hover:text-blue-200 transition">
                  {t.signUpLink}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-600 mt-6">{t.footerNote}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
