import { db } from "@/db/client";
import { loyaltyPlayPointRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type ConsoleType = "ps2" | "ps3" | "ps4" | "ps4_pro" | "ps5" | "ps5_slim" | "ps6" | "wii" | "xbox" | "driving_simulator";

/**
 * Default play-point rates (points awarded per finished, fully-paid rental session), keyed by
 * console type. Explicit rates from the business spec: PS4 = 1, PS3 = 3, PS5 = 1.5. ps4_pro/ps5_slim
 * are variants of ps4/ps5 so they inherit the same rate; ps2 is treated like ps3 (oldest tier,
 * same "reward playing on older consoles" incentive) — these three weren't specified explicitly
 * and can be overridden per outlet via loyaltyPlayPointRates (Admin Data > Rate Poin Main). ps6 is
 * newer than ps5, so it gets a slightly richer default rate — also overridable per outlet.
 * wii/xbox/driving_simulator are new additions with no spec'd rate either — wii follows the
 * older/family-console tier (like ps2/ps3), xbox follows the modern-console tier (like ps4), and
 * driving_simulator is treated as the rarer/premium attraction (like ps6). All overridable per
 * outlet the same way.
 */
export const DEFAULT_PLAY_POINTS: Record<ConsoleType, number> = {
  ps2: 3,
  ps3: 3,
  ps4: 1,
  ps4_pro: 1,
  ps5: 1.5,
  ps5_slim: 1.5,
  ps6: 2,
  wii: 3,
  xbox: 1,
  driving_simulator: 2,
};

export async function getPlayPoints(outletId: string, consoleType: string): Promise<number> {
  const ct = consoleType as ConsoleType;
  const [row] = await db
    .select({ pointsPerSession: loyaltyPlayPointRates.pointsPerSession })
    .from(loyaltyPlayPointRates)
    .where(and(eq(loyaltyPlayPointRates.outletId, outletId), eq(loyaltyPlayPointRates.consoleType, ct)))
    .limit(1);
  if (row) return row.pointsPerSession;
  return DEFAULT_PLAY_POINTS[ct] ?? 0;
}
