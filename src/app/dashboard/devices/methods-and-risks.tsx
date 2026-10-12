"use client";
import { useState } from "react";
import { Tv, Monitor, Smartphone, Plug, WifiOff, ChevronDown, ChevronUp, Check, X, Minus, ShieldAlert, Zap, Globe, Cpu, MonitorX, PlugZap, ServerCrash, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-devices-methods";

type MethodKey = "app" | "pc" | "phone" | "plug" | "local";

/** Semua key kamus ditulis literal (bukan t(`devices.methods.${key}…`)) supaya bisa diaudit hardcoded-text.test.ts. */
interface MethodText { name: string; badge: string; strengths: string[]; remember: string[]; best: string }
const METHOD_TEXT: Record<MethodKey, MethodText> = {
  app: {
    name: "devices.methods.app.name",
    badge: "devices.methods.app.badge",
    strengths: ["devices.methods.app.s1", "devices.methods.app.s2", "devices.methods.app.s3", "devices.methods.app.s4"],
    remember: ["devices.methods.app.r1", "devices.methods.app.r2"],
    best: "devices.methods.app.best",
  },
  pc: {
    name: "devices.methods.pc.name",
    badge: "devices.methods.pc.badge",
    strengths: ["devices.methods.pc.s1", "devices.methods.pc.s2", "devices.methods.pc.s3", "devices.methods.pc.s4"],
    remember: ["devices.methods.pc.r1"],
    best: "devices.methods.pc.best",
  },
  phone: {
    name: "devices.methods.phone.name",
    badge: "devices.methods.phone.badge",
    strengths: ["devices.methods.phone.s1", "devices.methods.phone.s2"],
    remember: ["devices.methods.phone.r1"],
    best: "devices.methods.phone.best",
  },
  plug: {
    name: "devices.methods.plug.name",
    badge: "devices.methods.plug.badge",
    strengths: ["devices.methods.plug.s1", "devices.methods.plug.s2", "devices.methods.plug.s3"],
    remember: ["devices.methods.plug.r1"],
    best: "devices.methods.plug.best",
  },
  local: {
    name: "devices.methods.local.name",
    badge: "devices.methods.local.badge",
    strengths: ["devices.methods.local.s1", "devices.methods.local.s2"],
    remember: ["devices.methods.local.r1"],
    best: "devices.methods.local.best",
  },
};

const METHODS: { key: MethodKey; Icon: typeof Tv; tone: string }[] = [
  { key: "app", Icon: Tv, tone: "text-cyan-300 bg-cyan-500/15 border-cyan-400/40" },
  { key: "pc", Icon: Monitor, tone: "text-violet-300 bg-violet-500/15 border-violet-400/40" },
  { key: "phone", Icon: Smartphone, tone: "text-emerald-300 bg-emerald-500/15 border-emerald-400/40" },
  { key: "plug", Icon: Plug, tone: "text-amber-300 bg-amber-500/15 border-amber-400/40" },
  { key: "local", Icon: WifiOff, tone: "text-sky-300 bg-sky-500/15 border-sky-400/40" },
];

/** Nilai tabel perbandingan: true = ya, false = tidak, string = kunci teks khusus. */
type Cell = boolean | "partial" | "tasmotaOnly" | "screenLock";
const CELL_TEXT: Record<"partial" | "tasmotaOnly" | "screenLock", string> = {
  partial: "devices.methods.tbl.partial",
  tasmotaOnly: "devices.methods.tbl.tasmotaOnly",
  screenLock: "devices.methods.tbl.screenLock",
};
const ROW_TEXT: Record<"noExtra" | "realOff" | "offline" | "anyTv", string> = {
  noExtra: "devices.methods.tbl.noExtra",
  realOff: "devices.methods.tbl.realOff",
  offline: "devices.methods.tbl.offline",
  anyTv: "devices.methods.tbl.anyTv",
};
const TABLE: { row: "noExtra" | "realOff" | "offline" | "anyTv"; cells: Record<"app" | "pc" | "phone" | "plug", Cell> }[] = [
  { row: "noExtra", cells: { app: true, pc: false, phone: true, plug: true } },
  { row: "realOff", cells: { app: "screenLock", pc: true, phone: true, plug: true } },
  { row: "offline", cells: { app: "partial", pc: true, phone: true, plug: "tasmotaOnly" } },
  { row: "anyTv", cells: { app: false, pc: false, phone: false, plug: true } },
];

function Section({ icon, title, sub, defaultOpen, children }: { icon: React.ReactNode; title: string; sub: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="space-y-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left" aria-expanded={open}>
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-cyan-300">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">{title}</h2>
          <p className="text-xs text-neutral-500">{sub}</p>
        </div>
        {open ? <ChevronUp size={18} className="mt-1 text-neutral-400" /> : <ChevronDown size={18} className="mt-1 text-neutral-400" />}
      </button>
      {open && <div className="space-y-3 text-xs text-neutral-300">{children}</div>}
    </Card>
  );
}

/**
 * Kontrol Perangkat adalah bagian vital billing: dua kartu yang menjelaskan (1) setiap metode yang
 * dipakai NEXBILL beserta keunggulan & batasannya, dan (2) rencana darurat saat listrik padam,
 * internet putus, agent offline, TV/plug tidak merespons, atau dashboard error — supaya kasir tahu
 * langkahnya dan outlet tidak rugi. Isi teks dijaga akurat terhadap fitur yang benar-benar ada.
 */
export function DeviceMethodsAndRisks() {
  const { t, lang } = useDashboardLang();
  const printLink = (
    <a
      href={`/downloads/panduan-kontrol-perangkat.html?lang=${lang}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-100 hover:border-cyan-400/40 hover:bg-white/10"
    >
      {t("devices.risk.print", "Buka versi cetak (untuk ditempel di meja kasir)")}
    </a>
  );

  const cell = (c: Cell) => {
    if (c === true) return <Check size={16} className="mx-auto text-emerald-400" aria-label="✓" />;
    if (c === false) return <X size={16} className="mx-auto text-neutral-600" aria-label="✗" />;
    const label = t(CELL_TEXT[c]);
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-200">
        <Minus size={12} /> {label}
      </span>
    );
  };

  const risks: { key: string; Icon: typeof Zap; title: string; h: string; d: string; p: string }[] = [
    { key: "power", Icon: Zap, title: "devices.risk.power.title", h: "devices.risk.power.h", d: "devices.risk.power.d", p: "devices.risk.power.p" },
    { key: "net", Icon: Globe, title: "devices.risk.net.title", h: "devices.risk.net.h", d: "devices.risk.net.d", p: "devices.risk.net.p" },
    { key: "agent", Icon: Cpu, title: "devices.risk.agent.title", h: "devices.risk.agent.h", d: "devices.risk.agent.d", p: "devices.risk.agent.p" },
    { key: "tv", Icon: MonitorX, title: "devices.risk.tv.title", h: "devices.risk.tv.h", d: "devices.risk.tv.d", p: "devices.risk.tv.p" },
    { key: "plug", Icon: PlugZap, title: "devices.risk.plug.title", h: "devices.risk.plug.h", d: "devices.risk.plug.d", p: "devices.risk.plug.p" },
    { key: "server", Icon: ServerCrash, title: "devices.risk.server.title", h: "devices.risk.server.h", d: "devices.risk.server.d", p: "devices.risk.server.p" },
  ];

  return (
    <>
      <Section icon={<Tv size={18} />} title={t("devices.methods.title", "Metode kontrol perangkat & keunggulannya")} sub={t("devices.methods.sub", "NEXBILL menyediakan beberapa cara supaya TV mengikuti sesi kasir. Pilih yang paling cocok — boleh digabung dalam satu outlet.")} defaultOpen>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {METHODS.map(({ key, Icon, tone }) => (
            <div key={key} className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-white/[0.015] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={tone.split(" ")[0]} />
                  <span className="text-sm font-semibold text-neutral-100">{t(METHOD_TEXT[key].name)}</span>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{t(METHOD_TEXT[key].badge)}</span>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{t("devices.methods.strengths", "Keunggulan")}</div>
                <ul className="space-y-1">
                  {METHOD_TEXT[key].strengths.map((k) => (
                    <li key={k} className="flex gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{t(k)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">{t("devices.methods.remember", "Perlu diingat")}</div>
                <ul className="space-y-1 text-neutral-400">
                  {METHOD_TEXT[key].remember.map((k) => (
                    <li key={k}>{t(k)}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto rounded-lg bg-white/[0.03] px-2 py-1.5 text-neutral-400">
                <span className="font-semibold text-neutral-300">{t("devices.methods.bestFor", "Cocok untuk")}: </span>
                {t(METHOD_TEXT[key].best)}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-neutral-800">
            <thead>
              <tr className="bg-white/[0.04] text-left text-[11px] text-neutral-400">
                <th className="px-2.5 py-2">{t("devices.methods.tbl.feature", "Kemampuan")}</th>
                {(["app", "pc", "phone", "plug"] as const).map((k) => (
                  <th key={k} className="px-2.5 py-2 text-center">{t(METHOD_TEXT[k].name)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE.map(({ row, cells }) => (
                <tr key={row} className="border-t border-neutral-800">
                  <td className="border-t border-neutral-800 px-2.5 py-2 text-neutral-300">{t(ROW_TEXT[row])}</td>
                  {(["app", "pc", "phone", "plug"] as const).map((k) => (
                    <td key={k} className="border-t border-neutral-800 px-2.5 py-2 text-center">{cell(cells[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={<ShieldAlert size={18} />} title={t("devices.risk.title", "Rencana darurat kontrol perangkat")} sub={t("devices.risk.sub", "Supaya billing tetap jalan dan outlet tidak rugi saat listrik padam, internet putus, atau ada error. Cetak atau simpan halaman ini untuk kasir.")}>
        {printLink}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 font-medium text-emerald-300">
            <ClipboardCheck size={14} /> {t("devices.risk.dailyTitle", "Cek 2 menit sebelum outlet buka")}
          </div>
          <ol className="list-decimal space-y-1 pl-4">
            <li>{t("devices.risk.daily1")}</li>
            <li>{t("devices.risk.daily2")}</li>
            <li>{t("devices.risk.daily3")}</li>
          </ol>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {risks.map(({ key, Icon, title, h, d, p }) => (
            <div key={key} className="space-y-2 rounded-xl border border-neutral-800 bg-white/[0.015] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <Icon size={16} className="text-amber-300" /> {t(title)}
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t("devices.risk.happens", "Yang terjadi")}</div>
                <p className="text-neutral-400">{t(h)}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">{t("devices.risk.do", "Yang dilakukan kasir")}</div>
                <p>{t(d)}</p>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{t("devices.risk.prevent", "Pencegahan")}</div>
                <p className="text-neutral-400">{t(p)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
