"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { setEffectivePermissions, type StaffRole } from "@/lib/auth/permissions";

export interface LinkedOutlet {
  id: string;
  name: string;
  slug: string | null;
  isHome: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  outletId: string;
  // ISO 3166-1 alpha-2 country code (Settings > Business & Tax > Negara) — drives the outlet's
  // display-currency symbol/format everywhere via useCurrency() in lib/currency/client.tsx. Null
  // for outlets that haven't set a country yet (falls back to IDR/Rp).
  outletCountry?: string | null;
  // Settings > Preferensi > Format Lainnya — see lib/format/client.tsx's useOutletFormat(), which
  // is the intended way to read these rather than reaching into `user` directly.
  decimalStyle?: "id" | "us";
  decimalPlaces?: number;
  dateFormat?: "dmy" | "mdy" | "iso";
  // Email verification module — see /api/auth/verify-email + EmailVerificationBanner. Defaults
  // to true server-side (schema.ts's own default) whenever it can't be read for some reason, so
  // an undefined/missing value here should never be treated as "unverified" by UI code.
  emailVerified?: boolean;
  /** Akun demo publik (kredensial di landing page) — lihat lib/auth/demo-account.ts. */
  isDemo?: boolean;
  permissions?: string[];
  // Every outlet this account can switch into (always includes the home/current one — see
  // GET /api/auth/me). Length 1 for the common single-outlet case; the TopBar outlet
  // switcher only renders when this has more than one entry.
  linkedOutlets?: LinkedOutlet[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          // Satu perangkat aktif per akun: sesi browser ini sudah diganti/dikeluarkan. Bersihkan
          // cookie-nya dan kembali ke login dengan penjelasan (hanya dari halaman dashboard).
          if (body?.code === "SESSION_ENDED" && typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
            await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
            window.location.href = "/login?error=session_ended";
            return;
          }
        }
        const data: AuthUser | null = res.ok ? await res.json() : null;
        setUser(data);
        rememberUserForOffline(data);
        // Warms this tab's in-memory permission cache (see permissions.ts) so
        // hasPermission() checks made directly in client-component render
        // reflect the DB-edited matrix, not just the hardcoded defaults.
        if (data?.permissions) setEffectivePermissions(data.role as StaffRole, data.permissions);
      })
      // Network failure (not a 401): the outlet's internet is down. Keep the last account known on
      // this device so the dashboard — above all the Mode Offline cashier board — keeps working;
      // nothing is trusted from this server-side, every synced action is re-authorized there.
      .catch(() => {
        const cached = cachedOfflineUser();
        setUser(cached);
        if (cached?.permissions) setEffectivePermissions(cached.role as StaffRole, cached.permissions);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Periksa ulang saat tab kembali aktif dan setiap 2 menit, supaya browser yang sesinya sudah
  // dikeluarkan tidak terus menampilkan dashboard kosong tanpa penjelasan.
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState !== "visible" || !window.location.pathname.startsWith("/dashboard")) return;
      fetch("/api/auth/me").then(async (res) => {
        if (res.status !== 401) return;
        const body = await res.json().catch(() => ({}));
        if (body?.code === "SESSION_ENDED") {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          window.location.href = "/login?error=session_ended";
        }
      }).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", recheck);
    const timer = window.setInterval(recheck, 120_000);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.clearInterval(timer);
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    rememberUserForOffline(null);
    // Saved dashboard pages (Mode Offline, public/sw.js) belong to this account — drop them.
    navigator.serviceWorker?.controller?.postMessage({ type: "clear-pages" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  return <AuthContext.Provider value={{ user, loading, logout, refresh: load }}>{children}</AuthContext.Provider>;
}

const OFFLINE_USER_KEY = "nexbill_offline_user";

/** Last signed-in account on this device — Mode Offline fallback only (see load() above). */
function rememberUserForOffline(user: AuthUser | null) {
  try {
    if (user) window.localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(OFFLINE_USER_KEY);
  } catch {
    // storage blocked — offline fallback simply unavailable
  }
}

function cachedOfflineUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  return useContext(AuthContext);
}

/** True for the top-level role allowed to bypass approval workflows and access the admin data panel. */
export function isSuperRole(role: string | undefined) {
  return role === "superuser";
}
