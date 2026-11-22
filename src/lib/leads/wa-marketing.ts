/**
 * Chatbot WhatsApp Marketing (CRM) — dijalankan proses bot (scripts/whatsapp-bot.mts) untuk nomor yang
 * BUKAN staf outlet tertaut. Aturan siapa yang dibalas & teks tetap ada di ./wa-marketing-rules.ts.
 *
 * Alur satu pesan prospek:
 *  1. Nomor belum dikenal → lead baru (sumber "whatsapp", status Baru) dibuat otomatis; petugas jaga diberi tahu.
 *     Nomor milik lead Google Maps / manual → "skip" (pemanggil hanya mencatat, admin yang membalas).
 *  2. Pesan dicatat ke riwayat lead (tanda "balasan baru" di /platform-admin/leads).
 *  3. Bot diam bila admin sedang menangani (balas dari dashboard/HP dalam 24 jam), status sudah lanjut
 *     (demo/trial/closing/…), atau ada catatan #bot-off.
 *  4. Sapaan / pesan isi-otomatis situs → sambutan + menu angka (tanpa AI). Menu 1–3 → harga/fitur/trial
 *     dari harga live. 4 / "admin" → diteruskan ke admin. 5 → cara menautkan akun Support 24 jam.
 *  5. Pertanyaan bebas → Claude (fakta harga live + tabel "Bandingkan paket"), keluaran JSON: balasan +
 *     data kualifikasi (nama outlet, kota, jumlah unit, billing sekarang, nama kontak) yang mengisi kolom
 *     lead yang masih kosong + suhu (hot/warm/cold). Minat daftar/demo/minta orang → admin diberi tahu.
 *  6. STOP / "tidak tertarik" → status Tidak Tertarik, bot berhenti.
 * AI tidak tersedia / kuota harian habis / JSON rusak → menu tetap. Semua balasan bot dicatat di lead.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeadActivities, platformLeads } from "@/db/schema";
import { AI_CHATBOT_MODEL, aiConfigured, createMessage, textOf } from "@/lib/ai/models";
import { TRIAL_DAYS } from "@/lib/subscription/config";
import { listCatalogPlans } from "@/lib/subscription/plan-catalog";
import { ANNUAL_MONTHS_GRANTED, DEFAULT_PRICING, minUnitsOf, planTierOf } from "@/lib/subscription/pricing";
import { SITE_URL } from "@/lib/site-config";
import { DASHBOARD_URL, notifyOnCall, recordBotError } from "@/lib/telegram/support-service";
import { toWhatsAppText } from "@/lib/whatsapp-support/rules";
import { waText } from "@/lib/whatsapp-support/text";
import { addLeadActivity } from "./service";
import { leadsForPhone, recordInbound } from "./wa-bot";
import { startOfTodayWibIso } from "./wa-bot-rules";
import {
  BOT_REPLY_PREFIX,
  botMayReply,
  conversationTurns,
  guessLang,
  HANDOFF_NOTE,
  handoffNotice,
  handoffNotifyDue,
  isGreetingOrPrefill,
  isOptOut,
  leadPatchFrom,
  localPhone,
  MARKETING_BOT_NAME,
  marketingSystemPrompt,
  menuReply,
  mkText,
  factVars,
  outletNameFromPrefill,
  parseMarketingAi,
  parseMenuChoice,
  parseOnOff,
  parsePositiveInt,
  placeholderLeadName,
  wantsHuman,
  type LeadActivityLite,
  type MarketingFacts,
  type MarketingIntent,
  type MarketingLang,
} from "./wa-marketing-rules";

export interface MarketingSender {
  send(text: string): Promise<string | null>;
  typing?(): Promise<void>;
}

export interface MarketingIncoming {
  phone: string;
  text: string;
  msgId: string;
  pushName: string | null;
  mediaOnly: boolean;
}

/** Env (dibaca saat modul dimuat oleh proses bot). */
export const MARKETING_ON = parseOnOff(process.env.WA_MARKETING, true);
const TAKEOVER_HOURS = parsePositiveInt(process.env.WA_MARKETING_TAKEOVER_HOURS, 24, 24 * 30);
const AI_DAILY_LIMIT = parsePositiveInt(process.env.WA_MARKETING_AI_DAILY, 400);
const NOTIFY_NEW = parseOnOff(process.env.WA_MARKETING_NOTIFY_NEW, true);
const MARKETING_MODEL = process.env.WA_MARKETING_MODEL || AI_CHATBOT_MODEL;

const BOT_REF = { sub: null, name: MARKETING_BOT_NAME };
const LEADS_URL = `${DASHBOARD_URL}/platform-admin/leads`;
const SUPPORT_LINK_URL = `${DASHBOARD_URL}/dashboard/chat`;
const MENU_FRESH_MS = 30 * 60_000;

/** Menu angka terakhir per nomor (memori proses) — supaya "5" sebagai jumlah unit tidak dibaca sebagai menu. */
const menuShownAt = new Map<string, number>();
/** Dedup pesan yang dikirim ulang WhatsApp. */
const seen = new Set<string>();
let aiDay = "";
let aiUsedToday = 0;

function markSeen(id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 3000) seen.delete(seen.values().next().value as string);
  return true;
}

function takeAiQuota(): boolean {
  const day = startOfTodayWibIso();
  if (day !== aiDay) {
    aiDay = day;
    aiUsedToday = 0;
  }
  if (aiUsedToday >= AI_DAILY_LIMIT) return false;
  aiUsedToday++;
  return true;
}

/* ------------------------------------------------------------------ harga live ------------------------------------------------------------------ */

let factsCache: { at: number; facts: MarketingFacts } | null = null;

export async function loadMarketingFacts(): Promise<MarketingFacts> {
  if (factsCache && Date.now() - factsCache.at < 10 * 60_000) return factsCache.facts;
  const facts: MarketingFacts = {
    starterPerUnit: DEFAULT_PRICING.starterPerUnit,
    starterMinUnits: DEFAULT_PRICING.starterMinUnits,
    proFlat: DEFAULT_PRICING.proFlat,
    multiDiscountPct: DEFAULT_PRICING.multiOutletDiscountPct,
    annualMonthsCharged: DEFAULT_PRICING.annualMonthsCharged,
    annualMonthsGranted: ANNUAL_MONTHS_GRANTED,
    aiAddonMonthly: DEFAULT_PRICING.aiAddonMonthly,
    trialDays: TRIAL_DAYS,
    siteUrl: SITE_URL,
  };
  try {
    const plans = await listCatalogPlans();
    const starter = plans.find((p) => planTierOf(p) === "starter");
    const pro = plans.find((p) => planTierOf(p) === "pro");
    if (starter) {
      facts.starterPerUnit = starter.priceCurrent;
      facts.starterMinUnits = minUnitsOf(starter);
      if (starter.aiAddonPriceMonthly) facts.aiAddonMonthly = starter.aiAddonPriceMonthly;
      if (starter.annualMonthsCharged) facts.annualMonthsCharged = starter.annualMonthsCharged;
    }
    if (pro) {
      facts.proFlat = pro.priceCurrent;
      if (pro.multiOutletDiscountPct != null) facts.multiDiscountPct = pro.multiOutletDiscountPct;
    }
  } catch (err) {
    console.error("Bot marketing: gagal membaca harga paket, memakai harga bawaan:", err instanceof Error ? err.message : err);
  }
  factsCache = { at: Date.now(), facts };
  return facts;
}

/* ------------------------------------------------------------------ lead ------------------------------------------------------------------ */

type LeadRow = Awaited<ReturnType<typeof leadsForPhone>>[number];

async function recentActivities(leadId: string): Promise<LeadActivityLite[]> {
  const rows = await db
    .select({
      type: platformLeadActivities.type,
      content: platformLeadActivities.content,
      createdBy: platformLeadActivities.createdBy,
      createdByName: platformLeadActivities.createdByName,
      createdAt: platformLeadActivities.createdAt,
    })
    .from(platformLeadActivities)
    .where(eq(platformLeadActivities.leadId, leadId))
    .orderBy(desc(platformLeadActivities.createdAt))
    .limit(80);
  return rows.reverse();
}

async function createWhatsappLead(msg: MarketingIncoming): Promise<LeadRow> {
  const outletName = outletNameFromPrefill(msg.text);
  const now = new Date().toISOString();
  const [row] = await db
    .insert(platformLeads)
    .values({
      source: "whatsapp",
      name: outletName ?? placeholderLeadName(msg.pushName, msg.phone),
      contactName: msg.pushName?.trim().slice(0, 60) || null,
      phone: localPhone(msg.phone),
      waNumber: msg.phone,
      status: "baru",
      temperature: "warm",
      category: "Rental PS",
      notes: "Chat masuk sendiri ke WhatsApp NEXBILL (dibuat otomatis oleh bot marketing).",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await addLeadActivity(row.id, "status", "Lead baru dari chat WhatsApp masuk (bot marketing)", BOT_REF);
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    name: row.name,
    city: row.city,
    unitCount: row.unitCount,
    currentBilling: row.currentBilling,
    contactName: row.contactName,
    temperature: row.temperature,
    updatedAt: row.updatedAt,
  };
}

async function patchLead(id: string, patch: Partial<typeof platformLeads.$inferInsert>) {
  if (Object.keys(patch).length === 0) return;
  await db.update(platformLeads).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(platformLeads.id, id));
}

/* ------------------------------------------------------------------ kirim ------------------------------------------------------------------ */

async function reply(out: MarketingSender, lead: LeadRow, text: string, opts: { menu?: boolean; phone: string }) {
  const body = toWhatsAppText(text);
  await out.send(body);
  if (opts.menu) menuShownAt.set(opts.phone, Date.now());
  else menuShownAt.delete(opts.phone);
  await addLeadActivity(lead.id, "whatsapp", `${BOT_REPLY_PREFIX}${body}`, BOT_REF);
  await patchLead(lead.id, { lastContactedAt: new Date().toISOString() });
}

async function handoff(lead: LeadRow, phone: string, reason: string, lastMessage: string, activities: LeadActivityLite[]) {
  await patchLead(lead.id, { temperature: "hot", nextAction: `Balas chat WhatsApp prospek — ${reason}`, inboundUnread: true });
  if (!handoffNotifyDue(activities, new Date())) return;
  await addLeadActivity(lead.id, "status", `${HANDOFF_NOTE}: ${reason}`, BOT_REF);
  await notifyOnCall(handoffNotice({ leadName: lead.name, phone628: phone, reason, lastMessage, adminUrl: LEADS_URL })).catch(() => 0);
}

async function optOut(out: MarketingSender, lead: LeadRow, phone: string, lang: MarketingLang) {
  await reply(out, lead, mkText(lang, "optOut"), { phone });
  await patchLead(lead.id, { status: "tidak_tertarik", temperature: "cold", nextAction: null });
  await addLeadActivity(lead.id, "status", `${lead.status === "baru" ? "Baru" : lead.status} → Tidak Tertarik (prospek minta berhenti dihubungi)`, BOT_REF);
}

async function customerNotice(out: MarketingSender, lead: LeadRow, phone: string, lang: MarketingLang) {
  await reply(out, lead, waText(lang, "notLinked", { url: SUPPORT_LINK_URL }), { phone });
  await addLeadActivity(lead.id, "catatan", "Mengaku sudah pelanggan NEXBILL — diberi cara menautkan WhatsApp ke Support 24 jam. Cek apakah lead ini perlu ditutup.", BOT_REF);
}

/* ------------------------------------------------------------------ AI ------------------------------------------------------------------ */

const HOT_REASON: Partial<Record<MarketingIntent, string>> = {
  subscribe: "berminat berlangganan",
  demo: "minta demo",
  human: "minta bicara dengan admin",
};

async function aiReply(out: MarketingSender, lead: LeadRow, msg: MarketingIncoming, lang: MarketingLang, activities: LeadActivityLite[], facts: MarketingFacts): Promise<boolean> {
  if (!aiConfigured() || !takeAiQuota()) return false;
  const turns = conversationTurns(activities);
  if (!turns.length) return false;
  void out.typing?.();
  let parsed: ReturnType<typeof parseMarketingAi> = null;
  try {
    const res = await createMessage({
      model: MARKETING_MODEL,
      max_tokens: 700,
      system: [
        { type: "text", text: marketingSystemPrompt(facts), cache_control: { type: "ephemeral" } },
        { type: "text", text: `Data lead saat ini: nama="${lead.name}", kota=${lead.city ?? "?"}, unit=${lead.unitCount ?? "?"}, billing sekarang=${lead.currentBilling ?? "?"}, kontak=${lead.contactName ?? "?"}. Bahasa pelanggan kemungkinan: ${lang}.` },
      ],
      messages: turns,
    });
    parsed = parseMarketingAi(textOf(res));
  } catch (err) {
    await recordBotError("bot marketing WhatsApp", err).catch(() => undefined);
    return false;
  }
  if (!parsed) return false;

  const patch = leadPatchFrom(lead, parsed.extracted, parsed.intent);
  await patchLead(lead.id, patch);
  Object.assign(lead, patch);

  if (parsed.intent === "stop") {
    await optOut(out, lead, msg.phone, lang);
    return true;
  }
  if (parsed.intent === "support") {
    await customerNotice(out, lead, msg.phone, lang);
    return true;
  }
  await reply(out, lead, parsed.reply, { phone: msg.phone });
  const reason = HOT_REASON[parsed.intent] ?? (parsed.handoff ? "pertanyaan perlu dijawab admin" : null);
  if (reason) await handoff(lead, msg.phone, reason, msg.text, activities);
  return true;
}

/* ------------------------------------------------------------------ pintu masuk ------------------------------------------------------------------ */

/**
 * Proses satu pesan dari nomor yang bukan staf outlet tertaut.
 * "skip" = bukan urusan bot marketing (nomor lead outbound) — pemanggil mencatat seperti biasa.
 */
export async function handleWaMarketingMessage(msg: MarketingIncoming, out: MarketingSender): Promise<"handled" | "skip"> {
  if (!MARKETING_ON) return "skip";
  const text = msg.text.trim();
  if (!text && !msg.mediaOnly) return "handled";
  if (!markSeen(msg.msgId)) return "handled";

  const known = await leadsForPhone(msg.phone);
  if (known.length && !known.some((l) => l.source === "whatsapp")) return "skip";

  let lead = known.filter((l) => l.source === "whatsapp").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const isNew = !lead;
  if (!lead) lead = await createWhatsappLead(msg);
  await recordInbound(msg.phone, text || "[media]");
  if (isNew && NOTIFY_NEW) {
    await notifyOnCall(`🆕 Prospek baru chat WhatsApp — ${lead.name} (${localPhone(msg.phone)})\n${text.slice(0, 200)}\n${LEADS_URL}`).catch(() => 0);
  }

  const activities = await recentActivities(lead.id);
  const may = botMayReply({ source: lead.source, status: lead.status, activities, now: new Date(), takeoverHours: TAKEOVER_HOURS });
  if (!may.ok) return "handled";

  const userText = activities.filter((a) => a.type === "whatsapp" && a.content.startsWith("↩")).map((a) => a.content).join(" ");
  const lang = guessLang(text, guessLang(userText, "id"));
  const facts = await loadMarketingFacts();

  try {
    if (isOptOut(text)) {
      await optOut(out, lead, msg.phone, lang);
      return "handled";
    }
    if (msg.mediaOnly) {
      await reply(out, lead, mkText(lang, "mediaOnly"), { phone: msg.phone, menu: true });
      return "handled";
    }
    const menuFresh = Date.now() - (menuShownAt.get(msg.phone) ?? 0) < MENU_FRESH_MS;
    const choice = menuFresh ? parseMenuChoice(text) : null;
    if (choice === "human" || wantsHuman(text)) {
      await reply(out, lead, mkText(lang, "handoff"), { phone: msg.phone });
      await handoff(lead, msg.phone, "minta bicara dengan admin", text, activities);
      return "handled";
    }
    if (choice === "customer") {
      await customerNotice(out, lead, msg.phone, lang);
      return "handled";
    }
    if (choice) {
      await reply(out, lead, menuReply(choice, lang, facts), { phone: msg.phone, menu: true });
      if (choice === "trial") await patchLead(lead.id, { temperature: "hot", nextAction: "Cek apakah prospek sudah daftar trial" });
      return "handled";
    }
    if (isGreetingOrPrefill(text)) {
      await reply(out, lead, mkText(lang, "welcome", factVars(facts)), { phone: msg.phone, menu: true });
      return "handled";
    }
    if (await aiReply(out, lead, msg, lang, activities, facts)) return "handled";
    // Cadangan tanpa AI: menu tetap.
    await reply(out, lead, mkText(lang, "welcome", factVars(facts)), { phone: msg.phone, menu: true });
  } catch (err) {
    await recordBotError("bot marketing WhatsApp", err).catch(() => undefined);
  }
  return "handled";
}
