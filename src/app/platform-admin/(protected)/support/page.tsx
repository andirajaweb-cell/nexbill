"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { LANG_OPTIONS, type LangCode } from "@/lib/i18n/registry";

interface Thread {
  id: string;
  outletId: string;
  outletName: string;
  outletPreferredLang: LangCode;
  subject: string | null;
  category: "keluhan" | "saran" | "kendala_teknis" | "lainnya";
  status: "open" | "resolved";
  lastMessageAt: string | null;
  createdAt: string;
}

interface Message {
  id: string;
  sender: "outlet" | "platform_admin";
  senderName: string | null;
  body: string;
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  keluhan: "Keluhan",
  saran: "Saran",
  kendala_teknis: "Kendala Teknis",
  lainnya: "Lainnya",
};

export default function PlatformSupportPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [translating, setTranslating] = useState(false);
  const [translatedInto, setTranslatedInto] = useState<LangCode | null>(null);

  const loadThreads = () => fetchJsonArray<Thread>("/api/platform-admin/support").then(setThreads);
  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => fetchJsonArray<Message>(`/api/platform-admin/support/${selected.id}/messages`).then(setMessages);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [selected]);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const body = reply;
    setReply("");
    setTranslatedInto(null);
    await fetch(`/api/platform-admin/support/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const msgs = await fetchJsonArray<Message>(`/api/platform-admin/support/${selected.id}/messages`);
    setMessages(msgs);
    await loadThreads();
  };

  // Draft is always written in Bahasa Indonesia, then translated into the outlet's declared
  // preferredLang (Settings > Business & Tax) before sending — see lib/ai/translate.ts. Result
  // replaces the textarea so the admin can still review/edit before Kirim; skipped entirely
  // when the outlet's language is already "id".
  const translateDraft = async () => {
    if (!selected || !reply.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch(`/api/platform-admin/support/${selected.id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert(data?.error ?? "Gagal menerjemahkan.");
      setReply(data.translated);
      setTranslatedInto(data.targetLang);
    } finally {
      setTranslating(false);
    }
  };

  const toggleStatus = async (thread: Thread) => {
    const next = thread.status === "open" ? "resolved" : "open";
    await fetch(`/api/platform-admin/support/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSelected({ ...thread, status: next });
    await loadThreads();
  };

  const visibleThreads = threads.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="gm-display text-2xl font-bold text-amber-300">Customer Service</h1>
          <p className="text-sm text-neutral-500 mt-1">Keluhan, saran, dan kendala teknis dari seluruh outlet/merchant — balas di sini sebagai tim pusat NEXBILL.</p>
        </div>
        <div className="flex gap-1">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${filter === f ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 text-neutral-500 hover:text-neutral-300"}`}
            >
              {f === "open" ? "Dibuka" : f === "resolved" ? "Selesai" : "Semua"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        <Card className="overflow-y-auto">
          <h2 className="font-medium mb-2 text-sm">Tiket Masuk</h2>
          <div className="space-y-1">
            {visibleThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setReply(""); setTranslatedInto(null); }}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${selected?.id === t.id ? "bg-amber-400/10" : "hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-neutral-200">{t.outletName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.status === "open" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {t.status === "open" ? "Dibuka" : "Selesai"}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 truncate">{t.subject || CATEGORY_LABEL[t.category]} — {CATEGORY_LABEL[t.category]}</div>
              </button>
            ))}
            {visibleThreads.length === 0 && <p className="text-xs text-neutral-500">Tidak ada tiket.</p>}
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <div>
                  <div className="text-sm font-medium">{selected.outletName}</div>
                  <div className="text-xs text-neutral-500">{selected.subject || CATEGORY_LABEL[selected.category]} — {CATEGORY_LABEL[selected.category]}</div>
                  {selected.outletPreferredLang && selected.outletPreferredLang !== "id" && (
                    <div className="text-[10px] text-amber-300/80 mt-0.5">
                      Balas dalam: {LANG_OPTIONS.find((l) => l.code === selected.outletPreferredLang)?.flag} {LANG_OPTIONS.find((l) => l.code === selected.outletPreferredLang)?.label}
                    </div>
                  )}
                </div>
                <Button variant="secondary" className="text-xs" onClick={() => toggleStatus(selected)}>
                  {selected.status === "open" ? "Tandai Selesai" : "Buka Kembali"}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === "outlet" ? "bg-white/5" : "bg-amber-400/10 ml-auto"}`}>
                    <div className="text-[10px] text-neutral-500 mb-0.5">{m.senderName || (m.sender === "outlet" ? selected.outletName : "NEXBILL Support")}</div>
                    {m.body}
                  </div>
                ))}
                {messages.length === 0 && <p className="text-xs text-neutral-500 m-auto">Belum ada pesan.</p>}
              </div>
              <div className="pt-2 border-t border-white/10 mt-2 space-y-1.5">
                {translatedInto && (
                  <div className="text-[10px] text-emerald-300/80">
                    Diterjemahkan ke {LANG_OPTIONS.find((l) => l.code === translatedInto)?.label} — cek dulu sebelum kirim.
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm resize-none"
                    rows={2}
                    placeholder="Tulis balasan dalam Bahasa Indonesia..."
                    value={reply}
                    onChange={(e) => { setReply(e.target.value); setTranslatedInto(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  />
                  <div className="flex flex-col gap-2">
                    {selected.outletPreferredLang && selected.outletPreferredLang !== "id" && (
                      <Button variant="secondary" className="text-xs whitespace-nowrap" disabled={translating || !reply.trim()} onClick={translateDraft}>
                        {translating ? "Menerjemahkan..." : "Terjemahkan"}
                      </Button>
                    )}
                    <Button onClick={sendReply} disabled={!reply.trim()}>Kirim</Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500 m-auto">Pilih tiket di sebelah kiri.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
