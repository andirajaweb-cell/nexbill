import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema"; // Sesuaikan path jika letak schema.ts berbeda

// Pastikan environment variable DATABASE_URL sudah diset di .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// Konfigurasi client postgres-js untuk serverless/Next.js
// Menggunakan globalThis agar koneksi tidak terduplikasi saat hot-reload di mode development
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const sql = globalForDb.conn ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = sql;
}

// Inisialisasi Drizzle ORM dengan seluruh definisi schema
export const db = drizzle(sql, { schema });