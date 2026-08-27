/**
 * Shared config + wire-protocol types for the Android TV relay system.
 * Used by all three sides: scripts/relay-hub.ts (the cloud/server-side hub),
 * scripts/relay-agent.ts (runs at the outlet, on the same LAN as the TVs),
 * and src/lib/devices/adapters/android-tv-relay.ts (the Next.js app's device
 * adapter, which dispatches commands to the hub over HTTP). See
 * src/db/schema.ts relayAgents for the pairing/token model.
 *
 * Two supported topologies for where the Next.js app itself runs, relative
 * to the hub:
 *
 *  A) SAME SERVER (self-hosted / VPS running both `next start` and
 *     `npm run relay:hub`). This is the default/zero-config case: the
 *     adapter calls http://127.0.0.1:{RELAY_HTTP_PORT}/dispatch and the hub
 *     listens on 127.0.0.1 only — never exposed publicly, no auth needed,
 *     since it trusts anything already running on the same machine.
 *
 *  B) SEPARATE SERVERS (e.g. the app is on Vercel/serverless, which cannot
 *     hold a persistent WebSocket/TCP process at all — the hub MUST live on
 *     a small always-on VPS in this case). Vercel functions cannot reach
 *     another machine's 127.0.0.1, so this needs a public dispatch endpoint
 *     instead:
 *       - Run relay-hub.ts with RELAY_HTTP_BIND_HOST=0.0.0.0 (or an
 *         interface IP) behind a TLS-terminating reverse proxy (nginx/Caddy)
 *         that exposes only POST /dispatch, e.g. as https://relay.your-domain.id/dispatch.
 *       - Set RELAY_HUB_DISPATCH_SECRET to the same random string on both
 *         the hub's environment and the Next.js app's environment (Vercel
 *         project settings) — the hub rejects any /dispatch request whose
 *         `Authorization: Bearer <secret>` header doesn't match, since the
 *         endpoint is now internet-reachable and the same-machine trust
 *         assumption from topology (A) no longer holds.
 *       - Set RELAY_HUB_DISPATCH_URL on the Next.js app's environment to
 *         that public URL (https://relay.your-domain.id/dispatch) — the
 *         adapter uses it instead of the 127.0.0.1 fallback whenever it's set.
 *     The WebSocket side (agents connecting in) already crosses the network
 *     in both topologies and is unaffected — only the app-to-hub dispatch
 *     call needed this.
 *
 * PREFERRED topology for both (A) and (B): put a Cloudflare Tunnel
 * (`cloudflared`) in front of the WS port instead of exposing RELAY_WS_PORT
 * (8081) directly to the internet. Add a Public Hostname on the existing
 * tunnel — e.g. subdomain "relay" on the same zone the main app's tunnel
 * uses, Type "HTTP" (cloudflared upgrades WS over HTTP ingress
 * automatically, no special config), target `localhost:{RELAY_WS_PORT}` —
 * then set RELAY_HUB_PUBLIC_URL below to that hostname
 * (wss://relay.your-domain.id). This fixes three problems at once, all
 * without touching relay-hub.ts's actual WS server code:
 *   1. Agents everywhere (including hotel/office/mall wifi and ISPs that
 *      block non-standard outbound ports) connect on 443 like any normal
 *      HTTPS site — cloudflared never exposes RELAY_WS_PORT itself, only
 *      makes an outbound connection out to Cloudflare's edge.
 *   2. TLS is terminated at Cloudflare's edge automatically (cert
 *      issuance/rotation included) — no nginx/Caddy to run or maintain.
 *   3. The URL shown to outlets in the Devices > Relay Agent card becomes a
 *      fixed, permanent hostname instead of a "server-anda:{port}"
 *      placeholder the operator has to fill in by hand.
 * See RELAY_WS_BIND_HOST below — once traffic only arrives via the tunnel
 * (which connects to localhost), the WS server itself should bind to
 * 127.0.0.1 only, closing off RELAY_WS_PORT from the LAN/internet entirely.
 */

// WebSocket port: agents connect here (outbound from the outlet).
export const RELAY_WS_PORT = Number(process.env.RELAY_WS_PORT || 8081);

// Interface the WS server binds to. Defaults to 127.0.0.1 — safe even when
// a Cloudflare Tunnel (or any reverse proxy) sits in front, since it always
// connects in over loopback on the same machine. Only widen this to
// "0.0.0.0" (or a specific interface IP) if something reaching the WS port
// truly needs to come from outside this machine and isn't going through a
// tunnel/proxy — an increasingly rare case now that the tunnel path exists.
export const RELAY_WS_BIND_HOST = process.env.RELAY_WS_BIND_HOST || "127.0.0.1";

// The public, outlet-facing WebSocket URL — what actually goes into the
// "RELAY_HUB_URL=..." command shown on the Devices > Relay Agent card and
// baked into the packaged NexbillAgent.exe. Set this to the Cloudflare
// Tunnel public hostname configured per the topology note above, e.g.
// "wss://relay.nexbill.id". Left unset, the API/UI fall back to the old
// "wss://server-anda:{RELAY_WS_PORT}" placeholder the operator fills in by
// hand — kept only for local/LAN-only dev setups that don't use a tunnel.
export const RELAY_HUB_PUBLIC_URL = process.env.RELAY_HUB_PUBLIC_URL || null;

// Internal HTTP port: the Next.js app's device adapter dispatches commands
// here. Bound to RELAY_HTTP_BIND_HOST (127.0.0.1 by default — topology A
// above). Only change the bind host / open this port publicly if
// RELAY_HUB_DISPATCH_SECRET is also set (topology B) — otherwise the
// dispatch endpoint would be wide open with no auth.
export const RELAY_HTTP_PORT = Number(process.env.RELAY_HTTP_PORT || 8082);
export const RELAY_HTTP_BIND_HOST = process.env.RELAY_HTTP_BIND_HOST || "127.0.0.1";

// Set on BOTH the hub's environment and the Next.js app's environment when
// they run on separate machines (topology B). Leave both unset for the
// same-server case (topology A) — dispatch() falls back to plain
// http://127.0.0.1 with no auth header, and the hub accepts any request
// since RELAY_HUB_DISPATCH_SECRET being unset means "trust localhost only"
// (enforced by RELAY_HTTP_BIND_HOST staying at its 127.0.0.1 default).
export const RELAY_HUB_DISPATCH_SECRET = process.env.RELAY_HUB_DISPATCH_SECRET || null;

// Set on the Next.js app's environment only, to the hub's public dispatch
// URL (topology B). Unset = same-server fallback (topology A).
export const RELAY_HUB_DISPATCH_URL = process.env.RELAY_HUB_DISPATCH_URL || null;

// How long the hub waits for an agent to answer a dispatched command before
// giving up and reporting a timeout back to the caller.
export const RELAY_COMMAND_TIMEOUT_MS = 15_000;

// How often agents ping the hub, and how long the hub waits without a
// ping before marking an agent offline (belt-and-suspenders alongside the
// native WebSocket ping/pong the `ws` library already does).
export const RELAY_HEARTBEAT_INTERVAL_MS = 20_000;
export const RELAY_HEARTBEAT_TIMEOUT_MS = 45_000;

export type RelayAction = "turnOn" | "turnOff" | "getState";

/** Agent -> Hub, first message after connecting. */
export interface RelayAuthMessage {
  type: "auth";
  token: string;
}

/** Hub -> Agent, reply to auth. */
export interface RelayAuthOkMessage {
  type: "auth_ok";
}
export interface RelayAuthErrorMessage {
  type: "auth_error";
  message: string;
}

/** Hub -> Agent, a command to execute locally against a TV's IP. */
export interface RelayCommandMessage {
  type: "command";
  id: string;
  action: RelayAction;
  ip: string;
  port: number;
  adbPath?: string;
}

/** Agent -> Hub, the result of executing a command. */
export interface RelayResultMessage {
  type: "result";
  id: string;
  ok: boolean;
  state?: "on" | "off" | "unknown";
  error?: string;
}

/** Agent -> Hub heartbeat / Hub -> Agent reply. */
export interface RelayPingMessage {
  type: "ping";
}
export interface RelayPongMessage {
  type: "pong";
}

export type RelayAgentToHubMessage = RelayAuthMessage | RelayResultMessage | RelayPingMessage;
export type RelayHubToAgentMessage =
  | RelayAuthOkMessage
  | RelayAuthErrorMessage
  | RelayCommandMessage
  | RelayPongMessage;

/** Body the Next.js adapter POSTs to the hub's internal /dispatch endpoint. */
export interface RelayDispatchRequest {
  relayAgentToken: string;
  action: RelayAction;
  ip: string;
  port: number;
  adbPath?: string;
}

export interface RelayDispatchResponse {
  ok: boolean;
  state?: "on" | "off" | "unknown";
  error?: string;
}
