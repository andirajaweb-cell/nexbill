/**
 * Relay Agent — runs AT THE OUTLET, on a machine physically on the same
 * local network as the Android TVs there (e.g. the cashier PC, or a small
 * dedicated always-on mini PC — see NEXBILL Devices page for setup notes).
 *
 * It opens an outbound WebSocket connection to the Relay Hub (a separate
 * process, scripts/relay-hub.ts, running alongside the main NEXBILL server)
 * and waits for commands. Being outbound-only means nothing needs to be
 * opened or forwarded on the outlet's router/firewall — the same reason a
 * chat app on your phone doesn't need you to configure your home router.
 *
 * Setup (once per outlet):
 *  1. Create a Relay Agent on the Devices page in NEXBILL — this generates a
 *     token and shows the Hub URL to use.
 *  2. Copy this `scripts/` folder (or the built agent) to the outlet's
 *     machine, along with Android Platform Tools (`adb` on PATH).
 *  3. Set two environment variables (in a .env file next to this script, or
 *     your OS's environment):
 *       RELAY_HUB_URL=wss://your-nexbill-server.example.com:8081
 *       RELAY_AGENT_TOKEN=<token from step 1>
 *     Optionally: ADB_PATH=C:\path\to\adb.exe (if adb isn't on PATH)
 *  4. Run:  npm run relay:agent
 *  5. The Devices page will show this agent as "online" once connected. The
 *     TV(s) themselves still need the one-time `adb connect` + on-screen
 *     "Allow debugging?" approval described in the Android TV setup note —
 *     do that from THIS machine (the agent's machine), not the main server.
 *
 * Reconnects automatically with backoff if the hub is unreachable or the
 * connection drops (WiFi hiccup, hub restart, etc).
 */
import "dotenv/config";
import WebSocket from "ws";
import { makeTarget, adbWake, adbSleep, adbGetState } from "../src/lib/devices/adb-shell";
import { describeError } from "../src/lib/api/error";
import {
  RELAY_HEARTBEAT_INTERVAL_MS,
  RelayAgentToHubMessage,
  RelayHubToAgentMessage,
} from "../src/lib/relay/config";

const HUB_URL = process.env.RELAY_HUB_URL;
const TOKEN = process.env.RELAY_AGENT_TOKEN;
const ADB_PATH = process.env.ADB_PATH;

if (!HUB_URL || !TOKEN) {
  console.error(
    "[relay-agent] RELAY_HUB_URL dan RELAY_AGENT_TOKEN wajib diisi (lewat file .env di folder ini, atau environment variable). Lihat token di halaman Devices > Relay Agent."
  );
  process.exit(1);
}

let reconnectDelayMs = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function send(ws: WebSocket, msg: RelayAgentToHubMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function connect() {
  console.log(`[relay-agent] Menghubungkan ke ${HUB_URL} ...`);
  const ws = new WebSocket(HUB_URL!);
  let heartbeat: NodeJS.Timeout | null = null;

  ws.on("open", () => {
    send(ws, { type: "auth", token: TOKEN! });
  });

  ws.on("message", async (raw) => {
    let msg: RelayHubToAgentMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "auth_ok") {
      console.log("[relay-agent] Terhubung dan terotorisasi. Menunggu perintah...");
      reconnectDelayMs = 2_000; // reset backoff on a healthy connection
      heartbeat = setInterval(() => send(ws, { type: "ping" }), RELAY_HEARTBEAT_INTERVAL_MS);
      return;
    }

    if (msg.type === "auth_error") {
      console.error(`[relay-agent] Otorisasi gagal: ${msg.message}`);
      ws.close();
      return;
    }

    if (msg.type === "pong") return;

    if (msg.type === "command") {
      const target = makeTarget(msg.ip, msg.port, msg.adbPath || ADB_PATH);
      console.log(`[relay-agent] Perintah "${msg.action}" untuk ${target.serial}`);
      try {
        if (msg.action === "turnOn") {
          await adbWake(target);
          send(ws, { type: "result", id: msg.id, ok: true });
        } else if (msg.action === "turnOff") {
          await adbSleep(target);
          send(ws, { type: "result", id: msg.id, ok: true });
        } else {
          const state = await adbGetState(target);
          send(ws, { type: "result", id: msg.id, ok: true, state });
        }
      } catch (err: unknown) {
        send(ws, { type: "result", id: msg.id, ok: false, error: describeError(err) || "Perintah gagal." });
      }
      return;
    }
  });

  const scheduleReconnect = () => {
    if (heartbeat) clearInterval(heartbeat);
    console.log(`[relay-agent] Terputus. Coba lagi dalam ${reconnectDelayMs / 1000}s...`);
    setTimeout(connect, reconnectDelayMs);
    reconnectDelayMs = Math.min(reconnectDelayMs * 1.5, MAX_RECONNECT_DELAY_MS);
  };

  ws.on("close", scheduleReconnect);
  ws.on("error", (err) => {
    console.error("[relay-agent] Error koneksi:", err.message);
    ws.close();
  });
}

connect();
