/**
 * Pengurai jadwal liga utama Indonesia dari situs resmi operator liga (PT Liga Indonesia Baru,
 * ligaindonesiabaru.com) — aturan murni, diuji di lib-rules.test.ts dengan potongan HTML asli.
 *
 * Kenapa sumber ini: situs resmi operator liga, halaman dirender di server, dan robots.txt-nya
 * mengizinkan pengambilan umum (`User-agent: * Allow: /`, dicek 2026-10-28). Sumber lain yang diminta
 * ditolak: footy.id membalas 403, livescore.in melarang scraping & penggunaan komersial di Ketentuan
 * Penggunaannya (pasal 2.2, 2.9, 2.10).
 *
 * Yang diambil HANYA jadwal (tanggal, jam kick-off WIB, tim, stadion). Struktur halaman (2026-10-28):
 *   <div class="col-md-12">Sabtu, 24 Oktober 2026</div>
 *   <a class="table-row" href="…/result/detail/BRI_SUPER_LEAGUE_2026-27/2026-10-30/JAVA_UNITED_FC/BHAYANGKARA_PRESISI_LAMPUNG_FC">
 *     … <b>JAVA UNITED FC</b> … <span class="badge …">15:30</span> … <b>BHAYANGKARA PRESISI LAMPUNG FC</b>
 *     … <td width="30%" align="left">Jatidiri</td> …
 *   </a>
 * Pertandingan selesai: badge "<span …>FT</span> 0:0" — TIDAK berisi jam kick-off, jadi tidak dibuat baris
 * baru (jam tidak dikarang); baris yang sudah tersimpan dari sinkron sebelumnya hanya ditandai selesai.
 */

export const LIB_LEAGUE_ID = "id-super-league";
export const LIB_COUNTRY = "Indonesia";
/** Jam di situs operator liga ditulis dalam WIB (UTC+7). */
const WIB_OFFSET_HOURS = 7;

export interface LibFixture {
  matchId: string;
  competition: string;
  date: string;
  /** Null bila halaman tidak menulis jam (mis. pertandingan selesai). */
  kickoffUtc: string | null;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  finished: boolean;
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "PSS_SLEMAN_" → "PSS SLEMAN" (cadangan bila nama tebal tidak ada). */
function slugName(slug: string): string {
  return decodeURIComponent(slug).replace(/_+/g, " ").trim();
}

/** Nama kompetisi yang mudah dibaca: "BRI_SUPER_LEAGUE_2026-27" → "BRI Super League 2026-27". */
export function competitionLabel(code: string): string {
  return code
    .split("_")
    .map((w) => (/^\d/.test(w) || w === "BRI" ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

/** Kode kompetisi liga utama + pekan berjalan dari tautan "Jadwal" di beranda situs. */
export function parseCurrentWeek(html: string): { competition: string; week: number } | null {
  const re = /\/fixtures\/index\/([A-Z0-9_\-]*SUPER_LEAGUE[A-Z0-9_\-]*)\/(\d{1,2})\/0/g;
  const m = re.exec(html);
  if (!m) return null;
  return { competition: m[1], week: Number(m[2]) };
}

/** WIB "YYYY-MM-DD" + "HH:MM" → ISO UTC. */
export function wibToUtc(date: string, hhmm: string): string | null {
  const t = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const h = Number(t[1]);
  const mi = Number(t[2]);
  if (h > 23 || mi > 59) return null;
  const d = new Date(`${date}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCHours(d.getUTCHours() - WIB_OFFSET_HOURS);
  return d.toISOString();
}

/** Semua pertandingan di satu halaman pekan. */
export function parseFixturesPage(html: string): LibFixture[] {
  const out: LibFixture[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="[^"]*\/result\/detail\/([A-Z0-9_\-]+)\/(\d{4}-\d{2}-\d{2})\/([^/"]+)\/([^/"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, competition, date, homeSlug, awaySlug, inner] = m;
    const bolds = [...inner.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((x) => decode(x[1])).filter(Boolean);
    const homeTeam = bolds[0] || slugName(homeSlug);
    const awayTeam = bolds[1] || slugName(awaySlug);
    const badge = /<span[^>]*class="[^"]*badge[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/td>/.exec(inner)?.[1] ?? "";
    const badgeText = decode(badge);
    const finished = /\bFT\b/i.test(badgeText);
    const time = !finished ? /\b(\d{1,2}:\d{2})\b/.exec(badgeText)?.[1] ?? null : null;
    const venueCell = /<td[^>]*width="30%"[^>]*>([\s\S]*?)<\/td>/.exec(inner)?.[1];
    const venue = venueCell ? decode(venueCell) || null : null;
    const matchId = `lib:${competition}:${date}:${homeSlug}:${awaySlug}`.slice(0, 200);
    if (seen.has(matchId) || !homeTeam || !awayTeam) continue;
    seen.add(matchId);
    out.push({ matchId, competition, date, kickoffUtc: time ? wibToUtc(date, time) : null, homeTeam, awayTeam, venue, finished });
  }
  return out;
}

/** Sinkron jadwal tiap 12 jam (jadwal liga jarang berubah); jeda 1 jam setelah gagal. */
export const LIB_SYNC_EVERY_MS = 12 * 3600_000;
export const LIB_RETRY_AFTER_FAIL_MS = 60 * 60_000;
/** Pekan yang diambil di sekitar pekan berjalan: 1 sebelumnya s.d. 4 sesudahnya. */
export const LIB_WEEKS_BEFORE = 1;
export const LIB_WEEKS_AFTER = 4;
/** Jeda antar-halaman — sopan ke server operator liga. */
export const LIB_REQUEST_GAP_MS = 1500;

export function libNeedsSync(lastSuccessAt: string | null, lastAttemptAt: string | null, lastErrorAt: string | null, now = Date.now()): boolean {
  if (lastErrorAt && lastAttemptAt && lastErrorAt >= lastAttemptAt && now - new Date(lastAttemptAt).getTime() < LIB_RETRY_AFTER_FAIL_MS) return false;
  if (!lastSuccessAt) return true;
  return now - new Date(lastSuccessAt).getTime() > LIB_SYNC_EVERY_MS;
}
