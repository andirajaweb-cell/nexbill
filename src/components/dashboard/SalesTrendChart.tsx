"use client";

// Extracted out of src/app/dashboard/reports/page.tsx (Penjualan tab) so it can be
// next/dynamic({ssr:false})'d — see BusyHoursChart.tsx's doc comment for the rationale.
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

export default function SalesTrendChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="90%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v: any) => rupiah(Number(v))} contentStyle={{ background: "#0d1326", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8 }} />
        <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
