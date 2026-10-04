import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdfkit reads its .afm font metrics files from disk at runtime relative to its own
  // __dirname — if Next bundles it into the route's webpack chunk, that path resolution
  // breaks (ENOENT for Helvetica.afm). Keeping it external makes the route `require()`
  // pdfkit directly from node_modules at runtime instead, where its relative asset
  // paths resolve correctly.
  serverExternalPackages: ["pdfkit"],

  // Digital Asset Links untuk aplikasi Android (TWA) — lihat src/app/api/assetlinks/route.ts.
  async rewrites() {
    return [{ source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" }];
  },

  // Technical-SEO / security hardening headers, applied to every route. HSTS is the actual
  // "enforce HTTPS" signal browsers + some SEO tools check for — actual TLS termination still
  // happens at the host/CDN (Cloudflare per the domain setup), this just tells browsers to never
  // downgrade to plain HTTP for this origin once they've seen it once.
  async headers() {
    return [
      // Service worker harus selalu diperiksa ulang browser agar perubahan langsung terpakai.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera=(self): scan barcode produk & QR member di Kasir/Rental PS (components/scanner);
          // tetap diblokir untuk iframe pihak ketiga.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
