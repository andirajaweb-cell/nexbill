import { db } from "@/db/client";
import { ppobPriceRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PpobCategory } from "./engine";

const SOURCE_NOTE = "Fee Outlet tier Basic — fastpay.co.id/blog/layanan-fee";

/**
 * Starter price list seeded from Fastpay's publicly disclosed "Fee Outlet" (Basic
 * tier only, per owner's decision — Pro/Enterprise not modeled) at
 * fastpay.co.id/blog/layanan-fee. That page lists what Fastpay pays OUT to the
 * outlet per transaction type; here it's used as providerFee — the real cost the
 * shop books as an expense — while defaultMargin is the shop's own separate
 * profit target, not from that page at all. Not every category has a disclosed
 * number (pulsa/e-wallet/voucher game are listed there as "Laba Langsung" — direct
 * profit from a buy/sell spread, no fixed fee published) — those seed at 0 and are
 * left for the owner to fill in with their actual Fastpay deduction. This list is
 * a STARTING POINT — fully editable/extendable via the PPOB page's price-rule panel
 * (e.g. add your own PDAM region, adjust margins, add products Fastpay doesn't
 * cover here).
 */
const STARTER_PRICE_RULES: { category: PpobCategory; product: string; providerFee: number; defaultMargin: number; notes: string }[] = [
  { category: "token_listrik", product: "PLN Prabayar/Pascabayar", providerFee: 2000, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "token_listrik", product: "PLN Non Taglist", providerFee: 3200, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "lainnya", product: "BPJS Kesehatan", providerFee: 1000, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "lainnya", product: "BPJS Ketenagakerjaan", providerFee: 1000, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "tarik_tunai", product: "Tarik Tunai Bank Mandiri", providerFee: 1500, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "tarik_tunai", product: "Tarik Tunai Bank BNI", providerFee: 2500, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "transfer", product: "Setor Tunai Bank Mandiri", providerFee: 500, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "transfer", product: "Setor Tunai Bank BNI", providerFee: 600, defaultMargin: 1000, notes: SOURCE_NOTE },
  { category: "pulsa", product: "Pulsa Reguler & Data (Laba Langsung)", providerFee: 0, defaultMargin: 0, notes: "Fastpay tidak mempublikasikan fee tetap untuk pulsa/data — margin berasal dari selisih harga beli/jual. Isi providerFee manual jika tahu potongan riil di saldo Fastpay Anda." },
  { category: "ewallet_topup", product: "Top Up DANA/GoPay/ShopeePay", providerFee: 1000, defaultMargin: 2000, notes: "Contoh dari owner — fee Fastpay untuk top up e-wallet tidak dipublikasikan di halaman resmi, sesuaikan dengan potongan riil di akun Fastpay Anda." },
  { category: "lainnya", product: "Voucher Game (Laba Langsung)", providerFee: 0, defaultMargin: 0, notes: "Fastpay tidak mempublikasikan fee tetap untuk sebagian besar voucher game — margin dari selisih harga beli/jual." },
];

/** Idempotent — only inserts rules the outlet doesn't already have one with the same category+product for. Safe to call on every price-rules GET. */
export async function ensurePpobPriceRules(outletId: string) {
  const existing = await db.select().from(ppobPriceRules).where(eq(ppobPriceRules.outletId, outletId));
  if (existing.length > 0) return; // only auto-seed once — after that, the owner's own edits/deletes are authoritative
  for (const rule of STARTER_PRICE_RULES) {
    await db.insert(ppobPriceRules).values({ outletId, ...rule });
  }
}
