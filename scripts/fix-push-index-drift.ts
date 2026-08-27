/**
 * One-off fix for a `drizzle-kit push` failure:
 *   SQLITE_ERROR: index vouchers_code_unique already exists
 *
 * This means the index is physically present in data/pos-rental.db but
 * drizzle-kit's diff logic doesn't recognize it as already matching the
 * schema, so it tries to CREATE it again and SQLite rejects the duplicate
 * name. This is pre-existing DB/schema drift unrelated to the new `units`
 * table — push fails before applying ANY changes (including `units`),
 * which is why the Inventory/Settings pages are getting "no such table:
 * units" right now.
 *
 * Fix: drop the stale index by name so drizzle-kit can recreate it fresh
 * (with the exact DDL it expects) on the next push. This only drops the
 * index, not the table or its data or its uniqueness guarantee — `npm run
 * db:push` immediately re-adds it as part of applying the rest of the diff.
 *
 * Usage:  npx tsx scripts/fix-push-index-drift.ts
 * Then:   npm run db:push
 */
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "pos-rental.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database file tidak ditemukan di: ${dbPath}`);
  process.exit(1);
}

// Backup first — this project's own db:push workflow always backs up before
// a schema change, so this script does the same rather than assuming it's safe.
const backupPath = dbPath.replace(/\.db$/, `.backup-${Date.now()}.db`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup dibuat: ${backupPath}`);

const client = createClient({ url: pathToFileURL(dbPath).href });

async function main() {
  const { rows } = await client.execute(
    "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name='vouchers_code_unique'"
  );
  if (rows.length === 0) {
    console.log("Index vouchers_code_unique tidak ada — kemungkinan sudah beres. Coba langsung `npm run db:push` lagi.");
    return;
  }
  console.log("Index ditemukan:", rows[0]);
  await client.execute("DROP INDEX vouchers_code_unique");
  console.log("Index vouchers_code_unique berhasil di-drop. Jalankan `npm run db:push` sekarang untuk membuat ulang index ini + tabel `units` yang baru.");
}

main()
  .catch((err) => {
    console.error("Gagal:", err);
    process.exit(1);
  })
  .finally(() => client.close());
