import { db } from "@/db/client";
import { rentalUnits, outlets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";

export interface MaintenanceStatus {
  hoursSinceService: number;
  thresholdHours: number;
  isDue: boolean;
  overdueHours: number;
}

/**
 * Predictive maintenance — how many hours of real play-time a unit has accumulated since it was
 * last marked serviced, compared against its threshold (per-unit override in
 * rentalUnits.maintenanceThresholdHours, falling back to the outlet's
 * defaultMaintenanceThresholdHours). Usage is tracked in stopRentalSession() (lib/rental/sessions.ts)
 * as raw elapsed minutes — NOT the billing-rounded amount — since maintenance cares about actual
 * physical wear (controller drift, thermal paste, HDMI port), not what the customer was billed for.
 */
export function computeMaintenanceStatus(
  unit: Pick<typeof rentalUnits.$inferSelect, "totalUsageMinutes" | "usageMinutesAtLastService" | "maintenanceThresholdHours">,
  outlet: Pick<typeof outlets.$inferSelect, "defaultMaintenanceThresholdHours"> | undefined
): MaintenanceStatus {
  const minutesSinceService = Math.max(0, unit.totalUsageMinutes - unit.usageMinutesAtLastService);
  const hoursSinceService = Math.round((minutesSinceService / 60) * 10) / 10;
  const thresholdHours = unit.maintenanceThresholdHours ?? outlet?.defaultMaintenanceThresholdHours ?? 300;
  const overdueHours = Math.max(0, Math.round((hoursSinceService - thresholdHours) * 10) / 10);
  return { hoursSinceService, thresholdHours, isDue: hoursSinceService >= thresholdHours, overdueHours };
}

/**
 * Every active unit in an outlet currently due for maintenance, with its computed status attached
 * — shared by the notification bell (lib/notifications/index.ts) and the rental dashboard's GET
 * /api/rental-units response so both read the exact same threshold logic.
 */
export async function listUnitsNeedingMaintenance(outletId: string) {
  const [outlet] = await db
    .select({ defaultMaintenanceThresholdHours: outlets.defaultMaintenanceThresholdHours })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);
  const units = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  return units.map((u) => ({ unit: u, status: computeMaintenanceStatus(u, outlet) })).filter((r) => r.status.isDue);
}

/**
 * Marks a unit as freshly serviced — snapshots its current cumulative usage as the new baseline so
 * "hours since service" resets to 0 without zeroing totalUsageMinutes itself (that all-time figure
 * stays useful for the unit-performance report in lib/reports/operational.ts).
 */
export async function markUnitServiced(unitId: string, outletId: string, staffUserId?: string) {
  const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, unitId)).limit(1);
  if (!unit || unit.outletId !== outletId) throw new Error("Unit tidak ditemukan.");

  const [updated] = await db
    .update(rentalUnits)
    .set({ usageMinutesAtLastService: unit.totalUsageMinutes, lastServicedAt: new Date().toISOString() })
    .where(eq(rentalUnits.id, unitId))
    .returning();

  await logAudit({
    outletId,
    staffUserId,
    action: "mark_unit_serviced",
    entityType: "rental_unit",
    entityId: unitId,
    before: { usageMinutesAtLastService: unit.usageMinutesAtLastService, totalUsageMinutes: unit.totalUsageMinutes },
    after: { usageMinutesAtLastService: updated.usageMinutesAtLastService, lastServicedAt: updated.lastServicedAt },
  });
  return updated;
}
