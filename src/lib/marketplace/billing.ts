import { db } from "@/db/client";
import { subscriptionInvoices, subscriptions, marketplaceDeals, outlets } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { UJRAH_AKTIF } from "./ujrah";

/**
 * Penagihan ujrah Marketplace Antar-Outlet.
 *
 * KENAPA MENUMPUK, BUKAN SATU FAKTUR PER TRANSAKSI. Ujrahnya beberapa ribu rupiah. Membuat satu
 * faktur untuk tiap kesepakatan akan membuat Riwayat Tagihan outlet penuh oleh baris Rp5.000 yang
 * tidak akan pernah dibayar satu per satu, dan tiap barisnya menyeret ongkos payment gateway yang
 * bisa lebih besar dari ujrahnya sendiri. Jadi tiap outlet punya paling banyak SATU faktur
 * "marketplace_fee" yang belum dibayar, dan kesepakatan berikutnya menambah baris ke faktur itu
 * sampai dilunasi.
 *
 * Polanya meniru ensureRenewalInvoiceExists di lib/subscription/service.ts — satu faktur belum
 * dibayar per jenis, dicari dulu sebelum dibuat baru.
 *
 * FAKTUR INI TIDAK PERNAH MENGUNCI APLIKASI. Aktivasi langganan di confirmInvoicePayment hanya
 * menghitung tipe "subscription_fee" dan "cart_order" (daftarnya allowlist), sehingga ujrah yang
 * menunggak tidak bisa memutus akses outlet ke NEXBILL. Itu disengaja: menahan seluruh operasional
 * outlet karena tunggakan Rp5.000 dari jasa sampingan adalah hukuman yang jauh melebihi perkaranya.
 */

export interface UjrahLineItem {
  dealId: string;
  dealNumber: string;
  /** Apa yang dijual — supaya penjual bisa mencocokkan barisnya dengan transaksinya sendiri tanpa membuka menu lain. */
  judul: string;
  buyerOutletName: string;
  agreedPrice: number;
  feeAmount: number;
  tanggal: string;
}

const round = (n: number) => Math.round(n);

async function nomorFakturBaru(): Promise<string> {
  const [{ n }] = (await db.select({ n: sql<number>`count(*)` }).from(subscriptionInvoices)) as { n: number }[];
  return `SUB-INV-${String(n + 1).padStart(5, "0")}`;
}

function bacaBaris(json: string | null | undefined): UjrahLineItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as UjrahLineItem[]) : [];
  } catch {
    // lineItemsJson rusak tidak boleh menggagalkan penagihan berikutnya — barisnya dimulai ulang
    // dan totalnya tetap dihitung dari amount faktur yang sudah tersimpan.
    return [];
  }
}

/**
 * Membebankan ujrah satu kesepakatan ke faktur "marketplace_fee" outlet penjual.
 *
 * Mengembalikan null bila tidak ada yang perlu ditagih (ujrah 0 karena transaksinya di bawah
 * ambang, atau outlet penjual belum punya langganan sama sekali sehingga tidak ada tempat
 * menggantungkan fakturnya). Sengaja TIDAK melempar dalam kedua kasus itu: kegagalan menagih upah
 * NEXBILL tidak boleh membatalkan kesepakatan jual-beli antara dua merchant yang barangnya sudah
 * berpindah tangan.
 */
export async function bebankanUjrah(dealId: string): Promise<{ invoiceId: string; total: number } | null> {
  const [deal] = await db.select().from(marketplaceDeals).where(eq(marketplaceDeals.id, dealId)).limit(1);
  if (!deal) return null;
  if (deal.platformFeeStatus !== "pending") return null; // sudah ditagih atau dibebaskan — jangan tagih dua kali
  // Ujrah diarsipkan (UJRAH_AKTIF = false): kesepakatan yang sempat tercatat ber-ujrah sebelum saklar
  // dimatikan ikut dibebaskan, supaya tidak ada faktur marketplace_fee yang terbit selama masa gratis.
  if (!UJRAH_AKTIF || !(deal.platformFeeAmount > 0)) {
    await db.update(marketplaceDeals).set({ platformFeeStatus: "waived" }).where(eq(marketplaceDeals.id, dealId));
    return null;
  }

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.outletId, deal.sellerOutletId)).limit(1);
  if (!sub) return null;

  const [buyer] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, deal.buyerOutletId)).limit(1);

  const baris: UjrahLineItem = {
    dealId: deal.id,
    dealNumber: deal.dealNumber,
    judul: deal.sellerNote?.trim() || deal.dealNumber,
    buyerOutletName: buyer?.name ?? "Outlet",
    agreedPrice: round(deal.agreedPrice * deal.qty),
    feeAmount: round(deal.platformFeeAmount),
    tanggal: deal.completedAt ?? new Date().toISOString(),
  };

  const [fakturBerjalan] = await db
    .select()
    .from(subscriptionInvoices)
    .where(
      and(
        eq(subscriptionInvoices.outletId, deal.sellerOutletId),
        eq(subscriptionInvoices.type, "marketplace_fee"),
        eq(subscriptionInvoices.status, "unpaid")
      )
    )
    .limit(1);

  let invoiceId: string;
  let total: number;

  if (fakturBerjalan) {
    const semuaBaris = [...bacaBaris(fakturBerjalan.lineItemsJson), baris];
    total = round(fakturBerjalan.amount + baris.feeAmount);
    await db
      .update(subscriptionInvoices)
      .set({
        lineItemsJson: JSON.stringify(semuaBaris),
        qty: semuaBaris.length,
        unitPrice: total,
        amount: total,
        description: `Ujrah Marketplace Antar-Outlet — ${semuaBaris.length} transaksi`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptionInvoices.id, fakturBerjalan.id));
    invoiceId = fakturBerjalan.id;
  } else {
    total = baris.feeAmount;
    const invoiceNumber = await nomorFakturBaru();
    const [dibuat] = await db
      .insert(subscriptionInvoices)
      .values({
        invoiceNumber,
        outletId: deal.sellerOutletId,
        subscriptionId: sub.id,
        type: "marketplace_fee",
        description: "Ujrah Marketplace Antar-Outlet — 1 transaksi",
        qty: 1,
        unitPrice: total,
        amount: total,
        lineItemsJson: JSON.stringify([baris]),
        status: "unpaid",
        // Sengaja TANPA dueDate. Faktur langganan punya tenggat karena menunggaknya mengunci
        // aplikasi; ujrah tidak pernah mengunci apa pun, jadi memberinya tenggat hanya akan
        // memunculkan peringatan "jatuh tempo" yang tidak ada konsekuensinya — dan peringatan
        // tanpa konsekuensi adalah cara tercepat membuat merchant berhenti membaca peringatan.
      })
      .returning();
    invoiceId = dibuat.id;
  }

  await db
    .update(marketplaceDeals)
    .set({ platformFeeStatus: "invoiced", platformFeeInvoiceId: invoiceId })
    .where(eq(marketplaceDeals.id, dealId));

  return { invoiceId, total };
}
