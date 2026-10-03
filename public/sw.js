/*
 * NEXBILL service worker (aplikasi Android TWA & PWA) — SENGAJA minimal:
 *  - TIDAK meng-cache halaman/data dashboard (data kasir & tagihan harus selalu terbaru, dan
 *    bundel Next.js berganti tiap deploy).
 *  - Hanya menyediakan halaman /offline.html saat HP tidak ada internet, supaya aplikasi Android
 *    menampilkan pesan yang jelas, bukan halaman error Chrome.
 * Naikkan VERSION bila offline.html diubah.
 */
const VERSION = "nexbill-sw-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Hanya navigasi halaman (bukan API, gambar, atau bundel JS) — selebihnya langsung ke jaringan.
  if (req.mode !== "navigate" || req.method !== "GET") return;
  event.respondWith(
    fetch(req).catch(async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match(OFFLINE_URL)) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    })
  );
});
