"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

interface AgentRow {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeenAt: string | null;
}
interface OutletRow {
  outletId: string;
  outletName: string;
  agents: AgentRow[];
}
interface CreatedResult {
  outletId: string;
  name: string;
  token: string;
  wsPort: number;
  hubUrl: string | null;
}

export default function PlatformRelayAgentsPage() {
  const [rows, setRows] = useState<OutletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchJsonArray<OutletRow>("/api/platform-admin/relay-agents").then((r) => { setRows(r); setLoading(false); });
  useEffect(() => { load(); }, []);

  const startCreate = (outletId: string) => {
    setCreatingFor(outletId);
    setAgentName("");
    setError(null);
  };

  const create = async (outletId: string) => {
    if (!agentName.trim()) return setError("Nama relay agent wajib diisi.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/platform-admin/relay-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, name: agentName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setJustCreated({ outletId, name: data.name, token: data.token, wsPort: data.wsPort, hubUrl: data.hubUrl ?? null });
      setCreatingFor(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (agentId: string) => {
    if (!confirm("Hapus relay agent ini? Perangkat TV outlet yang masih memakainya harus dipindah dulu.")) return;
    const res = await fetch(`/api/platform-admin/relay-agents/${agentId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    await load();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API unavailable — the token stays visible on screen either way
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Relay Agent (Android TV via Cloud)</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Buat token Relay Agent per outlet di sini, lalu kirim token + NexbillAgent.exe ke outlet lewat support (WhatsApp/email). Outlet
          hanya perlu install aplikasinya, tempel token sekali saat diminta, dan isi IP TV di halaman Devices mereka — tidak perlu tahu
          soal hub URL, protokol, atau token setelah itu.
        </p>
      </div>

      {justCreated && (
        <Card className="border border-emerald-700 bg-emerald-950/30 space-y-2">
          <div className="text-sm font-medium text-emerald-400">
            Relay Agent &quot;{justCreated.name}&quot; dibuat untuk {rows.find((r) => r.outletId === justCreated.outletId)?.outletName ?? justCreated.outletId}. Token hanya tampil sekali — salin sekarang.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-neutral-900 rounded px-2 py-1.5 break-all">{justCreated.token}</code>
            <Button className="text-xs" onClick={() => copy(justCreated.token)}>Salin Token</Button>
          </div>
          {justCreated.hubUrl ? (
            <div className="text-xs text-neutral-400">Hub URL: <code className="text-emerald-400">{justCreated.hubUrl}</code></div>
          ) : (
            <div className="text-xs text-amber-500">
              RELAY_HUB_PUBLIC_URL belum diatur di server — set dulu di .env (lihat .env.example) sebelum agent ini dipakai dari luar jaringan lokal.
            </div>
          )}
          <div className="text-xs text-neutral-500">
            Kirim ke outlet: instal NexbillAgent.exe (folder nexbill-agent-dist), jalankan sekali, saat diminta &quot;Masukkan Agent
            Token&quot; tempel token di atas. Hub URL sudah tertanam di aplikasinya, outlet tidak perlu isi apa-apa lagi.
          </div>
          <button className="text-xs text-neutral-500 hover:underline" onClick={() => setJustCreated(null)}>Tutup</button>
        </Card>
      )}

      <Card>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada outlet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.outletId} className="rounded-lg border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm font-medium text-neutral-100">{r.outletName}</div>
                  <Button variant="secondary" className="text-xs" onClick={() => startCreate(r.outletId)}>Buat Relay Agent Baru</Button>
                </div>

                {creatingFor === r.outletId && (
                  <div className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      placeholder="Nama agent (mis. PC Kasir Outlet A)"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                    />
                    <Button className="text-xs whitespace-nowrap" onClick={() => create(r.outletId)} disabled={busy}>
                      {busy ? "Membuat..." : "Buat"}
                    </Button>
                    <Button variant="ghost" className="text-xs" onClick={() => setCreatingFor(null)}>Batal</Button>
                  </div>
                )}
                {creatingFor === r.outletId && error && <div className="text-xs text-red-400">{error}</div>}

                {r.agents.length === 0 ? (
                  <div className="text-xs text-neutral-600">Belum ada relay agent.</div>
                ) : (
                  <div className="space-y-1">
                    {r.agents.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg bg-neutral-900 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${a.status === "online" ? "bg-emerald-400" : "bg-neutral-600"}`} />
                          <span>{a.name}</span>
                          <span className="text-xs text-neutral-500">
                            {a.status === "online" ? "online" : a.lastSeenAt ? `terakhir online ${new Date(a.lastSeenAt).toLocaleString("id-ID")}` : "belum pernah terhubung"}
                          </span>
                        </div>
                        <button className="text-xs text-red-400 hover:underline" onClick={() => remove(a.id)}>Hapus</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
