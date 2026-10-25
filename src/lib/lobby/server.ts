import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outletLobbySettings } from "@/db/schema";

export interface LobbySettings {
  enabled: boolean;
  announcement: string | null;
}

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = { enabled: true, announcement: null };

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "42P01" || e?.cause?.code === "42P01" || /outlet_lobby_settings/i.test(e?.message ?? "");
}

/** Pengaturan papan lobi outlet; bawaan bila belum diatur atau migrasi 0035 belum dijalankan. */
export async function getLobbySettings(outletId: string): Promise<LobbySettings & { migrationMissing?: boolean }> {
  try {
    const [row] = await db.select().from(outletLobbySettings).where(eq(outletLobbySettings.outletId, outletId)).limit(1);
    return row ? { enabled: row.enabled, announcement: row.announcement } : { ...DEFAULT_LOBBY_SETTINGS };
  } catch (err) {
    if (isMissingTable(err)) return { ...DEFAULT_LOBBY_SETTINGS, migrationMissing: true };
    throw err;
  }
}

export async function saveLobbySettings(outletId: string, s: LobbySettings, staffUserId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(outletLobbySettings)
    .values({ outletId, enabled: s.enabled, announcement: s.announcement, updatedBy: staffUserId, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: outletLobbySettings.outletId, set: { enabled: s.enabled, announcement: s.announcement, updatedBy: staffUserId, updatedAt: now } });
}
