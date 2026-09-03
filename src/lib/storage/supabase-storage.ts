import { createClient } from "@supabase/supabase-js";

/**
 * Admin-privileged Supabase Storage client, server-only. Uses SUPABASE_SERVICE_ROLE_KEY (full
 * access, bypasses RLS/bucket policies) — NEVER import this from client code, and never expose
 * this key with a NEXT_PUBLIC_ prefix. Contrast with src/lib/server.ts's createClient(), which
 * uses the public anon/publishable key + the visitor's own cookies for Auth.
 *
 * Replaces the app's earlier local-filesystem upload pattern (public/uploads/...), which doesn't
 * persist reliably on Vercel's serverless runtime — the filesystem isn't shared across instances
 * or guaranteed to survive between invocations, and public/ is baked into the deployment bundle
 * at build time rather than writable at runtime. Supabase Storage is real, persistent, CDN-backed
 * object storage, so files uploaded here actually stay put in production.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — required for server-side Storage uploads.");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const ensuredBuckets = new Set<string>();

/** Creates the bucket if it doesn't exist yet (idempotent, cached per warm serverless instance so
 * this doesn't re-check on every single upload). Public: files are served straight from Supabase's
 * CDN URL with no auth, same access model the old public/uploads/... local files had (unguessable
 * random filename, no listing, no ACL) — fine for attachments like support-chat files, receipts,
 * logos; do NOT reuse this bucket for anything that needs to stay private per-outlet. */
async function ensureBucket(bucket: string) {
  if (ensuredBuckets.has(bucket)) return;
  const admin = getAdminClient();
  const { data: existing } = await admin.storage.getBucket(bucket);
  if (!existing) {
    const { error } = await admin.storage.createBucket(bucket, { public: true });
    // Ignore "already exists" races (two concurrent cold starts creating the same bucket at once).
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  ensuredBuckets.add(bucket);
}

/**
 * Uploads a file to Supabase Storage and returns its public URL. `bucket` groups uploads by
 * feature (e.g. "support-chat", "receipts", "branding") — each is auto-created on first use.
 */
export async function uploadToSupabaseStorage(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<string> {
  await ensureBucket(bucket);
  const admin = getAdminClient();
  const { error } = await admin.storage.from(bucket).upload(filename, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Gagal mengunggah ke Supabase Storage: ${error.message}`);
  const { data } = admin.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}
