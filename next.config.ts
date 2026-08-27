import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdfkit reads its .afm font metrics files from disk at runtime relative to its own
  // __dirname — if Next bundles it into the route's webpack chunk, that path resolution
  // breaks (ENOENT for Helvetica.afm). Keeping it external makes the route `require()`
  // pdfkit directly from node_modules at runtime instead, where its relative asset
  // paths resolve correctly.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
