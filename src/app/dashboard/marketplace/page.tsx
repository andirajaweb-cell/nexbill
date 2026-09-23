"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import {
  computeUjrah,
  bersihUntukPenjual,
  bolehPindahStatus,
  bolehDilakukanOleh,
  KATEGORI_LABEL,
  KONDISI_LABEL,
  STATUS_DEAL_LABEL,
  UJRAH_CONFIG_DEFAULT,
  type DealStatus,
  type PeranDeal,
} from "@/lib/marketplace/ujrah";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["Etalase", "Barang Saya", "Kesepakatan"] as const;
type Tab = (typeof TABS)[number];

const STATUS_BADGE: Record<DealStatus, string> = {
  requested: "pending",
  accepted: "running",
  completed: "finished",
  rejected: "failed",
  cancelled: "maintenance",
};

const isian = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";
const labelKecil = "block text-[11px] uppercase tracking-wide text-neutral-500 mb-1";

/**
 * Marketplace Antar-Outlet — outlet menjual stok berlebihnya (stik, konsol bekas, kabel, TV) ke
 * outlet lain di jaringan NEXBILL.
 *
 * Akad dan alur uangnya dijelaskan di db/schema.ts dan lib/marketplace/ujrah.ts. Yang penting
 * terlihat di layar ini, dan karena itu disebut apa adanya di beberapa tempat: NEXBILL TIDAK
 * memegang uang siapa pun. Pembeli membayar langsung ke penjual. Menyembunyikan fakta itu akan
 * membuat merchant mengira ada perlindungan escrow yang sebenarnya tidak ada — dan itu berbahaya
 * justru bagi kepercayaan yang jadi modal utama marketplace ini.
 */
export default function MarketplacePage() {
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const bolehTransaksi = hasPermission(role, "manage_marketplace");
  const [tab, setTab] = useState<Tab>("Etalase");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">Marketplace Antar-Outlet</h1>
        <p className="text-sm text-neutral-500">
          Jual stok berlebih Anda ke outlet lain, atau beli dari mereka. Pembayaran dilakukan langsung antar-outlet — NEXBILL hanya mempertemukan dan mencatat.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        <p className="text-xs text-neutral-300">
          <span className="font-medium text-emerald-300">Biaya jasa (ujrah):</span> {rupiah(UJRAH_CONFIG_DEFAULT.nominal)} per transaksi yang selesai, ditagihkan ke penjual — nominalnya tetap, tidak
          mengambil persentase dari harga barang. Transaksi di bawah {rupiah(UJRAH_CONFIG_DEFAULT.hargaMinimum)} bebas biaya.
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800">
        {TABS.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`px-3 py-2 text-sm ${tab === item ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Etalase" ? <EtalaseTab bolehTransaksi={bolehTransaksi} /> : tab === "Barang Saya" ? <BarangSayaTab bolehTransaksi={bolehTransaksi} /> : <KesepakatanTab bolehTransaksi={bolehTransaksi} />}
    </div>
  );
}

function EtalaseTab({ bolehTransaksi }: { bolehTransaksi: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [cari, setCari] = useState("");
  const [kategori, setKategori] = useState("all");
  const [menawar, setMenawar] = useState<any>(null);

  const load = () => fetchJsonArray(`/api/marketplace/listings?kategori=${kategori}&cari=${encodeURIComponent(cari)}`).then(setItems);
  useEffect(() => { load(); }, [kategori, cari]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className={isian} placeholder="Cari barang..." value={cari} onChange={(e) => setCari(e.target.value)} />
          <select className={isian} value={kategori} onChange={(e) => setKategori(e.target.value)}>
            <option value="all">Semua kategori</option>
            {Object.entries(KATEGORI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card><p className="text-sm text-neutral-500">Belum ada barang dari outlet lain. Coba lagi nanti, atau pasang barang Anda sendiri di tab Barang Saya.</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card key={it.id}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-xs text-neutral-500">{it.outletName}{it.city ? ` · ${it.city}` : ""}</div>
                </div>
                <Badge status="available">{KONDISI_LABEL[it.condition] ?? it.condition}</Badge>
              </div>
              {it.description && <p className="mt-2 text-xs text-neutral-400 whitespace-pre-line">{it.description}</p>}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-semibold text-emerald-400">{rupiah(it.price)}</div>
                  <div className="text-[11px] text-neutral-600">{it.qty > 1 ? `Tersedia ${it.qty} unit · ` : ""}{it.negotiable ? "Bisa nego" : "Harga pas"}</div>
                </div>
                {bolehTransaksi && <Button className="text-xs" onClick={() => setMenawar(it)}>Ajukan Beli</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {menawar && <FormPenawaran listing={menawar} onClose={() => setMenawar(null)} onDone={() => { setMenawar(null); load(); }} />}
    </div>
  );
}

function FormPenawaran({ listing, onClose, onDone }: { listing: any; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState(1);
  const [harga, setHarga] = useState<number>(listing.price);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  const kirim = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, qty, agreedPrice: harga, buyerNote: catatan }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await showAlert(`Penawaran ${data.dealNumber} terkirim. Penjual akan menerima atau menolaknya.`);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          <h2 className="font-medium">Ajukan Beli — {listing.title}</h2>
          <p className="mt-1 text-xs text-neutral-500">Dari {listing.outletName}. Harga pasang {rupiah(listing.price)}{listing.negotiable ? " (bisa nego)" : " (harga pas)"}.</p>

          <div className="mt-4 space-y-3">
            {listing.qty > 1 && (
              <div>
                <label className={labelKecil}>Jumlah (tersedia {listing.qty})</label>
                <input type="number" min={1} max={listing.qty} className={isian} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
            )}
            <div>
              <label className={labelKecil}>Harga yang Anda tawarkan (per unit)</label>
              <input type="number" min={0} className={isian} value={harga} disabled={!listing.negotiable} onChange={(e) => setHarga(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelKecil}>Catatan untuk penjual</label>
              <textarea rows={2} className={`${isian} resize-y`} placeholder="Mis. bisa diambil kapan? apakah masih ada kardusnya?" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>

            <div className="rounded-lg bg-black/30 p-2.5 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-neutral-400">Total yang Anda bayar ke penjual</span><span className="font-medium text-emerald-400">{rupiah(harga * qty)}</span></div>
              <p className="text-[11px] text-neutral-500">
                Pembayaran dilakukan langsung ke outlet penjual (transfer atau bayar di tempat). NEXBILL tidak menahan dana dan tidak menjadi perantara pembayaran.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button className="text-xs" disabled={busy || !(harga > 0)} onClick={kirim}>{busy ? "Mengirim..." : "Kirim Penawaran"}</Button>
            <button className="text-xs text-neutral-400" onClick={onClose}>Batal</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

const formKosong = { title: "", description: "", category: "controller", condition: "used", qty: 1, price: 0, negotiable: true, city: "", contactPhone: "" };

function BarangSayaTab({ bolehTransaksi }: { bolehTransaksi: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(formKosong);
  const [busy, setBusy] = useState(false);

  const load = () => fetchJsonArray("/api/marketplace/listings?scope=mine").then(setItems);
  useEffect(() => { load(); }, []);

  const simpan = async () => {
    if (!form.title.trim()) return showAlert("Nama barang wajib diisi.");
    if (!(form.price > 0)) return showAlert("Harga harus lebih dari 0.");
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm(formKosong);
      load();
    } finally {
      setBusy(false);
    }
  };

  const tutup = async (it: any) => {
    if (!await showConfirm(`Tarik "${it.title}" dari etalase?`)) return;
    const res = await fetch(`/api/marketplace/listings/${it.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const ujrah = computeUjrah(form.price, form.qty);

  return (
    <div className="space-y-4">
      {bolehTransaksi && (
        <Card>
          <h2 className="font-medium mb-3">Pasang Barang</h2>
          <div className="space-y-3">
            <div>
              <label className={labelKecil}>Nama Barang</label>
              <input className={isian} placeholder="Mis. Stik PS4 DualShock (bekas, masih mulus)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelKecil}>Kategori</label>
                <select className={isian} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(KATEGORI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelKecil}>Kondisi</label>
                <select className={isian} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  {Object.entries(KONDISI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelKecil}>Harga per Unit (Rp)</label>
                <input type="number" min={0} className={isian} value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelKecil}>Jumlah Unit</label>
                <input type="number" min={1} className={isian} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelKecil}>Kota</label>
                <input className={isian} placeholder="Mis. Bandung" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className={labelKecil}>No. HP yang Bisa Dihubungi</label>
                <input className={isian} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelKecil}>Keterangan</label>
              <textarea rows={3} className={`${isian} resize-y`} placeholder="Kondisi sebenarnya, kelengkapan, alasan dijual..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={form.negotiable} onChange={(e) => setForm({ ...form, negotiable: e.target.checked })} /> Harga bisa nego
            </label>

            {form.price > 0 && (
              <div className="rounded-lg bg-black/30 p-2.5 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-neutral-400">Pembeli bayar ke Anda</span><span>{rupiah(form.price * form.qty)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Biaya jasa NEXBILL (ujrah)</span><span className={ujrah === 0 ? "text-neutral-500" : ""}>{ujrah === 0 ? "Bebas biaya" : `− ${rupiah(ujrah)}`}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-neutral-300">Bersih untuk Anda</span><span className="font-medium text-emerald-400">{rupiah(bersihUntukPenjual(form.price, form.qty))}</span></div>
              </div>
            )}
          </div>
          <Button className="mt-4" disabled={busy} onClick={simpan}>{busy ? "Menyimpan..." : "Pasang di Etalase"}</Button>
        </Card>
      )}

      {items.length === 0 ? (
        <Card><p className="text-sm text-neutral-500">Anda belum memasang barang apa pun.</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card key={it.id}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-xs text-neutral-500">{KATEGORI_LABEL[it.category] ?? it.category} · {rupiah(it.price)}{it.qty > 1 ? ` · ${it.qty} unit` : ""}</div>
                </div>
                <Badge status={it.status === "active" ? "available" : it.status === "reserved" ? "pending" : it.status === "sold" ? "finished" : "maintenance"}>
                  {it.status === "active" ? "Tersedia" : it.status === "reserved" ? "Dipesan" : it.status === "sold" ? "Terjual" : "Ditarik"}
                </Badge>
              </div>
              {bolehTransaksi && it.status === "active" && (
                <button className="mt-3 text-xs text-red-400" onClick={() => tutup(it)}>Tarik dari Etalase</button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KesepakatanTab({ bolehTransaksi }: { bolehTransaksi: boolean }) {
  const [deals, setDeals] = useState<any[]>([]);
  const load = () => fetchJsonArray("/api/marketplace/deals").then(setDeals);
  useEffect(() => { load(); }, []);

  const pindah = async (deal: any, ke: DealStatus) => {
    let settlementMethod: string | undefined;
    if (ke === "completed") {
      if (!await showConfirm(`Tandai ${deal.dealNumber} selesai? Ini berarti barangnya sudah Anda terima DAN sudah Anda bayar ke penjual. Penjual akan otomatis mencatat pendapatannya.`)) return;
      settlementMethod = "cash";
    }
    let alasan: string | undefined;
    if (ke === "rejected" || ke === "cancelled") {
      const r = prompt(ke === "rejected" ? "Alasan menolak?" : "Alasan membatalkan?");
      if (r === null) return;
      alasan = r;
    }
    const res = await fetch(`/api/marketplace/deals/${deal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ke, alasan, settlementMethod }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  if (deals.length === 0) return <Card><p className="text-sm text-neutral-500">Belum ada kesepakatan.</p></Card>;

  return (
    <div className="space-y-3">
      {deals.map((d) => {
        const peran = d.peran as PeranDeal;
        const status = d.status as DealStatus;
        /*
         * Tombol yang tampil DITURUNKAN dari aturan yang sama persis dengan yang ditegakkan
         * server (ujrah.ts), bukan dari daftar yang ditulis ulang di sini. Dengan begitu tidak
         * mungkin ada tombol yang bisa ditekan tapi selalu ditolak — kesalahan yang sudah muncul
         * beberapa kali di proyek ini dan selalu terbaca pengguna sebagai "tombolnya rusak".
         */
        const aksi = (["accepted", "completed", "rejected", "cancelled"] as DealStatus[]).filter(
          (ke) => bolehPindahStatus(status, ke) && bolehDilakukanOleh(peran, ke)
        );

        return (
          <Card key={d.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-emerald-400">{d.dealNumber}</span>
                  <Badge status={STATUS_BADGE[status]}>{STATUS_DEAL_LABEL[status]}</Badge>
                  <span className="text-[11px] text-neutral-500">{peran === "seller" ? "Anda penjual" : "Anda pembeli"}</span>
                </div>
                <div className="mt-1 text-sm">{d.sellerNote}</div>
                <div className="text-xs text-neutral-500">
                  {peran === "seller" ? `Pembeli: ${d.buyerOutletName}` : `Penjual: ${d.sellerOutletName}`}
                  {d.qty > 1 ? ` · ${d.qty} unit` : ""}
                </div>
                {d.buyerNote && <div className="mt-1 text-xs text-neutral-400">Catatan pembeli: {d.buyerNote}</div>}
                {d.closedReason && <div className="mt-1 text-xs text-rose-400">Alasan: {d.closedReason}</div>}
              </div>

              <div className="text-right shrink-0">
                <div className="font-medium text-emerald-400">{rupiah(d.agreedPrice * d.qty)}</div>
                {peran === "seller" && d.platformFeeAmount > 0 && (
                  <div className="text-[11px] text-neutral-500">ujrah {rupiah(d.platformFeeAmount)}{d.platformFeeStatus === "invoiced" ? " (sudah ditagih)" : ""}</div>
                )}
              </div>
            </div>

            {peran === "buyer" && status === "completed" && (
              // Sisi pembeli sengaja tidak diposting otomatis — alasannya di lib/marketplace/service.ts.
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-xs text-neutral-300">
                  Jangan lupa catat pembelian ini di pembukuan Anda lewat menu <span className="text-amber-300">Expense</span>. Sistem tidak mencatatnya sendiri karena hanya Anda yang tahu barang ini
                  dipakai sebagai persediaan, aset tetap, atau perlengkapan — dan akunnya berbeda untuk masing-masing.
                </p>
              </div>
            )}

            {bolehTransaksi && aksi.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {aksi.map((ke) => (
                  <Button
                    key={ke}
                    variant={ke === "rejected" || ke === "cancelled" ? "ghost" : undefined}
                    className={`text-xs px-2.5 py-1 ${ke === "rejected" || ke === "cancelled" ? "text-red-400" : ""}`}
                    onClick={() => pindah(d, ke)}
                  >
                    {ke === "accepted" ? "Terima Penawaran" : ke === "completed" ? "Barang Diterima & Sudah Dibayar" : ke === "rejected" ? "Tolak" : "Batalkan"}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
