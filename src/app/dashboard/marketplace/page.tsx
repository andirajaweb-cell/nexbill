"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";
import {
  computeUjrah,
  bersihUntukPenjual,
  bolehPindahStatus,
  bolehDilakukanOleh,
  KATEGORI_LABEL,
  KONDISI_LABEL,
  STATUS_DEAL_LABEL,
  UJRAH_CONFIG_DEFAULT,
  UJRAH_AKTIF,
  ujrahConfigBerlaku,
  type DealStatus,
  type PeranDeal,
} from "@/lib/marketplace/ujrah";
import { MAX_FOTO_BARANG } from "@/lib/marketplace/photos";
import { cariKontakDalamTeks, linkWhatsApp, ALASAN_TARIK, type AlasanTarik } from "@/lib/marketplace/anti-bypass";
import { unggahFotoMarketplace } from "@/lib/marketplace/upload-client";
import { AMBANG } from "@/lib/marketplace/trust";
import { BadgeKepercayaan, ModalProfilOutlet, TipsTransaksiAman, KeamananTab, PanelKeamananDeal, DaftarAduanSaya } from "./trust-ui";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["Etalase", "Barang Saya", "Kesepakatan", "Keamanan & Rekening"] as const;
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
 * Peringatan langsung di bawah isian bila teksnya berisi kontak. Server tetap menolak (anti-bypass.ts)
 * — ini hanya supaya pengguna tahu sebelum menekan tombol, bukan setelah semua isian terisi.
 */
function PeringatanKontak({ teks }: { teks: string }) {
  const jenis = cariKontakDalamTeks(teks);
  if (!jenis) return null;
  return (
    <p className="mt-1 text-[11px] text-amber-400">
      Terdeteksi {jenis}. Hapus dulu — nomor HP dibuka otomatis setelah penawaran diterima, jadi tidak perlu ditulis di sini.
    </p>
  );
}

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
  const [trust, setTrust] = useState<any>(null);
  const muatTrust = () => fetch("/api/marketplace/trust").then((r) => (r.ok ? r.json() : null)).then(setTrust).catch(() => setTrust(null));
  useEffect(() => { muatTrust(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">Marketplace Antar-Outlet</h1>
        <p className="text-sm text-neutral-500">
          Jual stok berlebih Anda ke outlet lain, atau beli dari mereka. Pembayaran dilakukan langsung antar-outlet — NEXBILL hanya mempertemukan dan mencatat.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        {UJRAH_AKTIF ? (
          <>
            <p className="text-xs text-neutral-300">
              <span className="font-medium text-emerald-300">Biaya jasa (ujrah):</span> {rupiah(UJRAH_CONFIG_DEFAULT.nominal)} per transaksi yang selesai, ditagihkan ke penjual — nominalnya tetap, tidak
              mengambil persentase dari harga barang. Transaksi di bawah {rupiah(UJRAH_CONFIG_DEFAULT.hargaMinimum)} bebas biaya.
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Ujrah berlaku untuk setiap barang yang terjual ke outlet yang menemukannya di Etalase NEXBILL — termasuk bila pembayaran dan serah-terimanya dilakukan di luar aplikasi.
            </p>
          </>
        ) : (
          <p className="text-xs text-neutral-300">
            <span className="font-medium text-emerald-300">Gratis:</span> Marketplace Antar-Outlet saat ini tanpa biaya jasa apa pun — penjual menerima utuh sesuai harga yang disepakati.
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-400">Nomor HP penjual dan pembeli dibuka otomatis setelah penawaran diterima.</p>
      </div>

      {trust?.suspended && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="text-sm font-medium text-red-300">Akses Marketplace outlet Anda sedang ditangguhkan</p>
          <p className="mt-0.5 text-xs text-neutral-300">
            Barang Anda tidak tampil di etalase, dan Anda tidak bisa memasang, menawar, atau menerima penawaran baru. Kesepakatan yang sudah berjalan tetap bisa diselesaikan.
            {trust.suspendedReason ? ` Alasan: ${trust.suspendedReason}` : ""} Hubungi Customer Service bila ingin mengajukan keberatan.
          </p>
        </div>
      )}
      {trust && !trust.suspended && !trust.rekening && bolehTransaksi && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-neutral-300">
          Anda belum mendaftarkan <span className="text-amber-300">rekening penerima</span>. Rekening wajib ada sebelum menerima penawaran — pembeli hanya diarahkan membayar ke rekening itu.{" "}
          <button className="text-amber-300 underline" onClick={() => setTab("Keamanan & Rekening")}>Daftarkan sekarang</button>
        </div>
      )}

      <TipsTransaksiAman />

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`shrink-0 px-3 py-2 text-sm ${tab === item ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Etalase" ? (
        <EtalaseTab bolehTransaksi={bolehTransaksi} />
      ) : tab === "Barang Saya" ? (
        <BarangSayaTab bolehTransaksi={bolehTransaksi} profilSaya={trust?.profil ?? null} />
      ) : tab === "Kesepakatan" ? (
        <KesepakatanTab bolehTransaksi={bolehTransaksi} />
      ) : (
        <KeamananTab bolehTransaksi={bolehTransaksi} data={trust} onChanged={muatTrust} />
      )}
    </div>
  );
}

/* ================= FOTO BARANG ================= */

const unggahFoto = unggahFotoMarketplace;

function PemilihFoto({ photos, onChange, onBusyChange }: { photos: string[]; onChange: (p: string[]) => void; onBusyChange: (busy: boolean) => void }) {
  const [mengunggah, setMengunggah] = useState(0);
  const sisa = MAX_FOTO_BARANG - photos.length;

  const pilih = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const daftar = Array.from(files).slice(0, sisa);
    if (files.length > sisa) showAlert(`Maksimal ${MAX_FOTO_BARANG} foto per barang — hanya ${sisa} foto pertama yang diunggah.`);

    setMengunggah(daftar.length);
    onBusyChange(true);
    let hasil = [...photos];
    const gagal: string[] = [];
    // Satu per satu, bukan paralel: koneksi outlet sering lemah, dan urutan foto harus sama dengan urutan yang dipilih.
    for (const f of daftar) {
      try {
        hasil = [...hasil, await unggahFoto(f)];
        onChange(hasil);
      } catch (err) {
        gagal.push(`${f.name}: ${err instanceof Error ? err.message : "gagal"}`);
      }
      setMengunggah((n) => n - 1);
    }
    onBusyChange(false);
    if (gagal.length) showAlert(`Sebagian foto gagal diunggah:\n${gagal.join("\n")}`);
  };

  const hapus = (i: number) => onChange(photos.filter((_, idx) => idx !== i));
  const jadikanUtama = (i: number) => onChange([photos[i], ...photos.filter((_, idx) => idx !== i)]);

  return (
    <div>
      <label className={labelKecil}>Foto Barang ({photos.length}/{MAX_FOTO_BARANG})</label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-medium text-black">Utama</span>
            ) : (
              <button type="button" disabled={mengunggah > 0} onClick={() => jadikanUtama(i)} className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-neutral-200 hover:bg-black/90">
                Jadikan utama
              </button>
            )}
            <button type="button" disabled={mengunggah > 0} onClick={() => hapus(i)} aria-label="Hapus foto" className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/70 text-sm leading-6 text-white hover:bg-red-600">
              ×
            </button>
          </div>
        ))}

        {Array.from({ length: mengunggah }).map((_, i) => (
          <div key={`up-${i}`} className="aspect-square rounded-lg border border-dashed border-neutral-700 flex items-center justify-center text-[11px] text-neutral-500">
            Mengunggah...
          </div>
        ))}

        {sisa - mengunggah > 0 && (
          <label className="aspect-square rounded-lg border border-dashed border-neutral-600 hover:border-emerald-500/60 flex flex-col items-center justify-center gap-1 cursor-pointer text-neutral-400 hover:text-emerald-300">
            <span className="text-2xl leading-none">+</span>
            <span className="text-[11px]">Tambah Foto</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={mengunggah > 0}
              onChange={(e) => { pilih(e.target.files); e.target.value = ""; }}
            />
          </label>
        )}
      </div>
      <p className="mt-1 text-[11px] text-neutral-600">
        Maksimal {MAX_FOTO_BARANG} foto (JPG/PNG/WEBP). Foto pertama jadi foto utama di etalase. Tunjukkan kondisi asli: depan, belakang, bagian yang lecet, dan kelengkapan.
      </p>
    </div>
  );
}

function GaleriFoto({ photos, judul, awal = 0, onClose }: { photos: string[]; judul: string; awal?: number; onClose: () => void }) {
  const [i, setI] = useState(awal);
  const n = photos.length;
  const geser = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") geser(1);
      else if (e.key === "ArrowLeft") geser(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between text-sm text-neutral-300">
          <span className="truncate">{judul}</span>
          <span className="shrink-0 text-xs text-neutral-500">{i + 1} / {n}</span>
        </div>
        <div className="relative flex items-center justify-center rounded-lg bg-black" style={{ minHeight: "50vh" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[i]} alt={`${judul} — foto ${i + 1}`} className="max-h-[70vh] w-auto object-contain" />
          {n > 1 && (
            <>
              <button type="button" onClick={() => geser(-1)} aria-label="Foto sebelumnya" className="absolute left-2 h-10 w-10 rounded-full bg-black/60 text-xl text-white hover:bg-black/90">‹</button>
              <button type="button" onClick={() => geser(1)} aria-label="Foto berikutnya" className="absolute right-2 h-10 w-10 rounded-full bg-black/60 text-xl text-white hover:bg-black/90">›</button>
            </>
          )}
        </div>
        {n > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {photos.map((url, idx) => (
              <button key={url} type="button" onClick={() => setI(idx)} className={`h-14 w-14 overflow-hidden rounded border ${idx === i ? "border-emerald-400" : "border-neutral-700 opacity-60 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 text-center">
          <button className="text-xs text-neutral-400 hover:text-white" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

/** Foto sampul di kartu barang; klik untuk membuka galeri. Tidak dirender sama sekali bila barang tanpa foto. */
function SampulFoto({ photos, judul, onOpen }: { photos: string[]; judul: string; onOpen: () => void }) {
  if (!photos?.length) return null;
  return (
    <button type="button" onClick={onOpen} className="relative -mx-1 mb-3 block aspect-[4/3] w-[calc(100%+0.5rem)] overflow-hidden rounded-lg bg-neutral-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[0]} alt={judul} loading="lazy" className="h-full w-full object-cover transition hover:scale-[1.02]" />
      {photos.length > 1 && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{photos.length} foto</span>
      )}
    </button>
  );
}

function EtalaseTab({ bolehTransaksi }: { bolehTransaksi: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [cari, setCari] = useState("");
  const [kategori, setKategori] = useState("all");
  const [menawar, setMenawar] = useState<any>(null);
  const [galeri, setGaleri] = useState<any>(null);
  const [lihatProfil, setLihatProfil] = useState<string | null>(null);

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
              <SampulFoto photos={it.photos} judul={it.title} onOpen={() => setGaleri(it)} />
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-xs text-neutral-500">{it.outletName}{it.city ? ` · ${it.city}` : ""}</div>
                  <BadgeKepercayaan profil={it.sellerProfile} onClick={() => setLihatProfil(it.outletId)} />
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
      {galeri && <GaleriFoto photos={galeri.photos} judul={galeri.title} onClose={() => setGaleri(null)} />}
      {lihatProfil && <ModalProfilOutlet outletId={lihatProfil} onClose={() => setLihatProfil(null)} />}
    </div>
  );
}

function FormPenawaran({ listing, onClose, onDone }: { listing: any; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState(1);
  const [harga, setHarga] = useState<number>(listing.price);
  const [catatan, setCatatan] = useState("");
  const [noHp, setNoHp] = useState("");
  const [busy, setBusy] = useState(false);

  const kirim = async () => {
    if (!noHp.trim()) return showAlert("Isi No. HP Anda — penjual akan menghubungi nomor ini setelah menerima penawaran.");
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, qty, agreedPrice: harga, buyerNote: catatan, buyerContactPhone: noHp }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await showAlert(`Penawaran ${data.dealNumber} terkirim. Setelah penjual menerimanya, nomor HP kedua pihak muncul di tab Kesepakatan.`);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          {listing.photos?.length > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.photos[0]} alt={listing.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
          )}
          <h2 className="font-medium">Ajukan Beli — {listing.title}</h2>
          <p className="mt-1 text-xs text-neutral-500">Dari {listing.outletName}. Harga pasang {rupiah(listing.price)}{listing.negotiable ? " (bisa nego)" : " (harga pas)"}.</p>
          <BadgeKepercayaan profil={listing.sellerProfile} />
          {listing.sellerProfile?.peringatan?.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-medium text-amber-300">Perhatikan sebelum menawar</p>
              <ul className="mt-1 list-disc pl-4 text-[11px] text-neutral-300 space-y-0.5">
                {listing.sellerProfile.peringatan.map((p: string) => <li key={p}>{p}</li>)}
              </ul>
              <p className="mt-1 text-[11px] text-neutral-400">Sarankan bertemu langsung (COD) atau bayar setelah barang terlihat.</p>
            </div>
          )}

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
              <PeringatanKontak teks={catatan} />
            </div>
            <div>
              <label className={labelKecil}>No. HP Anda (wajib)</label>
              <input className={isian} inputMode="tel" placeholder="0812 3456 7890" value={noHp} onChange={(e) => setNoHp(e.target.value)} />
              <p className="mt-1 text-[11px] text-neutral-600">Baru terlihat oleh penjual setelah ia menerima penawaran Anda.</p>
            </div>

            <div className="rounded-lg bg-black/30 p-2.5 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-neutral-400">Total yang Anda bayar ke penjual</span><span className="font-medium text-emerald-400">{rupiah(harga * qty)}</span></div>
              <p className="text-[11px] text-neutral-500">
                Pembayaran dilakukan langsung ke outlet penjual (transfer atau bayar di tempat). NEXBILL tidak menahan dana dan tidak menjadi perantara pembayaran.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button className="text-xs" disabled={busy || !(harga > 0) || !!cariKontakDalamTeks(catatan)} onClick={kirim}>{busy ? "Mengirim..." : "Kirim Penawaran"}</Button>
            <button className="text-xs text-neutral-400" onClick={onClose}>Batal</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

const formKosong = { title: "", description: "", category: "controller", condition: "used", qty: 1, price: 0, negotiable: true, city: "", contactPhone: "", photos: [] as string[] };

function BarangSayaTab({ bolehTransaksi, profilSaya }: { bolehTransaksi: boolean; profilSaya: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(formKosong);
  const [busy, setBusy] = useState(false);
  const [fotoSibuk, setFotoSibuk] = useState(false);
  const [galeri, setGaleri] = useState<any>(null);

  const load = () => fetchJsonArray("/api/marketplace/listings?scope=mine").then(setItems);
  useEffect(() => { load(); }, []);

  const simpan = async () => {
    if (!form.title.trim()) return showAlert("Nama barang wajib diisi.");
    if (!(form.price > 0)) return showAlert("Harga harus lebih dari 0.");
    if (!form.contactPhone.trim()) return showAlert("Isi No. HP — pembeli akan menghubungi nomor ini setelah Anda menerima penawarannya.");
    if (fotoSibuk) return showAlert("Tunggu sampai semua foto selesai diunggah.");
    if (form.photos.length === 0 && !(await showConfirm("Pasang barang tanpa foto? Barang dengan foto jauh lebih dipercaya dan lebih cepat laku."))) return;
    setBusy(true);
    try {
      const { photos, ...isi } = form;
      const res = await fetch("/api/marketplace/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...isi, imageUrls: photos }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm(formKosong);
      load();
    } finally {
      setBusy(false);
    }
  };

  const [menarik, setMenarik] = useState<any>(null);

  const ujrah = computeUjrah(form.price, form.qty, ujrahConfigBerlaku());

  return (
    <div className="space-y-4">
      {bolehTransaksi && (
        <Card>
          <h2 className="font-medium mb-3">Pasang Barang</h2>
          {profilSaya?.isNew && (
            <div className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-neutral-300">
              Outlet Anda masih berstatus <span className="text-sky-300">Outlet Baru</span> di Marketplace, jadi nilai satu barang (harga × jumlah) dibatasi maksimal{" "}
              {rupiah(AMBANG.NILAI_MAKS_OUTLET_BARU)}. Batas ini terbuka otomatis setelah akun NEXBILL outlet berumur {AMBANG.HARI_OUTLET_BARU} hari —
              perlindungan bagi pembeli dari akun yang belum punya riwayat.
            </div>
          )}
          {form.price * form.qty > AMBANG.NILAI_MAKS_OUTLET_BARU && profilSaya?.isNew && (
            <p className="mb-3 text-[11px] text-amber-400">Nilai barang ini melebihi batas outlet baru — kurangi harga atau jumlahnya.</p>
          )}
          <div className="space-y-3">
            <div>
              <label className={labelKecil}>Nama Barang</label>
              <input className={isian} placeholder="Mis. Stik PS4 DualShock (bekas, masih mulus)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <PeringatanKontak teks={form.title} />
            </div>
            {/* Setter fungsional: unggahan berjalan beberapa detik, dan isian lain yang diketik selama itu tidak boleh tertimpa. */}
            <PemilihFoto photos={form.photos} onChange={(p) => setForm((f) => ({ ...f, photos: p }))} onBusyChange={setFotoSibuk} />
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
                <label className={labelKecil}>No. HP yang Bisa Dihubungi (wajib)</label>
                <input className={isian} inputMode="tel" placeholder="0812 3456 7890" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                <p className="mt-1 text-[11px] text-neutral-600">Tidak tampil di etalase — hanya dibuka ke pembeli setelah Anda menerima penawarannya.</p>
              </div>
            </div>
            <div>
              <label className={labelKecil}>Keterangan</label>
              <textarea rows={3} className={`${isian} resize-y`} placeholder="Kondisi sebenarnya, kelengkapan, alasan dijual..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <PeringatanKontak teks={form.description} />
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={form.negotiable} onChange={(e) => setForm({ ...form, negotiable: e.target.checked })} /> Harga bisa nego
            </label>

            {form.price > 0 && (
              <div className="rounded-lg bg-black/30 p-2.5 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-neutral-400">Pembeli bayar ke Anda</span><span>{rupiah(form.price * form.qty)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Biaya jasa NEXBILL{UJRAH_AKTIF ? " (ujrah)" : ""}</span><span className={ujrah === 0 ? "text-neutral-500" : ""}>{ujrah === 0 ? (UJRAH_AKTIF ? "Bebas biaya" : "Gratis") : `− ${rupiah(ujrah)}`}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-neutral-300">Bersih untuk Anda</span><span className="font-medium text-emerald-400">{rupiah(bersihUntukPenjual(form.price, form.qty, ujrahConfigBerlaku()))}</span></div>
              </div>
            )}
          </div>
          <Button className="mt-4" disabled={busy || fotoSibuk || !!cariKontakDalamTeks(form.title) || !!cariKontakDalamTeks(form.description)} onClick={simpan}>
            {busy ? "Menyimpan..." : fotoSibuk ? "Menunggu foto..." : "Pasang di Etalase"}
          </Button>
        </Card>
      )}

      {items.length === 0 ? (
        <Card><p className="text-sm text-neutral-500">Anda belum memasang barang apa pun.</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card key={it.id}>
              <SampulFoto photos={it.photos} judul={it.title} onOpen={() => setGaleri(it)} />
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
                <button className="mt-3 text-xs text-red-400" onClick={() => setMenarik(it)}>Tarik dari Etalase</button>
              )}
              {it.status === "closed" && it.closedReason && (
                <div className="mt-2 text-[11px] text-neutral-500">Alasan: {ALASAN_TARIK[it.closedReason as AlasanTarik] ?? it.closedReason}{it.closedNote ? ` — ${it.closedNote}` : ""}</div>
              )}
            </Card>
          ))}
        </div>
      )}

      {galeri && <GaleriFoto photos={galeri.photos} judul={galeri.title} onClose={() => setGaleri(null)} />}
      {menarik && <FormTarikBarang listing={menarik} onClose={() => setMenarik(null)} onDone={() => { setMenarik(null); load(); }} />}
    </div>
  );
}

/**
 * Menarik barang dari etalase — alasannya wajib (lihat closeListing di service.ts). Tidak ada
 * pilihan "terjual ke outlet NEXBILL": penjualan ke sesama outlet harus lewat Ajukan Beli, dan
 * layar ini mengatakannya terang-terangan alih-alih menyediakan jalan keluar yang tidak tercatat.
 */
function FormTarikBarang({ listing, onClose, onDone }: { listing: any; onClose: () => void; onDone: () => void }) {
  const [alasan, setAlasan] = useState<AlasanTarik | "">("");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  const kirim = async () => {
    if (!alasan) return showAlert("Pilih alasan menarik barang.");
    if (alasan === "other" && !catatan.trim()) return showAlert("Tuliskan alasannya untuk pilihan \"Lainnya\".");
    setBusy(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan, catatan }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          <h2 className="font-medium">Tarik dari Etalase — {listing.title}</h2>

          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-xs text-neutral-300">
              Laku ke <span className="text-amber-300">outlet NEXBILL</span> yang melihat barang ini di Etalase? Jangan tarik barangnya — minta outlet itu menekan{" "}
              <span className="text-amber-300">Ajukan Beli</span>, lalu terima penawarannya. Transaksinya tercatat, pendapatan Anda terbukukan otomatis, dan Anda terlindungi fitur keamanan
              Marketplace (rekening terkunci, bukti, jalur aduan){UJRAH_AKTIF ? " — ujrah tetap berlaku sesuai ketentuan Marketplace" : ""}.
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {(Object.entries(ALASAN_TARIK) as [AlasanTarik, string][]).map(([k, v]) => (
              <label key={k} className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="radio" name="alasan-tarik" className="mt-1" checked={alasan === k} onChange={() => setAlasan(k)} />
                <span>{v}</span>
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className={labelKecil}>Keterangan {alasan === "other" ? "(wajib)" : "(opsional)"}</label>
            <textarea rows={2} className={`${isian} resize-y`} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>

          <div className="mt-4 flex gap-2">
            <Button className="text-xs" disabled={busy || !alasan} onClick={kirim}>{busy ? "Menyimpan..." : "Tarik Barang"}</Button>
            <button className="text-xs text-neutral-400" onClick={onClose}>Batal</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KesepakatanTab({ bolehTransaksi }: { bolehTransaksi: boolean }) {
  const [deals, setDeals] = useState<any[]>([]);
  const load = () => fetchJsonArray("/api/marketplace/deals").then(setDeals);
  useEffect(() => { load(); }, []);

  const pindah = async (deal: any, ke: DealStatus) => {
    let settlementMethod: string | undefined;
    if (ke === "accepted") {
      if (
        !(await showConfirm(
          `Terima penawaran ${deal.dealNumber}? Dengan menerima, Anda berjanji menyerahkan barang sesuai foto & keterangan. ` +
            `Nomor HP dan rekening penerima Anda akan terlihat oleh pembeli, dan rekeningnya DIKUNCI ke kesepakatan ini. ` +
            `Serahkan barang setelah pembayaran benar-benar masuk (cek mutasi rekening, bukan hanya foto bukti transfer).`
        ))
      )
        return;
    }
    if (ke === "completed") {
      if (!await showConfirm(`Tandai ${deal.dealNumber} selesai? Ini berarti barangnya sudah Anda terima DAN sudah Anda bayar ke penjual. Penjual akan otomatis mencatat pendapatannya. Jika ada masalah, jangan tandai selesai — gunakan "Laporkan Masalah".`)) return;
      settlementMethod = "cash";
    }
    let alasan: string | undefined;
    if (ke === "rejected" || ke === "cancelled") {
      const r = await showPrompt(ke === "rejected" ? `${deal.dealNumber} — alasan menolak penawaran?` : `${deal.dealNumber} — alasan membatalkan kesepakatan?`, {
        title: ke === "rejected" ? "Tolak penawaran" : "Batalkan kesepakatan",
        required: true,
        multiline: true,
        tone: "danger",
        placeholder: "Alasan ini terbaca oleh pihak lawan. Jangan tulis nomor HP/kontak.",
        confirmLabel: ke === "rejected" ? "Tolak" : "Batalkan",
      });
      if (r === null) return;
      alasan = r;
    }
    const res = await fetch(`/api/marketplace/deals/${deal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ke, alasan, settlementMethod }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const [lihatProfil, setLihatProfil] = useState<string | null>(null);
  const [versiAduan, setVersiAduan] = useState(0);

  return (
    <div className="space-y-3">
      <DaftarAduanSaya bolehTransaksi={bolehTransaksi} versi={versiAduan} />
      {deals.length === 0 && <Card><p className="text-sm text-neutral-500">Belum ada kesepakatan.</p></Card>}
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
              {d.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.photo} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              )}
              <div className="min-w-0 flex-1">
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
                <BadgeKepercayaan profil={d.counterpartProfile} onClick={() => setLihatProfil(peran === "seller" ? d.buyerOutletId : d.sellerOutletId)} />
                {status === "requested" && peran === "seller" && d.counterpartProfile?.peringatan?.length > 0 && (
                  <div className="mt-1 text-[11px] text-amber-400">Perhatikan: {d.counterpartProfile.peringatan.join(" ")}</div>
                )}
                {d.buyerNote && <div className="mt-1 text-xs text-neutral-400">Catatan pembeli: {d.buyerNote}</div>}
                {d.closedReason && <div className="mt-1 text-xs text-rose-400">Alasan: {d.closedReason}</div>}
                {status === "requested" && (
                  <div className="mt-1 text-[11px] text-neutral-500">Nomor HP kedua pihak dibuka setelah penjual menerima penawaran.</div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="font-medium text-emerald-400">{rupiah(d.agreedPrice * d.qty)}</div>
                {UJRAH_AKTIF && peran === "seller" && d.platformFeeAmount > 0 && (
                  <div className="text-[11px] text-neutral-500">ujrah {rupiah(d.platformFeeAmount)}{d.platformFeeStatus === "invoiced" ? " (sudah ditagih)" : ""}</div>
                )}
              </div>
            </div>

            {(() => {
              // Kontak pihak LAWAN (server hanya mengirimnya untuk kesepakatan yang diterima/selesai).
              const noLawan: string | null = peran === "seller" ? d.buyerContactPhone : d.sellerContactPhone;
              if (!noLawan) return null;
              return (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                  <span className="text-xs text-neutral-300">
                    {peran === "seller" ? "No. HP pembeli" : "No. HP penjual"}: <span className="font-mono text-emerald-300">{noLawan}</span>
                  </span>
                  <a href={linkWhatsApp(noLawan)} target="_blank" rel="noopener noreferrer" className="text-xs rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300 hover:bg-emerald-500/25">
                    Chat WhatsApp
                  </a>
                  {status === "accepted" && (
                    <span className="w-full text-[11px] text-neutral-500">
                      {peran === "buyer"
                        ? "Setelah barang diterima dan dibayar, tekan \"Barang Diterima & Sudah Dibayar\" di bawah."
                        : "Atur serah-terima dan pembayaran dengan pembeli. Pembeli yang menandai selesai setelah barang diterima."}
                    </span>
                  )}
                </div>
              );
            })()}

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

            <PanelKeamananDeal deal={d} bolehTransaksi={bolehTransaksi} onChanged={() => { load(); setVersiAduan((v) => v + 1); }} />
          </Card>
        );
      })}
      {lihatProfil && <ModalProfilOutlet outletId={lihatProfil} onClose={() => setLihatProfil(null)} />}
    </div>
  );
}
