"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import "@/lib/i18n/dict-chat";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

interface Thread {
  id: string;
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

  const loadThreads = () => fetchJsonArray<Thread>("/api/support-chat").then(setThreads);
  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => fetchJsonArray<Message>(`/api/support-chat/${selected.id}/messages`).then(setMessages);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [selected]);

  const createTicket = async () => {
    if (!newMessage.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject || undefined, category: newCategory, message: newMessage }),
      });
      const out = await res.json();
      if (!res.ok) return;
      setNewSubject("");
      setNewMessage("");
      setShowNew(false);
      await loadThreads();
      setSelected(out.thread);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const body = reply;
    setReply("");
    await fetch(`/api/support-chat/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
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
          <Button onClick={createTicket} disabled={busy}>{busy ? t("chat.sending", "Mengirim...") : t("chat.sendToCenter", "Kirim ke Pusat")}</Button>
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
                  <span className="truncate">{th.subject || CATEGORY_LABEL[th.category]}</span>
                  <Badge status={th.status === "open" ? "pending" : "success"}>{th.status === "open" ? t("chat.statusOpen", "Dibuka") : t("chat.statusResolved", "Selesai")}</Badge>
                </div>
                <div className="text-xs text-neutral-500">{CATEGORY_LABEL[th.category]}</div>
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
                    <div className="text-[10px] text-neutral-500 mb-0.5">{m.sender === "platform_admin" ? m.senderName || t("chat.supportName", "NEXBILL Support") : m.senderName || t("chat.youLabel", "Kamu")}</div>
                    {m.body}
                  </div>
                ))}
                {messages.length === 0 && <p className="text-xs text-neutral-500 m-auto">{t("chat.noMessages", "Belum ada pesan.")}</p>}
              </div>
              <div className="flex gap-2 pt-2 border-t border-white/10 mt-2">
                <input
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                  placeholder={t("chat.replyPlaceholder", "Balas...")}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <Button onClick={sendReply}>{t("chat.sendButton", "Kirim")}</Button>
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
