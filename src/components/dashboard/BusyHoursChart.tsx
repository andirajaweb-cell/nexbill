"use client";

// Extracted out of src/app/dashboard/page.tsx so the owner dashboard can `next/dynamic({ssr:
// false})` it — recharts pulls in a meaningful chunk of client JS that only this one card needs,
// so lazy-loading it keeps the initial bundle for the rest of the (chart-free) dashboard smaller.
// Default export is required by next/dynamic's import() form.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function BusyHoursChart({ data }: { data: { jam: string; transaksi: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="jam" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0d1326", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="transaksi" fill="url(#ownerBarGradient)" radius={[3, 3, 0, 0]} />
        <defs>
          <linearGradient id="ownerBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
