/**
 * Pembungkus kecil Bot API Telegram (fetch langsung, tanpa library). Token dari env
 * TELEGRAM_BOT_TOKEN — satu bot NEXBILL untuk semua merchant. Pesan dikirim sebagai teks biasa
 * (tanpa parse_mode) supaya karakter apa pun di jawaban AI tidak membuat pesan gagal terkirim.
 */
import { splitTelegramText } from "./support-rules";

export function telegramToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t ? t : null;
}

export function telegramConfigured(): boolean {
  return telegramToken() !== null;
}

/** Rahasia yang dikirim Telegram di header X-Telegram-Bot-Api-Secret-Token pada setiap webhook. */
export function telegramWebhookSecret(): string | null {
  const s = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return s ? s : null;
}

export class TelegramError extends Error {}

export async function telegramCall<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T> {
  const token = telegramToken();
  if (!token) throw new TelegramError("TELEGRAM_BOT_TOKEN belum diisi.");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
  if (!data?.ok) throw new TelegramError(data?.description || `Telegram ${method} gagal (${res.status}).`);
  return data.result as T;
}

export interface TgSentMessage {
  message_id: number;
}

export type TgInlineButton = { text: string; callback_data: string } | { text: string; url: string };

/** Tombol tetap di atas keyboard HP (reply keyboard) — teks tombol terkirim sebagai pesan biasa. */
export type TgReplyKeyboard = string[][];

/** Kirim teks (dipotong otomatis bila > 4096 karakter). Tombol (inline keyboard) dipasang di potongan terakhir. */
export async function sendTelegramText(
  chatId: string | number,
  text: string,
  opts: { replyTo?: number; buttons?: TgInlineButton[][]; keyboard?: TgReplyKeyboard } = {}
): Promise<number | null> {
  let last: number | null = null;
  const parts = splitTelegramText(text);
  for (let i = 0; i < parts.length; i++) {
    const msg = await telegramCall<TgSentMessage>("sendMessage", {
      chat_id: chatId,
      text: parts[i],
      disable_web_page_preview: true,
      ...(i === 0 && opts.replyTo ? { reply_parameters: { message_id: opts.replyTo, allow_sending_without_reply: true } } : {}),
      ...(i === parts.length - 1 && opts.buttons?.length ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
      ...(i === parts.length - 1 && !opts.buttons?.length && opts.keyboard?.length
        ? { reply_markup: { keyboard: opts.keyboard.map((row) => row.map((text) => ({ text }))), resize_keyboard: true, is_persistent: true } }
        : {}),
    });
    last = msg.message_id;
  }
  return last;
}

/** Tutup "loading" tombol di aplikasi Telegram (wajib dijawab ≤ 10 detik), opsional dengan notifikasi singkat. */
export async function answerCallbackQuery(id: string, text?: string) {
  await telegramCall("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) }).catch(() => undefined);
}

/** Ganti isi pesan + tombolnya (navigasi menu tanpa membanjiri chat). Gagal (mis. isi sama) diabaikan. */
export async function editTelegramText(chatId: string | number, messageId: number, text: string, buttons: TgInlineButton[][]) {
  await telegramCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: buttons },
  }).catch(() => undefined);
}

/** Hapus tombol dari pesan yang sudah dinilai merchant (tidak bisa ditekan dua kali). */
export async function removeButtons(chatId: string | number, messageId: number) {
  await telegramCall("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(() => undefined);
}

export async function sendTyping(chatId: string | number) {
  await telegramCall("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => undefined);
}

export interface TgBotInfo {
  id: number;
  username: string;
  first_name: string;
}

let cachedBot: { info: TgBotInfo; at: number } | null = null;

/** getMe di-cache 10 menit — dipakai untuk membentuk link t.me/<username>. */
export async function getBotInfo(): Promise<TgBotInfo | null> {
  if (!telegramConfigured()) return null;
  if (cachedBot && Date.now() - cachedBot.at < 10 * 60_000) return cachedBot.info;
  try {
    const info = await telegramCall<TgBotInfo>("getMe");
    cachedBot = { info, at: Date.now() };
    return info;
  } catch {
    return null;
  }
}

export interface TgWebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export async function getWebhookInfo(): Promise<TgWebhookInfo> {
  return telegramCall<TgWebhookInfo>("getWebhookInfo");
}

export async function setWebhook(url: string, secret: string) {
  await telegramCall("setWebhook", { url, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: false, max_connections: 20 });
  await telegramCall("setMyCommands", {
    commands: [
      { command: "menu", description: "📚 Menu bantuan lengkap per topik" },
      { command: "tim", description: "👤 Bicara dengan staf Tim Support NEXBILL" },
      { command: "status", description: "📊 Cek status akun & perangkat outlet" },
      { command: "grup", description: "👥 Gabung grup Telegram NEXBILL" },
      { command: "bantuan", description: "❓ Cara memakai chat support ini" },
      { command: "putus", description: "Putuskan Telegram dari akun NEXBILL" },
    ],
  });
}

/* ------------------------------------------------------------- tipe update (yang dipakai saja) ------------------------------------------------------------- */

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: "private" | "group" | "supergroup" | "channel" };
  date: number;
  text?: string;
  caption?: string;
  photo?: unknown[];
  document?: unknown;
  voice?: unknown;
  reply_to_message?: { message_id: number };
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  data?: string;
  message?: { message_id: number; chat: { id: number; type: string } };
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}
