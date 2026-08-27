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
import { relayAgents } from "../src/db/schema";
import { eq } from "drizzle-orm";
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

async function markStatus(relayAgentId: string, status: "online" | "offline") {
  try {
    await db
      .update(relayAgents)
      .set({ status, lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(relayAgents.id, relayAgentId));
  } catch (err) {
    console.error("[relay-hub] Gagal update status agent di DB:", err);
  }
}

async function handleDisconnect(agent: ConnectedAgent) {
  if (connectedByToken.get(agent.token) === agent) {
    connectedByToken.delete(agent.token);
  }
  await markStatus(agent.relayAgentId, "offline");
  console.log(`[relay-hub] Agent "${agent.relayAgentId}" (outlet ${agent.outletId}) terputus.`);
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
      const [row] = await db.select().from(relayAgents).where(eq(relayAgents.token, msg.token)).limit(1);
      if (!row) {
        send(ws, { type: "auth_error", message: "Token relay agent tidak dikenali. Cek ulang di halaman Devices." });
        ws.close();
        return;
      }
      agent = { ws, token: msg.token, outletId: row.outletId, relayAgentId: row.id, lastPingAt: Date.now() };
      connectedByToken.set(msg.token, agent);
      send(ws, { type: "auth_ok" });
      await markStatus(row.id, "online");
      console.log(`[relay-hub] Agent "${row.name}" (outlet ${row.outletId}) terhubung.`);
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
        pending.resolve({ ok: msg.ok, state: msg.state, error: msg.error });
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

    const agent = connectedByToken.get(payload.relayAgentToken);
    if (!agent) {
      const result: RelayDispatchResponse = { ok: false, error: "Relay agent tidak terhubung. Pastikan program agent berjalan di outlet." };
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
      return;
    }

    const commandId = randomUUID();
    const result = await new Promise<RelayDispatchResponse>((resolve) => {
      const timer = setTimeout(() => {
        pendingByCommandId.delete(commandId);
        resolve({ ok: false, error: "Agent tidak merespon dalam waktu yang ditentukan (timeout)." });
      }, RELAY_COMMAND_TIMEOUT_MS);
      pendingByCommandId.set(commandId, { resolve, timer });
      send(agent.ws, {
        type: "command",
        id: commandId,
        action: payload.action,
        ip: payload.ip,
        port: payload.port,
        adbPath: payload.adbPath,
      } as any);
    });

    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
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
