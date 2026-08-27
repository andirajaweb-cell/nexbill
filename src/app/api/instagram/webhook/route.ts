import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db/client";
import { chatThreads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runAgentReply } from "@/lib/ai/agent";
import { sendInstagramMessage } from "@/lib/instagram/client";
import { describeError } from "@/lib/api/error";

/** Meta webhook verification handshake (one-time, when you register the webhook URL). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.IG_VERIFY_TOKEN) {
      return new NextResponse(challenge ?? "", { status: 200 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.IG_APP_SECRET;
  if (!secret) return true; // dev mode without app secret configured
  if (!signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signatureHeader;
}

async function findOrCreateThread(igUserId: string) {
  const [existing] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.channel, "instagram"), eq(chatThreads.externalId, igUserId)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(chatThreads).values({ channel: "instagram", externalId: igUserId }).returning();
  return created;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;
      if (!senderId || !text || event.message?.is_echo) continue;

      try {
        const thread = await findOrCreateThread(senderId);
        const reply = await runAgentReply(thread.id, text);
        if (reply) await sendInstagramMessage(senderId, reply);
      } catch (err) {
        console.error("Gagal memproses DM Instagram:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
