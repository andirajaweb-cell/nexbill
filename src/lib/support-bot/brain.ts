/**
 * Otak bot support 24 jam NEXBILL — dipakai dua kanal:
 *  - Customer Service dashboard (lib/support-bot/dashboard-autoreply.ts): membalas tiket otomatis.
 *  - Telegram (lib/telegram/handler.ts).
 * Claude menjawab HANYA dari basis pengetahuan (lib/support-bot/knowledge.ts) dan status akun outlet
 * itu sendiri (hanya baca). Yang tidak bisa dijawab diteruskan ke tim lewat callback `escalate` milik
 * kanal. Bot tidak pernah mengubah uang, tagihan, langganan, atau akun (tidak ada tool untuk itu).
 *
 * Model: env SUPPORT_BOT_MODEL (atau TELEGRAM_SUPPORT_MODEL), default claude-haiku-5-5.
 */
import Anthropic from "@anthropic-ai/sdk";
import { loadHelpBook, mergeWithSource } from "@/lib/help/content/index";
import type { HelpCategory, HelpLang } from "@/lib/help/types";
import { accountStatus, DASHBOARD_URL, notifyOnCall, statusLine, type TicketCategory } from "@/lib/telegram/support-service";
import {
  categoryToText,
  enforcedPriority,
  isSupportHours,
  PRIORITIES,
  shouldNotifyOnCall,
  SUPPORT_END_HOUR,
  SUPPORT_START_HOUR,
  toChatMessages,
  type ChatTurn,
  type SupportPriority,
} from "@/lib/telegram/support-rules";
import { searchKnowledge } from "./knowledge";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const SUPPORT_BOT_MODEL = process.env.SUPPORT_BOT_MODEL || process.env.TELEGRAM_SUPPORT_MODEL || "claude-haiku-5-5";
const HELP_LANGS: HelpLang[] = ["id", "en", "ms", "th", "fil", "vi"];
const LANG_NAME: Record<string, string> = { id: "Bahasa Indonesia", en: "English", ms: "Bahasa Melayu", th: "ภาษาไทย", fil: "Filipino", vi: "Tiếng Việt" };

async function helpCategories(lang: string): Promise<HelpCategory[]> {
  const l = (HELP_LANGS as string[]).includes(lang) ? (lang as HelpLang) : "id";
  return mergeWithSource(await loadHelpBook(l)).categories;
}

export type SupportChannel = "dashboard" | "telegram";

export interface EscalateInput {
  priority: SupportPriority;
  category: TicketCategory;
  summary: string;
  tried?: string;
  accountStatus?: string;
}

export interface BrainInput {
  channel: SupportChannel;
  outletId: string;
  outletName: string;
  staffName: string;
  lang: string;
  /** Riwayat percakapan berjalan, pesan terbaru merchant di akhir. */
  turns: ChatTurn[];
  /** Kanal meneruskan ke tim: Telegram membuat tiket baru, dashboard menandai tiket ini "perlu tim". `ref` = nomor tiket. */
  escalate: (e: EscalateInput) => Promise<{ ref: string }>;
  /** Sudah diteruskan sebelumnya dan belum dibalas manusia — bot tidak meneruskan ulang kecuali prioritasnya naik. */
  alreadyEscalated?: { ref: string; priority: SupportPriority } | null;
}

export interface BrainResult {
  reply: string;
  resolution: "answered" | "ticket" | "urgent";
  priority: SupportPriority | null;
  ref: string | null;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buka_panduan",
    description: "Ambil isi lengkap 1–3 kategori Panduan Bantuan NEXBILL (langkah, letak menu, catatan). Panggil ini sebelum menjelaskan cara pakai fitur dashboard — jangan menjawab dari ingatan.",
    input_schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3, description: "id kategori dari daftar panduan" } },
      required: ["ids"],
    },
  },
  {
    name: "cari_pengetahuan",
    description:
      "Cari di Panduan NEXBILL TV & Kontrol Perangkat (pairing, HDMI, relay, smart plug, Mode Offline/Kontrol Lokal), kendala NEXBILL TV yang sudah diketahui beserta solusinya, versi aplikasi TV terbaru, dan jawaban tim untuk masalah berulang. Pakai kata kunci inti dari masalah merchant.",
    input_schema: {
      type: "object",
      properties: { kata_kunci: { type: "string", description: "mis. 'TV tidak pindah HDMI', 'pairing kode', 'smart plug offline'" } },
      required: ["kata_kunci"],
    },
  },
  {
    name: "status_akun",
    description: "Baca status akun outlet merchant ini: langganan & masa coba, jumlah unit, layar NEXBILL TV (kapan terakhir terlihat), aksi offline yang gagal 7 hari terakhir, tiket terbuka. Hanya baca.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "teruskan_ke_tim",
    description:
      "Teruskan ke tim NEXBILL. Pakai bila: jawaban tidak ada di panduan/pengetahuan, cek dasar sudah dicoba dan gagal, menyangkut tagihan/langganan/uang/data, merchant minta bicara dengan manusia, atau darurat (P1). Ringkasan harus lengkap supaya tim tidak bertanya ulang. Cukup sekali per percakapan.",
    input_schema: {
      type: "object",
      properties: {
        prioritas: { type: "string", enum: PRIORITIES, description: "P1 darurat (outlet tidak bisa menagih/memulai sesi sekarang), P2 satu fitur tidak jalan, P3 pertanyaan cara pakai, P4 saran/tagihan" },
        kategori: { type: "string", enum: ["keluhan", "saran", "kendala_teknis", "lainnya"] },
        ringkasan: { type: "string", description: "Masalah dalam 1–3 kalimat, dalam Bahasa Indonesia" },
        sudah_dicoba: { type: "string", description: "Langkah yang sudah dicoba merchant / disarankan bot" },
        berulang: { type: "boolean", description: "true bila merchant sudah menyampaikan masalah yang sama sebelumnya di percakapan ini" },
      },
      required: ["prioritas", "kategori", "ringkasan"],
    },
  },
];

function systemPrompt(index: string, input: BrainInput, inHours: boolean) {
  const hours = `Senin–Sabtu ${String(SUPPORT_START_HOUR).padStart(2, "0")}.00–${SUPPORT_END_HOUR}.00 WIB`;
  const where =
    input.channel === "telegram"
      ? "di Telegram. Gaya: teks biasa (tanpa Markdown/tabel), ringkas, langkah bernomor bila perlu, maks. ±12 baris."
      : "di menu Customer Service dashboard NEXBILL (balasan tiket). Gaya: teks biasa (tanpa Markdown/tabel), ringkas, langkah bernomor bila perlu, maks. ±15 baris. Merchant tidak perlu membuat tiket baru — kamu membalas di tiket ini.";
  return [
    {
      type: "text" as const,
      text: `Kamu adalah bot support 24 jam NEXBILL (aplikasi POS & billing rental PlayStation) ${where} Lawan bicaramu adalah owner atau kasir outlet yang memakai NEXBILL — bukan pelanggan rental. Pemilik NEXBILL mengurus support sendirian, jadi selesaikan sebanyak mungkin secara mandiri dengan benar, dan teruskan ke tim hanya bila memang perlu.

Aturan tetap:
- Jawab HANYA dari Panduan Bantuan (buka_panduan), pengetahuan perangkat & kendala yang diketahui & jawaban tim (cari_pengetahuan), dan status akun outlet ini (status_akun). Untuk NEXBILL TV, HDMI, relay, smart plug, pairing, offline: selalu cari_pengetahuan dulu. Kalau tidak ada di sumber-sumber itu, jangan menebak: teruskan_ke_tim dan katakan pesannya diteruskan.
- Untuk kendala teknis outlet ini, cek status_akun dulu (mis. layar TV terakhir terlihat, aksi offline gagal, masa coba habis) sebelum menyarankan langkah.
- Kamu tidak bisa dan tidak boleh mengubah tagihan, langganan, harga, transaksi, atau akun. Jelaskan langkahnya atau teruskan ke tim.
- Jangan pernah meminta atau membagikan PIN, password, token, atau data outlet lain. Jangan menjanjikan fitur, tanggal rilis, atau kompensasi.
- Sebut sumber di akhir jawaban (mis. "Sumber: Panduan › Mode Offline") dan tautan menu dashboard bila relevan: ${DASHBOARD_URL}/dashboard/...
- Prioritas: P1 = outlet tidak bisa menagih atau memulai sesi sekarang (semua TV terkunci, kasir tidak bisa login, dashboard tidak terbuka, data transaksi hilang) → beri langkah darurat dulu (Mode Offline di dashboard, panel kasir NEXBILL TV: tombol OK → PIN), lalu teruskan_ke_tim P1. P2 = satu fitur tidak jalan → pandu cek dasar, gagal → teruskan. P3 = cara pakai → jawab dari panduan. P4 = saran fitur / pertanyaan tagihan → teruskan.
- Merchant yang minta bicara dengan manusia/tim → langsung teruskan_ke_tim, jangan ditahan.
- Pesan "[Balasan tim NEXBILL]" di riwayat adalah jawaban manusia: jangan membantahnya.
- Tim membalas ${hours}. ${inHours ? "Sekarang jam kerja." : "Sekarang DI LUAR jam kerja: setelah meneruskan, sampaikan kapan tim membalas; P1 tetap memanggil petugas jaga."}
- Balas dalam bahasa yang dipakai merchant; bila ragu pakai ${LANG_NAME[input.lang] ?? "Bahasa Indonesia"}.

Daftar Panduan Bantuan (id — judul: ringkasan):
${index}`,
      cache_control: { type: "ephemeral" as const },
    },
    { type: "text" as const, text: `Outlet: ${input.outletName}. Staf: ${input.staffName}. Tanggal: ${new Date().toISOString().slice(0, 10)}.` },
  ];
}

export async function runSupportBrain(input: BrainInput): Promise<BrainResult> {
  const cats = await helpCategories(input.lang);
  const index = cats.map((c) => `${c.id} — ${c.label}: ${c.summary.replace(/\s+/g, " ").slice(0, 160)}`).join("\n");
  const byId = new Map(cats.map((c) => [c.id, c]));
  const latestUserText = [...input.turns].reverse().find((t) => t.role === "user")?.body ?? "";
  const messages: Anthropic.MessageParam[] = toChatMessages(input.turns);
  if (messages.length === 0) throw new Error("Tidak ada pesan merchant untuk dijawab.");
  const inHours = isSupportHours();

  let escalated: { ref: string; priority: SupportPriority } | null = input.alreadyEscalated ?? null;
  let finalText = "";

  for (let guard = 0; guard < 6; guard++) {
    const res = await anthropic.messages.create({ model: SUPPORT_BOT_MODEL, max_tokens: 1200, system: systemPrompt(index, input, inHours), tools: TOOLS, messages });
    const uses = res.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    finalText = res.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
    if (res.stop_reason !== "tool_use" || uses.length === 0) break;

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of uses) {
      let content: string;
      try {
        content = await runTool(use, input, { byId, latestUserText, inHours, escalated, setEscalated: (e) => (escalated = e) });
      } catch (err) {
        content = `Gagal: ${String((err as Error)?.message ?? err)}`;
      }
      results.push({ type: "tool_result", tool_use_id: use.id, content });
    }
    messages.push({ role: "user", content: results });
  }

  const e = escalated as { ref: string; priority: SupportPriority } | null;
  return {
    reply: finalText || (e ? "Pesanmu sudah diteruskan ke tim NEXBILL." : "Maaf, saya belum bisa menjawab itu. Pesanmu bisa diteruskan ke tim NEXBILL."),
    resolution: e ? (e.priority === "P1" ? "urgent" : "ticket") : "answered",
    priority: e?.priority ?? null,
    ref: e?.ref ?? null,
  };
}

interface ToolState {
  byId: Map<string, HelpCategory>;
  latestUserText: string;
  inHours: boolean;
  escalated: { ref: string; priority: SupportPriority } | null;
  setEscalated: (e: { ref: string; priority: SupportPriority }) => void;
}

/** Teruskan ke tim + notifikasi petugas jaga sesuai ambang prioritas. Dipakai juga saat AI gagal (fallback kanal). */
export async function escalateWithNotify(input: Pick<BrainInput, "channel" | "outletId" | "outletName" | "staffName" | "escalate">, e: EscalateInput): Promise<{ ref: string; notified: number }> {
  const { ref } = await input.escalate(e);
  let notified = 0;
  if (shouldNotifyOnCall(e.priority)) {
    const kanal = input.channel === "telegram" ? "Telegram" : "Customer Service";
    notified = await notifyOnCall(
      `${e.priority === "P1" ? "P1 DARURAT" : `${e.priority} perlu tim`} — ${input.outletName} (${kanal})\n${input.staffName}: ${e.summary}\nTiket #${ref} · ${DASHBOARD_URL}/platform-admin/support`
    );
  }
  return { ref, notified };
}

async function runTool(use: Anthropic.ToolUseBlock, input: BrainInput, st: ToolState): Promise<string> {
  const args = (use.input ?? {}) as Record<string, unknown>;
  if (use.name === "buka_panduan") {
    const ids = Array.isArray(args.ids) ? args.ids.map(String).slice(0, 3) : [];
    const found = ids.map((id) => st.byId.get(id)).filter((c): c is HelpCategory => !!c);
    if (found.length === 0) return "Kategori tidak ditemukan. Pakai id dari daftar panduan.";
    return found.map((c) => categoryToText(c).slice(0, 6000)).join("\n\n---\n\n");
  }
  if (use.name === "cari_pengetahuan") {
    return searchKnowledge(String(args.kata_kunci ?? st.latestUserText).slice(0, 300), input.lang);
  }
  if (use.name === "status_akun") {
    return JSON.stringify(await accountStatus(input.outletId));
  }
  if (use.name === "teruskan_ke_tim") {
    const aiPriority = PRIORITIES.includes(args.prioritas as SupportPriority) ? (args.prioritas as SupportPriority) : "P3";
    const priority = enforcedPriority(aiPriority, { text: st.latestUserText, repeatedProblem: args.berulang === true });
    // Sudah diteruskan dan prioritasnya tidak naik → jangan meneruskan (dan memberi tahu petugas) dua kali.
    if (st.escalated && PRIORITIES.indexOf(priority) >= PRIORITIES.indexOf(st.escalated.priority)) {
      return `Sudah diteruskan ke tim (tiket #${st.escalated.ref}, ${st.escalated.priority}). Jangan teruskan lagi; sampaikan bahwa tim akan membalas.`;
    }
    const category = (["keluhan", "saran", "kendala_teknis", "lainnya"] as const).includes(args.kategori as TicketCategory) ? (args.kategori as TicketCategory) : "lainnya";
    const summary = String(args.ringkasan ?? st.latestUserText).slice(0, 2000);
    const status = await accountStatus(input.outletId).catch(() => null);
    const { ref, notified } = await escalateWithNotify(input, {
      priority,
      category,
      summary,
      tried: typeof args.sudah_dicoba === "string" ? args.sudah_dicoba : undefined,
      accountStatus: status ? statusLine(status) : undefined,
    });
    st.setEscalated({ ref, priority });
    return JSON.stringify({
      tiket: `#${ref}`,
      prioritas: priority,
      jamKerja: st.inHours,
      petugasJagaDiberiTahu: notified > 0,
      catatan:
        input.channel === "telegram"
          ? "Balasan tim otomatis muncul di chat Telegram ini dan di menu Customer Service dashboard."
          : "Balasan tim akan muncul di tiket ini (menu Customer Service).",
    });
  }
  return "Tool tidak dikenal.";
}
