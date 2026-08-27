"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}
interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

/**
 * Self-contained FAQ accordion embedded at the bottom of the Billing page. Content is grounded
 * in the actual subscription/billing behavior in src/lib/subscription/{config,service}.ts — every
 * price shown is passed in as a prop (sourced from the real subscriptionPlans row / aiAddon
 * summary the page already fetched) rather than hardcoded, so it never drifts out of sync if an
 * admin edits pricing later. Only the timing constants that are NOT per-plan (trial length, grace
 * period, renewal lead time) are inlined as plain numbers — they mirror the literal constants in
 * subscription/config.ts (TRIAL_DAYS=30, RENEWAL_GRACE_DAYS=5, RENEWAL_INVOICE_LEAD_DAYS=7) and
 * should be updated here too if those ever change.
 */
export function BillingFaq({
  planName,
  planPrice,
  includedConsoles,
  extraConsolePrice,
  smartPlugPrice,
  setupServicePrice,
  aiAddonPriceMonthly,
  unlimitedEntitlement,
}: {
  planName?: string;
  planPrice?: number;
  includedConsoles?: number;
  extraConsolePrice?: number;
  smartPlugPrice?: number;
  setupServicePrice?: number;
  aiAddonPriceMonthly?: number;
  /** True for plans like NEXBILL Standard (flat Rp249.000/bulan) — unlimited consoles, branches,
   * and users, AI bundled in, no "Konsol Tambahan" line item. See subscriptionPlans.unlimitedEntitlement. */
  unlimitedEntitlement?: boolean;
}) {
  const groups: FaqGroup[] = [
    {
      title: "Umum & Masa Percobaan",
      items: [
        {
          q: "Apa itu masa percobaan (trial) 30 hari?",
          a: "Setiap outlet baru otomatis mendapat masa percobaan gratis 30 hari sejak pertama kali dibuat — tidak perlu aktivasi apa pun. Selama trial: fitur AI (Business Assistant & Insights) gratis dipakai tanpa batas, kontrol TV Android dibatasi 1 unit, dan Smart Plug (untuk TV non-Android) belum bisa dipakai sampai dibeli lewat etalase di halaman ini.",
        },
        {
          q: "Apa yang terjadi setelah 30 hari trial berakhir?",
          a: 'Status berubah menjadi "Percobaan Berakhir" dan dashboard masuk mode read-only (data tetap aman, tidak hilang) sampai kamu menyelesaikan pembayaran checkout pertama di halaman ini. Setelah semua tagihan checkout lunas, akses penuh terbuka otomatis selama 30 hari.',
        },
        {
          q: "Apakah data saya hilang kalau langganan terkunci/ditangguhkan?",
          a: "Tidak. Terkuncinya akses hanya membatasi PENGGUNAAN fitur (read-only) — seluruh data transaksi, laporan, dan pengaturan tetap tersimpan utuh dan langsung bisa diakses lagi begitu tagihan dibayar.",
        },
      ],
    },
    {
      title: "Harga, Paket & Add-on",
      items: [
        {
          q: `Berapa harga paket ${planName ?? "langganan"} saat ini?`,
          a: unlimitedEntitlement
            ? `${rupiah(planPrice ?? 249000)}/bulan, flat — sudah termasuk unlimited konsol/unit TV, unlimited cabang/outlet, unlimited user staf, dan AI Business Assistant & Insights. Tidak ada biaya tambahan per unit atau add-on terpisah.`
            : `${rupiah(planPrice ?? 249000)}/bulan, sudah termasuk kuota ${includedConsoles ?? 10} unit konsol/TV.`,
        },
        ...(unlimitedEntitlement
          ? []
          : [
              {
                q: 'Apa itu "Konsol Tambahan"?',
                a: `Kalau total unit TV/konsol di outlet lebih banyak dari kuota yang termasuk paket (${includedConsoles ?? 10} unit), setiap unit di luar kuota itu dikenai biaya tambahan ${rupiah(
                  extraConsolePrice ?? 20000
                )}/unit — otomatis dihitung dari jumlah unit rental yang sudah kamu buat di menu Kelola Unit, tidak perlu diisi manual saat checkout.`,
              },
            ]),
        {
          q: "Apa itu Smart Plug dan kenapa saya harus beli?",
          a: `TV Android bisa langsung dikontrol nyala/mati dari sistem tanpa alat tambahan. TV non-Android (Smart TV biasa/TV Analog) butuh Smart Plug (colokan pintar) supaya bisa dikontrol otomatis dari NEXBILL — harga mulai ${rupiah(
            smartPlugPrice ?? 275000
          )}/unit, tersedia beberapa varian di etalase di atas. Ini tetap barang fisik terpisah dari harga langganan, berapa pun paketnya — beda dengan kuota konsol/AI yang sudah termasuk paket.`,
        },
        {
          q: "Apa itu Jasa Setup Jarak Jauh?",
          a: `Opsional (${rupiah(
            setupServicePrice ?? 125000
          )}) — kalau kamu tidak familiar menyambungkan Smart Plug ke akun cloud-nya sendiri, vendor akan bantu setting dari jarak jauh. Kalau dicentang saat checkout, kolom kontak PIC & alamat outlet akan diminta supaya vendor bisa menghubungi.`,
        },
        {
          q: unlimitedEntitlement ? "Apakah fitur AI (Business Assistant & Insights) bayar terpisah?" : "Apa itu AI Add-on dan kenapa terpisah dari harga langganan?",
          a: unlimitedEntitlement
            ? "Tidak — di paket ini AI Business Assistant & Insights sudah termasuk dalam harga langganan flat, tanpa aktivasi atau biaya bulanan terpisah. Bisa langsung dipakai begitu langganan aktif."
            : `AI Add-on (Business Assistant & Insights) gratis dipakai selama masa percobaan 30 hari. Setelah trial berakhir, fitur ini perlu diaktifkan terpisah (${rupiah(
                aiAddonPriceMonthly ?? 149000
              )}/bulan) di luar biaya langganan reguler — karena setiap pemakaiannya punya biaya nyata ke penyedia AI, tidak seperti fitur lain yang harganya flat. Hanya akun Owner atau Superuser yang bisa mengaktifkannya.`,
        },
      ],
    },
    {
      title: "Pembayaran & Tagihan",
      items: [
        {
          q: "Metode pembayaran apa saja yang tersedia?",
          a: "Cash (konfirmasi manual oleh NEXBILL), QRIS, dan Virtual Account (BCA, BNI, Mandiri, BRI, Permata) — pilih salah satu lewat tombol pada tagihan yang belum lunas.",
        },
        {
          q: "Bagaimana proses konfirmasi pembayaran Cash?",
          a: 'Setelah klik "Cash", akan muncul konfirmasi apakah NEXBILL sudah menerima pembayaran tunai tersebut — begitu dikonfirmasi, tagihan langsung ditandai lunas.',
        },
        {
          q: 'Untuk QRIS/Virtual Account, kapan saya klik "Tandai Lunas"?',
          a: "Setelah transfer/scan pembayaran BENAR-BENAR masuk. Tombol ini muncul setelah kamu memilih metode pembayaran pada tagihan tersebut — klik hanya setelah dana diterima, supaya status langganan tidak salah aktif sebelum pembayaran nyata.",
        },
        {
          q: "Kapan akses penuh terbuka setelah bayar?",
          a: 'Begitu SEMUA tagihan dari satu checkout yang sama berstatus lunas (bukan cuma sebagian), status langganan otomatis berubah menjadi "Aktif" untuk 30 hari ke depan — tidak perlu refresh manual atau menunggu approval tambahan.',
        },
        {
          q: "Saya sudah checkout tapi mau ubah/batalkan item — bisa?",
          a: 'Sebelum klik "Checkout", isi keranjang bebas diubah/dihapus lewat tombol +/- di etalase. Setelah checkout ditekan, item sudah terkunci jadi satu tagihan — hubungi NEXBILL kalau perlu penyesuaian setelah itu.',
        },
      ],
    },
    {
      title: "Perpanjangan & Masa Tenggang",
      items: [
        {
          q: "Kapan tagihan perpanjangan bulan berikutnya dibuat?",
          a: 'Otomatis dibuat 7 hari sebelum periode langganan berakhir. Kamu juga bisa membayar lebih awal kapan saja lewat tombol "Perpanjang Sekarang" begitu tidak ada tagihan lain yang masih menunggu pembayaran.',
        },
        {
          q: 'Apa itu "Masa Tenggang"?',
          a: 'Kalau periode langganan habis dan tagihan perpanjangan belum dibayar, kamu diberi toleransi 5 hari (status "Masa Tenggang") sebelum akses dikunci penuh — akses masih tetap berjalan normal selama masa tenggang ini.',
        },
        {
          q: "Apa yang terjadi kalau tidak bayar sampai masa tenggang habis?",
          a: 'Status berubah menjadi "Ditangguhkan" (suspended) dan dashboard masuk mode read-only penuh, sama seperti trial yang berakhir — bayar tagihan perpanjangan yang tertunda untuk membuka akses lagi.',
        },
      ],
    },
    {
      title: "Multi-Outlet (Cabang)",
      items: [
        {
          q: "Apa itu Tagihan Gabungan (Billing Group)?",
          a: 'Kalau kamu punya lebih dari satu outlet/cabang di bawah akun Owner yang sama, semuanya digabung dalam SATU tagihan perpanjangan — satu kali pembayaran memperpanjang semua cabang sekaligus, ditampilkan sebagai kartu "Tagihan Gabungan" di bagian atas halaman ini.',
        },
        {
          q: "Kalau salah satu cabang statusnya beda dari cabang lain, kenapa?",
          a: "Status tiap cabang (trial/aktif/tenggang) dihitung sendiri-sendiri sampai bergabung dalam satu tagihan perpanjangan berikutnya — jadi wajar kalau cabang yang baru dibuat masih trial sementara cabang lama sudah aktif, sampai keduanya sinkron di siklus tagihan gabungan berikutnya.",
        },
      ],
    },
    {
      title: "Lainnya",
      items: [
        {
          q: "Siapa yang bisa mengelola pembayaran/checkout di halaman ini?",
          a: 'Hanya akun dengan izin "manage_settings" (biasanya Owner) yang bisa checkout, memilih metode bayar, dan menandai tagihan lunas. Role lain tetap bisa melihat status langganan tapi tombol aksinya disembunyikan.',
        },
        {
          q: "Di mana saya download buku manual Smart Plug?",
          a: 'Tombol "Download Buku Manual Smart Plug" otomatis muncul di kartu status paket begitu kamu pernah membeli minimal 1 unit Smart Plug.',
        },
        {
          q: "Akun Superuser kena aturan trial/kunci juga?",
          a: "Tidak — akun Superuser (internal/testing NEXBILL) tidak pernah dibatasi trial, kunci akses, atau masa tenggang, supaya semua fitur tetap bisa diuji kapan saja. Bagian checkout & riwayat tagihan tetap tersedia kalau ingin tetap dipakai.",
        },
      ],
    },
  ];

  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 font-semibold mb-3">
        <HelpCircle size={16} className="text-cyan-400" /> Pertanyaan yang Sering Diajukan (FAQ)
      </div>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">{g.title}</div>
            <div className="space-y-1">
              {g.items.map((item, idx) => {
                const key = `${g.title}-${idx}`;
                const open = openKey === key;
                return (
                  <div key={key} className="rounded-lg border border-white/10 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => setOpenKey(open ? null : key)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <div className="px-3 pb-3 text-xs text-neutral-400 leading-relaxed">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
