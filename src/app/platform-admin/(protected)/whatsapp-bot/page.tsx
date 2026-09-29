"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { BOT_STATE_LABEL, type BotState } from "@/lib/leads/wa-bot-rules";

interface BotData {
  state: BotState;
  status: { connected: boolean; number: string | null; qrDataUrl: string | null; lastHeartbeatAt: string | null; lastError: string | null } | null;
  summary: { pending: number; failed: number; sentToday: number };
  dailyLimit: number;
  recent: {
    id: string;
    leadId: string;
    leadName: string;
    phone: string;
    templateTitle: string | null;
    status: "pending" | "sending" | "sent" | "failed";
    error: string | null;
    createdByName: string | null;
    createdAt: string;
    sentAt: string | null;
  }[];
}

const STATE_COLOR: Record<BotState, string> = {
  online: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  menunggu_scan: "text-amber-300 border-amber-400/40 bg-amber-500/10",
  menghubungkan: "text-sky-300 border-sky-400/40 bg-sky-500/10",
  offline: "text-rose-300 border-rose-400/40 bg-rose-500/10",
  belum_pernah: "text-neutral-300 border-white/15 bg-white/5",
};

const OUTBOX_LABEL = { pending: "Antre", sending: "Mengirim", sent: "Terkirim", failed: "Gagal" } as const;
const OUTBOX_COLOR = {
  pending: "text-sky-300 bg-sky-500/10",
  sending: "text-cyan-300 bg-cyan-500/10",
  sent: "text-emerald-300 bg-emerald-500/10",
  failed: "text-rose-300 bg-rose-500/10",
} as const;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) : "—";

function ago(iso: string | null): string {
  if (!iso) return "belum pernah";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} detik lalu`;
  if (s < 3600) return `${Math.round(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  return fmt(iso);
}

/** "6281234567890:12@s.whatsapp.net" → "+62 812-3456-7890" (kira-kira). */
function prettyNumber(jid: string | null): string {
  if (!jid) return "—";
  const d = jid.split("@")[0].split(":")[0];
  return d.startsWith("62") ? `+62 ${d.slice(2, 5)}-${d.slice(5, 9)}-${d.slice(9)}` : `+${d}`;
}

export default function WhatsappBotPage() {
  const [data, setData] = useState<BotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-admin/wa-bot", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? `Gagal (${res.status})`);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Saat menunggu scan / menyiapkan QR, refresh lebih cepat supaya QR (berlaku ±20 detik) selalu yang terbaru.
  const interval = data?.state === "menunggu_scan" || data?.state === "menghubungkan" ? 3000 : 15000;
  useEffect(() => {
    void load();
    const h = window.setInterval(() => void load(), interval);
    return () => window.clearInterval(h);
  }, [load, interval]);

  const act = async (id: string, action: "retry" | "cancel") => {
    if (action === "cancel" && !(await showConfirm("Batalkan pesan ini? Pesan dihapus dari antrean.", { tone: "danger", confirmLabel: "Batalkan" }))) return;
    const res = await fetch(`/api/platform-admin/wa-bot/outbox/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json().catch(() => null);
    if (!res.ok) await showAlert(d?.error ?? "Gagal.");
    await load();
  };

  const state = data?.state ?? "belum_pernah";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">WhatsApp Bot (CRM)</h1>
        <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
          Nomor WhatsApp NEXBILL untuk menghubungi prospek dari{" "}
          <Link href="/platform-admin/leads" className="text-amber-300 hover:underline">Leads &amp; CRM</Link>. Pesan dikirim dengan jeda acak dan batas harian;
          balasan dari nomor lead otomatis tercatat di riwayat lead. Bot ini tidak mengirim apa pun ke pelanggan outlet.
        </p>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={clsx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium", STATE_COLOR[state])}>
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  state === "online" ? "bg-emerald-400 animate-pulse" : state === "menunggu_scan" ? "bg-amber-400 animate-pulse" : state === "menghubungkan" ? "bg-sky-400 animate-pulse" : "bg-rose-400"
                )}
              />
              {BOT_STATE_LABEL[state]}
            </span>
            <span className="text-xs text-neutral-500">Heartbeat terakhir: {ago(data?.status?.lastHeartbeatAt ?? null)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-neutral-500">Nomor bot</div>
              <div className="text-neutral-100">{state === "online" ? prettyNumber(data?.status?.number ?? null) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Catatan terakhir</div>
              <div className="text-neutral-300">{data?.status?.lastError ?? "—"}</div>
            </div>
          </div>

          {state === "menunggu_scan" && data?.status?.qrDataUrl && (
            <div className="flex flex-col sm:flex-row gap-4 items-start rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
              <img src={data.status.qrDataUrl} alt="QR login WhatsApp bot" className="w-56 h-56 rounded-lg bg-white p-2 shrink-0" />
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-neutral-300">
                <li>Buka WhatsApp di HP yang nomornya akan dipakai bot (disarankan nomor khusus NEXBILL, bukan nomor pribadi).</li>
                <li>Ketuk <b>Perangkat tertaut</b> › <b>Tautkan perangkat</b>.</li>
                <li>Scan QR di samping. QR berganti otomatis setiap ±20 detik — halaman ini menampilkan yang terbaru.</li>
                <li className="text-amber-200">Jangan bagikan QR ini: siapa pun yang men-scan akan menautkan WhatsApp miliknya ke bot.</li>
              </ol>
            </div>
          )}

          {state === "menghubungkan" && (
            <div className="rounded-xl border border-sky-400/30 bg-sky-500/5 p-4 text-sm text-sky-100">
              Bot berjalan dan sedang menyiapkan QR baru / menyambung ulang. Biasanya hanya beberapa detik — halaman ini memperbarui otomatis, QR akan muncul di sini.
            </div>
          )}

          {(state === "offline" || state === "belum_pernah") && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm text-neutral-300">
              <div className="font-medium text-neutral-100">Bot belum berjalan</div>
              <p className="text-xs text-neutral-400">
                Bot harus menyala terus di server sendiri (VPS/PC 24 jam) — tidak bisa di Vercel. Pesan yang dikirim selama bot mati tetap di antrean dan terkirim saat bot aktif lagi.
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-neutral-400">
                <li>Salin proyek ke server, isi <code className="text-neutral-200">.env</code> dengan <code className="text-neutral-200">DATABASE_URL</code> yang sama dengan web app.</li>
                <li><code className="text-neutral-200">npm install</code> lalu <code className="text-neutral-200">npm run bot:whatsapp</code> (sebaiknya lewat pm2 agar hidup lagi otomatis).</li>
                <li>Opsional: <code className="text-neutral-200">WA_BOT_DAILY_LIMIT</code> untuk batas pesan per hari (default 150).</li>
                <li>Buka halaman ini, lalu scan QR yang muncul.</li>
              </ol>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="gm-heading font-semibold text-sm">Antrean</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-xl font-bold text-sky-300">{data?.summary.pending ?? 0}</div>
              <div className="text-[11px] text-neutral-500">Antre</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-xl font-bold text-emerald-300">{data?.summary.sentToday ?? 0}</div>
              <div className="text-[11px] text-neutral-500">Terkirim hari ini</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-xl font-bold text-rose-300">{data?.summary.failed ?? 0}</div>
              <div className="text-[11px] text-neutral-500">Gagal</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
              <span>Batas harian</span>
              <span>{data?.summary.sentToday ?? 0} / {data?.dailyLimit ?? 150}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${Math.min(100, ((data?.summary.sentToday ?? 0) / (data?.dailyLimit || 150)) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              Batas ini rem darurat agar nomor tidak dianggap spam. Angka yang berlaku adalah <code>WA_BOT_DAILY_LIMIT</code> di server bot.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="gm-heading font-semibold">Pesan Terbaru</h2>
          <Button variant="secondary" className="text-xs" onClick={() => void load()}>Muat ulang</Button>
        </div>
        {!data || data.recent.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada pesan. Kirim dari detail lead › Kirim WhatsApp › &quot;Kirim via Bot NEXBILL&quot;.</p>
        ) : (
          <div className="space-y-2">
            {data.recent.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/5 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold", OUTBOX_COLOR[m.status])}>{OUTBOX_LABEL[m.status]}</span>
                  <span className="font-medium text-neutral-100">{m.leadName}</span>
                  <span className="text-xs text-neutral-500">+{m.phone}</span>
                  <span className="flex-1" />
                  <span className="text-[11px] text-neutral-500">{fmt(m.sentAt ?? m.createdAt)}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-400">
                  {m.templateTitle ? `Template "${m.templateTitle}"` : "Pesan bebas"}
                  {m.createdByName && ` · oleh ${m.createdByName}`}
                </div>
                {m.error && <div className="mt-1 text-xs text-rose-300">{m.error}</div>}
                {(m.status === "failed" || m.status === "pending") && (
                  <div className="mt-1.5 flex gap-3 text-xs">
                    {m.status === "failed" && <button className="text-amber-300 hover:underline" onClick={() => void act(m.id, "retry")}>Kirim ulang</button>}
                    <button className="text-rose-400 hover:underline" onClick={() => void act(m.id, "cancel")}>Batalkan</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
