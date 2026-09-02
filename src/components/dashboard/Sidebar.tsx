"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Gamepad2,
  CalendarClock,
  ShoppingCart,
  Package,
  Tag,
  CreditCard,
  MessageCircle,
  Radio,
  BarChart3,
  Calculator,
  Users,
  Wallet,
  ShieldCheck,
  ChefHat,
  MonitorSmartphone,
  LogOut,
  Database,
  Receipt,
  Boxes,
  Settings,
  Sparkles,
  ClipboardList,
  Smartphone,
  Coins,
  Truck,
  CreditCard as BillingIcon,
  Building2,
  HelpCircle,
  Gift,
  Wrench,
  Share2,
} from "lucide-react";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { roleLabel, type StaffRole } from "@/lib/auth/permissions";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

const nav = [
  { href: "/dashboard", key: "nav.summary", icon: LayoutDashboard },
  { href: "/dashboard/rental", key: "nav.rental", icon: Gamepad2 },
  { href: "/dashboard/billing-board", key: "nav.billingBoard", icon: MonitorSmartphone },
  { href: "/dashboard/booking", key: "nav.booking", icon: CalendarClock },
  { href: "/dashboard/pos", key: "nav.pos", icon: ShoppingCart },
  { href: "/dashboard/transactions", key: "nav.transactions", icon: ClipboardList },
  { href: "/dashboard/ppob", key: "nav.ppob", icon: Smartphone },
  { href: "/dashboard/inventory", key: "nav.inventory", icon: Package },
  { href: "/dashboard/promo", key: "nav.promo", icon: Tag },
  { href: "/dashboard/membership", key: "nav.membership", icon: Users },
  { href: "/dashboard/shift", key: "nav.shift", icon: Wallet },
  { href: "/dashboard/devices", key: "nav.devices", icon: Radio },
  { href: "/dashboard/payments", key: "nav.payments", icon: CreditCard },
  { href: "/dashboard/billing", key: "nav.billing", icon: BillingIcon },
  { href: "/dashboard/rekomendasi-produk", key: "nav.affiliateShowcase", icon: Gift },
  { href: "/dashboard/referral", key: "nav.referral", icon: Share2 },
  { href: "/dashboard/accounting", key: "nav.accounting", icon: Calculator },
  { href: "/dashboard/expenses", key: "nav.expenses", icon: Receipt },
  { href: "/dashboard/other-income", key: "nav.otherIncome", icon: Coins },
  { href: "/dashboard/assets", key: "nav.assets", icon: Boxes },
  { href: "/dashboard/maintenance", key: "nav.maintenance", icon: Wrench },
  { href: "/dashboard/staff", key: "nav.staff", icon: ShieldCheck },
  { href: "/dashboard/kitchen", key: "nav.kitchen", icon: ChefHat },
  { href: "/dashboard/chat", key: "nav.chat", icon: MessageCircle },
  { href: "/dashboard/reports", key: "nav.reports", icon: BarChart3 },
  { href: "/dashboard/ai", key: "nav.ai", icon: Sparkles },
  { href: "/dashboard/settings", key: "nav.settings", icon: Settings },
  { href: "/dashboard/help", key: "nav.help", icon: HelpCircle },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useDashboardLang();
  const superuser = isSuperRole(user?.role);
  const [homeRentalEnabled, setHomeRentalEnabled] = useState(false);
  // PPOB defaults to true (not false, unlike Home Rental) because it's an already-live feature —
  // see defaultEnabled on PPOB_ENABLED in lib/home-rental/feature-flags.ts. Starting the nav item
  // visible avoids a flash-of-hidden-menu before the flag fetch resolves for the common case
  // (module left ON), at the cost of a brief flash-of-visible-menu in the rare case an outlet
  // actually turned it off — an acceptable tradeoff since that's the minority state.
  const [ppobEnabled, setPpobEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchJsonObject<{ flags: { key: string; effectiveEnabled: boolean }[] }>("/api/feature-flags")
      .then((d) => {
        setHomeRentalEnabled(!!d?.flags.find((f) => f.key === "HOME_RENTAL_ENABLED")?.effectiveEnabled);
        const ppobFlag = d?.flags.find((f) => f.key === "PPOB_ENABLED");
        setPpobEnabled(ppobFlag ? ppobFlag.effectiveEnabled : true);
      })
      .catch(() => setHomeRentalEnabled(false));
  }, [user]);

  // AI Business Intelligence is Owner/Superuser only (assertAiRoleAllowed in
  // lib/subscription/service.ts) and, for Owner, additionally gated on a paid AI Add-on/trial
  // (see /dashboard/ai's own paywall card) — hide the nav entry entirely for roles that can never
  // reach it (Manager/Supervisor/Akuntan/Kasir/Dapur) rather than let them click into a
  // role-restricted message. Owner still sees it even unpaid, so they can discover and upgrade.
  const aiAllowedRole = user?.role === "superuser" || user?.role === "owner";

  let items: { href: string; key: string; icon: typeof LayoutDashboard }[] = (
    homeRentalEnabled ? [...nav, { href: "/dashboard/home-rental", key: "nav.homeRental", icon: Truck }] : [...nav]
  )
    .filter((n) => n.href !== "/dashboard/ppob" || ppobEnabled)
    .filter((n) => n.href !== "/dashboard/ai" || aiAllowedRole);
  if (superuser) items = [...items, { href: "/dashboard/admin", key: "nav.adminData", icon: Database }];
  // Only shown for accounts linked to more than one outlet (see outletMemberships) — the
  // common single-outlet case never sees this entry at all.
  if (user?.linkedOutlets && user.linkedOutlets.length > 1) {
    items = [items[0], { href: "/dashboard/semua-outlet", key: "nav.allOutlets", icon: Building2 }, ...items.slice(1)];
  }

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#070b18]/90 backdrop-blur-md p-3 flex flex-col gap-1">
      <div className="mb-3 px-2 py-2 flex items-center gap-2.5">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 shadow-[0_0_14px_rgba(34,211,238,0.35)]">
          <Gamepad2 size={18} className="text-cyan-300" />
        </div>
        <div className="min-w-0">
          <div className="gm-display gm-gradient-title text-base font-extrabold leading-tight truncate">NEXBILL</div>
          <div className="text-[9px] uppercase tracking-wider text-neutral-500 truncate">{t("sidebar.tagline")}</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto pr-1">
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-gradient-to-r from-cyan-500/15 to-purple-500/10 text-cyan-300 border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                  : "text-neutral-400 border border-transparent hover:bg-white/5 hover:text-neutral-100"
              )}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
              <Icon size={16} />
              <span className="truncate">{t(key)}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-2 border-t border-white/10 pt-3 px-2">
        {user ? (
          <>
            <div className="text-sm font-medium truncate text-neutral-200">{user.name}</div>
            <div className="text-xs text-neutral-500 mb-2">{roleLabel(user.role as StaffRole)}</div>
          </>
        ) : (
          <div className="text-xs text-amber-400 mb-2">{t("sidebar.invalidSession")}</div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-rose-400 transition"
        >
          <LogOut size={13} /> {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
