import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { coaAccountNameForLang } from "./coa-data";
import type { ObAccount, ObLang } from "./opening-balance-sheet";

/** Sama dengan POST /api/accounting/opening-balance: Saldo Awal hanya untuk Owner/Superuser yang boleh jurnal manual. */
export function canMigrateOpeningBalance(role: string): boolean {
  return (role === "owner" || role === "superuser") && hasPermission(role as StaffRole, "post_manual_journal");
}

/** Akun outlet (hanya outlet sesi) untuk template/parse Saldo Awal, nama akun bawaan ikut bahasa template. */
export async function loadOutletAccounts(outletId: string, lang: ObLang): Promise<ObAccount[]> {
  const rows = await db
    .select({
      id: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      normalBalance: accounts.normalBalance,
      isPostingAllowed: accounts.isPostingAllowed,
      isActive: accounts.isActive,
    })
    .from(accounts)
    .where(and(eq(accounts.outletId, outletId)));
  return rows.map((r) => ({ ...r, name: coaAccountNameForLang(lang, r) }));
}
