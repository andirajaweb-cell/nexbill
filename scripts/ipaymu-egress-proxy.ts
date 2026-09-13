/**
 * iPaymu Egress Proxy — standalone long-running process, same pattern as scripts/relay-hub.ts
 * (Next.js on Vercel is serverless with no guaranteed static outbound IP, so anything iPaymu
 * requires a whitelisted static IP for has to physically originate from a different, always-on
 * machine instead).
 *
 * WHY THIS EXISTS: docs.ipaymu.com/id/docs/ip-domain-validation requires Production requests to
 * come from a pre-registered static IP (my.ipaymu.com/ip). Vercel serverless functions do not have
 * one — outbound requests can leave from any IP in Vercel's shared pool, which is exactly the "IP
 * Dinamis" failure mode the docs warn about. This script runs on a small always-on VPS with a real
 * dedicated IP (see .env's IPAYMU_PROXY_URL comment) and does nothing but forward already-signed
 * iPaymu requests verbatim — all business logic (which endpoint, what body, computing the
 * va/signature/timestamp headers) still lives in lib/payments/adapters/ipaymu.ts on the Vercel
 * side; this process is a dumb, trusted pipe, not a second copy of that logic.
 *
 * Deploy target: the SAME VPS as scripts/relay-hub.ts (e.g. the DomaiNesia Cloud VPS Lite 1GB
 * replacing the home mini server) — one small always-on box can run both processes (PM2/systemd,
 * two services) since neither is resource-heavy. Reuses the existing Cloudflare Tunnel already
 * pointed at that box for relay-hub: add a second Public Hostname (e.g.
 * "ipaymu-proxy.nexbill.id") targeting "localhost:{IPAYMU_PROXY_PORT}" alongside the existing
 * "relay" hostname — no new tunnel, no new port exposed directly to the internet.
 *
 * SECURITY: this endpoint, once public, could be abused as an open forwarding proxy to anywhere if
 * left unguarded. Two independent protections:
 *  1. IPAYMU_PROXY_SECRET — required Bearer token, same shared-secret pattern as
 *     RELAY_HUB_DISPATCH_SECRET. Set identically here and in the Vercel app's env.
 *  2. ALLOWED_TARGET_HOSTS below — even with a valid secret, only forwards to iPaymu's own
 *     hostnames, never an arbitrary URL the caller supplies. This is a fixed allowlist, not
 *     configurable via env, precisely so a leaked secret alone can't turn this into a general SSRF
 *     tool.
 *
 * Run with: npm run ipaymu:proxy (add that script to package.json once deployed)
 */
import "dotenv/config";
import { createServer } from "http";

const PORT = Number(process.env.IPAYMU_PROXY_PORT || 8083);
const BIND_HOST = process.env.IPAYMU_PROXY_BIND_HOST || "127.0.0.1";
const SECRET = process.env.IPAYMU_PROXY_SECRET || null;

const ALLOWED_TARGET_HOSTS = new Set(["my.ipaymu.com", "sandbox.ipaymu.com"]);

interface ForwardRequestBody {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
}

if (!SECRET) {
  console.warn(
    "[ipaymu-proxy] PERINGATAN: IPAYMU_PROXY_SECRET belum diisi — endpoint ini akan menerima permintaan forward TANPA autentikasi dari siapa pun yang bisa mengakses port ini. Wajib diisi sebelum tunnel-nya dibuka ke publik."
  );
}

const server = createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/forward") {
    res.writeHead(404).end();
    return;
  }

  if (SECRET) {
    const authHeader = req.headers["authorization"];
    if (authHeader !== `Bearer ${SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Unauthorized." }));
      return;
    }
  }

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", async () => {
    let payload: ForwardRequestBody;
    try {
      payload = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Body tidak valid." }));
      return;
    }

    let target: URL;
    try {
      target = new URL(payload.url);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "URL tujuan tidak valid." }));
      return;
    }

    if (!ALLOWED_TARGET_HOSTS.has(target.hostname)) {
      console.warn(`[ipaymu-proxy] Menolak forward ke host yang tidak diizinkan: ${target.hostname}`);
      res.writeHead(403, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Host tujuan tidak diizinkan." }));
      return;
    }

    try {
      const upstream = await fetch(target, {
        method: payload.method,
        headers: payload.headers,
        body: payload.method === "POST" ? payload.body : undefined,
      });
      const bodyText = await upstream.text();
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ status: upstream.status, bodyText }));
    } catch (err: any) {
      console.error(`[ipaymu-proxy] Gagal forward ke ${target.hostname}: ${err?.message ?? err}`);
      res.writeHead(502, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Gagal menghubungi iPaymu dari proxy." }));
    }
  });
});

server.listen(PORT, BIND_HOST, () => {
  console.log(
    `[ipaymu-proxy] Siap di ${BIND_HOST}:${PORT}. Daftarkan IP publik VPS ini (bukan port ini) di my.ipaymu.com/ip, lalu arahkan IPAYMU_PROXY_URL di app Vercel ke hostname tunnel publik + "/forward".`
  );
});
