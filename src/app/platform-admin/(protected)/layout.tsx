import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlatformSession } from "@/lib/auth/platform-session";
import { PlatformAdminTopBar } from "@/components/platform-admin/PlatformAdminTopBar";

const NAV = [
  { href: "/platform-admin", label: "Ringkasan" },
  { href: "/platform-admin/outlets", label: "Outlet / Merchant" },
  { href: "/platform-admin/announcements", label: "Pengumuman" },
  { href: "/platform-admin/subscriptions", label: "Penjualan Langganan" },
  { href: "/platform-admin/cogs", label: "COGS Aplikasi" },
  { href: "/platform-admin/purchases", label: "Pembelian" },
  { href: "/platform-admin/performance", label: "Performance" },
  { href: "/platform-admin/accounting", label: "Accounting per Outlet" },
  { href: "/platform-admin/support", label: "Customer Service" },
  { href: "/platform-admin/plans", label: "Produk Langganan" },
  { href: "/platform-admin/market-risk", label: "Market Risk (Kurs)" },
  { href: "/platform-admin/products", label: "Etalase Produk" },
  { href: "/platform-admin/affiliate", label: "Rekomendasi Produk" },
  { href: "/platform-admin/referrals", label: "Program Referral" },
  { href: "/platform-admin/tuya", label: "Tuya Cloud API" },
  { href: "/platform-admin/relay-agents", label: "Relay Agent (TV)" },
];

/**
 * Server-guarded shell for the entire /platform-admin/** tree (except /platform-admin/login,
 * which lives outside this segment on purpose so the redirect below can't loop). Deliberately
 * its own layout — no <Sidebar>/<TopBar> from the outlet dashboard, no shared nav — so there is
 * zero code path connecting an outlet's staff session to this cross-tenant control panel. An
 * outlet superuser hitting /platform-admin directly just gets redirected to this panel's own
 * login, which their staff credentials can never pass (see /api/platform-admin/auth/login).
 */
export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getPlatformSession();
  if (!session) redirect("/platform-admin/login");

  return (
    <div className="min-h-screen bg-[#05060d] text-neutral-100 flex">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-[#07080f] flex flex-col">
        <div className="px-4 py-4 border-b border-white/10">
          <div className="gm-display text-sm font-bold text-amber-400">NEXBILL</div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Platform Control</div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block px-4 py-2 text-sm text-neutral-400 hover:text-amber-300 hover:bg-white/5 transition"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <PlatformAdminTopBar name={session.name} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
