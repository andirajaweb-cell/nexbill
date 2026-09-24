import { db } from "@/db/client";
import { sql, and, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

/**
 * Nomor dokumen berikutnya (EXP-00001, INC-00001, BK-00001, …).
 *
 * MENGGANTIKAN pola lama `count(*) + 1` yang punya dua bug:
 *
 *  1. count(*) Postgres bertipe bigint, dan driver postgres-js mengembalikannya sebagai STRING.
 *     `"17" + 1` di JavaScript = "171", bukan 18. Itulah asal nomor seperti EXP-00171, EXP-00181
 *     di data produksi — urutannya meloncat dan tidak lagi mencerminkan jumlah dokumen.
 *  2. count(*) + 1 tidak aman terhadap penghapusan dan bisa bertabrakan dengan nomor yang sudah
 *     ada (mis. nomor lama "EXP-00021" yang terbentuk dari bug #1 akan ditabrak saat hitungan
 *     sampai 20). Kolom nomor ini UNIQUE, jadi tabrakan = simpan gagal.
 *
 * Cara baru: ambil angka TERBESAR yang sudah dipakai (dari akhiran digit nomornya) lalu +1. Tidak
 * pernah mundur, tidak pernah menabrak nomor yang ada, dan otomatis melanjutkan dari nomor lama
 * yang "loncat" (EXP-00181 → EXP-00182).
 *
 * `lingkup` (opsional) membatasi pencarian — mis. per outlet untuk nomor yang unik per outlet.
 * Untuk kolom yang UNIQUE secara GLOBAL (expense_number, income_number) JANGAN dibatasi per
 * outlet: dua outlet akan sama-sama mendapat EXP-00001 dan yang kedua gagal disimpan.
 *
 * Masih ada jendela balapan kecil bila dua permintaan berjalan di milidetik yang sama; kolom
 * UNIQUE akan menolak yang kedua (tidak ada data ganda), dan pemanggil boleh mencoba ulang.
 */
export async function nomorBerikutnya(tabel: PgTable, kolom: PgColumn, awalan: string, lingkup?: SQL, digit = 5): Promise<string> {
  const polaAwalan = sql`${kolom} like ${`${awalan}-%`}`;
  const [row] = await db
    .select({
      maks: sql<string | null>`max(nullif(regexp_replace(${kolom}, '[^0-9]', '', 'g'), '')::bigint)`,
    })
    .from(tabel)
    .where(lingkup ? and(polaAwalan, lingkup) : polaAwalan);
  const berikut = Number(row?.maks ?? 0) + 1; // Number(): bigint datang sebagai string — lihat bug #1 di atas
  return `${awalan}-${String(berikut).padStart(digit, "0")}`;
}
