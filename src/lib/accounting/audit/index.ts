import { db } from "@/db/client";
import { eq, sql } from "drizzle-orm";
import { voidJournal, postJournal } from "../journal";
import { resyncOrderJournal } from "../reconciliation-resync";
import { getMappedAccountId } from "../account-mapping";
import { logAudit } from "@/lib/audit/log";
import { journalEntries } from "@/db/schema";
import {
  auditCashPostings,
  findDuplicateJournals,
  findOverpaidPurchaseInvoices,
  findReceivableGaps,
  findRevivedChains,
  findUnbalancedJournals,
  findIsolationBreaches,
  planReversalLinks,
} from "./integrity";
import {
  checkIncomeTax,
  checkInventoryValuation,
  countPendingShiftReviews,
  findAgedReceivables,
  findContraBalances,
  findProductsSoldWithoutCost,
  findUnclosedPastPeriods,
} from "./prudence";

export * from "./integrity";
export * from "./prudence";
export * from "./mapping";
import { checkAccountMappings } from "./mapping";
import { auditCashBankAccounts } from "./cash-accounts";
export * from "./cash-accounts";

/*
 * Audit Accounting (tab "Audit") — pemeriksaan mandiri pembukuan outlet dengan prinsip
 * kehati-hatian. Setiap pemeriksaan menjelaskan APA yang dicek, KENAPA penting, dan — bila bisa
 * diperbaiki dengan aman — menawarkan perbaikan yang selalu berupa jurnal pembalik/koreksi yang
 * tercatat (tidak pernah menghapus riwayat), dan dicatat di log audit.
 */

export type AuditCode =
  | "duplicate_journals"
  | "unbalanced_journals"
  | "revived_cancellations"
  | "unlinked_reversals"
  | "stale_receivables"
  | "cash_sources"
  | "account_mapping"
  | "cash_bank_accounts"
  | "outlet_isolation"
  | "inventory_valuation"
  | "contra_balances"
  | "aged_receivables"
  | "cost_missing"
  | "negative_stock"
  | "supplier_overpaid"
  | "shift_reviews"
  | "unclosed_periods"
  | "income_tax";

export interface AuditItem {
  label: string;
  detail?: string;
  amount?: number;
}

export interface AuditCheck {
  code: AuditCode;
  group: "integritas" | "kehati_hatian";
  title: string;
  why: string;
  status: "ok" | "warning" | "error";
  summary: string;
  count: number;
  amount?: number;
  items: AuditItem[];
  fix?: { label: string; confirm: string };
  /** Where to act manually when there's no automatic fix. */
  action?: { label: string; href: string };
}

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const cap = <T,>(xs: T[]) => xs.slice(0, 100);

export async function runAccountingAudit(outletId: string): Promise<AuditCheck[]> {
  const [dups, unbalanced, revived, links, gaps, cash, overpaid, contra, inventory, aged, noCost, reviews, periods, tax, mapping, isolation, cashBank] = await Promise.all([
    findDuplicateJournals(outletId),
    findUnbalancedJournals(outletId),
    findRevivedChains(outletId),
    planReversalLinks(outletId),
    findReceivableGaps(outletId),
    auditCashPostings(outletId),
    findOverpaidPurchaseInvoices(outletId),
    findContraBalances(outletId),
    checkInventoryValuation(outletId),
    findAgedReceivables(outletId),
    findProductsSoldWithoutCost(outletId),
    countPendingShiftReviews(outletId),
    findUnclosedPastPeriods(outletId),
    checkIncomeTax(outletId),
    checkAccountMappings(outletId),
    findIsolationBreaches(outletId),
    auditCashBankAccounts(outletId),
  ]);

  const checks: AuditCheck[] = [];

  checks.push({
    code: "outlet_isolation",
    group: "integritas",
    title: "Isolasi antar-outlet",
    why: "Pembukuan setiap outlet harus terpisah: jurnal, akun kas/bank, dan mapping outlet ini tidak boleh memakai akun outlet lain, dan sebaliknya. Penulisan baru yang melanggar sudah ditolak otomatis.",
    status: isolation.length ? "error" : "ok",
    summary: isolation.length ? `${isolation.length} keterkaitan dengan akun outlet lain ditemukan — hubungi admin NEXBILL untuk dipindahkan` : "Pembukuan outlet ini terisolasi dari outlet lain.",
    count: isolation.length,
    items: isolation.map((b) => ({ label: b.label, detail: b.detail, amount: b.amount })),
  });

  // ---------------- INTEGRITAS
  const dupExtra = dups.reduce((s, d) => s + d.extraValue, 0);
  checks.push({
    code: "duplicate_journals",
    group: "integritas",
    title: "Jurnal ganda",
    why: "Satu kejadian (expense, pelunasan, penyusutan, pindah kas, penjualan/HPP order) hanya boleh punya satu jurnal. Salinan kedua menghitung uang/beban dua kali.",
    status: dups.length ? "error" : "ok",
    summary: dups.length ? `${dups.length} kejadian tercatat lebih dari sekali — kelebihan ${rp(dupExtra)}` : "Tidak ada jurnal ganda.",
    count: dups.length,
    amount: dupExtra,
    items: cap(dups).map((d) => ({ label: `[${d.sourceType}] ${d.reference ?? "-"} — ${d.description}`, detail: `${d.count}× @ ${rp(d.total)} · ${d.extraIds.length} salinan dibatalkan`, amount: d.extraValue })),
    fix: dups.length ? { label: "Batalkan salinan ganda", confirm: `Batalkan ${dups.reduce((s, d) => s + d.extraIds.length, 0)} jurnal salinan (jurnal pembalik, riwayat tetap ada)?` } : undefined,
  });

  const smallUnbalanced = unbalanced.filter((u) => Math.abs(u.diff) <= 1);
  checks.push({
    code: "unbalanced_journals",
    group: "integritas",
    title: "Jurnal tidak seimbang",
    why: "Setiap jurnal wajib debit = kredit. Sisa pembulatan yang menumpuk membuat Neraca Saldo tidak pernah balance.",
    status: unbalanced.length ? "error" : "ok",
    summary: unbalanced.length ? `${unbalanced.length} jurnal tidak seimbang${unbalanced.length > smallUnbalanced.length ? ` (${unbalanced.length - smallUnbalanced.length} selisih > Rp1 perlu dicek manual)` : ""}` : "Semua jurnal seimbang.",
    count: unbalanced.length,
    items: cap(unbalanced).map((u) => ({ label: `${u.reference ?? u.id.slice(0, 8)} — ${u.description}`, detail: `debit ${rp(u.debit)} / kredit ${rp(u.credit)} (selisih ${u.diff})` })),
    fix: smallUnbalanced.length ? { label: "Seimbangkan selisih pembulatan", confirm: `Tambahkan selisih pembulatan (≤ Rp1) ke baris terbesar pada ${smallUnbalanced.length} jurnal?` } : undefined,
  });

  const revivedFixable = revived.filter((r) => r.superseded);
  checks.push({
    code: "revived_cancellations",
    group: "integritas",
    title: "Transaksi batal yang terhitung lagi",
    why: "Membatalkan jurnal pembalik menghidupkan lagi jurnal aslinya. Bila order sudah punya jurnal pengganti, uang/pendapatannya jadi terhitung dua kali.",
    status: revived.length ? "error" : "ok",
    summary: revived.length ? `${revived.length} jurnal batal terhitung lagi (${revivedFixable.length} bisa dipulihkan otomatis)` : "Tidak ada.",
    count: revived.length,
    amount: revivedFixable.reduce((s, r) => s + r.total, 0),
    items: cap(revived).map((r) => ({ label: `[${r.sourceType}] ${r.reference ?? "-"} — ${r.description}`, detail: `${r.entryDate.slice(0, 10)} · ${r.superseded ? "ada jurnal pengganti" : "tanpa pengganti — cek manual"}`, amount: r.total })),
    fix: revivedFixable.length ? { label: "Pulihkan pembatalan", confirm: `Pulihkan pembatalan ${revivedFixable.length} jurnal (membuat jurnal pembalik baru)?` } : undefined,
  });

  checks.push({
    code: "unlinked_reversals",
    group: "integritas",
    title: "Jurnal pembalik belum tertaut",
    why: "Pasangan batal + pembalik yang tertaut disembunyikan dari Neraca Saldo supaya kolom Debit/Kredit hanya berisi transaksi nyata. Saldo tidak berubah.",
    status: links.links.length ? "warning" : "ok",
    summary: links.links.length ? `${links.links.length} jurnal pembalik lama bisa ditautkan${links.unmatched ? `, ${links.unmatched} tanpa pasangan pasti` : ""}` : "Semua pembalik sudah tertaut.",
    count: links.links.length,
    items: [],
    fix: links.links.length ? { label: "Tautkan", confirm: `Tautkan ${links.links.length} jurnal pembalik ke jurnal aslinya? Saldo tidak berubah.` } : undefined,
  });

  const staleGaps = gaps.filter((g) => g.stale);
  checks.push({
    code: "stale_receivables",
    group: "integritas",
    title: "Piutang pada order yang sudah lunas/batal",
    why: "Order yang uangnya sudah diterima penuh tidak boleh menyisakan Piutang Pelanggan — aset jadi tercatat lebih besar dari kenyataan.",
    status: staleGaps.length ? "error" : "ok",
    summary: staleGaps.length ? `${staleGaps.length} order menyisakan piutang ${rp(staleGaps.reduce((s, g) => s + g.gap, 0))}` : "Tidak ada.",
    count: staleGaps.length,
    amount: staleGaps.reduce((s, g) => s + g.gap, 0),
    items: cap(staleGaps).map((g) => ({ label: `Order ${g.orderId.slice(0, 8)} [${g.status}]`, detail: `total ${rp(g.total)} · dibayar ${rp(g.paid)}`, amount: g.gap })),
    fix: staleGaps.length ? { label: "Sinkronkan ulang jurnal order", confirm: `Bangun ulang jurnal ${staleGaps.length} order dari total & pembayaran terkini?` } : undefined,
  });

  const orphans = cash.postings.filter((p) => p.verdict.kind === "orphan");
  const mismatches = cash.postings.filter((p) => p.verdict.kind === "mismatch");
  const manualCash = cash.postings.filter((p) => p.verdict.kind === "manual" || p.verdict.kind === "check");
  const cashProblems = orphans.length + mismatches.length + cash.paidWithoutJournal.length;
  checks.push({
    code: "cash_sources",
    group: "integritas",
    title: "Sumber posting kas",
    why: "Setiap rupiah di akun kas harus berasal dari transaksi NEXBILL yang nyata dan masih berlaku — dan setiap uang tunai yang diterima harus punya jurnal.",
    status: cashProblems ? "error" : manualCash.length ? "warning" : "ok",
    summary: cashProblems
      ? `${orphans.length} jurnal yatim, ${mismatches.length} nominal tidak cocok, ${cash.paidWithoutJournal.length} penerimaan tanpa jurnal`
      : `${cash.postings.length} jurnal kas valid${manualCash.length ? ` · ${manualCash.length} jurnal manual/saldo awal untuk dicek sendiri` : ""}`,
    count: cashProblems,
    items: cap([
      ...orphans.map((p) => ({ label: `❌ ${p.reference ?? p.sourceType} — ${p.description}`, detail: "reason" in p.verdict ? p.verdict.reason : "", amount: p.cashNet })),
      ...mismatches.map((p) => ({ label: `⚠ ${p.reference ?? p.sourceType} — ${p.description}`, detail: "reason" in p.verdict ? p.verdict.reason : "", amount: p.cashNet })),
      ...cash.paidWithoutJournal.map((x) => ({ label: `💸 Order ${x.orderId.slice(0, 8)}`, detail: "Uang tunai diterima tapi tidak ada jurnal penjualan", amount: x.amount })),
      ...manualCash.map((p) => ({ label: `📝 ${p.reference ?? p.sourceType} — ${p.description}`, detail: "reason" in p.verdict ? p.verdict.reason : "", amount: p.cashNet })),
    ]),
    fix: cashProblems ? { label: "Perbaiki sumber kas", confirm: `Batalkan ${orphans.length} jurnal yatim dan sinkronkan ulang ${new Set([...mismatches.map((m) => (m.verdict as { orderId: string }).orderId), ...cash.paidWithoutJournal.map((x) => x.orderId)]).size} order?` } : undefined,
  });

  const mappingProblems = mapping.issues.length + mapping.unmappedPaymentMethods.length;
  checks.push({
    code: "account_mapping",
    group: "integritas",
    title: "Account Mapping",
    why: "Setiap jenis transaksi dibukukan ke akun yang ditentukan di tab Account Mapping. Mapping ke akun yang salah jenis (mis. penjualan ke akun kas, HPP ke akun pendapatan) membuat setiap transaksi baru masuk ke pos laporan yang keliru tanpa terlihat error.",
    status: mapping.issues.length ? "error" : mapping.unmappedPaymentMethods.length ? "warning" : "ok",
    summary: mappingProblems
      ? `${mapping.issues.length} mapping menunjuk akun yang salah${mapping.unmappedPaymentMethods.length ? `, ${mapping.unmappedPaymentMethods.length} metode pembayaran belum punya akun sendiri` : ""}`
      : "Semua mapping menunjuk ke akun yang benar jenisnya.",
    count: mappingProblems,
    items: [
      ...mapping.issues.map((i) => ({ label: `${i.label ?? `${i.module} / ${i.key}`} → ${i.account}`, detail: i.problem })),
      ...mapping.unmappedPaymentMethods.map((m) => ({ label: `Metode "${m.label}" (${m.key})`, detail: "Belum dipetakan — uangnya masuk ke akun Bank umum (1121). Petakan di Account Mapping, modul payment." })),
    ],
    action: mappingProblems ? { label: "Buka Account Mapping", href: "/dashboard/accounting" } : undefined,
  });

  const cbErrors = cashBank.issues.filter((i) => i.severity === "error").length;
  const cbWarnings = cashBank.issues.length - cbErrors;
  checks.push({
    code: "cash_bank_accounts",
    group: "integritas",
    title: "Kas & Bank ↔ Chart of Accounts",
    why: "Setiap uang yang diterima/dikeluarkan kasir mendarat di akun COA lewat metode pembayaran (Account Mapping) atau sumber dana yang dipilih (Kas Utama, Rekening Bank, QRIS, Saldo Deposit PPOB). Kalau salah satunya menunjuk golongan akun yang keliru — QRIS ke Kas Kasir, Kas Utama ke akun bank, uang pelanggan ke saldo deposit — saldo di Neraca tidak sama dengan uang sebenarnya dan cek shift selalu selisih.",
    status: cbErrors ? "error" : cbWarnings ? "warning" : "ok",
    summary: cashBank.issues.length
      ? `${cbErrors} ketidaksesuaian, ${cbWarnings} perlu diperiksa — lihat Peta Kas & Bank di bawah.`
      : `${cashBank.map.length} akun kas/bank sesuai golongan COA-nya, semua metode pembayaran & transaksi masuk ke akun yang benar.`,
    count: cashBank.issues.length,
    items: cashBank.issues.map((i) => ({ label: `${i.severity === "error" ? "❌" : "⚠️"} ${i.label}`, detail: i.detail, amount: i.amount })),
    action: cashBank.issues.length ? { label: "Buka Pembayaran (Kas/Bank)", href: "/dashboard/payments" } : undefined,
  });

  // ---------------- KEHATI-HATIAN
  const invDiff = inventory.difference;
  checks.push({
    code: "inventory_valuation",
    group: "kehati_hatian",
    title: "Nilai Persediaan vs stok",
    why: "SAK EMKM mengukur persediaan pada biaya perolehannya. Persediaan di buku harus sama dengan stok yang ada × harga modal — lebih besar berarti ada barang hilang/rusak yang belum diakui sebagai beban.",
    status: Math.abs(invDiff) >= 1 ? (invDiff > 0 ? "error" : "warning") : "ok",
    summary:
      Math.abs(invDiff) < 1
        ? `Sesuai: ${rp(inventory.bookValue)}`
        : `Buku ${rp(inventory.bookValue)} vs stok ${rp(inventory.stockValue)} — ${invDiff > 0 ? `buku lebih besar ${rp(invDiff)}` : `buku lebih kecil ${rp(-invDiff)}`}`,
    count: Math.abs(invDiff) >= 1 ? 1 : 0,
    amount: invDiff,
    items: [],
    fix:
      Math.abs(invDiff) >= 1
        ? {
            label: invDiff > 0 ? "Akui selisih sebagai beban" : "Catat stok yang belum dijurnal",
            confirm:
              invDiff > 0
                ? `Turunkan Persediaan ${rp(invDiff)} ke nilai stok dan akui sebagai beban Penyesuaian Stok (5340)? Pastikan harga modal & Stock Opname sudah benar.`
                : `Naikkan Persediaan ${rp(-invDiff)} ke nilai stok dengan lawan Ekuitas Saldo Awal (3400) — untuk stok yang dulu tidak pernah dijurnal? Pastikan harga modal & Stock Opname sudah benar.`,
          }
        : undefined,
  });

  checks.push({
    code: "negative_stock",
    group: "kehati_hatian",
    title: "Stok minus",
    why: "Stok tidak mungkin minus. Biasanya penjualan dicatat sebelum barang masuk dicatat, atau hitungan stok salah — HPP dan Persediaan jadi tidak akurat.",
    status: inventory.negativeStock.length ? "warning" : "ok",
    summary: inventory.negativeStock.length ? `${inventory.negativeStock.length} produk bersaldo stok minus` : "Tidak ada.",
    count: inventory.negativeStock.length,
    items: cap(inventory.negativeStock).map((p) => ({ label: p.name, detail: `stok ${p.stockQty}` })),
    action: inventory.negativeStock.length ? { label: "Stock Opname", href: "/dashboard/inventory" } : undefined,
  });

  checks.push({
    code: "cost_missing",
    group: "kehati_hatian",
    title: "Produk terjual tanpa harga modal",
    why: "Penjualan tanpa harga modal mencatat HPP Rp0, sehingga laba kotor tampak lebih besar dari sebenarnya.",
    status: noCost.length ? "warning" : "ok",
    summary: noCost.length ? `${noCost.length} produk terjual 90 hari terakhir dengan harga modal kosong` : "Semua produk yang terjual punya harga modal.",
    count: noCost.length,
    items: cap(noCost).map((p) => ({ label: p.name, detail: `${p.qtySold} terjual` })),
    action: noCost.length ? { label: "Isi harga modal", href: "/dashboard/inventory" } : undefined,
  });

  checks.push({
    code: "contra_balances",
    group: "kehati_hatian",
    title: "Saldo berlawanan arah",
    why: "Kas/bank/persediaan tidak mungkin minus dan utang tidak mungkin bersaldo debit. Saldo seperti ini selalu tanda salah input atau salah posting.",
    status: contra.length ? "error" : "ok",
    summary: contra.length ? `${contra.length} akun bersaldo berlawanan arah` : "Tidak ada.",
    count: contra.length,
    items: contra.map((c) => ({ label: `${c.code} ${c.name}`, amount: c.balance })),
  });

  const agedTotal = aged.reduce((s, a) => s + a.outstanding, 0);
  checks.push({
    code: "aged_receivables",
    group: "kehati_hatian",
    title: "Piutang lebih dari 60 hari",
    why: "Prinsip kehati-hatian: piutang lama belum tentu tertagih. Tagih, atau pertimbangkan penghapusan agar aset tidak dilebih-lebihkan.",
    status: aged.length ? "warning" : "ok",
    summary: aged.length ? `${aged.length} piutang lama senilai ${rp(agedTotal)}` : "Tidak ada.",
    count: aged.length,
    amount: agedTotal,
    items: cap(aged).map((a) => ({ label: `Order ${a.orderId?.slice(0, 8) ?? "-"}`, detail: `${a.ageDays} hari`, amount: a.outstanding })),
    action: aged.length ? { label: "Tab Piutang (AR)", href: "/dashboard/accounting" } : undefined,
  });

  checks.push({
    code: "supplier_overpaid",
    group: "kehati_hatian",
    title: "Invoice supplier dibayar melebihi nilainya",
    why: "Pembayaran ganda ke supplier membuat Hutang minus dan kas keluar tanpa dasar.",
    status: overpaid.length ? "error" : "ok",
    summary: overpaid.length ? `${overpaid.length} invoice kelebihan bayar` : "Tidak ada.",
    count: overpaid.length,
    items: overpaid.map((o) => ({ label: o.invoice_number ?? o.id.slice(0, 8), detail: `nilai ${rp(o.amount)} · dibayar ${rp(o.paid)} (${o.payment_count}×)`, amount: o.paid - o.amount })),
    action: overpaid.length ? { label: "Hutang (AP)", href: "/dashboard/accounting" } : undefined,
  });

  checks.push({
    code: "shift_reviews",
    group: "kehati_hatian",
    title: "Shift ditandai belum ditinjau",
    why: "Shift dengan selisih kas atau aksi sensitif perlu ditinjau sebelum angka periodenya dianggap final.",
    status: reviews ? "warning" : "ok",
    summary: reviews ? `${reviews} shift menunggu review` : "Tidak ada.",
    count: reviews,
    items: [],
    action: reviews ? { label: "Riwayat Shift", href: "/dashboard/shift" } : undefined,
  });

  checks.push({
    code: "unclosed_periods",
    group: "kehati_hatian",
    title: "Periode lalu belum ditutup",
    why: "Periode yang sudah dilaporkan sebaiknya ditutup supaya angkanya tidak bisa berubah diam-diam.",
    status: periods.length ? "warning" : "ok",
    summary: periods.length ? `${periods.length} periode belum ditutup: ${periods.join(", ")}` : "Semua periode lalu sudah ditutup.",
    count: periods.length,
    items: [],
    action: periods.length ? { label: "Tutup Periode", href: "/dashboard/accounting" } : undefined,
  });

  const taxGap = Math.max(0, tax.pphFinalEstimate - tax.taxExpensePosted);
  checks.push({
    code: "income_tax",
    group: "kehati_hatian",
    title: `Beban pajak penghasilan ${tax.year}`,
    why: "SAK EMKM mensyaratkan pos beban pajak di Laba Rugi. Estimasi PPh Final UMKM = 0,5% × peredaran bruto (PP 55/2022). Kewajiban sebenarnya bergantung status wajib pajak — konsultasikan; tidak dijurnal otomatis.",
    status: taxGap >= 1 && tax.grossRevenue > 0 ? "warning" : "ok",
    summary: `Peredaran bruto ${rp(tax.grossRevenue)} · estimasi PPh Final ${rp(tax.pphFinalEstimate)} · sudah dijurnal ${rp(tax.taxExpensePosted)} (akun 8500)`,
    count: taxGap >= 1 ? 1 : 0,
    amount: taxGap,
    items: [],
    action: { label: "Jurnal manual", href: "/dashboard/accounting" },
  });

  return checks;
}

/** Applies the automatic fix for one check. Every change is a reversing/correcting journal (or a reversal link), audit-logged. */
export async function applyAuditFix(outletId: string, code: AuditCode, staffUserId?: string): Promise<{ changed: number; message: string }> {
  const reason = `Audit Accounting (${code})`;
  let changed = 0;
  let message = "";

  if (code === "duplicate_journals") {
    for (const g of await findDuplicateJournals(outletId)) {
      for (const id of g.extraIds) {
        await voidJournal(id, `${reason}: jurnal ganda`);
        changed++;
      }
    }
    message = `${changed} jurnal salinan dibatalkan.`;
  } else if (code === "unbalanced_journals") {
    for (const u of await findUnbalancedJournals(outletId)) {
      if (Math.abs(u.diff) > 1) continue;
      const side = u.diff > 0 ? "credit" : "debit";
      const [line] = (await db.execute(sql`SELECT id FROM journal_lines WHERE journal_entry_id = ${u.id} AND ${sql.raw(side)} > 0 ORDER BY ${sql.raw(side)} DESC LIMIT 1`)) as unknown as { id: string }[];
      if (!line) continue;
      await db.execute(sql`UPDATE journal_lines SET ${sql.raw(side)} = ROUND((${sql.raw(side)} + ${Math.abs(u.diff)})::numeric, 2) WHERE id = ${line.id}`);
      changed++;
    }
    message = `${changed} jurnal diseimbangkan.`;
  } else if (code === "revived_cancellations") {
    for (const r of await findRevivedChains(outletId)) {
      if (!r.superseded) continue;
      await voidJournal(r.tailId, `${reason}: memulihkan pembatalan`);
      changed++;
    }
    message = `${changed} pembatalan dipulihkan.`;
  } else if (code === "unlinked_reversals") {
    for (const l of (await planReversalLinks(outletId)).links) {
      await db.update(journalEntries).set({ reversalOfEntryId: l.originalId }).where(eq(journalEntries.id, l.reversalId));
      changed++;
    }
    message = `${changed} jurnal pembalik ditautkan.`;
  } else if (code === "stale_receivables") {
    for (const g of await findReceivableGaps(outletId)) {
      if (!g.stale) continue;
      await resyncOrderJournal(g.orderId, staffUserId);
      changed++;
    }
    message = `${changed} order disinkronkan ulang.`;
  } else if (code === "cash_sources") {
    const { postings, paidWithoutJournal } = await auditCashPostings(outletId);
    let voided = 0;
    for (const p of postings) {
      if (p.verdict.kind !== "orphan") continue;
      await voidJournal(p.entryId, `${reason}: ${p.verdict.reason}`);
      voided++;
    }
    const orderIds = new Set<string>([...postings.flatMap((p) => (p.verdict.kind === "mismatch" ? [p.verdict.orderId] : [])), ...paidWithoutJournal.map((x) => x.orderId)]);
    for (const id of orderIds) await resyncOrderJournal(id, staffUserId);
    changed = voided + orderIds.size;
    message = `${voided} jurnal yatim dibatalkan, ${orderIds.size} order disinkronkan ulang.`;
  } else if (code === "inventory_valuation") {
    const inv = await checkInventoryValuation(outletId);
    const diff = inv.difference;
    if (Math.abs(diff) >= 1) {
      const inventoryAccountId = await getMappedAccountId(outletId, "product", "inventory", "1161");
      const contraAccountId =
        diff > 0 ? await getMappedAccountId(outletId, "product", "adjustment", "5340") : await getMappedAccountId(outletId, "product", "opening_stock", "3400");
      const amount = Math.abs(Math.round(diff * 100) / 100);
      await postJournal({
        outletId,
        reference: `AUDIT-PERSEDIAAN-${new Date().toISOString().slice(0, 10)}`,
        description: diff > 0 ? "Audit: penurunan Persediaan ke nilai stok (barang hilang/rusak belum diakui)" : "Audit: pencatatan stok yang belum pernah dijurnal",
        sourceType: "inventory_adjustment",
        staffUserId,
        lines:
          diff > 0
            ? [
                { accountId: contraAccountId, debit: amount, credit: 0, description: "Selisih persediaan" },
                { accountId: inventoryAccountId, debit: 0, credit: amount, description: "Persediaan disesuaikan ke nilai stok" },
              ]
            : [
                { accountId: inventoryAccountId, debit: amount, credit: 0, description: "Persediaan disesuaikan ke nilai stok" },
                { accountId: contraAccountId, debit: 0, credit: amount, description: "Stok awal yang belum dijurnal" },
              ],
      });
      changed = 1;
    }
    message = changed ? "Jurnal penyesuaian Persediaan dibuat." : "Persediaan sudah sesuai.";
  } else {
    throw new Error("Pemeriksaan ini tidak punya perbaikan otomatis.");
  }

  await logAudit({ outletId, staffUserId, action: "accounting_audit_fix", entityType: "accounting_audit", entityId: code, after: { code, changed, message } });
  return { changed, message };
}
