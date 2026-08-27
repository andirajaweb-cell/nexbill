import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { setDevicePowerById } from "@/lib/devices";
import { devices } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { on } = await req.json();
  try {
    await requireOwnedRow(devices, id, "Device tidak ditemukan.");
    await setDevicePowerById(id, Boolean(on));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
