import "dotenv/config";
import { db } from "../src/db/client";
import { staffUsers } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Self-service password reset for a staff account (superuser/owner/etc.) — for when nobody with
 * manage_staff access is left who can reset it from the Staff page's UI. Direct DB write, same
 * pattern as seed-platform-admin.ts.
 *
 * Usage:
 *   npx tsx scripts/reset-staff-password.ts owner@rentalps.local "password-baru-yang-kuat"
 */
async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-staff-password.ts email@outlet.com "password-baru"');
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error("Password terlalu pendek — minimal 6 karakter.");
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const [user] = await db.select().from(staffUsers).where(eq(staffUsers.email, normalizedEmail)).limit(1);
  if (!user) {
    console.error(`Tidak ada staff dengan email "${normalizedEmail}".`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(staffUsers).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(staffUsers.id, user.id));

  console.log(`Password untuk ${user.name} <${normalizedEmail}> (role: ${user.role}) berhasil direset.`);
  console.log("Login sekarang di /login dengan password baru di atas.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
