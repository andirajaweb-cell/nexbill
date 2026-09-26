/**
 * Audit sumber posting akun KAS dari CLI — logikanya sama dengan pemeriksaan "Sumber posting kas"
 * di tab Audit (src/lib/accounting/audit/integrity.ts → auditCashPostings).
 *
 *   npx tsx scripts/audit-cash-sources.ts                    # semua akun kas, semua outlet
 *   npx tsx scripts/audit-cash-sources.ts --kode=1112        # hanya satu akun (laporan saja)
 *   npx tsx scripts/audit-cash-sources.ts --outlet=<id>
 *   npx tsx scripts/audit-cash-sources.ts --apply            # batalkan jurnal yatim + sinkronkan ulang order
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { applyAuditFix, auditCashPostings } from "../src/lib/accounting/audit";

const APPLY = process.argv.includes("--apply");
const KODE = process.argv.find((a) => a.startsWith("--kode="))?.slice("--kode=".length);
const OUTLET = process.argv.find((a) => a.startsWith("--outlet="))?.slice("--outlet=".length);
const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

async function main() {
  const rows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(OUTLET ? eq(outlets.id, OUTLET) : undefined);
  console.log(`Mode: ${APPLY ? "PERBAIKI (--apply)" : "LAPORAN SAJA"}${KODE ? ` · akun ${KODE}` : " · semua akun kas"}\n`);
  for (const outlet of rows) {
    const { postings, paidWithoutJournal } = await auditCashPostings(outlet.id, KODE);
    if (!postings.length && !paidWithoutJournal.length) continue;
    console.log(`=== ${outlet.name}`);
    const by = (k: string) => postings.filter((p) => p.verdict.kind === k);
    const sum = (xs: { cashNet: number }[]) => xs.reduce((s, x) => s + x.cashNet, 0);
    console.log(`✅ Valid: ${by("valid").length} jurnal, ${rupiah(sum(by("valid")))}`);
    for (const [k, title] of [["orphan", "❌ Yatim"], ["mismatch", "⚠️  Nominal tidak cocok"], ["check", "🔍 Cek manual"], ["manual", "📝 Jurnal manual/saldo awal"]] as const) {
      const xs = by(k);
      if (!xs.length) continue;
      console.log(`${title}: ${xs.length} jurnal, ${rupiah(sum(xs))}`);
      for (const p of xs) console.log(`   - ${p.entryDate.slice(0, 16).replace("T", " ")} · ${p.reference ?? p.sourceType} · "${p.description}" · ${rupiah(p.cashNet)} · ${"reason" in p.verdict ? p.verdict.reason : ""}`);
    }
    if (paidWithoutJournal.length) {
      console.log(`💸 Uang tunai diterima tanpa jurnal penjualan: ${paidWithoutJournal.length} order`);
      for (const x of paidWithoutJournal) console.log(`   - order ${x.orderId.slice(0, 8)} · ${rupiah(x.amount)}`);
    }
    if (APPLY) console.log(`🔧 ${(await applyAuditFix(outlet.id, "cash_sources", undefined)).message}`);
    console.log("");
  }
  if (!APPLY) console.log("Tidak ada yang diubah.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit gagal:", err);
    process.exit(1);
  });
