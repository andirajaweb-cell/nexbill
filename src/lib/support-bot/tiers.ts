/**
 * Support 3 tingkat NEXBILL — aturan murni (tanpa DB/AI/Telegram). Diuji di tiers.test.ts.
 *
 *   Tingkat 1  FAQ tanpa AI   : jawaban bawaan + Jawaban Bot + panduan, HANYA bila cocoknya yakin. Gratis.
 *   Tingkat 2  Claude Haiku   : bila merchant menekan "Belum terselesaikan", FAQ tidak yakin, atau
 *                               masalahnya spesifik akun (perlu membaca status akun).
 *   Tingkat 3  Staf jaga      : bila AI meneruskan ke tim, merchant minta bicara dengan tim, atau darurat.
 *
 * Gaya: merchant berbicara dengan "Tim Support NEXBILL" — hangat, empatik, solutif, jujur. Bot tidak
 * berpura-pura manusia: bila ditanya, ia mengaku asisten otomatis tim NEXBILL dan menawarkan staf.
 */
import { isUrgentText } from "@/lib/telegram/support-rules";
import { scoreChunk, stemId, tokenize, type KnowledgeChunk } from "./knowledge-rules";

export type Intent = "urgent" | "human" | "greeting" | "thanks" | "not_resolved" | "vague" | "is_bot" | "question";

const HUMAN_RE = /\b(bicara|ngobrol|hubungi|sambungkan|minta|mau)\b.{0,25}\b(tim|staf|staff|admin|cs|orang|manusia|operator|petugas)\b|\b(talk|speak)\b.{0,20}\b(human|person|agent|staff|team)\b|^\/tim\b/i;
const GREETING_RE =
  /^(halo+|hai+|hallo|hello|hi+|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|assalamu.?alaikum|permisi|p+|min|kak|gan)([\s,]+(kak|kakak|min|admin|gan|bang|mas|mbak|tim|nexbill|cs|semua))*[\s!.,?🙏]*$/i;
const THANKS_RE = /^(ok(e|ay)?|sip+|siap|mantap|makasih|terima ?kasih|thanks?|thank you|thx|tq|ty|beres|done|sudah bisa|udah bisa|berhasil)[\s!.,?🙏👍]*$/i;
const NOT_RESOLVED_RE = /\b(belum|masih|tetap|tetep|tidak|gak|ga|nggak|enggak|ndak)\b.{0,20}\b(bisa|berhasil|jalan|muncul|nyala|work|beres|terselesaikan|solved)\b|\bmasih (error|gagal|sama|belum)\b|\b(not|still) (working|solved|fixed)\b/i;
const IS_BOT_RE = /\b(ini|kamu|anda)\b.{0,15}\b(bot|robot|ai|mesin|otomatis)\b|\b(are you|is this) (a )?(bot|robot|ai|human)\b|\bmanusia (atau|apa) (bot|robot)\b/i;
const FRUSTRATED_RE = /(!{2,}|\b(kecewa|parah|kesal|kesel|marah|lama banget|lama sekali|gimana sih|kok gini|ribet|payah|rugi|komplain|kapok)\b)/i;

export function isFrustrated(text: string): boolean {
  return FRUSTRATED_RE.test(text);
}

/** Niat pesan merchant — menentukan tingkat yang dipakai. Urutan pemeriksaan penting. */
export function detectIntent(text: string): Intent {
  const t = text.trim();
  if (isUrgentText(t)) return "urgent";
  if (HUMAN_RE.test(t)) return "human";
  if (IS_BOT_RE.test(t)) return "is_bot";
  if (GREETING_RE.test(t)) return "greeting";
  if (THANKS_RE.test(t)) return "thanks";
  if (NOT_RESOLVED_RE.test(t) && tokenize(t).length <= 6) return "not_resolved";
  if (tokenize(t).filter((w) => !VAGUE_WORDS.has(w)).length < 2) return "vague";
  return "question";
}

/** Kata yang tidak membawa topik ("caranya bagaimana", "tolong bantu setting"). */
const VAGUE_WORDS = new Set(
  "caranya gimana gmn bgmn tolong bantu bantuannya bantuin mohon min kak gan dong ya yah nih sih kok setting setingan atur pakai pake gunakan error masalah kendala help please pls bantuan".split(" ").map(stemId)
);

export interface Tier1Match {
  chunk: KnowledgeChunk;
  score: number;
  coverage: number;
  confident: boolean;
}

/** Ambang yakin tingkat 1 — di bawah ini pertanyaan langsung ke tingkat 2 (lebih baik daripada jawaban salah). */
export const TIER1_MIN_SCORE = 2;
export const TIER1_MIN_COVERAGE = 0.6;
export const TIER1_MIN_MARGIN = 0.5;

/** Jawaban FAQ terbaik + seberapa yakin. Coverage = porsi kata kunci pertanyaan yang ada di jawaban. */
export function tier1Match(query: string, chunks: KnowledgeChunk[]): Tier1Match | null {
  const q = [...new Set(tokenize(query).filter((w) => !VAGUE_WORDS.has(w)))];
  if (q.length < 2) return null;
  let best: { chunk: KnowledgeChunk; score: number } | null = null;
  let second = 0;
  for (const c of chunks) {
    // Bonus ketepatan judul: judul yang hampir semuanya cocok dengan pertanyaan = jawaban paling spesifik.
    const titleWords = [...new Set(tokenize(c.title))];
    const titleHit = titleWords.length ? titleWords.filter((w) => q.includes(w)).length / titleWords.length : 0;
    const s = scoreChunk(q, c) + 2 * titleHit;
    if (!best || s > best.score) {
      second = best?.score ?? 0;
      best = { chunk: c, score: s };
    } else if (s > second) second = s;
  }
  if (!best || best.score <= 0) return null;
  const words = new Set(tokenize(`${best.chunk.title} ${best.chunk.text}`));
  const covered = q.filter((w) => words.has(w) || (w.length >= 5 && [...words].some((x) => x.startsWith(w.slice(0, 5))))).length;
  const coverage = covered / q.length;
  // Dua jawaban sama kuat = ambigu → jangan menebak, serahkan ke tingkat 2.
  const clearWinner = best.score - second >= TIER1_MIN_MARGIN || best.score >= second * 1.15;
  return { ...best, coverage, confident: best.score >= TIER1_MIN_SCORE && coverage >= TIER1_MIN_COVERAGE && clearWinner };
}

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

/**
 * Balasan tingkat 1 bergaya tim manusia: sapaan empatik → isi jawaban → langkah berikutnya. Tanpa
 * "Sumber:" kaku; bila panduan lengkap ada, disebut secara alami. `name` = nama staf merchant.
 */
export function composeTier1Reply(match: Tier1Match, ctx: { name?: string | null; frustrated?: boolean; seed: string }): string {
  const who = ctx.name && ctx.name !== "Staf" ? ` Kak ${ctx.name.split(" ")[0]}` : "";
  const opener = ctx.frustrated
    ? pick(
        [
          `Mohon maaf atas kendalanya${who}, kami paham ini bikin repot. Kita selesaikan pelan-pelan ya:`,
          `Maaf ya${who}, pasti tidak nyaman. Coba langkah berikut dulu ya:`,
        ],
        ctx.seed
      )
    : pick([`Baik${who}, kami bantu ya.`, `Siap${who}, ini caranya:`, `Terima kasih sudah bertanya${who}.`, `Bisa${who}, begini langkahnya:`], ctx.seed);
  const title = match.chunk.title.replace(/[?.!]+$/, "");
  return `${opener}\n\n${title}:\n${match.chunk.text.replace(/\n\([^)]*\)\s*$/, "").trim()}\n\nKalau setelah dicoba masih belum beres, tekan "Belum terselesaikan" — kami cek lebih detail dengan melihat kondisi akun outletmu.`;
}

/* -------------------------------------------------------------- penanda tingkat -------------------------------------------------------------- */

export type BotTier = "faq" | "ai" | "team";

/** Langkah berikutnya bila merchant menekan "Belum terselesaikan" pada balasan tingkat ini. */
export function nextTier(current: BotTier | null): BotTier {
  if (current === "faq") return "ai";
  return "team";
}

/* -------------------------------------------------------------- rem -------------------------------------------------------------- */

/** Maks. pesan merchant per 10 menit per chat Telegram (mencegah banjir/abuse ke AI). */
export const MAX_MESSAGES_PER_10_MIN = 25;

/* -------------------------------------------------------------- tombol penilaian -------------------------------------------------------------- */

export type Feedback = "ok" | "no" | "team";

/** callback_data Telegram (maks. 64 byte): "fb:<ok|no|team>:<id pesan bot>". */
export function feedbackData(kind: Feedback, logId: string): string {
  return `fb:${kind}:${logId}`;
}

export function parseFeedbackData(data: string | undefined | null): { kind: Feedback; logId: string } | null {
  const m = /^fb:(ok|no|team):([\w-]{1,56})$/.exec(data ?? "");
  return m ? { kind: m[1] as Feedback, logId: m[2] } : null;
}

/** Baris log dari tombol penilaian (✅/❌/👤) — bukan uraian masalah, jangan masuk ringkasan tiket. */
export function isFeedbackEcho(body: string): boolean {
  return /^(✅|❌|👤)/.test(body.trim());
}

/** Sapaan nama untuk teks tetap: " Kak Budi" (id) / " Budi" (bahasa lain) / " Kak" / "". */
export function nameVar(staffName: string | null | undefined, lang: string): string {
  const first = staffName && staffName !== "Staf" ? staffName.trim().split(/\s+/)[0] : "";
  if (lang === "id") return first ? ` Kak ${first}` : " Kak";
  return first ? `, ${first}` : "";
}
