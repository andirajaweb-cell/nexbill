/**
 * Standalone WhatsApp bot process (unofficial, via Baileys — scan QR like WhatsApp Web).
 * Runs separately from the Next.js server so a hot-reload / redeploy of the web app
 * doesn't drop the WhatsApp socket connection.
 *
 * Run with:  npm run bot:whatsapp
 *
 * NOTE: this file uses the .mts extension (not .ts) on purpose. Baileys v7 depends on
 * "whatsapp-rust-bridge", which only ships an ESM ("import") export condition — no
 * CommonJS/"require" fallback. Since this project's package.json has no "type":"module",
 * tsx/Node treat plain .ts files as CommonJS and transpile `import` down to `require()`,
 * which then fails to resolve that dependency (ERR_PACKAGE_PATH_NOT_EXPORTED). Node always
 * treats .mts as native ESM regardless of package.json "type", which sidesteps the problem
 * without changing module resolution for the rest of the app. See scripts/whatsapp-bot.ts
 * (now unused/superseded — safe to delete) for the pre-fix version.
 *
 * Auth session is persisted in ./data/wa-auth/ — back it up, and don't commit it
 * (already covered by .gitignore). Delete that folder to force a fresh QR login
 * (e.g. if you need to re-link a different phone number).
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
import { db } from "../src/db/client";
import { chatThreads, bookingNotifications } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { runAgentReply } from "../src/lib/ai/agent";

/** "0812..." / "+62812..." / "62812..." all normalize to "6281...@s.whatsapp.net" — Baileys JID format. */
function phoneToJid(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `${normalized}@s.whatsapp.net`;
}

const AUTH_DIR = path.join(process.cwd(), "data", "wa-auth");
const STATUS_FILE = path.join(process.cwd(), "data", "whatsapp-status.json");
fs.mkdirSync(AUTH_DIR, { recursive: true });

function writeStatus(status: Record<string, unknown>) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ ...status, updatedAt: new Date().toISOString() }, null, 2));
}

async function findOrCreateThread(waJid: string) {
  const [existing] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.channel, "whatsapp"), eq(chatThreads.externalId, waJid)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(chatThreads)
    .values({ channel: "whatsapp", externalId: waJid })
    .returning();
  return created;
}

/**
 * Polls booking_notifications for anything the Reservation Engine queued
 * (reminders, confirmation, reschedule, cancellation, waitlist-available —
 * see src/lib/rental/notifications.ts + scheduler.ts) and actually sends it,
 * since this process is the only one holding a live WhatsApp socket. Booking
 * logic never sends directly — it just inserts a "pending" row, so this is
 * the one place that ever calls sock.sendMessage for booking notifications.
 */
async function sendPendingBookingNotifications(sock: ReturnType<typeof makeWASocket>) {
  const pending = await db.select().from(bookingNotifications).where(eq(bookingNotifications.status, "pending")).limit(20);
  for (const n of pending) {
    if (!n.phone) {
      await db.update(bookingNotifications).set({ status: "failed", error: "Tidak ada nomor telepon." }).where(eq(bookingNotifications.id, n.id));
      continue;
    }
    try {
      await sock.sendMessage(phoneToJid(n.phone), { text: n.message });
      await db.update(bookingNotifications).set({ status: "sent", sentAt: new Date().toISOString() }).where(eq(bookingNotifications.id, n.id));
    } catch (err: any) {
      console.error(`Gagal kirim notifikasi booking ${n.id}:`, err);
      await db.update(bookingNotifications).set({ status: "failed", error: String(err?.message ?? err) }).where(eq(bookingNotifications.id, n.id));
    }
  }
}

/**
 * WhatsApp's own servers reject a QR pairing attempt with "Couldn't link
 * device" whenever the protocol `version` tuple the socket announces is
 * stale relative to what's actually deployed. `fetchLatestBaileysVersion()`
 * only reads Baileys' own hardcoded defaults file on GitHub — that can lag
 * days/weeks behind WhatsApp's real rollout, and if the GitHub fetch itself
 * fails (network/firewall), it silently falls back to the bundled version
 * with zero warning. `fetchLatestWaWebVersion()` instead reads the version
 * straight out of WhatsApp Web's own service worker, so it can't go stale
 * the same way — try that first, and only fall back to the Baileys-pinned
 * version (still logged clearly) if it can't be reached.
 */
async function resolveWaVersion() {
  const fromWaWeb = await fetchLatestWaWebVersion({});
  if (fromWaWeb.isLatest) {
    console.log(`Versi WhatsApp Web terdeteksi: ${fromWaWeb.version.join(".")}`);
    return fromWaWeb.version;
  }
  console.warn("Gagal ambil versi langsung dari WhatsApp Web, coba fallback ke default Baileys.", (fromWaWeb.error as any)?.message ?? fromWaWeb.error);

  const fromBaileys = await fetchLatestBaileysVersion();
  if (fromBaileys.isLatest) {
    console.log(`Versi dari Baileys defaults: ${fromBaileys.version.join(".")}`);
  } else {
    console.warn(`Pakai versi bundled bawaan library (${fromBaileys.version.join(".")}) — kalau QR terus gagal "Couldn't link device", ini kemungkinan penyebabnya. Cek koneksi internet server ke web.whatsapp.com / GitHub.`);
  }
  return fromBaileys.version;
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const version = await resolveWaVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    // A recognized, well-tested desktop browser signature — the library
    // default is sometimes flagged by WhatsApp's device-linking checks,
    // which is another common cause of "Couldn't link device" on scan.
    browser: Browsers.ubuntu("Chrome"),
  });

  sock.ev.on("creds.update", saveCreds);

  let notificationPoller: NodeJS.Timeout | null = null;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await qrcode.toDataURL(qr);
      writeStatus({ connected: false, qrDataUrl });
      console.log("Scan QR ini dari WhatsApp di HP (Linked Devices) — atau buka Dashboard > WhatsApp Bot.");
    }

    if (connection === "open") {
      writeStatus({ connected: true, qrDataUrl: null, number: sock.user?.id });
      console.log(`WhatsApp bot terhubung sebagai ${sock.user?.id}`);
      if (!notificationPoller) {
        notificationPoller = setInterval(() => {
          sendPendingBookingNotifications(sock).catch((err) => console.error("Gagal polling notifikasi booking:", err));
        }, 20_000);
      }
    }

    if (connection === "close") {
      writeStatus({ connected: false, qrDataUrl: null });
      if (notificationPoller) {
        clearInterval(notificationPoller);
        notificationPoller = null;
      }
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const reasonName = Object.entries(DisconnectReason).find(([, v]) => v === statusCode)?.[0];
      console.log("Koneksi WhatsApp terputus.", { shouldReconnect, statusCode, reason: reasonName ?? "unknown" });
      if (statusCode === DisconnectReason.restartRequired) {
        console.log('Ini normal setelah QR pertama kali di-scan — restart otomatis, tunggu "terhubung sebagai" muncul.');
      } else if (statusCode === DisconnectReason.timedOut || !statusCode) {
        console.warn('QR/koneksi timeout sebelum sempat linked. Kalau di HP muncul "Couldn\'t link device": pastikan jam HP & server sama-sama akurat, jaringan server bisa akses web.whatsapp.com, dan coba scan QR yang PALING BARU (QR lama otomatis kedaluwarsa ~20 detik).');
      }
      // Small backoff before reconnecting — without this, a persistent failure (e.g. no
      // internet, DNS down) spins into a tight reconnect loop hammering CPU/network with
      // hundreds of attempts per second (observed directly while testing this fix).
      if (shouldReconnect) setTimeout(() => start(), 3000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith("@g.us")) continue; // ignore group chats

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";
      if (!text.trim()) continue;

      try {
        const thread = await findOrCreateThread(jid);
        const reply = await runAgentReply(thread.id, text);
        if (reply) {
          await sock.sendMessage(jid, { text: reply });
        }
      } catch (err) {
        console.error("Gagal memproses pesan WhatsApp:", err);
      }
    }
  });
}

start().catch((err) => {
  console.error("WhatsApp bot gagal start:", err);
  process.exit(1);
});
