// PM2 process definitions for the always-on VPS that hosts scripts/relay-hub.ts and
// scripts/ipaymu-egress-proxy.ts (see .env's IPAYMU_PROXY_URL comment and
// src/lib/relay/config.ts's topology B notes — this VPS replaced the home mini server on
// 2026-09-13). NOT used by the Next.js app itself (that's Vercel) — only relevant on this VPS.
//
// Use this instead of ad-hoc `pm2 start "npm run X" --name X` commands: running an ad-hoc start
// command again (e.g. after a typo or a reboot before `pm2 startup` was configured) creates a
// SECOND process under a new id instead of restarting the existing one, since pm2 only dedupes by
// exact match of how a process was originally launched — two "relay-hub" processes then both try
// to bind RELAY_WS_PORT/RELAY_HTTP_PORT and fight over the port. `pm2 start ecosystem.config.js`
// is idempotent — safe to re-run any time, always resolves to exactly one instance per app.
//
// Usage: cd /opt/nexbill && pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "relay-hub",
      script: "npm",
      args: "run relay:hub",
      cwd: "/opt/nexbill",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: "ipaymu-proxy",
      script: "npm",
      args: "run ipaymu:proxy",
      cwd: "/opt/nexbill",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
