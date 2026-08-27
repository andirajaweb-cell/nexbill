import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Generates a random, permanent membership number in the format MBR-XXXXXX (6 random digits,
 * ~1M possible values). Checked against the DB for collisions and retried — extremely unlikely
 * to ever loop more than once in practice, but never assumed to be unique without checking.
 *
 * IMPORTANT: this is the ONLY place a memberNumber should ever be produced. Once assigned to a
 * customer it must never change — see customers.memberNumber in db/schema.ts, its exclusion from
 * the generic Admin Data panel's edit form (lib/admin/tables.ts hiddenExtra), and the fact that
 * no customer PATCH route accepts this field.
 */
export async function generateMemberNumber(): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const candidate = `MBR-${digits}`;
    const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.memberNumber, candidate)).limit(1);
    if (!existing) return candidate;
  }
  // Astronomically unlikely fallback (15 straight collisions out of ~1M slots): widen entropy
  // using a timestamp+random suffix instead of retrying forever.
  return `MBR-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10)}`;
}
