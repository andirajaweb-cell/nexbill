/**
 * Susunan menu samping dashboard: dikelompokkan, dan hanya menampilkan menu yang memang bisa
 * dipakai peran pengguna (izin efektif dari lib/auth/permissions.ts). MURNI — diuji di menu.test.ts.
 *
 * Kenapa: sebelumnya ±30 menu berderet tanpa kelompok dan SAMA untuk semua peran — kasir melihat
 * Akuntansi, Aset, dan Pengaturan yang hanya akan menolak mereka. Pemilik awam kewalahan, kasir
 * bingung. Halaman tetap dijaga di server; ini soal apa yang ditawarkan di menu.
 */
import type { Permission } from "@/lib/auth/permissions";

export type NavGroup = "operations" | "customers" | "finance" | "devices" | "growth" | "admin";

export interface NavItem {
  href: string;
  /** Kunci terjemahan label (dict-shell). */
  key: string;
  group: NavGroup;
  /** Menu tampil bila peran punya SALAH SATU izin ini. Kosong/tidak ada = semua peran (kecuali dapur). */
  anyOf?: Permission[];
}

export const NAV_GROUPS: { id: NavGroup; key: string; fallback: string }[] = [
  { id: "operations", key: "nav.group.operations", fallback: "Operasional" },
  { id: "customers", key: "nav.group.customers", fallback: "Pelanggan & Produk" },
  { id: "finance", key: "nav.group.finance", fallback: "Keuangan" },
  { id: "devices", key: "nav.group.devices", fallback: "Perangkat" },
  { id: "growth", key: "nav.group.growth", fallback: "Tumbuh" },
  { id: "admin", key: "nav.group.admin", fallback: "Pengaturan & Bantuan" },
];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "nav.summary", group: "operations" },
  { href: "/dashboard/rental", key: "nav.rental", group: "operations" },
  { href: "/dashboard/billing-board", key: "nav.billingBoard", group: "operations" },
  { href: "/dashboard/booking", key: "nav.booking", group: "operations", anyOf: ["manage_bookings"] },
  { href: "/dashboard/pos", key: "nav.pos", group: "operations" },
  { href: "/dashboard/transactions", key: "nav.transactions", group: "operations" },
  { href: "/dashboard/shift", key: "nav.shift", group: "operations" },
  { href: "/dashboard/home-rental", key: "nav.homeRental", group: "operations", anyOf: ["manage_home_rental"] },
  { href: "/dashboard/ppob", key: "nav.ppob", group: "operations", anyOf: ["manage_ppob"] },
  { href: "/dashboard/kitchen", key: "nav.kitchen", group: "operations", anyOf: ["kitchen_display"] },

  { href: "/dashboard/membership", key: "nav.membership", group: "customers", anyOf: ["manage_membership", "manage_pricing_promo"] },
  { href: "/dashboard/promo", key: "nav.promo", group: "customers", anyOf: ["manage_pricing_promo"] },
  { href: "/dashboard/inventory", key: "nav.inventory", group: "customers", anyOf: ["manage_inventory_purchasing", "manage_pricing_promo", "manage_supplier_purchase_history"] },

  { href: "/dashboard/accounting", key: "nav.accounting", group: "finance", anyOf: ["view_accounting"] },
  { href: "/dashboard/expenses", key: "nav.expenses", group: "finance", anyOf: ["manage_expenses", "approve_expenses", "void_expense"] },
  { href: "/dashboard/other-income", key: "nav.otherIncome", group: "finance", anyOf: ["manage_other_income"] },
  { href: "/dashboard/assets", key: "nav.assets", group: "finance", anyOf: ["manage_assets"] },
  { href: "/dashboard/reports", key: "nav.reports", group: "finance", anyOf: ["view_reports"] },
  { href: "/dashboard/payments", key: "nav.payments", group: "finance", anyOf: ["manage_settings"] },
  { href: "/dashboard/billing", key: "nav.billing", group: "finance", anyOf: ["manage_settings"] },

  { href: "/dashboard/devices", key: "nav.devices", group: "devices", anyOf: ["manage_devices"] },
  { href: "/dashboard/maintenance", key: "nav.maintenance", group: "devices", anyOf: ["manage_devices", "manage_assets", "approve_requests"] },

  { href: "/dashboard/ai", key: "nav.ai", group: "growth", anyOf: ["view_dashboard_owner"] },
  { href: "/dashboard/marketplace", key: "nav.marketplace", group: "growth", anyOf: ["manage_marketplace"] },
  { href: "/dashboard/rekomendasi-produk", key: "nav.affiliateShowcase", group: "growth", anyOf: ["view_dashboard_owner"] },
  { href: "/dashboard/referral", key: "nav.referral", group: "growth", anyOf: ["view_dashboard_owner"] },

  { href: "/dashboard/staff", key: "nav.staff", group: "admin", anyOf: ["manage_staff"] },
  { href: "/dashboard/settings", key: "nav.settings", group: "admin", anyOf: ["manage_settings"] },
  { href: "/dashboard/chat", key: "nav.chat", group: "admin" },
  { href: "/dashboard/help", key: "nav.help", group: "admin" },
];

/** Menu yang selalu tersedia untuk peran Dapur (yang hanya punya izin layar dapur). */
const KITCHEN_ONLY = new Set(["/dashboard/kitchen", "/dashboard/chat", "/dashboard/help"]);

export interface NavContext {
  role: string;
  can: (p: Permission) => boolean;
  homeRentalEnabled: boolean;
  ppobEnabled: boolean;
  /** Akun yang terhubung ke lebih dari satu outlet → menu "Semua Outlet". */
  multiOutlet: boolean;
}

/** Menu yang terlihat, dikelompokkan dan berurutan; kelompok tanpa menu tidak ditampilkan. */
export function visibleNav(ctx: NavContext): { group: (typeof NAV_GROUPS)[number]; items: NavItem[] }[] {
  const superuser = ctx.role === "superuser";
  const kitchenOnly = ctx.role === "kitchen";
  const allowed = (it: NavItem) => {
    if (it.href === "/dashboard/home-rental" && !ctx.homeRentalEnabled) return false;
    if (it.href === "/dashboard/ppob" && !ctx.ppobEnabled) return false;
    if (superuser) return true;
    if (kitchenOnly) return KITCHEN_ONLY.has(it.href);
    // AI Business Assistant: Owner/Superuser saja (assertAiRoleAllowed di server).
    if (it.href === "/dashboard/ai") return ctx.role === "owner";
    if (!it.anyOf || it.anyOf.length === 0) return true;
    return it.anyOf.some((p) => ctx.can(p));
  };

  const items = NAV_ITEMS.filter(allowed);
  if (ctx.multiOutlet && (superuser || ctx.can("view_dashboard_owner"))) {
    items.splice(1, 0, { href: "/dashboard/semua-outlet", key: "nav.allOutlets", group: "operations" });
  }
  if (superuser) items.push({ href: "/dashboard/admin", key: "nav.adminData", group: "admin" });

  return NAV_GROUPS.map((group) => ({ group, items: items.filter((i) => i.group === group.id) })).filter((g) => g.items.length > 0);
}
