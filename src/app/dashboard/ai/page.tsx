"use client";
import { useIsAndroidApp } from "@/lib/app-mode";
import "@/lib/i18n/dict-app-mode";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import "@/lib/i18n/dict-ai";
import "@/lib/i18n/dict-ai-quota";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import type { AiUsageSummary } from "@/lib/ai/quota-rules";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["assistant", "insights"] as const;
type Tab = (typeof TABS)[number];
type TFn = (key: string, fallback: string) => string;

interface AiSubscriptionGate {
  isAiLocked: boolean;
  aiAddon: { freeViaTrial: boolean; includedViaPlan: boolean; freeViaFreeForever?: boolean; active: boolean };
}

interface AiErrorBody {
  error?: string;
  code?: string;
  reason?: string;
  limit?: number;
  used?: number;
  quota?: AiUsageSummary | null;
}

/** Pesan error AI dalam bahasa dashboard (kode dari lib/ai/http.ts). */
function aiErrorText(t: TFn, d: AiErrorBody | null): string {
  if (d?.code === "ai_quota") {
    if (d.reason === "daily") return t("aiq.err.daily", "Batas pertanyaan AI hari ini untuk outlet ini sudah tercapai ({used}/{limit}). Kuota terisi lagi besok.").replace("{used}", String(d.used ?? "")).replace("{limit}", String(d.limit ?? ""));
    if (d.reason === "monthly") return t("aiq.err.monthly", "Batas AI bulan ini untuk outlet ini sudah tercapai ({used}/{limit}). Kuota terisi lagi awal bulan depan.").replace("{used}", String(d.used ?? "")).replace("{limit}", String(d.limit ?? ""));
    return t("aiq.err.tokens", "Anggaran AI bulan ini untuk outlet ini sudah habis. Kuota terisi lagi awal bulan depan.");
  }
  if (d?.code === "ai_provider") return t("aiq.err.provider", "Layanan AI sedang sibuk atau menolak permintaan. Coba lagi sebentar lagi.");
  if (d?.code === "ai_not_configured") return t("aiq.err.notConfigured", "AI belum dikonfigurasi di server. Hubungi tim NEXBILL.");
  if (d?.code === "ai_locked") return t("ai.paywallTitle", "AI Add-on Belum Aktif");
  return t("ai.errorPrefix", "Maaf, ada error: {msg}").replace("{msg}", d?.error ?? t("aiq.err.network", "koneksi terputus"));
}

/** Render ringan: **tebal** dan baris "- " sebagai poin. */
function RichText({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        const bullet = /^[-*•]\s+/.test(trimmed);
        const clean = trimmed.replace(/^#{1,4}\s+/, "").replace(/^[-*•]\s+/, "");
        return bullet ? (
          <div key={i} className="flex gap-2">
            <span className="text-emerald-400">•</span>
            <span>{inline(clean)}</span>
          </div>
        ) : (
          <div key={i}>{inline(clean)}</div>
        );
      })}
    </div>
  );
}

export default function AiPage() {
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const isAndroidApp = useIsAndroidApp();
  const [tab, setTab] = useState<Tab>("assistant");
  const [aiGate, setAiGate] = useState<AiSubscriptionGate | null>(null);
  const [quota, setQuota] = useState<AiUsageSummary | null>(null);

  useEffect(() => {
    // Superuser tidak dikunci pembayaran (assertAiAllowed) — tidak perlu cek langganan.
    if (user?.role !== "superuser") {
      fetchJsonObject<{ isAiLocked: boolean; aiAddon: AiSubscriptionGate["aiAddon"] }>("/api/subscription").then((d) => {
        if (d) setAiGate({ isAiLocked: !!d.isAiLocked, aiAddon: d.aiAddon });
      });
    }
  }, [user?.role]);

  // Hanya Owner/Superuser (assertAiRoleAllowed di server) — staf lain mendapat penjelasan.
  const roleAllowed = user?.role === "superuser" || user?.role === "owner";
  // Owner perlu hak AI: trial, paket Pro, AI Add-on, atau Akses Gratis Selamanya.
  const paymentAllowed = user?.role === "superuser" || (roleAllowed && !!aiGate && !aiGate.isAiLocked);
  const paymentGateLoading = roleAllowed && user?.role !== "superuser" && !aiGate;

  useEffect(() => {
    if (!paymentAllowed) return;
    let alive = true;
    fetchJsonObject<AiUsageSummary>("/api/ai/usage").then((d) => {
      if (alive && d) setQuota(d);
    });
    return () => {
      alive = false;
    };
  }, [paymentAllowed]);

  const tabLabels: Record<Tab, string> = {
    assistant: t("ai.tabAssistant", "Asisten Bisnis"),
    insights: t("ai.tabInsights", "Insight & Analisa"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("ai.pageTitle", "AI Business Intelligence")}</h1>
        <p className="text-sm text-neutral-500">{t("aiq.pageSubtitle", "Tanya jawab data bisnis secara natural — terhubung ke Rental PS, booking, kasir & shift, F&B & stok, NEXBILL TV, Kalender Bisnis, keuangan, PPOB, dan Rental ke Rumah — plus tren, forecast, anomali, dan rekomendasi.")}</p>
      </div>

      {user && !roleAllowed ? (
        <Card className="p-4 border-white/10">
          <div className="font-semibold text-neutral-300">{t("ai.restrictedTitle", "Fitur AI hanya untuk Owner/Superuser")}</div>
          <p className="text-sm text-neutral-500 mt-1">{t("ai.restrictedBody", "Role kamu saat ini belum bisa mengakses AI Business Assistant maupun AI Insights. Hubungi pemilik outlet kalau butuh akses.")}</p>
        </Card>
      ) : paymentGateLoading ? null : user && roleAllowed && !paymentAllowed ? (
        <Card className="p-4 border-amber-500/30 space-y-2">
          <div className="font-semibold text-amber-300">{t("ai.paywallTitle", "AI Add-on Belum Aktif")}</div>
          {isAndroidApp ? (
            <p className="text-sm text-neutral-500">{t("appMode.aiNote", "AI Business Intelligence termasuk paket Pro atau AI Add-on. Paket dikelola melalui akun NEXBILL Anda.")}</p>
          ) : (
            <>
              <p className="text-sm text-neutral-500">
                {t("ai.paywallBody", "AI Business Intelligence gratis selama masa percobaan, termasuk di paket Pro dan Akses Gratis Selamanya. Untuk paket Starter, aktifkan AI Add-on di halaman Langganan.")}
              </p>
              <Link href="/dashboard/billing">
                <Button className="mt-1">{t("ai.paywallCta", "Aktifkan AI Add-on")}</Button>
              </Link>
            </>
          )}
        </Card>
      ) : (
        <>
          {quota && <QuotaMeter quota={quota} />}
          <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
            {TABS.map((tabKey) => (
              <button key={tabKey} onClick={() => setTab(tabKey)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tabKey ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
                {tabLabels[tabKey]}
              </button>
            ))}
          </div>
          {tab === "assistant" ? <AssistantTab onQuota={setQuota} /> : <InsightsTab onQuota={setQuota} />}
        </>
      )}
    </div>
  );
}

function QuotaMeter({ quota }: { quota: AiUsageSummary }) {
  const { t } = useDashboardLang();
  const pct = quota.tokens.pct;
  const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";
  const tierLabel: Record<string, string> = {
    paid: t("aiq.tier.paid", "Paket berbayar"),
    trial: t("aiq.tier.trial", "Masa percobaan"),
    free_forever: t("aiq.tier.freeForever", "Akses Gratis Selamanya"),
    internal: t("aiq.tier.internal", "Akun internal"),
  };
  return (
    <Card className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-neutral-300">
          {t("aiq.title", "Kuota AI outlet")} · <span className="text-neutral-500">{tierLabel[quota.tier] ?? quota.tier}</span>
        </span>
        <span className="text-neutral-400">
          {t("aiq.questions", "Pertanyaan: {d}/{dl} hari ini · {m}/{ml} bulan ini")
            .replace("{d}", String(quota.assistant.day))
            .replace("{dl}", String(quota.assistant.dayLimit))
            .replace("{m}", String(quota.assistant.month))
            .replace("{ml}", String(quota.assistant.monthLimit))}
          {" · "}
          {t("aiq.recos", "Rekomendasi: {d}/{dl} hari ini").replace("{d}", String(quota.recommendations.day)).replace("{dl}", String(quota.recommendations.dayLimit))}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden" title={t("aiq.budget", "Anggaran AI bulan ini terpakai {pct}%").replace("{pct}", String(pct))}>
        <div className={`h-full ${bar}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="text-[11px] text-neutral-500">{t("aiq.budget", "Anggaran AI bulan ini terpakai {pct}%").replace("{pct}", String(pct))} — {t("aiq.fairUse", "batas wajar per outlet supaya layanan AI tetap cepat untuk semua merchant; terisi lagi tiap hari/awal bulan.")}</p>
    </Card>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string; tools?: string[] };

function toolLabel(t: TFn, name: string): string {
  const map: Record<string, [string, string]> = {
    get_today_snapshot: ["aiq.tool.today", "kondisi outlet saat ini"],
    get_sales_report: ["aiq.tool.sales", "penjualan"],
    get_rental_report: ["aiq.tool.rental", "rental per unit"],
    get_inventory_report: ["aiq.tool.inventory", "F&B & stok"],
    get_customer_report: ["aiq.tool.customers", "pelanggan"],
    get_bookings: ["aiq.tool.bookings", "booking"],
    get_business_calendar: ["aiq.tool.calendar", "Kalender Bisnis"],
    get_shift_review: ["aiq.tool.shifts", "shift kasir"],
    get_cashier_performance: ["aiq.tool.cashiers", "performa kasir"],
    get_nexbill_tv_status: ["aiq.tool.tv", "NEXBILL TV"],
    get_promos: ["aiq.tool.promos", "promo"],
    get_expense_report: ["aiq.tool.expenses", "biaya"],
    get_expense_dashboard: ["aiq.tool.expenses", "biaya"],
    get_profit_loss: ["aiq.tool.pl", "laba rugi"],
    get_financial_health: ["aiq.tool.health", "kesehatan keuangan"],
    get_balance_sheet: ["aiq.tool.balance", "neraca"],
    get_cash_flow: ["aiq.tool.cashflow", "arus kas"],
    get_fixed_assets_summary: ["aiq.tool.assets", "aset"],
    get_ppob_summary: ["aiq.tool.ppob", "PPOB"],
    get_home_rental_summary: ["aiq.tool.homeRental", "Rental ke Rumah"],
  };
  const e = map[name];
  return e ? t(e[0], e[1]) : name;
}

function AssistantTab({ onQuota }: { onQuota: (q: AiUsageSummary) => void }) {
  const { t, lang } = useDashboardLang();
  const SUGGESTIONS = [
    t("aiq.suggest.now", "Bagaimana kondisi outlet sekarang?"),
    t("aiq.suggest.plan", "Buat rencana promo & stok 7 hari ke depan dari Kalender Bisnis dan booking."),
    t("ai.suggestion1", "Berapa total revenue bulan ini?"),
    t("ai.suggestion4", "Unit PS mana yang paling menguntungkan?"),
    t("aiq.suggest.shift", "Shift mana yang selisih kasnya paling besar bulan ini?"),
    t("aiq.suggest.stock", "Produk F&B apa yang stoknya menipis dan paling laku?"),
    t("aiq.suggest.tv", "Apakah semua NEXBILL TV online?"),
    t("ai.suggestion3", "Bagaimana laba rugi 30 hari terakhir?"),
  ];
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: t("aiq.greeting", "Halo! Aku Business Assistant kamu. Tanya apa saja — penjualan, rental & booking, shift kasir, stok F&B, NEXBILL TV, Kalender Bisnis (cuaca, libur, ujian, jadwal bola), sampai laba rugi. Aku cek datanya langsung.") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim().slice(0, 1000);
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      // Sapaan pertama tidak dikirim; server tetap merapikan & memotong riwayat.
      const history = next.slice(1).slice(-10).map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, lang }) });
      const data = (await res.json().catch(() => null)) as (AiErrorBody & { reply?: string; toolsCalled?: string[] }) | null;
      if (data?.quota) onQuota(data.quota);
      if (!res.ok || !data?.reply) {
        setMessages([...next, { role: "assistant", content: aiErrorText(t, data) }]);
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply, tools: data.toolsCalled }]);
    } catch {
      setMessages([...next, { role: "assistant", content: aiErrorText(t, null) }]);
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
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-emerald-500 text-neutral-950 whitespace-pre-wrap" : "bg-neutral-800 text-neutral-100"}`}>
                {m.role === "user" ? m.content : <RichText text={m.content} />}
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-2 text-[11px] text-neutral-500">
                    {t("aiq.sources", "Data dari: {list}").replace("{list}", m.tools.map((n) => toolLabel(t, n)).filter((v, idx, arr) => arr.indexOf(v) === idx).join(", "))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-neutral-800 text-neutral-400">{t("aiq.checking", "Mengecek data outlet...")}</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-neutral-800 p-3 flex gap-2">
          <input
            className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            placeholder={t("ai.inputPlaceholder", "Tanya tentang bisnismu...")}
            value={input}
            maxLength={1000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send(input)}
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            {t("ai.send", "Kirim")}
          </Button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={loading} className="text-xs rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

interface InsightsData {
  trends: { until: string | null; revenueTrend: "up" | "down" | "flat"; revenueDailyAverage: number; expenseTrend: "up" | "down" | "flat"; expenseDailyAverage: number; wowChangePercent: number | null };
  forecast: { forecastTotal: number; historicalDailyAverage: number; basedOnDays: number; weekdayPattern: boolean; forecast: { date: string; amount: number }[] };
  anomalies: {
    categoryAnomalies: { expenseId: string; category: string; description: string | null; amount: number; categoryAverage: number }[];
    revenueAnomalies: { date: string; amount: number; average: number }[];
  };
}

function InsightsTab({ onQuota }: { onQuota: (q: AiUsageSummary) => void }) {
  const { t, lang } = useDashboardLang();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rec, setRec] = useState<{ narrative: string; generatedAt: string; cached?: boolean } | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/ai/insights", { cache: "no-store" })
      .then(async (res) => {
        const d = await res.json().catch(() => null);
        if (!alive) return;
        // Dulu error membuat tab ini "Memuat..." selamanya.
        if (!res.ok || !d?.trends) setLoadError(aiErrorText(t, d));
        else {
          setLoadError(null);
          setData(d as InsightsData);
        }
      })
      .catch(() => alive && setLoadError(aiErrorText(t, null)));
    fetch(`/api/ai/recommendations?lang=${lang}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (alive && d?.recommendation) setRec(d.recommendation);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, reload]);

  const generate = useCallback(
    async (force: boolean) => {
      setGenerating(true);
      setRecError(null);
      try {
        const res = await fetch("/api/ai/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, force }) });
        const d = (await res.json().catch(() => null)) as (AiErrorBody & { narrative?: string; generatedAt?: string; cached?: boolean }) | null;
        if (d?.quota) onQuota(d.quota);
        if (!res.ok || !d?.narrative) {
          setRecError(aiErrorText(t, d));
          return;
        }
        setRec({ narrative: d.narrative, generatedAt: d.generatedAt ?? new Date().toISOString(), cached: d.cached });
      } catch {
        setRecError(aiErrorText(t, null));
      } finally {
        setGenerating(false);
      }
    },
    [lang, onQuota, t]
  );

  if (loadError)
    return (
      <Card className="p-4 space-y-2">
        <p className="text-sm text-red-300">{loadError}</p>
        <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>
          {t("aiq.retry", "Coba lagi")}
        </Button>
      </Card>
    );
  if (!data) return <div className="text-sm text-neutral-500">{t("ai.loading", "Memuat...")}</div>;
  const { trends, forecast, anomalies } = data;
  const generateLabel = t("ai.generateRecommendations", "Generate Rekomendasi");
  const avgLabel = t("ai.avgLabel", "avg");
  const dirLabel = (d: "up" | "down" | "flat") => (d === "up" ? t("aiq.trend.up", "naik") : d === "down" ? t("aiq.trend.down", "turun") : t("aiq.trend.flat", "stabil"));
  const dirClass = (d: "up" | "down" | "flat", goodWhenUp: boolean) => (d === "flat" ? "text-neutral-300" : (d === "up") === goodWhenUp ? "text-emerald-400" : "text-red-400");

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-medium">{t("ai.recommendationsTitle", "Rekomendasi AI")}</h2>
          <Button onClick={() => generate(!!rec)} disabled={generating}>
            {generating ? t("ai.analyzing", "Menganalisa...") : rec ? t("ai.reanalyze", "Analisa Ulang") : generateLabel}
          </Button>
        </div>
        {recError && <p className="text-sm text-red-300">{recError}</p>}
        {rec ? (
          <>
            <div className="text-sm text-neutral-200">
              <RichText text={rec.narrative} />
            </div>
            <p className="text-[11px] text-neutral-500">
              {t("aiq.generatedAt", "Dibuat {time}. Hasil disimpan 6 jam — membuka ulang tidak memakai kuota.").replace("{time}", new Date(rec.generatedAt).toLocaleString())}
            </p>
          </>
        ) : (
          <p className="text-xs text-neutral-500">
            {t("aiq.recommendationsHint", "Klik \"{btn}\" untuk analisa otomatis dari tren, forecast, anomali, plus Kalender Bisnis, booking, unit PS, stok F&B, shift, dan NEXBILL TV.").replace("{btn}", generateLabel)}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <h2 className="font-medium">{t("ai.trends30Days", "Tren 30 Hari")}</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">{t("ai.revenueLabel", "Revenue")}</span>
              <span className={dirClass(trends.revenueTrend, true)}>
                {dirLabel(trends.revenueTrend)} ({avgLabel} {rupiah(trends.revenueDailyAverage)}
                {t("ai.perDaySuffix", "/hari")})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{t("ai.expenseLabel", "Expense")}</span>
              <span className={dirClass(trends.expenseTrend, false)}>
                {dirLabel(trends.expenseTrend)} ({avgLabel} {rupiah(trends.expenseDailyAverage)}
                {t("ai.perDaySuffix", "/hari")})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{t("ai.last7DaysVsPrevious", "7 Hari Terakhir vs Sebelumnya")}</span>
              <span className={trends.wowChangePercent != null && trends.wowChangePercent < 0 ? "text-red-400" : "text-emerald-400"}>
                {trends.wowChangePercent != null ? `${trends.wowChangePercent > 0 ? "+" : ""}${trends.wowChangePercent}%` : "-"}
              </span>
            </div>
          </div>
          {trends.until && <p className="text-[11px] text-neutral-500">{t("aiq.until", "Data sampai {date} (hari ini belum selesai, tidak dihitung).").replace("{date}", trends.until)}</p>}
        </Card>
        <Card className="space-y-2">
          <h2 className="font-medium">{t("ai.forecastTitle", "Forecast Revenue 7 Hari ke Depan")}</h2>
          <div className="text-lg font-semibold">{rupiah(forecast.forecastTotal)}</div>
          <div className="text-xs text-neutral-500">
            {forecast.weekdayPattern
              ? t("aiq.forecastWeekday", "Tren {days} hari terakhir × pola hari dalam seminggu (rata-rata harian {avg}).").replace("{days}", String(forecast.basedOnDays)).replace("{avg}", rupiah(forecast.historicalDailyAverage))
              : t("ai.forecastBasis", "Berdasarkan rata-rata harian historis {avg} (tren linear {days} hari terakhir)").replace("{avg}", rupiah(forecast.historicalDailyAverage)).replace("{days}", String(forecast.basedOnDays))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-neutral-400">
            {forecast.forecast.map((f) => (
              <div key={f.date} className="rounded bg-neutral-800/60 px-1 py-1">
                <div>{f.date.slice(5)}</div>
                <div className="text-neutral-200">{Math.round(f.amount / 1000)}k</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-2">{t("ai.costAnomaliesTitle", "Anomali Biaya")}</h2>
          {anomalies.categoryAnomalies.length === 0 ? (
            <div className="text-sm text-neutral-500">{t("ai.noCostAnomalies", "Tidak ada biaya tidak wajar terdeteksi.")}</div>
          ) : (
            <div className="space-y-1 text-sm">
              {anomalies.categoryAnomalies.map((a) => (
                <div key={a.expenseId} className="flex justify-between gap-2">
                  <span>
                    {a.category}
                    {a.description ? ` — ${a.description}` : ""}
                  </span>
                  <span className="text-amber-400 shrink-0">
                    {rupiah(a.amount)} ({avgLabel} {rupiah(a.categoryAverage)})
                  </span>
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
              {anomalies.revenueAnomalies.map((a) => (
                <div key={a.date} className="flex justify-between">
                  <span>{a.date}</span>
                  <span className={a.amount < a.average ? "text-red-400" : "text-emerald-400"}>
                    {rupiah(a.amount)} ({avgLabel} {rupiah(a.average)})
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-neutral-500 mt-2">{t("aiq.anomalyNote", "Dibandingkan dengan hari yang sama dalam seminggu, jadi akhir pekan yang ramai tidak terbaca anomali.")}</p>
        </Card>
      </div>
    </div>
  );
}
