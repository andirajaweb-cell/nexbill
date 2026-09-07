import { db } from "@/db/client";
import { productCategories } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

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
  { code: "sparepart", label: "Sparepart & Komponen" },
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
  // ensureSparePartCategory calls ensureProductCategories itself first, so this one call covers
  // both: seed the full starter list for a brand-new outlet, or just backfill "sparepart" alone
  // for an outlet whose categories were already seeded before that category existed — see its
  // comment below. Means every page listing categories (Inventory Control's picker, Maintenance's
  // spare-parts picker, etc.) gets "Sparepart & Komponen" with no dependency on visit order.
  await ensureSparePartCategory(outletId);
  return db.select().from(productCategories).where(eq(productCategories.outletId, outletId)).orderBy(asc(productCategories.sortOrder));
}

/**
 * Ensures the "sparepart" category exists for outlets that were created (and already had their
 * starter categories seeded) BEFORE it was added to STARTER_CATEGORIES above — ensureProductCategories
 * only seeds the whole starter list once, so an existing outlet's categories list would otherwise
 * never pick up a value added to that list later. Called from the Maintenance page's spare-parts
 * picker so both old and new outlets end up with the category with no manual setup step.
 */
export async function ensureSparePartCategory(outletId: string) {
  await ensureProductCategories(outletId);
  const [existing] = await db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.outletId, outletId), eq(productCategories.code, "sparepart")))
    .limit(1);
  if (existing) return existing;

  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: sql<number>`COALESCE(MAX(${productCategories.sortOrder}), -1)` })
    .from(productCategories)
    .where(eq(productCategories.outletId, outletId));
  const [created] = await db
    .insert(productCategories)
    .values({ outletId, code: "sparepart", label: "Sparepart & Komponen", isActive: true, sortOrder: maxSortOrder + 1 })
    .returning();
  return created;
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
