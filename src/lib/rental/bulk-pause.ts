/**
 * "Jeda semua sesi" saat listrik padam — MURNI (diuji di bulk-pause.test.ts).
 *
 * Saat mati lampu, waktu sesi di server tetap berjalan sehingga pelanggan tertagih waktu yang tidak
 * dipakai. Kasir menjeda SEMUA sesi berjalan sekaligus dari HP; semua dijeda dengan cap waktu yang
 * SAMA. Cap itulah penanda kelompoknya — tanpa kolom baru di database — sehingga "Lanjutkan semua"
 * dari perangkat mana pun (mis. PC kasir setelah listrik kembali) hanya melanjutkan sesi yang dijeda
 * bersama itu, bukan sesi yang sengaja dijeda kasir sebelumnya.
 */

export interface PausableSession {
  id: string;
  status: string;
  pausedAt: string | null;
}

export interface BulkPauseGroup {
  pausedAt: string;
  sessionIds: string[];
}

/** Kelompok jeda bersama terbaru: ≥ 2 sesi dengan pausedAt identik, atau cap yang diingat perangkat ini. */
export function latestBulkPauseGroup(sessions: PausableSession[], rememberedStamp?: string | null): BulkPauseGroup | null {
  const groups = new Map<string, string[]>();
  for (const s of sessions) {
    if (s.status !== "paused" || !s.pausedAt) continue;
    const list = groups.get(s.pausedAt) ?? [];
    list.push(s.id);
    groups.set(s.pausedAt, list);
  }
  let best: BulkPauseGroup | null = null;
  for (const [pausedAt, ids] of groups) {
    if (ids.length < 2 && pausedAt !== rememberedStamp) continue;
    if (!best || pausedAt > best.pausedAt) best = { pausedAt, sessionIds: ids };
  }
  return best;
}
