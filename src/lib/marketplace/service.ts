import { db } from "@/db/client";
import { marketplaceListings, marketplaceDeals, marketplaceReviews, outlets } from "@/db/schema";
import { eq, and, ne, desc, or, sql, inArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { createOtherIncome } from "@/lib/accounting/other-income";
import { bebankanUjrah } from "./billing";
import { bersihkanFotoBarang, daftarFotoBarang } from "./photos";
import { pastikanTanpaKontak, normalisasiNoHp, kontakBolehDibuka, alasanTarikSah, ALASAN_TARIK } from "./anti-bypass";
import { periksaBatasNilaiBarang, rekeningBaruDiganti, type ProfilKepercayaan } from "./trust";
import {
  profilSatuOutlet,
  ambilProfilKepercayaan,
  daftarOutletDitangguhkan,
  outletDitangguhkan,
  ambilBarisTrust,
  rekeningDariBaris,
} from "./trust-service";
import {
  computeUjrah,
  bolehPindahStatus,
  bolehDilakukanOleh,
  statusListingSetelah,
  type DealStatus,
  type PeranDeal,
  UJRAH_CONFIG_DEFAULT,
  UJRAH_AKTIF,
  UJRAH_CONFIG_NONAKTIF,
  type UjrahConfig,
} from "./ujrah";

/** Ringkasan profil yang aman dikirim ke outlet lain (tanpa data internal). */
const ringkasProfil = (p: ProfilKepercayaan | undefined) =>
  p
    ? {
        level: p.level,
        label: p.label,
        ageDays: p.ageDays,
        completedDeals: p.completedDeals,
        avgRating: p.avgRating,
        ratingCount: p.ratingCount,
        provenDisputes: p.provenDisputes,
        openDisputesAgainst: p.openDisputesAgainst,
        isNew: p.isNew,
        peringatan: p.peringatan,
      }
    : null;

const PESAN_DITANGGUHKAN = "Akses Marketplace outlet Anda sedang ditangguhkan oleh tim NEXBILL. Kesepakatan yang sudah berjalan tetap bisa diselesaikan. Hubungi Customer Service untuk informasi.";

/**
 * Marketplace Antar-Outlet — outlet menjual stok berlebihnya ke outlet lain di jaringan NEXBILL.
 *
 * Akad dan alur uangnya dijelaskan lengkap di db/schema.ts (marketplaceListings). Ringkasnya:
 * pembeli membayar LANGSUNG ke penjual, NEXBILL tidak memegang uang siapa pun, dan upah NEXBILL
 * adalah ujrah bernominal tetap yang ditagih menyusul ke penjual.
 */

const round = (n: number) => Math.round(n);

/**
 * Ujrah boleh ditimpa lewat env untuk masa promosi tanpa deploy ulang. Nilai yang tidak bisa
 * dibaca sebagai angka diabaikan diam-diam dan kembali ke baku — salah ketik di variabel
 * lingkungan tidak boleh diam-diam menagih merchant dengan nominal yang aneh.
 */
export function ujrahConfig(): UjrahConfig {
  // Diarsipkan: Marketplace gratis sementara — lihat UJRAH_AKTIF di ujrah.ts.
  if (!UJRAH_AKTIF) return UJRAH_CONFIG_NONAKTIF;
  const dariEnv = Number(process.env.MARKETPLACE_UJRAH);
  return Number.isFinite(dariEnv) && dariEnv >= 0 ? { ...UJRAH_CONFIG_DEFAULT, nominal: Math.round(dariEnv) } : UJRAH_CONFIG_DEFAULT;
}

/** ================= ETALASE ================= */

export interface CreateListingInput {
  outletId: string;
  title: string;
  description?: string;
  category?: string;
  condition?: string;
  qty?: number;
  price: number;
  negotiable?: boolean;
  city?: string;
  contactPhone?: string;
  /** Maks. 5 URL dari /api/marketplace/upload, urut: pertama = foto utama. */
  imageUrls?: unknown;
  staffUserId?: string;
}

export async function createListing(input: CreateListingInput) {
  if (!input.title?.trim()) throw new Error("Nama barang wajib diisi.");
  if (!(input.price > 0)) throw new Error("Harga harus lebih dari 0.");
  // Kontak di teks bebas = jalan pintas transaksi di luar aplikasi. Lihat anti-bypass.ts.
  pastikanTanpaKontak({ "Nama Barang": input.title, Keterangan: input.description, Kota: input.city });
  // Wajib: nomor ini TIDAK tampil di etalase, hanya dibuka ke pembeli setelah penawarannya diterima.
  const contactPhone = normalisasiNoHp(input.contactPhone);
  const foto = bersihkanFotoBarang(input.imageUrls, process.env.NEXT_PUBLIC_SUPABASE_URL);
  // Ditangguhkan → ditolak; outlet baru → nilai barang dibatasi (lihat periksaBatasNilaiBarang di trust.ts).
  periksaBatasNilaiBarang(await profilSatuOutlet(input.outletId), input.price, input.qty ?? 1);

  const [row] = await db
    .insert(marketplaceListings)
    .values({
      outletId: input.outletId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: (input.category as never) ?? "other",
      condition: (input.condition as never) ?? "used",
      qty: Math.max(1, Math.floor(input.qty ?? 1)),
      price: round(input.price),
      negotiable: input.negotiable ?? true,
      city: input.city?.trim() || null,
      contactPhone,
      imageUrl: foto[0] ?? null,
      imageUrls: foto.length > 0 ? JSON.stringify(foto) : null,
    })
    .returning();

  await logAudit({ outletId: input.outletId, staffUserId: input.staffUserId, action: "create_marketplace_listing", entityType: "marketplace_listing", entityId: row.id, after: { title: row.title, price: row.price, foto: foto.length } });
  return { ...row, photos: foto };
}

/**
 * Etalase yang dilihat outlet lain.
 *
 * Barang milik outlet sendiri SENGAJA dikecualikan: tidak ada gunanya menawarkan seseorang membeli
 * barangnya sendiri, dan membiarkannya muncul hanya membuat etalase terasa penuh padahal tidak ada
 * yang bisa dibeli. Listing sendiri tetap terlihat di tab "Barang Saya".
 */
export async function listPublicListings(viewerOutletId: string, filter?: { category?: string; search?: string }) {
  const conditions = [eq(marketplaceListings.status, "active"), ne(marketplaceListings.outletId, viewerOutletId)];
  if (filter?.category && filter.category !== "all") conditions.push(eq(marketplaceListings.category, filter.category as never));
  if (filter?.search?.trim()) {
    const q = `%${filter.search.trim()}%`;
    conditions.push(or(sql`${marketplaceListings.title} ilike ${q}`, sql`${marketplaceListings.description} ilike ${q}`)!);
  }

  const rows = await db
    .select({
      listing: marketplaceListings,
      outletName: outlets.name,
    })
    .from(marketplaceListings)
    .leftJoin(outlets, eq(outlets.id, marketplaceListings.outletId))
    .where(and(...conditions))
    .orderBy(desc(marketplaceListings.createdAt));

  // Barang milik outlet yang ditangguhkan tidak ditampilkan; sisanya diberi profil kepercayaan penjual.
  const ditangguhkan = await daftarOutletDitangguhkan();
  const tampil = rows.filter((r) => !ditangguhkan.has(r.listing.outletId));
  const profil = await ambilProfilKepercayaan(tampil.map((r) => r.listing.outletId));

  return tampil.map((r) => {
    /*
     * contact_phone SENGAJA dibuang di sini, di server — bukan sekadar tidak ditampilkan di layar.
     * Sebelumnya kolom ini ikut terkirim ke setiap outlet dan bisa dibaca lewat DevTools browser,
     * sehingga pembeli bisa langsung menghubungi penjual tanpa pernah membuat kesepakatan.
     * Nomornya dibuka lewat listDeals() setelah penawaran diterima.
     */
    const { contactPhone, closedReason, closedNote, ...listing } = r.listing;
    void contactPhone; void closedReason; void closedNote; // dibuang dengan sengaja
    return {
    ...listing,
    photos: daftarFotoBarang(r.listing),
    outletName: r.outletName ?? "Outlet",
    sellerProfile: ringkasProfil(profil.get(r.listing.outletId)),
    ujrah: computeUjrah(r.listing.price, r.listing.qty, ujrahConfig()),
    };
  });
}

export async function listMyListings(outletId: string) {
  const rows = await db.select().from(marketplaceListings).where(eq(marketplaceListings.outletId, outletId)).orderBy(desc(marketplaceListings.createdAt));
  return rows.map((r) => ({ ...r, photos: daftarFotoBarang(r) }));
}

/**
 * Menarik barang dari etalase. Alasan WAJIB (ALASAN_TARIK di anti-bypass.ts).
 *
 * Tidak ada pilihan "terjual ke outlet NEXBILL" di sini — penjualan ke sesama outlet harus lewat
 * "Ajukan Beli" supaya tercatat. Jumlah penawaran yang pernah masuk ikut dicatat di audit log:
 * barang yang ditarik dengan alasan "terjual di luar NEXBILL" SETELAH ada penawaran dari outlet lain
 * adalah pola utama yang perlu diperiksa platform-admin.
 */
export async function closeListing(listingId: string, outletId: string, alasan: unknown, catatan?: string, staffUserId?: string) {
  const [existing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, listingId)).limit(1);
  if (!existing || existing.outletId !== outletId) throw new Error("Barang tidak ditemukan.");
  if (existing.status === "reserved") throw new Error("Barang ini sedang dalam kesepakatan yang belum selesai — batalkan kesepakatannya dulu.");
  if (existing.status !== "active") throw new Error("Barang ini sudah tidak ada di etalase.");
  if (!alasanTarikSah(alasan)) throw new Error("Pilih alasan menarik barang.");
  const catatanBersih = catatan?.trim() || null;
  if (alasan === "other" && !catatanBersih) throw new Error("Tuliskan alasannya untuk pilihan \"Lainnya\".");

  const [{ n: jumlahPenawaran }] = (await db
    .select({ n: sql<number>`count(*)` })
    .from(marketplaceDeals)
    .where(eq(marketplaceDeals.listingId, listingId))) as { n: number }[];

  const [row] = await db
    .update(marketplaceListings)
    .set({ status: "closed", closedReason: alasan, closedNote: catatanBersih, updatedAt: new Date().toISOString() })
    .where(eq(marketplaceListings.id, listingId))
    .returning();
  await logAudit({
    outletId,
    staffUserId,
    action: "close_marketplace_listing",
    entityType: "marketplace_listing",
    entityId: listingId,
    after: { status: "closed", alasan, alasanLabel: ALASAN_TARIK[alasan], catatan: catatanBersih, jumlahPenawaranSebelumnya: Number(jumlahPenawaran) },
  });
  return row;
}

/** ================= KESEPAKATAN ================= */

async function nomorKesepakatan(): Promise<string> {
  const [{ n }] = (await db.select({ n: sql<number>`count(*)` }).from(marketplaceDeals)) as { n: number }[];
  return `MP-${String(n + 1).padStart(5, "0")}`;
}

export interface CreateDealInput {
  listingId: string;
  buyerOutletId: string;
  qty?: number;
  /** Harga yang ditawarkan pembeli. Kosong = setuju harga pasang. */
  agreedPrice?: number;
  buyerNote?: string;
  /** No. HP pembeli — wajib, baru terlihat oleh penjual setelah penawaran diterima. */
  buyerContactPhone?: string;
  staffUserId?: string;
}

/**
 * Pembeli mengajukan penawaran atas sebuah listing.
 *
 * Ujrah dihitung dan DISALIN ke barisnya di sini, saat penawaran dibuat, bukan saat ditagih.
 * Alasannya ada di catatan akad db/schema.ts: kesepakatan yang sudah disetujui tidak boleh berubah
 * biayanya karena tarif NEXBILL diubah belakangan — itu akan membuat ujrahnya tidak lagi
 * "ma'lumah" (diketahui pasti di muka), yang justru inti dari memilih akad ini.
 */
export async function createDeal(input: CreateDealInput) {
  const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, input.listingId)).limit(1);
  if (!listing) throw new Error("Barang tidak ditemukan.");
  if (listing.status !== "active") throw new Error("Barang ini sudah tidak tersedia.");
  if (listing.outletId === input.buyerOutletId) throw new Error("Tidak bisa membeli barang milik outlet sendiri.");
  if (await outletDitangguhkan(input.buyerOutletId)) throw new Error(PESAN_DITANGGUHKAN);
  if (await outletDitangguhkan(listing.outletId)) throw new Error("Barang ini sudah tidak tersedia.");
  // Catatan penawaran terlihat penjual SEBELUM diterima — nomor HP di sini membuka jalan pintas yang sama.
  pastikanTanpaKontak({ "Catatan untuk penjual": input.buyerNote });
  const buyerContactPhone = normalisasiNoHp(input.buyerContactPhone);

  const qty = Math.max(1, Math.min(Math.floor(input.qty ?? 1), listing.qty));
  const agreedPrice = round(input.agreedPrice && input.agreedPrice > 0 ? input.agreedPrice : listing.price);
  if (!listing.negotiable && agreedPrice !== round(listing.price)) {
    throw new Error("Penjual memasang harga pas untuk barang ini — penawaran harus sesuai harga yang tertera.");
  }

  const dealNumber = await nomorKesepakatan();
  const [row] = await db
    .insert(marketplaceDeals)
    .values({
      dealNumber,
      listingId: listing.id,
      sellerOutletId: listing.outletId,
      buyerOutletId: input.buyerOutletId,
      qty,
      agreedPrice,
      platformFeeAmount: computeUjrah(agreedPrice, qty, ujrahConfig()),
      status: "requested",
      buyerNote: input.buyerNote?.trim() || null,
      buyerContactPhone,
      sellerNote: listing.title,
    })
    .returning();

  await logAudit({ outletId: input.buyerOutletId, staffUserId: input.staffUserId, action: "create_marketplace_deal", entityType: "marketplace_deal", entityId: row.id, after: { dealNumber, agreedPrice, qty } });
  return row;
}

export async function listDeals(outletId: string) {
  const rows = await db
    .select()
    .from(marketplaceDeals)
    .where(or(eq(marketplaceDeals.sellerOutletId, outletId), eq(marketplaceDeals.buyerOutletId, outletId)))
    .orderBy(desc(marketplaceDeals.createdAt));

  const outletIds = Array.from(new Set(rows.flatMap((r) => [r.sellerOutletId, r.buyerOutletId])));
  const namaOutlet = new Map<string, string>();
  if (outletIds.length > 0) {
    const namaRows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets);
    namaRows.forEach((o) => namaOutlet.set(o.id, o.name));
  }

  // Nomor HP penjual & foto sampul barang, dari listing masing-masing kesepakatan.
  const listingIds = Array.from(new Set(rows.map((r) => r.listingId)));
  const infoListing = new Map<string, { contactPhone: string | null; photos: string[] }>();
  if (listingIds.length > 0) {
    const lrows = await db
      .select({ id: marketplaceListings.id, contactPhone: marketplaceListings.contactPhone, imageUrl: marketplaceListings.imageUrl, imageUrls: marketplaceListings.imageUrls })
      .from(marketplaceListings)
      .where(inArray(marketplaceListings.id, listingIds));
    lrows.forEach((l) => infoListing.set(l.id, { contactPhone: l.contactPhone, photos: daftarFotoBarang(l) }));
  }

  // Keamanan: profil pihak lawan, ulasan yang sudah saya berikan, rekening penjual saat ini.
  const profil = await ambilProfilKepercayaan(outletIds);
  const dealIds = rows.map((r) => r.id);
  const sudahDiulas = new Set<string>();
  if (dealIds.length > 0) {
    const rv = await db
      .select({ dealId: marketplaceReviews.dealId })
      .from(marketplaceReviews)
      .where(and(inArray(marketplaceReviews.dealId, dealIds), eq(marketplaceReviews.reviewerOutletId, outletId)));
    rv.forEach((x) => sudahDiulas.add(x.dealId));
  }
  const rekeningSekarang = new Map<string, { rek: ReturnType<typeof rekeningDariBaris>; bankUpdatedAt: string | null }>();
  for (const sellerId of Array.from(new Set(rows.filter((r) => r.buyerOutletId === outletId).map((r) => r.sellerOutletId)))) {
    const t = await ambilBarisTrust(sellerId);
    rekeningSekarang.set(sellerId, { rek: rekeningDariBaris(t), bankUpdatedAt: t?.bankUpdatedAt ?? null });
  }

  return rows.map((r) => {
    /*
     * Kontak KEDUA pihak hanya dikirim bila kesepakatan sudah diterima/selesai. buyerContactPhone
     * dibuang dari spread untuk status lain — tanpa itu, penjual bisa membaca nomor pembeli dari
     * respons API pada penawaran yang belum (atau tidak akan pernah) ia terima. Rekening mengikuti
     * aturan yang sama.
     */
    const { buyerContactPhone, payoutSnapshot, ...deal } = r;
    const buka = kontakBolehDibuka(r.status as DealStatus);
    const info = infoListing.get(r.listingId);
    const peran = (r.sellerOutletId === outletId ? "seller" : "buyer") as PeranDeal;
    const lawan = peran === "seller" ? r.buyerOutletId : r.sellerOutletId;

    let payout: { bankName: string; accountNumber: string; holder: string } | null = null;
    try {
      payout = buka && payoutSnapshot ? JSON.parse(payoutSnapshot) : null;
    } catch {
      payout = null;
    }
    /*
     * Modus penipuan paling umum tanpa escrow: "rekening saya ganti, transfer ke sini saja". Pembeli
     * diberi tahu bila rekening penjual SEKARANG berbeda dari yang terkunci di kesepakatan ini, atau
     * baru saja diganti.
     */
    const rs = peran === "buyer" ? rekeningSekarang.get(r.sellerOutletId) : undefined;
    const rekeningBerubahSetelahDiterima = !!(payout && rs?.rek && (rs.rek.accountNumber !== payout.accountNumber || rs.rek.bankName !== payout.bankName));
    const rekeningBaru = !!(payout && rekeningBaruDiganti(rs?.bankUpdatedAt));

    return {
      ...deal,
      peran,
      sellerOutletName: namaOutlet.get(r.sellerOutletId) ?? "Outlet",
      buyerOutletName: namaOutlet.get(r.buyerOutletId) ?? "Outlet",
      sellerContactPhone: buka ? info?.contactPhone ?? null : null,
      buyerContactPhone: buka ? buyerContactPhone ?? null : null,
      photo: info?.photos[0] ?? null,
      counterpartProfile: ringkasProfil(profil.get(lawan)),
      payout,
      rekeningBerubahSetelahDiterima,
      rekeningBaru,
      sudahDiulas: sudahDiulas.has(r.id),
    };
  });
}

export interface TransitionDealInput {
  dealId: string;
  outletId: string;
  ke: DealStatus;
  alasan?: string;
  settlementMethod?: "cash" | "transfer" | "qris" | "other";
  staffUserId?: string;
  shiftId?: string | null;
}

/**
 * Satu-satunya pintu untuk memindahkan status kesepakatan. Aturan transisinya dan aturan siapa
 * boleh apa dibaca dari ujrah.ts — modul murni yang SAMA dipakai layar untuk memilih tombol mana
 * yang ditampilkan, sehingga tidak mungkin ada tombol yang tampil tapi ditolak server.
 *
 * SISI PEMBELI SENGAJA TIDAK DIPOSTING OTOMATIS. Saat kesepakatan selesai, sisi PENJUAL diposting
 * sebagai Pendapatan Lain-lain kategori "Penjualan Aset/Barang Bekas" (akun 4730) — itu tidak
 * ambigu: uang masuk dari penjualan barang bekas, persis kategori yang sudah ada dan sudah
 * teruji. Sisi PEMBELI tidak: stik bekas yang dibeli bisa jadi persediaan, bisa jadi aset tetap,
 * bisa jadi beban perlengkapan, dan jawabannya bergantung pada bagaimana outlet itu memakainya —
 * bukan sesuatu yang bisa ditebak dari baris kesepakatan. Menebaknya akan menaruh angka di akun
 * yang salah dan baru ketahuan berbulan-bulan kemudian saat neraca tidak masuk akal. Jadi pembeli
 * diarahkan mencatatnya sendiri lewat Form Expense yang sudah ada, di mana dia memilih akunnya.
 */
export async function transitionDeal(input: TransitionDealInput) {
  const [deal] = await db.select().from(marketplaceDeals).where(eq(marketplaceDeals.id, input.dealId)).limit(1);
  if (!deal) throw new Error("Kesepakatan tidak ditemukan.");

  const peran: PeranDeal | null =
    deal.sellerOutletId === input.outletId ? "seller" : deal.buyerOutletId === input.outletId ? "buyer" : null;
  if (!peran) throw new Error("Outlet kamu bukan bagian dari kesepakatan ini.");

  if (!bolehPindahStatus(deal.status as DealStatus, input.ke)) {
    throw new Error(`Kesepakatan berstatus "${deal.status}" tidak bisa diubah menjadi "${input.ke}".`);
  }
  if (!bolehDilakukanOleh(peran, input.ke)) {
    const siapa = input.ke === "completed" ? "pembeli" : "penjual";
    throw new Error(`Hanya ${siapa} yang bisa melakukan ini.`);
  }

  // Alasan tolak/batal terbaca pihak lain — "tolak di sini, hubungi saya di 08…" adalah jalan pintas yang sama.
  pastikanTanpaKontak({ Alasan: input.alasan });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: input.ke, updatedAt: now };
  if (input.alasan?.trim()) patch.closedReason = input.alasan.trim();

  let sellerOtherIncomeId: string | null = null;

  if (input.ke === "accepted") {
    /*
     * Menerima penawaran = mengikat diri. Dua syarat keamanan di titik ini:
     *   1. Outlet yang ditangguhkan tidak boleh memulai kesepakatan baru.
     *   2. Rekening penerima WAJIB terdaftar, dan SALINANNYA dikunci ke kesepakatan ini. Pembeli
     *      diarahkan membayar ke rekening yang terkunci itu — penggantian rekening sesudahnya
     *      langsung terlihat di layar pembeli (lihat listDeals), bukan hanya diklaim di chat.
     */
    if (await outletDitangguhkan(deal.sellerOutletId)) throw new Error(PESAN_DITANGGUHKAN);
    const rek = rekeningDariBaris(await ambilBarisTrust(deal.sellerOutletId));
    if (!rek) {
      throw new Error("Daftarkan dulu rekening penerima di tab Keamanan & Rekening. Pembeli hanya akan diarahkan membayar ke rekening itu.");
    }
    patch.payoutSnapshot = JSON.stringify(rek);
  }

  if (input.ke === "completed") {
    patch.completedAt = now;
    patch.settlementMethod = input.settlementMethod ?? "cash";

    /*
     * Pendapatan penjual dicatat lewat createOtherIncome() yang sudah ada, BUKAN lewat postJournal()
     * langsung. Fungsi itu sudah mengurus pemetaan akun per kategori, potongan biaya QRIS, dan
     * rekonsiliasi kas shift — menulis ulang jurnalnya di sini berarti tiga hal itu harus dijaga
     * benar di dua tempat sekaligus, dan tempat kedua pasti yang tertinggal saat ada perubahan.
     */
    const income = await createOtherIncome({
      outletId: deal.sellerOutletId,
      category: "asset_sale",
      description: `Marketplace ${deal.dealNumber} — ${deal.sellerNote ?? "penjualan barang"}`,
      payerName: (await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, deal.buyerOutletId)).limit(1))[0]?.name,
      amount: round(deal.agreedPrice * deal.qty),
      paymentMethod: (input.settlementMethod ?? "cash") === "other" ? "cash" : (input.settlementMethod ?? "cash"),
      staffUserId: input.staffUserId,
      shiftId: input.shiftId ?? null,
    });
    sellerOtherIncomeId = income.id;
    patch.sellerOtherIncomeId = sellerOtherIncomeId;
  }

  const [updated] = await db.update(marketplaceDeals).set(patch).where(eq(marketplaceDeals.id, input.dealId)).returning();

  // Etalase mengikuti: terjual hilang dari daftar, ditolak/dibatalkan kembali tersedia.
  const statusListing = statusListingSetelah(input.ke);
  if (statusListing) {
    await db.update(marketplaceListings).set({ status: statusListing, updatedAt: now }).where(eq(marketplaceListings.id, deal.listingId));
  }

  /*
   * Ujrah dibebankan SETELAH kesepakatan tersimpan selesai, dan kegagalannya sengaja tidak
   * dilempar: barangnya sudah berpindah tangan dan uang sudah dibayar antar-merchant di dunia
   * nyata. Menggagalkan pencatatan kesepakatan hanya karena NEXBILL gagal menagih upahnya sendiri
   * akan merugikan dua merchant demi masalah yang seluruhnya milik NEXBILL. Barisnya tetap
   * "pending" dan bisa ditagih ulang.
   */
  if (input.ke === "completed") {
    try {
      await bebankanUjrah(input.dealId);
    } catch (err) {
      console.error(`Gagal membebankan ujrah untuk ${deal.dealNumber}:`, err);
    }
  }

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId,
    action: `marketplace_deal_${input.ke}`,
    entityType: "marketplace_deal",
    entityId: input.dealId,
    before: { status: deal.status },
    after: { status: input.ke, alasan: input.alasan ?? null },
  });

  // Respons ini dikirim ke pihak mana pun yang menekan tombol — nomor pembeli ikut aturan yang sama dengan listDeals().
  const { buyerContactPhone, payoutSnapshot, ...tanpaKontak } = updated;
  void payoutSnapshot; // layar memuat ulang lewat listDeals(), yang menerapkan aturan buka/tutupnya
  return { ...tanpaKontak, buyerContactPhone: kontakBolehDibuka(updated.status as DealStatus) ? buyerContactPhone : null, sellerOtherIncomeId };
}
