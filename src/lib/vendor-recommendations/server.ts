import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { platformVendorRecommendationEvents } from "@/db/schema";
import { hasPermission, isFullAuthorityRole, type StaffRole } from "@/lib/auth/permissions";
import { IMPRESSION_DEDUPE_HOURS, type VendorRecEvent } from "./core";

/** Kartu rekomendasi hanya untuk pengambil keputusan outlet (Owner/Manager), bukan kasir/dapur. */
export function canSeeVendorRecs(role: string): boolean {
  return isFullAuthorityRole(role as StaffRole) || hasPermission(role as StaffRole, "view_dashboard_owner");
}

/** Tabel belum dibuat (migrasi 0034 belum dijalankan) — fitur ini diam saja, halaman tetap jalan. */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "42P01" || e?.cause?.code === "42P01" || /relation .*platform_vendor_recommendation/i.test(e?.message ?? "");
}

/** Catat satu event. Impression di-dedupe: maks. sekali per outlet per IMPRESSION_DEDUPE_HOURS. */
export async function recordVendorRecEvent(input: {
  recommendationId: string;
  outletId: string | null;
  staffUserId: string | null;
  event: VendorRecEvent;
  target?: string | null;
}): Promise<boolean> {
  if (input.event === "impression" && input.outletId) {
    const since = new Date(Date.now() - IMPRESSION_DEDUPE_HOURS * 3600_000).toISOString();
    const [dup] = await db
      .select({ id: platformVendorRecommendationEvents.id })
      .from(platformVendorRecommendationEvents)
      .where(
        and(
          eq(platformVendorRecommendationEvents.recommendationId, input.recommendationId),
          eq(platformVendorRecommendationEvents.outletId, input.outletId),
          eq(platformVendorRecommendationEvents.event, "impression"),
          gte(platformVendorRecommendationEvents.createdAt, since)
        )
      )
      .limit(1);
    if (dup) return false;
  }
  await db.insert(platformVendorRecommendationEvents).values({
    recommendationId: input.recommendationId,
    outletId: input.outletId,
    staffUserId: input.staffUserId,
    event: input.event,
    target: input.target ?? null,
  });
  return true;
}
