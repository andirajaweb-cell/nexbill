/**
 * Nama kanal "colek" (poke) NEXBILL TV — dipakai server (lib/tv/push.ts) dan halaman /tv (browser).
 * Diturunkan dari token layar lewat SHA-256, jadi hanya TV yang memegang token itu yang tahu namanya;
 * isinya pun kosong (hanya tanda "ambil status sekarang"), tidak ada data outlet yang lewat.
 */
export const TV_PUSH_EVENT = "poke";

export function topicFromHashHex(hex: string): string {
  return `nbtv-${hex.slice(0, 32)}`;
}

/** Versi browser (Web Crypto) — halaman /tv. */
export async function tvTopicBrowser(token: string): Promise<string | null> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`nexbill-tv-push:${token}`));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return topicFromHashHex(hex);
  } catch {
    return null;
  }
}
