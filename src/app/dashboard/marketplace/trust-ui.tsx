"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { unggahFotoMarketplace } from "@/lib/marketplace/upload-client";
import { cariKontakDalamTeks } from "@/lib/marketplace/anti-bypass";
import {
  AMBANG,
  KATEGORI_ADUAN,
  TIPS_TRANSAKSI_AMAN,
  LABEL_LEVEL,
  bolehAdukan,
  bolehUlas,
  bolehUnggahBukti,
  type KategoriAduan,
  type LevelKepercayaan,
} from "@/lib/marketplace/trust";
import type { DealStatus } from "@/lib/marketplace/ujrah";

/**
 * Komponen keamanan sesama outlet untuk halaman Marketplace. Aturan & alasan di balik setiap
 * tampilan ada di lib/marketplace/trust.ts dan trust-service.ts — komponen di sini hanya
 * menampilkan apa yang sudah diputuskan server.
 */

const isian = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";
const labelKecil = "block text-[11px] uppercase tracking-wide text-neutral-500 mb-1";
const tgl = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "");

const WARNA_LEVEL: Record<LevelKepercayaan, string> = {
  trusted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  active: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  new: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  caution: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  suspended: "border-red-500/40 bg-red-500/10 text-red-300",
};

/* ================= PROFIL KEPERCAYAAN ================= */

export function BadgeKepercayaan({ profil, onClick }: { profil: any; onClick?: () => void }) {
  if (!profil) return null;
  const isi = (
    <>
      <span className="font-medium">{profil.label}</span>
      {profil.avgRating != null && <span>· ★ {profil.avgRating} ({profil.ratingCount})</span>}
      <span>· {profil.completedDeals} transaksi</span>
      <span>· {profil.ageDays} hari</span>
    </>
  );
  const cls = `mt-1 inline-flex flex-wrap items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${WARNA_LEVEL[profil.level as LevelKepercayaan] ?? WARNA_LEVEL.active}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:brightness-125`} title="Lihat profil kepercayaan">
      {isi}
    </button>
  ) : (
    <span className={cls}>{isi}</span>
  );
}

function Bintang({ n }: { n: number }) {
  return (
    <span className="text-amber-300" aria-label={`${n} bintang`}>
      {"★".repeat(n)}
      <span className="text-neutral-700">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function StatistikProfil({ profil }: { profil: any }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
      {[
        ["Bergabung", `${profil.ageDays} hari`],
        ["Transaksi selesai", String(profil.completedDeals)],
        ["Rating", profil.avgRating != null ? `★ ${profil.avgRating} (${profil.ratingCount})` : "Belum ada"],
        ["Aduan terbukti", String(profil.provenDisputes)],
      ].map(([k, v]) => (
        <div key={k} className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">{k}</div>
          <div className="text-sm font-medium">{v}</div>
        </div>
      ))}
    </div>
  );
}

export function ModalProfilOutlet({ outletId, onClose }: { outletId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/marketplace/outlets/${outletId}/profile`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErr(e.message || "Gagal memuat profil."));
  }, [outletId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card>
          {err ? (
            <p className="text-sm text-red-400">{err}</p>
          ) : !data ? (
            <p className="text-sm text-neutral-500">Memuat profil...</p>
          ) : (
            <div className="space-y-3">
              <div>
                <h2 className="font-medium">{data.name}</h2>
                <div className="text-xs text-neutral-500">{data.city ?? ""}</div>
                <BadgeKepercayaan profil={data.profil} />
              </div>
              <StatistikProfil profil={data.profil} />
              {data.profil.peringatan.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <ul className="list-disc pl-4 text-xs text-neutral-300 space-y-0.5">
                    {data.profil.peringatan.map((p: string) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <div className={labelKecil}>Ulasan dari outlet lain</div>
                {data.ulasan.length === 0 ? (
                  <p className="text-xs text-neutral-500">Belum ada ulasan.</p>
                ) : (
                  <div className="space-y-2">
                    {data.ulasan.map((u: any, i: number) => (
                      <div key={i} className="rounded-lg bg-black/30 px-3 py-2 text-xs">
                        <div className="flex justify-between gap-2"><Bintang n={u.rating} /><span className="text-neutral-500">{u.reviewer} · {tgl(u.createdAt)}</span></div>
                        {u.comment && <p className="mt-1 text-neutral-300">{u.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                Profil dihitung dari data yang tidak bisa diatur outlet itu sendiri: tanggal bergabung, transaksi yang ditandai selesai oleh pihak lawan, ulasan outlet lain, dan keputusan tim NEXBILL atas aduan.
              </p>
            </div>
          )}
          <div className="mt-4 text-right"><button className="text-xs text-neutral-400" onClick={onClose}>Tutup</button></div>
        </Card>
      </div>
    </div>
  );
}

/* ================= PENGINGAT ================= */

export function TipsTransaksiAman() {
  const [buka, setBuka] = useState(false);
  return (
    <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2">
      <button type="button" onClick={() => setBuka(!buka)} className="flex w-full items-center justify-between text-left">
        <span className="text-xs font-medium text-sky-300">Tips transaksi aman & saling menguntungkan</span>
        <span className="text-xs text-neutral-500">{buka ? "▲ Tutup" : "▼ Baca"}</span>
      </button>
      {buka ? (
        <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs text-neutral-300">
          {TIPS_TRANSAKSI_AMAN.map((t) => <li key={t}>{t}</li>)}
          <li>NEXBILL tidak menahan dana. Perlindungan Anda adalah profil lawan transaksi, rekening yang terkunci di kesepakatan, bukti di aplikasi, dan jalur aduan ke tim NEXBILL.</li>
        </ol>
      ) : (
        <p className="mt-0.5 text-[11px] text-neutral-400">Cek profil lawan · utamakan COD · transfer hanya ke rekening di kartu kesepakatan · unggah bukti di aplikasi.</p>
      )}
    </div>
  );
}

/* ================= TAB KEAMANAN & REKENING ================= */

export function KeamananTab({ bolehTransaksi, data, onChanged }: { bolehTransaksi: boolean; data: any; onChanged: () => void }) {
  const [form, setForm] = useState({ bankName: "", accountNumber: "", holder: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.rekening) setForm({ bankName: data.rekening.bankName, accountNumber: data.rekening.accountNumber, holder: data.rekening.holder });
  }, [data?.rekening?.accountNumber, data?.rekening?.bankName, data?.rekening?.holder]);

  if (!data) return <Card><p className="text-sm text-neutral-500">Memuat...</p></Card>;

  const simpan = async () => {
    const berubah = data.rekening && (data.rekening.accountNumber !== form.accountNumber.replace(/[\s.-]/g, "") || data.rekening.bankName !== form.bankName.trim());
    if (
      berubah &&
      !(await showConfirm(
        "Ganti rekening penerima? Penggantian dicatat, dan selama 7 hari pembeli melihat peringatan \"rekening baru diganti\". Kesepakatan yang sudah diterima tetap memakai rekening lama yang terkunci di kesepakatannya."
      ))
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/trust", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      await showAlert("Rekening penerima tersimpan.");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const p = data.profil;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium">Profil kepercayaan outlet Anda</h2>
        <p className="text-xs text-neutral-500">Beginilah outlet lain melihat Anda di etalase dan kesepakatan.</p>
        <div className="mt-2"><BadgeKepercayaan profil={p} /></div>
        <div className="mt-3"><StatistikProfil profil={p} /></div>
        {data.warningCount > 0 && <p className="mt-2 text-xs text-amber-400">Peringatan resmi dari tim NEXBILL: {data.warningCount}.</p>}
        <div className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-[11px] text-neutral-400 space-y-1">
          <div><span className="text-violet-300">{LABEL_LEVEL.new}</span>: akun NEXBILL berumur &lt; {AMBANG.HARI_OUTLET_BARU} hari. Nilai satu barang maks. Rp{AMBANG.NILAI_MAKS_OUTLET_BARU.toLocaleString("id-ID")}.</div>
          <div><span className="text-emerald-300">{LABEL_LEVEL.trusted}</span>: umur ≥ {AMBANG.HARI_TERPERCAYA} hari, ≥ {AMBANG.TRANSAKSI_TERPERCAYA} transaksi selesai, rating ≥ {AMBANG.RATING_TERPERCAYA}, tanpa aduan terbuka, langganan aktif.</div>
          <div><span className="text-amber-300">{LABEL_LEVEL.caution}</span>: ada aduan terbukti, ≥ 2 aduan terbuka, atau rating &lt; {AMBANG.RATING_WASPADA}.</div>
        </div>
      </Card>

      <Card>
        <h2 className="font-medium">Rekening penerima pembayaran</h2>
        <p className="text-xs text-neutral-500">
          Wajib sebelum menerima penawaran. Saat Anda menerima penawaran, rekening ini dikunci ke kesepakatan dan pembeli diarahkan membayar HANYA ke rekening itu. Gunakan rekening atas nama
          outlet atau pemilik outlet.
        </p>
        {data.rekeningBaru && <p className="mt-2 text-xs text-amber-400">Rekening ini baru diganti dalam 7 hari terakhir — pembeli melihat peringatan.</p>}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelKecil}>Bank / e-wallet</label>
            <input className={isian} placeholder="Mis. BCA" value={form.bankName} disabled={!bolehTransaksi} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          </div>
          <div>
            <label className={labelKecil}>Nomor rekening</label>
            <input className={isian} inputMode="numeric" value={form.accountNumber} disabled={!bolehTransaksi} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          </div>
          <div>
            <label className={labelKecil}>Atas nama</label>
            <input className={isian} placeholder="Sesuai buku tabungan" value={form.holder} disabled={!bolehTransaksi} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
          </div>
        </div>
        {bolehTransaksi && <Button className="mt-3 text-xs" disabled={busy} onClick={simpan}>{busy ? "Menyimpan..." : data.rekening ? "Simpan Perubahan" : "Simpan Rekening"}</Button>}
      </Card>

      <Card>
        <h2 className="font-medium">Ulasan terbaru untuk outlet Anda</h2>
        {data.ulasan.length === 0 ? (
          <p className="mt-1 text-xs text-neutral-500">Belum ada ulasan. Ulasan muncul setelah kesepakatan selesai dan pihak lawan menilainya.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {data.ulasan.map((u: any, i: number) => (
              <div key={i} className="rounded-lg bg-black/30 px-3 py-2 text-xs">
                <div className="flex justify-between gap-2"><Bintang n={u.rating} /><span className="text-neutral-500">{u.reviewer} · {tgl(u.createdAt)}</span></div>
                {u.comment && <p className="mt-1 text-neutral-300">{u.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================= UNGGAH FOTO (bukti) ================= */

function UnggahBukti({ urls, onChange, max, label }: { urls: string[]; onChange: (u: string[]) => void; max: number; label: string }) {
  const [sibuk, setSibuk] = useState(false);
  const pilih = async (files: FileList | null) => {
    if (!files?.length) return;
    setSibuk(true);
    let hasil = [...urls];
    try {
      for (const f of Array.from(files).slice(0, max - urls.length)) {
        hasil = [...hasil, await unggahFotoMarketplace(f)];
        onChange(hasil);
      }
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setSibuk(false);
    }
  };
  return (
    <div>
      <label className={labelKecil}>{label} ({urls.length}/{max})</label>
      <div className="flex flex-wrap gap-2">
        {urls.map((u) => (
          <div key={u} className="relative h-16 w-16 overflow-hidden rounded border border-neutral-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(urls.filter((x) => x !== u))} className="absolute right-0 top-0 h-5 w-5 bg-black/70 text-xs text-white">×</button>
          </div>
        ))}
        {urls.length < max && (
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-neutral-600 text-[10px] text-neutral-400 hover:border-emerald-500/60">
            {sibuk ? "..." : "+ Foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={sibuk} onChange={(e) => { pilih(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
    </div>
  );
}

function Thumb({ url, judul, waktu }: { url: string | null; judul: string; waktu?: string | null }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-lg bg-black/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{judul}</div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={judul} className="h-12 w-12 rounded object-cover" />
          <span className="text-[11px] text-neutral-400">{tgl(waktu)}</span>
        </a>
      ) : (
        <div className="mt-1 text-[11px] text-neutral-600">Belum diunggah</div>
      )}
    </div>
  );
}

/* ================= PANEL KEAMANAN PER KESEPAKATAN ================= */

export function PanelKeamananDeal({ deal, bolehTransaksi, onChanged }: { deal: any; bolehTransaksi: boolean; onChanged: () => void }) {
  const status = deal.status as DealStatus;
  const peran = deal.peran as "seller" | "buyer";
  const [aduan, setAduan] = useState(false);
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const unggahBuktiSaya = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setSibuk(true);
    try {
      const url = await unggahFotoMarketplace(f);
      const res = await fetch(`/api/marketplace/deals/${deal.id}/proof`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      onChanged();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Gagal mengunggah bukti.");
    } finally {
      setSibuk(false);
    }
  };

  const kirimUlasan = async () => {
    if (!rating) return showAlert("Pilih jumlah bintang.");
    setSibuk(true);
    try {
      const res = await fetch(`/api/marketplace/deals/${deal.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment: komentar }) });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      onChanged();
    } finally {
      setSibuk(false);
    }
  };

  const tampilBukti = bolehUnggahBukti(status);
  const tampilUlasan = bolehUlas(status) && !deal.sudahDiulas && bolehTransaksi;
  const tampilAduan = bolehAdukan(status) && bolehTransaksi;
  if (!tampilBukti && !tampilUlasan && !tampilAduan) return null;

  const salin = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      showAlert("Nomor rekening disalin.");
    } catch {
      /* clipboard tidak tersedia — nomornya tetap terlihat di layar */
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
      {/* Rekening terkunci */}
      {tampilBukti && deal.payout && (
        <div className={`rounded-lg border px-3 py-2 ${deal.rekeningBerubahSetelahDiterima ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/20 bg-emerald-500/5"}`}>
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">{peran === "buyer" ? "Bayar HANYA ke rekening ini" : "Rekening Anda yang terlihat oleh pembeli"}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{deal.payout.bankName}</span>
            <span className="font-mono text-emerald-300">{deal.payout.accountNumber}</span>
            <span className="text-neutral-400">a.n. {deal.payout.holder}</span>
            {peran === "buyer" && <button className="text-[11px] text-sky-300 underline" onClick={() => salin(deal.payout.accountNumber)}>Salin</button>}
          </div>
          {peran === "buyer" && deal.rekeningBerubahSetelahDiterima && (
            <p className="mt-1 text-xs text-red-300">
              Penjual mengganti rekeningnya SETELAH kesepakatan ini diterima. Tetap bayar ke rekening yang tertera di atas. Jika Anda diminta transfer ke rekening lain, jangan lakukan — laporkan lewat
              tombol &quot;Laporkan Masalah&quot;.
            </p>
          )}
          {peran === "buyer" && !deal.rekeningBerubahSetelahDiterima && deal.rekeningBaru && (
            <p className="mt-1 text-xs text-amber-300">Rekening penjual baru diganti dalam 7 hari terakhir. Konfirmasi dulu lewat telepon sebelum transfer.</p>
          )}
          {peran === "buyer" && <p className="mt-1 text-[11px] text-neutral-400">Nama pemilik rekening harus sesuai. Transfer ke nama lain = tidak dilindungi bukti di aplikasi.</p>}
          {peran === "seller" && <p className="mt-1 text-[11px] text-neutral-400">Serahkan barang setelah dana benar-benar masuk — cek mutasi rekening, jangan hanya percaya foto bukti transfer.</p>}
        </div>
      )}

      {/* Bukti */}
      {tampilBukti && (
        <div>
          <div className="flex flex-wrap gap-2">
            <Thumb url={deal.buyerPaymentProofUrl} judul="Bukti bayar (pembeli)" waktu={deal.buyerPaymentProofAt} />
            <Thumb url={deal.sellerHandoverProofUrl} judul="Bukti serah-terima / kirim (penjual)" waktu={deal.sellerHandoverProofAt} />
          </div>
          {bolehTransaksi && (
            <label className={`mt-2 inline-block cursor-pointer rounded-md bg-white/5 px-2.5 py-1 text-xs text-neutral-200 hover:bg-white/10 ${sibuk ? "opacity-50" : ""}`}>
              {sibuk ? "Mengunggah..." : peran === "buyer" ? (deal.buyerPaymentProofUrl ? "Ganti bukti bayar" : "Unggah bukti bayar") : deal.sellerHandoverProofUrl ? "Ganti bukti serah-terima" : "Unggah bukti serah-terima / resi"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={sibuk} onChange={(e) => { unggahBuktiSaya(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      )}

      {/* Ulasan */}
      {tampilUlasan && (
        <div className="rounded-lg bg-black/30 px-3 py-2">
          <div className="text-xs text-neutral-300">Beri ulasan untuk {peran === "buyer" ? "penjual" : "pembeli"} — membantu outlet lain bertransaksi dengan aman.</div>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`text-xl leading-none ${n <= rating ? "text-amber-300" : "text-neutral-700 hover:text-neutral-500"}`} aria-label={`${n} bintang`}>
                ★
              </button>
            ))}
          </div>
          <textarea rows={2} className={`${isian} mt-2 resize-y`} placeholder="Mis. barang sesuai foto, penjual responsif" value={komentar} onChange={(e) => setKomentar(e.target.value)} />
          {cariKontakDalamTeks(komentar) && <p className="mt-1 text-[11px] text-amber-400">Ulasan tidak boleh berisi kontak.</p>}
          <Button className="mt-2 text-xs" disabled={sibuk || !rating || !!cariKontakDalamTeks(komentar)} onClick={kirimUlasan}>Kirim Ulasan</Button>
        </div>
      )}

      {tampilAduan && (
        <div className="text-right">
          <button className="text-xs text-red-400 hover:text-red-300" onClick={() => setAduan(true)}>Laporkan Masalah</button>
        </div>
      )}
      {aduan && <FormAduan deal={deal} onClose={() => setAduan(false)} onDone={() => { setAduan(false); onChanged(); }} />}
    </div>
  );
}

/* ================= ADUAN ================= */

function FormAduan({ deal, onClose, onDone }: { deal: any; onClose: () => void; onDone: () => void }) {
  const [kategori, setKategori] = useState<KategoriAduan | "">("");
  const [cerita, setCerita] = useState("");
  const [bukti, setBukti] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const kirim = async () => {
    if (!kategori) return showAlert("Pilih jenis masalahnya.");
    if (cerita.trim().length < 20) return showAlert("Ceritakan kronologinya minimal 20 karakter.");
    if (!(await showConfirm("Kirim aduan ke tim NEXBILL? Pihak lawan akan melihat aduan ini dan bisa memberi tanggapan. Aduan palsu dapat berbalik menjadi sanksi bagi pelapor."))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, category: kategori, description: cerita, evidenceUrls: bukti }),
      });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      await showAlert("Aduan terkirim. Tim NEXBILL akan meninjau bukti kedua pihak. Status aduan terlihat di bagian atas tab Kesepakatan.");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card>
          <h2 className="font-medium">Laporkan Masalah — {deal.dealNumber}</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Tim NEXBILL membaca bukti dari kedua pihak lalu memutuskan. NEXBILL tidak memegang dana, jadi tidak bisa mengembalikan uang secara langsung — tetapi outlet yang terbukti curang
            diberi peringatan resmi atau ditangguhkan dari Marketplace, dan catatannya terlihat oleh semua outlet.
          </p>
          <div className="mt-3 space-y-2">
            {(Object.entries(KATEGORI_ADUAN) as [KategoriAduan, string][]).map(([k, v]) => (
              <label key={k} className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="radio" name="kategori-aduan" className="mt-1" checked={kategori === k} onChange={() => setKategori(k)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className={labelKecil}>Kronologi (wajib)</label>
            <textarea rows={4} className={`${isian} resize-y`} placeholder="Apa yang disepakati, apa yang sudah Anda lakukan (tanggal, nominal), apa yang terjadi kemudian." value={cerita} onChange={(e) => setCerita(e.target.value)} />
          </div>
          <div className="mt-3">
            <UnggahBukti urls={bukti} onChange={setBukti} max={5} label="Bukti (tangkapan layar chat, bukti transfer, foto barang)" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="text-xs" disabled={busy} onClick={kirim}>{busy ? "Mengirim..." : "Kirim Aduan"}</Button>
            <button className="text-xs text-neutral-400" onClick={onClose}>Batal</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FormTanggapan({ aduan, onDone }: { aduan: any; onDone: () => void }) {
  const [isi, setIsi] = useState(aduan.respondentStatement ?? "");
  const [bukti, setBukti] = useState<string[]>(aduan.respondentEvidenceUrls ?? []);
  const [busy, setBusy] = useState(false);
  const kirim = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/marketplace/disputes/${aduan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statement: isi, evidenceUrls: bukti }) });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      await showAlert("Tanggapan tersimpan. Tim NEXBILL akan membacanya bersama bukti pelapor.");
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 space-y-2">
      <textarea rows={3} className={`${isian} resize-y`} placeholder="Jelaskan versi Anda: apa yang sudah Anda lakukan, kapan, dan buktinya." value={isi} onChange={(e) => setIsi(e.target.value)} />
      <UnggahBukti urls={bukti} onChange={setBukti} max={5} label="Bukti Anda" />
      <Button className="text-xs" disabled={busy} onClick={kirim}>{busy ? "Menyimpan..." : aduan.respondentStatement ? "Perbarui Tanggapan" : "Kirim Tanggapan"}</Button>
    </div>
  );
}

function DaftarFoto({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="h-12 w-12 rounded object-cover border border-neutral-700" />
        </a>
      ))}
    </div>
  );
}

/** Aduan yang menyangkut outlet ini, ditampilkan di atas tab Kesepakatan. */
export function DaftarAduanSaya({ bolehTransaksi, versi }: { bolehTransaksi: boolean; versi: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => fetch("/api/marketplace/disputes").then((r) => (r.ok ? r.json() : [])).then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]));
  useEffect(() => { load(); }, [versi]);
  if (rows.length === 0) return null;

  return (
    <Card>
      <h2 className="font-medium">Aduan</h2>
      <div className="mt-2 space-y-3">
        {rows.map((a) => (
          <div key={a.id} className={`rounded-lg border px-3 py-2 ${a.status === "open" ? (a.peran === "reported" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5") : "border-neutral-800"}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-emerald-400">{a.dealNumber}</span>
              <span className="text-neutral-300">{a.dealTitle}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${a.status === "open" ? "bg-amber-500/20 text-amber-300" : "bg-neutral-700 text-neutral-300"}`}>{a.status === "open" ? "Menunggu keputusan" : "Sudah diputuskan"}</span>
              <span className="text-neutral-500">{a.peran === "reporter" ? "Anda melapor" : "Anda dilaporkan"} · {tgl(a.createdAt)}</span>
            </div>
            <div className="mt-1 text-sm">{a.categoryLabel}</div>
            <p className="mt-0.5 whitespace-pre-line text-xs text-neutral-400">{a.description}</p>
            <DaftarFoto urls={a.evidenceUrls} />
            {a.respondentStatement && (
              <div className="mt-2 rounded bg-black/30 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">Tanggapan pihak terlapor</div>
                <p className="whitespace-pre-line text-xs text-neutral-300">{a.respondentStatement}</p>
                <DaftarFoto urls={a.respondentEvidenceUrls} />
              </div>
            )}
            {a.status === "resolved" && (
              <div className="mt-2 rounded bg-black/30 px-2 py-1.5 text-xs">
                <span className="font-medium text-sky-300">Keputusan NEXBILL: {a.resolutionLabel}</span>
                {a.adminNote && <p className="mt-0.5 whitespace-pre-line text-neutral-300">{a.adminNote}</p>}
              </div>
            )}
            {a.status === "open" && a.peran === "reported" && bolehTransaksi && (
              <>
                <p className="mt-2 text-[11px] text-red-300">Outlet lain melaporkan kesepakatan ini. Berikan tanggapan dan bukti Anda — aduan diputuskan setelah tim NEXBILL membaca kedua sisi.</p>
                <FormTanggapan aduan={a} onDone={load} />
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
