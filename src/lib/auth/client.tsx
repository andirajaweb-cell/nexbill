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
  // Email verification module — see /api/auth/verify-email + EmailVerificationBanner. Defaults
  // to true server-side (schema.ts's own default) whenever it can't be read for some reason, so
  // an undefined/missing value here should never be treated as "unverified" by UI code.
  emailVerified?: boolean;
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
        const data: AuthUser | null = res.ok ? await res.json() : null;
        setUser(data);
        // Warms this tab's in-memory permission cache (see permissions.ts) so
        // hasPermission() checks made directly in client-component render
        // reflect the DB-edited matrix, not just the hardcoded defaults.
        if (data?.permissions) setEffectivePermissions(data.role as StaffRole, data.permissions);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  return <AuthContext.Provider value={{ user, loading, logout, refresh: load }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** True for the top-level role allowed to bypass approval workflows and access the admin data panel. */
export function isSuperRole(role: string | undefined) {
  return role === "superuser";
}
