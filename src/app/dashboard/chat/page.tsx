"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";
import { Paperclip, Download, X, FileVideo } from "lucide-react";
import "@/lib/i18n/dict-chat";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

interface Thread {
  id: string;
  subject: string | null;
  category: "keluhan" | "saran" | "kendala_teknis" | "lainnya";
  status: "open" | "resolved";
  lastMessageAt: string | null;
  createdAt: string;
  unread?: boolean;
}

/** "3 Sep 2026, 14:05" — used on both the ticket list (last activity) and each message bubble. */
function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

/** Inline preview for one message's attachment — image renders directly, video gets a native
 * player, anything else (or a type we don't recognize) falls back to just the download link. A
 * plain download link is always shown alongside so the recipient can save the original file
 * regardless of whether the browser can render it inline. */
function AttachmentPreview({ url, type, name, t }: { url: string; type?: string | null; name?: string | null; t: (key: string, fallback: string) => string }) {
  const isImage = (type || "").startsWith("image/");
  const isVideo = (type || "").startsWith("video/");
  const fallbackLabel = t("chat.attachmentFallback", "Lampiran");
  return (
    <div className="mt-1.5 space-y-1">
      {isImage && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={name || fallbackLabel} className="max-h-48 rounded-lg border border-white/10" />
        </a>
      )}
      {isVideo && <video src={url} controls className="max-h-48 rounded-lg border border-white/10" />}
      {!isImage && !isVideo && (
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <FileVideo size={12} /> <span className="truncate max-w-[160px]">{name || fallbackLabel}</span>
        </div>
      )}
      <a href={url} download={name || undefined} className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition w-fit">
        <Download size={11} /> {t("chat.download", "Unduh")}{name ? ` — ${name}` : ""}
      </a>
    </div>
  );
}

export default function SupportChatPage() {
  const { t } = useDashboardLang();
  const CATEGORY_LABEL: Record<string, string> = {
    keluhan: t("chat.category.keluhan", "Keluhan"),
    saran: t("chat.category.saran", "Saran"),
    kendala_teknis: t("chat.category.kendalaTeknis", "Kendala Teknis"),
    lainnya: t("chat.category.lainnya", "Lainnya"),
  };
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("keluhan");
  const [newMessage, setNewMessage] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newAttachment, setNewAttachment] = useState<PendingAttachment | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<PendingAttachment | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingReply, setUploadingReply] = useState(false);
  const newFileRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = async (file: File): Promise<PendingAttachment | null> => {
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      showAlert(t("chat.maxAttachmentSize", "File maksimal {n}MB.").replace("{n}", String(MAX_ATTACHMENT_MB)));
      return null;
    }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/support-chat/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAlert(data?.error || t("chat.uploadFailed", "Gagal mengunggah file."));
      return null;
    }
    return { url: data.url, type: data.type, name: data.name };
  };

  const loadThreads = () => fetchJsonArray<Thread>("/api/support-chat").then(setThreads);
  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => fetchJsonArray<Message>(`/api/support-chat/${selected.id}/messages`).then(setMessages);
    // Opening a thread marks it read server-side (see GET /api/support-chat/[id]/messages) —
    // refresh the thread list right away so its unread dot/badge clears immediately instead of
    // waiting for the next 5s poll.
    load().then(loadThreads);
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [selected]);

  const createTicket = async () => {
    if (!newMessage.trim() && !newAttachment) return;
    setBusy(true);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject || undefined,
          category: newCategory,
          message: newMessage,
          attachmentUrl: newAttachment?.url,
          attachmentType: newAttachment?.type,
          attachmentName: newAttachment?.name,
        }),
      });
      const out = await res.json();
      if (!res.ok) return;
      setNewSubject("");
      setNewMessage("");
      setNewAttachment(null);
      setShowNew(false);
      await loadThreads();
      setSelected(out.thread);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selected || (!reply.trim() && !replyAttachment)) return;
    const body = reply;
    const attachment = replyAttachment;
    setReply("");
    setReplyAttachment(null);
    await fetch(`/api/support-chat/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, attachmentUrl: attachment?.url, attachmentType: attachment?.type, attachmentName: attachment?.name }),
    });
    const msgs = await fetchJsonArray<Message>(`/api/support-chat/${selected.id}/messages`);
    setMessages(msgs);
    await loadThreads();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("chat.title", "Customer Service NEXBILL")}</h1>
          <p className="text-sm text-neutral-500">{t("chat.subtitle", "Sampaikan keluhan, saran, atau kendala teknis outlet-mu langsung ke tim pusat NEXBILL.")}</p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)}>{showNew ? t("chat.cancelButton", "Batal") : t("chat.newTicketButton", "+ Tiket Baru")}</Button>
      </div>

      {showNew && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-neutral-500">{t("chat.subjectLabel", "Judul (opsional)")}</label>
              <input
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t("chat.subjectPlaceholder", "mis. QRIS tidak masuk")}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">{t("chat.categoryLabel", "Kategori")}</label>
              <select
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">{t("chat.messageLabel", "Pesan")}</label>
            <textarea
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
              rows={3}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("chat.messagePlaceholder", "Jelaskan keluhan/saran/kendalanya...")}
            />
          </div>
          {newAttachment && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 w-fit">
              <Paperclip size={12} className="text-cyan-300" />
              <span className="truncate max-w-[200px]">{newAttachment.name}</span>
              <button type="button" onClick={() => setNewAttachment(null)} className="text-neutral-500 hover:text-rose-400 transition">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={newFileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploadingNew(true);
                try {
                  const uploaded = await uploadAttachment(file);
                  if (uploaded) setNewAttachment(uploaded);
                } finally {
                  setUploadingNew(false);
                }
              }}
            />
            <Button variant="secondary" className="text-xs" onClick={() => newFileRef.current?.click()} disabled={uploadingNew}>
              <Paperclip size={12} className="mr-1 inline" /> {uploadingNew ? t("chat.uploading", "Mengunggah...") : t("chat.attachButton", "Lampirkan gambar/video")}
            </Button>
            <Button onClick={createTicket} disabled={busy || uploadingNew || (!newMessage.trim() && !newAttachment)}>
              {busy ? t("chat.sending", "Mengirim...") : t("chat.sendToCenter", "Kirim ke Pusat")}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        <Card className="overflow-y-auto">
          <h2 className="font-medium mb-2 text-sm">{t("chat.yourTickets", "Tiket Kamu")}</h2>
          <div className="space-y-1">
            {threads.map((th) => (
              <button
                key={th.id}
                onClick={() => setSelected(th)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${selected?.id === th.id ? "bg-cyan-500/15" : "hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate flex items-center gap-1.5 ${th.unread ? "font-semibold text-neutral-50" : ""}`}>
                    {th.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />}
                    {th.subject || CATEGORY_LABEL[th.category]}
                  </span>
                  <Badge status={th.status === "open" ? "pending" : "success"}>{th.status === "open" ? t("chat.statusOpen", "Dibuka") : t("chat.statusResolved", "Selesai")}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span>{CATEGORY_LABEL[th.category]}</span>
                  <span className="shrink-0">{formatDateTime(th.lastMessageAt || th.createdAt)}</span>
                </div>
              </button>
            ))}
            {threads.length === 0 && <p className="text-xs text-neutral-500">{t("chat.noTickets", "Belum ada tiket. Buat tiket baru kalau ada keluhan/saran/kendala.")}</p>}
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <div className="text-sm font-medium">{selected.subject || CATEGORY_LABEL[selected.category]}</div>
                <Badge status={selected.status === "open" ? "pending" : "success"}>{selected.status === "open" ? t("chat.statusOpen", "Dibuka") : t("chat.statusResolved", "Selesai")}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === "platform_admin" ? "bg-white/5" : "bg-cyan-500/15 ml-auto"}`}>
                    <div className="flex items-center justify-between gap-3 mb-0.5">
                      <span className="text-[10px] text-neutral-500">{m.sender === "platform_admin" ? m.senderName || t("chat.supportName", "NEXBILL Support") : m.senderName || t("chat.youLabel", "Kamu")}</span>
                      <span className="text-[10px] text-neutral-600 shrink-0">{formatDateTime(m.createdAt)}</span>
                    </div>
                    {m.body}
                    {m.attachmentUrl && <AttachmentPreview url={m.attachmentUrl} type={m.attachmentType} name={m.attachmentName} t={t} />}
                  </div>
                ))}
                {messages.length === 0 && <p className="text-xs text-neutral-500 m-auto">{t("chat.noMessages", "Belum ada pesan.")}</p>}
              </div>
              {replyAttachment && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 mt-2 text-xs text-neutral-300 w-fit">
                  <Paperclip size={12} className="text-cyan-300" />
                  <span className="truncate max-w-[200px]">{replyAttachment.name}</span>
                  <button type="button" onClick={() => setReplyAttachment(null)} className="text-neutral-500 hover:text-rose-400 transition">
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-white/10 mt-2">
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
                  title={t("chat.attachButton", "Lampirkan gambar/video")}
                  className="shrink-0 rounded-lg border border-white/10 px-2.5 text-neutral-400 hover:text-cyan-300 hover:border-cyan-400/30 transition disabled:opacity-50"
                >
                  <Paperclip size={14} />
                </button>
                <input
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                  placeholder={t("chat.replyPlaceholder", "Balas...")}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <Button onClick={sendReply} disabled={!reply.trim() && !replyAttachment}>{t("chat.sendButton", "Kirim")}</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500 m-auto">{t("chat.selectTicketPrompt", "Pilih tiket di sebelah kiri, atau buat tiket baru.")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
