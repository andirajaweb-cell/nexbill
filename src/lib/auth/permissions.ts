// "superuser" and "owner" are BOTH full-authority roles with the identical permission set
// (see DEFAULT_ROLE_PERMISSIONS below) — the split exists purely to control who can ever be
// assigned which one, not to give one of them more power than the other:
//   - "owner" is the role a merchant/outlet manages for itself day to day (selectable in the
//     Staff page, business-facing — this is what "owner+superuser merged into one role" from the
//     project history now maps to for normal self-service use).
//   - "superuser" is reserved and can no longer be selected or assigned through the outlet-facing
//     Staff UI/API at all (see /api/staff, /api/staff/[id]) — it only exists for accounts seeded
//     outside the app (scripts/seed.ts) or set directly in the database. This keeps existing
//     seeded superuser accounts working unchanged while closing off "superuser" as something a
//     merchant could ever grant to themselves or anyone else from inside the product.
export type StaffRole = "superuser" | "owner" | "manager" | "cashier" | "accountant" | "kitchen" | "supervisor";

export type Permission =
  | "view_dashboard_owner"
  | "manage_staff"
  | "view_accounting"
  | "post_manual_journal"
  | "void_order_direct" // void (order or item) without needing approval
  | "refund_order" // refund a paid/partial bill without needing approval
  | "approve_requests"
  | "manage_pricing_promo"
  | "manage_inventory_purchasing"
  | "view_reports"
  | "manage_devices"
  | "kitchen_display"
  | "manage_admin_data" // generic CRUD panel across master tables
  | "manage_expenses" // create/edit/submit/pay-if-under-threshold expenses
  | "approve_expenses" // approve/reject expenses over the outlet's approval threshold
  | "void_expense" // reverse an already-posted/paid expense
  | "manage_assets" // fixed asset register, depreciation runs, disposal, maintenance logs
  | "manage_settings" // Business/Branch/Tax/Printer/WhatsApp/Notification settings
  | "manage_bookings" // create/confirm/cancel/reschedule/check-in/transfer bookings
  | "manage_ppob" // record/void PPOB transactions (top-up, token listrik, pulsa, transfer, tarik tunai)
  | "manage_coa" // create/edit/archive/delete Chart of Accounts + Account Mapping rows
  | "manage_other_income" // record/void Pendapatan Lain-lain (income outside core products: komisi, sewa aset, dst.)
  | "manage_home_rental" // operate Home Rental (Sewa Dibawa Pulang): booking, checkout, return, katalog produk/aset/paket
  | "manage_feature_flags" // toggle Home Rental (and future) feature flags in Settings > Feature Management — owner/superuser only, enforced additionally by a hard role check server-side
  | "manage_membership"; // sell/renew paid membership tiers (collects cash/QRIS, posts to accounting) — Membership & CRM tier/reward/voucher CRUD itself stays owner/superuser-only (see membership/page.tsx), this only gates the front-desk "Jual Keanggotaan" money-collecting action

export const ALL_ROLES: StaffRole[] = ["superuser", "owner", "manager", "cashier", "accountant", "kitchen", "supervisor"];

/** Every permission, grouped for the "Role & Izin" checklist UI so 24 raw enum values don't dump onto the owner as one flat list. */
export const PERMISSION_GROUPS: { group: string; permissions: Permission[] }[] = [
  { group: "Umum", permissions: ["view_dashboard_owner", "manage_staff", "manage_settings", "manage_admin_data"] },
  {
    group: "Kasir & Transaksi",
    permissions: ["void_order_direct", "refund_order", "approve_requests", "manage_bookings", "manage_ppob", "manage_membership", "kitchen_display"],
  },
  { group: "Pendapatan Lain-lain", permissions: ["manage_other_income"] },
  { group: "Home Rental (Sewa Dibawa Pulang)", permissions: ["manage_home_rental", "manage_feature_flags"] },
  { group: "Inventori & Harga", permissions: ["manage_pricing_promo", "manage_inventory_purchasing"] },
  {
    group: "Accounting & Keuangan",
    permissions: ["view_accounting", "post_manual_journal", "manage_coa", "manage_expenses", "approve_expenses", "void_expense", "manage_assets"],
  },
  { group: "Laporan & Perangkat", permissions: ["view_reports", "manage_devices"] },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.permissions);

export const PERMISSION_LABEL: Record<Permission, string> = {
  view_dashboard_owner: "Lihat Dashboard Owner (ringkasan bisnis)",
  manage_staff: "Kelola Staf & Role",
  view_accounting: "Lihat Accounting (jurnal, laporan keuangan)",
  post_manual_journal: "Input Jurnal Manual",
  void_order_direct: "Void Order Langsung (tanpa approval)",
  refund_order: "Refund Order Langsung (tanpa approval)",
  approve_requests: "Setujui/Tolak Permintaan Approval",
  manage_pricing_promo: "Kelola Harga & Promo",
  manage_inventory_purchasing: "Kelola Inventori & Pembelian",
  view_reports: "Lihat Laporan",
  manage_devices: "Kontrol Perangkat",
  kitchen_display: "Akses Kitchen Display",
  manage_admin_data: "Akses Panel Admin Data",
  manage_expenses: "Kelola Expense (buat/bayar di bawah ambang batas)",
  approve_expenses: "Setujui Expense di Atas Ambang Batas",
  void_expense: "Batalkan Expense yang Sudah Diposting",
  manage_assets: "Kelola Aset Tetap & Penyusutan",
  manage_settings: "Kelola Pengaturan Outlet",
  manage_bookings: "Kelola Booking",
  manage_ppob: "Kelola Transaksi PPOB",
  manage_coa: "Kelola Chart of Accounts & Account Mapping",
  manage_other_income: "Catat/Void Pendapatan Lain-lain",
  manage_home_rental: "Operasikan Home Rental (Booking, Checkout, Return, Katalog)",
  manage_feature_flags: "Kelola Feature Management (aktif/nonaktifkan modul)",
  manage_membership: "Jual/Perpanjang Keanggotaan (terima pembayaran)",
};

/**
 * Hardcoded default permission matrix — the safe fallback the app ships
 * with, and the seed source for the editable rolePermissions DB table (see
 * permissions-store.ts). This is deliberately kept as plain data, not the
 * live source of truth: hasPermission() below reads from an in-memory cache
 * that starts out as an exact copy of this, then gets overridden by
 * whatever's actually stored in the database once that's loaded — so if the
 * DB table is empty/missing/unreachable for any reason, behavior is
 * byte-for-byte identical to how this app worked before role permissions
 * became editable.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  // Full access to everything, including kitchen_display. "owner" mirrors this exact list —
  // see the StaffRole comment above for why there are two identically-powerful roles.
  superuser: [
    "view_dashboard_owner", "manage_staff", "view_accounting", "post_manual_journal",
    "void_order_direct", "refund_order", "approve_requests", "manage_pricing_promo", "manage_inventory_purchasing",
    "view_reports", "manage_devices", "manage_admin_data", "kitchen_display",
    "manage_expenses", "approve_expenses", "void_expense", "manage_assets", "manage_settings", "manage_bookings", "manage_ppob", "manage_coa", "manage_other_income",
    "manage_home_rental", "manage_feature_flags", "manage_membership",
  ],
  // The self-service top role for an outlet/merchant to manage its own business — same
  // permission set as "superuser" (see StaffRole comment above for the rationale for keeping
  // them as two separate role names).
  owner: [
    "view_dashboard_owner", "manage_staff", "view_accounting", "post_manual_journal",
    "void_order_direct", "refund_order", "approve_requests", "manage_pricing_promo", "manage_inventory_purchasing",
    "view_reports", "manage_devices", "manage_admin_data", "kitchen_display",
    "manage_expenses", "approve_expenses", "void_expense", "manage_assets", "manage_settings", "manage_bookings", "manage_ppob", "manage_coa", "manage_other_income",
    "manage_home_rental", "manage_feature_flags", "manage_membership",
  ],
  manager: [
    "view_dashboard_owner", "view_accounting", "void_order_direct", "refund_order", "approve_requests",
    "manage_pricing_promo", "manage_inventory_purchasing", "view_reports", "manage_devices",
    "manage_expenses", "approve_expenses", "void_expense", "manage_assets", "manage_bookings", "manage_ppob", "manage_other_income",
    "manage_home_rental", "manage_membership",
  ],
  // Books the entries and can reverse mistakes, but nominal-based sign-off on
  // spending itself is a manager/owner call — no approve_expenses here.
  // manage_other_income is included since booking one-off, non-core income entries
  // correctly is squarely an accounting job, same rationale as post_manual_journal.
  accountant: ["view_accounting", "post_manual_journal", "view_reports", "manage_expenses", "void_expense", "manage_assets", "manage_coa", "manage_other_income"],
  supervisor: ["approve_requests", "manage_pricing_promo", "view_reports", "manage_devices", "manage_bookings", "manage_home_rental", "manage_membership"],
  // Can create + pay expenses under the outlet's approval threshold directly, handle
  // the front-desk booking flow, and record PPOB sales (top-up/token/pulsa/tarik tunai)
  // at the counter — this is core cashier-facing work, not a manager-gated action.
  // manage_home_rental included for the same reason: Home Rental checkout/return is a
  // front-desk cashier task, not manager-gated (feature-flag toggling itself still is,
  // via manage_feature_flags which cashier never gets). manage_membership follows the
  // same logic: selling a paid membership at the counter is front-desk work too, even
  // though editing tiers/rewards/vouchers themselves stays owner/superuser-only.
  cashier: ["manage_expenses", "manage_bookings", "manage_ppob", "manage_home_rental", "manage_membership"],
  kitchen: ["kitchen_display"],
};

function buildMatrixFromDefaults(): Record<StaffRole, Set<Permission>> {
  const matrix = {} as Record<StaffRole, Set<Permission>>;
  for (const role of ALL_ROLES) matrix[role] = new Set(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
  return matrix;
}

/**
 * The live, in-memory permission matrix hasPermission() actually reads —
 * starts as an exact copy of the hardcoded defaults (so this module is
 * immediately safe to use the instant it's imported, on both client and
 * server, before any DB round-trip has happened), then gets overwritten by
 * setFullEffectiveMatrix()/setEffectivePermissions() once real data loads.
 *
 * Deliberately plain, synchronous, mutable module state — NOT a database
 * query — so hasPermission() keeps its simple synchronous signature and
 * every one of its ~30 existing call sites (React components checking
 * permissions inline during render, API routes checking them inline in a
 * request handler) needs zero code changes to become DB-backed and editable.
 * Server-side, this cache is warmed/refreshed via permissions-store.ts
 * (hooked into getSession()). Client-side, it's warmed via the `permissions`
 * field on the /api/auth/me response (see auth/client.tsx).
 */
let effectiveMatrix: Record<StaffRole, Set<Permission>> = buildMatrixFromDefaults();

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return effectiveMatrix[role]?.has(permission) ?? false;
}

/** Replaces the whole cache — used server-side after loading every row from the rolePermissions table. */
export function setFullEffectiveMatrix(rows: { role: string; permission: string; granted: boolean }[]): void {
  const matrix = buildMatrixFromDefaults();
  for (const row of rows) {
    const role = row.role as StaffRole;
    const permission = row.permission as Permission;
    if (!matrix[role]) continue; // unknown role in the row — ignore rather than throw, data may lag a code deploy
    if (row.granted) matrix[role].add(permission);
    else matrix[role].delete(permission);
  }
  effectiveMatrix = matrix;
}

/** Replaces just one role's permission set — used client-side to warm the cache for the current user's own role without needing the full 7-role matrix. */
export function setEffectivePermissions(role: StaffRole, permissions: string[]): void {
  if (!effectiveMatrix[role]) return;
  effectiveMatrix = { ...effectiveMatrix, [role]: new Set(permissions as Permission[]) };
}

export function roleLabel(role: StaffRole): string {
  const labels: Record<StaffRole, string> = {
    manager: "Manager", cashier: "Kasir",
    accountant: "Akuntan", kitchen: "Dapur", supervisor: "Supervisor", superuser: "Superuser", owner: "Owner",
  };
  return labels[role] ?? role;
}

/**
 * Approval-hierarchy level per role, per the explicit 6-tier structure NEXBILL uses: 1 =
 * superuser (pemilik aplikasi NEXBILL), 2 = owner (outlet/merchant), 3 = manager, 4 =
 * supervisor, 5 = akuntan, 6 = dapur & kasir. Lower number = more senior.
 *
 * This sits ON TOP of the existing approve_requests/approve_expenses/manage_staff permission
 * checks — a role must ALSO be strictly more senior than whoever they're approving/managing,
 * checked via canApproveForRole() below. E.g. a supervisor with approve_requests can approve a
 * cashier's void request, but never a manager's or another supervisor's — even though both
 * currently hold approve_requests. "kitchen" and "cashier" intentionally share level 6, since
 * neither role ever approves anything.
 */
export const ROLE_LEVEL: Record<StaffRole, number> = {
  superuser: 1,
  owner: 2,
  manager: 3,
  supervisor: 4,
  accountant: 5,
  cashier: 6,
  kitchen: 6,
};

/** True only if `reviewerRole` is strictly more senior (lower level number) than `requesterRole` — equal or junior levels can never approve/reject each other's requests, regardless of what approve_requests/approve_expenses says. */
export function canApproveForRole(reviewerRole: StaffRole, requesterRole: StaffRole): boolean {
  return ROLE_LEVEL[reviewerRole] < ROLE_LEVEL[requesterRole];
}
