/**
 * Chatbot WhatsApp Marketing (CRM) — aturan murni (tanpa DB/AI), diuji di wa-marketing-rules.test.ts.
 * Dipakai src/lib/leads/wa-marketing.ts yang dijalankan proses bot (scripts/whatsapp-bot.mts).
 *
 * Siapa yang dibalas bot marketing (2026-11-22):
 *  - Nomor BARU yang chat ke WhatsApp NEXBILL (mis. dari tombol "Chat Admin" di nexbill.id) → lead
 *    baru sumber "whatsapp" dibuat otomatis, bot menjawab harga/fitur/trial & menggali kualifikasi.
 *  - Lead sumber "whatsapp" selama statusnya baru / dihubungi / follow_up, TIDAK sedang ditangani admin
 *    (ada sentuhan admin dalam WA_MARKETING_TAKEOVER_HOURS jam), dan tidak dimatikan dengan catatan #bot-off.
 *  - Lead hasil Google Maps / input manual TETAP tidak dibalas otomatis (keputusan lama: lead CRM outbound
 *    ditangani manusia) — balasannya hanya dicatat.
 *  - Staf outlet yang nomornya tertaut tetap ke Support 24 jam (lib/whatsapp-support), tidak lewat sini.
 */
import { resolvePlanMatrix } from "@/lib/subscription/plan-matrix";

export const MARKETING_BOT_NAME = "Bot Marketing WA";
/** Pesan yang diketik admin langsung dari HP/WhatsApp Web nomor bot (fromMe, bukan kiriman bot). */
export const ADMIN_PHONE_NAME = "Admin (HP WhatsApp)";
export const INBOUND_PREFIX = "↩ Balasan WhatsApp: ";
export const BOT_REPLY_PREFIX = "🤖 Bot marketing: ";
export const ADMIN_PHONE_PREFIX = "✍ Dibalas admin dari HP: ";
export const HANDOFF_NOTE = "🔔 Diteruskan ke admin";
export const PLACEHOLDER_NAME_PREFIX = "Prospek WA";
export const BOT_OFF_TAG = "#bot-off";
export const BOT_ON_TAG = "#bot-on";

export const BOT_REPLY_STATUSES = ["baru", "dihubungi", "follow_up"] as const;
export const MAX_BOT_REPLIES_PER_HOUR = 12;
export const MAX_INBOUND_PER_10_MIN = 10;
export const HANDOFF_NOTIFY_COOLDOWN_HOURS = 6;
export const HISTORY_TURNS = 14;

export type MarketingLang = "id" | "en" | "ms" | "th" | "vi" | "fil";
export const MARKETING_LANGS: MarketingLang[] = ["id", "en", "ms", "th", "vi", "fil"];

export type MarketingIntent = "subscribe" | "demo" | "question" | "human" | "support" | "stop" | "other";
const INTENTS: MarketingIntent[] = ["subscribe", "demo", "question", "human", "support", "stop", "other"];

export interface LeadActivityLite {
  type: string;
  content: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ env ------------------------------------------------------------------ */

export function parseOnOff(v: string | undefined, fallback: boolean): boolean {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  return !["off", "0", "false", "no", "mati"].includes(s);
}

export function parsePositiveInt(v: string | undefined, fallback: number, max = 100_000): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

/* ------------------------------------------------------------------ bahasa & teks masuk ------------------------------------------------------------------ */

/** Tebakan bahasa dari teks prospek (pesan isi-otomatis situs ada di 6 bahasa). */
export function guessLang(text: string, fallback: MarketingLang = "id"): MarketingLang {
  const s = text.toLowerCase();
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/.test(s)) return "vi";
  if (/\b(gusto|po|ako|ng|salamat|magkano|paano)\b/.test(s)) return "fil";
  if (/\b(mahu|melanggan|sembang|berapa harga|helo)\b/.test(s)) return "ms";
  if (/\b(saya|ingin|mau|berlangganan|harga|halo|kak|gimana|bagaimana|berapa|bisa|tidak|nggak|gak)\b/.test(s)) return "id";
  if (/\b(hello|hi|want|would like|subscribe|price|how much|please|thanks)\b/.test(s)) return "en";
  return fallback;
}

/** "… Nama outlet: Arena PS Jaya" (pesan isi-otomatis tombol WhatsApp di nexbill.id) → "Arena PS Jaya". */
export function outletNameFromPrefill(text: string): string | null {
  const m = text.match(/(?:nama outlet|outlet name|pangalan ng outlet|tên cửa hàng|ชื่อร้าน)\s*:\s*([^\n]+)/i);
  const name = m?.[1]?.trim().replace(/[.\s…]+$/, "") ?? "";
  if (name.length < 2 || /^\.+$/.test(name)) return null;
  return clamp(name, 80);
}

/**
 * Sapaan pembuka atau pesan isi-otomatis tombol WhatsApp situs (tanpa pertanyaan nyata) → cukup dibalas
 * sambutan + menu tetap (cepat, tanpa AI). Pesan yang berisi pertanyaan dijawab AI.
 */
export function isGreetingOrPrefill(text: string): boolean {
  const s = text.trim().toLowerCase();
  if (!s) return true;
  if (/(nama outlet|outlet name|pangalan ng outlet|tên cửa hàng|ชื่อร้าน)\s*:/i.test(s) && !/\?/.test(s.split(/:\s*/)[0])) return true;
  if (s.length > 40 || /\?/.test(s)) return false;
  return /^(halo+|hal+o|hai+|hi+|hello|helo|hey|p|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|assalamu.?alaikum|permisi|min|admin|kak|gan|sawasdee|สวัสดี\S*|xin chào|kumusta|good (morning|afternoon|evening))([ ,.!]+(admin|min|kak|nexbill|gan|sis|bro|ka|po))*[ ,.!🙏👋]*$/u.test(s);
}

export function isOptOut(text: string): boolean {
  const s = text.trim().toLowerCase();
  return /^(stop|berhenti|unsubscribe|unsub|hentikan|jangan (hubungi|kirim|chat)( saya)?( lagi)?|tidak tertarik|ga tertarik|gak tertarik|nggak tertarik|not interested)[.!\s]*$/.test(s);
}

/** Minta bicara dengan manusia. "Halo Admin NEXBILL" (pesan isi-otomatis) BUKAN permintaan manusia. */
export function wantsHuman(text: string): boolean {
  const s = text.trim().toLowerCase();
  if (/^(admin|tim|team|cs|human|manusia|sales|operator)[.!?\s]*$/.test(s)) return true;
  return /(bicara|ngobrol|chat|bicaranya|sambung(kan)?|hubungkan|minta)\s+(dengan|sama|ke)?\s*(admin|orang|manusia|cs|sales|tim)\b|telepon saya|telpon saya|hubungi saya|call me|talk to (a |an )?(human|person|admin|agent)|bukan bot/.test(s);
}

export type MenuChoice = "price" | "features" | "trial" | "human" | "customer";
const MENU_ORDER: MenuChoice[] = ["price", "features", "trial", "human", "customer"];

export function parseMenuChoice(text: string): MenuChoice | null {
  const m = text.trim().match(/^([1-5])[.)]?$/);
  return m ? MENU_ORDER[Number(m[1]) - 1] : null;
}

/* ------------------------------------------------------------------ siapa boleh dibalas ------------------------------------------------------------------ */

/** Sentuhan manusia (admin) — bukan bot, bukan balasan lead. */
export function isHumanTouch(a: LeadActivityLite): boolean {
  if (!["whatsapp", "telepon", "kunjungan", "demo"].includes(a.type)) return false;
  if (a.createdByName === ADMIN_PHONE_NAME) return true;
  return !!a.createdBy;
}

/** Catatan terakhir yang berisi #bot-off / #bot-on menentukan saklar manual per lead (tanpa migrasi). */
export function botSwitchedOff(activities: LeadActivityLite[]): boolean {
  const notes = activities
    .filter((a) => a.type === "catatan" && (a.content.toLowerCase().includes(BOT_OFF_TAG) || a.content.toLowerCase().includes(BOT_ON_TAG)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = notes[notes.length - 1];
  if (!last) return false;
  const c = last.content.toLowerCase();
  return c.lastIndexOf(BOT_OFF_TAG) > c.lastIndexOf(BOT_ON_TAG);
}

export type BotSkipReason = "not_whatsapp_lead" | "status" | "switched_off" | "human_active" | "rate_limited" | "flood";

export function botMayReply(input: {
  source: string;
  status: string;
  activities: LeadActivityLite[];
  now: Date;
  takeoverHours: number;
}): { ok: true } | { ok: false; reason: BotSkipReason } {
  if (input.source !== "whatsapp") return { ok: false, reason: "not_whatsapp_lead" };
  if (!(BOT_REPLY_STATUSES as readonly string[]).includes(input.status)) return { ok: false, reason: "status" };
  if (botSwitchedOff(input.activities)) return { ok: false, reason: "switched_off" };
  const since = input.now.getTime() - input.takeoverHours * 3600_000;
  if (input.activities.some((a) => isHumanTouch(a) && Date.parse(a.createdAt) >= since)) return { ok: false, reason: "human_active" };
  const tenMin = input.now.getTime() - 10 * 60_000;
  const inbound = input.activities.filter((a) => a.type === "whatsapp" && a.content.startsWith(INBOUND_PREFIX) && Date.parse(a.createdAt) >= tenMin).length;
  if (inbound > MAX_INBOUND_PER_10_MIN) return { ok: false, reason: "flood" };
  const hour = input.now.getTime() - 3600_000;
  const replies = input.activities.filter((a) => a.createdByName === MARKETING_BOT_NAME && a.type === "whatsapp" && Date.parse(a.createdAt) >= hour).length;
  if (replies >= MAX_BOT_REPLIES_PER_HOUR) return { ok: false, reason: "rate_limited" };
  return { ok: true };
}

/** Admin perlu diberi tahu lagi? (sekali per HANDOFF_NOTIFY_COOLDOWN_HOURS per lead). */
export function handoffNotifyDue(activities: LeadActivityLite[], now: Date): boolean {
  const since = now.getTime() - HANDOFF_NOTIFY_COOLDOWN_HOURS * 3600_000;
  return !activities.some((a) => a.type === "status" && a.content.startsWith(HANDOFF_NOTE) && Date.parse(a.createdAt) >= since);
}

/* ------------------------------------------------------------------ riwayat → percakapan AI ------------------------------------------------------------------ */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Aktivitas WhatsApp lead (urut lama → baru) → giliran percakapan untuk Claude, selalu diawali & diakhiri "user". */
export function conversationTurns(activities: LeadActivityLite[], maxTurns = HISTORY_TURNS): ChatTurn[] {
  const sorted = [...activities].filter((a) => a.type === "whatsapp").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const turns: ChatTurn[] = [];
  for (const a of sorted) {
    let t: ChatTurn | null = null;
    if (a.content.startsWith(INBOUND_PREFIX)) t = { role: "user", content: a.content.slice(INBOUND_PREFIX.length) };
    else if (a.content.startsWith(BOT_REPLY_PREFIX)) t = { role: "assistant", content: a.content.slice(BOT_REPLY_PREFIX.length) };
    else if (a.content.startsWith(ADMIN_PHONE_PREFIX)) t = { role: "assistant", content: `(admin) ${a.content.slice(ADMIN_PHONE_PREFIX.length)}` };
    else if (a.createdBy) t = { role: "assistant", content: `(admin) ${a.content}` };
    if (!t || !t.content.trim()) continue;
    t.content = clamp(t.content, 1200);
    const prev = turns[turns.length - 1];
    if (prev && prev.role === t.role) prev.content = clamp(`${prev.content}\n${t.content}`, 2400);
    else turns.push(t);
  }
  let out = turns.slice(-maxTurns);
  while (out.length && out[0].role !== "user") out = out.slice(1);
  while (out.length && out[out.length - 1].role !== "user") out = out.slice(0, -1);
  return out;
}

/* ------------------------------------------------------------------ fakta produk & prompt ------------------------------------------------------------------ */

export interface MarketingFacts {
  starterPerUnit: number;
  starterMinUnits: number;
  proFlat: number;
  multiDiscountPct: number;
  annualMonthsCharged: number;
  annualMonthsGranted: number;
  aiAddonMonthly: number;
  trialDays: number;
  siteUrl: string;
}

export function formatRp(n: number): string {
  return `Rp${Math.round(n).toLocaleString("en-US").replace(/,/g, ".")}`;
}

export function marketingLinks(f: Pick<MarketingFacts, "siteUrl">) {
  return { daftar: `${f.siteUrl}/daftar`, harga: `${f.siteUrl}/#harga`, katalog: `${f.siteUrl}/downloads/katalog-fitur-nexbill.html` };
}

/** Daftar fitur Starter vs Pro dari tabel "Bandingkan paket" (satu sumber kebenaran dengan situs). */
export function featureFactLines(f: Pick<MarketingFacts, "starterMinUnits" | "multiDiscountPct">): string[] {
  const groups = resolvePlanMatrix("id", { minUnits: f.starterMinUnits, multiDiscountPct: f.multiDiscountPct });
  const cell = (c: { kind: string; text?: string }) => (c.kind === "yes" ? "ya" : c.kind === "no" ? "tidak" : c.text ?? "");
  return groups.flatMap((g) => g.rows.map((r) => `- ${g.label} › ${r.label}: Starter ${cell(r.starter)}; Pro ${cell(r.pro)}`));
}

export function marketingSystemPrompt(f: MarketingFacts): string {
  const l = marketingLinks(f);
  return [
    "Anda adalah asisten penjualan NEXBILL di WhatsApp resmi NEXBILL. NEXBILL adalah aplikasi kasir & billing untuk usaha rental PlayStation (juga rental konsol/TV lain): timer per unit, kontrol TV/stop kontak otomatis, kasir F&B, shift & kas, booking, laporan dan akuntansi.",
    "Tugas: menjawab calon pelanggan dengan ramah dan singkat, membantu mereka memilih paket, dan mengajak mencoba gratis. Sambil menjawab, gali SATU per SATU (jangan semua sekaligus): nama outlet, kota, jumlah unit PS/TV, sistem billing yang dipakai sekarang, nama kontak.",
    "",
    "FAKTA HARGA (hanya pakai angka ini, jangan mengarang diskon/promo lain):",
    `- Starter: ${formatRp(f.starterPerUnit)} per unit per bulan, minimal ${f.starterMinUnits} unit (= ${formatRp(f.starterPerUnit * f.starterMinUnits)}/bulan untuk ${f.starterMinUnits} unit).`,
    `- Pro: ${formatRp(f.proFlat)} per outlet per bulan, unit tak terbatas, asisten AI sudah termasuk. Cabang ke-2 dst. diskon ${f.multiDiscountPct}%.`,
    `- Asisten AI untuk Starter: add-on ${formatRp(f.aiAddonMonthly)}/bulan.`,
    `- Bayar tahunan: bayar ${f.annualMonthsCharged} bulan, aktif ${f.annualMonthsGranted} bulan.`,
    `- Coba gratis ${f.trialDays} hari: daftar sendiri di ${l.daftar}`,
    `- Halaman harga & perbandingan paket: ${l.harga} · Katalog fitur: ${l.katalog}`,
    "",
    "FITUR PER PAKET (hanya klaim yang ada di daftar ini; bila ditanya fitur yang tidak ada di sini, katakan admin akan memastikan dan set handoff=true):",
    ...featureFactLines(f),
    "",
    "ATURAN:",
    "- Balas dalam bahasa yang dipakai pelanggan. Gaya chat WhatsApp: hangat, sopan (sapa \"Kak\" untuk bahasa Indonesia), maksimal sekitar 80 kata, boleh *tebal* WhatsApp, tanpa judul markdown/tabel.",
    "- Jangan menyebut atau menjelekkan produk pesaing. Jangan menjanjikan hal di luar fakta di atas (harga khusus, integrasi, jadwal rilis, garansi).",
    "- Hitung estimasi biaya bila jumlah unit diketahui (Starter = unit × harga per unit, minimal sesuai batas; bandingkan dengan Pro).",
    "- Jika pelanggan minta bicara dengan orang, minta ditelepon, minta demo langsung, mau negosiasi harga, atau komplain → intent sesuai dan handoff=true, beri tahu bahwa admin NEXBILL akan segera membalas di chat ini.",
    "- Jika pelanggan ternyata SUDAH memakai NEXBILL dan butuh bantuan teknis/akun → intent=support.",
    "- Jika pelanggan minta berhenti dihubungi → intent=stop, balas singkat dan sopan.",
    "- Anda asisten otomatis; bila ditanya, jujur bahwa Anda asisten otomatis dan admin bisa mengambil alih.",
    "",
    "FORMAT KELUARAN: HANYA satu objek JSON tanpa teks lain:",
    '{"reply":"teks balasan WhatsApp","intent":"subscribe|demo|question|human|support|stop|other","handoff":false,"extracted":{"outletName":null,"city":null,"unitCount":null,"currentBilling":null,"contactName":null}}',
    "Isi extracted hanya dengan yang disebut pelanggan secara jelas; selain itu null.",
  ].join("\n");
}

/* ------------------------------------------------------------------ hasil AI ------------------------------------------------------------------ */

export interface MarketingExtracted {
  outletName: string | null;
  city: string | null;
  unitCount: number | null;
  currentBilling: string | null;
  contactName: string | null;
}

export interface MarketingAiResult {
  reply: string;
  intent: MarketingIntent;
  handoff: boolean;
  extracted: MarketingExtracted;
}

function clamp(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function cleanStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  if (!s || /^(null|undefined|-|n\/a|tidak tahu)$/i.test(s)) return null;
  return clamp(s, max);
}

/** Teks keluaran Claude → hasil tervalidasi. null bila tidak ada JSON yang bisa dipakai. */
export function parseMarketingAi(raw: string): MarketingAiResult | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const reply = cleanReply(obj.reply);
  if (!reply) return null;
  const intent = INTENTS.includes(obj.intent as MarketingIntent) ? (obj.intent as MarketingIntent) : "other";
  const ex = (obj.extracted && typeof obj.extracted === "object" ? obj.extracted : {}) as Record<string, unknown>;
  const units = Math.floor(Number(ex.unitCount));
  return {
    reply,
    intent,
    handoff: obj.handoff === true || intent === "human",
    extracted: {
      outletName: cleanStr(ex.outletName, 80),
      city: cleanStr(ex.city, 60),
      unitCount: Number.isFinite(units) && units >= 1 && units <= 1000 ? units : null,
      currentBilling: cleanStr(ex.currentBilling, 80),
      contactName: cleanStr(ex.contactName, 60),
    },
  };
}

function cleanReply(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\r/g, "").replace(/^#+\s*/gm, "").replace(/\*\*(.+?)\*\*/g, "*$1*").trim();
  return s ? clamp(s, 1500) : null;
}

/* ------------------------------------------------------------------ update lead ------------------------------------------------------------------ */

export interface LeadLite {
  name: string;
  city: string | null;
  unitCount: number | null;
  currentBilling: string | null;
  contactName: string | null;
  temperature: "hot" | "warm" | "cold" | null;
}

export type LeadPatch = Partial<{ name: string; city: string; unitCount: number; currentBilling: string; contactName: string; temperature: "hot" | "warm" | "cold" }>;

/** Isi kolom lead yang masih kosong saja (data yang diisi admin tidak ditimpa). */
export function leadPatchFrom(lead: LeadLite, ex: MarketingExtracted, intent: MarketingIntent): LeadPatch {
  const p: LeadPatch = {};
  if (ex.outletName && lead.name.startsWith(PLACEHOLDER_NAME_PREFIX)) p.name = ex.outletName;
  if (ex.city && !lead.city) p.city = ex.city;
  if (ex.unitCount && !lead.unitCount) p.unitCount = ex.unitCount;
  if (ex.currentBilling && !lead.currentBilling) p.currentBilling = ex.currentBilling;
  if (ex.contactName && !lead.contactName) p.contactName = ex.contactName;
  const temp = intent === "subscribe" || intent === "demo" || intent === "human" ? "hot" : intent === "stop" ? "cold" : intent === "question" ? "warm" : null;
  if (temp === "hot" && lead.temperature !== "hot") p.temperature = "hot";
  else if (temp === "cold" && lead.temperature !== "cold") p.temperature = "cold";
  else if (temp === "warm" && !lead.temperature) p.temperature = "warm";
  return p;
}

/** Nama lead baru sebelum nama outlet diketahui. */
export function placeholderLeadName(pushName: string | null | undefined, phone628: string): string {
  const who = cleanStr(pushName, 40)?.replace(/[^\p{L}\p{N} .'&-]/gu, "").trim();
  const local = phone628.startsWith("62") ? `0${phone628.slice(2)}` : phone628;
  return `${PLACEHOLDER_NAME_PREFIX} · ${who || local}`;
}

export function localPhone(phone628: string): string {
  return phone628.startsWith("62") ? `0${phone628.slice(2)}` : phone628;
}

/* ------------------------------------------------------------------ teks tetap (6 bahasa) ------------------------------------------------------------------ */

type T6 = Record<MarketingLang, string>;

export const MK_TEXT = {
  welcome: {
    id: "Halo Kak, terima kasih sudah menghubungi NEXBILL 👋 Saya asisten otomatis tim NEXBILL, siap 24 jam.\n\nBalas angka:\n1 Harga paket\n2 Fitur\n3 Coba gratis {trial} hari\n4 Bicara dengan admin\n5 Saya sudah pelanggan NEXBILL\n\nAtau tulis saja pertanyaannya 🙂",
    en: "Hi, thanks for contacting NEXBILL 👋 I'm the NEXBILL team's automatic assistant, available 24/7.\n\nReply with a number:\n1 Plan prices\n2 Features\n3 Free {trial}-day trial\n4 Talk to an admin\n5 I'm already a NEXBILL customer\n\nOr just type your question 🙂",
    ms: "Hai, terima kasih kerana menghubungi NEXBILL 👋 Saya pembantu automatik pasukan NEXBILL, sedia 24 jam.\n\nBalas nombor:\n1 Harga pakej\n2 Ciri-ciri\n3 Cuba percuma {trial} hari\n4 Bercakap dengan admin\n5 Saya sudah pelanggan NEXBILL\n\nAtau taip sahaja soalan anda 🙂",
    th: "สวัสดีค่ะ ขอบคุณที่ติดต่อ NEXBILL 👋 ฉันคือผู้ช่วยอัตโนมัติของทีม NEXBILL พร้อม 24 ชม.\n\nตอบด้วยตัวเลข:\n1 ราคาแพ็กเกจ\n2 ฟีเจอร์\n3 ทดลองใช้ฟรี {trial} วัน\n4 คุยกับแอดมิน\n5 ฉันเป็นลูกค้า NEXBILL อยู่แล้ว\n\nหรือพิมพ์คำถามได้เลย 🙂",
    vi: "Xin chào, cảm ơn bạn đã liên hệ NEXBILL 👋 Tôi là trợ lý tự động của đội NEXBILL, sẵn sàng 24/7.\n\nTrả lời bằng số:\n1 Giá các gói\n2 Tính năng\n3 Dùng thử miễn phí {trial} ngày\n4 Nói chuyện với admin\n5 Tôi đã là khách hàng NEXBILL\n\nHoặc cứ gõ câu hỏi 🙂",
    fil: "Hi, salamat sa pag-contact sa NEXBILL 👋 Ako ang automatic assistant ng NEXBILL team, handa 24/7.\n\nI-reply ang numero:\n1 Presyo ng plano\n2 Features\n3 Libreng {trial}-araw na trial\n4 Makipag-usap sa admin\n5 Customer na ako ng NEXBILL\n\nO i-type lang ang tanong 🙂",
  },
  price: {
    id: "💰 *Harga NEXBILL*\n• *Starter*: {starter}/unit/bulan, min. {min} unit ({starterMin}/bulan)\n• *Pro*: {pro}/outlet/bulan — unit tak terbatas + asisten AI. Cabang ke-2 dst. diskon {pct}%\n• Bayar tahunan: bayar {charged} bulan, aktif {granted} bulan\n• Coba gratis {trial} hari\n\nDetail: {harga}\nBerapa unit PS di outlet Kakak? Saya bantu hitung paket yang paling hemat 🙂",
    en: "💰 *NEXBILL pricing*\n• *Starter*: {starter}/unit/month, min. {min} units ({starterMin}/month)\n• *Pro*: {pro}/outlet/month — unlimited units + AI assistant. {pct}% off from the 2nd branch\n• Annual: pay {charged} months, get {granted}\n• Free {trial}-day trial\n\nDetails: {harga}\nHow many PS units do you have? I'll work out the cheapest plan 🙂",
    ms: "💰 *Harga NEXBILL*\n• *Starter*: {starter}/unit/bulan, min. {min} unit ({starterMin}/bulan)\n• *Pro*: {pro}/outlet/bulan — unit tanpa had + pembantu AI. Diskaun {pct}% dari cawangan ke-2\n• Tahunan: bayar {charged} bulan, aktif {granted} bulan\n• Cuba percuma {trial} hari\n\nButiran: {harga}\nBerapa unit PS di outlet anda? Saya bantu kira pakej paling jimat 🙂",
    th: "💰 *ราคา NEXBILL*\n• *Starter*: {starter}/เครื่อง/เดือน ขั้นต่ำ {min} เครื่อง ({starterMin}/เดือน)\n• *Pro*: {pro}/ร้าน/เดือน — ไม่จำกัดเครื่อง + ผู้ช่วย AI ส่วนลด {pct}% ตั้งแต่สาขาที่ 2\n• รายปี: จ่าย {charged} เดือน ใช้ได้ {granted} เดือน\n• ทดลองใช้ฟรี {trial} วัน\n\nรายละเอียด: {harga}\nร้านมี PS กี่เครื่องคะ? จะช่วยคำนวณแพ็กเกจที่คุ้มที่สุด 🙂",
    vi: "💰 *Giá NEXBILL*\n• *Starter*: {starter}/máy/tháng, tối thiểu {min} máy ({starterMin}/tháng)\n• *Pro*: {pro}/cửa hàng/tháng — không giới hạn máy + trợ lý AI. Giảm {pct}% từ chi nhánh thứ 2\n• Theo năm: trả {charged} tháng, dùng {granted} tháng\n• Dùng thử miễn phí {trial} ngày\n\nChi tiết: {harga}\nCửa hàng bạn có bao nhiêu máy PS? Tôi sẽ tính gói tiết kiệm nhất 🙂",
    fil: "💰 *Presyo ng NEXBILL*\n• *Starter*: {starter}/unit/buwan, min. {min} unit ({starterMin}/buwan)\n• *Pro*: {pro}/outlet/buwan — walang limit na unit + AI assistant. {pct}% diskwento mula sa ika-2 branch\n• Taunan: magbayad ng {charged} buwan, aktibo {granted} buwan\n• Libreng {trial}-araw na trial\n\nDetalye: {harga}\nIlang PS unit ang nasa outlet mo? Tutulungan kitang kalkulahin ang pinakamatipid 🙂",
  },
  features: {
    id: "🎮 *Yang bisa dilakukan NEXBILL*\n• Timer & billing per unit, TV/stop kontak mati-nyala otomatis\n• Kasir makanan-minuman & stok\n• Shift, setoran & kas\n• Booking online & member\n• Laporan, laba rugi & neraca\n\nPerbandingan lengkap per paket: {harga}\nKatalog fitur: {katalog}\nFitur mana yang paling Kakak butuhkan?",
    en: "🎮 *What NEXBILL does*\n• Per-unit timer & billing, automatic TV/smart-plug on-off\n• Food & drink cashier and stock\n• Shifts, deposits & cash\n• Online booking & members\n• Reports, profit & loss and balance sheet\n\nFull comparison by plan: {harga}\nFeature catalog: {katalog}\nWhich feature matters most to you?",
    ms: "🎮 *Apa yang NEXBILL boleh buat*\n• Pemasa & bil setiap unit, TV/palam pintar hidup-mati automatik\n• Juruwang makanan-minuman & stok\n• Syif, deposit & tunai\n• Tempahan dalam talian & ahli\n• Laporan, untung rugi & kunci kira-kira\n\nPerbandingan penuh: {harga}\nKatalog ciri: {katalog}\nCiri mana yang paling anda perlukan?",
    th: "🎮 *NEXBILL ทำอะไรได้บ้าง*\n• จับเวลาและคิดเงินรายเครื่อง เปิด-ปิดทีวี/ปลั๊กอัตโนมัติ\n• ขายอาหาร-เครื่องดื่มและสต็อก\n• กะ การนำส่งเงิน และเงินสด\n• จองออนไลน์และสมาชิก\n• รายงาน กำไรขาดทุน และงบดุล\n\nเปรียบเทียบแพ็กเกจ: {harga}\nแคตตาล็อกฟีเจอร์: {katalog}\nฟีเจอร์ไหนที่ต้องการที่สุดคะ?",
    vi: "🎮 *NEXBILL làm được gì*\n• Hẹn giờ & tính tiền từng máy, bật-tắt TV/ổ cắm tự động\n• Bán đồ ăn uống & tồn kho\n• Ca làm, nộp tiền & quỹ\n• Đặt chỗ online & hội viên\n• Báo cáo, lãi lỗ & bảng cân đối\n\nSo sánh đầy đủ theo gói: {harga}\nDanh mục tính năng: {katalog}\nBạn cần tính năng nào nhất?",
    fil: "🎮 *Ano ang kaya ng NEXBILL*\n• Timer at billing kada unit, awtomatikong on-off ng TV/smart plug\n• Kahera ng pagkain-inumin at stock\n• Shift, deposito at cash\n• Online booking at member\n• Reports, kita-lugi at balance sheet\n\nBuong paghahambing: {harga}\nFeature catalog: {katalog}\nAnong feature ang pinakakailangan mo?",
  },
  trial: {
    id: "🚀 Coba NEXBILL gratis {trial} hari — daftar sendiri sekitar 2 menit di:\n{daftar}\n\nSetelah daftar, tambahkan unit PS Kakak dan langsung bisa dipakai. Kalau mau dibantu setup, balas 4 untuk bicara dengan admin 🙂",
    en: "🚀 Try NEXBILL free for {trial} days — sign up yourself in about 2 minutes:\n{daftar}\n\nAfter signing up, add your PS units and you're ready to go. Want help with setup? Reply 4 to talk to an admin 🙂",
    ms: "🚀 Cuba NEXBILL percuma {trial} hari — daftar sendiri kira-kira 2 minit di:\n{daftar}\n\nSelepas daftar, tambah unit PS anda dan terus boleh guna. Mahu dibantu setup? Balas 4 untuk bercakap dengan admin 🙂",
    th: "🚀 ทดลองใช้ NEXBILL ฟรี {trial} วัน — สมัครเองประมาณ 2 นาทีที่:\n{daftar}\n\nสมัครแล้วเพิ่มเครื่อง PS ก็ใช้งานได้ทันที ต้องการให้ช่วยตั้งค่า? ตอบ 4 เพื่อคุยกับแอดมิน 🙂",
    vi: "🚀 Dùng thử NEXBILL miễn phí {trial} ngày — tự đăng ký khoảng 2 phút tại:\n{daftar}\n\nĐăng ký xong, thêm máy PS là dùng được ngay. Cần hỗ trợ cài đặt? Trả lời 4 để nói chuyện với admin 🙂",
    fil: "🚀 Subukan ang NEXBILL nang libre sa {trial} araw — mag-sign up nang mga 2 minuto sa:\n{daftar}\n\nPagkatapos, idagdag ang PS units mo at magagamit na agad. Gusto ng tulong sa setup? I-reply ang 4 para makausap ang admin 🙂",
  },
  handoff: {
    id: "Siap Kak 🙏 Admin NEXBILL sudah kami kabari dan akan membalas di chat ini secepatnya (jam kerja biasanya beberapa menit). Sambil menunggu, boleh info nama outlet, kota, dan jumlah unit PS-nya?",
    en: "Sure 🙏 We've notified a NEXBILL admin, who will reply in this chat as soon as possible (usually within minutes during working hours). Meanwhile, could you share your outlet name, city and number of PS units?",
    ms: "Baik 🙏 Admin NEXBILL telah dimaklumkan dan akan membalas di chat ini secepat mungkin. Sementara menunggu, boleh kongsi nama outlet, bandar dan jumlah unit PS?",
    th: "ได้เลยค่ะ 🙏 แจ้งแอดมิน NEXBILL แล้ว จะตอบในแชตนี้โดยเร็วที่สุด ระหว่างรอ ขอชื่อร้าน เมือง และจำนวนเครื่อง PS ได้ไหมคะ?",
    vi: "Vâng 🙏 Chúng tôi đã báo admin NEXBILL, admin sẽ trả lời trong chat này sớm nhất có thể. Trong lúc chờ, bạn cho biết tên cửa hàng, thành phố và số máy PS nhé?",
    fil: "Sige 🙏 Naabisuhan na namin ang admin ng NEXBILL at sasagot sa chat na ito sa lalong madaling panahon. Habang naghihintay, puwede bang ibigay ang pangalan ng outlet, lungsod at bilang ng PS units?",
  },
  optOut: {
    id: "Baik Kak, kami tidak akan menghubungi lagi 🙏 Kalau suatu saat butuh, cukup chat ke nomor ini. Terima kasih!",
    en: "Understood, we won't contact you again 🙏 If you ever need us, just message this number. Thank you!",
    ms: "Baik, kami tidak akan menghubungi lagi 🙏 Jika perlu, chat sahaja ke nombor ini. Terima kasih!",
    th: "รับทราบค่ะ จะไม่ติดต่อไปอีก 🙏 หากต้องการเมื่อไหร่ ทักมาที่เบอร์นี้ได้เลย ขอบคุณค่ะ!",
    vi: "Đã hiểu, chúng tôi sẽ không liên hệ nữa 🙏 Khi cần, cứ nhắn vào số này. Cảm ơn bạn!",
    fil: "Sige, hindi na kami makikipag-ugnayan 🙏 Kung kailangan mo kami, mag-message lang sa number na ito. Salamat!",
  },
  mediaOnly: {
    id: "Terima kasih Kak 🙏 Untuk saat ini saya baru bisa membaca pesan teks. Tulis pertanyaannya di sini ya, atau balas 4 untuk bicara dengan admin.",
    en: "Thank you 🙏 For now I can only read text messages. Please type your question here, or reply 4 to talk to an admin.",
    ms: "Terima kasih 🙏 Buat masa ini saya hanya boleh membaca teks. Taip soalan anda di sini, atau balas 4 untuk bercakap dengan admin.",
    th: "ขอบคุณค่ะ 🙏 ตอนนี้อ่านได้เฉพาะข้อความ พิมพ์คำถามที่นี่ หรือตอบ 4 เพื่อคุยกับแอดมิน",
    vi: "Cảm ơn bạn 🙏 Hiện tôi chỉ đọc được tin nhắn văn bản. Hãy gõ câu hỏi ở đây, hoặc trả lời 4 để nói chuyện với admin.",
    fil: "Salamat 🙏 Text lang ang nababasa ko sa ngayon. I-type ang tanong dito, o i-reply ang 4 para makausap ang admin.",
  },
} satisfies Record<string, T6>;

export type MkTextKey = keyof typeof MK_TEXT;

export function mkText(lang: MarketingLang, key: MkTextKey, vars: Record<string, string | number> = {}): string {
  const entry = MK_TEXT[key] as T6;
  const base = entry[lang] ?? entry.id;
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), base);
}

/** Variabel harga/tautan untuk teks tetap. */
export function factVars(f: MarketingFacts): Record<string, string | number> {
  const l = marketingLinks(f);
  return {
    starter: formatRp(f.starterPerUnit),
    min: f.starterMinUnits,
    starterMin: formatRp(f.starterPerUnit * f.starterMinUnits),
    pro: formatRp(f.proFlat),
    pct: f.multiDiscountPct,
    charged: f.annualMonthsCharged,
    granted: f.annualMonthsGranted,
    trial: f.trialDays,
    harga: l.harga,
    daftar: l.daftar,
    katalog: l.katalog,
  };
}

/** Jawaban menu angka tanpa AI. "customer" ditangani pemanggil (teks cara menautkan akun support). */
export function menuReply(choice: Exclude<MenuChoice, "customer" | "human">, lang: MarketingLang, f: MarketingFacts): string {
  const key: MkTextKey = choice === "price" ? "price" : choice === "features" ? "features" : "trial";
  return mkText(lang, key, factVars(f));
}

/** Pesan ringkas untuk petugas jaga (Telegram) saat prospek perlu admin. */
export function handoffNotice(input: { leadName: string; phone628: string; reason: string; lastMessage: string; adminUrl: string }): string {
  return `🔔 Prospek WhatsApp perlu admin — ${input.leadName} (${localPhone(input.phone628)})\nAlasan: ${input.reason}\nPesan terakhir: ${clamp(input.lastMessage.replace(/\s+/g, " "), 200)}\n${input.adminUrl}`;
}
