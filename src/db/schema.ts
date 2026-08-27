import { pgTable, text, integer, real, doublePrecision, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

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
  isActive: boolean("is_active").notNull().default(true),
  slug: text("slug").unique(),
  logoUrl: text("logo_url"),
  wifiSsid: text("wifi_ssid"),
  wifiPassword: text("wifi_password"),
  billingRoundingMinutes: integer("billing_rounding_minutes").notNull().default(15),
  serviceChargePercent: doublePrecision("service_charge_percent").notNull().default(0),
  taxPercent: doublePrecision("tax_percent").notNull().default(0),
  expenseApprovalThreshold: doublePrecision("expense_approval_threshold").notNull().default(500000),
  printerName: text("printer_name"),
  printerPaperWidthMm: integer("printer_paper_width_mm").notNull().default(58),
  receiptFooterText: text("receipt_footer_text"),
  notifyLowStock: boolean("notify_low_stock").notNull().default(true),
  notifyPendingApproval: boolean("notify_pending_approval").notNull().default(true),
  notifyShiftVariance: boolean("notify_shift_variance").notNull().default(true),
  notifyBookingReminder: boolean("notify_booking_reminder").notNull().default(true),
  bookingBufferMinutes: integer("booking_buffer_minutes").notNull().default(0),
  bookingAutoReleaseMinutes: integer("booking_auto_release_minutes").notNull().default(15),
  bookingMinLeadMinutes: integer("booking_min_lead_minutes").notNull().default(0),
  acceptOnlineBooking: boolean("accept_online_booking").notNull().default(true),
  salesTargetMonthly: doublePrecision("sales_target_monthly"),
  onboardingProfile: text("onboarding_profile"),
  referredByCode: text("referred_by_code"),
  referredByPartnerId: text("referred_by_partner_id").references((): AnyPgColumn => referralPartners.id),
  bankCountry: text("bank_country"),
  bankName: text("bank_name"),
  bankSwiftCode: text("bank_swift_code"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolderName: text("bank_account_holder_name"),
  outletCountry: text("outlet_country"),
  province: text("province"),
  city: text("city"),
  postalCode: text("postal_code"),
  preferredLang: text("preferred_lang").notNull().default("id"),
  ...timestamps,
});

export const staffUsers = pgTable("staff_users", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  authProvider: text("auth_provider", { enum: ["password", "google"] }).notNull().default("password"),
  googleId: text("google_id").unique(),
  role: text("role", { enum: ["superuser", "owner", "manager", "cashier", "accountant", "kitchen", "supervisor"] })
    .notNull()
    .default("cashier"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const outletMemberships = pgTable(
  "outlet_memberships",
  {
    id: id(),
    staffUserId: text("staff_user_id").notNull().references(() => staffUsers.id),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    ...timestamps,
  },
  (table) => ({
    uniqueMembership: uniqueIndex("outlet_memberships_staff_outlet_idx").on(table.staffUserId, table.outletId),
  })
);

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
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** ---------------- CUSTOMERS ---------------- */

export const customers = pgTable(
  "customers",
  {
    id: id(),
    outletId: text("outlet_id").references(() => outlets.id),
    memberNumber: text("member_number").unique(),
    name: text("name"),
    phone: text("phone").unique(),
    email: text("email"),
    instagramHandle: text("instagram_handle"),
    waJid: text("wa_jid"),
    notes: text("notes"),
    membershipTierId: text("membership_tier_id"),
    totalSpending: doublePrecision("total_spending").notNull().default(0),
    loyaltyPoints: doublePrecision("loyalty_points").notNull().default(0),
    lastVisitAt: text("last_visit_at"),
    ...timestamps,
  },
  (t) => [index("customers_outlet_idx").on(t.outletId)]
);

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
  gameName: text("game_name"),
  discountAmount: doublePrecision("discount_amount").notNull().default(0),
  voucherId: text("voucher_id"),
  bookingId: text("booking_id"),
  shiftId: text("shift_id"),
  ...timestamps,
});

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

export const products = pgTable(
  "products",
  {
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
    preferredSupplierId: text("preferred_supplier_id").references(() => suppliers.id),
    unit: text("unit").notNull().default("pcs"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("products_outlet_idx").on(t.outletId)]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    productId: text("product_id").notNull().references(() => products.id),
    type: text("type", { enum: ["purchase_in", "sale_out", "adjustment", "waste"] }).notNull(),
    qty: integer("qty").notNull(),
    note: text("note"),
    refOrderId: text("ref_order_id"),
    staffUserId: text("staff_user_id").references(() => staffUsers.id),
    ...timestamps,
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)]
);

/** ---------------- ORDERS ---------------- */

export const orders = pgTable(
  "orders",
  {
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
  },
  (t) => [index("orders_outlet_status_idx").on(t.outletId, t.status), index("orders_outlet_created_idx").on(t.outletId, t.createdAt)]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id").notNull().references(() => orders.id),
    productId: text("product_id").references(() => products.id),
    description: text("description").notNull(),
    qty: integer("qty").notNull().default(1),
    unitPrice: doublePrecision("unit_price").notNull(),
    lineTotal: doublePrecision("line_total").notNull(),
    itemType: text("item_type", { enum: ["rental", "product", "misc", "accessory"] }).notNull().default("product"),
    kitchenStatus: text("kitchen_status", {
      enum: ["new", "confirmed", "preparing", "ready", "served", "cancelled"],
    }).notNull().default("served"),
    cancelReason: text("cancel_reason"),
    voidedBy: text("voided_by").references(() => staffUsers.id),
    voidedAt: text("voided_at"),
    ...timestamps,
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

/** ---------------- PAYMENTS ---------------- */

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id").notNull().references(() => orders.id),
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
  },
  (t) => [index("payments_order_idx").on(t.orderId)]
);

/** ---------------- CHAT ---------------- */

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

export const supportThreads = pgTable("support_threads", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  subject: text("subject"),
  category: text("category", { enum: ["keluhan", "saran", "kendala_teknis", "lainnya"] }).notNull().default("lainnya"),
  status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
  lastMessageAt: text("last_message_at"),
  ...timestamps,
});

export const supportMessages = pgTable("support_messages", {
  id: id(),
  threadId: text("thread_id").notNull().references(() => supportThreads.id),
  sender: text("sender", { enum: ["outlet", "platform_admin"] }).notNull(),
  senderName: text("sender_name"),
  body: text("body").notNull(),
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

export const platformTuyaAccount = pgTable("platform_tuya_account", {
  id: id(),
  accessId: text("access_id"),
  accessSecret: text("access_secret"),
  projectCode: text("project_code"),
  region: text("region", { enum: ["cn", "us", "us_e", "eu", "eu_w", "in", "sg"] }).notNull().default("sg"),
  ...timestamps,
});

/** ================= ACCOUNTING ================= */

export const accounts = pgTable("accounts", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["asset", "liability", "equity", "revenue", "expense"] }).notNull(),
  normalBalance: text("normal_balance", { enum: ["debit", "credit"] }).notNull(),
  isSystemAccount: boolean("is_system_account").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  parentId: text("parent_id"),
  isPostingAllowed: boolean("is_posting_allowed").notNull().default(true),
  costCenter: text("cost_center"),
  taxCode: text("tax_code"),
  ...timestamps,
}, (table) => ({
  outletCodeIdx: uniqueIndex("accounts_outlet_code_idx").on(table.outletId, table.code),
}));

export const accountMappings = pgTable("account_mappings", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  module: text("module", {
    enum: ["rental", "addon", "fnb", "fnb_cogs", "product_sale", "product_sale_cogs", "ppob", "expense", "asset", "asset_accum_depr", "depreciation", "payment", "product", "other", "other_income", "home_rental", "membership_fee"],
  }).notNull(),
  transactionKey: text("transaction_key").notNull(),
  accountId: text("account_id").notNull().references(() => accounts.id),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (table) => ({
  outletModuleKeyIdx: uniqueIndex("account_mappings_outlet_module_key_idx").on(table.outletId, table.module, table.transactionKey),
}));

export const journalEntries = pgTable(
  "journal_entries",
  {
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
        "home_rental", "membership_fee",
      ],
    }).notNull(),
    sourceId: text("source_id"),
    status: text("status", { enum: ["posted", "void"] }).notNull().default("posted"),
    staffUserId: text("staff_user_id").references(() => staffUsers.id),
    voidedAt: text("voided_at"),
    voidReason: text("void_reason"),
    ...timestamps,
  },
  (t) => [index("journal_entries_outlet_date_idx").on(t.outletId, t.entryDate)]
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: id(),
    journalEntryId: text("journal_entry_id").notNull().references(() => journalEntries.id),
    accountId: text("account_id").notNull().references(() => accounts.id),
    debit: doublePrecision("debit").notNull().default(0),
    credit: doublePrecision("credit").notNull().default(0),
    description: text("description"),
    lineOrder: integer("line_order").notNull().default(0),
  },
  (t) => [index("journal_lines_entry_idx").on(t.journalEntryId), index("journal_lines_account_idx").on(t.accountId)]
);

export const cashBankAccounts = pgTable("cash_bank_accounts", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank"] }).notNull().default("cash"),
  accountId: text("account_id").notNull().references(() => accounts.id),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});

export const ppobTransactions = pgTable("ppob_transactions", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  category: text("category", {
    enum: ["ewallet_topup", "token_listrik", "pulsa", "transfer", "tarik_tunai", "lainnya"],
  }).notNull(),
  product: text("product").notNull(),
  serviceRef: text("service_ref"),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  nominal: doublePrecision("nominal").notNull().default(0),
  modal: doublePrecision("modal").notNull().default(0),
  providerFee: doublePrecision("provider_fee").notNull().default(0),
  feeAdmin: doublePrecision("fee_admin").notNull().default(0),
  uangMasuk: doublePrecision("uang_masuk").notNull().default(0),
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

export const paymentMethods = pgTable("payment_methods", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  kind: text("kind", { enum: ["cash", "balance_tracked", "info_only"] }).notNull().default("info_only"),
  feePercent: doublePrecision("fee_percent").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const depositBalanceChannels = pgTable(
  "deposit_balance_channels",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    channelKey: text("channel_key").notNull(),
    label: text("label").notNull(),
    accountId: text("account_id").notNull().references(() => accounts.id),
    cashBankAccountId: text("cash_bank_account_id").notNull().references(() => cashBankAccounts.id),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("deposit_balance_channels_outlet_key_idx").on(t.outletId, t.channelKey)]
);

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

export const receivables = pgTable(
  "receivables",
  {
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
  },
  (t) => [index("receivables_outlet_status_idx").on(t.outletId, t.status)]
);

export const costCenters = pgTable("cost_centers", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  code: text("code"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    expenseNumber: text("expense_number").notNull().unique(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    accountId: text("account_id").notNull().references(() => accounts.id),
    category: text("category").notNull(),
    description: text("description"),
    payeeName: text("payee_name"),
    supplierId: text("supplier_id").references(() => suppliers.id),
    qty: integer("qty").notNull().default(1),
    amount: doublePrecision("amount").notNull(),
    taxAmount: doublePrecision("tax_amount").notNull().default(0),
    attachmentUrl: text("attachment_url"),
    paymentMethod: text("payment_method", { enum: ["cash", "bank", "transfer", "qris"] }),
    recordAsPayable: boolean("record_as_payable").notNull().default(false),
    costCenterId: text("cost_center_id").references(() => costCenters.id),
    rentalUnitId: text("rental_unit_id").references(() => rentalUnits.id),
    dueDate: text("due_date"),
    status: text("status", {
      enum: ["draft", "pending_approval", "approved", "paid", "rejected", "cancelled"],
    }).notNull().default("draft"),
    cashBankAccountId: text("cash_bank_account_id").references(() => cashBankAccounts.id),
    shiftId: text("shift_id"),
    staffUserId: text("staff_user_id").references(() => staffUsers.id),
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
    journalEntryId: text("journal_entry_id"),
    paymentJournalEntryId: text("payment_journal_entry_id"),
    isRecurringInstance: boolean("is_recurring_instance").notNull().default(false),
    recurringTemplateId: text("recurring_template_id"),
    expenseDate: text("expense_date").notNull().$defaultFn(nowIso),
    ...timestamps,
  },
  (t) => [index("expenses_outlet_status_idx").on(t.outletId, t.status)]
);

export const otherIncomes = pgTable("other_incomes", {
  id: id(),
  incomeNumber: text("income_number").notNull().unique(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  category: text("category", {
    enum: ["vendor_commission", "asset_rental", "asset_sale", "sponsorship", "penalty_compensation", "bank_interest_cashback", "other"],
  }).notNull(),
  description: text("description"),
  payerName: text("payer_name"),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  feeAmount: doublePrecision("fee_amount").notNull().default(0),
  cashBankAccountId: text("cash_bank_account_id").references(() => cashBankAccounts.id),
  attachmentUrl: text("attachment_url"),
  costCenterId: text("cost_center_id").references(() => costCenters.id),
  status: text("status", { enum: ["posted", "void"] }).notNull().default("posted"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  shiftId: text("shift_id"),
  journalEntryId: text("journal_entry_id"),
  voidedBy: text("voided_by").references(() => staffUsers.id),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
  incomeDate: text("income_date").notNull().$defaultFn(nowIso),
  ...timestamps,
});

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
  dayOfMonth: integer("day_of_month"),
  nextDueDate: text("next_due_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastGeneratedAt: text("last_generated_at"),
  ...timestamps,
});

export const fixedAssets = pgTable("fixed_assets", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  category: text("category", { enum: ["playstation", "tv", "controller", "furniture", "vehicle", "other"] }).notNull(),
  rentalUnitId: text("rental_unit_id").references(() => rentalUnits.id),
  acquisitionDate: text("acquisition_date").notNull().$defaultFn(nowIso),
  acquisitionCost: doublePrecision("acquisition_cost").notNull(),
  salvageValue: doublePrecision("salvage_value").notNull().default(0),
  usefulLifeMonths: integer("useful_life_months").notNull(),
  accumulatedDepreciation: doublePrecision("accumulated_depreciation").notNull().default(0),
  status: text("status", { enum: ["active", "under_maintenance", "disposed"] }).notNull().default("active"),
  supplierId: text("supplier_id").references(() => suppliers.id),
  notes: text("notes"),
  journalEntryId: text("journal_entry_id"),
  disposalDate: text("disposal_date"),
  disposalAmount: doublePrecision("disposal_amount"),
  disposalReason: text("disposal_reason"),
  disposalJournalEntryId: text("disposal_journal_entry_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  ...timestamps,
});

export const assetDepreciationEntries = pgTable("asset_depreciation_entries", {
  id: id(),
  fixedAssetId: text("fixed_asset_id").notNull().references(() => fixedAssets.id),
  period: text("period").notNull(),
  amount: doublePrecision("amount").notNull(),
  journalEntryId: text("journal_entry_id"),
  ...timestamps,
});

export const assetMaintenanceLogs = pgTable("asset_maintenance_logs", {
  id: id(),
  fixedAssetId: text("fixed_asset_id").notNull().references(() => fixedAssets.id),
  maintenanceDate: text("maintenance_date").notNull().$defaultFn(nowIso),
  status: text("status", { enum: ["queued", "in_progress", "done"] }).notNull().default("queued"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
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

export const purchaseInvoices = pgTable(
  "purchase_invoices",
  {
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
  },
  (t) => [index("purchase_invoices_outlet_status_idx").on(t.outletId, t.status)]
);

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

/** ================= RECIPE / BOM ================= */

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
  feeAmount: doublePrecision("fee_amount").notNull().default(0),
  pointMultiplier: doublePrecision("point_multiplier").notNull().default(1),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  benefits: text("benefits"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const membershipPayments = pgTable("membership_payments", {
  id: id(),
  paymentNumber: text("payment_number").notNull().unique(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  membershipTierId: text("membership_tier_id").notNull().references(() => membershipTiers.id),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  feeAmount: doublePrecision("fee_amount").notNull().default(0),
  cashBankAccountId: text("cash_bank_account_id").references(() => cashBankAccounts.id),
  status: text("status", { enum: ["posted", "void"] }).notNull().default("posted"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  shiftId: text("shift_id"),
  journalEntryId: text("journal_entry_id"),
  voidedBy: text("voided_by").references(() => staffUsers.id),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
  ...timestamps,
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: id(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  type: text("type", { enum: ["earn", "redeem", "adjust", "expire"] }).notNull(),
  points: doublePrecision("points").notNull(),
  note: text("note"),
  refOrderId: text("ref_order_id"),
  ...timestamps,
});

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
  customerId: text("customer_id").references(() => customers.id),
  ...timestamps,
});

export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["partner_brand", "play_discount"] }).notNull(),
  pointsCost: doublePrecision("points_cost").notNull(),
  partnerBrandName: text("partner_brand_name"),
  description: text("description"),
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
  source: text("source", { enum: ["kasir", "online", "whatsapp"] }).notNull().default("kasir"),
  dpAmount: doublePrecision("dp_amount").notNull().default(0),
  dpPaid: boolean("dp_paid").notNull().default(false),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  waitlistPosition: integer("waitlist_position"),
  rentalSessionId: text("rental_session_id"),
  transferredFromUnitId: text("transferred_from_unit_id"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  confirmedAt: text("confirmed_at"),
  checkedInAt: text("checked_in_at"),
  cancelledAt: text("cancelled_at"),
  noShowAt: text("no_show_at"),
  expiredAt: text("expired_at"),
  ...timestamps,
});

export const bookingNotifications = pgTable("booking_notifications", {
  id: id(),
  bookingId: text("booking_id").references(() => bookings.id),
  homeRentalRentalId: text("home_rental_rental_id").references(() => homeRentalRentals.id),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  type: text("type", {
    enum: [
      "reminder_h24", "reminder_h2", "reminder_15m", "confirmation", "reschedule", "cancellation", "waitlist_available", "no_show", "session_time_warning",
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
  daysOfWeek: text("days_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
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
  nonCashVarianceTotal: doublePrecision("non_cash_variance_total"),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  notes: text("notes"),
});

export const shiftCashCounts = pgTable("shift_cash_counts", {
  id: id(),
  shiftId: text("shift_id").notNull().references(() => shifts.id),
  denomination: integer("denomination").notNull(),
  qty: integer("qty").notNull().default(0),
  subtotal: doublePrecision("subtotal").notNull().default(0),
});

export const shiftBalanceChecks = pgTable("shift_balance_checks", {
  id: id(),
  shiftId: text("shift_id").notNull().references(() => shifts.id),
  channelKey: text("channel_key").notNull(),
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

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    key: text("key").notNull(),
    parentKey: text("parent_key"),
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

export const homeRentalProducts = pgTable("home_rental_products", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["ps3", "ps4", "ps5", "playbook", "tv32", "tv40", "tv43", "accessory"] }).notNull(),
  dailyRate: doublePrecision("daily_rate").notNull().default(0),
  weekendRate: doublePrecision("weekend_rate"),
  overnightRate: doublePrecision("overnight_rate"),
  weeklyRate: doublePrecision("weekly_rate"),
  extraDayRate: doublePrecision("extra_day_rate"),
  deliveryFee: doublePrecision("delivery_fee").notNull().default(0),
  pickupFee: doublePrecision("pickup_fee").notNull().default(0),
  defaultDepositAmount: doublePrecision("default_deposit_amount").notNull().default(0),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const homeRentalAssets = pgTable(
  "home_rental_assets",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    productId: text("product_id").notNull().references(() => homeRentalProducts.id),
    assetCode: text("asset_code").notNull(),
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
    fixedAssetId: text("fixed_asset_id").references(() => fixedAssets.id),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("home_rental_assets_outlet_code_idx").on(t.outletId, t.assetCode)]
);

export const homeRentalPackages = pgTable("home_rental_packages", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  name: text("name").notNull(),
  dailyRate: doublePrecision("daily_rate").notNull().default(0),
  weekendRate: doublePrecision("weekend_rate"),
  overnightRate: doublePrecision("overnight_rate"),
  weeklyRate: doublePrecision("weekly_rate"),
  extraDayRate: doublePrecision("extra_day_rate"),
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
  rentalCode: text("rental_code").notNull().unique(),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  phone: text("phone"),
  address: text("address"),
  packageId: text("package_id").references(() => homeRentalPackages.id),
  productId: text("product_id").references(() => homeRentalProducts.id),
  scheduledStart: text("scheduled_start").notNull(),
  scheduledEnd: text("scheduled_end").notNull(),
  pickedUpAt: text("picked_up_at"),
  returnedAt: text("returned_at"),
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
  distanceKm: doublePrecision("distance_km"),
  damageFee: doublePrecision("damage_fee").notNull().default(0),
  damageNote: text("damage_note"),
  damageFeePaymentMethod: text("damage_fee_payment_method"),
  notes: text("notes"),
  staffUserId: text("staff_user_id").references(() => staffUsers.id),
  shiftId: text("shift_id"),
  returnShiftId: text("return_shift_id"),
  lateFeePaymentMethod: text("late_fee_payment_method"),
  cancelledAt: text("cancelled_at"),
  cancelReason: text("cancel_reason"),
  approvalStatus: text("approval_status", { enum: ["not_required", "pending", "approved", "rejected"] }).notNull().default("not_required"),
  approvedBy: text("approved_by").references(() => staffUsers.id),
  approvedAt: text("approved_at"),
  approvalNote: text("approval_note"),
  customerIdentityNumber: text("customer_identity_number"),
  customerIdentityImageUrl: text("customer_identity_image_url"),
  studentIdNumber: text("student_id_number"),
  studentIdImageUrl: text("student_id_image_url"),
  parentName: text("parent_name"),
  parentIdentityNumber: text("parent_identity_number"),
  parentIdentityImageUrl: text("parent_identity_image_url"),
  verifiedKtp: boolean("verified_ktp").notNull().default(false),
  verifiedStudentId: boolean("verified_student_id").notNull().default(false),
  verifiedParentId: boolean("verified_parent_id").notNull().default(false),
  verifiedGetContact: boolean("verified_get_contact").notNull().default(false),
  getContactResultName: text("get_contact_result_name"),
  verificationNote: text("verification_note"),
  verifiedBy: text("verified_by").references(() => staffUsers.id),
  verifiedAt: text("verified_at"),
  returnChecklistOk: boolean("return_checklist_ok").notNull().default(false),
  returnRating: integer("return_rating"),
  returnRatingNote: text("return_rating_note"),
  returnedBy: text("returned_by").references(() => staffUsers.id),
  ...timestamps,
});

export const homeRentalRentalItems = pgTable("home_rental_rental_items", {
  id: id(),
  rentalId: text("rental_id").notNull().references(() => homeRentalRentals.id),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  note: text("note"),
  conditionOk: boolean("condition_ok").notNull().default(true),
  conditionNote: text("condition_note"),
  photoUrl: text("photo_url"),
  ...timestamps,
});

export const homeRentalRentalAssets = pgTable("home_rental_rental_assets", {
  id: id(),
  rentalId: text("rental_id").notNull().references(() => homeRentalRentals.id),
  assetId: text("asset_id").notNull().references(() => homeRentalAssets.id),
  scannedOutAt: text("scanned_out_at"),
  scannedInAt: text("scanned_in_at"),
});

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
    address: text("address"),
    idPhotoUrl: text("id_photo_url"),
    selfieWithIdUrl: text("selfie_with_id_url"),
    waVerified: boolean("wa_verified").notNull().default(false),
    addressVerified: boolean("address_verified").notNull().default(false),
    depositRefused: boolean("deposit_refused").notNull().default(false),
    manualAdjustment: doublePrecision("manual_adjustment").notNull().default(0),
    manualAdjustmentNote: text("manual_adjustment_note"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    verificationStatus: text("verification_status", { enum: ["unverified", "verified", "flagged", "fraudulent"] }).notNull().default("unverified"),
    identityRefused: boolean("identity_refused").notNull().default(false),
    riskScore: integer("risk_score").notNull().default(0),
    riskCategory: text("risk_category", { enum: ["aman", "perhatian", "risiko", "tolak"] }).notNull().default("risiko"),
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
    lastAssessmentRating: integer("last_assessment_rating"),
    lastAssessmentChecklistOk: boolean("last_assessment_checklist_ok"),
    lastAssessmentNote: text("last_assessment_note"),
    lastAssessmentAt: text("last_assessment_at"),
    lastAssessmentRentalId: text("last_assessment_rental_id").references(() => homeRentalRentals.id),
    lastComputedAt: text("last_computed_at"),
    updatedBy: text("updated_by").references(() => staffUsers.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("home_rental_customer_risk_outlet_phone_idx").on(t.outletId, t.phone)]
);

export const homeRentalPolicyRules = pgTable(
  "home_rental_policy_rules",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    category: text("category", {
      enum: ["risk_weight", "deposit_loyalty_tier", "late_fee_tier", "delivery_distance_tier", "damage_rule", "checklist_item", "printed_rule"],
    }).notNull(),
    key: text("key"),
    productType: text("product_type", { enum: ["ps3", "ps4", "ps5", "playbook", "tv32", "tv40", "tv43", "accessory", "any"] }),
    label: text("label").notNull(),
    numericValue: doublePrecision("numeric_value").notNull().default(0),
    threshold: doublePrecision("threshold"),
    chargeFullDay: boolean("charge_full_day").notNull().default(false),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("home_rental_policy_rules_outlet_cat_idx").on(t.outletId, t.category)]
);

/** ================= NEXBILL PLATFORM BILLING ================= */

export const platformAdmins = pgTable("platform_admins", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  priceOriginal: doublePrecision("price_original").notNull(),
  priceCurrent: doublePrecision("price_current").notNull(),
  includedConsoles: integer("included_consoles").notNull().default(10),
  extraConsolePrice: doublePrecision("extra_console_price").notNull().default(20000),
  smartPlugPrice: doublePrecision("smart_plug_price").notNull().default(275000),
  setupServicePrice: doublePrecision("setup_service_price").notNull().default(125000),
  aiAddonPriceMonthly: doublePrecision("ai_addon_price_monthly").notNull().default(149000),
  unlimitedEntitlement: boolean("unlimited_entitlement").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const marketRiskCurrencies = pgTable("market_risk_currencies", {
  id: id(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  langCode: text("lang_code"),
  apiRateIdrPerUnit: doublePrecision("api_rate_idr_per_unit"),
  manualRateIdrPerUnit: doublePrecision("manual_rate_idr_per_unit"),
  markupPercent: doublePrecision("markup_percent").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  lastFetchedAt: text("last_fetched_at"),
  updatedBy: text("updated_by").references(() => platformAdmins.id),
  ...timestamps,
});

export const platformProducts = pgTable("platform_products", {
  id: id(),
  category: text("category", { enum: ["smart_plug", "installation_service", "extra_console"] }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  imageUrl: text("image_url"),
  weightGrams: integer("weight_grams").notNull().default(200),
  lengthCm: doublePrecision("length_cm"),
  widthCm: doublePrecision("width_cm"),
  heightCm: doublePrecision("height_cm"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const affiliateProducts = pgTable("affiliate_products", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  shopeeUrl: text("shopee_url").notNull(),
  priceLabel: text("price_label"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: text("updated_by").references(() => platformAdmins.id),
  ...timestamps,
});

export const billingGroups = pgTable("billing_groups", {
  id: id(),
  ownerStaffUserId: text("owner_staff_user_id").notNull().references(() => staffUsers.id),
  name: text("name").notNull(),
  ...timestamps,
});

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
    planId: text("plan_id").references(() => subscriptionPlans.id),
    billingGroupId: text("billing_group_id").references(() => billingGroups.id),
    trialStartedAt: text("trial_started_at").notNull().$defaultFn(nowIso),
    trialEndsAt: text("trial_ends_at").notNull(),
    trialAllowedUnitId: text("trial_allowed_unit_id").references(() => rentalUnits.id),
    aiAddonActive: boolean("ai_addon_active").notNull().default(false),
    aiAddonPeriodEnd: text("ai_addon_period_end"),
    androidTvUnitCount: integer("android_tv_unit_count").notNull().default(0),
    nonAndroidTvUnitCount: integer("non_android_tv_unit_count").notNull().default(0),
    smartPlugRequiredQty: integer("smart_plug_required_qty").notNull().default(0),
    smartPlugOwnedQty: integer("smart_plug_owned_qty").notNull().default(0),
    currentPeriodStart: text("current_period_start"),
    currentPeriodEnd: text("current_period_end"),
    graceUntil: text("grace_until"),
    hasUnlimitedEntitlement: boolean("has_unlimited_entitlement").notNull().default(false),
    entitlementGrantedAt: text("entitlement_granted_at"),
    cancelledAt: text("cancelled_at"),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [uniqueIndex("subscriptions_outlet_idx").on(t.outletId)]
);

export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: id(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  billingGroupId: text("billing_group_id").references(() => billingGroups.id),
  type: text("type", {
    enum: ["subscription_fee", "smart_plug_purchase", "setup_service", "extra_console", "cart_order", "group_renewal", "ai_addon"],
  }).notNull(),
  period: text("period"),
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unitPrice: doublePrecision("unit_price").notNull(),
  amount: doublePrecision("amount").notNull(),
  lineItemsJson: text("line_items_json"),
  status: text("status", { enum: ["unpaid", "paid", "cancelled"] }).notNull().default("unpaid"),
  dueDate: text("due_date"),
  method: text("method"),
  providerRef: text("provider_ref"),
  qrString: text("qr_string"),
  qrImageUrl: text("qr_image_url"),
  vaNumber: text("va_number"),
  vaBankCode: text("va_bank_code"),
  paidAt: text("paid_at"),
  emailSentAt: text("email_sent_at"),
  ...timestamps,
});

export const referralPartners = pgTable(
  "referral_partners",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    code: text("code").notNull().unique(),
    tier: text("tier", { enum: ["customer", "affiliate", "master_partner"] }).notNull().default("customer"),
    commissionPercent: doublePrecision("commission_percent").notNull().default(20),
    isActive: boolean("is_active").notNull().default(true),
    totalReferrals: integer("total_referrals").notNull().default(0),
    totalCommissionEarned: doublePrecision("total_commission_earned").notNull().default(0),
    balanceAvailable: doublePrecision("balance_available").notNull().default(0),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [uniqueIndex("referral_partners_outlet_idx").on(t.outletId)]
);

export const referralConversions = pgTable(
  "referral_conversions",
  {
    id: id(),
    referralPartnerId: text("referral_partner_id").notNull().references(() => referralPartners.id),
    refereeOutletId: text("referee_outlet_id").notNull().references(() => outlets.id),
    codeUsed: text("code_used").notNull(),
    refereeDiscountApplied: boolean("referee_discount_applied").notNull().default(false),
    refereeDiscountPercent: doublePrecision("referee_discount_percent"),
    status: text("status", { enum: ["trial", "active", "churned"] }).notNull().default("trial"),
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [uniqueIndex("referral_conversions_referee_idx").on(t.refereeOutletId)]
);

export const referralCommissions = pgTable("referral_commissions", {
  id: id(),
  referralPartnerId: text("referral_partner_id").notNull().references(() => referralPartners.id),
  referralConversionId: text("referral_conversion_id").notNull().references(() => referralConversions.id),
  sourceInvoiceId: text("source_invoice_id").notNull().references(() => subscriptionInvoices.id).unique(),
  sourceInvoiceAmount: doublePrecision("source_invoice_amount").notNull(),
  commissionPercent: doublePrecision("commission_percent").notNull(),
  amount: doublePrecision("amount").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const referralPayouts = pgTable("referral_payouts", {
  id: id(),
  referralPartnerId: text("referral_partner_id").notNull().references(() => referralPartners.id),
  amount: doublePrecision("amount").notNull(),
  method: text("method"),
  note: text("note"),
  paidByPlatformAdminId: text("paid_by_platform_admin_id").references(() => platformAdmins.id),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const smartPlugOrders = pgTable("smart_plug_orders", {
  id: id(),
  outletId: text("outlet_id").notNull().references(() => outlets.id),
  subscriptionInvoiceId: text("subscription_invoice_id").notNull().references(() => subscriptionInvoices.id),
  qty: integer("qty").notNull().default(1),
  installRequested: boolean("install_requested").notNull().default(false),
  installStatus: text("install_status", {
    enum: ["not_requested", "requested", "scheduled", "completed"],
  })
    .notNull()
    .default("not_requested"),
  scheduledDate: text("scheduled_date"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  shippingAddress: text("shipping_address"),
  shippingAreaId: text("shipping_area_id"),
  shippingAreaLabel: text("shipping_area_label"),
  shippingCourierCode: text("shipping_courier_code"),
  shippingCourierServiceName: text("shipping_courier_service_name"),
  shippingCost: doublePrecision("shipping_cost").notNull().default(0),
  courierTrackingNumber: text("courier_tracking_number"),
  serialNumbers: text("serial_numbers"),
  manualDownloadedAt: text("manual_downloaded_at"),
  notes: text("notes"),
  ...timestamps,
});

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
      "ai_addon_activated", "ai_addon_renewed", "ai_addon_expired",
      "unlimited_entitlement_granted",
    ],
  }).notNull(),
  note: text("note"),
  ...timestamps,
});

export const notificationReads = pgTable(
  "notification_reads",
  {
    id: id(),
    outletId: text("outlet_id").notNull().references(() => outlets.id),
    staffUserId: text("staff_user_id").notNull().references(() => staffUsers.id),
    notificationKey: text("notification_key").notNull(),
    readAt: text("read_at").notNull().$defaultFn(nowIso),
  },
  (t) => ({
    uniqueReader: uniqueIndex("notification_reads_staff_key_unique").on(t.staffUserId, t.notificationKey),
  })
);

export const platformCosts = pgTable("platform_costs", {
  id: id(),
  periodMonth: text("period_month").notNull(),
  category: text("category", {
    enum: ["hosting", "database", "vercel", "supabase", "tuya_cloud", "whatsapp_ai", "openai", "claude", "payment_gateway", "domain", "lainnya"],
  }).notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  ...timestamps,
});

export const platformPurchases = pgTable("platform_purchases", {
  id: id(),
  purchaseDate: text("purchase_date").notNull(),
  category: text("category", { enum: ["smart_plug", "other_product"] }).notNull(),
  productId: text("product_id").references(() => platformProducts.id),
  itemName: text("item_name").notNull(),
  supplierName: text("supplier_name"),
  qty: integer("qty").notNull().default(1),
  unitCost: doublePrecision("unit_cost").notNull().default(0),
  totalCost: doublePrecision("total_cost").notNull().default(0),
  note: text("note"),
  createdBy: text("created_by").references(() => platformAdmins.id),
  ...timestamps,
});

export const platformAnnouncements = pgTable("platform_announcements", {
  id: id(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
  outletId: text("outlet_id").references(() => outlets.id),
  showAsPopup: boolean("show_as_popup").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => platformAdmins.id),
  ...timestamps,
});