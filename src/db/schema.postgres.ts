import { pgTable, text, integer, real, doublePrecision, boolean, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const nowIso = () => new Date().toISOString();

const timestamps = {
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
  updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
};

/** ---------------- OUTLET & STAFF ---------------- */

export const outlets = pgTable("outlets", {
  id: id(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  // Report letterhead — used on exported Excel/PDF financial reports (COA, Trial
  // Balance, P&L, Balance Sheet, Cash Flow). logoUrl points into public/uploads/branding/.
  logoUrl: text("logo_url"),
  wifiSsid: text("wifi_ssid"),
  wifiPassword: text("wifi_password"),
  billingRoundingMinutes: integer("billing_rounding_minutes").notNull().default(15),
  serviceChargePercent: doublePrecision("service_charge_percent").notNull().default(0),
  taxPercent: doublePrecision("tax_percent").notNull().default(0),
  // Expense amounts at or below this go straight through (cashier can pay directly,
  // no approval gate); above it, the expense sits at "pending_approval" until a
  // manager/owner/superuser approves. See src/lib/accounting/expense.ts.
  expenseApprovalThreshold: doublePrecision("expense_approval_threshold").notNull().default(500000),
  // Printer preferences (receipt printing is browser-print based — no direct hardware driver
  // in this environment — these are just stored preferences for the receipt template).
  printerName: text("printer_name"),
  printerPaperWidthMm: integer("printer_paper_width_mm").notNull().default(58),
  receiptFooterText: text("receipt_footer_text"),
  // Notification toggles — preferences only; no email/SMS/push channel is wired up yet, so
  // today these just control which reminder banners show in-app (e.g. Expense dashboard's
  // due-soon banner). Kept here so a future notification channel has somewhere to read from.
  notifyLowStock: boolean("notify_low_stock").notNull().default(true),
  notifyPendingApproval: boolean("notify_pending_approval").notNull().default(true),
  notifyShiftVariance: boolean("notify_shift_variance").notNull().default(true),
  notifyBookingReminder: boolean("notify_booking_reminder").notNull().default(true),
  // Reservation Engine config — see src/lib/rental/bookings.ts and scheduler.ts.
  // Gap required between one booking ending and the next starting on the same
  // unit (cleaning/reset time) — enforced as part of the overlap check.
  bookingBufferMinutes: integer("booking_buffer_minutes").notNull().default(0),
  // A confirmed booking not checked in this many minutes after scheduledStart
  // is auto-released by the scheduler (marked no_show, unit freed, waitlist
  // promoted if any).
  bookingAutoReleaseMinutes: integer("booking_auto_release_minutes").notNull().default(15),
  // Minimum lead time required for a customer-initiated booking (source
  // online/whatsapp) — e.g. can't book a slot starting in 5 minutes without
  // calling the cashier. Kasir-created bookings (source=kasir) bypass this.
  bookingMinLeadMinutes: integer("booking_min_lead_minutes").notNull().default(0),
  // Master switch for the public customer-facing booking page (/book) — when off, the page
  // still shows live unit availability (informational) but hides the booking form and shows
  // a "hubungi kami langsung" message instead. Lets an owner close public booking (e.g. during
  // a private event or closure) without touching anything else.
  acceptOnlineBooking: boolean("accept_online_booking").notNull().default(true),
  ...timestamps,
});

export const staffUsers = pgTable("staff_users", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // "superuser" is the single top-level role (merged from the former separate "owner" +
  // "superuser" roles so there's exactly one highest role, no ambiguity). Plain text
  // column (no SQL CHECK constraint emitted by drizzle-kit for sqlite enums), so this
  // required no db:push/migration at all.
  role: text("role", { enum: ["superuser", "manager", "cashier", "accountant", "kitchen", "supervisor"] })
    .notNull()
    .default("cashier"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * Editable role → permission matrix — the DB-backed override for the
 * hardcoded DEFAULT_ROLE_PERMISSIONS in src/lib/auth/permissions.ts. Global
 * (not outlet-scoped): role/permission are fixed application concepts, not
 * per-branch policy. Seeded from the defaults on first use, then owners can
 * toggle individual cells from the "Role & Izin" tab on the Staff page. See
 * src/lib/auth/permissions-store.ts for how this feeds the in-memory cache
 * that hasPermission() actually reads from (kept synchronous everywhere by
 * design — this table is a data source for that cache, never queried
 * directly on the hot authorization path).
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: id(),
    role: text("role").notNull(),
    permission: text("permission").notNull(),
    granted: boolean("granted").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("role_permissions_role_permission_idx").on(t.role, t.permission)]
);

/** ---------------- DEVICES (smart plug / TV control) ---------------- */

export const devices = pgTable("devices", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  protocol: text("protocol", { enum: ["tasmota_mqtt", "tuya", "sonoff_ewelink", "http_generic"] })
    .notNull()
    .default("tasmota_mqtt"),
  mqttTopic: text("mqtt_topic"),
  httpOnUrl: text("http_on_url"),
  httpOffUrl: text("http_off_url"),
  httpStatusUrl: text("http_status_url"),
  config: text("config"),
  lastKnownState: text("last_known_state", { enum: ["on", "off", "unknown"] }).notNull().default("unknown"),
  lastSeenAt: text("last_seen_at"),
  ...timestamps,
});

/**
 * Relay Agents — for the "android_tv_relay" device protocol. A relay agent is
 * a small standalone Node process (scripts/relay-agent.ts) that runs on a
 * machine physically on the same local network as the outlet's Android TVs
 * (e.g. the cashier PC, or a dedicated mini PC). It opens an outbound
 * WebSocket connection to the relay hub (scripts/relay-hub.ts) using the
 * token below, and executes local `adb` commands on the hub's behalf.
 *
 * This exists because ADB is LAN-only — it cannot be reached directly from a
 * cloud-hosted backend (Vercel etc). The relay hub/agent pair bridges that
 * gap without requiring any inbound port forwarding on the outlet's router.
 * See src/lib/devices/adapters/android-tv-relay.ts and scripts/relay-hub.ts.
 *
 * status/lastSeenAt are best-effort, written by the hub process directly
 * (same DB) on connect/disconnect/heartbeat — read-only from the Next.js app.
 */
export const relayAgents = pgTable("relay_agents", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  status: text("status", { enum: ["online", "offline"] }).notNull().default("offline"),
  lastSeenAt: text("last_seen_at"),
  ...timestamps,
});

/** ---------------- RENTAL UNITS (PS3/PS4/PS5 + TV) ---------------- */

export const rentalUnits = pgTable("rental_units", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  consoleType: text("console_type", { enum: ["ps2", "ps3", "ps4", "ps4_pro", "ps5", "ps5_slim"] }).notNull(),
  tvType: text("tv_type", { enum: ["android_tv", "smart_tv", "analog_tv"] }).notNull(),
  deviceId: text("device_id"),
  hourlyRate: doublePrecision("hourly_rate").notNull().default(0),
  status: text("status", { enum: ["available", "occupied", "booked", "maintenance"] }).notNull().default("available"),
  note: text("note"),
  // Soft-delete: "remove" from the UI sets this false instead of a hard DELETE, so
  // historical rentalSessions/orders that reference this unit keep working (reports,
  // journal source lookups) and don't end up with a dangling/orphaned rentalUnitId.
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** ---------------- CUSTOMERS ---------------- */

export const customers = pgTable("customers", {
  id: id(),
  outletId: text("outlet_id").references(() => outlets.id),
  // Permanent membership number, auto-generated server-side on creation (see
  // lib/customers/member-number.ts) and never editable afterward — excluded from the generic
  // Admin Data panel's edit form (see lib/admin/tables.ts hiddenExtra) and there is no customer
  // PATCH route that accepts it. Nullable at the DB level only so existing pre-feature rows can
  // be backfilled without breaking the migration; every new customer always gets one.
  memberNumber: text("member_number").unique(),
  name: text("name"),
  phone: text("phone").unique(),
  email: text("email"),
  instagramHandle: text("instagram_handle"),
  waJid: text("wa_jid"),
  notes: text("notes"),
  membershipTierId: text("membership_tier_id"),
  totalSpending: doublePrecision("total_spending").notNull().default(0),
  // real (not integer) so fractional play-point rates (PS5 = 1.5 pts/sesi) accumulate exactly.
  loyaltyPoints: doublePrecision("loyalty_points").notNull().default(0),
  lastVisitAt: text("last_visit_at"),
  ...timestamps,
});

/** ---------------- PROMOS / PACKAGES ---------------- */

export const promos = pgTable("promos", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["rental_package", "bundle_discount", "happy_hour", "voucher_code"] }).notNull(),
  description: text("description"),
  consoleType: text("console_type", { enum: ["ps2", "ps3", "ps4", "ps4_pro", "ps5", "ps5_slim", "any"] }),
  durationMinutes: integer("duration_minutes"),
  packagePrice: doublePrecision("package_price"),
  discountPercent: doublePrecision("discount_percent"),
  discountAmount: doublePrecision("discount_amount"),
  code: text("code").unique(),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * Ad/promo banners shown as a looping slideshow on the public booking page (/book), right
 * after the booking form — a spot an owner can sell to sponsors, promote their own F&B menu,
 * announce events, etc. Fully managed from the dashboard (Pengaturan > Banner Iklan): upload
 * image, optional click-through link, optional title (used as image alt text), sortOrder
 * controls slide order, isActive controls whether it's currently in rotation.
 */
export const banners = pgTable("banners", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** ---------------- RENTAL SESSIONS ---------------- */

export const rentalSessions = pgTable("rental_sessions", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  rentalUnitId: text("rental_unit_id").notNull().references(() => rentalUnits.id),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  startedAt: text("started_at").notNull().$defaultFn(nowIso),
  endedAt: text("ended_at"),
  plannedMinutes: integer("planned_minutes"),
  ratePerHour: doublePrecision("rate_per_hour").notNull(),
  status: text("status", { enum: ["running", "paused", "finished", "cancelled"] }).notNull().default("running"),
  totalAmount: doublePrecision("total_amount").default(0),
  promoId: text("promo_id").references(() => promos.id),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  pausedAt: text("paused_at"),
  accumulatedPauseMs: integer("accumulated_pause_ms").notNull().default(0),
  extendedMinutes: integer("extended_minutes").notNull().default(0),
  gameName: text("game_name"), // lightweight — full Game Management catalog is a Phase 2 module; this just captures what was played for the busiest-game KPI
  discountAmount: doublePrecision("discount_amount").notNull().default(0),
  voucherId: text("voucher_id"),
  bookingId: text("booking_id"),
  shiftId: text("shift_id"),
  ...timestamps,
});

/**
 * Extra controller/accessory rentals attached to a session (e.g. "Stick
 * Tambahan", VR headset) — billed per hour x qty, metered independently of
 * the main PS rental clock: the charge accrues from `addedAt` until either
 * `removedAt` (customer returns it mid-session) or the session stop time,
 * whichever comes first. Finalized into an orderItems line (itemType
 * "accessory") at stopRentalSession, same pattern as the main rental charge.
 */
export const sessionAccessories = pgTable("session_accessories", {
  id: id(),
  rentalSessionId: text("rental_session_id").notNull().references(() => rentalSessions.id),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  ratePerHour: doublePrecision("rate_per_hour").notNull(),
  addedAt: text("added_at").notNull().$defaultFn(nowIso),
  removedAt: text("removed_at"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

/** ---------------- PRODUCTS (F&B, device rental items) ---------------- */

export const products = pgTable("products", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["food", "drink", "coffee", "snack", "dessert", "merchandise", "accessory", "device_rental", "raw_material", "other"],
  }).notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  warehouseId: text("warehouse_id"),
  price: doublePrecision("price").notNull(),
  costPrice: doublePrecision("cost_price").default(0),
  stockQty: integer("stock_qty").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  unit: text("unit").notNull().default("pcs"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const stockMovements = pgTable("stock_movements", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id),
  type: text("type", { enum: ["purchase_in", "sale_out", "adjustment", "waste"] }).notNull(),
  qty: integer("qty").notNull(),
  note: text("note"),
  refOrderId: text("ref_order_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

/** ---------------- ORDERS (F&B / device rental / combined bill) ---------------- */

export const orders = pgTable("orders", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  customerId: text("customer_id").references(() => customers.id),
  rentalSessionId: text("rental_session_id").references(() => rentalSessions.id),
  status: text("status", { enum: ["open", "awaiting_payment", "partial", "paid", "cancelled"] }).notNull().default("open"),
  subtotal: doublePrecision("subtotal").notNull().default(0),
  discount: doublePrecision("discount").notNull().default(0),
  tax: doublePrecision("tax").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  serviceCharge: doublePrecision("service_charge").notNull().default(0),
  applyTax: boolean("apply_tax").notNull().default(false),
  applyServiceCharge: boolean("apply_service_charge").notNull().default(false),
  voucherId: text("voucher_id"),
  promoId: text("promo_id").references(() => promos.id),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  shiftId: text("shift_id"),
  splitGroupId: text("split_group_id"),
  mergedFromOrderIds: text("merged_from_order_ids"),
  source: text("source", { enum: ["pos", "whatsapp", "instagram", "ai_agent"] }).notNull().default("pos"),
  ...timestamps,
});

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id),
  productId: text("product_id").references(() => products.id),
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unitPrice: doublePrecision("unit_price").notNull(),
  lineTotal: doublePrecision("line_total").notNull(),
  // Explicit line type instead of sniffing the description string — used to
  // split the unified bill into Rental vs F&B/other subtotals on the invoice
  // and the live billing board.
  itemType: text("item_type", { enum: ["rental", "product", "misc", "accessory"] }).notNull().default("product"),
  // Kitchen workflow for F&B items sent to the Kitchen Display System.
  // Non-kitchen lines (the rental charge, device rental) are inserted as
  // "served" directly since they never need kitchen prep.
  kitchenStatus: text("kitchen_status", {
    enum: ["new", "confirmed", "preparing", "ready", "served", "cancelled"],
  }).notNull().default("served"),
  cancelReason: text("cancel_reason"),
  voidedBy: text("voided_by").references(() => staffUsers.id),
  voidedAt: text("voided_at"),
  ...timestamps,
});

/** ---------------- PAYMENTS ---------------- */

export const payments = pgTable("payments", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id),
  // Widened from a fixed 8-value enum to free text — payment methods are now an
  // owner-editable catalog (see paymentMethods table) instead of a fixed code-level
  // list, so this column must accept any custom method key, not just the 8 built-ins.
  method: text("method").notNull(),
  cashBankAccountId: text("cash_bank_account_id"),
  amount: doublePrecision("amount").notNull(),
  status: text("status", { enum: ["pending", "success", "failed", "expired", "refunded"] })
    .notNull()
    .default("pending"),
  providerRef: text("provider_ref"),
  qrString: text("qr_string"),
  qrImageUrl: text("qr_image_url"),
  feeAmount: doublePrecision("fee_amount").default(0),
  rawResponse: text("raw_response"),
  paidAt: text("paid_at"),
  expiresAt: text("expires_at"),
  ...timestamps,
});

/** ---------------- CHAT (WhatsApp / Instagram) ---------------- */

export const chatThreads = pgTable("chat_threads", {
  id: id(),
  channel: text("channel", { enum: ["whatsapp", "instagram"] }).notNull(),
  externalId: text("external_id").notNull(),
  customerId: text("customer_id").references(() => customers.id),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  lastMessageAt: text("last_message_at"),
  ...timestamps,
});

export const chatMessages = pgTable("chat_messages", {
  id: id(),
  threadId: text("thread_id").notNull().references(() => chatThreads.id),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  sender: text("sender", { enum: ["customer", "ai_agent", "staff"] }).notNull(),
  body: text("body").notNull(),
  meta: text("meta"),
  ...timestamps,
});

/** ---------------- AI AGENT SETTINGS ---------------- */

export const agentSettings = pgTable("agent_settings", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  systemPrompt: text("system_prompt"),
  model: text("model").notNull().default("claude-sonnet-5"),
  isWhatsappEnabled: boolean("is_whatsapp_enabled").notNull().default(true),
  isInstagramEnabled: boolean("is_instagram_enabled").notNull().default(true),
  handoffKeywords: text("handoff_keywords"),
  ...timestamps,
});

/**
 * Tuya IoT Platform Cloud Project credentials — one shared Access ID/Secret
 * per outlet (from cloud.tuya.com), reused by every Tuya-protocol device at
 * that outlet. Only each device's own Tuya `deviceId` (stored in
 * devices.config) differs per device — this is what makes "set once, add
 * many devices" possible instead of re-entering Access ID/Secret every time.
 */
export const tuyaSettings = pgTable("tuya_settings", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  accessId: text("access_id"),
  accessSecret: text("access_secret"),
  // Matches Tuya IoT Platform's actual data centers (see "Map Account to Data
  // Center" in Tuya's docs) — must match whichever data center the outlet's
  // Tuya app account/Cloud Project actually lives in, or every API call 401s.
  region: text("region", { enum: ["cn", "us", "us_e", "eu", "eu_w", "in", "sg"] }).notNull().default("eu"),
  ...timestamps,
});

/** ================= ACCOUNTING (double-entry) ================= */

export const accounts = pgTable("accounts", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["asset", "liability", "equity", "revenue", "expense"] }).notNull(),
  normalBalance: text("normal_balance", { enum: ["debit", "credit"] }).notNull(),
  isSystemAccount: boolean("is_system_account").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  // Hierarchical COA support: parentId groups posting accounts under a Header
  // account. Headers (isPostingAllowed=false) exist purely for grouping/subtotal
  // display in the tree view — postJournal()/getAccountIdByCode() refuse to post
  // to them (see coa.ts). costCenter/taxCode are free-text metadata slots an
  // owner can fill in via the Accounts CRUD UI; nothing in the posting engine
  // reads them yet, they're for reporting/export.
  parentId: text("parent_id"),
  isPostingAllowed: boolean("is_posting_allowed").notNull().default(true),
  costCenter: text("cost_center"),
  taxCode: text("tax_code"),
  ...timestamps,
}, (table) => ({
  // One code per outlet — also the DB-level guard against seedChartOfAccounts
  // double-inserting the same code under concurrent requests (paired with
  // .onConflictDoNothing() on that insert; see coa.ts).
  outletCodeIdx: uniqueIndex("accounts_outlet_code_idx").on(table.outletId, table.code),
}));

/**
 * Module -> Transaction -> Default Account routing table ("⚙️ ACCOUNT MAPPING").
 * Lets an owner change which GL account a given module/category posts to
 * without touching code — e.g. row (outletId, "rental", "ps5") -> account
 * 4120. Posting code calls getMappedAccountId(outletId, module, transactionKey,
 * fallbackCode) in account-mapping.ts, which reads this table first and only
 * falls back to the hardcoded default code if no active mapping row exists —
 * so an outlet with zero mapping rows still posts correctly using the seeded
 * defaults, and mappings only need to be touched when someone wants to override.
 */
export const accountMappings = pgTable("account_mappings", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  module: text("module", {
    enum: ["rental", "addon", "fnb", "fnb_cogs", "product_sale", "product_sale_cogs", "ppob", "expense", "asset", "asset_accum_depr", "depreciation", "payment", "product", "other", "other_income", "home_rental"],
  }).notNull(),
  transactionKey: text("transaction_key").notNull(), // e.g. "ps5", "food", "pulsa", "listrik", "cash"
  accountId: text("account_id").notNull().references(() => accounts.id),
  label: text("label"), // human-readable description shown in the Mapping UI, e.g. "Rental PS5"
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (table) => ({
  outletModuleKeyIdx: uniqueIndex("account_mappings_outlet_module_key_idx").on(table.outletId, table.module, table.transactionKey),
}));

export const journalEntries = pgTable("journal_entries", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  entryDate: text("entry_date").notNull().$defaultFn(nowIso),
  reference: text("reference"),
  description: text("description").notNull(),
  sourceType: text("source_type", {
    enum: [
      "rental", "pos", "purchase_invoice", "purchase_payment", "purchase_return",
      "expense", "refund", "asset_purchase", "asset_disposal", "depreciation",
      "receivable_payment", "manual", "opening_balance", "ppob", "other_income",
      "home_rental",
    ],
  }).notNull(),
  sourceId: text("source_id"),
  status: text("status", { enum: ["posted", "void"] }).notNull().default("posted"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
  ...timestamps,
});

export const journalLines = pgTable("journal_lines", {
  id: id(),
  journalEntryId: text("journal_entry_id").notNull().references(() => journalEntries.id),
  accountId: text("account_id").notNull().references(() => accounts.id),
  debit: doublePrecision("debit").notNull().default(0),
  credit: doublePrecision("credit").notNull().default(0),
  description: text("description"),
  lineOrder: integer("line_order").notNull().default(0),
});

export const cashBankAccounts = pgTable("cash_bank_accounts", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank"] }).notNull().default("cash"),
  accountId: text("account_id").notNull().references(() => accounts.id),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});

/**
 * PPOB (Payment Point Online Bank) transactions — top-up e-wallet, token/tagihan
 * listrik, pulsa, transfer, tarik tunai, etc. sold via a Fastpay-style aggregator.
 * This table only RECORDS what already happened at the aggregator (the cashier
 * executes the actual top-up/token/transfer in the Fastpay app/dashboard
 * themselves) — no live provider API integration. Kept deliberately separate
 * from `orders`/`orderItems` (per the owner's explicit request) since PPOB never
 * touches F&B inventory and has a fundamentally different transaction shape
 * (funding/receiving account legs instead of a cart of line items), but it posts
 * into the SAME chart of accounts / journal engine as everything else so P&L,
 * Trial Balance, and Cash & Bank stay unified.
 */
export const ppobTransactions = pgTable("ppob_transactions", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  category: text("category", {
    enum: ["ewallet_topup", "token_listrik", "pulsa", "transfer", "tarik_tunai", "lainnya"],
  }).notNull(),
  product: text("product").notNull(), // free text: "DANA", "GoPay", "Token PLN 100rb", "Pulsa Telkomsel 25rb", dst.
  serviceRef: text("service_ref"), // "perintah jasa" — nomor tujuan/ID pelanggan/catatan referensi transaksi
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  nominal: doublePrecision("nominal").notNull().default(0), // nilai/face value produk
  modal: doublePrecision("modal").notNull().default(0), // uang keluar sebagai modal (harga beli/cost of the product itself)
  providerFee: doublePrecision("provider_fee").notNull().default(0), // biaya dari principal/provider (Fastpay Fee Outlet, tier Basic) — beban riil, BUKAN pendapatan toko
  feeAdmin: doublePrecision("fee_admin").notNull().default(0), // margin — keuntungan bersih toko, diatur sendiri (bukan dari tabel fee Fastpay)
  uangMasuk: doublePrecision("uang_masuk").notNull().default(0), // = modal + providerFee + feeAdmin, total yang dibayar pelanggan
  // Split payment: modal ditarik dari salah satu akun ini (Cash fisik atau Saldo Deposit Fastpay),
  // dan uang masuk dari pelanggan dibukukan ke salah satu akun ini juga — biasanya berlawanan
  // (funding=Saldo, receiving=Cash untuk top-up/token/pulsa biasa; funding=Cash, receiving=Saldo
  // untuk tarik tunai) tapi bisa sama akun kalau modal & penerimaan sama-sama cash.
  fundingCashBankAccountId: text("funding_cash_bank_account_id").notNull().references(() => cashBankAccounts.id),
  receivingCashBankAccountId: text("receiving_cash_bank_account_id").notNull().references(() => cashBankAccounts.id),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  shiftId: text("shift_id"),
  status: text("status", { enum: ["success", "reversed"] }).notNull().default("success"),
  journalEntryId: text("journal_entry_id"),
  notes: text("notes"),
  reversedReason: text("reversed_reason"),
  reversedAt: text("reversed_at"),
  ...timestamps,
});

/**
 * Reference price list for PPOB products — providerFee is the real cost Fastpay
 * (the principal/provider) charges the outlet per fastpay.co.id/blog/layanan-fee's
 * published "Fee Outlet" schedule (Basic tier only, per owner's choice — Pro/
 * Enterprise tiers aren't modeled), used to auto-fill new transactions. defaultMargin
 * is NOT from that schedule — it's the shop's own configurable profit target per
 * product, editable here independent of whatever Fastpay charges. Both are just
 * defaults; every field stays editable per transaction in ppobTransactions.
 */
export const ppobPriceRules = pgTable("ppob_price_rules", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  category: text("category", {
    enum: ["ewallet_topup", "token_listrik", "pulsa", "transfer", "tarik_tunai", "lainnya"],
  }).notNull(),
  product: text("product").notNull(),
  providerFee: doublePrecision("provider_fee").notNull().default(0),
  defaultMargin: doublePrecision("default_margin").notNull().default(0),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * The real, live catalog of payment channels selectable at checkout (POS + Rental)
 * and recordable on Pendapatan Lain-lain — outlet-scoped and fully owner-editable
 * (add/edit/delete/reorder/deactivate) from the Pembayaran dashboard page. `key`
 * is the stable identifier stored on payments.method / other_incomes.payment_method
 * forever (rename the label freely without touching historical rows — never rename
 * `key` itself once transactions exist). `kind` controls downstream behavior:
 *  - "cash": the physical-cash channel — exactly one should exist, drives the shift
 *    denomination count instead of a digital balance check. Cannot be deleted.
 *  - "balance_tracked": a channel with its own app/dashboard saldo (GoPay, DANA,
 *    BukuPay, Fastpay Gateway) — shift close asks the cashier to type in what the
 *    app shows and compares it to the expected GL balance.
 *  - "info_only": settles straight to a bank/EDC account with no separate balance
 *    to check (QRIS, Transfer, Card, and the sane default for any new custom
 *    channel an owner adds — e.g. a new e-wallet with no dedicated saldo-check UI).
 * Every channel — built-in or custom — posts correctly to its own GL account via
 * the already-generic getCashBankAccountIdForPaymentMethod() in account-mapping.ts,
 * and initiates as a manual/staff-confirmed payment via the generic fallback in
 * payments/index.ts unless it's one of the few channels with a real live gateway
 * adapter wired in code (Fastpay/BukuPay).
 */
export const paymentMethods = pgTable("payment_methods", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  kind: text("kind", { enum: ["cash", "balance_tracked", "info_only"] }).notNull().default("info_only"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/**
 * Owner-editable unit-of-measure master list ("Satuan"), mirroring the
 * paymentMethods pattern: outlet-scoped, seeded once with sane defaults
 * (pcs, gram, kg, ml, liter, box, pack, unit, lainnya), and referenced by
 * `code` from products.unit and recipeIngredients.unit so every inventory
 * screen (Produk, Resep/BOM, Belanja Supplier, Purchase Order) draws its
 * unit dropdown from the same source instead of free-typed text.
 */
export const units = pgTable(
  "units",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    code: text("code").notNull(),
    label: text("label").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("units_outlet_code_idx").on(t.outletId, t.code)]
);

export const cashMovements = pgTable("cash_movements", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  cashBankAccountId: text("cash_bank_account_id").notNull().references(() => cashBankAccounts.id),
  shiftId: text("shift_id"),
  type: text("type", { enum: ["in", "out"] }).notNull(),
  category: text("category").notNull(),
  amount: doublePrecision("amount").notNull(),
  note: text("note"),
  journalEntryId: text("journal_entry_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

export const receivables = pgTable("receivables", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  customerId: text("customer_id").references(() => customers.id),
  orderId: text("order_id"),
  amount: doublePrecision("amount").notNull(),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  dueDate: text("due_date"),
  status: text("status", { enum: ["open", "partial", "paid", "written_off"] }).notNull().default("open"),
  journalEntryId: text("journal_entry_id"),
  ...timestamps,
});

/**
 * Cost centers: how a branch's spending is broken down (Rental / F&B / Kitchen /
 * Administration, or anything the outlet wants) — lets the owner ask "how much
 * did Cabang A spend on X this month" with real structured accounting data
 * instead of grepping free-text expense descriptions.
 */
export const costCenters = pgTable("cost_centers", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  code: text("code"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * Full Expense Management module — this is the entry point for cost transactions
 * into accounting, not a separate expense-log. Every non-draft/cancelled expense
 * corresponds to real journalEntries (see src/lib/accounting/expense.ts):
 *   - recordAsPayable=false (pay now): one journal at approval time —
 *     Dr {accountId's expense account} / Cr {cashBankAccountId's GL account} —
 *     status jumps straight to "paid".
 *   - recordAsPayable=true (recorded as hutang first): journalEntryId posts
 *     Dr {accountId} / Cr Hutang Lain-lain (2100) at "approved"; a later Pay
 *     action posts a second journal (paymentJournalEntryId) Dr 2100 / Cr
 *     {cashBankAccountId's GL account} and flips status to "paid".
 * Once anything is posted (status approved/paid), the row is never hard-deleted
 * or silently edited — voidExpense() posts the exact reversal via the shared
 * voidJournal() and stamps voidedAt/voidedBy/voidReason, same pattern as
 * void/refund elsewhere in this app.
 */
export const expenses = pgTable("expenses", {
  id: id(),
  expenseNumber: text("expense_number").notNull().unique(), // "EXP-00001"
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  accountId: text("account_id").notNull().references(() => accounts.id), // COA expense account — mandatory
  category: text("category").notNull(), // kept as a free-text label for display/reports; accountId is the real link to accounting
  description: text("description"),
  payeeName: text("payee_name"),
  supplierId: text("supplier_id").references(() => suppliers.id),
  qty: integer("qty").notNull().default(1),
  amount: doublePrecision("amount").notNull(), // total nominal (not unit price)
  taxAmount: doublePrecision("tax_amount").notNull().default(0),
  attachmentUrl: text("attachment_url"), // bukti pembayaran/nota
  paymentMethod: text("payment_method", { enum: ["cash", "bank", "transfer", "qris"] }),
  recordAsPayable: boolean("record_as_payable").notNull().default(false),
  costCenterId: text("cost_center_id").references(() => costCenters.id),
  rentalUnitId: text("rental_unit_id").references(() => rentalUnits.id), // unit PS terkait, e.g. maintenance PS-05
  dueDate: text("due_date"),
  status: text("status", {
    enum: ["draft", "pending_approval", "approved", "paid", "rejected", "cancelled"],
  }).notNull().default("draft"),
  cashBankAccountId: text("cash_bank_account_id").references(() => cashBankAccounts.id), // nullable now — only set once actually paid
  shiftId: text("shift_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id), // creator
  submittedAt: text("submitted_at"),
  approvedBy: text("approved_by").references(() => staffUsers.id),
  approvedAt: text("approved_at"),
  rejectedBy: text("rejected_by").references(() => staffUsers.id),
  rejectedAt: text("rejected_at"),
  rejectReason: text("reject_reason"),
  paidBy: text("paid_by").references(() => staffUsers.id),
  paidAt: text("paid_at"),
  cancelReason: text("cancel_reason"),
  voidedBy: text("voided_by").references(() => staffUsers.id),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
  journalEntryId: text("journal_entry_id"), // recognition journal (Dr expense / Cr cash-bank OR Cr AP)
  paymentJournalEntryId: text("payment_journal_entry_id"), // settlement journal when recordAsPayable (Dr AP / Cr cash-bank)
  isRecurringInstance: boolean("is_recurring_instance").notNull().default(false),
  recurringTemplateId: text("recurring_template_id"),
  expenseDate: text("expense_date").notNull().$defaultFn(nowIso),
  ...timestamps,
});

/**
 * ================= OTHER INCOME (Pendapatan Lain-lain) =================
 * Money received that ISN'T from selling the core products (Rental/F&B/
 * PPOB/POS products) — e.g. vendor commission, renting out space/equipment
 * to someone else, selling old/scrap gear, sponsorship, damage compensation
 * from a customer, bank interest/cashback, or anything else one-off. Kept as
 * its own table (not just another expense-like "negative expense") because
 * it's a revenue-side event: it debits a cash/bank account and credits a
 * REVENUE account under COA 4700 (see coa.ts) instead of debiting an expense
 * account.
 *
 * Deliberately NOT modeled as a draft→approval→paid state machine like
 * `expenses` — money has already been physically received by the time this
 * gets recorded (there's nothing to approve before the fact), so this posts
 * its journal entry immediately on create, same as PPOB transactions. The
 * fraud-relevant control here isn't a pre-approval gate, it's: (1) the
 * `manage_other_income` permission restricts who can create/void these at
 * all, (2) every entry is staff + audit-log attributed, (3) cash received
 * this way is folded into the shift's cash-count reconciliation (see
 * shift/shift.ts) so it can't be received off-the-books, and (4) voiding
 * posts a reversing journal rather than deleting history (see void, below).
 */
export const otherIncomes = pgTable("other_incomes", {
  id: id(),
  incomeNumber: text("income_number").notNull().unique(), // "INC-00001"
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  category: text("category", {
    enum: ["vendor_commission", "asset_rental", "asset_sale", "sponsorship", "penalty_compensation", "bank_interest_cashback", "other"],
  }).notNull(),
  description: text("description"),
  payerName: text("payer_name"), // siapa/darimana uang ini diterima — opsional
  amount: doublePrecision("amount").notNull(),
  // Widened from a fixed 8-value enum to free text — see paymentMethods table.
  paymentMethod: text("payment_method").notNull(),
  cashBankAccountId: text("cash_bank_account_id").references(() => cashBankAccounts.id), // resolved+stored at creation for traceability
  attachmentUrl: text("attachment_url"), // bukti terima/kwitansi
  costCenterId: text("cost_center_id").references(() => costCenters.id),
  status: text("status", { enum: ["posted", "void"] }).notNull().default("posted"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id), // recorder
  shiftId: text("shift_id"), // shift open at the time of recording, if any — feeds shift cash reconciliation
  journalEntryId: text("journal_entry_id"),
  voidedBy: text("voided_by").references(() => staffUsers.id),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
  incomeDate: text("income_date").notNull().$defaultFn(nowIso),
  ...timestamps,
});

/** Templates that spawn a new draft `expenses` row each period (listrik, internet, sewa, gaji, dst). */
export const recurringExpenseTemplates = pgTable("recurring_expense_templates", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  accountId: text("account_id").notNull().references(() => accounts.id),
  category: text("category").notNull(),
  costCenterId: text("cost_center_id").references(() => costCenters.id),
  rentalUnitId: text("rental_unit_id").references(() => rentalUnits.id),
  payeeName: text("payee_name"),
  supplierId: text("supplier_id").references(() => suppliers.id),
  amount: doublePrecision("amount").notNull(),
  taxAmount: doublePrecision("tax_amount").notNull().default(0),
  recordAsPayable: boolean("record_as_payable").notNull().default(false),
  frequency: text("frequency", { enum: ["weekly", "monthly", "yearly"] }).notNull().default("monthly"),
  dayOfMonth: integer("day_of_month"), // 1-28, used when frequency = monthly
  nextDueDate: text("next_due_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastGeneratedAt: text("last_generated_at"),
  ...timestamps,
});

/**
 * ================= FIXED ASSETS & DEPRECIATION =================
 * Asset register for PlayStation/TV/Controller/furniture etc. — straight-line
 * depreciation only (amount = (acquisitionCost - salvageValue) / usefulLifeMonths).
 * See src/lib/accounting/asset.ts for the posting engine: acquisition posts
 * Dr 1500 Peralatan / Cr Kas-Bank-or-AP (mirrors the expense engine's
 * pay-now-vs-payable choice); each depreciation run posts Dr 6400 Beban
 * Penyusutan / Cr 1510 Akumulasi Penyusutan; disposal posts a balanced
 * gain/loss journal that fully removes the asset from the books.
 */
export const fixedAssets = pgTable("fixed_assets", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  category: text("category", { enum: ["playstation", "tv", "controller", "furniture", "vehicle", "other"] }).notNull(),
  rentalUnitId: text("rental_unit_id").references(() => rentalUnits.id), // optional — e.g. this PS5 belongs to "Bilik 3"
  acquisitionDate: text("acquisition_date").notNull().$defaultFn(nowIso),
  acquisitionCost: doublePrecision("acquisition_cost").notNull(),
  salvageValue: doublePrecision("salvage_value").notNull().default(0),
  usefulLifeMonths: integer("useful_life_months").notNull(),
  accumulatedDepreciation: doublePrecision("accumulated_depreciation").notNull().default(0),
  status: text("status", { enum: ["active", "under_maintenance", "disposed"] }).notNull().default("active"),
  supplierId: text("supplier_id").references(() => suppliers.id),
  notes: text("notes"),
  journalEntryId: text("journal_entry_id"), // acquisition journal
  disposalDate: text("disposal_date"),
  disposalAmount: doublePrecision("disposal_amount"),
  disposalReason: text("disposal_reason"),
  disposalJournalEntryId: text("disposal_journal_entry_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

/** One row per depreciation run per asset per period ("2026-08") — the period uniqueness check happens in application code (see runDepreciation), not a DB constraint. */
export const assetDepreciationEntries = pgTable("asset_depreciation_entries", {
  id: id(),
  fixedAssetId: text("fixed_asset_id").notNull().references(() => fixedAssets.id),
  period: text("period").notNull(),
  amount: doublePrecision("amount").notNull(),
  journalEntryId: text("journal_entry_id"),
  ...timestamps,
});

/** Maintenance history for an asset — optionally linked to a real Expense row (Beban Maintenance) when the work cost money. */
export const assetMaintenanceLogs = pgTable("asset_maintenance_logs", {
  id: id(),
  fixedAssetId: text("fixed_asset_id").notNull().references(() => fixedAssets.id),
  maintenanceDate: text("maintenance_date").notNull().$defaultFn(nowIso),
  description: text("description").notNull(),
  cost: doublePrecision("cost").notNull().default(0),
  expenseId: text("expense_id").references(() => expenses.id),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

/** ================= SUPPLIERS & PURCHASING ================= */

export const suppliers = pgTable("suppliers", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  paymentTermsDays: integer("payment_terms_days").notNull().default(0),
  notes: text("notes"),
  ...timestamps,
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  poNumber: text("po_number"),
  status: text("status", { enum: ["draft", "ordered", "partially_received", "received", "cancelled"] })
    .notNull()
    .default("draft"),
  orderDate: text("order_date").notNull().$defaultFn(nowIso),
  expectedDate: text("expected_date"),
  notes: text("notes"),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  ...timestamps,
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: id(),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: text("product_id").notNull().references(() => products.id),
  qtyOrdered: integer("qty_ordered").notNull(),
  qtyReceived: integer("qty_received").notNull().default(0),
  unitCost: doublePrecision("unit_cost").notNull(),
});

/** Purchase invoices double as the Accounts Payable ledger. */
export const purchaseInvoices = pgTable("purchase_invoices", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  purchaseOrderId: text("purchase_order_id").references(() => purchaseOrders.id),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date").notNull().$defaultFn(nowIso),
  dueDate: text("due_date"),
  amount: doublePrecision("amount").notNull(),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  status: text("status", { enum: ["unpaid", "partial", "paid"] }).notNull().default("unpaid"),
  journalEntryId: text("journal_entry_id"),
  ...timestamps,
});

export const purchasePayments = pgTable("purchase_payments", {
  id: id(),
  purchaseInvoiceId: text("purchase_invoice_id").notNull().references(() => purchaseInvoices.id),
  amount: doublePrecision("amount").notNull(),
  method: text("method").notNull(),
  cashBankAccountId: text("cash_bank_account_id").notNull().references(() => cashBankAccounts.id),
  paidAt: text("paid_at").notNull().$defaultFn(nowIso),
  journalEntryId: text("journal_entry_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
});

export const purchaseReturns = pgTable("purchase_returns", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  purchaseInvoiceId: text("purchase_invoice_id").references(() => purchaseInvoices.id),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  productId: text("product_id").notNull().references(() => products.id),
  qty: integer("qty").notNull(),
  unitCost: doublePrecision("unit_cost").notNull(),
  reason: text("reason"),
  journalEntryId: text("journal_entry_id"),
  returnDate: text("return_date").notNull().$defaultFn(nowIso),
});

export const warehouses = pgTable("warehouses", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(true),
  ...timestamps,
});

export const stockOpnames = pgTable("stock_opnames", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  opnameDate: text("opname_date").notNull().$defaultFn(nowIso),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  status: text("status", { enum: ["draft", "completed"] }).notNull().default("draft"),
  notes: text("notes"),
});

export const stockOpnameItems = pgTable("stock_opname_items", {
  id: id(),
  stockOpnameId: text("stock_opname_id").notNull().references(() => stockOpnames.id),
  productId: text("product_id").notNull().references(() => products.id),
  systemQty: integer("system_qty").notNull(),
  actualQty: integer("actual_qty").notNull(),
  differenceQty: integer("difference_qty").notNull(),
  note: text("note"),
});

/** ================= RECIPE / BOM (auto-deduct ingredients + HPP) ================= */

export const recipes = pgTable("recipes", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  yieldQty: integer("yield_qty").notNull().default(1),
  notes: text("notes"),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: id(),
  recipeId: text("recipe_id").notNull().references(() => recipes.id),
  ingredientProductId: text("ingredient_product_id").notNull().references(() => products.id),
  qtyPerYield: doublePrecision("qty_per_yield").notNull(),
  unit: text("unit").notNull().default("pcs"),
});

/** ================= MEMBERSHIP / LOYALTY / VOUCHERS ================= */

export const membershipTiers = pgTable("membership_tiers", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  minSpending: doublePrecision("min_spending").notNull().default(0),
  pointMultiplier: doublePrecision("point_multiplier").notNull().default(1),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  benefits: text("benefits"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: id(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  type: text("type", { enum: ["earn", "redeem", "adjust", "expire"] }).notNull(),
  // real (not integer) so fractional play-point rates (e.g. PS5 = 1.5 pts/sesi) post exactly
  // instead of getting rounded away — see lib/membership/play-points.ts.
  points: doublePrecision("points").notNull(),
  note: text("note"),
  refOrderId: text("ref_order_id"),
  ...timestamps,
});

/**
 * Per-outlet, per-console-type play-point rate (e.g. PS3=3, PS4=1, PS5=1.5 poin/sesi) — awarded
 * once per finished, fully-paid rental session, ON TOP OF the normal spending-based points (see
 * applyLoyaltyAndSpending in lib/membership/loyalty.ts). Rows are optional per outlet: any
 * consoleType without a row here falls back to DEFAULT_PLAY_POINTS in lib/membership/play-points.ts.
 * Exposed for editing via the generic Admin Data panel (see lib/admin/tables.ts) so an owner can
 * retune rates without a redeploy.
 */
export const loyaltyPlayPointRates = pgTable(
  "loyalty_play_point_rates",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    consoleType: text("console_type", { enum: ["ps2", "ps3", "ps4", "ps4_pro", "ps5", "ps5_slim"] }).notNull(),
    pointsPerSession: doublePrecision("points_per_session").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("loyalty_play_point_rates_outlet_console_idx").on(t.outletId, t.consoleType)]
);

export const vouchers = pgTable("vouchers", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  code: text("code").notNull().unique(),
  type: text("type", { enum: ["percent", "amount"] }).notNull(),
  value: doublePrecision("value").notNull(),
  minPurchase: doublePrecision("min_purchase").notNull().default(0),
  maxDiscount: doublePrecision("max_discount"),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  // Set only for vouchers minted from a loyalty reward redemption (see
  // lib/membership/rewards.ts) — restricts the voucher to that one customer's own order/bill so
  // a personal reward can't be shared/reused by someone else. Null (the vast majority of
  // vouchers, created manually in the Membership > Voucher tab) means "anyone can use it", the
  // original behavior, unchanged.
  customerId: text("customer_id").references(() => customers.id),
  ...timestamps,
});

/**
 * Redeemable catalog: either a partner-brand reward (external voucher the customer picks up
 * elsewhere — no in-app checkout effect) or a play_discount reward (redeeming mints a real,
 * customer-scoped `vouchers` row so it applies automatically at the next rental/POS checkout via
 * the existing voucher-code flow — see lib/membership/rewards.ts).
 */
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["partner_brand", "play_discount"] }).notNull(),
  pointsCost: doublePrecision("points_cost").notNull(),
  // partner_brand fields
  partnerBrandName: text("partner_brand_name"),
  description: text("description"),
  // play_discount fields (mirrors vouchers.type/value)
  discountType: text("discount_type", { enum: ["percent", "amount"] }),
  discountValue: doublePrecision("discount_value"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const loyaltyRedemptions = pgTable("loyalty_redemptions", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  rewardId: text("reward_id").notNull().references(() => loyaltyRewards.id),
  pointsSpent: doublePrecision("points_spent").notNull(),
  code: text("code").notNull().unique(),
  // For play_discount rewards, the minted vouchers row this redemption is backed by — consuming
  // it (at checkout) is what actually applies the discount; status here just tracks it for CRM
  // display. Null for partner_brand rewards (nothing to auto-apply, staff hands it out manually).
  voucherId: text("voucher_id").references(() => vouchers.id),
  status: text("status", { enum: ["issued", "used", "cancelled"] }).notNull().default("issued"),
  usedAt: text("used_at"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

/** ================= BOOKING / RESERVATION ================= */

export const bookings = pgTable("bookings", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  // Human-readable unique code (e.g. "BK-00001") — used for QR/fast check-in
  // at the kasir instead of the raw UUID. See generateBookingCode() in
  // src/lib/rental/bookings.ts.
  bookingCode: text("booking_code").unique(),
  rentalUnitId: text("rental_unit_id").references(() => rentalUnits.id),
  consoleType: text("console_type"),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  phone: text("phone"),
  scheduledStart: text("scheduled_start").notNull(),
  scheduledEnd: text("scheduled_end").notNull(),
  status: text("status", {
    enum: ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show", "expired", "waitlisted"],
  })
    .notNull()
    .default("pending"),
  // Where the booking originated — online/whatsapp bookings are subject to
  // bookingMinLeadMinutes; kasir-created bookings bypass that check.
  source: text("source", { enum: ["kasir", "online", "whatsapp"] }).notNull().default("kasir"),
  dpAmount: doublePrecision("dp_amount").notNull().default(0),
  dpPaid: boolean("dp_paid").notNull().default(false),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  waitlistPosition: integer("waitlist_position"),
  rentalSessionId: text("rental_session_id"),
  // Set when transferBookingUnit() moves this booking to a different unit
  // (e.g. the originally-booked unit broke down) — the booking keeps its
  // price/history, only the physical unit assignment changes.
  transferredFromUnitId: text("transferred_from_unit_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  confirmedAt: text("confirmed_at"),
  checkedInAt: text("checked_in_at"),
  cancelledAt: text("cancelled_at"),
  noShowAt: text("no_show_at"),
  expiredAt: text("expired_at"),
  ...timestamps,
});

/**
 * Queued outbound notifications for a booking (reminders, confirmation,
 * reschedule, cancellation, waitlist-slot-available, no-show) — populated by
 * the scheduler in src/lib/rental/scheduler.ts, actually sent by the
 * long-running scripts/whatsapp-bot.ts process polling for status="pending"
 * rows (it's the only process holding a live WhatsApp socket). Decoupling
 * "what needs to be sent" from "the send itself" means auto-release/waitlist
 * promotion still work correctly even if the WhatsApp bot isn't running —
 * only the actual message delivery depends on it.
 */
export const bookingNotifications = pgTable("booking_notifications", {
  id: id(),
  // Nullable because Home Rental notifications (below) reuse this same queue/table instead of
  // duplicating the whole "queue -> WhatsApp bot polls -> send" pipeline. Exactly one of
  // bookingId/homeRentalRentalId is set per row depending on which module queued it.
  bookingId: text("booking_id").references(() => bookings.id),
  homeRentalRentalId: text("home_rental_rental_id").references(() => homeRentalRentals.id),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  type: text("type", {
    enum: [
      "reminder_h24", "reminder_h2", "reminder_15m", "confirmation", "reschedule", "cancellation", "waitlist_available", "no_show", "session_time_warning",
      // Home Rental (Sewa Dibawa Pulang) reminder/notification types
      "hr_reminder_h24", "hr_reminder_h2", "hr_return_h24", "hr_due_now", "hr_overdue", "hr_booking_confirmation",
    ],
  }).notNull(),
  channel: text("channel", { enum: ["whatsapp"] }).notNull().default("whatsapp"),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
  scheduledFor: text("scheduled_for"),
  sentAt: text("sent_at"),
  error: text("error"),
  ...timestamps,
});

/** ================= DYNAMIC PRICING RULES ================= */

export const pricingRules = pgTable("pricing_rules", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  consoleType: text("console_type").notNull().default("any"),
  daysOfWeek: text("days_of_week").notNull(), // csv: mon,tue,wed,thu,fri,sat,sun
  startTime: text("start_time").notNull(), // "18:00"
  endTime: text("end_time").notNull(), // "23:59"
  rateType: text("rate_type", { enum: ["multiplier", "fixed"] }).notNull(),
  rateValue: doublePrecision("rate_value").notNull(),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** ================= SHIFT & CASHIER ================= */

export const shifts = pgTable("shifts", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  staffUserId: text("staff_user_id").notNull().references(() => staffUsers.id),
  openedAt: text("opened_at").notNull().$defaultFn(nowIso),
  closedAt: text("closed_at"),
  openingCash: doublePrecision("opening_cash").notNull().default(0),
  expectedCash: doublePrecision("expected_cash"),
  actualCash: doublePrecision("actual_cash"),
  variance: doublePrecision("variance"),
  // Sum of |actual - expected| across every non-cash balance-tracked channel checked at close
  // (GoPay/DANA/BukuPay/Fastpay Gateway/PPOB Fastpay saldo) — see shiftBalanceChecks for the
  // per-channel breakdown. Rolled up here so shift history/reports don't need a join just to
  // flag "this shift had a non-cash discrepancy too, not just cash".
  nonCashVarianceTotal: doublePrecision("non_cash_variance_total"),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  notes: text("notes"),
});

/**
 * Physical cash count at shift close, broken down by denomination — "menghitung
 * banyaknya jumlah uang pecahan" instead of one lump actualCash figure. Every
 * standard IDR note/coin value gets its own row (qty × denomination = subtotal),
 * so a shortage/overage is traceable to which specific denomination is off,
 * and a single suspiciously-round "actualCash" number can't be typed in without
 * a plausible physical count backing it up.
 */
export const shiftCashCounts = pgTable("shift_cash_counts", {
  id: id(),
  shiftId: text("shift_id").notNull().references(() => shifts.id),
  denomination: integer("denomination").notNull(), // 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100
  qty: integer("qty").notNull().default(0),
  subtotal: doublePrecision("subtotal").notNull().default(0), // denomination * qty, stored for audit even if the calc logic changes later
});

/**
 * Non-cash channel balance verification at shift close (GoPay/DANA/BukuPay/
 * Fastpay Gateway settlement + PPOB Fastpay deposit saldo) — these can't be
 * physically counted, so the cashier reads the balance shown in that app/
 * dashboard and types it in; expectedBalance is the system's own cumulative
 * GL balance for that account as of close time. Populated as a blind count
 * (expectedBalance is computed and stored, but never shown to the cashier
 * before they submit actualBalance — see closeShift()).
 */
export const shiftBalanceChecks = pgTable("shift_balance_checks", {
  id: id(),
  shiftId: text("shift_id").notNull().references(() => shifts.id),
  channelKey: text("channel_key").notNull(), // payments.method value, or "ppob_fastpay_saldo"
  label: text("label").notNull(),
  cashBankAccountId: text("cash_bank_account_id").references(() => cashBankAccounts.id),
  expectedBalance: doublePrecision("expected_balance").notNull().default(0),
  actualBalance: doublePrecision("actual_balance").notNull().default(0),
  variance: doublePrecision("variance").notNull().default(0),
});

/** ================= APPROVALS & AUDIT ================= */

export const approvalRequests = pgTable("approval_requests", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  type: text("type", { enum: ["void_order", "void_item", "refund", "discount_override", "cancel_session"] }).notNull(),
  refType: text("ref_type").notNull(),
  refId: text("ref_id").notNull(),
  requestedBy: text("requested_by").references(() => staffUsers.id),
  reason: text("reason"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => staffUsers.id),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  outletId: text("outlet_id").references(() => outlets.id),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  ...timestamps,
});

/** ---------------- FEATURE FLAGS ---------------- */
/**
 * Generic outlet-scoped feature toggle registry — built for Home Rental
 * ("Sewa Dibawa Pulang") but intentionally generic in shape so future
 * feature modules can reuse the same table instead of each inventing its
 * own on/off column. A flag with parentKey set is a sub-flag: when its
 * parent is OFF the sub-flag is treated as OFF too regardless of its own
 * `enabled` value (enforced in lib/home-rental/feature-flags.ts, not at the
 * DB level) — but the sub-flag's own `enabled` value is preserved so
 * re-enabling the parent restores exactly what was on before, per the "OFF
 * != DELETE" requirement. Turning a feature off NEVER deletes rows in any
 * other table — every Home Rental table below stays fully intact and
 * queryable by permitted roles regardless of flag state; only the UI/API
 * surface for creating NEW transactions is gated.
 */
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    key: text("key").notNull(), // e.g. "HOME_RENTAL_ENABLED", "HOME_RENTAL_PS3"
    parentKey: text("parent_key"), // null for root flags
    label: text("label").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(false),
    enabledBy: text("enabled_by").references(() => staffUsers.id),
    enabledAt: text("enabled_at"),
    updatedBy: text("updated_by").references(() => staffUsers.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("feature_flags_outlet_key_idx").on(t.outletId, t.key)]
);

/** ---------------- HOME RENTAL (Sewa Dibawa Pulang) ---------------- */
/**
 * Take-home rental module — a customer borrows a physical console/TV off
 * premises for a scheduled period, distinct from rentalUnits above (fixed
 * in-store booths). Product/Asset are deliberately separate concepts: one
 * homeRentalProducts row ("PlayStation 5") can have many homeRentalAssets
 * rows (physical units "PS5-001", "PS5-002", ...), matching how a real shop
 * tracks serialized inventory. Phase 1 covers the core Booking -> Checkout
 * (asset allocation + payment + deposit) -> Return workflow; full deposit
 * lifecycle with approval, digital contract, before/after inspection,
 * damage case management, delivery/driver tracking, and customer risk
 * scoring are later phases layered on this same schema.
 */
export const homeRentalProducts = pgTable("home_rental_products", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["ps3", "ps4", "ps5", "playbook", "tv32", "tv43", "accessory"] }).notNull(),
  dailyRate: doublePrecision("daily_rate").notNull().default(0),
  weekendRate: doublePrecision("weekend_rate"),
  overnightRate: doublePrecision("overnight_rate"),
  deliveryFee: doublePrecision("delivery_fee").notNull().default(0),
  pickupFee: doublePrecision("pickup_fee").notNull().default(0),
  defaultDepositAmount: doublePrecision("default_deposit_amount").notNull().default(0),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** One physical, individually-trackable unit of a homeRentalProducts row. */
export const homeRentalAssets = pgTable(
  "home_rental_assets",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    productId: text("product_id").notNull().references(() => homeRentalProducts.id),
    assetCode: text("asset_code").notNull(), // e.g. "PS5-001" — also the QR/barcode payload
    serialNumber: text("serial_number"),
    model: text("model"),
    purchaseCost: doublePrecision("purchase_cost").notNull().default(0),
    currentValue: doublePrecision("current_value").notNull().default(0),
    condition: text("condition", { enum: ["excellent", "good", "fair", "poor"] }).notNull().default("good"),
    location: text("location"),
    status: text("status", {
      enum: [
        "available", "reserved", "preparing", "rented_out", "out_for_delivery",
        "returning", "inspection", "damaged", "missing", "repair", "retired",
      ],
    }).notNull().default("available"),
    note: text("note"),
    fixedAssetId: text("fixed_asset_id").references(() => fixedAssets.id), // optional link into the Fixed Asset/Depreciation module
    isActive: boolean("is_active").notNull().default(true), // soft-delete/retire
    ...timestamps,
  },
  (t) => [uniqueIndex("home_rental_assets_outlet_code_idx").on(t.outletId, t.assetCode)]
);

export const homeRentalPackages = pgTable("home_rental_packages", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(), // e.g. "PS5 + TV 43"
  dailyRate: doublePrecision("daily_rate").notNull().default(0),
  weekendRate: doublePrecision("weekend_rate"),
  overnightRate: doublePrecision("overnight_rate"),
  deliveryFee: doublePrecision("delivery_fee").notNull().default(0),
  pickupFee: doublePrecision("pickup_fee").notNull().default(0),
  defaultDepositAmount: doublePrecision("default_deposit_amount").notNull().default(0),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const homeRentalPackageItems = pgTable("home_rental_package_items", {
  id: id(),
  packageId: text("package_id").notNull().references(() => homeRentalPackages.id),
  productId: text("product_id").notNull().references(() => homeRentalProducts.id),
  quantity: integer("quantity").notNull().default(1),
});

export const homeRentalRentals = pgTable("home_rental_rentals", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  rentalCode: text("rental_code").notNull().unique(), // "HR-00001"
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  phone: text("phone"),
  address: text("address"),
  packageId: text("package_id").references(() => homeRentalPackages.id),
  productId: text("product_id").references(() => homeRentalProducts.id), // set when renting a single product outside a package
  scheduledStart: text("scheduled_start").notNull(),
  scheduledEnd: text("scheduled_end").notNull(),
  pickedUpAt: text("picked_up_at"), // set at checkout
  returnedAt: text("returned_at"), // set at return
  status: text("status", {
    enum: ["booked", "active", "returned", "cancelled", "no_show"],
  }).notNull().default("booked"),
  rentalFee: doublePrecision("rental_fee").notNull().default(0),
  deliveryFee: doublePrecision("delivery_fee").notNull().default(0),
  pickupFee: doublePrecision("pickup_fee").notNull().default(0),
  lateFee: doublePrecision("late_fee").notNull().default(0),
  discountAmount: doublePrecision("discount_amount").notNull().default(0),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  paymentMethod: text("payment_method"),
  depositAmount: doublePrecision("deposit_amount").notNull().default(0),
  depositStatus: text("deposit_status", { enum: ["none", "held", "released", "partially_deducted", "forfeited"] }).notNull().default("none"),
  depositPaymentMethod: text("deposit_payment_method"),
  depositJournalEntryId: text("deposit_journal_entry_id"),
  revenueJournalEntryId: text("revenue_journal_entry_id"),
  deliveryMethod: text("delivery_method", { enum: ["pickup_by_customer", "delivery"] }).notNull().default("pickup_by_customer"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  shiftId: text("shift_id"), // open shift at checkout time, if any — feeds shift cash reconciliation, same convention as otherIncomes.shiftId
  // Return can happen on a different shift/day than checkout, so its cash movements
  // (late fee collected, deposit released back to the customer) need their own shift
  // reference — reconciling them against the checkout shift would be wrong once time
  // has passed.
  returnShiftId: text("return_shift_id"),
  lateFeePaymentMethod: text("late_fee_payment_method"),
  cancelledAt: text("cancelled_at"),
  cancelReason: text("cancel_reason"),
  // Risk-control gate (HOME_RENTAL_RISK) — set to "pending" instead of letting a booking
  // proceed straight to "booked" when the customer's computed risk is high; a manager/owner
  // (holding approve_requests) must approve/reject before checkout is allowed. "not_required"
  // is the default for every booking made while risk control is off or the customer is low risk.
  approvalStatus: text("approval_status", { enum: ["not_required", "pending", "approved", "rejected"] }).notNull().default("not_required"),
  approvedBy: text("approved_by").references(() => staffUsers.id),
  approvedAt: text("approved_at"),
  approvalNote: text("approval_note"),
  // ---- Identity documents (photo + number) — captured at booking time for verification.
  // Kartu Pelajar and KTP Orang Tua are optional (only relevant for underage/student renters);
  // KTP pelanggan is the main one but still nullable since staff may fill it in progressively.
  customerIdentityNumber: text("customer_identity_number"), // KTP pelanggan
  customerIdentityImageUrl: text("customer_identity_image_url"),
  studentIdNumber: text("student_id_number"), // Kartu Pelajar
  studentIdImageUrl: text("student_id_image_url"),
  parentName: text("parent_name"), // Nama orang tua/wali (untuk penyewa di bawah umur)
  parentIdentityNumber: text("parent_identity_number"), // KTP orang tua/wali
  parentIdentityImageUrl: text("parent_identity_image_url"),
  // ---- Staff verification checklist — a fixed, known set of checks (not a dynamic list), so
  // flat columns instead of a separate table, same convention as approvalStatus/approvedBy above.
  verifiedKtp: boolean("verified_ktp").notNull().default(false),
  verifiedStudentId: boolean("verified_student_id").notNull().default(false),
  verifiedParentId: boolean("verified_parent_id").notNull().default(false),
  // GetContact is a widely-used ID caller-ID app in Indonesia — staff cross-checks the renter's
  // phone number there to see what name(s) it's saved under across other people's contacts, as
  // an extra fraud signal beyond the KTP itself. getContactResultName records what name showed
  // up so a mismatch against the KTP name is visible later without re-checking the app.
  verifiedGetContact: boolean("verified_get_contact").notNull().default(false),
  getContactResultName: text("get_contact_result_name"),
  verificationNote: text("verification_note"),
  verifiedBy: text("verified_by").references(() => staffUsers.id),
  verifiedAt: text("verified_at"),
  ...timestamps,
});

/** Itemized checklist of exactly what physical items/perlengkapan go out with a rental (e.g. "Kabel HDMI", "Charger", "Controller ekstra", "Dus/box") — separate from the structured Product/Asset registry above since this is a free-form per-transaction packing list, not inventory-tracked stock. */
export const homeRentalRentalItems = pgTable("home_rental_rental_items", {
  id: id(),
  rentalId: text("rental_id").notNull().references(() => homeRentalRentals.id),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  note: text("note"),
  ...timestamps,
});

/** Which physical assets are/were allocated to a given rental — join table so a package rental (multiple products) can carry multiple assets. */
export const homeRentalRentalAssets = pgTable("home_rental_rental_assets", {
  id: id(),
  rentalId: text("rental_id").notNull().references(() => homeRentalRentals.id),
  assetId: text("asset_id").notNull().references(() => homeRentalAssets.id),
  scannedOutAt: text("scanned_out_at"),
  scannedInAt: text("scanned_in_at"),
});

/**
 * One row per customer phone number per outlet — the running risk profile computed from that
 * customer's Home Rental history (late returns, no-shows, cancellations, damaged/missing
 * assets, outstanding balances). Recomputed (see lib/home-rental/risk.ts) after every
 * checkout/return/cancel/no-show so riskScore stays current without a separate batch job.
 * Deliberately phone-keyed rather than customerId-only because most Home Rental customers are
 * walk-in/WA leads without a full Customer record — customerId is an optional enrichment link,
 * not the primary key. "Customer banking data" from the request is treated here as identity +
 * behavioral risk data (KTP/ID number, emergency contact, rental history), not literal bank
 * account/card storage — this app has no payment-card handling anywhere else in the schema and
 * taking on PCI-like scope wasn't part of the explicit ask.
 */
export const homeRentalCustomerRisk = pgTable(
  "home_rental_customer_risk",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    phone: text("phone").notNull(),
    customerId: text("customer_id").references(() => customers.id),
    customerName: text("customer_name"),
    identityType: text("identity_type", { enum: ["ktp", "sim", "passport", "other"] }),
    identityNumber: text("identity_number"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    verificationStatus: text("verification_status", { enum: ["unverified", "verified", "flagged"] }).notNull().default("unverified"),
    riskScore: integer("risk_score").notNull().default(0), // 0-100, higher = riskier
    riskLevel: text("risk_level", { enum: ["low", "medium", "high"] }).notNull().default("low"),
    totalRentals: integer("total_rentals").notNull().default(0),
    lateReturnCount: integer("late_return_count").notNull().default(0),
    noShowCount: integer("no_show_count").notNull().default(0),
    cancellationCount: integer("cancellation_count").notNull().default(0),
    damagedAssetCount: integer("damaged_asset_count").notNull().default(0),
    missingAssetCount: integer("missing_asset_count").notNull().default(0),
    outstandingAmount: doublePrecision("outstanding_amount").notNull().default(0),
    isBlacklisted: boolean("is_blacklisted").notNull().default(false),
    blacklistReason: text("blacklist_reason"),
    blacklistedBy: text("blacklisted_by").references(() => staffUsers.id),
    blacklistedAt: text("blacklisted_at"),
    notes: text("notes"),
    lastComputedAt: text("last_computed_at"),
    updatedBy: text("updated_by").references(() => staffUsers.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("home_rental_customer_risk_outlet_phone_idx").on(t.outletId, t.phone)]
);

/**
 * ================= NEXBILL PLATFORM BILLING (trial / subscription / licensing) =================
 * Everything below governs the commercial relationship between NEXBILL (the SaaS operator) and
 * an `outlets` row (a rental-PS tenant paying to use this software) — NOT the outlet's own
 * customer-facing rental/POS business, which is what every other table in this file models.
 * `outlets` is kept as the tenant boundary (it's already the root FK for staff/devices/rental
 * units/accounting everywhere else) rather than introducing a separate "organization" concept —
 * an owner running multiple physical locations subscribes/pays per outlet, same as every other
 * per-outlet setting in this schema (Tuya credentials, payment methods, etc.).
 */

/**
 * Cross-outlet operator login — deliberately NOT a `staffUsers` row, because staffUsers is
 * hard-scoped to one outletId and every permission check in lib/auth/permissions.ts assumes a
 * single-tenant session. The NEXBILL team needs to see/manage every outlet's subscription,
 * confirm platform payments, and track smart plug fulfillment — a different, cross-tenant
 * authorization boundary, so it gets its own minimal table + its own session cookie
 * (see lib/platform-admin/auth.ts, not yet built). Small and role-less on purpose: this is an
 * internal ops tool, not a customer-facing feature.
 */
export const platformAdmins = pgTable("platform_admins", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * The sellable plan catalog (today: one "standard" plan — Rp399.000 struck through to a
 * Rp249.000/bulan promo price, 10 consoles included, per the landing page/pricing already
 * agreed) — kept as a table instead of hardcoded constants so price/promo changes and future
 * tiers don't need a redeploy. `priceOriginal`/`priceCurrent` both stored so the strikethrough
 * promo display and any "hemat RpX" copy can be computed directly from data, matching the
 * landing page's `.price-old` / current-price markup.
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: id(),
  code: text("code").notNull().unique(), // "standard" today; future: "pro", "enterprise"
  name: text("name").notNull(),
  priceOriginal: doublePrecision("price_original").notNull(), // 399000
  priceCurrent: doublePrecision("price_current").notNull(), // 249000 (promo price actually billed)
  includedConsoles: integer("included_consoles").notNull().default(10),
  extraConsolePrice: doublePrecision("extra_console_price").notNull().default(20000), // per console/bulan beyond includedConsoles
  smartPlugPrice: doublePrecision("smart_plug_price").notNull().default(275000), // per unit hardware, billed separately from the plan itself
  setupServicePrice: doublePrecision("setup_service_price").notNull().default(125000), // one-time, only if vendor-installed
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/**
 * One row per outlet — the tenant's current commercial/lifecycle state. This is the row every
 * trial-gate / feature-lock / billing-page check reads (see lib/subscription/gate.ts, not yet
 * built). History of individual charges lives in `subscriptionInvoices` below; this row only
 * ever holds the CURRENT state, same pattern as `outlets` holding current settings directly.
 *
 * status lifecycle:
 *   trial -> (30 hari habis) -> trial_expired -> (checkout selesai + invoice pertama lunas) -> active
 *   active -> (gagal bayar saat renewal) -> grace -> (tidak bayar sampai graceUntil) -> suspended
 *   suspended -> (bayar tunggakan) -> active
 *   trial | active | grace | suspended -> (dibatalkan pemilik/admin) -> cancelled
 * See the technical flow write-up (chat) for exactly which UI/cron transitions each edge.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    status: text("status", {
      enum: ["trial", "trial_expired", "pending_payment", "active", "grace", "suspended", "cancelled"],
    })
      .notNull()
      .default("trial"),
    planId: text("plan_id").references(() => subscriptionPlans.id), // null while still trial/pending_payment

    // --- Trial window ---
    trialStartedAt: text("trial_started_at").notNull().$defaultFn(nowIso),
    trialEndsAt: text("trial_ends_at").notNull(), // trialStartedAt + 30 hari, computed at insert
    // The single rentalUnits row this outlet is allowed to bind an Android-TV-family device
    // (protocol android_tv / android_tv_relay) to during trial — smart-plug-family protocols
    // (tuya/tasmota_mqtt/sonoff_ewelink/http_generic) are blocked outright pre-purchase. Set the
    // first time a trial outlet successfully provisions a device; enforced in the devices API,
    // not here. Null until then.
    trialAllowedUnitId: text("trial_allowed_unit_id").references(() => rentalUnits.id),
    aiLockedDuringTrial: boolean("ai_locked_during_trial").notNull().default(true),

    // --- TV composition snapshot, captured from rentalUnits at checkout time (see technical
    // flow) — drives whether a smart plug purchase is required and how many units. Kept as a
    // snapshot (not a live COUNT query) so a subscription's billed smart-plug quantity doesn't
    // silently drift if the owner adds/removes units after paying; a plan/quantity CHANGE is a
    // deliberate re-checkout that updates these fields, not an automatic recompute.
    androidTvUnitCount: integer("android_tv_unit_count").notNull().default(0),
    nonAndroidTvUnitCount: integer("non_android_tv_unit_count").notNull().default(0), // smart_tv + analog_tv
    smartPlugRequiredQty: integer("smart_plug_required_qty").notNull().default(0), // == nonAndroidTvUnitCount at last checkout
    smartPlugOwnedQty: integer("smart_plug_owned_qty").notNull().default(0), // fulfilled units, see smartPlugOrders

    // --- Billing cycle (only meaningful once status has ever reached "active") ---
    currentPeriodStart: text("current_period_start"),
    currentPeriodEnd: text("current_period_end"), // next renewal due date
    graceUntil: text("grace_until"), // set when a renewal invoice goes unpaid past currentPeriodEnd

    cancelledAt: text("cancelled_at"),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [uniqueIndex("subscriptions_outlet_idx").on(t.outletId)]
);

/**
 * Append-only platform billing history — every amount NEXBILL has ever invoiced an outlet for:
 * the recurring subscription fee, a one-off smart plug hardware purchase, the optional setup
 * service, or an extra-console addon. Deliberately separate from this app's own `orders`/
 * `payments` tables, which model the OUTLET's revenue from ITS customers — this is the reverse
 * money direction (outlet owner pays NEXBILL) and must never touch the outlet's own P&L/journal.
 * `qrImageUrl`/`providerRef`/etc. mirror the shape of `payments` so the same QRIS-gateway
 * plumbing (lib/payments) can be reused for collecting platform invoices, not just customer bills.
 */
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: id(),
  invoiceNumber: text("invoice_number").notNull().unique(), // "SUB-INV-00001"
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  type: text("type", {
    enum: ["subscription_fee", "smart_plug_purchase", "setup_service", "extra_console"],
  }).notNull(),
  period: text("period"), // "2026-09" for subscription_fee renewals; null for one-off hardware/setup charges
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unitPrice: doublePrecision("unit_price").notNull(),
  amount: doublePrecision("amount").notNull(), // qty * unitPrice
  status: text("status", { enum: ["unpaid", "paid", "cancelled"] }).notNull().default("unpaid"),
  dueDate: text("due_date"),
  method: text("method"), // "qris" | "transfer" | "cash" | "va_bca" | ... — set once a payment attempt starts
  providerRef: text("provider_ref"),
  qrString: text("qr_string"),
  qrImageUrl: text("qr_image_url"),
  vaNumber: text("va_number"), // virtual account number to transfer to, when method is "va_*"
  vaBankCode: text("va_bank_code"), // "bca" | "bni" | "mandiri" | "bri" | "permata"
  paidAt: text("paid_at"),
  emailSentAt: text("email_sent_at"), // when the "informasi pembayaran" email carrying this invoice went out
  ...timestamps,
});

/**
 * Fulfillment tracking for physical smart plug hardware sold to an outlet — created once a
 * subscriptionInvoices row of type "smart_plug_purchase" is paid. Separate from that invoice
 * because paying for hardware and receiving/installing it are different real-world events with
 * their own timeline (shipping, or a scheduled vendor install visit).
 */
export const smartPlugOrders = pgTable("smart_plug_orders", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  subscriptionInvoiceId: text("subscription_invoice_id").notNull().references(() => subscriptionInvoices.id),
  qty: integer("qty").notNull().default(1),
  installRequested: boolean("install_requested").notNull().default(false), // false = self-install
  installStatus: text("install_status", {
    enum: ["not_requested", "requested", "scheduled", "completed"],
  })
    .notNull()
    .default("not_requested"),
  scheduledDate: text("scheduled_date"),
  contactName: text("contact_name"), // PIC di lokasi outlet untuk janji instalasi
  contactPhone: text("contact_phone"),
  shippingAddress: text("shipping_address"),
  courierTrackingNumber: text("courier_tracking_number"),
  serialNumbers: text("serial_numbers"), // JSON array of strings, filled in on fulfillment for warranty/support lookup
  manualDownloadedAt: text("manual_downloaded_at"), // first time the buku manual PDF was downloaded, for support/analytics
  notes: text("notes"),
  ...timestamps,
});

/**
 * Append-only audit trail of subscription lifecycle transitions — what the daily
 * subscription-scheduler (see technical flow) uses to know which reminder emails/WA messages
 * it has already sent, so a cron running every day doesn't re-send the same H-5/H-2/H-0 trial
 * reminder or renewal reminder twice. Also doubles as the human-readable "riwayat langganan"
 * shown on the outlet's billing page and the platform admin's outlet detail view.
 */
export const subscriptionEvents = pgTable("subscription_events", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  type: text("type", {
    enum: [
      "trial_started", "trial_reminder_h5", "trial_reminder_h2", "trial_reminder_h0",
      "trial_expired", "checkout_started", "invoice_created", "invoice_paid",
      "subscription_activated", "renewal_reminder", "renewal_invoice_created",
      "grace_started", "suspended", "reactivated", "cancelled", "plan_changed",
    ],
  }).notNull(),
  note: text("note"),
  ...timestamps,
});
