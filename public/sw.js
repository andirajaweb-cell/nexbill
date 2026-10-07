/*
 * NEXBILL service worker (aplikasi Android TWA & PWA).
 *
 *  - Halaman dashboard: NETWORK-FIRST. Selama online selalu versi terbaru dari server (data kasir &
 *    tagihan tetap diambil langsung dari API, tidak pernah dari cache). Salinan HTML terakhir tiap
 *    halaman /dashboard disimpan HANYA untuk dipakai saat internet putus — itulah yang membuat
 *    Mode Offline kasir rental (src/lib/offline) tetap bisa dibuka tanpa internet.
 *  - Bundel /_next/static: CACHE-FIRST (nama file berisi hash, tidak pernah berubah isinya).
 *  - API (/api/*) tidak pernah di-cache: data offline disimpan aplikasi sendiri di localStorage.
 *  - Halaman lain yang tidak tersimpan → /offline.html.
 *  - Notifikasi push (Web Push, lib/push/service.ts).
 * Naikkan VERSION bila offline.html atau strategi cache diubah.
 */
const VERSION = "nexbill-sw-v3";
const PAGES = "nexbill-pages-v1";
const STATIC = "nexbill-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];
const MAX_STATIC_ENTRIES = 400;
const KEEP = [VERSION, PAGES, STATIC];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isDashboardPage = (url) => url.origin === self.location.origin && url.pathname.startsWith("/dashboard");
const isStatic = (url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
const pageKey = (url) => url.origin + url.pathname;

async function trimStatic() {
  const cache = await caches.open(STATIC);
  const keys = await cache.keys();
  if (keys.length > MAX_STATIC_ENTRIES) await Promise.all(keys.slice(0, keys.length - MAX_STATIC_ENTRIES).map((k) => cache.delete(k)));
}

async function cacheStatic(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    trimStatic();
  }
  return res;
}

async function pageNetworkFirst(request) {
  const url = new URL(request.url);
  try {
    const res = await fetch(request);
    // Only real dashboard pages for a logged-in user (not a redirect to /login, not an error).
    if (isDashboardPage(url) && res.ok && !res.redirected && res.type === "basic") {
      const copy = res.clone();
      caches.open(PAGES).then((c) => c.put(pageKey(url), copy));
    }
    return res;
  } catch {
    if (isDashboardPage(url)) {
      const pages = await caches.open(PAGES);
      // Exact page only — serving another page's HTML under this URL would confuse the router.
      // offline.html links to the offline cashier board (/dashboard/rental) instead.
      const saved = await pages.match(pageKey(url));
      if (saved) return saved;
    }
    const cache = await caches.open(VERSION);
    return (await cache.match(OFFLINE_URL)) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    event.respondWith(pageNetworkFirst(req));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(cacheStatic(req));
  }
  // Everything else (API, images, RSC payloads, third parties) goes straight to the network.
});

/**
 * Pesan dari aplikasi:
 *  - { type: "warm", urls: [...] } : simpan halaman (mis. /dashboard/rental) beserta bundel JS/CSS
 *    yang dirujuknya, supaya Mode Offline siap walau kasir belum pernah membuka halaman itu dari
 *    perangkat ini sejak service worker terpasang.
 *  - { type: "clear-pages" }       : hapus salinan halaman dashboard (dipanggil saat logout).
 */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "clear-pages") {
    event.waitUntil(caches.delete(PAGES));
    return;
  }
  if (data.type === "warm" && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const pages = await caches.open(PAGES);
        for (const path of data.urls) {
          try {
            const url = new URL(path, self.location.origin);
            if (!isDashboardPage(url)) continue;
            const res = await fetch(url.href, { credentials: "include" });
            if (!res.ok || res.redirected) continue;
            const html = await res.clone().text();
            await pages.put(pageKey(url), res);
            const assets = new Set((html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []).map((a) => a.replace(/&amp;/g, "&")));
            for (const a of assets) {
              try {
                await cacheStatic(new Request(new URL(a, self.location.origin).href));
              } catch {
                // one missing chunk shouldn't stop the rest
              }
            }
          } catch {
            // offline or server error — try again on the next warm
          }
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "NEXBILL", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "NEXBILL";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/badge-96.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || "/dashboard" },
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
