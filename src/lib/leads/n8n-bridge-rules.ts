/**
 * Jembatan bot WhatsApp NEXBILL ↔ n8n self-host (2026-11-23) — aturan murni, diuji di n8n-bridge-rules.test.ts.
 *
 * Bila env N8N_WEBHOOK_URL diisi di server bot, "otak" balasan untuk prospek (bot marketing) dipindah ke
 * workflow n8n: bot tetap menerima & mengirim pesan, membuat/mencatat lead, menjaga aturan diam
 * (admin sedang menangani, #bot-off, status lanjut) dan STOP; n8n hanya memutuskan APA yang dibalas.
 * n8n gagal / lambat / mati → bot otomatis kembali ke otak bawaan (wa-marketing.ts), jadi prospek
 * tidak pernah dibiarkan tanpa balasan.
 *
 * Kontrak (versi 1):
 *   POST N8N_WEBHOOK_URL   header X-Nexbill-Secret: <N8N_WEBHOOK_SECRET>
 *   body  = N8nPayload (lihat buildN8nPayload)
 *   balasan JSON = { reply: string|null, intent?, handoff?, extracted?, menu? }
 *     reply null/""  → bot diam (kecuali intent "support"/"stop" yang punya aksi sendiri)
 *     intent "support" → bot mengirim cara menautkan akun Support 24 jam
 *     intent "stop"    → status Tidak Tertarik + pesan pamit
 *     handoff true / intent subscribe|demo|human → admin dikabari (Telegram petugas jaga)
 *     menu true        → balasan berisi menu angka (balasan "1"…"5" berikutnya dibaca sebagai menu)
 */
import type { ChatTurn, MarketingExtracted, MarketingFacts, MarketingIntent, MarketingLang, MenuChoice } from "./wa-marketing-rules";
import { factVars, marketingLinks, marketingSystemPrompt, mkText, MK_TEXT, type MkTextKey } from "./wa-marketing-rules";

export const N8N_CONTRACT_VERSION = 1;
export const N8N_SECRET_HEADER = "X-Nexbill-Secret";

export interface N8nPayload {
  version: number;
  channel: "whatsapp";
  event: "message";
  receivedAt: string;
  message: { id: string; text: string; mediaOnly: boolean; lang: MarketingLang; isGreeting: boolean; menuChoice: MenuChoice | null };
  contact: { phone: string; localPhone: string; pushName: string | null };
  lead: {
    id: string;
    isNew: boolean;
    name: string;
    status: string;
    temperature: string | null;
    city: string | null;
    unitCount: number | null;
    currentBilling: string | null;
    contactName: string | null;
    adminUrl: string;
  };
  history: ChatTurn[];
  facts: MarketingFacts & { links: ReturnType<typeof marketingLinks> };
  /** Teks siap pakai dalam bahasa prospek (bisa dipakai apa adanya atau diganti di n8n). */
  templates: Record<MkTextKey, string>;
  /** Prompt sistem bawaan NEXBILL (harga live + tabel fitur + aturan) — n8n boleh memakai/menambah. */
  ai: { systemPrompt: string; model: string; outputFormat: string };
}

export function buildN8nPayload(input: {
  msg: { id: string; text: string; mediaOnly: boolean; phone: string; pushName: string | null };
  lang: MarketingLang;
  isGreeting: boolean;
  menuChoice: MenuChoice | null;
  lead: Omit<N8nPayload["lead"], "adminUrl">;
  history: ChatTurn[];
  facts: MarketingFacts;
  adminUrl: string;
  model: string;
  now: Date;
}): N8nPayload {
  const vars = factVars(input.facts);
  const templates = Object.fromEntries((Object.keys(MK_TEXT) as MkTextKey[]).map((k) => [k, mkText(input.lang, k, vars)])) as Record<MkTextKey, string>;
  const local = input.msg.phone.startsWith("62") ? `0${input.msg.phone.slice(2)}` : input.msg.phone;
  return {
    version: N8N_CONTRACT_VERSION,
    channel: "whatsapp",
    event: "message",
    receivedAt: input.now.toISOString(),
    message: { id: input.msg.id, text: input.msg.text, mediaOnly: input.msg.mediaOnly, lang: input.lang, isGreeting: input.isGreeting, menuChoice: input.menuChoice },
    contact: { phone: input.msg.phone, localPhone: local, pushName: input.msg.pushName },
    lead: { ...input.lead, adminUrl: input.adminUrl },
    history: input.history,
    facts: { ...input.facts, links: marketingLinks(input.facts) },
    templates,
    ai: {
      systemPrompt: marketingSystemPrompt(input.facts),
      model: input.model,
      outputFormat: '{"reply":"…","intent":"subscribe|demo|question|human|support|stop|other","handoff":false,"extracted":{"outletName":null,"city":null,"unitCount":null,"currentBilling":null,"contactName":null}}',
    },
  };
}

export interface N8nResult {
  reply: string | null;
  intent: MarketingIntent;
  handoff: boolean;
  menu: boolean;
  extracted: MarketingExtracted;
}

const INTENTS: MarketingIntent[] = ["subscribe", "demo", "question", "human", "support", "stop", "other"];

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

/**
 * Respons n8n → hasil tervalidasi. null = respons tidak bisa dipakai (bot memakai otak bawaan).
 * Menerima objek, string JSON, atau array satu elemen (bentuk keluaran "Respond to Webhook" yang umum).
 */
export function parseN8nResponse(raw: unknown): N8nResult | null {
  let v: unknown = raw;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try {
      v = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) v = v[0];
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.json && typeof o.json === "object" && !("reply" in o)) return parseN8nResponse(o.json);
  if (!("reply" in o) && !("intent" in o)) return null;

  const reply =
    typeof o.reply === "string" && o.reply.trim()
      ? clamp(o.reply.replace(/\r/g, "").replace(/^#+\s*/gm, "").replace(/\*\*(.+?)\*\*/g, "*$1*"), 1500)
      : null;
  const intent = INTENTS.includes(o.intent as MarketingIntent) ? (o.intent as MarketingIntent) : "other";
  if (!reply && intent !== "support" && intent !== "stop" && o.reply !== null && o.reply !== "") return null;
  const ex = (o.extracted && typeof o.extracted === "object" ? o.extracted : {}) as Record<string, unknown>;
  const units = Math.floor(Number(ex.unitCount));
  return {
    reply,
    intent,
    handoff: o.handoff === true || intent === "human",
    menu: o.menu === true,
    extracted: {
      outletName: cleanStr(ex.outletName, 80),
      city: cleanStr(ex.city, 60),
      unitCount: Number.isFinite(units) && units >= 1 && units <= 1000 ? units : null,
      currentBilling: cleanStr(ex.currentBilling, 80),
      contactName: cleanStr(ex.contactName, 60),
    },
  };
}

/** URL webhook valid (http/https, bukan kosong). */
export function n8nWebhookUrl(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
