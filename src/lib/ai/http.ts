import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { AiQuotaError } from "./quota";
import { LANG_OPTIONS, type LangCode } from "@/lib/i18n/registry";

/**
 * Respons error route AI yang konsisten. Dulu semua error (termasuk "AI terkunci" dan error API
 * Anthropic mentah berisi JSON) dikembalikan 500 dan ditampilkan apa adanya di chat. Sekarang:
 *  - kuota habis → 429 code "ai_quota" (UI menampilkan pesan + meter kuota),
 *  - terkunci paket/role → 403 code "ai_locked" / "ai_role",
 *  - API key belum diisi → 503 code "ai_not_configured",
 *  - error penyedia AI → 502 code "ai_provider" dengan pesan ramah (detail di log server).
 */
export function aiErrorResponse(err: unknown) {
  if (err instanceof AiQuotaError) {
    return NextResponse.json({ error: err.message, code: err.code, reason: err.reason, limit: err.limit, used: err.used }, { status: 429 });
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[ai] error penyedia AI:", err.status, err.message);
    const busy = err.status === 429 || err.status === 529 || (err.status ?? 0) >= 500;
    return NextResponse.json(
      { error: busy ? "Layanan AI sedang sibuk. Coba lagi sebentar lagi." : "Layanan AI menolak permintaan ini. Coba ulangi dengan pertanyaan yang lebih singkat.", code: "ai_provider" },
      { status: 502 }
    );
  }
  const msg = describeError(err);
  if (msg.startsWith("Fitur AI saat ini hanya")) return NextResponse.json({ error: msg, code: "ai_role" }, { status: 403 });
  if (msg.startsWith("Fitur AI gratis selama")) return NextResponse.json({ error: msg, code: "ai_locked" }, { status: 403 });
  if (msg === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const status = (err as { status?: unknown })?.status;
  return NextResponse.json({ error: msg }, { status: typeof status === "number" && status >= 400 && status < 600 ? status : 500 });
}

export function aiNotConfiguredResponse() {
  return NextResponse.json({ error: "AI belum dikonfigurasi di server (ANTHROPIC_API_KEY kosong). Hubungi tim NEXBILL.", code: "ai_not_configured" }, { status: 503 });
}

export function langOf(v: unknown): LangCode {
  return LANG_OPTIONS.find((l) => l.code === v)?.code ?? "id";
}
