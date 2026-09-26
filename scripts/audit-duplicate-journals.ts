/**
 * Audit Accounting dari CLI — sama persis dengan tab "Audit" di halaman Accounting (logikanya ada di
 * src/lib/accounting/audit), tapi bisa dijalankan untuk SEMUA outlet sekaligus.
 *
 * Pemakaian (default hanya melapor):
 *   npx tsx scripts/audit-duplicate-journals.ts                      # semua outlet
 *   npx tsx scripts/audit-duplicate-journals.ts --outlet=<outletId>
 *   npx tsx scripts/audit-duplicate-journals.ts --apply              # jalankan perbaikan otomatis
 *   npx tsx scripts/audit-duplicate-journals.ts --apply --inventory  # termasuk penyesuaian nilai Persediaan
 *
 * Perbaikan selalu berupa jurnal koreksi/pembalik yang tercatat (tidak ada riwayat yang dihapus),
 * dicatat di log audit sebagai "accounting_audit_fix".
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { applyAuditFix, runAccountingAudit, type AuditCode } from "../src/lib/accounting/audit";

const APPLY = process.argv.includes("--apply");
const OUTLET = process.argv.find((a) => a.startsWith("--outlet="))?.slice("--outlet=".length);
const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const ICON = { ok: "✅", warning: "⚠️ ", error: "❌" } as const;

async function main() {
  const rows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(OUTLET ? eq(outlets.id, OUTLET) : undefined);
  console.log(`Mode: ${APPLY ? "PERBAIKI (--apply)" : "LAPORAN SAJA"} · ${rows.length} outlet\n`);

  for (const outlet of rows) {
    console.log(`=== ${outlet.name} (${outlet.id})`);
    const checks = await runAccountingAudit(outlet.id);
    for (const c of checks) {
      console.log(`${ICON[c.status]} ${c.title}: ${c.summary}${c.amount ? ` [${rupiah(c.amount)}]` : ""}`);
      if (c.status !== "ok") for (const it of c.items.slice(0, 20)) console.log(`     - ${it.label}${it.detail ? ` · ${it.detail}` : ""}${it.amount != null ? ` · ${rupiah(it.amount)}` : ""}`);
    }
    if (APPLY) {
      // Inventory revaluation depends on harga modal & stock counts being right — only with --inventory.
      for (const c of checks.filter((x) => x.fix && (x.code !== "inventory_valuation" || process.argv.includes("--inventory")))) {
        const r = await applyAuditFix(outlet.id, c.code as AuditCode, undefined);
        console.log(`   🔧 ${c.title}: ${r.message}`);
      }
    }
    console.log("");
  }
  console.log(APPLY ? "Selesai. Jalankan lagi tanpa --apply untuk memastikan bersih." : "Tidak ada yang diubah.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit gagal:", err);
    process.exit(1);
  });
