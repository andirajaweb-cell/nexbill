/**
 * Otak bot Telegram support 24 jam: Claude menjawab HANYA dari Panduan Bantuan NEXBILL dan status
 * akun merchant itu sendiri (hanya baca). Yang tidak bisa dijawab → tiket Chat Bantuan. Bot tidak
 * pernah mengubah uang, tagihan, langganan, atau akun (tidak ada tool untuk itu).
 *
 * Model: env TELEGRAM_SUPPORT_MODEL (default claude-haiku-5-5 — murah; c_bot di dokumen kerangka).
 */
import Anthropic from "@anthropic-ai/sdk";
import { loadHelpBook, mergeWithSource } from "@/lib/help/content/index";
import type { HelpCategory, HelpLang } from "@/lib/help/types";
import {
  accountStatus,
  createSupportTicket,
  DASHBOARD_URL,
  notifyOnCall,
  statusLine,
  type TelegramLink,
  type TicketCategory,
} from "./support-service";
import { categoryToText, enforcedPriority, isSupportHours, PRIORITIES, SUPPORT_END_HOUR, SUPPORT_START_HOUR, toChatMessages, type ChatTurn, type SupportPriority } from "./support-rules";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.TELEGRAM_SUPPORT_MODEL || "claude-haiku-5-5";
const HELP_LANGS: HelpLang[] = ["id", "en", "ms", "th", "fil", "vi"];

const LANG_NAME: Record<string, string> = { id: "Bahasa Indonesia", en: "English", ms: "Bahasa Melayu", th: "ภาษาไทย", fil: "Filipino", vi: "Tiếng Việt" };

async function helpCategories(lang: string): Promise<HelpCategory[]> {
  const l = (HELP_LANGS as string[]).includes(lang) ? (lang as HelpLang) : "id";
  return mergeWithSource(await loadHelpBook(l)).categories;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buka_panduan",
    description: "Ambil isi lengkap 1–3 kategori Panduan Bantuan NEXBILL (langkah, letak menu, catatan). Selalu panggil ini sebelum menjelaskan cara pakai fitur — jangan menjawab dari ingatan.",
    input_schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3, description: "id kategori dari daftar panduan" } },
      required: ["ids"],
    },
  },
  {
    name: "status_akun",
    description: "Baca status akun outlet merchant ini: langganan & masa coba, jumlah unit, layar NEXBILL TV (kapan terakhir terlihat), aksi offline yang gagal 7 hari terakhir, tiket terbuka. Hanya baca.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buat_tiket",
    description:
      "Teruskan ke tim NEXBILL sebagai tiket Chat Bantuan. Pakai bila: jawaban tidak ada di panduan, cek dasar sudah dicoba dan gagal, menyangkut tagihan/langganan/uang/data, merchant minta bicara dengan manusia, atau darurat (P1). Ringkasan harus lengkap supaya tim tidak bertanya ulang.",
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

function systemPrompt(index: string, ctx: { outlet: string; staff: string; lang: string; inHours: boolean }) {
  const hours = `Senin–Sabtu ${String(SUPPORT_START_HOUR).padStart(2, "0")}.00–${SUPPORT_END_HOUR}.00 WIB`;
  return [
    {
      type: "text" as const,
      text: `Kamu adalah bot support 24 jam NEXBILL (aplikasi POS & billing rental PlayStation) di Telegram. Lawan bicaramu adalah owner atau kasir outlet yang memakai NEXBILL — bukan pelanggan rental.

Aturan tetap:
- Jawab HANYA dari Panduan Bantuan (tool buka_panduan) dan status akun outlet ini (tool status_akun). Kalau tidak ada di sana, jangan menebak: buat tiket dan katakan pesannya diteruskan ke tim.
- Kamu tidak bisa dan tidak boleh mengubah tagihan, langganan, harga, transaksi, atau akun. Jelaskan langkahnya atau buat tiket.
- Jangan pernah meminta atau membagikan PIN, password, token, atau data outlet lain. Jangan menjanjikan fitur, tanggal rilis, atau kompensasi.
- Sebut judul panduan yang kamu pakai di akhir jawaban (mis. "Sumber: Panduan › Mode Offline") dan tautan menu dashboard bila relevan: ${DASHBOARD_URL}/dashboard/...
- Prioritas: P1 = outlet tidak bisa menagih atau memulai sesi sekarang (semua TV terkunci, kasir tidak bisa login, dashboard tidak terbuka, data transaksi hilang) → beri langkah darurat dulu (Mode Offline di dashboard, panel kasir NEXBILL TV: tombol OK → PIN), lalu buat_tiket P1. P2 = satu fitur tidak jalan → pandu cek dasar, gagal → tiket. P3 = cara pakai → jawab dari panduan. P4 = saran fitur / pertanyaan tagihan → buat tiket.
- Merchant yang minta bicara dengan manusia/tim → langsung buat_tiket, jangan ditahan.
- Tim membalas tiket ${hours}. ${ctx.inHours ? "Sekarang jam kerja." : "Sekarang DI LUAR jam kerja: setelah membuat tiket, sampaikan kapan tim membalas; hanya P1 yang memanggil petugas jaga."}
- Gaya: teks biasa untuk Telegram (tanpa Markdown/tabel), ringkas, langkah bernomor bila perlu, maks. ±12 baris. Balas dalam bahasa yang dipakai merchant; bila ragu pakai ${LANG_NAME[ctx.lang] ?? "Bahasa Indonesia"}.

Daftar Panduan Bantuan (id — judul: ringkasan):
${index}`,
      cache_control: { type: "ephemeral" as const },
    },
    { type: "text" as const, text: `Outlet: ${ctx.outlet}. Staf: ${ctx.staff}. Tanggal: ${new Date().toISOString().slice(0, 10)}.` },
  ];
}

export interface BotResult {
  reply: string;
  resolution: "answered" | "ticket" | "urgent";
  priority: SupportPriority | null;
  threadId: string | null;
}

/** Satu giliran bot. `turns` = riwayat percakapan berjalan, pesan terbaru merchant di akhir. */
export async function runSupportBot(link: TelegramLink, ctx: { outlet: string; lang: string }, turns: ChatTurn[]): Promise<BotResult> {
  const cats = await helpCategories(ctx.lang);
  const index = cats.map((c) => `${c.id} — ${c.label}: ${c.summary.replace(/\s+/g, " ").slice(0, 160)}`).join("\n");
  const byId = new Map(cats.map((c) => [c.id, c]));
  const latestUserText = [...turns].reverse().find((t) => t.role === "user")?.body ?? "";
  const messages: Anthropic.MessageParam[] = toChatMessages(turns);
  const inHours = isSupportHours();

  let ticket: { threadId: string; priority: SupportPriority } | null = null;
  let finalText = "";

  for (let guard = 0; guard < 6; guard++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt(index, { outlet: ctx.outlet, staff: link.staffName ?? "Staf", lang: ctx.lang, inHours }),
      tools: TOOLS,
      messages,
    });
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
        content = await runTool(use, { link, byId, latestUserText, ctx, inHours, ticket, setTicket: (t) => (ticket = t) });
      } catch (err) {
        content = `Gagal: ${String((err as Error)?.message ?? err)}`;
      }
      results.push({ type: "tool_result", tool_use_id: use.id, content });
    }
    messages.push({ role: "user", content: results });
  }

  const t = ticket as { threadId: string; priority: SupportPriority } | null;
  return {
    reply: finalText || (t ? "Pesanmu sudah diteruskan ke tim NEXBILL." : "Maaf, saya belum bisa menjawab itu. Ketik /tim untuk meneruskan ke tim NEXBILL."),
    resolution: t ? (t.priority === "P1" ? "urgent" : "ticket") : "answered",
    priority: t?.priority ?? null,
    threadId: t?.threadId ?? null,
  };
}

interface ToolCtx {
  link: TelegramLink;
  byId: Map<string, HelpCategory>;
  latestUserText: string;
  ctx: { outlet: string; lang: string };
  inHours: boolean;
  ticket: { threadId: string; priority: SupportPriority } | null;
  setTicket: (t: { threadId: string; priority: SupportPriority }) => void;
}

async function runTool(use: Anthropic.ToolUseBlock, tc: ToolCtx): Promise<string> {
  const input = (use.input ?? {}) as Record<string, unknown>;
  if (use.name === "buka_panduan") {
    const ids = Array.isArray(input.ids) ? input.ids.map(String).slice(0, 3) : [];
    const found = ids.map((id) => tc.byId.get(id)).filter((c): c is HelpCategory => !!c);
    if (found.length === 0) return "Kategori tidak ditemukan. Pakai id dari daftar panduan.";
    return found.map((c) => categoryToText(c).slice(0, 6000)).join("\n\n---\n\n");
  }
  if (use.name === "status_akun") {
    return JSON.stringify(await accountStatus(tc.link.outletId));
  }
  if (use.name === "buat_tiket") {
    if (tc.ticket) return `Tiket sudah dibuat di percakapan ini (#${tc.ticket.threadId.slice(0, 8)}). Jangan buat lagi.`;
    const aiPriority = PRIORITIES.includes(input.prioritas as SupportPriority) ? (input.prioritas as SupportPriority) : "P3";
    const priority = enforcedPriority(aiPriority, { text: tc.latestUserText, repeatedProblem: input.berulang === true });
    const category = (["keluhan", "saran", "kendala_teknis", "lainnya"] as const).includes(input.kategori as TicketCategory) ? (input.kategori as TicketCategory) : "lainnya";
    const summary = String(input.ringkasan ?? tc.latestUserText).slice(0, 2000);
    const status = await accountStatus(tc.link.outletId).catch(() => null);
    const { threadId } = await createSupportTicket({
      link: tc.link,
      priority,
      category,
      summary,
      tried: typeof input.sudah_dicoba === "string" ? input.sudah_dicoba : undefined,
      accountStatus: status ? statusLine(status) : undefined,
    });
    tc.setTicket({ threadId, priority });
    let oncall = 0;
    if (priority === "P1") {
      oncall = await notifyOnCall(
        `P1 DARURAT — ${tc.ctx.outlet}\n${tc.link.staffName ?? "Staf"}: ${summary}\nTiket #${threadId.slice(0, 8)} · ${DASHBOARD_URL}/platform-admin/support`
      );
    }
    return JSON.stringify({
      tiket: `#${threadId.slice(0, 8)}`,
      prioritas: priority,
      jamKerja: tc.inHours,
      petugasJagaDipanggil: priority === "P1" ? oncall > 0 : false,
      catatan: "Balasan tim otomatis muncul di chat Telegram ini. Merchant juga bisa melihatnya di menu Customer Service dashboard.",
    });
  }
  return "Tool tidak dikenal.";
}
