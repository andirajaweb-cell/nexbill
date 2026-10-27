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
  readBotNote,
  recordInbound,
  requeueStuckSending,
  writeBotStatus,
} from "../src/lib/leads/wa-bot";
import {
  BOT_COMMAND_POLL_MS,
  BOT_COMMAND_RESTART,
  BOT_HEARTBEAT_INTERVAL_MS,
  HARD_RESTART_NO_QR_MS,
  NO_QR_WATCHDOG_MS,
  RESET_UNLINKED_AFTER_FAILURES,
  VERSION_FETCH_TIMEOUT_MS,
  closeCodeName,
  closeNote,
  jidFromPhone,
  reconnectDelayMs,
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
 * Hasilnya disimpan (cachedVersion) supaya sambung ulang tidak mengambil versi lagi; setiap fetch dibatasi
 * waktunya — fetch tanpa batas waktu bisa menggantung beberapa menit dan QR tidak pernah muncul.
 */
type WaVersion = [number, number, number];
let cachedVersion: WaVersion | null = null;

async function resolveWaVersion(force = false): Promise<WaVersion> {
  if (cachedVersion && !force) return cachedVersion;
  const fromWaWeb = await fetchLatestWaWebVersion({ signal: AbortSignal.timeout(VERSION_FETCH_TIMEOUT_MS) } as any);
  if (fromWaWeb.isLatest) {
    console.log(`Versi WhatsApp Web terdeteksi: ${fromWaWeb.version.join(".")}`);
    cachedVersion = fromWaWeb.version as WaVersion;
    return cachedVersion;
  }
  console.warn("Gagal ambil versi langsung dari WhatsApp Web, coba fallback ke default Baileys.", (fromWaWeb.error as any)?.message ?? fromWaWeb.error);
  const fromBaileys = await Promise.race([
    fetchLatestBaileysVersion(),
    sleep(VERSION_FETCH_TIMEOUT_MS).then(() => null),
  ]);
  if (!fromBaileys || !fromBaileys.isLatest) {
    console.warn('Pakai versi bawaan Baileys — kalau QR tidak muncul / "Couldn\'t link device", cek koneksi server ke web.whatsapp.com / GitHub dan perbarui @whiskeysockets/baileys.');
  }
  // Versi bawaan tidak di-cache: percobaan berikutnya mencoba WhatsApp Web lagi.
  return (fromBaileys?.version as WaVersion) ?? (fromWaWeb.version as WaVersion);
}

let heartbeat: NodeJS.Timeout | null = null;
let outboxPoller: NodeJS.Timeout | null = null;
let watchdog: NodeJS.Timeout | null = null;
let lastConnected = false;
let lastQr: string | null = null;
let lastNumber: string | null = null;
/** Socket yang sedang aktif — event dari socket lama diabaikan supaya tidak memicu sambung ulang ganda. */
let generation = 0;
let failuresWithoutQr = 0;
let reconnectScheduled = false;
let linkedNow = false;
/** Terakhir kali bot "sehat" (QR tampil atau terhubung) — dipakai penjaga keras. */
let lastHealthyAt = Date.now();

/** Mulai ulang proses dari nol (pm2 menyalakannya lagi). Sesi belum-tertaut dibuang supaya QR benar-benar baru. */
async function restartProcess(note: string) {
  const linked = linkedNow;
  if (!linked) clearUnlinkedAuth();
  await status({ connected: false, qrDataUrl: null, number: null, lastError: `${note} Bot dimulai ulang — QR baru muncul ±15 dtk lagi.` });
  console.warn(`${note} Keluar supaya pm2 menyalakan ulang bot.`);
  process.exit(0);
}

// Perintah dari Platform Admin ("Minta QR baru") + penjaga keras bila lama tanpa QR/koneksi.
setInterval(async () => {
  if (lastConnected || lastQr) lastHealthyAt = Date.now();
  try {
    const note = await readBotNote();
    if (note === BOT_COMMAND_RESTART) await restartProcess("Perintah \"Minta QR baru\" dari Platform Admin diterima.");
  } catch {
    // database sesaat bermasalah — coba lagi di putaran berikutnya
  }
  if (!lastConnected && !lastQr && Date.now() - lastHealthyAt > HARD_RESTART_NO_QR_MS) {
    await restartProcess(`Tidak ada QR/koneksi selama ${HARD_RESTART_NO_QR_MS / 60_000} menit.`);
  }
}, BOT_COMMAND_POLL_MS);

function stopTimers() {
  if (outboxPoller) clearInterval(outboxPoller);
  outboxPoller = null;
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
}

/** Hapus sesi login yang BELUM pernah ditautkan (aman — tidak ada nomor yang logout). */
function clearUnlinkedAuth() {
  try {
    for (const f of fs.readdirSync(AUTH_DIR)) fs.rmSync(path.join(AUTH_DIR, f), { recursive: true, force: true });
    console.warn("Sesi login sementara (belum tertaut) dihapus — memulai dari awal.");
  } catch (err) {
    console.error("Gagal menghapus data/wa-auth:", err);
  }
}

function scheduleReconnect(delayMs: number) {
  if (reconnectScheduled) return;
  reconnectScheduled = true;
  setTimeout(() => {
    reconnectScheduled = false;
    start().catch(async (err) => {
      // Sebelumnya error di sini tertelan: proses tetap hidup (heartbeat jalan) tapi tanpa socket → QR tidak pernah muncul.
      failuresWithoutQr++;
      const wait = reconnectDelayMs(failuresWithoutQr);
      console.error("Gagal menyambung ulang bot WhatsApp:", err);
      await status({ connected: false, qrDataUrl: null, number: null, lastError: `Gagal start ulang: ${String((err as Error)?.message ?? err)} — coba lagi dalam ${Math.round(wait / 1000)} dtk.` });
      scheduleReconnect(wait);
    });
  }, delayMs);
}

async function start() {
  const gen = ++generation;
  stopTimers();
  await requeueStuckSending().catch((err) => console.error("Gagal mengembalikan antrean 'sending':", err));

  // Sudah beberapa kali gagal tanpa QR & nomor belum tertaut → buang sesi sementara & ambil versi baru.
  const peek = await useMultiFileAuthState(AUTH_DIR);
  if (!peek.state.creds.me && failuresWithoutQr >= RESET_UNLINKED_AFTER_FAILURES) {
    clearUnlinkedAuth();
    cachedVersion = null;
  }
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  linkedNow = !!state.creds.me;
  await status({ connected: false, qrDataUrl: null, number: null, lastError: `Langkah 1/3: mengambil versi WhatsApp Web… (${new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB)` });
  const version = await resolveWaVersion(failuresWithoutQr >= RESET_UNLINKED_AFTER_FAILURES);
  await status({
    lastError: `Langkah 2/3: membuka koneksi ke WhatsApp (versi ${version.join(".")})… ${linkedNow ? "Nomor sudah tertaut — menyambung tanpa QR." : "QR muncul setelah WhatsApp menjawab (biasanya < 15 dtk)."}`,
  });

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    // Bot CRM tidak butuh riwayat chat lama — lebih ringan & lebih cepat terhubung.
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });
  let hadQr = false;

  sock.ev.on("creds.update", saveCreds);

  // Heartbeat: halaman platform-admin menganggap bot offline kalau heartbeat berhenti.
  if (!heartbeat) {
    heartbeat = setInterval(() => {
      void status({ connected: lastConnected, qrDataUrl: lastConnected ? null : lastQr, number: lastConnected ? lastNumber : null });
    }, BOT_HEARTBEAT_INTERVAL_MS);
  }

  // Penjaga: belum terhubung & belum ada QR terlalu lama → socket macet, tutup supaya dibuat ulang.
  watchdog = setTimeout(() => {
    if (gen !== generation || lastConnected || hadQr) return;
    console.warn(`Belum ada QR setelah ${NO_QR_WATCHDOG_MS / 1000} detik — membuat ulang koneksi.`);
    sock.end(new Boom("Tidak ada QR", { statusCode: DisconnectReason.timedOut }) as any);
  }, NO_QR_WATCHDOG_MS);

  sock.ev.on("connection.update", async (update) => {
    if (gen !== generation) return; // socket lama
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      hadQr = true;
      failuresWithoutQr = 0;
      lastQr = await qrcode.toDataURL(qr);
      lastConnected = false;
      await status({ connected: false, qrDataUrl: lastQr, number: null, lastError: "Langkah 3/3: QR siap — scan sekarang (berganti otomatis tiap ±20 dtk)." });
      console.log("QR baru siap — scan dari WhatsApp di HP (Perangkat Tertaut), atau buka Platform Admin › WhatsApp Bot.");
    }

    if (connection === "open") {
      failuresWithoutQr = 0;
      lastConnected = true;
      lastQr = null;
      lastNumber = sock.user?.id ?? null;
      linkedNow = true;
      if (watchdog) clearTimeout(watchdog);
      watchdog = null;
      await status({ connected: true, qrDataUrl: null, number: lastNumber, lastError: null });
      console.log(`Bot WhatsApp CRM terhubung sebagai ${lastNumber}. Batas harian: ${DAILY_LIMIT} pesan.`);
      if (!outboxPoller) {
        outboxPoller = setInterval(() => void drainOutbox(sock), OUTBOX_POLL_MS);
        void drainOutbox(sock);
      }
    }

    if (connection === "close") {
      const wasConnected = lastConnected;
      lastConnected = false;
      lastQr = null; // QR lama sudah tidak berlaku — jangan dipublikasikan ulang oleh heartbeat
      stopTimers();
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const linked = !!state.creds.me;
      const restart = statusCode === DisconnectReason.restartRequired;
      if (!hadQr && !wasConnected && !restart) failuresWithoutQr++;
      const retryInMs = restart ? 1000 : reconnectDelayMs(failuresWithoutQr);
      const catatan = closeNote({ statusCode, linked, hadQr, failuresWithoutQr, retryInMs });
      await status({ connected: false, qrDataUrl: null, number: null, lastError: catatan });
      console.log("Koneksi WhatsApp terputus.", { statusCode, reason: closeCodeName(statusCode), linked, hadQr, failuresWithoutQr, error: (lastDisconnect?.error as Error)?.message });
      if (restart) console.log('Normal setelah QR pertama kali di-scan — restart otomatis, tunggu "terhubung sebagai".');
      if (!loggedOut) scheduleReconnect(retryInMs);
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
