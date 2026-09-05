import { db } from "@/db/client";
import { productCategories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Default product-category catalog seeded once per outlet, matching the fixed 10-value enum
 * this table replaced (food/drink/coffee/snack/dessert/merchandise/accessory/device_rental/
 * raw_material/other) — see schema.ts's productCategories comment. Keeping the same `code`
 * values means every product created before this change keeps resolving to a real, renamable
 * category row instead of becoming an orphaned/unrecognized category on day one.
 */
const STARTER_CATEGORIES: { code: string; label: string }[] = [
  { code: "food", label: "Makanan" },
  { code: "drink", label: "Minuman" },
  { code: "coffee", label: "Kopi" },
  { code: "snack", label: "Snack" },
  { code: "dessert", label: "Dessert" },
  { code: "merchandise", label: "Merchandise" },
  { code: "accessory", label: "Aksesoris (Jual)" },
  { code: "device_rental", label: "Sewa Perangkat" },
  { code: "raw_material", label: "Bahan Baku" },
  { code: "other", label: "Lainnya" },
];

export async function ensureProductCategories(outletId: string) {
  const existing = await db.select().from(productCategories).where(eq(productCategories.outletId, outletId));
  if (existing.length > 0) return;
  for (let i = 0; i < STARTER_CATEGORIES.length; i++) {
    const c = STARTER_CATEGORIES[i];
    await db.insert(productCategories).values({ outletId, code: c.code, label: c.label, isActive: true, sortOrder: i });
  }
}

export async function getActiveProductCategories(outletId: string) {
  await ensureProductCategories(outletId);
  return db.select().from(productCategories).where(eq(productCategories.outletId, outletId)).orderBy(asc(productCategories.sortOrder));
}

export function slugifyCategoryCode(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "kategori"
  );
}
