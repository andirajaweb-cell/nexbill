import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "pos-rental.db");

// libsql (unlike better-sqlite3) does NOT auto-create a missing parent
// directory — on a fresh clone/copy where ./data doesn't exist yet, both
// this CLI (drizzle-kit push) and the app's own db client need to create it.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: pathToFileURL(dbPath).href,
  },
});
