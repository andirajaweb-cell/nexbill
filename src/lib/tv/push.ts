/**
 * Kontrol TV instan: setiap perubahan sesi/unit di dashboard "mencolek" layar NEXBILL TV unit itu
 * lewat Supabase Realtime Broadcast (REST, tanpa koneksi permanen di server). Halaman /tv di TV
 * mendengarkan kanalnya dan langsung mengambil /api/tv/state + memberi tahu aplikasi Android
 * (NexbillTvApp.poke) — jadi mulai/jeda/perpanjang/selesai terasa < 1 detik, bukan sampai 5 detik.
 *
 * Polling 5 detik TETAP berjalan sebagai jaring pengaman: colekan yang gagal (Realtime mati, env
 * belum diisi, TV di mode "Pindah input TV") hanya membuat TV kembali ke kecepatan lama.
 * Tidak pernah melempar error ke pemanggil dan dibatasi 2,5 detik.
 */
import { createHash } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { tvScreens } from "@/db/schema";
import { topicFromHashHex, TV_PUSH_EVENT } from "./push-topic";

export function tvTopicForToken(token: string): string {
  return topicFromHashHex(createHash("sha256").update(`nexbill-tv-push:${token}`).digest("hex"));
}

function realtimeConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

async function broadcast(tokens: string[]) {
  const cfg = realtimeConfig();
  if (!cfg || tokens.length === 0) return;
  const messages = [...new Set(tokens)].map((t) => ({ topic: tvTopicForToken(t), event: TV_PUSH_EVENT, payload: { at: Date.now() }, private: false }));
  try {
    await fetch(`${cfg.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (err) {
    console.warn("[tv-push] colekan gagal (TV tetap memakai polling 5 detik):", (err as Error)?.message ?? err);
  }
}

/** Colek layar TV milik unit-unit ini (status sesi/unit berubah). */
export async function pokeTvUnits(unitIds: Array<string | null | undefined>): Promise<void> {
  try {
    const ids = [...new Set(unitIds.filter((v): v is string => !!v))];
    if (ids.length === 0 || !realtimeConfig()) return;
    const rows = await db
      .select({ token: tvScreens.token })
      .from(tvScreens)
      .where(and(inArray(tvScreens.rentalUnitId, ids), eq(tvScreens.isActive, true)));
    await broadcast(rows.map((r) => r.token));
  } catch (err) {
    console.warn("[tv-push] gagal mencolek TV:", (err as Error)?.message ?? err);
  }
}

/** Colek semua layar outlet (pengaturan screensaver berubah). */
export async function pokeTvOutlet(outletId: string): Promise<void> {
  try {
    if (!realtimeConfig()) return;
    const rows = await db.select({ token: tvScreens.token }).from(tvScreens).where(eq(tvScreens.outletId, outletId));
    await broadcast(rows.map((r) => r.token));
  } catch (err) {
    console.warn("[tv-push] gagal mencolek TV outlet:", (err as Error)?.message ?? err);
  }
}
