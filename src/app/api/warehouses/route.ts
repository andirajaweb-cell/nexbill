import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(warehouses).where(eq(warehouses.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
