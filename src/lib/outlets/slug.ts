import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Lowercase, hyphenated, URL-safe — strips anything that isn't a-z/0-9, collapses runs of
 * separators into a single hyphen, trims leading/trailing hyphens. Empty/all-symbol names
 * (rare, but a merchant could technically name their outlet "!!!") fall back to "outlet" so
 * there's always something to slugify from. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents (post-NFKD combining marks)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "outlet";
}

/**
 * Ensures the given outlet has a slug (the public identifier used in its /book/[slug] link),
 * generating and persisting one from the outlet's name if it doesn't already have one. Safe to
 * call on every read — a no-op (single SELECT) once a slug exists. This is the lazy self-heal
 * for existing outlets that predate the slug column, mirroring this app's established pattern
 * (see the subscription lifecycle in lib/subscription/service.ts) rather than requiring a
 * one-off backfill migration script the operator has to remember to run.
 */
export async function ensureOutletSlug(outletId: string): Promise<string> {
  const [row] = await db.select({ id: outlets.id, name: outlets.name, slug: outlets.slug }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (!row) throw new Error("Outlet tidak ditemukan.");
  if (row.slug) return row.slug;

  const base = slugify(row.name);
  let candidate = base;
  let suffix = 0;
  // Collision loop: base name first, then base-2, base-3, ... A small bounded number of
  // attempts is plenty in practice (two outlets sharing an exact name is rare, three+ is
  // rarer still) — the final fallback below guarantees termination regardless.
  for (let attempts = 0; attempts < 20; attempts++) {
    const [existing] = await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.slug, candidate)).limit(1);
    if (!existing) break;
    suffix++;
    candidate = `${base}-${suffix + 1}`;
  }
  // Extremely unlikely fallback if 20 attempts all collided — append part of the outlet's own
  // id so it's guaranteed unique without another DB round trip.
  const [stillTaken] = await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.slug, candidate)).limit(1);
  if (stillTaken) candidate = `${base}-${outletId.slice(0, 6)}`;

  await db.update(outlets).set({ slug: candidate }).where(eq(outlets.id, outletId));
  return candidate;
}
