"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";

interface Answer {
  id: string;
  question: string;
  answer: string;
  tags: string | null;
  sourceThreadId: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedAt: string;
}

interface Suggestion {
  threadId: string;
  outletName: string;
  subject: string | null;
  question: string;
  answer: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Jawaban Bot — basis jawaban tim untuk bot support 24 jam (Customer Service & Telegram). Rutinitas
 * mingguan: buka "Usulan minggu ini", jadikan jawaban yang berulang, tulis ulang secara umum.
 */
export default function SupportKbPage() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [migration, setMigration] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-admin/support-kb", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? `Gagal (${res.status})`);
      setAnswers(d.answers);
      setSuggestions(d.suggestions);
      setMigration(d.migration);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (initial: { question?: string; answer?: string; sourceThreadId?: string }) => {
    const question = await showPrompt("Pertanyaan/masalah (tulis umum, tanpa nama outlet):", { defaultValue: initial.question ?? "", required: true, multiline: true, confirmLabel: "Lanjut" });
    if (!question) return;
    const answer = await showPrompt("Jawaban yang boleh dipakai bot untuk semua outlet:", { defaultValue: initial.answer ?? "", required: true, multiline: true, confirmLabel: "Simpan" });
    if (!answer) return;
    const res = await fetch("/api/platform-admin/support-kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, sourceThreadId: initial.sourceThreadId }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) await showAlert(d?.error ?? "Gagal menyimpan.");
    await load();
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/platform-admin/support-kb/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => null);
    if (!res.ok) await showAlert(d?.error ?? "Gagal menyimpan.");
    await load();
  };

  const edit = async (a: Answer) => {
    const question = await showPrompt("Pertanyaan/masalah:", { defaultValue: a.question, required: true, multiline: true, confirmLabel: "Lanjut" });
    if (!question) return;
    const answer = await showPrompt("Jawaban:", { defaultValue: a.answer, required: true, multiline: true, confirmLabel: "Simpan" });
    if (!answer) return;
    await patch(a.id, { question, answer });
  };

  const remove = async (a: Answer) => {
    if (!(await showConfirm("Hapus jawaban ini? Bot tidak memakainya lagi.", { tone: "danger", confirmLabel: "Hapus" }))) return;
    await fetch(`/api/platform-admin/support-kb/${a.id}`, { method: "DELETE" });
    await load();
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? answers.filter((a) => `${a.question} ${a.answer} ${a.tags ?? ""}`.toLowerCase().includes(q)) : answers;
  }, [answers, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="gm-display text-2xl font-bold text-amber-300">Jawaban Bot</h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
            Jawaban tim yang dipakai bot support 24 jam ({" "}
            <Link href="/platform-admin/support" className="text-amber-300 hover:underline">Customer Service</Link> & Telegram) untuk masalah yang berulang. Tulis umum — tanpa nama
            outlet, nomor, atau data pelanggan — karena jawaban ini bisa dipakai untuk semua merchant. Rutinitas: seminggu sekali, buka usulan di bawah.
          </p>
        </div>
        <Button onClick={() => create({})} disabled={!migration}>+ Jawaban baru</Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!migration && <p className="text-sm text-amber-300">Jalankan migrasi 0037_telegram_support_bot.sql di Supabase untuk mengaktifkan Jawaban Bot.</p>}

      <Card className="space-y-3">
        <div className="text-sm font-medium text-neutral-100">Usulan minggu ini ({suggestions.length})</div>
        <p className="text-xs text-neutral-500">Tiket selesai 7 hari terakhir yang dibalas manusia dan belum dijadikan jawaban bot.</p>
        {suggestions.length === 0 && <p className="text-xs text-neutral-500">Tidak ada usulan.</p>}
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div key={s.threadId} className="rounded-lg border border-white/10 p-3 text-sm space-y-1">
              <div className="text-xs text-neutral-500">
                {s.outletName} — {s.subject || "tanpa judul"}
              </div>
              <div className="text-neutral-300 whitespace-pre-wrap line-clamp-3">T: {s.question}</div>
              <div className="text-neutral-100 whitespace-pre-wrap line-clamp-4">J: {s.answer}</div>
              <button type="button" className="text-xs text-sky-300 hover:underline" disabled={!migration} onClick={() => create({ question: s.question, answer: s.answer, sourceThreadId: s.threadId })}>
                Jadikan jawaban bot
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-medium text-neutral-100">
            Jawaban tersimpan ({answers.filter((a) => a.isActive).length} aktif dari {answers.length})
          </div>
          <input
            className="rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm w-64"
            placeholder="Cari…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {shown.length === 0 && <p className="text-xs text-neutral-500">Belum ada jawaban.</p>}
        <div className="space-y-2">
          {shown.map((a) => (
            <div key={a.id} className={`rounded-lg border p-3 text-sm space-y-1 ${a.isActive ? "border-white/10" : "border-white/5 opacity-60"}`}>
              <div className="font-medium text-neutral-100 whitespace-pre-wrap">{a.question}</div>
              <div className="text-neutral-300 whitespace-pre-wrap">{a.answer}</div>
              <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                <span>
                  {a.createdBy ?? "—"} · {fmt(a.updatedAt)}
                </span>
                <button type="button" className="text-sky-300 hover:underline" onClick={() => edit(a)}>
                  Ubah
                </button>
                <button type="button" className="text-amber-300 hover:underline" onClick={() => patch(a.id, { isActive: !a.isActive })}>
                  {a.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button type="button" className="text-rose-300 hover:underline" onClick={() => remove(a)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
