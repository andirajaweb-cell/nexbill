import type { MetadataRoute } from "next";

/**
 * Web App Manifest (/manifest.webmanifest) — dasar aplikasi NEXBILL Android (Trusted Web
 * Activity, lihat android/README-PLAYSTORE.md) dan "Tambahkan ke layar utama" di HP. Aplikasi
 * Android hanya membungkus dashboard.nexbill.id; semua fitur tetap dari web, jadi update fitur
 * langsung sampai ke aplikasi tanpa rilis ulang di Play Store.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "NEXBILL — Billing & Kasir Rental PS",
    short_name: "NEXBILL",
    description: "Billing rental PS, kasir F&B, booking, kontrol TV otomatis, dan cetak struk Bluetooth dari HP.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#050810",
    theme_color: "#050810",
    lang: "id",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Rental PS", short_name: "Rental", url: "/dashboard/rental", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Kasir", short_name: "Kasir", url: "/dashboard/pos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Transaksi", short_name: "Transaksi", url: "/dashboard/transactions", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
