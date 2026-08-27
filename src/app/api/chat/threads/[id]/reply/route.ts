import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { chatMessages, chatThreads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

/**
 * Staff sends a manual reply (used after human handoff). This only writes the
 * outbound message + timestamp — actually delivering it to WhatsApp/Instagram
 * is done by the respective bot processes, which should poll for new
 * `sender: "staff"` outbound messages, or (simplest) staff replies directly
 * from their own WhatsApp/Instagram app once handed off.
 *
 * KNOWN LIMITATION: see /api/chat/threads/[id]/messages/route.ts — chatThreads has no outletId
 * yet, so this can only require "logged in", not "this outlet's own thread".
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const { id } = await params;
  const { body } = await req.json();
  const [row] = await db
    .insert(chatMessages)
    .values({ threadId: id, direction: "outbound", sender: "staff", body })
    .returning();
  await db.update(chatThreads).set({ lastMessageAt: new Date().toISOString() }).where(eq(chatThreads.id, id));
  return NextResponse.json(row);
}
