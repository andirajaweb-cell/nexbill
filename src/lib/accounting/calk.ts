import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { fixedAssets, outlets } from "@/db/schema";
import { computeBalanceSheet, computeProfitLoss, type TrialBalanceTreeRow } from "./reports";
import { checkIncomeTax } from "./audit/prudence";

/**
 * Catatan atas Laporan Keuangan (CALK) — wajib menurut SAK EMKM (bersama Laporan Posisi Keuangan
 * dan Laporan Laba Rugi). Disusun otomatis dari data outlet: pernyataan kepatuhan, dasar
 * penyusunan, kebijakan akuntansi yang BENAR-BENAR dipakai aplikasi ini, dan rincian pos-pos
 * laporan. Kalimat kebijakan di sini harus tetap sesuai dengan cara kerja kode — bila perlakuan
 * akuntansinya berubah (mis. metode persediaan), teks ini ikut diubah.
 */

export interface CalkGroup {
  code: string;
  name: string;
  total: number;
  lines: { code: string; name: string; amount: number }[];
}

export interface Calk {
  entity: { name: string; address: string | null; entityType: string | null; businessType: string | null; npwp: string | null };
  period: { from?: string; to?: string; asOf?: string };
  compliance: string;
  basis: string[];
  policies: { title: string; text: string }[];
  balanceSheet: { assets: CalkGroup[]; liabilities: CalkGroup[]; equity: CalkGroup[]; totalAssets: number; totalLiabilities: number; totalEquity: number; currentProfit: number };
  profitLoss: { revenue: CalkGroup[]; expense: CalkGroup[]; totalRevenue: number; totalExpense: number; netProfit: number };
  fixedAssets: { name: string; acquisitionDate: string; cost: number; accumulated: number; bookValue: number; usefulLifeMonths: number }[];
  incomeTax: { year: string; grossRevenue: number; pphFinalEstimate: number; taxExpensePosted: number };
}

/** Groups a flattened COA tree by its second-level headers (e.g. "CURRENT ASSETS" → Kas, Bank, Piutang…), keeping only posting accounts with a balance. */
function groupTree(tree: TrialBalanceTreeRow[]): CalkGroup[] {
  const groups: CalkGroup[] = [];
  let current: CalkGroup | null = null;
  for (const r of tree) {
    if (!r.isPostingAllowed && r.depth <= 1) {
      if (r.depth === 1 || !current) {
        current = { code: r.code, name: r.name, total: r.balance, lines: [] };
        groups.push(current);
      }
      continue;
    }
    if (r.isPostingAllowed && Math.abs(r.balance) >= 0.5) {
      if (!current) {
        current = { code: r.code, name: r.name, total: 0, lines: [] };
        groups.push(current);
      }
      current.lines.push({ code: r.code, name: r.name, amount: r.balance });
    }
  }
  return groups.filter((g) => g.lines.length > 0).map((g) => ({ ...g, total: g.lines.reduce((s, l) => s + l.amount, 0) }));
}

export async function buildCalk(outletId: string, from?: string, to?: string): Promise<Calk> {
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const bs = await computeBalanceSheet(outletId, to);
  const pl = await computeProfitLoss(outletId, from, to);
  const assets = await db.select().from(fixedAssets).where(eq(fixedAssets.outletId, outletId));
  const tax = await checkIncomeTax(outletId);

  const equityGroups = groupTree(bs.equityTree);
  equityGroups.push({ code: "—", name: "Laba (rugi) berjalan belum ditutup ke ekuitas", total: bs.currentPeriodNetProfit, lines: [{ code: "—", name: "Laba (rugi) sampai tanggal laporan", amount: bs.currentPeriodNetProfit }] });

  return {
    entity: {
      name: outlet?.taxpayerName || outlet?.name || "-",
      address: outlet?.taxpayerAddress || outlet?.address || null,
      entityType: outlet?.businessEntityType ?? null,
      businessType: outlet?.businessType ?? null,
      npwp: outlet?.hasNpwp && outlet?.npwpNumber ? outlet.npwpNumber : null,
    },
    period: { from, to, asOf: to },
    compliance:
      "Laporan keuangan entitas disusun sesuai dengan Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM) yang diterbitkan oleh Dewan Standar Akuntansi Keuangan Ikatan Akuntan Indonesia.",
    basis: [
      "Dasar pengukuran: biaya historis.",
      "Dasar pencatatan: akrual — pendapatan diakui saat hak atas pembayaran timbul dan beban diakui saat terjadi, bukan saat kas diterima/dibayar.",
      "Mata uang penyajian: Rupiah (Rp).",
      "Asumsi dasar: entitas bisnis (transaksi pemilik dicatat terpisah melalui akun Prive/Modal) dan kelangsungan usaha.",
      "Laporan terdiri atas Laporan Posisi Keuangan, Laporan Laba Rugi, dan Catatan atas Laporan Keuangan ini; Laporan Arus Kas disajikan sebagai informasi tambahan.",
    ],
    policies: [
      { title: "Kas dan setara kas", text: "Meliputi kas di laci kasir, kas besar/kecil, saldo rekening bank, dan saldo e-wallet/QRIS milik entitas. Setiap penerimaan dan pengeluaran dicatat per transaksi dan dicocokkan dengan hitung fisik saat tutup shift." },
      { title: "Piutang usaha", text: "Diakui sebesar sisa tagihan pelanggan yang belum dibayar pada saat transaksi selesai. Piutang yang diperkirakan tidak tertagih dihapus dan diakui sebagai beban." },
      { title: "Persediaan", text: "Diukur pada biaya perolehan dengan metode rata-rata tertimbang. Biaya perolehan meliputi harga beli ditambah ongkos angkut/parkir/biaya lain yang dibebankan pada pembelian. Selisih hasil stock opname dan barang rusak diakui sebagai beban pada periode terjadinya." },
      { title: "Aset tetap", text: "Diakui sebesar biaya perolehan dan disusutkan dengan metode garis lurus selama umur manfaat masing-masing aset hingga nilai residunya. Keuntungan/kerugian pelepasan aset diakui dalam laba rugi." },
      { title: "Uang muka pelanggan (DP)", text: "Pembayaran di muka atas sewa yang belum dijalani diakui sebagai liabilitas (Deposit Pelanggan) dan dipindahkan ke pendapatan saat sewa selesai." },
      { title: "Pengakuan pendapatan", text: "Pendapatan sewa diakui saat sesi sewa selesai dan tagihannya final; penjualan barang diakui saat barang diserahkan. Diskon disajikan sebagai pengurang pendapatan. Biaya layanan metode pembayaran (MDR) diakui sebagai beban." },
      { title: "Beban", text: "Diakui saat terjadi berdasarkan asas akrual. Harga pokok penjualan diakui bersamaan dengan pendapatan penjualan barangnya." },
      {
        title: "Pajak penghasilan",
        text: "Beban pajak penghasilan disajikan pada pos Beban Pajak Penghasilan. Bagi entitas yang memenuhi syarat PP 55/2022, PPh Final UMKM sebesar 0,5% dari peredaran bruto; wajib pajak orang pribadi tidak dikenai atas peredaran bruto sampai dengan Rp500 juta dalam satu tahun pajak.",
      },
    ],
    balanceSheet: {
      assets: groupTree(bs.assetsTree),
      liabilities: groupTree(bs.liabilitiesTree),
      equity: equityGroups,
      totalAssets: bs.totalAssets,
      totalLiabilities: bs.totalLiabilities,
      totalEquity: bs.totalEquityWithRetainedEarnings,
      currentProfit: bs.currentPeriodNetProfit,
    },
    profitLoss: {
      revenue: groupTree(pl.revenueTree),
      expense: groupTree(pl.expenseTree),
      totalRevenue: pl.totalRevenue,
      totalExpense: pl.totalExpense,
      netProfit: pl.netProfit,
    },
    fixedAssets: assets
      .filter((a) => a.status !== "disposed")
      .map((a) => ({
        name: a.name,
        acquisitionDate: a.acquisitionDate,
        cost: a.acquisitionCost,
        accumulated: a.accumulatedDepreciation,
        bookValue: a.acquisitionCost - a.accumulatedDepreciation,
        usefulLifeMonths: a.usefulLifeMonths,
      })),
    incomeTax: tax,
  };
}
