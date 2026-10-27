"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert } from "@/lib/ui/dialog";

interface TgData {
  configured: boolean;
  hasSecret: boolean;
  hasAnthropicKey: boolean;
  model: string;
  bot: { username: string; name: string } | null;
  webhook: { url: string; pending: number; lastError: string | null; lastErrorAt: string | null } | null;
  expectedWebhookUrl: string;
  oncallChats: number;
  migration: boolean;
  linkedChats: number;
  errors?: { body: string; createdAt: string }[];
  stats: {
    conversations: number;
    resolvedByBot: number;
    tickets: number;
    urgent: number;
    deflection: number | null;
    faqAnswers?: number;
    aiAnswers?: number;
    feedbackOk?: number;
    feedbackNo?: number;
    feedbackTeam?: number;
  } | null;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) : "—");

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={clsx("mt-1 h-2 w-2 rounded-full shrink-0", ok ? "bg-emerald-400" : "bg-rose-400")} />
      <span>
        <span className={ok ? "text-neutral-200" : "text-rose-200"}>{label}</span>
        {!ok && hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
    </li>
  );
}

/** Bot Telegram support 24 jam untuk merchant — status, pemasangan webhook, dan metrik 30 hari. */
export default function TelegramBotPage() {
  const [data, setData] = useState<TgData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-admin/telegram", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? `Gagal (${res.status})`);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const installWebhook = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/telegram", { method: "POST" });
      const d = await res.json().catch(() => null);
      if (!res.ok) await showAlert(d?.error ?? "Gagal memasang webhook.");
      else await showAlert(`Webhook terpasang: ${d.url}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const testSend = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) await showAlert(d?.error ?? "Tes gagal.");
      else
        await showAlert(
          (d.results as { chatId: string; ok: boolean; error?: string }[]).map((r) => `${r.chatId}: ${r.ok ? "terkirim ✅" : `GAGAL — ${r.error}`}`).join("\n")
        );
      await load();
    } finally {
      setBusy(false);
    }
  };

  const webhookOk = !!data?.webhook?.url && data.webhook.url === data.expectedWebhookUrl;
  const s = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Telegram Bot (Support 24 jam)</h1>
        <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
          Bot AI yang menjawab owner & kasir outlet 24 jam dari Panduan Bantuan dan status akun mereka sendiri (hanya baca). Yang tidak terjawab menjadi tiket di{" "}
          <Link href="/platform-admin/support" className="text-amber-300 hover:underline">Customer Service</Link>; balasan tim di tiket itu otomatis diteruskan ke Telegram
          merchant. P1 (darurat) juga dikirim ke chat petugas jaga.
        </p>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-neutral-500">Bot</div>
              <div className="text-neutral-100 text-lg">{data?.bot ? `@${data.bot.username}` : "—"}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={testSend} disabled={busy || !data?.configured}>
                Kirim pesan tes
              </Button>
              <Button onClick={installWebhook} disabled={busy || !data?.configured || !data?.hasSecret}>
                {busy ? "Memasang…" : webhookOk ? "Pasang ulang webhook" : "Pasang webhook"}
              </Button>
            </div>
          </div>

          <ul className="space-y-2">
            <Check ok={!!data?.configured && !!data?.bot} label="TELEGRAM_BOT_TOKEN terisi & valid" hint="Buat bot di @BotFather (/newbot), simpan tokennya di env Vercel, lalu redeploy." />
            <Check ok={!!data?.hasSecret} label="TELEGRAM_WEBHOOK_SECRET terisi" hint="String acak 32+ karakter (huruf/angka/_/-). Telegram mengirimnya di setiap webhook; tanpa ini update ditolak." />
            <Check ok={!!data?.hasAnthropicKey} label={`ANTHROPIC_API_KEY terisi (model ${data?.model ?? "—"})`} hint="Kunci yang sama dengan Business Assistant. Model bisa diganti lewat TELEGRAM_SUPPORT_MODEL." />
            <Check ok={!!data?.migration} label="Migrasi 0037_telegram_support_bot.sql sudah dijalankan" hint="Jalankan file itu di Supabase SQL Editor." />
            <Check ok={webhookOk} label="Webhook mengarah ke server ini" hint={`Seharusnya ${data?.expectedWebhookUrl ?? "…"} — tekan Pasang webhook.`} />
            <Check
              ok={(data?.oncallChats ?? 0) > 0}
              label={`Petugas jaga P1: ${data?.oncallChats ?? 0} chat`}
              hint="Petugas mengirim /id ke bot, lalu chat id-nya dimasukkan ke TELEGRAM_ONCALL_CHAT_IDS (pisahkan dengan koma). Tanpa ini P1 tetap jadi tiket, tapi tidak ada notifikasi."
            />
          </ul>

          {data?.webhook && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-400 space-y-1">
              <div>URL webhook: <span className="text-neutral-200 break-all">{data.webhook.url || "— (belum dipasang)"}</span></div>
              <div>Update menunggu: {data.webhook.pending}</div>
              {(data.errors?.length ?? 0) > 0 && (
                <div className="space-y-0.5 pt-1">
                  <div className="text-neutral-300">Error pemrosesan terakhir (bot gagal membalas):</div>
                  {data.errors!.map((e, i) => (
                    <div key={i} className="text-rose-300 break-words">
                      {fmt(e.createdAt)} — {e.body}
                    </div>
                  ))}
                </div>
              )}
              {data.webhook.lastError && (
                <div className="text-rose-300">
                  Error terakhir ({fmt(data.webhook.lastErrorAt)}): {data.webhook.lastError}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-medium text-neutral-100">30 hari terakhir</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-neutral-500">Percakapan</div>
              <div className="text-xl text-neutral-100">{s?.conversations ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Selesai di bot (target ≥ 70%)</div>
              <div className={clsx("text-xl", s?.deflection == null ? "text-neutral-400" : s.deflection >= 0.7 ? "text-emerald-300" : "text-amber-300")}>
                {s?.deflection == null ? "—" : `${Math.round(s.deflection * 100)}%`}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Jadi tiket</div>
              <div className="text-xl text-neutral-100">{s?.tickets ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">P1 darurat</div>
              <div className="text-xl text-rose-300">{s?.urgent ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Dijawab tingkat 1 FAQ (gratis)</div>
              <div className="text-xl text-emerald-300">{s?.faqAnswers ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Dijawab tingkat 2 AI</div>
              <div className="text-xl text-sky-300">{s?.aiAnswers ?? 0}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-neutral-500">Penilaian merchant</div>
              <div className="text-sm text-neutral-200">
                ✅ {s?.feedbackOk ?? 0} terbantu · ❌ {s?.feedbackNo ?? 0} belum · 👤 {s?.feedbackTeam ?? 0} minta staf
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-neutral-500">Akun Telegram tertaut</div>
              <div className="text-xl text-neutral-100">{data?.linkedChats ?? 0}</div>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Percakapan = pesan satu chat tanpa jeda lebih dari 6 jam. Selesai di bot = tidak ada tiket di percakapan itu.
          </p>
        </Card>
      </div>
    </div>
  );
}
