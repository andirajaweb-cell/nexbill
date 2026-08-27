import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { refreshRatesFromApi } from "@/lib/market-risk/currency";

/**
 * Pulls fresh apiRateIdrPerUnit for every active currency from the external FX API (see
 * lib/market-risk/currency.ts for the provider + fallback behavior). Manual overrides and
 * markup% are untouched by this — it only refreshes the underlying reference rate that the
 * markup gets applied on top of.
 */
export async function POST() {
  try {
    const session = await requirePlatformAdmin();
    const result = await refreshRatesFromApi(session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
