import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "pos-rental.db");

// Make sure the containing folder exists (fresh clones won't have /data yet).
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Build a proper file:// URL instead of naively prepending "file:" to the path.
// On Windows, path.join()/path.resolve() return backslash paths with a drive
// letter (e.g. C:\Users\...\data\pos-rental.db) — `file:${dbPath}` mangles
// that into an invalid URI that libsql's Rust-side parser rejects
// ("ConnectionFailed ... code: 14"). pathToFileURL() handles the
// backslash-to-slash conversion and drive-letter encoding correctly on every OS.
const client = createClient({ url: pathToFileURL(dbPath).href });

export const db = drizzle(client, { schema });
export type DB = typeof db;
