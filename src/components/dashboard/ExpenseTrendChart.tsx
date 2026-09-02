"use client";

// Extracted out of src/app/dashboard/reports/page.tsx (Beban tab) so it can be
// next/dynamic({ssr:false})'d — see BusyHoursChart.tsx's doc comment for the rationale.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

export default function ExpenseTrendChart({ data }: { data: { date: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="90%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v: any) => rupiah(Number(v))} contentStyle={{ background: "#0d1326", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 8 }} />
        <Bar dataKey="amount" fill="url(#expenseBarGradient)" radius={[3, 3, 0, 0]} />
        <defs>
          <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
