"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  UserX,
  BookOpen,
  Calculator,
  CreditCard,
  Gauge,
  Gift,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Receipt,
  Scale,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Tv,
  Users,
  X,
} from "lucide-react";
import { PlatformAdminTopBar } from "./PlatformAdminTopBar";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Menu dikelompokkan supaya 19 item tetap mudah dipindai, terutama di layar sempit. */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Umum",
    items: [{ href: "/platform-admin", label: "Ringkasan", icon: LayoutDashboard }],
  },
  {
    title: "Merchant",
    items: [
      { href: "/platform-admin/outlets", label: "Outlet / Merchant", icon: Store },
      { href: "/platform-admin/leads", label: "Leads & CRM", icon: Users },
      { href: "/platform-admin/whatsapp-bot", label: "WhatsApp Bot (CRM)", icon: MessageCircle },
      { href: "/platform-admin/announcements", label: "Pengumuman", icon: Megaphone },
      { href: "/platform-admin/support", label: "Customer Service", icon: LifeBuoy },
      { href: "/platform-admin/marketplace-disputes", label: "Sengketa Marketplace", icon: Scale },
      { href: "/platform-admin/account-deletions", label: "Hapus Akun (Privasi)", icon: UserX },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { href: "/platform-admin/subscriptions", label: "Penjualan Langganan", icon: Receipt },
      { href: "/platform-admin/cogs", label: "COGS Aplikasi", icon: Calculator },
      { href: "/platform-admin/purchases", label: "Pembelian", icon: ShoppingCart },
      { href: "/platform-admin/performance", label: "Performance", icon: Gauge },
      { href: "/platform-admin/accounting", label: "Accounting per Outlet", icon: BookOpen },
      { href: "/platform-admin/market-risk", label: "Market Risk (Kurs)", icon: TrendingUp },
      { href: "/platform-admin/ipaymu", label: "iPaymu (Gateway)", icon: CreditCard },
    ],
  },
  {
    title: "Produk & Program",
    items: [
      { href: "/platform-admin/plans", label: "Produk Langganan", icon: Package },
      { href: "/platform-admin/products", label: "Etalase Produk", icon: LayoutGrid },
      { href: "/platform-admin/affiliate", label: "Rekomendasi Produk", icon: Sparkles },
      { href: "/platform-admin/referrals", label: "Program Referral", icon: Gift },
    ],
  },
  {
    title: "Perangkat",
    items: [
      { href: "/platform-admin/relay-agents", label: "Relay Agent (TV)", icon: Tv },
      { href: "/platform-admin/hardware", label: "Hardware (Smart Plug)", icon: Plug },
    ],
  },
];

const KUNCI_CIUT = "nexbill.platformAdmin.sidebarCiut";

function aktif(pathname: string, href: string): boolean {
  if (href === "/platform-admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand({ ciut = false }: { ciut?: boolean }) {
  return ciut ? (
    <div className="gm-display text-base font-bold text-amber-400 text-center">N</div>
  ) : (
    <div className="min-w-0">
      <div className="gm-display text-sm font-bold text-amber-400">NEXBILL</div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">Platform Control</div>
    </div>
  );
}

function NavList({ pathname, ciut = false, onNavigate }: { pathname: string; ciut?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain py-3" aria-label="Menu platform">
      {NAV_GROUPS.map((g) => (
        <div key={g.title} className="mb-3 last:mb-0">
          {ciut ? (
            <div className="mx-3 my-2 border-t border-white/5" aria-hidden />
          ) : (
            <div className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">{g.title}</div>
          )}
          <ul className="space-y-0.5 px-2">
            {g.items.map((n) => {
              const on = aktif(pathname, n.href);
              const Icon = n.icon;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={onNavigate}
                    title={ciut ? n.label : undefined}
                    aria-current={on ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg text-sm transition ${
                      ciut ? "justify-center px-0 py-2.5" : "px-3 py-2"
                    } ${
                      on
                        ? "bg-amber-400/10 text-amber-300"
                        : "text-neutral-400 hover:bg-white/5 hover:text-amber-300"
                    }`}
                  >
                    {on && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-amber-400" aria-hidden />}
                    <Icon size={16} className="shrink-0" />
                    {!ciut && <span className="truncate">{n.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Kerangka responsif /platform-admin:
 *  - ≥1024px (desktop/tablet landscape): sidebar tetap (sticky) 240px, bisa diciutkan jadi rail ikon 64px.
 *  - <1024px (ponsel & tablet portrait): sidebar disembunyikan, dibuka lewat tombol menu di top bar
 *    sebagai drawer dari kiri (overlay, tutup dengan Esc/klik luar/pilih menu, scroll halaman dikunci).
 * Konten memakai lebar penuh di layar kecil supaya form & tabel tidak terhimpit sidebar.
 */
export function PlatformAdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/platform-admin";
  const [drawer, setDrawer] = useState(false);
  const [ciut, setCiut] = useState(false);
  const tombolTutupRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setCiut(window.localStorage.getItem(KUNCI_CIUT) === "1");
    } catch {
      /* abaikan */
    }
  }, []);

  const gantiCiut = () => {
    setCiut((v) => {
      try {
        window.localStorage.setItem(KUNCI_CIUT, v ? "0" : "1");
      } catch {
        /* abaikan */
      }
      return !v;
    });
  };

  // Tutup drawer saat pindah halaman.
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  // Saat drawer terbuka: kunci scroll halaman, Esc menutup, fokus ke tombol tutup.
  useEffect(() => {
    if (!drawer) return;
    const semula = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    tombolTutupRef.current?.focus();
    // Kalau layar diperlebar melewati breakpoint desktop, drawer tidak relevan lagi.
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setDrawer(false);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = semula;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [drawer]);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#05060d] text-neutral-100 lg:flex">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex sticky top-0 h-screen shrink-0 flex-col border-r border-white/10 bg-[#07080f] transition-[width] duration-200 ${
          ciut ? "w-16" : "w-60"
        }`}
      >
        <div className={`flex h-14 items-center border-b border-white/10 ${ciut ? "justify-center px-2" : "justify-between px-4"}`}>
          <Brand ciut={ciut} />
        </div>
        <NavList pathname={pathname} ciut={ciut} />
        <button
          type="button"
          onClick={gantiCiut}
          className={`flex items-center gap-2 border-t border-white/10 py-3 text-xs text-neutral-500 hover:text-amber-300 transition ${
            ciut ? "justify-center" : "px-4"
          }`}
          title={ciut ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          aria-label={ciut ? "Lebarkan sidebar" : "Ciutkan sidebar"}
        >
          {ciut ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!ciut && <span>Ciutkan</span>}
        </button>
      </aside>

      {/* Drawer ponsel & tablet */}
      <div className={`lg:hidden fixed inset-0 z-50 ${drawer ? "" : "pointer-events-none"}`} aria-hidden={!drawer}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${drawer ? "opacity-100" : "opacity-0"}`}
          onClick={() => setDrawer(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu platform"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#07080f] shadow-2xl transition-transform duration-200 ease-out pb-[env(safe-area-inset-bottom)] ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex min-h-14 items-center justify-between border-b border-white/10 px-4 pt-[env(safe-area-inset-top)]">
            <Brand />
            <button
              ref={tombolTutupRef}
              type="button"
              onClick={() => setDrawer(false)}
              className="-mr-2 rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
              aria-label="Tutup menu"
              tabIndex={drawer ? 0 : -1}
            >
              <X size={18} />
            </button>
          </div>
          {drawer && <NavList pathname={pathname} onNavigate={() => setDrawer(false)} />}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformAdminTopBar name={name} onMenu={() => setDrawer(true)} />
        {/* Aturan khusus layar <640px untuk seluruh halaman platform-admin (tanpa mengubah tiap halaman):
            - baris "judul ↔ aksi/nominal" (justify-between) boleh turun baris alih-alih meluber ke samping;
            - teks panjang tanpa spasi (email, no. invoice, URL) dipatahkan supaya tidak melebarkan layar.
            Tabel tetap aman karena sudah dibungkus overflow-x-auto dan sel pentingnya whitespace-nowrap. */}
        <main
          className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-sm:[overflow-wrap:anywhere] max-sm:[&_.justify-between]:flex-wrap max-sm:[&_.justify-between]:gap-x-3 max-sm:[&_.justify-between]:gap-y-1"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
