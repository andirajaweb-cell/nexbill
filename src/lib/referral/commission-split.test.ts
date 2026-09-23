import { describe, it, expect } from "vitest";
import { planCommissionAccruals, readInvoiceOutletLines, type RefereeLink } from "./commission-split";

/*
 * Uji pembagian komisi referral (2026-09-22).
 *
 * Yang dijaga di sini adalah uang orang lain. accrueReferralCommission menentukan berapa yang
 * dibayarkan ke partner pengajak, jadi yang paling penting bukan "apakah angkanya keluar",
 * melainkan batas-batasnya: komisi tidak boleh dihitung atas tagihan cabang yang bukan hasil
 * ajakannya, tidak boleh lahir dua kali dari faktur yang sama, dan tidak boleh muncul untuk partner
 * yang sudah dinonaktifkan.
 */

const link = (p: Partial<RefereeLink> & { outletId: string }): RefereeLink => ({
  referralPartnerId: "partner-X",
  referralConversionId: `conv-${p.outletId}`,
  commissionPercent: 20,
  partnerIsActive: true,
  ...p,
});

describe("planCommissionAccruals — faktur satu outlet", () => {
  it("menghitung komisi sesuai persentase partner", () => {
    const hasil = planCommissionAccruals([{ outletId: "o1", amount: 500_000 }], [link({ outletId: "o1", commissionPercent: 20 })]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].amount).toBe(100_000);
    expect(hasil[0].sourceInvoiceAmount).toBe(500_000);
  });

  it("tidak menghasilkan apa-apa untuk outlet yang tidak diajak siapa pun", () => {
    expect(planCommissionAccruals([{ outletId: "o1", amount: 500_000 }], [])).toHaveLength(0);
  });
});

describe("planCommissionAccruals — faktur gabungan multi-outlet", () => {
  // Inilah kasus yang dulu menghasilkan NOL komisi: satu faktur "group_renewal" mencakup tiga
  // cabang, ditolak mentah-mentah karena tipenya bukan "subscription_fee".
  const lines = [
    { outletId: "o1", amount: 500_000 },
    { outletId: "o2", amount: 300_000 },
    { outletId: "o3", amount: 200_000 },
  ];

  it("membayar tiap partner hanya atas cabang yang dia ajak, bukan total faktur", () => {
    const hasil = planCommissionAccruals(lines, [
      link({ outletId: "o1", referralPartnerId: "partner-X", commissionPercent: 20 }),
      link({ outletId: "o2", referralPartnerId: "partner-Y", commissionPercent: 35 }),
      // o3 tidak diajak siapa pun.
    ]);

    expect(hasil).toHaveLength(2);
    const x = hasil.find((h) => h.referralPartnerId === "partner-X")!;
    const y = hasil.find((h) => h.referralPartnerId === "partner-Y")!;

    // 20% dari 500.000 — BUKAN dari total faktur 1.000.000.
    expect(x.amount).toBe(100_000);
    expect(x.sourceInvoiceAmount).toBe(500_000);
    // 35% dari 300.000, memakai persentase partner Y sendiri.
    expect(y.amount).toBe(105_000);
    expect(y.sourceInvoiceAmount).toBe(300_000);
  });

  it("satu outlet tanpa pengajak tidak menggugurkan hak outlet lain di faktur yang sama", () => {
    const hasil = planCommissionAccruals(lines, [link({ outletId: "o3", commissionPercent: 20 })]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].outletId).toBe("o3");
    expect(hasil[0].amount).toBe(40_000);
  });

  it("dua cabang yang diajak partner yang SAMA menghasilkan dua baris terpisah", () => {
    // Harus tetap dua baris, bukan digabung — batasan unik di skema adalah
    // (sourceInvoiceId, referralConversionId), dan tiap cabang punya conversion sendiri.
    const hasil = planCommissionAccruals(lines, [
      link({ outletId: "o1", referralPartnerId: "partner-X", referralConversionId: "conv-1" }),
      link({ outletId: "o2", referralPartnerId: "partner-X", referralConversionId: "conv-2" }),
    ]);

    expect(hasil).toHaveLength(2);
    expect(hasil.reduce((s, h) => s + h.amount, 0)).toBe(160_000); // 20% dari 800.000
  });

  it("beberapa baris untuk outlet yang sama digabung jadi satu komisi", () => {
    // Satu faktur gabungan bisa memuat paket + tambahan untuk cabang yang sama. Kalau tidak
    // digabung, baris kedua akan ditolak database karena melanggar batasan unik.
    const hasil = planCommissionAccruals(
      [
        { outletId: "o1", amount: 500_000 },
        { outletId: "o1", amount: 100_000 },
      ],
      [link({ outletId: "o1", commissionPercent: 20 })]
    );

    expect(hasil).toHaveLength(1);
    expect(hasil[0].sourceInvoiceAmount).toBe(600_000);
    expect(hasil[0].amount).toBe(120_000);
  });
});

describe("planCommissionAccruals — batas yang melindungi uang", () => {
  it("tidak menggandakan komisi kalau dipanggil ulang untuk faktur yang sama", () => {
    const links = [link({ outletId: "o1", referralConversionId: "conv-1" })];
    const sudahAda = new Set(["conv-1"]);

    expect(planCommissionAccruals([{ outletId: "o1", amount: 500_000 }], links, sudahAda)).toHaveLength(0);
  });

  it("outlet yang belum tercatat tetap bisa menyusul di panggilan berikutnya", () => {
    // Melindungi kasus panggilan pertama gagal separuh jalan: yang sudah tercatat dilewati, yang
    // belum tetap dikerjakan.
    const hasil = planCommissionAccruals(
      [
        { outletId: "o1", amount: 500_000 },
        { outletId: "o2", amount: 300_000 },
      ],
      [link({ outletId: "o1", referralConversionId: "conv-1" }), link({ outletId: "o2", referralConversionId: "conv-2" })],
      new Set(["conv-1"])
    );

    expect(hasil).toHaveLength(1);
    expect(hasil[0].outletId).toBe("o2");
  });

  it("partner yang dinonaktifkan tidak menerima komisi baru", () => {
    expect(planCommissionAccruals([{ outletId: "o1", amount: 500_000 }], [link({ outletId: "o1", partnerIsActive: false })])).toHaveLength(0);
  });

  it("faktur bernilai nol atau negatif tidak menghasilkan komisi", () => {
    expect(planCommissionAccruals([{ outletId: "o1", amount: 0 }], [link({ outletId: "o1" })])).toHaveLength(0);
    expect(planCommissionAccruals([{ outletId: "o1", amount: -100_000 }], [link({ outletId: "o1" })])).toHaveLength(0);
  });
});

describe("readInvoiceOutletLines", () => {
  it("membaca rincian per outlet dari faktur gabungan", () => {
    const lines = readInvoiceOutletLines({
      outletId: "anchor",
      amount: 1_000_000,
      lineItemsJson: JSON.stringify([
        { outletId: "o1", outletName: "Cabang A", amount: 600_000 },
        { outletId: "o2", outletName: "Cabang B", amount: 400_000 },
      ]),
    });

    expect(lines).toEqual([
      { outletId: "o1", amount: 600_000 },
      { outletId: "o2", amount: 400_000 },
    ]);
  });

  it("faktur satu outlet jatuh ke satu baris berisi seluruh nilainya", () => {
    expect(readInvoiceOutletLines({ outletId: "o1", amount: 500_000, lineItemsJson: null })).toEqual([{ outletId: "o1", amount: 500_000 }]);
  });

  it("JSON rusak tidak menggagalkan seluruh akrual, tapi mundur ke perlakuan satu outlet", () => {
    // Lebih baik membayar komisi atas data yang pasti benar (outletId dan amount di faktur itu
    // sendiri) daripada gagal total karena satu kolom teks tidak bisa diurai.
    expect(readInvoiceOutletLines({ outletId: "o1", amount: 500_000, lineItemsJson: "{bukan json" })).toEqual([{ outletId: "o1", amount: 500_000 }]);
  });

  it("lineItemsJson kosong juga mundur ke perlakuan satu outlet", () => {
    expect(readInvoiceOutletLines({ outletId: "o1", amount: 500_000, lineItemsJson: "[]" })).toEqual([{ outletId: "o1", amount: 500_000 }]);
  });
});
