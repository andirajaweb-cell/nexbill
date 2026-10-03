import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { changeSubscriptionPlan } from "@/lib/subscription/service";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Ganti paket (Starter ⇄ Pro), ubah kuota unit Starter, atau ganti siklus bulanan/tahunan untuk
 * outlet yang sudah berlangganan. Body: { planCode: "starter" | "pro", billingCycle?: "monthly" |
 * "annual", units?: number }. Naik paket/tambah kuota → invoice prorata; selebihnya berlaku di
 * perpanjangan berikutnya. Lihat changeSubscriptionPlan di lib/subscription/service.ts.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Owner yang bisa mengatur langganan." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const result = await changeSubscriptionPlan(session.outletId, {
      planCode: String(body.planCode ?? ""),
      billingCycle: body.billingCycle === "annual" ? "annual" : body.billingCycle === "monthly" ? "monthly" : undefined,
      units: Number(body.units) || undefined,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
