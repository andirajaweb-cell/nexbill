import { db } from "@/db/client";
import { units } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Default unit-of-measure catalog seeded once per outlet, matching the
 * examples the business asked for (pcs, gram, kg, unit, dll) plus a few
 * common F&B/retail units so the Resep/BOM ingredient picker isn't empty
 * on day one.
 */
const STARTER_UNITS: { code: string; label: string }[] = [
  { code: "pcs", label: "Pcs" },
  { code: "gram", label: "Gram" },
  { code: "kg", label: "Kilogram (kg)" },
  { code: "ml", label: "Mililiter (ml)" },
  { code: "liter", label: "Liter" },
  { code: "box", label: "Box" },
  { code: "pack", label: "Pack" },
  { code: "unit", label: "Unit" },
  { code: "lainnya", label: "Lainnya" },
];

export async function ensureUnits(outletId: string) {
  const existing = await db.select().from(units).where(eq(units.outletId, outletId));
  if (existing.length > 0) return;
  for (let i = 0; i < STARTER_UNITS.length; i++) {
    const u = STARTER_UNITS[i];
    await db.insert(units).values({ outletId, code: u.code, label: u.label, isActive: true, sortOrder: i });
  }
}

export async function getActiveUnits(outletId: string) {
  await ensureUnits(outletId);
  return db.select().from(units).where(eq(units.outletId, outletId)).orderBy(asc(units.sortOrder));
}

export function slugifyUnitCode(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "satuan"
  );
}
