/**
 * Bulk version of the "Hapus Permanen" button on /dashboard/semua-outlet — for when there are
 * many outlets to delete at once (e.g. leftover test/demo outlets from development) and clicking
 * through the UI one-by-one, retyping each outlet's name + password every time, is impractical.
 *
 * Reuses the exact same deleteOutletPermanently() used by the UI (see
 * src/lib/admin/delete-outlet.ts) — same FK-safe table clearing engine as resetAllData(), same
 * cross-outlet membership/billing-group guards. Nothing here re-implements deletion logic; this
 * script is purely a loop + a CLI wrapper around that one already-audited function.
 *
 * Usage:
 *   npx tsx scripts/reduce-to-one-outlet.ts
 *     Lists every outlet with identifying details (id, name, slug, address, phone, createdAt,
 *     staff count, order count, subscription status) so you can tell them apart and decide which
 *     one to KEEP — several outlets sharing the same name (e.g. all called "Xtream Playstation")
 *     is exactly the case this listing is for.
 *
 *   npx tsx scripts/reduce-to-one-outlet.ts --keep <outletId>
 *     Dry run: reports which outlets WOULD be deleted (everything except <outletId>), without
 *     deleting anything.
 *
 *   npx tsx scripts/reduce-to-one-outlet.ts --keep <outletId> --apply
 *     Actually deletes every outlet except <outletId>, one at a time, printing the result of
 *     each. Irreversible through the app — same caveat as the UI button (Supabase's own managed
 *     backups are the only recovery path).
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { outlets, staffUsers, orders, subscriptions } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import { deleteOutletPermanently } from "../src/lib/admin/delete-outlet";

async function countFor(table: typeof staffUsers | typeof orders, outletId: string): Promise<number> {
  const [row] = (await db.select({ n: sql<number>`count(*)` }).from(table).where(eq(table.outletId, outletId))) as { n: number }[];
  return Number(row?.n ?? 0);
}

async function listOutlets() {
  const rows = await db.select().from(outlets).orderBy(outlets.createdAt);
  console.log(`\n${rows.length} outlet ditemukan:\n`);
  for (const o of rows) {
    const staffCount = await countFor(staffUsers, o.id);
    const orderCount = await countFor(orders, o.id);
    const [sub] = await db.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.outletId, o.id)).limit(1);
    console.log(
      `- ${o.name}${o.isActive ? "" : " [NONAKTIF]"}\n` +
        `    id: ${o.id}\n` +
        `    slug: ${o.slug ?? "-"} · alamat: ${o.address ?? "-"} · telp: ${o.phone ?? "-"}\n` +
        `    dibuat: ${o.createdAt} · staf: ${staffCount} · order: ${orderCount} · langganan: ${sub?.status ?? "(belum ada)"}\n`
    );
  }
  console.log(`Jalankan lagi dengan --keep <id outlet yang mau dipertahankan> untuk lihat mana yang akan dihapus (dry run), lalu tambahkan --apply untuk benar-benar menghapus.\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const keepIdx = args.indexOf("--keep");
  const keepId = keepIdx >= 0 ? args[keepIdx + 1] : null;

  if (!keepId) {
    await listOutlets();
    return;
  }

  const [keepOutlet] = await db.select().from(outlets).where(eq(outlets.id, keepId)).limit(1);
  if (!keepOutlet) {
    console.error(`Outlet dengan id "${keepId}" tidak ditemukan. Jalankan tanpa argumen dulu untuk lihat daftar id yang valid.`);
    process.exit(1);
  }

  const all = await db.select().from(outlets);
  const toDelete = all.filter((o) => o.id !== keepId);

  if (toDelete.length === 0) {
    console.log(`Hanya ada 1 outlet ("${keepOutlet.name}") — tidak ada yang perlu dihapus.`);
    return;
  }

  console.log(`\nOutlet yang DIPERTAHANKAN: "${keepOutlet.name}" (${keepId})`);
  console.log(`Outlet yang ${apply ? "AKAN DIHAPUS SEKARANG" : "akan dihapus (dry run — belum benar-benar dihapus)"}:`);
  for (const o of toDelete) console.log(`  - ${o.name} (${o.id})`);

  if (!apply) {
    console.log(`\nTidak ada perubahan dilakukan. Tambahkan --apply di akhir command untuk benar-benar menghapus ${toDelete.length} outlet di atas.`);
    return;
  }

  // Multi-pass: deleteOutletPermanently refuses to delete an outlet whose staff still owns a
  // shared billing group (billing_groups.ownerStaffUserId) that ANOTHER outlet's subscription
  // still depends on (see the guard in lib/admin/delete-outlet.ts). If two outlets being deleted
  // in the SAME batch happen to share a billing group, deleting them in the wrong order trips
  // that guard even though both are going away — deleting the other one first removes its
  // subscription row, which clears the guard for the next attempt. Re-attempting every remaining
  // failure in additional passes (until a full pass makes zero progress) resolves any ordering
  // within this batch automatically, without needing to understand the dependency graph upfront.
  console.log("");
  let remaining = [...toDelete];
  const lastError = new Map<string, string>();
  while (remaining.length > 0) {
    const stillFailing: typeof remaining = [];
    let progressThisPass = false;
    for (const o of remaining) {
      try {
        const result = await deleteOutletPermanently(o.id);
        console.log(`✅ "${result.deletedOutletName}" (${o.id}) dihapus — ${result.tablesCleared.length} tabel dibersihkan.`);
        progressThisPass = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        lastError.set(o.id, message);
        stillFailing.push(o);
      }
    }
    if (!progressThisPass) {
      console.log(`\n${stillFailing.length} outlet masih gagal dihapus setelah dicoba ulang beberapa kali (kemungkinan konflik permanen, bukan urutan) — perlu ditangani manual:`);
      for (const o of stillFailing) console.log(`  ❌ "${o.name}" (${o.id}): ${lastError.get(o.id)}`);
      break;
    }
    remaining = stillFailing;
  }
  console.log(`\nSelesai. Sisa outlet sekarang: "${keepOutlet.name}".`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Gagal:", err);
    process.exit(1);
  });
