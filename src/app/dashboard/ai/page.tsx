"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { showAlert } from "@/lib/ui/dialog";
import { useAuth } from "@/lib/auth/client";
import "@/lib/i18n/dict-ai";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["assistant", "insights"] as const;
type Tab = (typeof TABS)[number];

interface AiSubscriptionGate {
  isAiLocked: boolean;
  aiAddon: { freeViaTrial: boolean; includedViaPlan: boolean; active: boolean };
}

export default function AiPage() {
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const [tab, setTab] = useState<Tab>("assistant");
  const [outletId, setOutletId] = useState<string | null>(null);
  const [aiGate, setAiGate] = useState<AiSubscriptionGate | null>(null);

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  useEffect(() => {
    // Superuser bypasses this entirely server-side (assertAiAllowed) — no need to even fetch
    // /api/subscription for that role, since isAiLocked is never consulted for it anyway.
    if (user?.role !== "superuser") {
      fetchJsonObject<{ isAiLocked: boolean; aiAddon: AiSubscriptionGate["aiAddon"] }>("/api/subscription").then((d) => {
        if (d) setAiGate({ isAiLocked: !!d.isAiLocked, aiAddon: d.aiAddon });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Server-side (assertAiRoleAllowed in lib/subscription/service.ts) restricts AI usage to
  // Owner/Superuser only, regardless of who holds view_reports — mirrored here so staff roles get
  // a clear explanation instead of a broken chat box that 500s on every message.
  const roleAllowed = user?.role === "superuser" || user?.role === "owner";
  // Beyond role, an Owner outlet also needs the AI Add-on paid (or still in its free trial window,
  // or on an unlimited-entitlement plan that bundles AI in) — assertAiAllowed enforces this per
  // call server-side; this mirrors it so a non-paying Owner sees an upgrade prompt instead of a
  // chat box that errors on every message. Superuser (NEXBILL's own internal/testing account) is
  // never gated by payment, matching assertAiAllowed's own bypass.
  const paymentAllowed = user?.role === "superuser" || (roleAllowed && !!aiGate && !aiGate.isAiLocked);
  const paymentGateLoading = roleAllowed && user?.role !== "superuser" && !aiGate;

  const tabLabels: Record<Tab, string> = {
    assistant: t("ai.tabAssistant", "Asisten Bisnis"),
    insights: t("ai.tabInsights", "Insight & Analisa"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("ai.pageTitle", "AI Business Intelligence")}</h1>
        <p className="text-sm text-neutral-500">{t("ai.pageSubtitle", "Tanya jawab data bisnis secara natural, plus tren, forecast, deteksi anomali, dan rekomendasi otomatis.")}</p>
      </div>

      {user && !roleAllowed ? (
        <Card className="p-4 border-white/10">
          <div className="font-semibold text-neutral-300">{t("ai.restrictedTitle", "Fitur AI hanya untuk Owner/Superuser")}</div>
          <p className="text-sm text-neutral-500 mt-1">{t("ai.restrictedBody", "Role kamu saat ini belum bisa mengakses AI Business Assistant maupun AI Insights. Hubungi pemilik outlet kalau butuh akses.")}</p>
        </Card>
      ) : paymentGateLoading ? null : user && roleAllowed && !paymentAllowed ? (
        <Card className="p-4 border-amber-500/30 space-y-2">
          <div className="font-semibold text-amber-300">{t("ai.paywallTitle", "AI Add-on Belum Aktif")}</div>
          <p className="text-sm text-neutral-500">
            {t("ai.paywallBody", "AI Business Intelligence adalah produk berbayar terpisah — gratis selama masa percobaan, setelah itu perlu AI Add-on aktif (atau paket unlimited) di halaman Langganan.")}
          </p>
          <Link href="/dashboard/billing">
            <Button className="mt-1">{t("ai.paywallCta", "Aktifkan AI Add-on")}</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
            {TABS.map((tabKey) => (
              <button key={tabKey} onClick={() => setTab(tabKey)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tabKey ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>{tabLabels[tabKey]}</button>
            ))}
          </div>

          {!outletId ? null : tab === "assistant" ? <AssistantTab outletId={outletId} /> : <InsightsTab outletId={outletId} />}
        </>
      )}
    </div>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string };

function AssistantTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const SUGGESTIONS = [
    t("ai.suggestion1", "Berapa total revenue bulan ini?"),
    t("ai.suggestion2", "Biaya operasional apa yang paling besar bulan ini?"),
    t("ai.suggestion3", "Bagaimana laba rugi 30 hari terakhir?"),
    t("ai.suggestion4", "Unit PS mana yang paling menguntungkan?"),
  ];
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: t("ai.assistantGreeting", "Halo! Aku Business Assistant kamu. Tanya apa saja soal penjualan, rental, biaya, laba rugi, arus kas, inventori, atau aset — aku akan cek datanya langsung.") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolsCalled, setToolsCalled] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setToolsCalled([]);
    try {
      const res = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId, messages: next }) });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...next, { role: "assistant", content: t("ai.errorPrefix", "Maaf, ada error: {msg}").replace("{msg}", data.error) }]);
        return;
      }
      setToolsCalled(data.toolsCalled ?? []);
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-0 overflow-hidden">
        <div className="max-h-[55vh] overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-100"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-neutral-800 text-neutral-400">
                {toolsCalled.length > 0 ? t("ai.checkingTool", "Mengecek {tool}...").replace("{tool}", toolsCalled[toolsCalled.length - 1]) : t("ai.thinking", "Berpikir...")}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-neutral-800 p-3 flex gap-2">
          <input
            className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            placeholder={t("ai.inputPlaceholder", "Tanya tentang bisnismu...")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>{t("ai.send", "Kirim")}</Button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={loading} className="text-xs rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 disabled:opacity-50">{s}</button>
        ))}
      </div>
    </div>
  );
}

function InsightsTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [data, setData] = useState<any>(null);
  const [rec, setRec] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchJsonObject(`/api/ai/insights?outletId=${outletId}`).then(setData); }, [outletId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId }) });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      setRec(d);
    } finally {
      setGenerating(false);
    }
  };

  if (!data) return <div className="text-sm text-neutral-500">{t("ai.loading", "Memuat...")}</div>;
  const { trends, forecast, anomalies } = data;
  const generateLabel = t("ai.generateRecommendations", "Generate Rekomendasi");
  const avgLabel = t("ai.avgLabel", "avg");

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-medium">{t("ai.recommendationsTitle", "Rekomendasi AI")}</h2>
          <Button onClick={generate} disabled={generating}>{generating ? t("ai.analyzing", "Menganalisa...") : rec ? t("ai.reanalyze", "Analisa Ulang") : generateLabel}</Button>
        </div>
        {rec ? (
          <div className="text-sm whitespace-pre-wrap text-neutral-200">{rec.narrative}</div>
        ) : (
          <p className="text-xs text-neutral-500">{t("ai.recommendationsHint", "Klik \"{btn}\" untuk analisa naratif otomatis berdasarkan tren, forecast, dan anomali di bawah.").replace("{btn}", generateLabel)}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <h2 className="font-medium">{t("ai.trends30Days", "Tren 30 Hari")}</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-neutral-500">{t("ai.revenueLabel", "Revenue")}</span><span>{trends.revenueTrendDirection} (~{rupiah(trends.revenueTrendPerDay)}{t("ai.perDaySuffix", "/hari")})</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">{t("ai.expenseLabel", "Expense")}</span><span>{trends.expenseTrendDirection} (~{rupiah(trends.expenseTrendPerDay)}{t("ai.perDaySuffix", "/hari")})</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">{t("ai.last7DaysVsPrevious", "7 Hari Terakhir vs Sebelumnya")}</span><span className={trends.wowChangePercent != null && trends.wowChangePercent < 0 ? "text-red-400" : "text-emerald-400"}>{trends.wowChangePercent != null ? `${trends.wowChangePercent > 0 ? "+" : ""}${trends.wowChangePercent}%` : "-"}</span></div>
          </div>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-medium">{t("ai.forecastTitle", "Forecast Revenue 7 Hari ke Depan")}</h2>
          <div className="text-lg font-semibold">{rupiah(forecast.forecastTotal)}</div>
          <div className="text-xs text-neutral-500">{t("ai.forecastBasis", "Berdasarkan rata-rata harian historis {avg} (tren linear {days} hari terakhir)").replace("{avg}", rupiah(forecast.historicalDailyAverage)).replace("{days}", String(forecast.basedOnDays))}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-2">{t("ai.costAnomaliesTitle", "Anomali Biaya")}</h2>
          {anomalies.categoryAnomalies.length === 0 ? (
            <div className="text-sm text-neutral-500">{t("ai.noCostAnomalies", "Tidak ada biaya tidak wajar terdeteksi.")}</div>
          ) : (
            <div className="space-y-1 text-sm">
              {anomalies.categoryAnomalies.map((a: any) => (
                <div key={a.expenseId} className="flex justify-between">
                  <span>{a.category}{a.description ? ` — ${a.description}` : ""}</span>
                  <span className="text-amber-400">{rupiah(a.amount)} ({avgLabel} {rupiah(a.categoryAverage)})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-medium mb-2">{t("ai.revenueAnomaliesTitle", "Anomali Revenue Harian")}</h2>
          {anomalies.revenueAnomalies.length === 0 ? (
            <div className="text-sm text-neutral-500">{t("ai.noRevenueAnomalies", "Tidak ada hari dengan revenue tidak wajar.")}</div>
          ) : (
            <div className="space-y-1 text-sm">
              {anomalies.revenueAnomalies.map((a: any) => (
                <div key={a.date} className="flex justify-between">
                  <span>{a.date}</span>
                  <span className={a.amount < a.average ? "text-red-400" : "text-emerald-400"}>{rupiah(a.amount)} ({avgLabel} {rupiah(a.average)})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
