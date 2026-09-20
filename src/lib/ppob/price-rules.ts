import { db } from "@/db/client";
import { ppobPriceRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PpobCategory } from "./engine";

const SOURCE_NOTE = "Tarif awal contoh — sesuaikan dengan tarif provider PPOB yang Anda pakai.";

/**
 * Starter price list — indicative numbers only, at the order of magnitude typical for Indonesian
 * PPOB aggregators. providerFee is the real cost the shop books as an expense; defaultMargin is
 * the shop's own separate profit target. Each outlet chooses its own PPOB provider (they are not
 * all the same, and rates differ per provider and per tier), so every figure here is a placeholder
 * the owner is expected to replace with what their provider actually deducts. Categories whose
 * margin normally comes from a buy/sell spread rather than a fixed fee seed at 0.
 *
 * A STARTING POINT only — fully editable/extendable via the PPOB page's price-rule panel (add your
 * own PDAM region, adjust margins, add products your provider offers that aren't listed here).
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
  { category: "pulsa", product: "Pulsa Reguler & Data (Laba Langsung)", providerFee: 0, defaultMargin: 0, notes: "Umumnya tidak ada fee tetap untuk pulsa/data — margin berasal dari selisih harga beli/jual. Isi providerFee manual sesuai potongan riil di saldo provider Anda." },
  { category: "ewallet_topup", product: "Top Up DANA/GoPay/ShopeePay", providerFee: 1000, defaultMargin: 2000, notes: "Angka contoh — sesuaikan dengan potongan riil di akun provider PPOB Anda." },
  { category: "lainnya", product: "Voucher Game (Laba Langsung)", providerFee: 0, defaultMargin: 0, notes: "Umumnya tidak ada fee tetap untuk voucher game — margin dari selisih harga beli/jual." },
];

/** Idempotent — only inserts rules the outlet doesn't already have one with the same category+product for. Safe to call on every price-rules GET. */
export async function ensurePpobPriceRules(outletId: string) {
  const existing = await db.select().from(ppobPriceRules).where(eq(ppobPriceRules.outletId, outletId));
  if (existing.length > 0) return; // only auto-seed once — after that, the owner's own edits/deletes are authoritative
  for (const rule of STARTER_PRICE_RULES) {
    await db.insert(ppobPriceRules).values({ outletId, ...rule });
  }
}
