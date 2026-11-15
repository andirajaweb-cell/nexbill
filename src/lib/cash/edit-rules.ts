import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Aturan murni untuk mengedit Setoran Kas & Pindah Kas (2026-11-15) — tanpa DB, diuji di
 * edit-rules.test.ts. Edit tidak pernah menimpa jurnal yang sudah diposting: jurnal lama dibatalkan
 * (voidJournal, tetap tersimpan untuk audit) lalu jurnal baru diposting dari angka yang dikoreksi.
 */

export type CashEditKind = "deposit" | "transfer";

export type CashEditField = "amount" | "date" | "source" | "destination" | "purpose" | "receiver" | "notes";

/**
 * Kolom yang dikunci bila transaksinya tertaut ke shift yang SUDAH DITUTUP. Kas yang diharapkan &
 * selisih shift itu sudah dihitung dan disimpan saat tutup shift (shifts.expectedCash/variance),
 * jadi apa pun yang mengubah uang di laci shift itu — jumlah, akun sumber (dan tujuan untuk Pindah
 * Kas, karena tujuan bisa laci itu sendiri), atau tanggal (memutus tautan shift) — akan membuat
 * hitungan shift tidak cocok lagi. Peruntukan/akun tujuan Setoran Kas, penerima, dan catatan tidak
 * menyentuh laci, jadi tetap boleh dikoreksi.
 */
export function lockedCashEditFields(kind: CashEditKind, shiftClosed: boolean): CashEditField[] {
  if (!shiftClosed) return [];
  return kind === "deposit" ? ["amount", "source", "date"] : ["amount", "source", "destination", "date"];
}

/** Tanggal kalender outlet (WIB) yang sama — jam berbeda di hari yang sama bukan "ganti tanggal". */
export function sameOutletDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  if (!Number.isFinite(da.getTime()) || !Number.isFinite(db.getTime())) return false;
  return outletDateYmd(da) === outletDateYmd(db);
}

export interface CashEditSnapshot {
  amount: number;
  createdAt: string;
  sourceCashBankAccountId: string;
  destinationCashBankAccountId: string | null;
  purposeType?: string | null;
  receivedByStaffUserId?: string | null;
  notes: string | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Kolom yang benar-benar berubah antara data lama dan data hasil edit. */
export function changedCashEditFields(before: CashEditSnapshot, after: CashEditSnapshot): CashEditField[] {
  const out: CashEditField[] = [];
  if (round(before.amount) !== round(after.amount)) out.push("amount");
  if (!sameOutletDay(before.createdAt, after.createdAt)) out.push("date");
  if (before.sourceCashBankAccountId !== after.sourceCashBankAccountId) out.push("source");
  if ((before.destinationCashBankAccountId ?? null) !== (after.destinationCashBankAccountId ?? null)) out.push("destination");
  if ((before.purposeType ?? null) !== (after.purposeType ?? null)) out.push("purpose");
  if ((before.receivedByStaffUserId ?? null) !== (after.receivedByStaffUserId ?? null)) out.push("receiver");
  if ((before.notes ?? null) !== (after.notes ?? null)) out.push("notes");
  return out;
}

const FIELD_LABEL: Record<CashEditField, string> = {
  amount: "jumlah",
  date: "tanggal",
  source: "akun sumber",
  destination: "akun tujuan",
  purpose: "peruntukan",
  receiver: "penerima",
  notes: "catatan",
};

/** Melempar pesan yang jelas bila ada kolom terkunci yang diubah. */
export function assertCashEditAllowed(changed: CashEditField[], locked: CashEditField[]): void {
  const blocked = changed.filter((f) => locked.includes(f));
  if (blocked.length === 0) return;
  throw new Error(
    `Shift transaksi ini sudah ditutup — ${blocked.map((f) => FIELD_LABEL[f]).join(", ")} tidak bisa diubah karena hitungan kas shift itu sudah final. Batalkan transaksinya lalu catat ulang bila memang perlu.`
  );
}

/**
 * Apakah jurnal harus dibatalkan & diposting ulang. Hanya catatan yang berubah → cukup perbarui
 * baris (catatan Setoran Kas tidak masuk jurnal). Untuk Pindah Kas catatan ikut di deskripsi jurnal,
 * tapi deskripsi saja tidak sepadan dengan jurnal pembalik — tetap cukup perbarui baris.
 */
export function needsRepost(changed: CashEditField[]): boolean {
  return changed.some((f) => f !== "notes");
}

/**
 * Tanggal jurnal pengganti. Tanggal yang sengaja diganti → tanggal baru (periode tutup buku
 * ditolak postJournal). Tanggal tetap → tanggal asli, kecuali periodenya sudah ditutup → hari ini
 * (pola yang sama dengan koreksi PPOB & persetujuan Pindah Kas).
 */
export function correctionEntryDate(opts: { dateChanged: boolean; newDate: string; originalDate: string; originalPeriodLocked: boolean; now?: Date }): string {
  if (opts.dateChanged) return opts.newDate;
  return opts.originalPeriodLocked ? (opts.now ?? new Date()).toISOString() : opts.originalDate;
}
