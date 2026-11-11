/**
 * Navigasi halaman Accounting (2026-11-12): 14 tab datar dikelompokkan menjadi menu dua tingkat —
 * kelompok → sub-halaman — plus halaman Ringkasan. Murni (tanpa React), diuji di nav.test.ts.
 * Nama tab (nilai `tabs`) sengaja SAMA dengan nama lama karena dipakai sebagai kunci panduan
 * (TabGuide / page guide book) dan label terjemahan.
 */
export const ACCOUNTING_OVERVIEW = "Ringkasan" as const;

export const ACCOUNTING_GROUPS = [
  { id: "overview", tabs: [ACCOUNTING_OVERVIEW] },
  { id: "statements", tabs: ["Laba Rugi", "Neraca", "Arus Kas", "CALK (SAK EMKM)"] },
  { id: "ledger", tabs: ["Jurnal", "Neraca Saldo", "Chart of Accounts"] },
  { id: "arap", tabs: ["Piutang (AR)", "Hutang (AP)"] },
  { id: "control", tabs: ["Audit", "Rekonsiliasi", "Tutup Periode"] },
  { id: "setup", tabs: ["Account Mapping", "Migrasi Data"] },
] as const;

export type AccountingGroupId = (typeof ACCOUNTING_GROUPS)[number]["id"];
export type AccountingTab = (typeof ACCOUNTING_GROUPS)[number]["tabs"][number];

export const ACCOUNTING_TABS: AccountingTab[] = ACCOUNTING_GROUPS.flatMap((g) => [...g.tabs]);

const SLUGS: Record<AccountingTab, string> = {
  Ringkasan: "ringkasan",
  "Laba Rugi": "laba-rugi",
  Neraca: "neraca",
  "Arus Kas": "arus-kas",
  "CALK (SAK EMKM)": "calk",
  Jurnal: "jurnal",
  "Neraca Saldo": "neraca-saldo",
  "Chart of Accounts": "coa",
  "Piutang (AR)": "piutang",
  "Hutang (AP)": "hutang",
  Audit: "audit",
  Rekonsiliasi: "rekonsiliasi",
  "Tutup Periode": "tutup-periode",
  "Account Mapping": "mapping",
  "Migrasi Data": "migrasi",
};

export function accountingTabSlug(tab: AccountingTab): string {
  return SLUGS[tab];
}

/** `?tab=` → tab; null bila tidak dikenal. */
export function accountingTabFromSlug(slug: string | null | undefined): AccountingTab | null {
  if (!slug) return null;
  const s = slug.trim().toLowerCase();
  return (Object.keys(SLUGS) as AccountingTab[]).find((t) => SLUGS[t] === s) ?? null;
}

export function accountingGroupOf(tab: AccountingTab): AccountingGroupId {
  return ACCOUNTING_GROUPS.find((g) => (g.tabs as readonly string[]).includes(tab))!.id;
}

/** Kelompok & sub-halaman yang boleh dilihat (kelompok tanpa sub-halaman tersisa disembunyikan). */
export function visibleAccountingGroups(allowed: (tab: AccountingTab) => boolean): { id: AccountingGroupId; tabs: AccountingTab[] }[] {
  return ACCOUNTING_GROUPS.map((g) => ({ id: g.id, tabs: (g.tabs as readonly AccountingTab[]).filter(allowed) })).filter((g) => g.tabs.length > 0);
}

/** Periode pembanding: rentang sama panjang tepat sebelum `from`. */
export function previousPeriod(fromIso: string, toIso: string): { from: string; to: string } | null {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return { from: new Date(a - (b - a) - 1).toISOString(), to: new Date(a - 1).toISOString() };
}

/** Perubahan % terhadap pembanding; null bila pembanding 0 (tidak bermakna). */
export function deltaPct(now: number, before: number | null | undefined): number | null {
  if (before == null || !Number.isFinite(before) || Math.abs(before) < 0.5) return null;
  return Math.round(((now - before) / Math.abs(before)) * 1000) / 10;
}

export interface BalanceRow {
  code: string;
  balance: number;
  isPostingAllowed?: boolean | null;
}

/** Komposisi aset untuk Ringkasan — dari akun posting (header dilewati supaya tidak dobel). */
export function assetComposition(assets: BalanceRow[]) {
  const sum = (prefixes: string[]) =>
    assets.filter((r) => r.isPostingAllowed !== false && prefixes.some((p) => r.code.startsWith(p))).reduce((s, r) => s + r.balance, 0);
  const cash = sum(["111", "112", "113"]);
  const receivables = sum(["114", "115"]);
  const inventory = sum(["116"]);
  const fixed = sum(["12"]);
  const total = assets.filter((r) => r.isPostingAllowed !== false).reduce((s, r) => s + r.balance, 0);
  return { cash, receivables, inventory, fixed, other: total - cash - receivables - inventory - fixed, total };
}
