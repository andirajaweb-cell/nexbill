"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

interface UnitRow {
  id: string;
  serialNumber: string;
  mqttTopic: string;
  batchLabel: string | null;
  status: "unclaimed" | "claimed" | "retired";
  claimedOutletId: string | null;
  claimedOutletName: string | null;
  claimedAt: string | null;
  createdAt: string;
}

/** Superuser-only inventory for the NEXBILL-branded smart plug program (private-label ESP8266
 * hardware — see the doc comment on nexbillHardwareUnits in db/schema.ts). Generates batches of
 * unclaimed serial+topic pairs ahead of a shipment: export the CSV here, hand it to whoever runs
 * the flashing station (each unit gets its own row's mqttTopic burned into its Tasmota config
 * before boxing/shipping), then print the serials as labels/QR codes on the units themselves. */
export default function PlatformHardwarePage() {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(100);
  const [batchLabel, setBatchLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<UnitRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => fetchJsonArray<UnitRow>("/api/platform-admin/hardware-units").then((r) => { setRows(r); setLoading(false); });
  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const unclaimed = rows.filter((r) => r.status === "unclaimed").length;
    const claimed = rows.filter((r) => r.status === "claimed").length;
    const retired = rows.filter((r) => r.status === "retired").length;
    return { unclaimed, claimed, retired, total: rows.length };
  }, [rows]);

  const filteredRows = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

  const generateBatch = async () => {
    if (count <= 0) return setError("Jumlah unit harus lebih dari 0.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/platform-admin/hardware-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, batchLabel: batchLabel.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setJustCreated(data.created);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = (units: UnitRow[]) => {
    const header = "serial_number,mqtt_topic,batch_label\n";
    const body = units.map((u) => `${u.serialNumber},${u.mqttTopic},${u.batchLabel ?? ""}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexbill-hardware-batch-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Hardware — Smart Plug NEXBILL</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Setiap unit di-generate dengan MQTT Topic unik SEBELUM diflash & dikirim — outlet tinggal masukkan nomor seri di halaman Kontrol
          Perangkat mereka (tombol &quot;Klaim Smart Plug NEXBILL&quot;), tanpa perlu tahu/mengisi MQTT Topic sama sekali. Generate batch di
          bawah, export CSV-nya untuk stasiun flashing, cetak nomor seri sebagai label/QR code di tiap unit sebelum dikirim.
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-medium">Generate Batch Baru</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className="text-xs text-neutral-500">Jumlah Unit</label>
            <input type="number" min={1} max={5000} className={inputCls} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-neutral-500">Label Batch (opsional)</label>
            <input className={inputCls} placeholder="mis. 2026-09-batch1" value={batchLabel} onChange={(e) => setBatchLabel(e.target.value)} />
          </div>
          <Button onClick={generateBatch} disabled={busy}>{busy ? "Membuat..." : "Generate Batch"}</Button>
        </div>
        {error && <div className="text-xs text-red-400">{error}</div>}

        {justCreated && (
          <div className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-3 space-y-2">
            <div className="text-sm text-emerald-400">{justCreated.length} unit berhasil dibuat.</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="text-xs" onClick={() => downloadCsv(justCreated)}>Download CSV Batch Ini</Button>
              <button className="text-xs text-neutral-500 hover:underline" onClick={() => setJustCreated(null)}>Tutup</button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-medium">
            Inventori ({summary.total}) — Unclaimed: <span className="text-neutral-300">{summary.unclaimed}</span> · Claimed:{" "}
            <span className="text-emerald-400">{summary.claimed}</span> · Retired: <span className="text-red-400">{summary.retired}</span>
          </h2>
          <select className={`${inputCls} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="unclaimed">Unclaimed</option>
            <option value="claimed">Claimed</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada unit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-800">
                  <th className="py-2">Serial</th><th>MQTT Topic</th><th>Batch</th><th>Status</th><th>Outlet</th><th>Diklaim</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-900">
                    <td className="py-1.5 font-mono">{r.serialNumber}</td>
                    <td className="font-mono text-neutral-400">{r.mqttTopic}</td>
                    <td>{r.batchLabel ?? "-"}</td>
                    <td>
                      <span className={r.status === "claimed" ? "text-emerald-400" : r.status === "retired" ? "text-red-400" : "text-neutral-400"}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.claimedOutletName ?? "-"}</td>
                    <td>{r.claimedAt ? new Date(r.claimedAt).toLocaleString("id-ID") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
