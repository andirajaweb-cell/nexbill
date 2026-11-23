/**
 * Panggilan HTTP bot WhatsApp → workflow n8n self-host. Aturan & kontrak di ./n8n-bridge-rules.ts,
 * panduan pemasangan di deploy/n8n/README.md.
 *
 * Env (di .env server bot):
 *   N8N_WEBHOOK_URL      mis. http://127.0.0.1:5678/webhook/nexbill-wa  (kosong = n8n tidak dipakai)
 *   N8N_WEBHOOK_SECRET   rahasia bersama; sama dengan kredensial "Header Auth" di node Webhook n8n
 *   N8N_TIMEOUT_MS       batas tunggu (bawaan 15000). Lewat batas → otak bawaan yang menjawab.
 */
import { n8nWebhookUrl, N8N_SECRET_HEADER, parseN8nResponse, type N8nPayload, type N8nResult } from "./n8n-bridge-rules";
import { parsePositiveInt } from "./wa-marketing-rules";

export const N8N_URL = n8nWebhookUrl(process.env.N8N_WEBHOOK_URL);
const SECRET = process.env.N8N_WEBHOOK_SECRET?.trim() || "";
const TIMEOUT_MS = parsePositiveInt(process.env.N8N_TIMEOUT_MS, 15_000, 60_000);

let lastWarnAt = 0;
function warn(msg: string) {
  // Jangan membanjiri log pm2 saat n8n mati: maks. sekali per menit.
  if (Date.now() - lastWarnAt < 60_000) return;
  lastWarnAt = Date.now();
  console.warn(`n8n: ${msg} — memakai otak bawaan.`);
}

/** Kirim pesan ke n8n. null = n8n tidak dipakai/gagal → pemanggil memakai otak bawaan. */
export async function askN8n(payload: N8nPayload): Promise<N8nResult | null> {
  if (!N8N_URL) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(SECRET ? { [N8N_SECRET_HEADER]: SECRET } : {}) },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      warn(`HTTP ${res.status}${res.status === 403 || res.status === 401 ? " (cek N8N_WEBHOOK_SECRET = kredensial Header Auth di n8n)" : res.status === 404 ? " (workflow belum Active / path webhook beda)" : ""}`);
      return null;
    }
    const parsed = parseN8nResponse(await res.text());
    if (!parsed) warn("respons tidak sesuai kontrak (butuh JSON berisi reply)");
    return parsed;
  } catch (err) {
    warn((err as Error)?.name === "AbortError" ? `tidak menjawab dalam ${TIMEOUT_MS} ms` : `tidak bisa dihubungi (${(err as Error)?.message ?? err})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
