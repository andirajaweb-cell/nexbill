import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Lowercase, hyphenated, URL-safe — strips anything that isn't a-z/0-9, collapses runs of
 * separators into a single hyphen, trims leading/trailing hyphens. Empty/all-symbol names
 * (rare, but a merchant could technically name their outlet "!!!") fall back to "outlet" so
 * there's always something to slugify from. */
export function slugify(name: string): string {
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

/**
 * Deliberate manual slug change, triggered from Settings (see BookingLinkShare in
 * dashboard/settings/page.tsx) — NOT auto-run whenever the outlet's name changes.
 *
 * Why not auto-sync on every name edit: the /book/[slug] link is meant to be shared publicly
 * (printed on receipts, posted on social media — see the receiptFooterText field right next to
 * it in Settings). Silently rewriting the slug every time an owner tweaks their business name in
 * Settings would quietly 404 every link they'd already handed out, with no warning. So the slug
 * only ever changes when someone explicitly asks for it here, after seeing a "old links stop
 * working" confirmation client-side (see showConfirm() call in BookingLinkShare).
 *
 * This is also the fix for outlets whose slug got auto-generated from a placeholder/test name
 * early on (e.g. "x") and never caught up after the real business name was set — previously the
 * only way to fix that was a manual DB edit.
 */
export async function setOutletSlug(outletId: string, desiredRaw: string): Promise<string> {
  const desired = slugify(desiredRaw);
  const [taken] = await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.slug, desired)).limit(1);
  if (taken && taken.id !== outletId) {
    throw new Error(`Link "/book/${desired}" sudah dipakai outlet lain — coba nama lain.`);
  }
  await db.update(outlets).set({ slug: desired }).where(eq(outlets.id, outletId));
  return desired;
}
