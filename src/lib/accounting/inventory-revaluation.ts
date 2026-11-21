import { db, type DbOrTx } from "@/db/client";
import { getMappedAccountId } from "./account-mapping";
import { postJournal } from "./journal";

/**
 * Jurnal revaluasi Persediaan saat harga modal diubah MANUAL (form produk atau impor Excel) pada
 * outlet metode rata-rata (2026-11-21).
 *
 * Masalah yang ditutup: harga modal adalah harga yang dipakai untuk setiap penjualan (HPP) dan
 * setiap opname. Mengubahnya tanpa jurnal membuat "stok × harga modal" langsung berbeda dari saldo
 * Persediaan di Neraca — lalu setiap penjualan berikutnya mengkredit Persediaan dengan harga baru,
 * sehingga saldo buku terus menjauh dari stok (bisa sampai minus walau stok fisik masih ada).
 *
 * Lawan akunnya Koreksi Persediaan di ekuitas (mapping "opname_correction", bawaan 3400) — sama
 * dengan kebijakan stock opname & penyesuaian stok sejak 2026-11-11: koreksi nilai pencatatan tidak
 * masuk Laba Rugi.
 */
export async function postCostRevaluationJournal(
  input: { outletId: string; items: { name: string; delta: number }[]; reference: string; staffUserId?: string },
  dbc: DbOrTx = db
): Promise<string | null> {
  const items = input.items.filter((i) => Math.abs(i.delta) >= 0.01);
  const net = Math.round(items.reduce((s, i) => s + i.delta, 0) * 100) / 100;
  if (Math.abs(net) < 0.01) return null;

  const inventoryAccountId = await getMappedAccountId(input.outletId, "product", "inventory", "1161", dbc);
  const correctionAccountId = await getMappedAccountId(input.outletId, "product", "opname_correction", "3400", dbc);
  const amount = Math.abs(net);
  const up = net > 0;
  const names = items.slice(0, 3).map((i) => i.name).join(", ") + (items.length > 3 ? `, +${items.length - 3} lainnya` : "");
  const label = `Revaluasi harga modal: ${names}`;

  return postJournal(
    {
      outletId: input.outletId,
      reference: input.reference,
      description: label,
      sourceType: "inventory_adjustment",
      staffUserId: input.staffUserId,
      lines: [
        { accountId: up ? inventoryAccountId : correctionAccountId, debit: amount, credit: 0, description: up ? "Persediaan dinilai naik" : "Koreksi persediaan (revaluasi)" },
        { accountId: up ? correctionAccountId : inventoryAccountId, debit: 0, credit: amount, description: up ? "Koreksi persediaan (revaluasi)" : "Persediaan dinilai turun" },
      ],
    },
    dbc
  );
}
