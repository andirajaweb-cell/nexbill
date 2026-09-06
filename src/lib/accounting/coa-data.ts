// Pure, client-safe Chart of Accounts data + helpers — deliberately has ZERO server-only
// imports (no "@/db/client", no "postgres" driver chain) so it can be imported directly from
// "use client" dashboard pages without dragging Node-only modules (fs/net/tls/perf_hooks) into
// the browser bundle. See coa.ts, which owns everything that actually touches the database, for
// the server-only counterpart. Do NOT add a "@/db/client" (or anything that transitively imports
// it) import to this file.

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface CoaDef {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  /** Header accounts group child accounts for the tree view/subtotals and can NEVER receive a journal posting (enforced in journal.ts). Everything else defaults to a postable leaf. */
  isPostingAllowed?: boolean;
}

/**
 * Full hierarchical Chart of Accounts for a PS Rental + F&B + PPOB + Accounting
 * business — 4-5 digit codes, Header (grouping, non-posting) vs Posting account
 * distinction, one COA "family" per top-level digit (1=Assets ... 9=Tax&Clearing).
 * This is the complete tree; owners can still add/edit/archive accounts on top
 * of this via the Accounts CRUD UI — this is just the sane starting point.
 *
 * A handful of codes beyond the reference spec ("Other X" catch-alls like 4170,
 * 4260, 5160, 6270, 6850, 1270, 1295) exist purely to receive OLD pre-hierarchy
 * historical postings during migration (see LEGACY_CODE_MIGRATIONS in coa.ts)
 * without mislabeling history — e.g. years of lumped "PS rental revenue"
 * shouldn't suddenly claim to be all "PS5 Rental" once the code splits by
 * console type.
 */
export const DEFAULT_COA: CoaDef[] = [
  // ---------------- 1. ASSETS ----------------
  { code: "1000", name: "ASSETS", type: "asset", isPostingAllowed: false },
  { code: "1100", name: "CURRENT ASSETS", type: "asset", parentCode: "1000", isPostingAllowed: false },
  { code: "1110", name: "Cash", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1111", name: "Cash on Hand", type: "asset", parentCode: "1110" },
  { code: "1112", name: "Cashier Cash", type: "asset", parentCode: "1110" },
  { code: "1113", name: "Petty Cash", type: "asset", parentCode: "1110" },
  { code: "1114", name: "Cash in Transit", type: "asset", parentCode: "1110" },
  { code: "1120", name: "Bank Accounts", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1121", name: "Bank Utama", type: "asset", parentCode: "1120" },
  { code: "1122", name: "Bank Mandiri", type: "asset", parentCode: "1120" },
  { code: "1123", name: "Bank BRI", type: "asset", parentCode: "1120" },
  { code: "1124", name: "Other Bank", type: "asset", parentCode: "1120" },
  { code: "1125", name: "Kartu Debit/Kredit (EDC)", type: "asset", parentCode: "1120" },
  { code: "1130", name: "Digital Payment", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1131", name: "QRIS", type: "asset", parentCode: "1130" },
  { code: "1132", name: "GoPay", type: "asset", parentCode: "1130" },
  { code: "1133", name: "OVO", type: "asset", parentCode: "1130" },
  { code: "1134", name: "DANA", type: "asset", parentCode: "1130" },
  { code: "1135", name: "ShopeePay", type: "asset", parentCode: "1130" },
  { code: "1136", name: "BukuPay", type: "asset", parentCode: "1130" },
  { code: "1137", name: "Fastpay Gateway (Settlement)", type: "asset", parentCode: "1130" },
  { code: "1140", name: "Accounts Receivable", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1141", name: "Customer Receivable", type: "asset", parentCode: "1140" },
  { code: "1142", name: "Other Receivable", type: "asset", parentCode: "1140" },
  { code: "1150", name: "PPOB Receivable", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1151", name: "PPOB Provider Balance", type: "asset", parentCode: "1150" },
  { code: "1152", name: "PPOB Settlement Receivable", type: "asset", parentCode: "1150" },
  { code: "1160", name: "Inventory", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1161", name: "F&B Inventory", type: "asset", parentCode: "1160" },
  { code: "1162", name: "Beverage Inventory", type: "asset", parentCode: "1160" },
  { code: "1163", name: "Snack Inventory", type: "asset", parentCode: "1160" },
  { code: "1164", name: "Merchandise Inventory", type: "asset", parentCode: "1160" },
  { code: "1165", name: "Packaging Inventory", type: "asset", parentCode: "1160" },
  { code: "1170", name: "Prepaid Expenses", type: "asset", parentCode: "1100", isPostingAllowed: false },
  { code: "1171", name: "Prepaid Rent", type: "asset", parentCode: "1170" },
  { code: "1172", name: "Prepaid Insurance", type: "asset", parentCode: "1170" },
  { code: "1173", name: "Other Prepaid Expense", type: "asset", parentCode: "1170" },
  { code: "1180", name: "Other Current Assets", type: "asset", parentCode: "1100" },

  { code: "1200", name: "NON-CURRENT ASSETS", type: "asset", parentCode: "1000", isPostingAllowed: false },
  { code: "1210", name: "PlayStation Assets", type: "asset", parentCode: "1200", isPostingAllowed: false },
  { code: "1211", name: "PS4", type: "asset", parentCode: "1210" },
  { code: "1212", name: "PS5", type: "asset", parentCode: "1210" },
  { code: "1213", name: "Other Console", type: "asset", parentCode: "1210" },
  { code: "1214", name: "PlayStation Assets (Umum)", type: "asset", parentCode: "1210" },
  { code: "1220", name: "Display Assets", type: "asset", parentCode: "1200", isPostingAllowed: false },
  { code: "1221", name: "TV", type: "asset", parentCode: "1220" },
  { code: "1222", name: "Monitor", type: "asset", parentCode: "1220" },
  { code: "1223", name: "Projector", type: "asset", parentCode: "1220" },
  { code: "1230", name: "Gaming Equipment", type: "asset", parentCode: "1200", isPostingAllowed: false },
  { code: "1231", name: "Controller", type: "asset", parentCode: "1230" },
  { code: "1232", name: "Headset", type: "asset", parentCode: "1230" },
  { code: "1233", name: "Gaming Accessories", type: "asset", parentCode: "1230" },
  { code: "1240", name: "Furniture & Equipment", type: "asset", parentCode: "1200", isPostingAllowed: false },
  { code: "1241", name: "Furniture", type: "asset", parentCode: "1240" },
  { code: "1242", name: "Kitchen Equipment", type: "asset", parentCode: "1240" },
  { code: "1243", name: "POS Equipment", type: "asset", parentCode: "1240" },
  { code: "1244", name: "Office Equipment", type: "asset", parentCode: "1240" },
  { code: "1245", name: "Vehicle", type: "asset", parentCode: "1240" },
  { code: "1250", name: "IT Equipment", type: "asset", parentCode: "1200", isPostingAllowed: false },
  { code: "1251", name: "Computer", type: "asset", parentCode: "1250" },
  { code: "1252", name: "Printer", type: "asset", parentCode: "1250" },
  { code: "1253", name: "Network Equipment", type: "asset", parentCode: "1250" },
  { code: "1254", name: "CCTV", type: "asset", parentCode: "1250" },
  { code: "1260", name: "Leasehold Improvements", type: "asset", parentCode: "1200" },
  { code: "1270", name: "Aset Tetap Lainnya (Historis)", type: "asset", parentCode: "1200" },
  { code: "1290", name: "ACCUMULATED DEPRECIATION", type: "asset", parentCode: "1200", isPostingAllowed: false },
  { code: "1291", name: "Accumulated Depreciation — PS", type: "asset", parentCode: "1290" },
  { code: "1292", name: "Accumulated Depreciation — TV", type: "asset", parentCode: "1290" },
  { code: "1293", name: "Accumulated Depreciation — Equipment", type: "asset", parentCode: "1290" },
  { code: "1294", name: "Accumulated Depreciation — IT", type: "asset", parentCode: "1290" },
  { code: "1295", name: "Akumulasi Penyusutan Lainnya (Historis)", type: "asset", parentCode: "1290" },

  // ---------------- 2. LIABILITIES ----------------
  { code: "2000", name: "LIABILITIES", type: "liability", isPostingAllowed: false },
  { code: "2100", name: "CURRENT LIABILITIES", type: "liability", parentCode: "2000", isPostingAllowed: false },
  { code: "2110", name: "Accounts Payable", type: "liability", parentCode: "2100", isPostingAllowed: false },
  { code: "2111", name: "Supplier Payable", type: "liability", parentCode: "2110" },
  { code: "2120", name: "PPOB Payable", type: "liability", parentCode: "2100", isPostingAllowed: false },
  { code: "2121", name: "PPOB Provider Payable", type: "liability", parentCode: "2120" },
  { code: "2122", name: "PPOB Settlement Payable", type: "liability", parentCode: "2120" },
  { code: "2130", name: "Customer Liabilities", type: "liability", parentCode: "2100", isPostingAllowed: false },
  { code: "2131", name: "Customer Deposit", type: "liability", parentCode: "2130" },
  { code: "2132", name: "Booking Deposit", type: "liability", parentCode: "2130" },
  { code: "2133", name: "Customer Wallet", type: "liability", parentCode: "2130" },
  { code: "2134", name: "Unearned Revenue", type: "liability", parentCode: "2130" },
  { code: "2135", name: "Home Rental Security Deposit", type: "liability", parentCode: "2130" },
  { code: "2140", name: "Tax Payable", type: "liability", parentCode: "2100", isPostingAllowed: false },
  { code: "2141", name: "Output VAT / PPN", type: "liability", parentCode: "2140" },
  { code: "2142", name: "Withholding Tax", type: "liability", parentCode: "2140" },
  { code: "2143", name: "Other Tax Payable", type: "liability", parentCode: "2140" },
  { code: "2150", name: "Payroll Liabilities", type: "liability", parentCode: "2100", isPostingAllowed: false },
  { code: "2151", name: "Salary Payable", type: "liability", parentCode: "2150" },
  { code: "2152", name: "Employee Advances", type: "liability", parentCode: "2150" },
  { code: "2153", name: "Employee Benefits Payable", type: "liability", parentCode: "2150" },
  { code: "2160", name: "Accrued Expenses", type: "liability", parentCode: "2100", isPostingAllowed: false },
  { code: "2161", name: "Accrued Electricity", type: "liability", parentCode: "2160" },
  { code: "2162", name: "Accrued Internet", type: "liability", parentCode: "2160" },
  { code: "2163", name: "Other Accrued Expense", type: "liability", parentCode: "2160" },
  { code: "2200", name: "NON-CURRENT LIABILITIES", type: "liability", parentCode: "2000", isPostingAllowed: false },
  { code: "2210", name: "Bank Loan", type: "liability", parentCode: "2200" },
  { code: "2220", name: "Equipment Financing", type: "liability", parentCode: "2200" },
  { code: "2230", name: "Other Long-Term Liability", type: "liability", parentCode: "2200" },

  // ---------------- 3. EQUITY ----------------
  { code: "3000", name: "EQUITY", type: "equity", isPostingAllowed: false },
  { code: "3100", name: "Owner Equity", type: "equity", parentCode: "3000", isPostingAllowed: false },
  { code: "3110", name: "Owner Capital", type: "equity", parentCode: "3100" },
  { code: "3120", name: "Additional Capital", type: "equity", parentCode: "3100" },
  { code: "3130", name: "Owner Withdrawal / Prive", type: "equity", parentCode: "3100" },
  { code: "3131", name: "Dividend Distribution", type: "equity", parentCode: "3100" },
  { code: "3200", name: "Retained Earnings", type: "equity", parentCode: "3000" },
  { code: "3300", name: "Current Year Earnings", type: "equity", parentCode: "3000" },
  { code: "3400", name: "Opening Balance Equity", type: "equity", parentCode: "3000" },

  // ---------------- 4. REVENUE ----------------
  { code: "4000", name: "REVENUE", type: "revenue", isPostingAllowed: false },
  { code: "4100", name: "RENTAL REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4110", name: "PS4 Rental", type: "revenue", parentCode: "4100" },
  { code: "4120", name: "PS5 Rental", type: "revenue", parentCode: "4100" },
  { code: "4130", name: "VIP Room Rental", type: "revenue", parentCode: "4100" },
  { code: "4140", name: "Tournament Rental", type: "revenue", parentCode: "4100" },
  { code: "4150", name: "Package Rental", type: "revenue", parentCode: "4100" },
  { code: "4160", name: "Overtime Rental", type: "revenue", parentCode: "4100" },
  { code: "4170", name: "Other Rental", type: "revenue", parentCode: "4100" },
  { code: "4180", name: "Member Rental Revenue", type: "revenue", parentCode: "4100" },
  { code: "4200", name: "F&B REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4210", name: "Food Sales", type: "revenue", parentCode: "4200" },
  { code: "4220", name: "Beverage Sales", type: "revenue", parentCode: "4200" },
  { code: "4230", name: "Coffee Sales", type: "revenue", parentCode: "4200" },
  { code: "4240", name: "Snack Sales", type: "revenue", parentCode: "4200" },
  { code: "4250", name: "Dessert Sales", type: "revenue", parentCode: "4200" },
  { code: "4260", name: "Other F&B", type: "revenue", parentCode: "4200" },
  { code: "4300", name: "PRODUCT REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4310", name: "Merchandise Sales", type: "revenue", parentCode: "4300" },
  { code: "4320", name: "Gaming Accessories", type: "revenue", parentCode: "4300" },
  { code: "4330", name: "Other Product Sales", type: "revenue", parentCode: "4300" },
  // Extra controller/headset/VR/etc rented per-hour alongside an active PS session
  // (sessionAccessories -> orderItems itemType "accessory") — deliberately its own
  // header, separate from 4300 PRODUCT REVENUE (which is retail SALE of physical
  // goods, itemType "product") even though both cover similar item names, because
  // one is a rental charge tied to a session and the other is an outright sale.
  { code: "4350", name: "ADD-ON RENTAL REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4351", name: "Extra Controller Rental", type: "revenue", parentCode: "4350" },
  { code: "4352", name: "Headset Rental", type: "revenue", parentCode: "4350" },
  { code: "4353", name: "VR Rental", type: "revenue", parentCode: "4350" },
  { code: "4354", name: "Other Add-on Rental", type: "revenue", parentCode: "4350" },
  { code: "4400", name: "PPOB REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4410", name: "Pulsa Commission", type: "revenue", parentCode: "4400" },
  { code: "4420", name: "Data Package Commission", type: "revenue", parentCode: "4400" },
  { code: "4430", name: "PLN Commission", type: "revenue", parentCode: "4400" },
  { code: "4440", name: "PDAM Commission", type: "revenue", parentCode: "4400" },
  { code: "4450", name: "BPJS Commission", type: "revenue", parentCode: "4400" },
  { code: "4460", name: "E-Wallet Commission", type: "revenue", parentCode: "4400" },
  { code: "4470", name: "Game Voucher Commission", type: "revenue", parentCode: "4400" },
  { code: "4480", name: "PPOB Service Fee", type: "revenue", parentCode: "4400" },
  // This app has no paid membership signup/renewal fee of its own (membership here is a free
  // loyalty tier, not a purchasable product) — so unlike 4180 "Member Rental Revenue" (a real,
  // posted account under 4100), this whole 4500 family exists purely so a MEMBER customer's
  // F&B/product/add-on spend can be tracked separately from a non-member's, same "two-way split"
  // pattern as 4180. See revenueAccountIdForItem() in postings.ts.
  { code: "4500", name: "MEMBER-TAGGED REVENUE (Non-Rental)", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4510", name: "Member F&B Revenue", type: "revenue", parentCode: "4500" },
  { code: "4520", name: "Member Product Revenue", type: "revenue", parentCode: "4500" },
  { code: "4530", name: "Member Add-on Rental Revenue", type: "revenue", parentCode: "4500" },
  { code: "4600", name: "OTHER OPERATING REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4610", name: "Booking Fee", type: "revenue", parentCode: "4600" },
  { code: "4620", name: "Cancellation Fee", type: "revenue", parentCode: "4600" },
  { code: "4630", name: "No-Show Fee", type: "revenue", parentCode: "4600" },
  { code: "4640", name: "Service Fee", type: "revenue", parentCode: "4600" },
  { code: "4645", name: "Membership Fee / Iuran Keanggotaan", type: "revenue", parentCode: "4600" },
  { code: "4650", name: "Other Revenue", type: "revenue", parentCode: "4600" },
  // Deliberately a separate top-level group from 4600 "OTHER OPERATING REVENUE" (which
  // covers booking/cancellation/service fees — still tied to the core business activity).
  // These are genuinely NON-operating: money received that has nothing to do with renting
  // PS units, selling F&B, or PPOB — standard accounting practice keeps that visually
  // separate in the P&L (e.g. below Operating Profit) instead of mixed into operating
  // revenue. See src/lib/accounting/other-income.ts for the posting engine.
  { code: "4700", name: "PENDAPATAN LAIN-LAIN (NON-OPERASIONAL)", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4710", name: "Komisi / Kerjasama Vendor", type: "revenue", parentCode: "4700" },
  { code: "4720", name: "Sewa Tempat/Aset ke Pihak Lain", type: "revenue", parentCode: "4700" },
  { code: "4730", name: "Penjualan Aset/Barang Bekas", type: "revenue", parentCode: "4700" },
  { code: "4740", name: "Sponsorship / Kerjasama Event", type: "revenue", parentCode: "4700" },
  { code: "4750", name: "Denda / Ganti Rugi dari Pelanggan", type: "revenue", parentCode: "4700" },
  { code: "4760", name: "Bunga Bank / Cashback / Promo", type: "revenue", parentCode: "4700" },
  { code: "4770", name: "Pendapatan Lain-lain (Umum)", type: "revenue", parentCode: "4700" },
  // Home Rental ("Sewa Dibawa Pulang") — take-home console/TV rental, kept as its own
  // header separate from 4100 RENTAL REVENUE (in-store booth sessions) so P&L/reports
  // can isolate the two business lines even though both are "rental" conceptually.
  { code: "4800", name: "HOME RENTAL REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4810", name: "Home Rental — PS3", type: "revenue", parentCode: "4800" },
  { code: "4820", name: "Home Rental — PS4", type: "revenue", parentCode: "4800" },
  { code: "4830", name: "Home Rental — PS5", type: "revenue", parentCode: "4800" },
  { code: "4840", name: "Home Rental — PlayBook", type: "revenue", parentCode: "4800" },
  { code: "4850", name: "Home Rental — TV", type: "revenue", parentCode: "4800" },
  { code: "4860", name: "Home Rental — Accessory", type: "revenue", parentCode: "4800" },
  { code: "4870", name: "Home Rental — Package", type: "revenue", parentCode: "4800" },
  { code: "4880", name: "Home Rental — Delivery/Pickup Fee", type: "revenue", parentCode: "4800" },
  { code: "4890", name: "Home Rental — Late Fee", type: "revenue", parentCode: "4800" },
  { code: "4895", name: "Home Rental — Penggantian Kerusakan", type: "revenue", parentCode: "4800" },
  { code: "4900", name: "CONTRA REVENUE", type: "revenue", parentCode: "4000", isPostingAllowed: false },
  { code: "4910", name: "Sales Discount", type: "revenue", parentCode: "4900" },
  { code: "4920", name: "Rental Discount", type: "revenue", parentCode: "4900" },
  { code: "4930", name: "F&B Discount", type: "revenue", parentCode: "4900" },
  { code: "4940", name: "PPOB Discount", type: "revenue", parentCode: "4900" },
  { code: "4950", name: "Sales Return", type: "revenue", parentCode: "4900" },

  // ---------------- 5. COST OF GOODS SOLD ----------------
  { code: "5000", name: "COST OF GOODS SOLD", type: "expense", isPostingAllowed: false },
  { code: "5100", name: "F&B COGS", type: "expense", parentCode: "5000", isPostingAllowed: false },
  { code: "5110", name: "Food COGS", type: "expense", parentCode: "5100" },
  { code: "5120", name: "Beverage COGS", type: "expense", parentCode: "5100" },
  { code: "5130", name: "Coffee COGS", type: "expense", parentCode: "5100" },
  { code: "5140", name: "Snack COGS", type: "expense", parentCode: "5100" },
  { code: "5150", name: "Packaging COGS", type: "expense", parentCode: "5100" },
  { code: "5160", name: "Other F&B COGS", type: "expense", parentCode: "5100" },
  { code: "5200", name: "PRODUCT COGS", type: "expense", parentCode: "5000", isPostingAllowed: false },
  { code: "5210", name: "Merchandise COGS", type: "expense", parentCode: "5200" },
  { code: "5220", name: "Gaming Accessories COGS", type: "expense", parentCode: "5200" },
  { code: "5300", name: "INVENTORY ADJUSTMENT", type: "expense", parentCode: "5000", isPostingAllowed: false },
  { code: "5310", name: "Stock Opname Loss", type: "expense", parentCode: "5300" },
  { code: "5320", name: "Damaged Stock", type: "expense", parentCode: "5300" },
  { code: "5330", name: "Expired Stock", type: "expense", parentCode: "5300" },
  { code: "5340", name: "Inventory Shrinkage", type: "expense", parentCode: "5300" },
  { code: "5400", name: "Other COGS", type: "expense", parentCode: "5000" },

  // ---------------- 6. OPERATING EXPENSES ----------------
  { code: "6000", name: "OPERATING EXPENSES", type: "expense", isPostingAllowed: false },
  { code: "6100", name: "PERSONNEL EXPENSE", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6110", name: "Salary", type: "expense", parentCode: "6100" },
  { code: "6120", name: "Overtime", type: "expense", parentCode: "6100" },
  { code: "6130", name: "Employee Bonus", type: "expense", parentCode: "6100" },
  { code: "6140", name: "Commission", type: "expense", parentCode: "6100" },
  { code: "6150", name: "Employee Benefits", type: "expense", parentCode: "6100" },
  { code: "6160", name: "Recruitment", type: "expense", parentCode: "6100" },
  { code: "6200", name: "RENT & UTILITIES", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6210", name: "Rent Expense", type: "expense", parentCode: "6200" },
  { code: "6220", name: "Electricity", type: "expense", parentCode: "6200" },
  { code: "6230", name: "Water", type: "expense", parentCode: "6200" },
  { code: "6240", name: "Internet", type: "expense", parentCode: "6200" },
  { code: "6250", name: "Telephone", type: "expense", parentCode: "6200" },
  { code: "6260", name: "Waste Management", type: "expense", parentCode: "6200" },
  { code: "6270", name: "Other Utilities", type: "expense", parentCode: "6200" },
  { code: "6300", name: "MAINTENANCE", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6310", name: "PlayStation Maintenance", type: "expense", parentCode: "6300" },
  { code: "6320", name: "TV Maintenance", type: "expense", parentCode: "6300" },
  { code: "6330", name: "Controller Maintenance", type: "expense", parentCode: "6300" },
  { code: "6340", name: "Kitchen Equipment Maintenance", type: "expense", parentCode: "6300" },
  { code: "6350", name: "Building Maintenance", type: "expense", parentCode: "6300" },
  { code: "6360", name: "IT Maintenance", type: "expense", parentCode: "6300" },
  { code: "6400", name: "MARKETING", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6410", name: "Advertising", type: "expense", parentCode: "6400" },
  { code: "6420", name: "Social Media", type: "expense", parentCode: "6400" },
  { code: "6430", name: "Influencer", type: "expense", parentCode: "6400" },
  { code: "6440", name: "Promotion", type: "expense", parentCode: "6400" },
  { code: "6450", name: "Customer Rewards", type: "expense", parentCode: "6400" },
  { code: "6500", name: "ADMINISTRATION", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6510", name: "Office Supplies", type: "expense", parentCode: "6500" },
  { code: "6520", name: "Printing", type: "expense", parentCode: "6500" },
  { code: "6530", name: "Bank Charges", type: "expense", parentCode: "6500" },
  { code: "6540", name: "Payment Gateway Fees", type: "expense", parentCode: "6500" },
  { code: "6550", name: "Software Subscription", type: "expense", parentCode: "6500" },
  { code: "6560", name: "Professional Services", type: "expense", parentCode: "6500" },
  { code: "6570", name: "Beban Biaya Layanan PPOB (Fastpay)", type: "expense", parentCode: "6500" },
  { code: "6600", name: "LOGISTICS", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6610", name: "Transportation", type: "expense", parentCode: "6600" },
  { code: "6620", name: "Delivery", type: "expense", parentCode: "6600" },
  { code: "6630", name: "Fuel", type: "expense", parentCode: "6600" },
  { code: "6640", name: "Courier", type: "expense", parentCode: "6600" },
  { code: "6700", name: "Insurance", type: "expense", parentCode: "6000" },
  { code: "6800", name: "DEPRECIATION", type: "expense", parentCode: "6000", isPostingAllowed: false },
  { code: "6810", name: "PS Depreciation", type: "expense", parentCode: "6800" },
  { code: "6820", name: "TV Depreciation", type: "expense", parentCode: "6800" },
  { code: "6830", name: "Equipment Depreciation", type: "expense", parentCode: "6800" },
  { code: "6840", name: "IT Depreciation", type: "expense", parentCode: "6800" },
  { code: "6850", name: "Other Depreciation", type: "expense", parentCode: "6800" },
  { code: "6900", name: "Other Operating Expense", type: "expense", parentCode: "6000" },

  // ---------------- 7. OTHER INCOME ----------------
  { code: "7000", name: "OTHER INCOME", type: "revenue", isPostingAllowed: false },
  { code: "7100", name: "Interest Income", type: "revenue", parentCode: "7000" },
  { code: "7200", name: "Gain on Asset Disposal", type: "revenue", parentCode: "7000" },
  { code: "7300", name: "Foreign Exchange Gain", type: "revenue", parentCode: "7000" },
  { code: "7900", name: "Other Income", type: "revenue", parentCode: "7000" },

  // ---------------- 8. OTHER EXPENSE ----------------
  { code: "8000", name: "OTHER EXPENSE", type: "expense", isPostingAllowed: false },
  { code: "8100", name: "Interest Expense", type: "expense", parentCode: "8000" },
  { code: "8200", name: "Bank Loan Charges", type: "expense", parentCode: "8000" },
  { code: "8300", name: "Loss on Asset Disposal", type: "expense", parentCode: "8000" },
  { code: "8400", name: "Foreign Exchange Loss", type: "expense", parentCode: "8000" },
  { code: "8900", name: "Other Expense", type: "expense", parentCode: "8000" },

  // ---------------- 9. TAX & CLEARING ----------------
  { code: "9000", name: "TAX & CLEARING", type: "liability", isPostingAllowed: false },
  { code: "9100", name: "TAX", type: "liability", parentCode: "9000", isPostingAllowed: false },
  { code: "9110", name: "Input Tax", type: "liability", parentCode: "9100" },
  { code: "9120", name: "Output Tax", type: "liability", parentCode: "9100" },
  { code: "9130", name: "Withholding Tax", type: "liability", parentCode: "9100" },
  { code: "9140", name: "Other Tax", type: "liability", parentCode: "9100" },
  { code: "9200", name: "PAYMENT CLEARING", type: "liability", parentCode: "9000", isPostingAllowed: false },
  { code: "9210", name: "QRIS Clearing", type: "liability", parentCode: "9200" },
  { code: "9220", name: "E-Wallet Clearing", type: "liability", parentCode: "9200" },
  { code: "9230", name: "Card Clearing", type: "liability", parentCode: "9200" },
  { code: "9240", name: "Payment Gateway Clearing", type: "liability", parentCode: "9200" },
  { code: "9300", name: "SYSTEM CLEARING", type: "liability", parentCode: "9000", isPostingAllowed: false },
  { code: "9310", name: "POS Clearing", type: "liability", parentCode: "9300" },
  { code: "9320", name: "PPOB Clearing", type: "liability", parentCode: "9300" },
  { code: "9330", name: "Opening Balance Clearing", type: "liability", parentCode: "9300" },
];

/** code -> default (English) name, built once from DEFAULT_COA — see coaAccountName() below. */
const DEFAULT_COA_NAME_BY_CODE: Record<string, string> = Object.fromEntries(DEFAULT_COA.map((d) => [d.code, d.name]));

/**
 * Localizes a Chart of Accounts row's display name for the dashboard UI. accounts.name in the
 * database is always a single plain string (see schema.ts) — never per-language — so this is a
 * display-time lookup, not a stored translation: it swaps in the matching entry from
 * lib/i18n/dict-coa.ts ("coa.<code>") ONLY when the account's stored name is still exactly the
 * untouched default from DEFAULT_COA above. If an owner has renamed a default account, or this is
 * a custom account they created themselves (no entry in dict-coa.ts for its code), the condition
 * below is false and the raw stored name is returned as-is in every language — a rename must
 * never be silently overridden by a translation. Callers pass their own useDashboardLang() `t`.
 */
export function coaAccountName(t: (key: string, fallback: string) => string, account: { code: string; name: string }): string {
  if (DEFAULT_COA_NAME_BY_CODE[account.code] === account.name) {
    return t(`coa.${account.code}`, account.name);
  }
  return account.name;
}
