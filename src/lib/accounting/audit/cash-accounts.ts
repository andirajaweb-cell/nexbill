import { db } from "@/db/client";
import { and, eq, inArray, sql } from "drizzle-orm";
import { accountMappings, accounts, cashBankAccounts, depositBalanceChannels, journalEntries, journalLines, orders, paymentMethods, payments, ppobTransactions } from "@/db/schema";
import { excludeCancelledPairs } from "../reports";
import { DEFAULT_MAPPING_SEED } from "../account-mapping";

/*
 * Audit "Kas & Bank ↔ Chart of Accounts".
 *
 * Setiap rupiah yang diterima atau dikeluarkan kasir mendarat di sebuah akun COA kas/bank lewat dua
 * jalur: (1) METODE PEMBAYARAN pelanggan (tunai, QRIS, transfer, e-wallet) → Account Mapping modul
 * payment → akun COA; (2) SUMBER DANA yang dipilih manual (expense, belanja, PPOB, setoran, aset) →
 * baris Kas/Bank (cash_bank_accounts: "Kas Utama", "Rekening Bank Utama", "QRIS", "Saldo Deposit
 * Fastpay (PPOB)", ...) → akun COA yang ditautkan.
 *
 * Kalau salah satu jalur menunjuk golongan akun yang keliru — mis. QRIS ke 1112 Kas Kasir, atau
 * "Kas Utama" ke akun bank — saldo di Neraca tidak lagi sama dengan uang sebenarnya dan cek shift
 * selalu selisih, tanpa satu pun error. Pemeriksaan di sini mencocokkan ketiganya (baris Kas/Bank,
 * metode pembayaran, dan transaksi yang benar-benar sudah dibukukan) terhadap golongan COA.
 *
 * Golongan akun kas/bank (DEFAULT_COA):
 *   111x Kas (laci kasir 1112, kas di tangan, kas kecil)   — satu-satunya golongan "tunai"
 *   112x Bank (rekening, EDC)
 *   113x Pembayaran digital (QRIS 1131, GoPay, OVO, DANA, ShopeePay, BukuPay)
 *   115x Saldo/Deposit provider PPOB (1151)
 */

export type CashFamily = "kas" | "bank" | "digital" | "deposit" | "other";
export const FAMILY_LABEL: Record<CashFamily, string> = {
  kas: "Kas (111x)",
  bank: "Bank (112x)",
  digital: "Pembayaran digital/QRIS (113x)",
  deposit: "Saldo deposit PPOB (115x)",
  other: "bukan akun kas/bank",
};

export function cashFamily(code: string | null | undefined): CashFamily {
  if (!code) return "other";
  if (code.startsWith("111")) return "kas";
  if (code.startsWith("112")) return "bank";
  if (code.startsWith("113")) return "digital";
  if (code.startsWith("115")) return "deposit";
  return "other";
}

/** Golongan yang wajar untuk sebuah metode pembayaran pelanggan. */
export function expectedFamiliesForMethod(method: string): CashFamily[] {
  const m = method.toLowerCase();
  if (m === "cash") return ["kas"];
  if (m === "transfer" || m === "bank" || m === "card" || m.startsWith("ipaymu_va")) return ["bank"];
  if (m === "qris" || m === "ipaymu_qris" || m === "fastpay_h2h" || ["gopay", "dana", "ovo", "shopeepay", "bukupay", "linkaja"].includes(m)) return ["digital", "bank"];
  return ["bank", "digital"];
}

/** Petunjuk golongan dari NAMA baris Kas/Bank — hanya untuk peringatan, nama bebas diganti. */
export function familyHintFromName(name: string): CashFamily | null {
  const n = name.toLowerCase();
  if (/fastpay|ppob|deposit/.test(n)) return "deposit";
  if (/qris|gopay|ovo|dana|shopee|bukupay|e-?wallet/.test(n)) return "digital";
  if (/\bbank\b|rekening|\bbca\b|\bbri\b|\bbni\b|mandiri|edc/.test(n)) return "bank";
  if (/\bkas\b|tunai|cash|laci/.test(n)) return "kas";
  return null;
}

// Source types that may legitimately touch each family. Anything else is flagged for review.
const SOURCES_OK_FOR_DEPOSIT = new Set(["ppob", "cash_deposit", "cash_transfer", "opening_balance", "manual", "historical_import"]);
const CUSTOMER_MONEY_IN = new Set(["rental", "pos", "receivable_payment", "other_income", "membership_fee", "home_rental"]);

export const SOURCE_LABEL: Record<string, string> = {
  rental: "Penjualan rental",
  pos: "Penjualan kasir",
  receivable_payment: "Pelunasan piutang",
  refund: "Refund",
  other_income: "Pendapatan lain-lain",
  membership_fee: "Iuran membership",
  home_rental: "Home rental",
  ppob: "PPOB",
  expense: "Pengeluaran",
  purchase_invoice: "Belanja supplier",
  purchase_payment: "Bayar supplier",
  purchase_return: "Retur pembelian",
  asset_purchase: "Pembelian aset",
  asset_purchase_payment: "Bayar utang aset",
  asset_disposal: "Pelepasan aset",
  cash_deposit: "Setoran/tarikan kas",
  cash_transfer: "Pindah kas",
  opening_balance: "Saldo awal",
  manual: "Jurnal manual",
  historical_import: "Impor historis",
};

export interface CashIssue {
  severity: "error" | "warning";
  label: string;
  detail: string;
  amount?: number;
}

export interface CashMapRow {
  cashBankAccountId: string | null;
  name: string;
  kind: "cash" | "bank" | null;
  isDefault: boolean;
  accountCode: string | null;
  accountName: string | null;
  family: CashFamily;
  methods: string[];
  balance: number;
  totalIn: number;
  totalOut: number;
  bySource: { source: string; label: string; in: number; out: number }[];
}

export async function auditCashBankAccounts(outletId: string): Promise<{ issues: CashIssue[]; map: CashMapRow[] }> {
  const issues: CashIssue[] = [];
  const [accRows, cbRows, mappings, methods, channels] = await Promise.all([
    db.select({ id: accounts.id, outletId: accounts.outletId, code: accounts.code, name: accounts.name, type: accounts.type, postable: accounts.isPostingAllowed }).from(accounts).where(eq(accounts.outletId, outletId)),
    db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId)),
    db.select().from(accountMappings).where(and(eq(accountMappings.outletId, outletId), eq(accountMappings.module, "payment"), eq(accountMappings.isActive, true))),
    db.select({ key: paymentMethods.key, label: paymentMethods.label }).from(paymentMethods).where(and(eq(paymentMethods.outletId, outletId), eq(paymentMethods.isActive, true))),
    db.select().from(depositBalanceChannels).where(eq(depositBalanceChannels.outletId, outletId)),
  ]);
  const accById = new Map(accRows.map((a) => [a.id, a]));
  const accByCode = new Map(accRows.map((a) => [a.code, a]));
  const accLabel = (id: string | null | undefined) => {
    const a = id ? accById.get(id) : undefined;
    return a ? `${a.code} ${a.name}` : "(akun tidak ditemukan)";
  };

  // ---------- 1. Baris Kas/Bank ↔ akun COA
  const cbByAccount = new Map<string, typeof cbRows>();
  for (const cb of cbRows) {
    const a = accById.get(cb.accountId);
    const where = `Kas/Bank "${cb.name}" → ${accLabel(cb.accountId)}`;
    cbByAccount.set(cb.accountId, [...(cbByAccount.get(cb.accountId) ?? []), cb]);
    if (!a) {
      issues.push({ severity: "error", label: where, detail: "Akun COA yang ditautkan tidak ada / milik outlet lain. Transaksi dari sumber ini akan gagal dibukukan." });
      continue;
    }
    if (!a.postable) issues.push({ severity: "error", label: where, detail: "Ditautkan ke akun induk (header) — tidak bisa menerima jurnal. Tautkan ke akun turunannya." });
    const fam = cashFamily(a.code);
    if (a.type !== "asset" || fam === "other") {
      issues.push({ severity: "error", label: where, detail: `Akun ${a.code} bukan akun kas/bank (harus 111x kas, 112x bank, 113x digital, atau 115x deposit). Saldo uang ini tidak akan terlihat sebagai kas di Neraca/Arus Kas.` });
      continue;
    }
    if (cb.type === "cash" && fam !== "kas") {
      issues.push({ severity: "error", label: where, detail: `Bertipe TUNAI tapi ditautkan ke ${FAMILY_LABEL[fam]}. Tutup shift menghitungnya sebagai uang laci kasir, sementara buku besar mencatatnya sebagai ${FAMILY_LABEL[fam]} — selisih kas shift tidak bisa dijelaskan.` });
    }
    if (cb.type === "bank" && fam === "kas") {
      issues.push({ severity: "warning", label: where, detail: "Bertipe BANK tapi ditautkan ke akun Kas (111x). Pengeluaran tunai dari sini tidak ikut dihitung sebagai kas keluar shift." });
    }
    const hint = familyHintFromName(cb.name);
    if (hint && hint !== fam) {
      issues.push({ severity: "warning", label: where, detail: `Namanya menunjukkan ${FAMILY_LABEL[hint]}, tapi akun COA-nya ${FAMILY_LABEL[fam]}. Periksa apakah tautannya benar, atau ganti namanya agar tidak menyesatkan.` });
    }
  }
  for (const [accountId, rows] of cbByAccount) {
    if (rows.length > 1) {
      issues.push({ severity: "warning", label: `${rows.map((r) => `"${r.name}"`).join(" & ")} → ${accLabel(accountId)}`, detail: "Beberapa baris Kas/Bank memakai satu akun COA yang sama — saldonya tercampur dan tidak bisa dicek terpisah." });
    }
  }
  const defaultCash = cbRows.find((c) => c.type === "cash" && c.isDefault) ?? cbRows.find((c) => c.type === "cash");
  if (!defaultCash) issues.push({ severity: "warning", label: "Kas laci kasir", detail: "Belum ada baris Kas/Bank bertipe tunai. Cash Out Cepat di Expense dan hitungan kas shift butuh satu akun kas (1112 Kas Kasir)." });

  // ---------- 2. Metode pembayaran pelanggan → akun COA
  const methodKeys = new Set<string>(["cash", "qris", "transfer", "card", "gopay", "dana", "bukupay"]);
  for (const m of methods) methodKeys.add(m.key.toLowerCase());
  const usedMethods = await db
    .selectDistinct({ method: payments.method })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(and(eq(orders.outletId, outletId), eq(payments.status, "success")));
  for (const r of usedMethods) if (r.method) methodKeys.add(String(r.method).toLowerCase());
  const mappingByKey = new Map(mappings.map((m) => [m.transactionKey.toLowerCase(), m]));
  const seedByKey = new Map(DEFAULT_MAPPING_SEED.filter((s) => s.module === "payment").map((s) => [s.transactionKey, s.accountCode]));
  const FALLBACK: Record<string, string> = { cash: "1112", qris: "1131", gopay: "1132", dana: "1134", bukupay: "1136", card: "1125", transfer: "1121", bank: "1121" };
  const methodAccount = new Map<string, string | null>();
  for (const key of methodKeys) {
    const mapped = mappingByKey.get(key);
    const accountId = mapped?.accountId ?? accByCode.get(seedByKey.get(key) ?? FALLBACK[key] ?? "1121")?.id ?? null;
    methodAccount.set(key, accountId);
    const a = accountId ? accById.get(accountId) : undefined;
    const label = methods.find((m) => m.key.toLowerCase() === key)?.label ?? key;
    const where = `Metode "${label}" → ${accLabel(accountId)}${mapped ? "" : " (akun bawaan)"}`;
    if (!a) {
      issues.push({ severity: "error", label: where, detail: "Akun tujuan tidak ada di COA outlet ini — pembayaran dengan metode ini gagal dibukukan." });
      continue;
    }
    const fam = cashFamily(a.code);
    const expected = expectedFamiliesForMethod(key);
    if (fam === "other" || a.type !== "asset") {
      issues.push({ severity: "error", label: where, detail: "Uang pelanggan diarahkan ke akun yang bukan kas/bank. Perbaiki di Account Mapping (modul payment)." });
    } else if (key === "cash" && fam !== "kas") {
      issues.push({ severity: "error", label: where, detail: "Pembayaran TUNAI harus masuk akun Kas (111x, bawaannya 1112 Kas Kasir) — kalau tidak, saldo laci kasir di buku besar tidak pernah cocok dengan hitungan shift." });
    } else if (key !== "cash" && fam === "kas") {
      issues.push({ severity: "error", label: where, detail: "Pembayaran NON-TUNAI masuk akun Kas — saldo Kas Kasir di buku besar jadi lebih besar dari uang di laci. Arahkan ke akun bank/QRIS/e-wallet." });
    } else if (fam === "deposit") {
      issues.push({ severity: "error", label: where, detail: "Uang pelanggan diarahkan ke saldo deposit PPOB (115x). Saldo deposit hanya berubah karena top-up dan transaksi PPOB." });
    } else if (!expected.includes(fam)) {
      issues.push({ severity: "warning", label: where, detail: `Biasanya metode ini masuk ${expected.map((f) => FAMILY_LABEL[f]).join(" atau ")}, bukan ${FAMILY_LABEL[fam]}.` });
    }
  }

  // ---------- 3. Transaksi yang sudah dibukukan ke akun kas/bank
  const cashAccIds = accRows.filter((a) => a.type === "asset" && cashFamily(a.code) !== "other").map((a) => a.id);
  const flows = cashAccIds.length
    ? await db
        .select({
          accountId: journalLines.accountId,
          source: journalEntries.sourceType,
          debit: sql<number>`coalesce(sum(${journalLines.debit}), 0)`,
          credit: sql<number>`coalesce(sum(${journalLines.credit}), 0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(and(eq(journalEntries.outletId, outletId), inArray(journalLines.accountId, cashAccIds), excludeCancelledPairs(outletId)))
        .groupBy(journalLines.accountId, journalEntries.sourceType)
    : [];

  const depositAccountIds = new Set([...channels.map((c) => c.accountId), ...accRows.filter((a) => cashFamily(a.code) === "deposit").map((a) => a.id)]);
  for (const f of flows) {
    const a = accById.get(f.accountId)!;
    const fam = cashFamily(a.code);
    const debit = Number(f.debit);
    const credit = Number(f.credit);
    const src = SOURCE_LABEL[f.source] ?? f.source;
    if ((fam === "deposit" || depositAccountIds.has(a.id)) && !SOURCES_OK_FOR_DEPOSIT.has(f.source)) {
      issues.push({
        severity: CUSTOMER_MONEY_IN.has(f.source) && debit > 0 ? "error" : "warning",
        label: `${a.code} ${a.name} ← ${src}`,
        detail: `Saldo deposit PPOB tersentuh transaksi "${src}" (masuk ${rpPlain(debit)}, keluar ${rpPlain(credit)}). Saldo deposit seharusnya hanya berubah karena top-up/setoran dan transaksi PPOB — periksa sumber dana yang dipilih.`,
        amount: debit + credit,
      });
    }
    if (fam === "digital" && (f.source === "expense" || f.source === "purchase_payment" || f.source === "purchase_invoice") && credit > 0) {
      issues.push({
        severity: "warning",
        label: `${a.code} ${a.name} → ${src}`,
        detail: `Pengeluaran dibayar dari akun QRIS/e-wallet (${rpPlain(credit)}). Dana QRIS biasanya dicairkan ke rekening bank; kalau memang dibayar dari rekening, pilih Rekening Bank sebagai sumber dana.`,
        amount: credit,
      });
    }
    if (!cbByAccount.has(a.id) && (debit !== 0 || credit !== 0)) {
      issues.push({
        severity: "warning",
        label: `${a.code} ${a.name} ← ${src}`,
        detail: "Akun kas/bank ini punya transaksi tapi tidak terdaftar sebagai Kas/Bank — tidak muncul di pilihan sumber dana maupun cek saldo shift. Daftarkan di halaman Pembayaran bila memang dipakai.",
        amount: debit - credit,
      });
    }
  }

  // ---------- 4. PPOB: sumber dana harus deposit, penerima tidak boleh deposit
  const ppob = await db
    .select({ id: ppobTransactions.id, product: ppobTransactions.product, funding: ppobTransactions.fundingCashBankAccountId, receiving: ppobTransactions.receivingCashBankAccountId, status: ppobTransactions.status, nominal: ppobTransactions.nominal })
    .from(ppobTransactions)
    .where(and(eq(ppobTransactions.outletId, outletId), eq(ppobTransactions.status, "success")));
  const cbById = new Map(cbRows.map((c) => [c.id, c]));
  const badFunding = new Map<string, { n: number; amount: number }>();
  const badReceiving = new Map<string, { n: number; amount: number }>();
  for (const t of ppob) {
    const f = t.funding ? cbById.get(t.funding) : undefined;
    const r = t.receiving ? cbById.get(t.receiving) : undefined;
    const fAcc = f ? accById.get(f.accountId) : undefined;
    const rAcc = r ? accById.get(r.accountId) : undefined;
    if (f && fAcc && !(depositAccountIds.has(fAcc.id) || cashFamily(fAcc.code) === "deposit")) {
      const k = `${f.name} (${fAcc.code})`;
      badFunding.set(k, { n: (badFunding.get(k)?.n ?? 0) + 1, amount: (badFunding.get(k)?.amount ?? 0) + (t.nominal ?? 0) });
    }
    if (r && rAcc && (depositAccountIds.has(rAcc.id) || cashFamily(rAcc.code) === "deposit")) {
      const k = `${r.name} (${rAcc.code})`;
      badReceiving.set(k, { n: (badReceiving.get(k)?.n ?? 0) + 1, amount: (badReceiving.get(k)?.amount ?? 0) + (t.nominal ?? 0) });
    }
  }
  for (const [k, v] of badFunding) {
    issues.push({ severity: "warning", label: `PPOB: sumber dana "${k}"`, detail: `${v.n} transaksi PPOB mengambil modal dari akun yang bukan saldo deposit — saldo Fastpay di buku tidak berkurang, sedangkan ${k} berkurang. Pastikan memang dibayar dari sana.`, amount: v.amount });
  }
  for (const [k, v] of badReceiving) {
    issues.push({ severity: "error", label: `PPOB: uang pelanggan masuk "${k}"`, detail: `${v.n} transaksi PPOB mencatat uang dari pelanggan ke saldo deposit. Uang pelanggan masuk ke laci kasir/QRIS; deposit justru berkurang.`, amount: v.amount });
  }

  // ---------- Peta Kas/Bank ↔ COA
  const methodsByAccount = new Map<string, string[]>();
  for (const [key, accountId] of methodAccount) {
    if (!accountId) continue;
    const label = methods.find((m) => m.key.toLowerCase() === key)?.label ?? key;
    methodsByAccount.set(accountId, [...(methodsByAccount.get(accountId) ?? []), label]);
  }
  const flowByAccount = new Map<string, typeof flows>();
  for (const f of flows) flowByAccount.set(f.accountId, [...(flowByAccount.get(f.accountId) ?? []), f]);
  const buildRow = (accountId: string, cb?: (typeof cbRows)[number]): CashMapRow => {
    const a = accById.get(accountId);
    const fl = flowByAccount.get(accountId) ?? [];
    const totalIn = fl.reduce((s, f) => s + Number(f.debit), 0);
    const totalOut = fl.reduce((s, f) => s + Number(f.credit), 0);
    return {
      cashBankAccountId: cb?.id ?? null,
      name: cb?.name ?? "(tidak terdaftar di Kas/Bank)",
      kind: cb?.type ?? null,
      isDefault: Boolean(cb?.isDefault),
      accountCode: a?.code ?? null,
      accountName: a?.name ?? null,
      family: cashFamily(a?.code),
      methods: methodsByAccount.get(accountId) ?? [],
      balance: totalIn - totalOut,
      totalIn,
      totalOut,
      bySource: fl
        .map((f) => ({ source: f.source, label: SOURCE_LABEL[f.source] ?? f.source, in: Number(f.debit), out: Number(f.credit) }))
        .sort((x, y) => y.in + y.out - (x.in + x.out)),
    };
  };
  const map: CashMapRow[] = cbRows.map((cb) => buildRow(cb.accountId, cb));
  for (const accountId of flowByAccount.keys()) if (!cbByAccount.has(accountId)) map.push(buildRow(accountId));
  map.sort((a, b) => (a.accountCode ?? "").localeCompare(b.accountCode ?? ""));

  return { issues, map };
}

const rpPlain = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
