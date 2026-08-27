import "dotenv/config";
import { db } from "../src/db/client";
import { staffUsers, outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ensureOutletMembership } from "../src/lib/outlets/membership";

/**
 * Emergency recovery: create a fresh Superuser login for an outlet — for when the account you
 * were logged in as gets deleted out from under you (e.g. its outlet was removed via
 * deleteOutletPermanently()/scripts/reduce-to-one-outlet.ts) and there's no other working staff
 * account left to log in and create one from the Staff page.
 *
 * Session cookies bake in `outletId` + `staffUserId` at LOGIN time (see SessionPayload in
 * src/lib/auth/session.ts) — deleting the outlet/account those point to breaks every request
 * using that cookie (/api/outlets/default, /api/feature-flags, etc. all start failing), and
 * simply fixing the database does NOT fix an already-issued cookie. You must log out (or clear
 * cookies) and log back in fresh after running this.
 *
 * Usage:
 *   npx tsx scripts/create-superuser.ts <outletId> <email> <password> [name]
 *
 * Run `npx tsx scripts/reduce-to-one-outlet.ts` first (no args) to see valid outlet ids.
 */
async function main() {
  const [, , outletId, email, password, name] = process.argv;
  if (!outletId || !email || !password) {
    console.error('Usage: npx tsx scripts/create-superuser.ts <outletId> <email> "<password>" [name]');
    console.error("Jalankan `npx tsx scripts/reduce-to-one-outlet.ts` (tanpa argumen) dulu untuk lihat outletId yang valid.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password terlalu pendek — minimal 6 karakter.");
    process.exit(1);
  }

  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (!outlet) {
    console.error(`Outlet dengan id "${outletId}" tidak ditemukan.`);
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db.select().from(staffUsers).where(eq(staffUsers.email, normalizedEmail)).limit(1);
  if (existing) {
    console.error(
      `Email "${normalizedEmail}" sudah dipakai staff lain (${existing.name}, outlet ${existing.outletId}). ` +
        `Pakai email lain, atau reset password akun itu dengan: npx tsx scripts/reset-staff-password.ts ${normalizedEmail} "password-baru"`
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(staffUsers)
    .values({ outletId, name: name || "Superuser", email: normalizedEmail, passwordHash, role: "superuser" })
    .returning();

  await ensureOutletMembership(created.id, outletId);

  console.log(`✅ Superuser baru dibuat: ${created.name} <${normalizedEmail}> untuk outlet "${outlet.name}" (${outletId}).`);
  console.log("Login sekarang di /login dengan email & password di atas.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
