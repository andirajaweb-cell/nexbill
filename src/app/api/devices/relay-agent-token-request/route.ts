import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db/client";
import { outlets, relayAgents, supportThreads, supportMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Fully self-service Relay Agent (Android TV) token issuance — the automated counterpart to the
 * platform-admin's own manual "Buat Relay Agent Baru" flow (see /api/platform-admin/relay-agents).
 * Triggered by the "Minta Token Relay Agent" button in dashboard/devices/setup-guide.tsx.
 *
 * No platform-admin action required: this mints the token, creates the relay_agents row, opens a
 * support ticket documenting the request, and immediately posts the token into that SAME ticket as
 * an auto-reply — so "delivery via tiket" happens synchronously in this one request, not whenever
 * a human next checks the inbox.
 *
 * One token per outlet, ever, via this self-service path — a second click is rejected outright
 * (checked by relay_agents row existence, not a separate counter, so it self-resets the moment a
 * platform admin deletes that outlet's agent from /platform-admin/relay-agents: that delete IS the
 * "customer service" escape hatch this route's rejection message points outlets toward). An outlet
 * that genuinely needs a second/third agent (e.g. a second PC/TV) still gets one the normal way —
 * platform-admin creating it manually never goes through this one-per-outlet gate at all.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const [existing] = await db.select({ id: relayAgents.id }).from(relayAgents).where(eq(relayAgents.outletId, session.outletId)).limit(1);
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Outlet ini sudah pernah meminta token Relay Agent sebelumnya. Untuk token baru (mis. TV/PC kedua, atau token sebelumnya hilang), silakan minta lewat menu Chat/Bantuan (Customer Service) — bukan lewat tombol ini lagi.",
        },
        { status: 400 }
      );
    }

    const [outlet] = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const token = randomBytes(24).toString("hex");
    const [agent] = await db.insert(relayAgents).values({ outletId: outlet.id, name: `${outlet.name} — Relay Agent`, token }).returning();

    const now = new Date().toISOString();
    const [thread] = await db
      .insert(supportThreads)
      .values({
        outletId: outlet.id,
        subject: "Token Relay Agent (TV)",
        category: "kendala_teknis",
        status: "resolved", // fulfilled instantly below — nothing left for a human to action
        lastMessageAt: now,
      })
      .returning();
    await db.insert(supportMessages).values({
      threadId: thread.id,
      sender: "outlet",
      senderName: session.name,
      body: "Halo tim NEXBILL, saya ingin mengaktifkan kontrol TV (Android/Google TV) untuk outlet ini. Mohon dibuatkan token Relay Agent-nya. Terima kasih.",
    });
    await db.insert(supportMessages).values({
      threadId: thread.id,
      sender: "platform_admin",
      senderName: "NEXBILL (Otomatis)",
      body: `Token Relay Agent kamu sudah dibuat otomatis:\n\n${token}\n\nLangkah selanjutnya: buka halaman Devices di dashboard, buka panduan "TV (Android/Google TV) via NexbillAgent", lanjut dari Langkah 2 (unduh NexbillAgent.exe) — saat aplikasi minta "Masukkan Agent Token", tempel token di atas. Simpan baik-baik, token ini hanya ditampilkan sekali di sini dan tidak bisa diminta ulang lewat tombol yang sama.`,
    });

    return NextResponse.json({ ok: true, threadId: thread.id, agentId: agent.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
