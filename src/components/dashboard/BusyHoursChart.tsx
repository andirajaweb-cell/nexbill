"use client";

// Extracted out of src/app/dashboard/page.tsx so the owner dashboard can `next/dynamic({ssr:
// false})` it — recharts pulls in a meaningful chunk of client JS that only this one card needs,
// so lazy-loading it keeps the initial bundle for the rest of the (chart-free) dashboard smaller.
// Default export is required by next/dynamic's import() form.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export interface BusyHoursDatum {
  jam: string;
  /** Rata-rata transaksi per hari (nilai batang). */
  rata: number;
  /** Total transaksi 30 hari (ditampilkan di tooltip). */
  transaksi: number;
  /** Termasuk jam operasional (lihat lib/dashboard/busy-hours.ts) — di luar itu diredupkan. */
  operasional: boolean;
  sorot: "ramai" | "sepi" | null;
}

interface Labels {
  avg: string;
  total: string;
  outside: string;
  busy: string;
  quiet: string;
}

const COLOR_BUSY = "#34d399"; // emerald — sama dengan teks "Jam Ramai"
const COLOR_QUIET = "#fbbf24"; // amber — sama dengan teks "Jam Sepi"
const COLOR_OUTSIDE = "rgba(148,163,184,0.25)";

function TooltipBox({ active, payload, labels }: { active?: boolean; payload?: { payload: BusyHoursDatum }[]; labels: Labels }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#0d1326", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, fontSize: 12, padding: "6px 10px", color: "#e2e8f0" }}>
      <div style={{ fontWeight: 600 }}>
        {d.jam}
        {d.sorot === "ramai" && <span style={{ color: COLOR_BUSY }}> · {labels.busy.replace(/:$/, "")}</span>}
        {d.sorot === "sepi" && <span style={{ color: COLOR_QUIET }}> · {labels.quiet.replace(/:$/, "")}</span>}
      </div>
      <div>
        {labels.avg}: <b>{d.rata.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</b>
      </div>
      <div style={{ color: "#94a3b8" }}>
        {labels.total}: {d.transaksi}
      </div>
      {!d.operasional && d.transaksi > 0 && <div style={{ color: "#94a3b8", marginTop: 2 }}>{labels.outside}</div>}
    </div>
  );
}

export default function BusyHoursChart({ data, labels }: { data: BusyHoursDatum[]; labels: Labels }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="jam" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} width={28} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<TooltipBox labels={labels} />} />
          <Bar dataKey="rata" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.jam}
                fill={d.sorot === "ramai" ? COLOR_BUSY : d.sorot === "sepi" ? COLOR_QUIET : d.operasional ? "url(#ownerBarGradient)" : COLOR_OUTSIDE}
              />
            ))}
          </Bar>
          <defs>
            <linearGradient id="ownerBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_BUSY }} />{labels.busy.replace(/:$/, "")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_QUIET }} />{labels.quiet.replace(/:$/, "")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_OUTSIDE }} />{labels.outside}</span>
      </div>
    </div>
  );
}
