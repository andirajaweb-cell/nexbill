/*
 * NEXBILL service worker (aplikasi Android TWA & PWA) — SENGAJA minimal:
 *  - TIDAK meng-cache halaman/data dashboard (data kasir & tagihan harus selalu terbaru, dan
 *    bundel Next.js berganti tiap deploy).
 *  - Hanya menyediakan halaman /offline.html saat HP tidak ada internet, supaya aplikasi Android
 *    menampilkan pesan yang jelas, bukan halaman error Chrome.
 *  - Menampilkan notifikasi push (Web Push, lib/push/service.ts) dan membuka halaman terkait saat
 *    diketuk. Di aplikasi Android (TWA) notifikasi ini tampil sebagai notifikasi aplikasi.
 * Naikkan VERSION bila offline.html diubah.
 */
const VERSION = "nexbill-sw-v2";
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
