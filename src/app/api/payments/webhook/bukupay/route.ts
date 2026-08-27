import { NextRequest, NextResponse } from "next/server";
import { markPaymentByProviderRef } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const providerRef = payload.id ?? payload.reference;
  const status = payload.status === "success" ? "success" : "failed";
  await markPaymentByProviderRef(providerRef, status);
  return NextResponse.json({ ok: true });
}
