import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

// KNOWN LIMITATION: chatThreads/chatMessages have no outletId column (the WhatsApp/Instagram
// chat feature predates multi-tenancy and was never migrated — see schema.ts). This route can
// only gate on "is any staff member logged in", not "does this thread belong to their outlet".
// A real fix needs a schema migration (add outletId to chatThreads) plus mapping inbound webhook
// messages to the right outlet at ingestion time — tracked as a follow-up, not done here.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const rows = await db.select().from(chatMessages).where(eq(chatMessages.threadId, id)).orderBy(chatMessages.createdAt);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
