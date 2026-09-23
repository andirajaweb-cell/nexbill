/**
 * Relay Hub — standalone long-running process, same pattern as
 * scripts/whatsapp-bot.mts and scripts/booking-scheduler.ts (Next.js runs
 * single-process via `next start` with no room for a WebSocket upgrade
 * handler, so anything that needs a persistent socket lives here instead).
 *
 * Two responsibilities:
 *  1. WebSocket server (RELAY_WS_PORT) — outlet Relay Agents connect here
 *     (outbound from their side, so no inbound port forwarding needed on the
 *     outlet's router) and authenticate with a per-agent token.
 *  2. Internal HTTP server (RELAY_HTTP_PORT, bound to 127.0.0.1 only) — the
 *     Next.js app's android-tv-relay device adapter POSTs commands here and
 *     gets the agent's response relayed back synchronously. Not exposed
 *     publicly and has no auth of its own — it trusts anything already
 *     running on the same server, same trust boundary as the Next.js
 *     process itself.
 *
 * Run with: npm run relay:hub
 * Deploy alongside the Next.js app (same server). RELAY_WS_PORT itself is
 * bound to RELAY_WS_BIND_HOST (127.0.0.1 by default — see
 * src/lib/relay/config.ts) and is never meant to be reachable directly from
 * the internet: put a Cloudflare Tunnel (or any reverse proxy) in front of
 * it and point outlets at that public hostname (RELAY_HUB_PUBLIC_URL)
 * instead. This also sidesteps the Vercel-can't-hold-a-socket problem for
 * the WS side specifically — only the HTTP /dispatch side needs the
 * separate-VPS topology described in relay/config.ts if the Next.js app
 * itself ever moves off this machine.
 */
import "dotenv/config";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "../src/db/client";
import { relayAgents, outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { describeError } from "../src/lib/api/error";
import {
  normalizeHandshake,
  isRelayAction,
  checkActionAllowed,
  validateHdmiPort,
  validateAndroidPackage,
  isPrivateLanIPv4,
  type RelayCapability,
} from "../src/lib/relay/capabilities";
import {
  RELAY_WS_PORT,
  RELAY_WS_BIND_HOST,
  RELAY_HTTP_PORT,
  RELAY_HTTP_BIND_HOST,
  RELAY_HUB_DISPATCH_SECRET,
  RELAY_COMMAND_TIMEOUT_MS,
  RELAY_HEARTBEAT_TIMEOUT_MS,
  RelayAgentToHubMessage,
  RelayHubToAgentMessage,
  RelayDispatchRequest,
  RelayDispatchResponse,
} from "../src/lib/relay/config";

interface ConnectedAgent {
  ws: WebSocket;
  token: string;
  outletId: string;
  relayAgentId: string;
  lastPingAt: number;
  /**
   * Dilaporkan agent saat auth (v1.2+), atau "1.1" + ["power"] untuk agent lama. Disimpan DI MEMORI
   * dan menjadi dasar keputusan izin /dispatch — bukan dibaca dari database — karena yang
   * menentukan apa yang bisa dijalankan adalah program yang SEDANG terhubung saat ini, bukan
   * yang terakhir tercatat. Outlet yang baru turun kembali ke v1.1 harus langsung dibatasi lagi.
   */
  agentVersion: string;
  capabilities: RelayCapability[];
}

interface PendingCommand {
  resolve: (res: RelayDispatchResponse) => void;
  timer: NodeJS.Timeout;
}

const connectedByToken = new Map<string, ConnectedAgent>();
const pendingByCommandId = new Map<string, PendingCommand>();

function send(ws: WebSocket, msg: RelayHubToAgentMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// Retries a few times with backoff before giving up — covers the transient case seen in
// production where the VPS's DNS resolver briefly fails to resolve the Supabase pooler
// hostname (EAI_AGAIN, "try again"), which would otherwise silently drop a single
// online/offline transition instead of just being a passing blip. Not persisted or queued
// across restarts — if the hub process itself dies mid-retry, the next connect/disconnect
// naturally re-syncs status anyway, so this only needs to smooth over sub-second-to-few-second
// DNS/network hiccups, not survive a real outage.
async function markStatus(relayAgentId: string, status: "online" | "offline") {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db
        .update(relayAgents)
        .set({ status, lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(relayAgents.id, relayAgentId));
      return;
    } catch (err) {
      if (attempt < maxAttempts) {
        const delayMs = attempt * 1000;
        console.warn(`[relay-hub] Gagal update status agent di DB (percobaan ${attempt}/${maxAttempts}), coba lagi dalam ${delayMs}ms: ${describeError(err)}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(`[relay-hub] Gagal update status agent di DB setelah ${maxAttempts} percobaan: ${describeError(err)}`);
      }
    }
  }
}

async function handleDisconnect(agent: ConnectedAgent) {
  if (connectedByToken.get(agent.token) === agent) {
    connectedByToken.delete(agent.token);
  }
  await markStatus(agent.relayAgentId, "offline");
  console.log(`[relay-hub] Agent "${agent.relayAgentId}" (outlet ${agent.outletId}) terputus.`);
}

/**
 * Menyimpan versi + kemampuan agent ke database, untuk ditampilkan di dashboard dan dibaca app.
 *
 * TERPISAH dari markStatus dengan sengaja, dan kegagalannya hanya dicatat di log. Kolom-kolom ini
 * datang dari migrasi 0010; kalau hub baru ini di-restart sebelum migrasi dijalankan, UPDATE ini
 * gagal. Seandainya ia digabung dengan UPDATE status, agent akan tercatat "offline" selamanya di
 * dashboard padahal tersambung dan bisa dipakai. Status online jauh lebih penting daripada nomor
 * versi, jadi yang satu tidak boleh menjatuhkan yang lain.
 */
async function recordHandshake(relayAgentId: string, agentVersion: string, capabilities: RelayCapability[]) {
  try {
    await db
      .update(relayAgents)
      .set({ agentVersion, capabilities: JSON.stringify(capabilities), updatedAt: new Date().toISOString() })
      .where(eq(relayAgents.id, relayAgentId));
  } catch (err) {
    console.warn(
      `[relay-hub] Versi agent tidak tersimpan (${describeError(err)}). Kalau pesannya "column ... does not exist", jalankan supabase/migrations/0010_relay_agent_v1_2.sql. Kontrol TV TIDAK terpengaruh.`
    );
  }
}

/**
 * Kolom tambahan untuk auth_ok: bahasa outlet dan jalur update.
 *
 * Dua query terpisah, masing-masing dengan try/catch sendiri, dan hasilnya selalu objek (paling
 * buruk kosong): auth_ok HARUS tetap terkirim apa pun yang terjadi di sini. Agent yang tidak
 * menerima auth_ok tidak akan pernah mulai menerima perintah — satu query tambahan yang gagal
 * tidak boleh mematikan kontrol TV seluruh outlet. update_channel juga baru ada setelah migrasi
 * 0010, jadi query-nya memang diperkirakan bisa gagal di masa peralihan.
 */
async function authOkExtras(relayAgentId: string, outletId: string): Promise<{ lang?: string; updateChannel?: "stable" | "beta" }> {
  const extras: { lang?: string; updateChannel?: "stable" | "beta" } = {};
  try {
    const [outlet] = await db.select({ lang: outlets.preferredLang }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (outlet?.lang) extras.lang = outlet.lang;
  } catch {
    /* bahasa hanya untuk teks di jendela agent — tanpa ini agent memakai bahasa bawaannya */
  }
  try {
    const [row] = await db.select({ channel: relayAgents.updateChannel }).from(relayAgents).where(eq(relayAgents.id, relayAgentId)).limit(1);
    if (row?.channel === "beta" || row?.channel === "stable") extras.updateChannel = row.channel;
  } catch {
    /* kolom belum ada (migrasi 0010 belum jalan) — agent memakai jalur "stable" sebagai bawaan */
  }
  return extras;
}

// ---- WebSocket server: agents connect here ----
// Bound to RELAY_WS_BIND_HOST (127.0.0.1 by default) — a Cloudflare Tunnel
// or reverse proxy running on this same machine connects in over loopback;
// the port itself is never exposed to the LAN/internet directly.
const wss = new WebSocketServer({ port: RELAY_WS_PORT, host: RELAY_WS_BIND_HOST });
console.log(
  RELAY_WS_BIND_HOST === "127.0.0.1"
    ? `[relay-hub] WS server di 127.0.0.1:${RELAY_WS_PORT} (localhost saja) — pastikan ada Cloudflare Tunnel/reverse proxy publik di depannya kalau outlet perlu konek dari luar.`
    : `[relay-hub] PERINGATAN: RELAY_WS_BIND_HOST="${RELAY_WS_BIND_HOST}" (bukan localhost) — port ${RELAY_WS_PORT} akan langsung terbuka ke jaringan itu. Disarankan tetap 127.0.0.1 dan pakai tunnel/reverse proxy publik.`
);

wss.on("connection", (ws) => {
  let agent: ConnectedAgent | null = null;

  ws.on("message", async (raw) => {
    let msg: RelayAgentToHubMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "auth") {
      // Kolom dipilih EKSPLISIT, bukan db.select() polos. select() polos menyebut semua kolom
      // skema — termasuk agent_version/capabilities/update_channel dari migrasi 0010 — dan akan
      // GAGAL kalau hub ini di-restart sebelum migrasi itu jalan. Akibatnya bukan sekadar versi
      // tidak tercatat: SEMUA agent di semua outlet ditolak masuk, dan tidak ada TV yang bisa
      // dikontrol. Autentikasi hanya butuh tiga kolom lama ini.
      const [row] = await db
        .select({ id: relayAgents.id, outletId: relayAgents.outletId, name: relayAgents.name })
        .from(relayAgents)
        .where(eq(relayAgents.token, msg.token))
        .limit(1);
      if (!row) {
        send(ws, { type: "auth_error", message: "Token relay agent tidak dikenali. Cek ulang di halaman Devices." });
        ws.close();
        return;
      }

      const handshake = normalizeHandshake(msg);
      agent = {
        ws,
        token: msg.token,
        outletId: row.outletId,
        relayAgentId: row.id,
        lastPingAt: Date.now(),
        agentVersion: handshake.agentVersion,
        capabilities: handshake.capabilities,
      };
      connectedByToken.set(msg.token, agent);
      // Dibatasi 2 detik: auth_ok dulu dikirim seketika setelah token cocok. Kolom tambahannya
      // tidak boleh membuat agent menunggu lama — database yang tersendat (pernah terjadi: DNS
      // pooler Supabase gagal sesaat, lihat markStatus) cukup membuat auth_ok terkirim tanpa itu.
      const extras = await Promise.race([
        authOkExtras(row.id, row.outletId),
        new Promise<Awaited<ReturnType<typeof authOkExtras>>>((resolve) => setTimeout(() => resolve({}), 2000)),
      ]);
      send(ws, { type: "auth_ok", ...extras });
      await markStatus(row.id, "online");
      await recordHandshake(row.id, handshake.agentVersion, handshake.capabilities);
      console.log(
        `[relay-hub] Agent "${row.name}" (outlet ${row.outletId}) terhubung — versi ${handshake.agentVersion}${
          handshake.reported ? "" : " (tidak melapor, dianggap v1.1)"
        }, kemampuan: ${handshake.capabilities.join(", ")}.`
      );
      return;
    }

    if (!agent) return; // ignore anything before auth

    if (msg.type === "ping") {
      agent.lastPingAt = Date.now();
      send(ws, { type: "pong" });
      return;
    }

    if (msg.type === "result") {
      const pending = pendingByCommandId.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingByCommandId.delete(msg.id);
        pending.resolve({ ok: msg.ok, state: msg.state, error: msg.error, info: msg.info });
      }
      return;
    }
  });

  ws.on("close", () => {
    if (agent) handleDisconnect(agent);
  });
  ws.on("error", () => {
    if (agent) handleDisconnect(agent);
  });
});

// Sweep for agents that stopped heartbeating without a clean close (e.g. PC
// lost power / network dropped mid-session).
setInterval(() => {
  const now = Date.now();
  for (const agent of connectedByToken.values()) {
    if (now - agent.lastPingAt > RELAY_HEARTBEAT_TIMEOUT_MS) {
      agent.ws.terminate();
      handleDisconnect(agent);
    }
  }
}, RELAY_HEARTBEAT_TIMEOUT_MS);

// ---- Internal HTTP server: Next.js app dispatches commands here ----
const httpServer = createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/dispatch") {
    res.writeHead(404).end();
    return;
  }
  // Topology B (hub on a separate machine from the Next.js app, e.g. app on
  // Vercel): the port is reachable from the internet, so require the shared
  // secret. Topology A (same server, default): RELAY_HUB_DISPATCH_SECRET is
  // unset and the bind host stays 127.0.0.1, so this check is skipped —
  // nothing outside the machine can reach this port anyway.
  if (RELAY_HUB_DISPATCH_SECRET) {
    const authHeader = req.headers["authorization"];
    if (authHeader !== `Bearer ${RELAY_HUB_DISPATCH_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: false, error: "Unauthorized." }));
      return;
    }
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    let payload: RelayDispatchRequest;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400).end(JSON.stringify({ ok: false, error: "Body tidak valid." }));
      return;
    }

    // Semua penolakan di bawah dibalas HTTP 200 + { ok: false, code, error } — bentuk yang sama
    // dengan "agent tidak terhubung" yang sudah ada — supaya adapter android-tv-relay.ts yang
    // sekarang (yang membaca result.ok dan melempar result.error) tetap menampilkannya dengan
    // benar tanpa perlu diubah lebih dulu.
    const reply = (result: RelayDispatchResponse) => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));

    // 1. Perintah harus dikenal. Sebelumnya hub meneruskan `payload.action` APA ADANYA (`as any`)
    //    ke agent — dan agent v1.1 membalas "berhasil" untuk perintah yang tidak ia kenal.
    if (!isRelayAction(payload.action)) {
      reply({ ok: false, code: "UNKNOWN_ACTION", error: `Perintah "${String(payload.action)}" tidak dikenal Relay Hub.` });
      return;
    }

    const agent = connectedByToken.get(payload.relayAgentToken);
    if (!agent) {
      reply({ ok: false, code: "AGENT_OFFLINE", error: "Relay agent tidak terhubung. Pastikan program agent berjalan di outlet." });
      return;
    }

    // 2. Agent yang sedang terhubung harus MAMPU menjalankannya. Inilah satu-satunya pelindung
    //    untuk agent v1.1 yang sudah terpasang di outlet — kodenya tidak bisa diperbaiki dari
    //    jauh, jadi hub yang menolak sebelum perintah sampai ke sana.
    const allowed = checkActionAllowed(agent.capabilities, payload.action, agent.agentVersion);
    if (!allowed.ok) {
      reply({ ok: false, code: "UNSUPPORTED_ACTION", error: allowed.error });
      return;
    }

    // 3. Parameter khusus per perintah divalidasi di sini DAN divalidasi ulang oleh agent v1.2.
    //    Hanya parameter milik perintah itu yang ikut dikirim — perintah lain tidak pernah
    //    membawa hdmiPort/browserPackage, meski pemanggil menyertakannya.
    const extra: { hdmiPort?: number; browserPackage?: string } = {};
    if (payload.action === "switchHdmi") {
      const port = validateHdmiPort(payload.hdmiPort);
      if (port === null) {
        reply({ ok: false, code: "INVALID_PARAMS", error: "Port HDMI harus angka 1 sampai 4." });
        return;
      }
      extra.hdmiPort = port;
    }
    // `unknown`, bukan tipe dari RelayDispatchRequest: body datang dari JSON, jadi null tetap
    // mungkin meski tipenya bilang string|undefined — null diperlakukan sama dengan "tidak diisi".
    const rawBrowserPackage: unknown = payload.browserPackage;
    if (payload.action === "openScreensaver" && rawBrowserPackage !== undefined && rawBrowserPackage !== null) {
      const pkg = validateAndroidPackage(rawBrowserPackage);
      if (!pkg) {
        reply({ ok: false, code: "INVALID_PARAMS", error: "Nama paket browser tidak valid." });
        return;
      }
      extra.browserPackage = pkg;
    }

    // IP di luar jaringan lokal hanya DICATAT di tahap ini, tidak ditolak. Agent v1.2 yang akan
    // menolaknya. Menolak di hub sekarang bisa memutus outlet yang setup-nya berjalan dengan IP
    // tak lazim, padahal tahap 1 dijanjikan tidak mengubah perilaku apa pun di outlet.
    if (!isPrivateLanIPv4(payload.ip)) {
      console.warn(`[relay-hub] PERHATIAN: perintah "${payload.action}" untuk IP ${payload.ip} (outlet ${agent.outletId}) — bukan IP jaringan lokal. Agent v1.2 akan menolak ini.`);
    }

    const commandId = randomUUID();
    const result = await new Promise<RelayDispatchResponse>((resolve) => {
      const timer = setTimeout(() => {
        pendingByCommandId.delete(commandId);
        resolve({ ok: false, code: "TIMEOUT", error: "Agent tidak merespon dalam waktu yang ditentukan (timeout)." });
      }, RELAY_COMMAND_TIMEOUT_MS);
      pendingByCommandId.set(commandId, { resolve, timer });
      send(agent.ws, {
        type: "command",
        id: commandId,
        action: payload.action,
        ip: payload.ip,
        port: payload.port,
        adbPath: payload.adbPath,
        ...extra,
      });
    });

    reply(result);
  });
});

if (RELAY_HTTP_BIND_HOST !== "127.0.0.1" && !RELAY_HUB_DISPATCH_SECRET) {
  console.warn(
    `[relay-hub] PERINGATAN: RELAY_HTTP_BIND_HOST="${RELAY_HTTP_BIND_HOST}" (bukan localhost) tapi RELAY_HUB_DISPATCH_SECRET belum diisi — endpoint /dispatch akan terbuka tanpa autentikasi ke siapa pun yang bisa mengakses port ${RELAY_HTTP_PORT}. Set RELAY_HUB_DISPATCH_SECRET sebelum deploy ke publik.`
  );
}

httpServer.listen(RELAY_HTTP_PORT, RELAY_HTTP_BIND_HOST, () => {
  const scope = RELAY_HTTP_BIND_HOST === "127.0.0.1" ? "internal, localhost saja" : `publik (${RELAY_HTTP_BIND_HOST}) — pastikan di belakang reverse proxy TLS dan RELAY_HUB_DISPATCH_SECRET sudah diisi`;
  console.log(`[relay-hub] HTTP dispatch (${scope}) di port ${RELAY_HTTP_PORT}`);
});

console.log(`[relay-hub] Siap. Jalankan relay agent di outlet dengan token masing-masing (lihat halaman Devices).`);
