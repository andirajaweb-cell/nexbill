import { db } from "@/db/client";
import { accounts, cashBankAccounts, depositBalanceChannels } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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
 * historical postings during migration (see LEGACY_CODE_MIGRATIONS below) without
 * mislabeling history — e.g. years of lumped "PS rental revenue" shouldn't
 * suddenly claim to be all "PS5 Rental" once the code splits by console type.
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

/**
 * Renumbers accounts seeded under the OLD flat 26-account COA (pre-hierarchy)
 * to their new hierarchical home — by UPDATE on the existing row (same id),
 * never delete+recreate, so every historical journal_line (which references
 * accountId, not code) stays perfectly intact and just displays the new
 * code/name from now on.
 *
 * IMPORTANT: several old flat-COA codes ("1000", "4000", "5000", "6100", ...)
 * numerically collide with codes that mean something completely different in
 * the new hierarchical tree (e.g. new "1000" is the ASSETS header, new "5000"
 * is the COGS header) — matching on code alone would, on the SECOND call to
 * seedChartOfAccounts for an outlet that has already been fully migrated (or
 * was seeded fresh and never had legacy codes at all), find that header row
 * sitting at code "1000" and incorrectly "migrate" it into "1112 Cashier
 * Cash", colliding with the real 1112 row. So every migration is guarded by
 * matching the row's CURRENT NAME against the known old name too — only a row
 * that is both at the old code AND still carries the old name is a genuine
 * unmigrated legacy row; anything else (already migrated, or a same-numbered
 * new-scheme row) is left untouched. This is what makes the whole function
 * safe to call on every request, not just once.
 *
 * Codes that used to be a single lumped bucket across what are now several
 * finer categories (e.g. old "4000" covered PS4 AND PS5 rental in one line)
 * migrate to a new "Other/Historis" catch-all instead of an arbitrarily chosen
 * specific leaf, so historical reports don't silently mislabel old data.
 */
const LEGACY_CODE_MIGRATIONS: Record<string, { oldName: string; code: string; name: string; isPostingAllowed?: boolean }> = {
  "1000": { oldName: "Kas", code: "1112", name: "Cashier Cash" },
  "1010": { oldName: "Bank", code: "1121", name: "Bank Utama" },
  "1050": { oldName: "Saldo Deposit Fastpay (PPOB)", code: "1151", name: "PPOB Provider Balance" },
  "1100": { oldName: "Piutang Usaha", code: "1141", name: "Customer Receivable" },
  "1200": { oldName: "Persediaan Barang & Bahan Baku", code: "1161", name: "F&B Inventory" },
  "1500": { oldName: "Peralatan (PS/TV/Controller)", code: "1270", name: "Aset Tetap Lainnya (Historis)" },
  "1510": { oldName: "Akumulasi Penyusutan Peralatan", code: "1295", name: "Akumulasi Penyusutan Lainnya (Historis)" },
  "2000": { oldName: "Hutang Usaha (Supplier)", code: "2111", name: "Supplier Payable" },
  "2100": { oldName: "Hutang Lain-lain", code: "2163", name: "Other Accrued Expense" },
  "2200": { oldName: "Uang Muka Booking (DP) Diterima", code: "2132", name: "Booking Deposit" },
  "3000": { oldName: "Modal Pemilik", code: "3110", name: "Owner Capital" },
  "3900": { oldName: "Laba Ditahan", code: "3200", name: "Retained Earnings" },
  "4000": { oldName: "Pendapatan Rental PS", code: "4170", name: "Other Rental" },
  "4100": { oldName: "Pendapatan F&B", code: "4260", name: "Other F&B" },
  "4200": { oldName: "Pendapatan Lain-lain (WiFi/Sewa Alat/Service Charge)", code: "4650", name: "Other Revenue" },
  "4300": { oldName: "Pendapatan PPOB (Fee Admin)", code: "4480", name: "PPOB Service Fee" },
  "4900": { oldName: "Diskon & Potongan Penjualan", code: "4910", name: "Sales Discount" },
  "5000": { oldName: "HPP F&B", code: "5160", name: "Other F&B COGS" },
  // Same code, rename only — these three were dead scaffolding (never mapped/posted to) from an
  // earlier draft that assumed a paid membership fee product; repurposed to member-tagged
  // F&B/product/add-on revenue instead of deleting the accounts outright (safer for any outlet
  // that already has these codes seeded, even though nothing has ever posted to them).
  "4500": { oldName: "MEMBERSHIP REVENUE", code: "4500", name: "MEMBER-TAGGED REVENUE (Non-Rental)", isPostingAllowed: false },
  "4510": { oldName: "Membership Fee", code: "4510", name: "Member F&B Revenue" },
  "4520": { oldName: "Membership Package", code: "4520", name: "Member Product Revenue" },
  "4530": { oldName: "Membership Renewal", code: "4530", name: "Member Add-on Rental Revenue" },
  "6000": { oldName: "Beban Operasional", code: "6000", name: "OPERATING EXPENSES", isPostingAllowed: false }, // same code, flips to header
  "6100": { oldName: "Beban Gaji & Staf", code: "6110", name: "Salary" },
  "6200": { oldName: "Beban Listrik & Internet", code: "6270", name: "Other Utilities" },
  "6300": { oldName: "Beban Biaya Payment Gateway", code: "6540", name: "Payment Gateway Fees" },
  "6350": { oldName: "Beban Biaya Layanan PPOB (Fastpay)", code: "6570", name: "Beban Biaya Layanan PPOB (Fastpay)" },
  "6400": { oldName: "Beban Penyusutan", code: "6850", name: "Other Depreciation" },
  "6500": { oldName: "Beban Sewa", code: "6210", name: "Rent Expense" },
  "6600": { oldName: "Beban Maintenance", code: "6310", name: "PlayStation Maintenance" },
  "6900": { oldName: "Beban Lain-lain", code: "6900", name: "Other Operating Expense" }, // same code, rename + reparent only
};

/** Accounts Payable used for expenses recorded as hutang (unpaid at creation) — distinct from 2111 (Supplier Payable), which purchasing.ts owns. */
export const EXPENSE_PAYABLE_ACCOUNT_CODE = "2163";

export const FASTPAY_SALDO_ACCOUNT_NAME = "Saldo Deposit Fastpay (PPOB)";

function normalBalanceFor(type: AccountType): "debit" | "credit" {
  return type === "asset" || type === "expense" ? "debit" : "credit";
}

/** Idempotent — safe to call repeatedly. Migrates any old flat-COA codes, inserts every missing account from DEFAULT_COA, then wires parentId for the whole tree. */
export async function seedChartOfAccounts(outletId: string) {
  const existing = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const existingByCode = new Map(existing.map((a) => [a.code, a]));

  // 1) Renumber legacy rows in place (preserves id, so journal history is untouched).
  for (const [oldCode, target] of Object.entries(LEGACY_CODE_MIGRATIONS)) {
    const row = existingByCode.get(oldCode);
    if (!row) continue; // no row at this code for this outlet
    if (row.name !== target.oldName) continue; // not a genuine legacy row (already migrated, or a same-numbered new-scheme row like the "5000" COGS header) — leave it alone
    await db
      .update(accounts)
      .set({ code: target.code, name: target.name, isPostingAllowed: target.isPostingAllowed ?? true, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, row.id));
    existingByCode.delete(oldCode);
    existingByCode.set(target.code, { ...row, code: target.code, name: target.name });
  }

  // 2) Insert every DEFAULT_COA account that doesn't exist yet (by code).
  // onConflictDoNothing + a re-fetch on conflict guards against two concurrent
  // requests (e.g. two dashboard tabs loading at once) racing to seed the same
  // outlet — without it, both could pass the in-memory existingByCode check
  // before either finishes inserting, producing duplicate rows for the same code.
  for (const def of DEFAULT_COA) {
    if (existingByCode.has(def.code)) continue;
    const [inserted] = await db
      .insert(accounts)
      .values({
        outletId,
        code: def.code,
        name: def.name,
        type: def.type,
        normalBalance: normalBalanceFor(def.type),
        isSystemAccount: true,
        isPostingAllowed: def.isPostingAllowed ?? true,
      })
      .onConflictDoNothing({ target: [accounts.outletId, accounts.code] })
      .returning();
    if (inserted) {
      existingByCode.set(def.code, inserted);
    } else {
      const [row] = await db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.code, def.code))).limit(1);
      if (row) existingByCode.set(def.code, row);
    }
  }

  // 3) Wire parentId for the whole tree (two-pass: every code now has a row).
  const codeToId = new Map<string, string>();
  for (const [code, row] of existingByCode) codeToId.set(code, row.id);
  for (const def of DEFAULT_COA) {
    if (!def.parentCode) continue;
    const row = existingByCode.get(def.code);
    const parentId = codeToId.get(def.parentCode);
    if (!row || !parentId || row.parentId === parentId) continue;
    await db.update(accounts).set({ parentId }).where(eq(accounts.id, row.id));
  }

  // Default cash/bank accounts linked to the GL, only if none exist yet.
  const existingCashBank = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId));
  if (existingCashBank.length === 0) {
    const kasAccount = existingByCode.get("1112");
    const bankAccount = existingByCode.get("1121");
    if (kasAccount) {
      await db.insert(cashBankAccounts).values({ outletId, name: "Kas Utama", type: "cash", accountId: kasAccount.id, isDefault: true });
    }
    if (bankAccount) {
      await db.insert(cashBankAccounts).values({ outletId, name: "Rekening Bank Utama", type: "bank", accountId: bankAccount.id });
    }
  }

  // Fastpay PPOB deposit balance — checked independently of the block above since it was
  // introduced later and existing outlets already had cash/bank rows by then (the
  // "existingCashBank.length === 0" gate above would otherwise skip them forever).
  const existingFastpay = await db.select().from(cashBankAccounts).where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.name, FASTPAY_SALDO_ACCOUNT_NAME)));
  if (existingFastpay.length === 0) {
    const saldoAccount = existingByCode.get("1151");
    if (saldoAccount) {
      await db.insert(cashBankAccounts).values({ outletId, name: FASTPAY_SALDO_ACCOUNT_NAME, type: "bank", accountId: saldoAccount.id });
    }
  }
}

/**
 * The Fastpay PPOB deposit-saldo channel used to be a single hardcoded line
 * bolted onto every shift close (see shift.ts). It's now the first row of the
 * owner-editable depositBalanceChannels list — this seeds that row once per
 * outlet, reusing the account 1151 + cashBankAccounts row seedChartOfAccounts
 * already provisions above, so no duplicate account gets created for outlets
 * that already had it. Must run AFTER seedChartOfAccounts.
 */
export async function ensureDepositBalanceChannelsSeeded(outletId: string) {
  const [existing] = await db
    .select()
    .from(depositBalanceChannels)
    .where(and(eq(depositBalanceChannels.outletId, outletId), eq(depositBalanceChannels.channelKey, "ppob_fastpay_saldo")))
    .limit(1);
  if (existing) return;

  const [account] = await db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.code, "1151"))).limit(1);
  const [cba] = await db
    .select()
    .from(cashBankAccounts)
    .where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.name, FASTPAY_SALDO_ACCOUNT_NAME)))
    .limit(1);
  if (!account || !cba) return; // COA not seeded yet for this outlet — caller runs seedChartOfAccounts first

  await db
    .insert(depositBalanceChannels)
    .values({
      outletId,
      channelKey: "ppob_fastpay_saldo",
      label: FASTPAY_SALDO_ACCOUNT_NAME,
      accountId: account.id,
      cashBankAccountId: cba.id,
      isSystem: true,
      sortOrder: 0,
    })
    .onConflictDoNothing({ target: [depositBalanceChannels.outletId, depositBalanceChannels.channelKey] });
}

/**
 * Finds the next free COA code for a new custom deposit-balance channel,
 * under the same "1150 PPOB Receivable" family as the built-in Fastpay saldo
 * account (1151/1152) — 1153-1179 first, falling back past 1180 ("Other
 * Current Assets" in DEFAULT_COA) in the near-impossible case an outlet has
 * manually filled the whole 115x block.
 */
export async function allocateDepositChannelAccountCode(outletId: string): Promise<string> {
  const existing = await db.select({ code: accounts.code }).from(accounts).where(eq(accounts.outletId, outletId));
  const used = new Set(existing.map((a) => a.code));
  for (let n = 1153; n <= 1179; n++) {
    if (!used.has(String(n))) return String(n);
  }
  let n = 1181;
  while (used.has(String(n))) n++;
  return String(n);
}

const codeCache = new Map<string, Map<string, string>>(); // outletId -> code -> accountId

export function invalidateAccountCache(outletId: string) {
  codeCache.delete(outletId);
}

export async function getAccountIdByCode(outletId: string, code: string): Promise<string> {
  let outletCache = codeCache.get(outletId);
  if (!outletCache) {
    outletCache = new Map();
    codeCache.set(outletId, outletCache);
  }
  if (outletCache.has(code)) return outletCache.get(code)!;

  const [row] = await db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.code, code))).limit(1);
  if (!row) throw new Error(`Akun COA dengan kode ${code} tidak ditemukan untuk outlet ${outletId}. Jalankan seedChartOfAccounts dulu.`);
  if (!row.isPostingAllowed) throw new Error(`Akun "${row.name}" (${code}) adalah akun Header — tidak bisa menerima jurnal langsung. Gunakan salah satu akun turunannya.`);
  outletCache.set(code, row.id);
  return row.id;
}

/** Bulk header-posting guard used by postJournal for lines that resolve via a raw accountId (bypassing getAccountIdByCode's own check above). */
export async function assertPostableAccountIds(accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  if (uniqueIds.length === 0) return;
  const rows = await db.select().from(accounts).where(inArray(accounts.id, uniqueIds));
  for (const row of rows) {
    if (!row.isPostingAllowed) throw new Error(`Akun "${row.name}" (${row.code}) adalah akun Header — tidak bisa menerima jurnal langsung.`);
  }
}

// Note: the old binary cash/bank resolver that used to live here (getDefaultCashBankAccountId)
// was replaced by getCashBankAccountIdForPaymentMethod() in ./account-mapping.ts, which routes
// each payment.method to its own dedicated GL account via the "payment" mapping module instead
// of lumping every non-cash method into one generic Bank account. See that file for details.
