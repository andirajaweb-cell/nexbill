"use client";

// Extracted out of src/app/dashboard/rental/page.tsx (a large page) so it can be
// next/dynamic({ssr:false})'d — see BusyHoursChart.tsx for the same rationale applied to the
// owner dashboard's chart. Default export required by next/dynamic's import() form.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RentalActivityChart({
  data,
  t,
}: {
  data: { hour: number; count: number }[];
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#0d1326", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(h) => t("rental.chartHourLabel", "Jam {h}:00").replace("{h}", String(h))}
            formatter={(v: any) => [t("rental.chartTransactionsSuffix", "{v} transaksi").replace("{v}", String(v)), t("rental.chartCountLabel", "Jumlah")]}
          />
          <Bar dataKey="count" fill="url(#gmBarGradient)" radius={[4, 4, 0, 0]} />
          <defs>
            <linearGradient id="gmBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
