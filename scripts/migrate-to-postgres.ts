/**
 * One-time data migration: live SQLite (data/pos-rental.db) -> Supabase Postgres.
 *
 * Not run yet — needs DATABASE_URL (Supabase Session-pooler connection string) in
 * the environment first. Usage once ready:
 *
 *   DATABASE_URL="postgres://postgres.xxxx:PASSWORD@aws-...pooler.supabase.com:5432/postgres" \
 *     npx tsx scripts/migrate-to-postgres.ts
 *
 * Safety:
 *  - Read-only against SQLite (never writes back to the source).
 *  - Runs the whole Postgres load inside ONE transaction — if anything fails
 *    partway through, everything rolls back and Postgres is left empty, not
 *    half-migrated. Safe to fix the issue and re-run from scratch.
 *  - Inserts tables in dependency order (parents before children, derived by
 *    parsing `.references(() => X.id)` edges straight out of schema.postgres.ts)
 *    so foreign keys are always satisfied without needing to defer constraints
 *    or touch session_replication_role (which Supabase's default role may not
 *    have privilege for anyway).
 *  - Verifies row counts match between source and destination per table before
 *    committing, and aborts (rolls back) on any mismatch.
 *
 * What it does NOT do: doesn't touch RLS, doesn't touch the app's db client —
 * purely a data copy. Cutover (pointing the app at Postgres) is a separate step
 * after this has been verified.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const SQLITE_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "pos-rental.db");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Aborting — nothing was touched.");
  process.exit(1);
}

/** Parses schema.postgres.ts to build a dependency graph: table -> [tables it references]. */
function computeTableOrder(): string[] {
  const schemaSrc = fs.readFileSync(path.join(process.cwd(), "src/db/schema.postgres.ts"), "utf-8");

  // varName -> sqlTableName, e.g. staffUsers -> staff_users
  const varToTable = new Map<string, string>();
  for (const m of schemaSrc.matchAll(/export const (\w+) = pgTable\(\s*\n?\s*"(\w+)"/g)) {
    varToTable.set(m[1], m[2]);
  }

  // table -> block of source text (from its declaration to the next declaration)
  const decls = [...schemaSrc.matchAll(/export const (\w+) = pgTable\(/g)];
  const edges = new Map<string, Set<string>>(); // table -> tables it depends on
  for (const t of varToTable.values()) edges.set(t, new Set());

  for (let i = 0; i < decls.length; i++) {
    const varName = decls[i][1];
    const table = varToTable.get(varName);
    if (!table) continue;
    const start = decls[i].index!;
    const end = i + 1 < decls.length ? decls[i + 1].index! : schemaSrc.length;
    const block = schemaSrc.slice(start, end);
    for (const refMatch of block.matchAll(/\.references\(\(\)\s*=>\s*(\w+)\.\w+\)/g)) {
      const refVar = refMatch[1];
      const refTable = varToTable.get(refVar);
      if (refTable && refTable !== table) edges.get(table)!.add(refTable);
    }
  }

  // Kahn's algorithm — tables with no unresolved deps go first.
  const allTables = [...varToTable.values()];
  const remaining = new Set(allTables);
  const ordered: string[] = [];
  let guard = 0;
  while (remaining.size > 0) {
    if (++guard > allTables.length + 5) {
      throw new Error(`Dependency cycle detected among: ${[...remaining].join(", ")} — resolve manually.`);
    }
    const ready = [...remaining].filter((t) => [...edges.get(t)!].every((dep) => !remaining.has(dep)));
    if (ready.length === 0) {
      throw new Error(`Stuck resolving table order — remaining: ${[...remaining].join(", ")}`);
    }
    for (const t of ready.sort()) {
      ordered.push(t);
      remaining.delete(t);
    }
  }
  return ordered;
}

async function main() {
  const order = computeTableOrder();
  console.log(`Resolved insert order for ${order.length} tables.`);

  const sqlite = createClient({ url: pathToFileURL(SQLITE_PATH).href });
  const sql = postgres(DATABASE_URL!, { max: 1 });

  // Boolean columns per table, read straight from Postgres's own catalog — the
  // single source of truth for what needs 0/1 -> true/false conversion, no risk
  // of drifting out of sync with the schema file.
  const boolColsByTable = new Map<string, Set<string>>();
  const boolRows = await sql<{ table_name: string; column_name: string }[]>`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type = 'boolean'
  `;
  for (const r of boolRows) {
    if (!boolColsByTable.has(r.table_name)) boolColsByTable.set(r.table_name, new Set());
    boolColsByTable.get(r.table_name)!.add(r.column_name);
  }

  const results: { table: string; sqliteCount: number; pgCount: number }[] = [];

  await sql.begin(async (tx) => {
    for (const table of order) {
      const res = await sqlite.execute(`SELECT * FROM "${table}"`);
      const rows = res.rows as any[];
      const sqliteCount = rows.length;

      if (sqliteCount === 0) {
        results.push({ table, sqliteCount: 0, pgCount: 0 });
        continue;
      }

      const boolCols = boolColsByTable.get(table) ?? new Set<string>();
      const columns = res.columns;
      const cleanRows = rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const col of columns) {
          let v = row[col];
          if (boolCols.has(col) && (v === 0 || v === 1)) v = v === 1;
          out[col] = v;
        }
        return out;
      });

      // Batch insert (postgres.js supports array-of-objects -> multi-row INSERT).
      await tx`insert into ${tx(table)} ${tx(cleanRows)}`;

      const [{ count }] = await tx<{ count: string }[]>`select count(*)::text as count from ${tx(table)}`;
      const pgCount = Number(count);
      results.push({ table, sqliteCount, pgCount });

      if (pgCount !== sqliteCount) {
        throw new Error(`Row count mismatch on "${table}": sqlite=${sqliteCount} pg=${pgCount} — rolling back everything.`);
      }
      console.log(`  ${table.padEnd(35)} ${sqliteCount} rows`);
    }
  });

  console.log("\nMigration committed successfully.");
  console.log(`Total tables migrated: ${results.filter((r) => r.sqliteCount > 0).length} (of ${results.length} total, rest were empty)`);

  await sql.end();
}

main().catch((err) => {
  console.error("\nMigration FAILED — transaction rolled back, Postgres left untouched:", err);
  process.exit(1);
});
