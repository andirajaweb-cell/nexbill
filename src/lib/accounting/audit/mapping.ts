import { db } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { accountMappings, accounts, paymentMethods } from "@/db/schema";

/*
 * Pemeriksaan Account Mapping outlet — setiap baris di tab Account Mapping harus menunjuk ke akun
 * yang ada, milik outlet ini, bisa diposting (bukan akun header), dan JENISNYA sesuai fungsinya:
 * pendapatan → akun pendapatan, HPP/beban → akun beban, metode pembayaran → akun kas/bank, dst.
 * Mapping yang salah jenis membuat setiap transaksi baru dibukukan ke pos laporan yang keliru
 * (mis. penjualan masuk ke akun kas) tanpa terlihat error apa pun.
 */

const MODULE_TYPE: Record<string, "asset" | "liability" | "equity" | "revenue" | "expense"> = {
  rental: "revenue",
  addon: "revenue",
  fnb: "revenue",
  product_sale: "revenue",
  ppob: "revenue",
  other_income: "revenue",
  membership_fee: "revenue",
  home_rental: "revenue",
  other: "revenue",
  fnb_cogs: "expense",
  product_sale_cogs: "expense",
  expense: "expense",
  depreciation: "expense",
  asset: "asset",
  asset_accum_depr: "asset",
  payment: "asset",
  deposit: "liability",
};
const KEY_TYPE: Record<string, "asset" | "liability" | "equity" | "revenue" | "expense"> = {
  "product:inventory": "asset",
  "product:opening_stock": "equity",
  "product:adjustment": "expense",
  "product:damaged": "expense",
  "product:opname_difference": "expense",
  "ppob:payable": "liability",
  "ppob:provider_fee": "expense", // legacy, kept for old journals
  "home_rental:deposit": "liability",
  "other:asset_purchase_payable": "liability",
};
const TYPE_LABEL: Record<string, string> = { asset: "aset", liability: "liabilitas", equity: "ekuitas", revenue: "pendapatan", expense: "beban" };

export interface MappingIssue {
  module: string;
  key: string;
  label: string | null;
  account: string;
  problem: string;
}

export async function checkAccountMappings(outletId: string): Promise<{ issues: MappingIssue[]; unmappedPaymentMethods: { key: string; label: string }[] }> {
  const rows = await db
    .select({
      module: accountMappings.module,
      key: accountMappings.transactionKey,
      label: accountMappings.label,
      isActive: accountMappings.isActive,
      accOutlet: accounts.outletId,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      postable: accounts.isPostingAllowed,
    })
    .from(accountMappings)
    .leftJoin(accounts, eq(accountMappings.accountId, accounts.id))
    .where(eq(accountMappings.outletId, outletId));

  const issues: MappingIssue[] = [];
  for (const r of rows) {
    if (!r.isActive) continue;
    const account = r.code ? `${r.code} ${r.name}` : "(akun tidak ditemukan)";
    const want = KEY_TYPE[`${r.module}:${r.key}`] ?? MODULE_TYPE[r.module];
    if (!r.code) issues.push({ module: r.module, key: r.key, label: r.label, account, problem: "Akun tujuan sudah tidak ada" });
    else if (r.accOutlet !== outletId) issues.push({ module: r.module, key: r.key, label: r.label, account, problem: "Akun milik outlet lain" });
    else if (!r.postable) issues.push({ module: r.module, key: r.key, label: r.label, account, problem: "Akun header — tidak bisa menerima jurnal" });
    else if (want && r.type !== want) issues.push({ module: r.module, key: r.key, label: r.label, account, problem: `Akun ${TYPE_LABEL[r.type ?? ""] ?? r.type}, seharusnya akun ${TYPE_LABEL[want]}` });
  }

  // Active custom payment methods with no mapping of their own fall into the generic bank account
  // (1121) — their balance then can't be reconciled per channel.
  const mappedPayment = new Set(rows.filter((r) => r.module === "payment" && r.isActive).map((r) => r.key));
  const builtIn = new Set(["cash", "qris", "gopay", "dana", "bukupay", "card", "transfer"]);
  const methods = await db.select({ key: paymentMethods.key, label: paymentMethods.label }).from(paymentMethods).where(and(eq(paymentMethods.outletId, outletId), eq(paymentMethods.isActive, true)));
  const unmappedPaymentMethods = methods.filter((m) => !builtIn.has(m.key) && !mappedPayment.has(m.key));

  return { issues, unmappedPaymentMethods };
}
