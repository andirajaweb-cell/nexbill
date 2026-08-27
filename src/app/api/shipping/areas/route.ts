import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { searchAreas } from "@/lib/shipping/biteship";
import { describeError } from "@/lib/api/error";

/** Autocomplete for the destination district when a merchant is filling in a Smart Plug
 * shipping address on the Billing page — see BillingFaq's sibling shipping form. Any logged-in
 * staff can query this (it's just an address lookup, no money involved), but only "manage_settings"
 * can actually checkout — enforced separately in /api/subscription/checkout. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q") || "";
    const areas = await searchAreas(q);
    return NextResponse.json({ areas });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
