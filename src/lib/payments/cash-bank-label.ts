import { coaAccountName } from "@/lib/accounting/coa-data";

/**
 * Label pilihan akun kas/bank beserta akun COA-nya, mis. "Kas Utama — 1112 Kas Kasir".
 *
 * Nama kas/bank bebas diganti pemilik, jadi nama saja sering menyesatkan: "Kas Utama" bawaan
 * setiap outlet sebenarnya terhubung ke 1112 Kas Kasir — laci kasir yang sama dengan pembayaran
 * tunai — bukan kas besar terpisah. Dengan kode + nama akun, pengguna tahu persis saldo mana yang
 * berkurang. `code`/`accountName` datang dari /api/cash-bank-accounts.
 */
export function cashBankOptionLabel(
  t: (key: string, fallback: string) => string,
  c: { name: string; code?: string | null; accountName?: string | null }
): string {
  if (!c.code) return c.name;
  const gl = coaAccountName(t, { code: c.code, name: c.accountName ?? "" });
  return gl && gl.toLowerCase() !== c.name.toLowerCase() ? `${c.name} — ${c.code} ${gl}` : `${c.name} (${c.code})`;
}
