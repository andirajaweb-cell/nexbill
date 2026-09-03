"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { LANG_OPTIONS, type LangCode } from "@/lib/i18n/registry";
import { Paperclip, Download, X, FileVideo } from "lucide-react";

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
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

interface PendingAttachment {
  url: string;
  type: string;
  name: string;
}

const MAX_ATTACHMENT_MB = 15;

const CATEGORY_LABEL: Record<string, string> = {
  keluhan: "Keluhan",
  saran: "Saran",
  kendala_teknis: "Kendala Teknis",
  lainnya: "Lainnya",
};

/** Same inline-preview treatment as the outlet-side chat page (src/app/dashboard/chat/page.tsx) —
 * image renders directly, video gets a native player, and a plain download link is always shown
 * so the recipient can save the original file either way. */
function AttachmentPreview({ url, type, name }: { url: string; type?: string | null; name?: string | null }) {
  const isImage = (type || "").startsWith("image/");
  const isVideo = (type || "").startsWith("video/");
  return (
    <div className="mt-1.5 space-y-1">
      {isImage && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={name || "Lampiran"} className="max-h-48 rounded-lg border border-white/10" />
        </a>
      )}
      {isVideo && <video src={url} controls className="max-h-48 rounded-lg border border-white/10" />}
      {!isImage && !isVideo && (
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <FileVideo size={12} /> <span className="truncate max-w-[160px]">{name || "Lampiran"}</span>
        </div>
      )}
      <a href={url} download={name || undefined} className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 transition w-fit">
        <Download size={11} /> Unduh{name ? ` — ${name}` : ""}
      </a>
    </div>
  );
}

export default function PlatformSupportPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [translating, setTranslating] = useState(false);
  const [translatedInto, setTranslatedInto] = useState<LangCode | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<PendingAttachment | null>(null);
  const [uploadingReply, setUploadingReply] = useState(false);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = async (file: File): Promise<PendingAttachment | null> => {
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      alert(`File maksimal ${MAX_ATTACHMENT_MB}MB.`);
      return null;
    }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/platform-admin/support/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Gagal mengunggah file.");
      return null;
    }
    return { url: data.url, type: data.type, name: data.name };
  };

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
    if (!selected || (!reply.trim() && !replyAttachment)) return;
    const body = reply;
    const attachment = replyAttachment;
    setReply("");
    setReplyAttachment(null);
    setTranslatedInto(null);
    await fetch(`/api/platform-admin/support/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, attachmentUrl: attachment?.url, attachmentType: attachment?.type, attachmentName: attachment?.name }),
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
                    {m.attachmentUrl && <AttachmentPreview url={m.attachmentUrl} type={m.attachmentType} name={m.attachmentName} />}
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
                {replyAttachment && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 w-fit">
                    <Paperclip size={12} className="text-amber-300" />
                    <span className="truncate max-w-[200px]">{replyAttachment.name}</span>
                    <button type="button" onClick={() => setReplyAttachment(null)} className="text-neutral-500 hover:text-rose-400 transition">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={replyFileRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setUploadingReply(true);
                      try {
                        const uploaded = await uploadAttachment(file);
                        if (uploaded) setReplyAttachment(uploaded);
                      } finally {
                        setUploadingReply(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => replyFileRef.current?.click()}
                    disabled={uploadingReply}
                    title="Lampirkan gambar/video"
                    className="shrink-0 self-start rounded-lg border border-neutral-700 px-2.5 py-2 text-neutral-400 hover:text-amber-300 hover:border-amber-400/30 transition disabled:opacity-50"
                  >
                    <Paperclip size={14} />
                  </button>
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
                    <Button onClick={sendReply} disabled={!reply.trim() && !replyAttachment}>Kirim</Button>
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
