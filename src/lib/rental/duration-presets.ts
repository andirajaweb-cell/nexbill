import { db } from "@/db/client";
import { rentalDurationPresets } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Default fixed-duration catalog seeded once per outlet — matches what was previously a hardcoded
 * DURATION_OPTIONS array in dashboard/rental/page.tsx, so every existing outlet's dropdown looks
 * identical the moment this seeds, before anyone customizes it.
 */
const STARTER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 30, label: "30 menit" },
  { minutes: 60, label: "1 jam" },
  { minutes: 90, label: "1,5 jam" },
  { minutes: 120, label: "2 jam" },
  { minutes: 180, label: "3 jam" },
  { minutes: 240, label: "4 jam" },
];

export async function ensureRentalDurationPresets(outletId: string) {
  const existing = await db.select().from(rentalDurationPresets).where(eq(rentalDurationPresets.outletId, outletId));
  if (existing.length > 0) return;
  for (let i = 0; i < STARTER_PRESETS.length; i++) {
    const p = STARTER_PRESETS[i];
    await db.insert(rentalDurationPresets).values({ outletId, minutes: p.minutes, label: p.label, isActive: true, sortOrder: i });
  }
}

/** Returns every preset (active and inactive) sorted for display — same shape as getActiveUnits/getActiveProductCategories; callers building a live picker (not the Settings CRUD table) filter isActive themselves. */
export async function getRentalDurationPresets(outletId: string) {
  await ensureRentalDurationPresets(outletId);
  return db.select().from(rentalDurationPresets).where(eq(rentalDurationPresets.outletId, outletId)).orderBy(asc(rentalDurationPresets.sortOrder));
}
