"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";
const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const tgl = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");

const KEPUTUSAN: { key: "dismissed" | "warning" | "suspended"; label: string; cls: string }[] = [
  { key: "dismissed", label: "Tidak terbukti", cls: "" },
  { key: "warning", label: "Terbukti — peringatan", cls: "text-amber-300" },
  { key: "suspended", label: "Terbukti — tangguhkan", cls: "text-red-400" },
];

function Foto({ urls }: { urls: string[] | null | undefined }) {
  if (!urls?.length) return <span className="text-[11px] text-neutral-600">tidak ada</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="h-16 w-16 rounded border border-neutral-700 object-cover" />
        </a>
      ))}
    </div>
  );
}

function Profil({ p }: { p: any }) {
  if (!p) return null;
  return (
    <div className="text-[11px] text-neutral-400">
      {p.label} · {p.ageDays} hari · {p.completedDeals} transaksi · rating {p.avgRating ?? "—"} ({p.ratingCount}) · aduan terbukti {p.provenDisputes} · aduan terbuka {p.openDisputesAgainst}
    </div>
  );
}

/**
 * Sengketa Marketplace Antar-Outlet — diputuskan MANUAL (keputusan pemilik, 2026-09-24). Tampilkan
 * semua yang dibutuhkan untuk menimbang dengan adil di satu layar: kronologi & bukti kedua pihak,
 * rekening yang terkunci di kesepakatan, bukti bayar & serah-terima yang diunggah di aplikasi, dan
 * profil kepercayaan kedua outlet. Alasan keputusan wajib — kedua outlet membacanya.
 */
export default function PlatformMarketplaceDisputesPage() {
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [data, setData] = useState<{ aduan: any[]; penangguhan: any[] } | null>(null);
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    fetch(`/api/platform-admin/marketplace-disputes?status=${status}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? { aduan: [], penangguhan: [] } : d));
  useEffect(() => { load(); }, [status]);

  const putuskan = async (id: string, resolution: string) => {
    const note = (catatan[id] ?? "").trim();
    if (note.length < 10) return alert("Tuliskan alasan keputusan (minimal 10 karakter). Alasan ini dibaca kedua outlet.");
    const label = KEPUTUSAN.find((k) => k.key === resolution)?.label;
    if (!confirm(`Putuskan: ${label}?${resolution === "suspended" ? "\n\nAkses Marketplace outlet terlapor akan DITANGGUHKAN dan barangnya hilang dari etalase." : ""}`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/platform-admin/marketplace-disputes/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolution, note }) });
      const d = await res.json();
      if (!res.ok) return alert(d.error);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const cabut = async (outletId: string, name: string) => {
    const note = prompt(`Alasan mencabut penangguhan ${name}?`);
    if (!note) return;
    const res = await fetch(`/api/platform-admin/marketplace-suspensions/${outletId}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    const d = await res.json();
    if (!res.ok) return alert(d.error);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sengketa Marketplace</h1>
        <p className="text-sm text-neutral-500">
          Aduan antar-outlet atas kesepakatan jual-beli. NEXBILL tidak memegang dana — sanksinya berupa peringatan resmi (tercatat di profil) atau penangguhan akses Marketplace.
        </p>
      </div>

      {data && data.penangguhan.length > 0 && (
        <Card>
          <h2 className="font-medium">Outlet yang sedang ditangguhkan</h2>
          <div className="mt-2 space-y-2">
            {data.penangguhan.map((s: any) => (
              <div key={s.outletId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{s.name ?? s.outletId}</div>
                  <div className="text-xs text-neutral-500">Sejak {tgl(s.at)} · peringatan {s.warnings} · {s.reason}</div>
                </div>
                <Button variant="ghost" className="text-xs" onClick={() => cabut(s.outletId, s.name ?? "outlet ini")}>Cabut Penangguhan</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-1 border-b border-neutral-800">
        {(["open", "resolved", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 text-sm ${status === s ? "border-b-2 border-amber-400 text-amber-300" : "text-neutral-500 hover:text-neutral-300"}`}>
            {s === "open" ? "Menunggu keputusan" : s === "resolved" ? "Sudah diputuskan" : "Semua"}
          </button>
        ))}
      </div>

      {!data ? (
        <p className="text-sm text-neutral-500">Memuat...</p>
      ) : data.aduan.length === 0 ? (
        <Card><p className="text-sm text-neutral-500">Tidak ada aduan.</p></Card>
      ) : (
        data.aduan.map((a: any) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-amber-300">{a.deal?.dealNumber}</span>
                  <span className="font-medium">{a.categoryLabel}</span>
                  <span className="text-xs text-neutral-500">diajukan {tgl(a.createdAt)}</span>
                </div>
                <div className="text-xs text-neutral-400">
                  {a.deal?.title} · {a.deal ? rupiah(a.deal.agreedPrice * a.deal.qty) : ""} · status kesepakatan: {a.deal?.status}
                </div>
              </div>
              {a.status === "resolved" && <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-sky-300">{a.resolutionLabel} · {tgl(a.resolvedAt)}</span>}
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">Pelapor</div>
                <div className="font-medium">{a.reporterName} <span className="text-xs text-neutral-500">({a.deal && a.reporterOutletId === a.deal.sellerOutletId ? "penjual" : "pembeli"})</span></div>
                <Profil p={a.reporterProfile} />
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{a.description}</p>
                <div className="mt-2"><Foto urls={a.evidenceUrls} /></div>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">Terlapor</div>
                <div className="font-medium">{a.reportedName} <span className="text-xs text-neutral-500">({a.deal && a.reportedOutletId === a.deal.sellerOutletId ? "penjual" : "pembeli"})</span></div>
                <Profil p={a.reportedProfile} />
                {a.respondentStatement ? (
                  <>
                    <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{a.respondentStatement}</p>
                    <div className="text-[11px] text-neutral-500">ditanggapi {tgl(a.respondentAt)}</div>
                    <div className="mt-2"><Foto urls={a.respondentEvidenceUrls} /></div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-neutral-500">Belum memberi tanggapan.</p>
                )}
              </div>
            </div>

            {a.deal && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Rekening terkunci di kesepakatan</div>
                  {a.deal.payoutSnapshot ? (
                    <div className="mt-1">{a.deal.payoutSnapshot.bankName} · <span className="font-mono">{a.deal.payoutSnapshot.accountNumber}</span> · a.n. {a.deal.payoutSnapshot.holder}</div>
                  ) : (
                    <div className="mt-1 text-neutral-600">tidak ada (kesepakatan sebelum fitur ini)</div>
                  )}
                </div>
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Bukti bayar pembeli · {tgl(a.deal.buyerPaymentProofAt)}</div>
                  <div className="mt-1"><Foto urls={a.deal.buyerPaymentProofUrl ? [a.deal.buyerPaymentProofUrl] : []} /></div>
                </div>
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Bukti serah-terima penjual · {tgl(a.deal.sellerHandoverProofAt)}</div>
                  <div className="mt-1"><Foto urls={a.deal.sellerHandoverProofUrl ? [a.deal.sellerHandoverProofUrl] : []} /></div>
                </div>
              </div>
            )}

            {a.status === "open" ? (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Alasan keputusan — dibaca kedua outlet (mis. bukti transfer cocok dengan rekening terkunci, penjual tidak dapat menunjukkan bukti serah-terima)."
                  value={catatan[a.id] ?? ""}
                  onChange={(e) => setCatatan({ ...catatan, [a.id]: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  {KEPUTUSAN.map((k) => (
                    <Button key={k.key} variant={k.key === "dismissed" ? "ghost" : undefined} className={`text-xs ${k.cls}`} disabled={busy === a.id} onClick={() => putuskan(a.id, k.key)}>
                      {k.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500">
                  Sanksi dijatuhkan ke pihak TERLAPOR. Bila bukti menunjukkan pelapor yang curang (aduan palsu), putuskan &quot;Tidak terbukti&quot; lalu minta pihak terlapor membuat aduan balik.
                </p>
              </div>
            ) : (
              a.adminNote && <p className="mt-3 whitespace-pre-line rounded-lg bg-black/30 px-3 py-2 text-sm text-neutral-300">{a.adminNote}</p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
