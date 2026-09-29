/**
 * Bot WhatsApp NEXBILL — KHUSUS CRM platform-admin (/platform-admin/leads).
 * (Tidak lagi mengirim notifikasi booking outlet atau membalas chat pelanggan outlet dengan AI —
 *  keputusan 2026-09-29, lihat src/lib/notifications/outlet-whatsapp.ts.)
 *
 * Tugas:
 *  1. Login via QR (seperti WhatsApp Web). Status, QR, dan heartbeat ditulis ke tabel
 *     platform_wa_bot_status supaya halaman /platform-admin/whatsapp-bot (di Vercel) bisa membacanya.
 *  2. Mengirim antrean platform_wa_outbox (pesan admin ke lead) dengan jeda acak antarpesan dan
 *     batas harian (env WA_BOT_DAILY_LIMIT, default 150), lalu mencatat aktivitas di lead.
 *  3. Balasan masuk dari nomor lead dicatat ke riwayat lead + tanda "balasan baru". TIDAK dibalas
 *     otomatis. Chat grup dan nomor yang bukan lead diabaikan.
 *
 * Jalankan di server yang menyala 24 jam (BUKAN Vercel):  npm run bot:whatsapp
 * Butuh DATABASE_URL yang sama dengan web app (.env).
 *
 * Catatan .mts: Baileys v7 bergantung pada "whatsapp-rust-bridge" yang hanya ESM, jadi file ini
 * harus .mts (native ESM) — lihat riwayat di scripts/whatsapp-bot.ts (sudah tidak dipakai).
 *
 * Sesi login disimpan di ./data/wa-auth/ — backup, jangan di-commit (sudah di .gitignore).
 * Hapus folder itu untuk login ulang dengan nomor lain.
 */
import "dotenv/config";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import {
  claimPending,
  countSentSince,
  markOutboxFailed,
  markOutboxSent,
  recordInbound,
  requeueStuckSending,
  writeBotStatus,
} from "../src/lib/leads/wa-bot";
import {
  BOT_HEARTBEAT_INTERVAL_MS,
  jidFromPhone,
  parseDailyLimit,
  phoneFromJids,
  sendDelayMs,
  startOfTodayWibIso,
} from "../src/lib/leads/wa-bot-rules";

const AUTH_DIR = path.join(process.cwd(), "data", "wa-auth");
fs.mkdirSync(AUTH_DIR, { recursive: true });

const DAILY_LIMIT = parseDailyLimit(process.env.WA_BOT_DAILY_LIMIT);
const OUTBOX_POLL_MS = 10_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Status ke DB tidak boleh mematikan bot kalau database sedang bermasalah sesaat. */
async function status(patch: Parameters<typeof writeBotStatus>[0]) {
  try {
    await writeBotStatus(patch);
  } catch (err) {
    console.error("Gagal menulis status bot ke database:", err);
  }
}

let sending = false;

/** Kirim antrean CRM satu per satu dengan jeda acak; berhenti bila batas harian tercapai. */
async function drainOutbox(sock: ReturnType<typeof makeWASocket>) {
  if (sending) return;
  sending = true;
  try {
    const sentToday = await countSentSince(startOfTodayWibIso());
    const quota = DAILY_LIMIT - sentToday;
    if (quota <= 0) return; // sisanya tetap pending, dikirim besok
    const batch = await claimPending(Math.min(5, quota));
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      try {
        await sock.sendMessage(jidFromPhone(row.phone), { text: row.body });
        await markOutboxSent(row);
        console.log(`Terkirim ke ${row.phone} (lead ${row.leadId}).`);
      } catch (err: any) {
        console.error(`Gagal kirim ke ${row.phone}:`, err);
        await markOutboxFailed(row.id, String(err?.message ?? err));
      }
      if (i < batch.length - 1) await sleep(sendDelayMs());
    }
  } catch (err) {
    console.error("Gagal memproses antrean WA CRM:", err);
  } finally {
    sending = false;
  }
}

/**
 * WhatsApp menolak pairing QR ("Couldn't link device") bila versi protokol yang diumumkan socket
 * sudah basi. Ambil versi langsung dari WhatsApp Web dulu; fallback ke default Baileys.
 */
async function resolveWaVersion() {
  const fromWaWeb = await fetchLatestWaWebVersion({});
  if (fromWaWeb.isLatest) {
    console.log(`Versi WhatsApp Web terdeteksi: ${fromWaWeb.version.join(".")}`);
    return fromWaWeb.version;
  }
  console.warn("Gagal ambil versi langsung dari WhatsApp Web, coba fallback ke default Baileys.", (fromWaWeb.error as any)?.message ?? fromWaWeb.error);
  const fromBaileys = await fetchLatestBaileysVersion();
  if (!fromBaileys.isLatest) {
    console.warn(`Pakai versi bundled (${fromBaileys.version.join(".")}) — kalau QR terus gagal "Couldn't link device", cek koneksi server ke web.whatsapp.com / GitHub.`);
  }
  return fromBaileys.version;
}

let heartbeat: NodeJS.Timeout | null = null;
let outboxPoller: NodeJS.Timeout | null = null;
let lastConnected = false;
let lastQr: string | null = null;
let lastNumber: string | null = null;

function stopTimers() {
  if (outboxPoller) clearInterval(outboxPoller);
  outboxPoller = null;
}

async function start() {
  await requeueStuckSending().catch((err) => console.error("Gagal mengembalikan antrean 'sending':", err));
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const version = await resolveWaVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    // Bot CRM tidak butuh riwayat chat lama — lebih ringan & lebih cepat terhubung.
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Heartbeat: halaman platform-admin menganggap bot offline kalau heartbeat berhenti.
  if (!heartbeat) {
    heartbeat = setInterval(() => {
      void status({ connected: lastConnected, qrDataUrl: lastConnected ? null : lastQr, number: lastConnected ? lastNumber : null });
    }, BOT_HEARTBEAT_INTERVAL_MS);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQr = await qrcode.toDataURL(qr);
      lastConnected = false;
      await status({ connected: false, qrDataUrl: lastQr, number: null, lastError: null });
      console.log("QR baru siap — scan dari WhatsApp di HP (Perangkat Tertaut), atau buka Platform Admin › WhatsApp Bot.");
    }

    if (connection === "open") {
      lastConnected = true;
      lastQr = null;
      lastNumber = sock.user?.id ?? null;
      await status({ connected: true, qrDataUrl: null, number: lastNumber, lastError: null });
      console.log(`Bot WhatsApp CRM terhubung sebagai ${lastNumber}. Batas harian: ${DAILY_LIMIT} pesan.`);
      if (!outboxPoller) {
        outboxPoller = setInterval(() => void drainOutbox(sock), OUTBOX_POLL_MS);
        void drainOutbox(sock);
      }
    }

    if (connection === "close") {
      lastConnected = false;
      lastQr = null; // QR lama sudah tidak berlaku — jangan dipublikasikan ulang oleh heartbeat
      stopTimers();
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const reasonName = Object.entries(DisconnectReason).find(([, v]) => v === statusCode)?.[0] ?? "unknown";
      await status({ connected: false, qrDataUrl: null, number: null, lastError: loggedOut ? "Logout dari HP — hapus data/wa-auth lalu jalankan ulang untuk scan QR baru." : `Terputus: ${reasonName}` });
      console.log("Koneksi WhatsApp terputus.", { statusCode, reason: reasonName });
      if (statusCode === DisconnectReason.restartRequired) {
        console.log('Normal setelah QR pertama kali di-scan — restart otomatis, tunggu "terhubung sebagai".');
      }
      if (!loggedOut) setTimeout(() => void start(), 3000);
      else console.warn("Sesi logout. Hapus folder data/wa-auth lalu jalankan ulang bot untuk login dengan QR baru.");
    }
  });

  // Balasan masuk: hanya dicatat ke lead yang nomornya cocok, tidak dibalas otomatis.
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const key = msg.key as typeof msg.key & { remoteJidAlt?: string; senderPn?: string; participantAlt?: string };
      if (key.remoteJid?.endsWith("@g.us")) continue; // abaikan grup
      const phone = phoneFromJids([key.remoteJid, key.remoteJidAlt, key.senderPn, key.participantAlt]);
      if (!phone) continue;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        (msg.message.imageMessage ? "[gambar]" : msg.message.audioMessage ? "[pesan suara]" : msg.message.documentMessage ? "[dokumen]" : "");
      if (!text.trim()) continue;
      try {
        const n = await recordInbound(phone, text);
        if (n > 0) console.log(`Balasan dari ${phone} dicatat ke ${n} lead.`);
      } catch (err) {
        console.error("Gagal mencatat balasan WhatsApp:", err);
      }
    }
  });
}

start().catch(async (err) => {
  console.error("Bot WhatsApp gagal start:", err);
  await status({ connected: false, qrDataUrl: null, lastError: `Gagal start: ${String((err as Error)?.message ?? err)}` });
  process.exit(1);
});
