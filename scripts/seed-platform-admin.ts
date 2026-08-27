import "dotenv/config";
import { db } from "../src/db/client";
import { platformAdmins } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * One-time provisioning for the very first /platform-admin login — there's no self-registration
 * route by design (see src/app/api/platform-admin/auth/login/route.ts), so the first account has
 * to be created directly against the database.
 *
 * Usage:
 *   npx tsx scripts/seed-platform-admin.ts "Nama Kamu" andiraja.web@gmail.com "password-kuat"
 *
 * Safe to re-run: if the email already exists, it just updates the password/name instead of
 * erroring, so this doubles as a "reset my platform admin password" tool.
 */
async function main() {
  const [, , name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: npx tsx scripts/seed-platform-admin.ts "Nama" email@example.com "password"');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.toLowerCase().trim();

  const [existing] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, normalizedEmail)).limit(1);
  if (existing) {
    await db.update(platformAdmins).set({ name, passwordHash, isActive: true, updatedAt: new Date().toISOString() }).where(eq(platformAdmins.id, existing.id));
    console.log(`Updated existing platform admin: ${normalizedEmail}`);
  } else {
    await db.insert(platformAdmins).values({ name, email: normalizedEmail, passwordHash });
    console.log(`Created platform admin: ${normalizedEmail}`);
  }
  console.log("Login di /platform-admin/login dengan email + password di atas.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
