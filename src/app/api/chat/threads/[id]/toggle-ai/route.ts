import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { chatThreads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

// KNOWN LIMITATION: see /api/chat/threads/[id]/messages/route.ts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const { id } = await params;
  const { aiEnabled } = await req.json();
  const [row] = await db.update(chatThreads).set({ aiEnabled }).where(eq(chatThreads.id, id)).returning();
  return NextResponse.json(row);
}
