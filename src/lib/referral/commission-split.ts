/**
 * Aturan pembagian komisi referral untuk SATU faktur langganan — MURNI, tanpa database.
 *
 * Dipisahkan dari service.ts karena inilah bagian yang benar-benar memutuskan siapa dibayar berapa,
 * dan keputusan seperti itu harus bisa diuji langsung atas puluhan bentuk faktur tanpa menyiapkan
 * database. Pola yang sama dipakai aggregateCashFlow dan pairReversals di modul akuntansi.
 *
 * MASALAH YANG DIPECAHKAN.
 *
 * Merchant satu cabang ditagih lewat faktur "subscription_fee": satu faktur, satu outlet, satu
 * komisi. Mudah.
 *
 * Merchant multi-cabang ditagih lewat SATU faktur "group_renewal" yang mencakup semua cabangnya
 * sekaligus (lihat ensureGroupRenewalInvoiceExists di lib/subscription/service.ts), dengan rincian
 * per outlet disimpan di kolom lineItemsJson. Satu faktur begitu bisa memuat:
 *   - outlet A yang diajak partner X,
 *   - outlet B yang diajak partner Y,
 *   - outlet C yang tidak diajak siapa pun.
 *
 * Sebelum perbaikan ini, accrueReferralCommission menolak seluruh faktur yang bukan
 * "subscription_fee", jadi merchant multi-cabang tidak pernah menghasilkan komisi sepeser pun —
 * padahal justru merekalah referral yang paling bernilai.
 *
 * ATURAN YANG DIJAGA DI SINI:
 *  - Komisi dihitung atas nilai BARIS outlet itu sendiri, bukan total faktur. Partner yang mengajak
 *    satu cabang dari tiga tidak boleh dibayar atas tagihan ketiganya.
 *  - Outlet yang tidak punya pengajak tidak menghasilkan apa-apa, dan tidak menggugurkan hak outlet
 *    lain di faktur yang sama.
 *  - Persentase yang dipakai adalah milik partner masing-masing, bukan satu angka untuk semua.
 */

/** Satu baris outlet pada faktur — untuk faktur satu outlet, cukup satu baris berisi seluruh nilainya. */
export interface InvoiceOutletLine {
  outletId: string;
  amount: number;
}

/** Data pengajak sebuah outlet, sebagaimana sudah diambil pemanggil dari database. */
export interface RefereeLink {
  outletId: string;
  referralPartnerId: string;
  referralConversionId: string;
  commissionPercent: number;
  /** Partner nonaktif tetap dilewati — haknya berhenti saat dinonaktifkan, bukan surut ke belakang. */
  partnerIsActive: boolean;
}

export interface CommissionAccrual {
  referralPartnerId: string;
  referralConversionId: string;
  outletId: string;
  sourceInvoiceAmount: number;
  commissionPercent: number;
  amount: number;
}

const round = (n: number) => Math.round(n);

/**
 * Menentukan baris komisi apa saja yang lahir dari satu faktur.
 *
 * `alreadyAccruedConversionIds` berisi conversion yang sudah pernah dicatat untuk faktur ini —
 * pemanggil mengambilnya dari referralCommissions. Itulah yang membuat pemanggilan ulang (webhook
 * pembayaran terkirim dua kali, atau tombol konfirmasi ditekan berulang) tidak menggandakan komisi
 * siapa pun, sekaligus tetap memungkinkan outlet yang BELUM tercatat menyusul di panggilan
 * berikutnya — misalnya kalau panggilan pertama gagal di tengah jalan.
 */
export function planCommissionAccruals(
  lines: InvoiceOutletLine[],
  refereeLinks: RefereeLink[],
  alreadyAccruedConversionIds: Set<string> = new Set()
): CommissionAccrual[] {
  const linkByOutlet = new Map(refereeLinks.map((l) => [l.outletId, l]));

  // Beberapa baris untuk outlet yang sama (paket + add-on dalam satu faktur gabungan, misalnya)
  // digabung dulu, supaya outlet itu menghasilkan TEPAT satu baris komisi — sesuai batasan unik
  // (sourceInvoiceId, referralConversionId) di skema.
  const amountByOutlet = new Map<string, number>();
  for (const line of lines) {
    if (!line.outletId) continue;
    amountByOutlet.set(line.outletId, (amountByOutlet.get(line.outletId) ?? 0) + line.amount);
  }

  const accruals: CommissionAccrual[] = [];
  for (const [outletId, amount] of amountByOutlet) {
    const link = linkByOutlet.get(outletId);
    if (!link || !link.partnerIsActive) continue;
    if (alreadyAccruedConversionIds.has(link.referralConversionId)) continue;
    if (amount <= 0) continue;

    const commission = round(amount * (link.commissionPercent / 100));
    if (commission <= 0) continue;

    accruals.push({
      referralPartnerId: link.referralPartnerId,
      referralConversionId: link.referralConversionId,
      outletId,
      sourceInvoiceAmount: amount,
      commissionPercent: link.commissionPercent,
      amount: commission,
    });
  }

  return accruals;
}

/**
 * Membaca rincian per-outlet dari sebuah faktur.
 *
 * Faktur gabungan menyimpannya di lineItemsJson; faktur satu outlet tidak punya kolom itu dan
 * seluruh nilainya milik outlet fakturnya sendiri. JSON yang rusak diperlakukan sebagai "tidak ada
 * rincian" dan jatuh ke perlakuan satu outlet — lebih baik membayar komisi atas satu outlet
 * berdasarkan data yang pasti benar (outletId dan amount di faktur itu sendiri) daripada gagal
 * total karena satu kolom teks tidak bisa diurai.
 */
export function readInvoiceOutletLines(invoice: {
  outletId: string;
  amount: number;
  lineItemsJson?: string | null;
}): InvoiceOutletLine[] {
  if (invoice.lineItemsJson) {
    try {
      const parsed = JSON.parse(invoice.lineItemsJson);
      if (Array.isArray(parsed)) {
        const lines = parsed
          .filter((l): l is { outletId: string; amount: number } => !!l && typeof l.outletId === "string" && typeof l.amount === "number")
          .map((l) => ({ outletId: l.outletId, amount: l.amount }));
        if (lines.length > 0) return lines;
      }
    } catch {
      // Sengaja dibiarkan jatuh ke perlakuan satu outlet di bawah.
    }
  }
  return [{ outletId: invoice.outletId, amount: invoice.amount }];
}
