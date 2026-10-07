"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing";

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
 * subscription/config.ts (TRIAL_DAYS=30, RENEWAL_GRACE_DAYS=7, RENEWAL_INVOICE_LEAD_DAYS=7) and
 * should be updated here too if those ever change.
 */
export function BillingFaq({
  starter,
  pro,
  annualMonthsCharged,
  smartPlugPrice,
  setupServicePrice,
  aiAddonPriceMonthly,
}: {
  /** Paket Starter (per unit/bulan, minimal minUnits unit) — lihat lib/subscription/pricing.ts. */
  starter?: { name: string; pricePerUnit: number; minUnits: number };
  /** Paket Pro (flat per outlet/bulan, diskon cabang ke-2 dst). */
  pro?: { name: string; priceFlat: number; multiOutletDiscountPct: number };
  annualMonthsCharged?: number;
  smartPlugPrice?: number;
  setupServicePrice?: number;
  aiAddonPriceMonthly?: number;
}) {
  const { t } = useDashboardLang();
  const vars: Record<string, string> = {
    starter: starter?.name ?? "NEXBILL Starter",
    pro: pro?.name ?? "NEXBILL Pro",
    starterPrice: rupiah(starter?.pricePerUnit ?? 6000),
    starterMin: String(starter?.minUnits ?? 5),
    proPrice: rupiah(pro?.priceFlat ?? 199000),
    annualMonths: String(annualMonthsCharged ?? 10),
    branchDiscount: String(pro?.multiOutletDiscountPct ?? 20),
    smartPlugPrice: rupiah(smartPlugPrice ?? 275000),
    setupPrice: rupiah(setupServicePrice ?? 125000),
    aiPrice: rupiah(aiAddonPriceMonthly ?? 149000),
  };
  /** t() + isi placeholder {nama} dari harga/paket yang sebenarnya. */
  const tf = (key: string, fallback: string) => t(key, fallback).replace(/\{(\w+)\}/g, (m, name: string) => vars[name] ?? m);
  const groups: FaqGroup[] = [
    {
      title: t("billing.faq.group.general", "Umum & Masa Percobaan"),
      items: [
        {
          q: tf("billing.faq.trial.q", "Apa itu masa percobaan (trial) 30 hari?"),
          a: tf("billing.faq.trial.a", "Setiap outlet baru otomatis mendapat masa percobaan gratis 30 hari sejak pertama kali dibuat — tidak perlu aktivasi apa pun. Selama trial semua fitur Pro terbuka (termasuk akuntansi, aset, PPOB, anti-fraud, dan AI), kontrol TV Android dibatasi 1 unit, dan Smart Plug (untuk TV non-Android) belum bisa dipakai sampai dibeli lewat etalase di halaman ini."),
        },
        {
          q: tf("billing.faq.trialEnded.q", "Apa yang terjadi setelah 30 hari trial berakhir?"),
          a: tf("billing.faq.trialEnded.a", "Status berubah menjadi \"Percobaan Berakhir\" dan dashboard masuk mode read-only (data tetap aman, tidak hilang) sampai kamu memilih paket ({starter} atau {pro}) dan menyelesaikan pembayaran checkout pertama di halaman ini. Setelah semua tagihan checkout lunas, akses terbuka otomatis — 30 hari untuk bulanan, 12 bulan untuk tahunan."),
        },
        {
          q: tf("billing.faq.dataSafe.q", "Apakah data saya hilang kalau langganan terkunci/ditangguhkan?"),
          a: tf("billing.faq.dataSafe.a", "Tidak. Terkuncinya akses hanya membatasi PENGGUNAAN fitur (read-only) — seluruh data transaksi, laporan, dan pengaturan tetap tersimpan utuh dan langsung bisa diakses lagi begitu tagihan dibayar."),
        },
      ],
    },
    {
      title: t("billing.faq.group.pricing", "Harga, Paket & Add-on"),
      items: [
        {
          q: tf("billing.faq.price.q", "Berapa harga paket NEXBILL?"),
          a: tf("billing.faq.price.a", "{starter}: {starterPrice}/unit PS/bulan (minimal {starterMin} unit) — fitur operasional: billing & timer, kasir F&B, booking online, membership, kontrol TV/smart plug, QR pelanggan. {pro}: {proPrice}/outlet/bulan flat — unit PS tak terbatas plus akuntansi & laporan keuangan, manajemen aset, PPOB, kontrol anti-fraud, AI Business Assistant, multi-cabang, dan rental ke rumah."),
        },
        {
          q: tf("billing.faq.annual.q", "Apakah ada harga tahunan?"),
          a: tf("billing.faq.annual.a", "Ada. Pilih siklus \"Tahunan\" saat checkout atau di Ganti Paket: bayar {annualMonths} bulan, aktif 12 bulan — berlaku untuk Starter maupun Pro."),
        },
        {
          q: tf("billing.faq.branches.q", "Bagaimana kalau punya beberapa cabang?"),
          a: tf("billing.faq.branches.a", "Multi-cabang termasuk paket Pro. Outlet Pro ke-2 dan seterusnya dalam satu grup penagihan mendapat diskon {branchDiscount}% per outlet, dan semua cabang ditagih dalam satu invoice gabungan."),
        },
        {
          q: tf("billing.faq.starterQuota.q", "Bagaimana kuota unit di paket Starter?"),
          a: tf("billing.faq.starterQuota.a", "Starter ditagih per unit PS aktif (minimal {starterMin} unit). Kalau ingin menambah unit melebihi kuota, buka Ganti Paket lalu naikkan kuota — selisihnya ditagih prorata untuk sisa periode dan kuota baru langsung berlaku setelah dibayar. Atau upgrade ke Pro untuk unit tak terbatas."),
        },
        {
          q: tf("billing.faq.changePlan.q", "Bisa naik/turun paket kapan saja?"),
          a: tf("billing.faq.changePlan.a", "Bisa. Naik ke Pro atau tambah kuota unit langsung berlaku setelah selisih prorata dibayar. Turun ke Starter, kurangi kuota, atau ganti siklus bulanan/tahunan berlaku mulai perpanjangan berikutnya (tanpa refund sisa periode). Saat turun ke Starter, menu modul Pro terkunci tapi datanya tetap tersimpan."),
        },
        {
          q: tf("billing.faq.smartPlug.q", "Apa itu Smart Plug dan kenapa saya harus beli?"),
          a: tf("billing.faq.smartPlug.a", "TV Android bisa langsung dikontrol nyala/mati dari sistem tanpa alat tambahan. TV non-Android (Smart TV biasa/TV Analog) butuh Smart Plug (colokan pintar) supaya bisa dikontrol otomatis dari NEXBILL — harga mulai {smartPlugPrice}/unit, tersedia beberapa varian di etalase di atas. Ini barang fisik terpisah dari harga langganan, berapa pun paketnya."),
        },
        {
          q: tf("billing.faq.setupService.q", "Apa itu Jasa Setup Jarak Jauh?"),
          a: tf("billing.faq.setupService.a", "Opsional ({setupPrice}) — kalau kamu tidak familiar menyambungkan Smart Plug ke akun cloud-nya sendiri, vendor akan bantu setting dari jarak jauh. Kalau dicentang saat checkout, kolom kontak PIC & alamat outlet akan diminta supaya vendor bisa menghubungi."),
        },
        {
          q: tf("billing.faq.ai.q", "Apakah fitur AI (Business Assistant & Insights) bayar terpisah?"),
          a: tf("billing.faq.ai.a", "Di paket Pro AI sudah termasuk tanpa biaya tambahan. Di paket Starter, AI bisa diaktifkan sebagai AI Add-on ({aiPrice}/bulan) karena setiap pemakaiannya punya biaya nyata ke penyedia AI. Selama trial 30 hari AI gratis. Hanya akun Owner atau Superuser yang bisa memakainya."),
        },
      ],
    },
    {
      title: t("billing.faq.group.payment", "Pembayaran & Tagihan"),
      items: [
        {
          q: tf("billing.faq.methods.q", "Metode pembayaran apa saja yang tersedia?"),
          a: tf("billing.faq.methods.a", "Cash (konfirmasi manual oleh NEXBILL), QRIS, dan Virtual Account (BCA, BNI, Mandiri, BRI, Permata) — pilih salah satu lewat tombol pada tagihan yang belum lunas."),
        },
        {
          q: tf("billing.faq.cash.q", "Bagaimana proses konfirmasi pembayaran Cash?"),
          a: tf("billing.faq.cash.a", "Setelah klik \"Cash\", akan muncul konfirmasi apakah NEXBILL sudah menerima pembayaran tunai tersebut — begitu dikonfirmasi, tagihan langsung ditandai lunas."),
        },
        {
          q: tf("billing.faq.markPaid.q", "Untuk QRIS/Virtual Account, kapan saya klik \"Tandai Lunas\"?"),
          a: tf("billing.faq.markPaid.a", "Setelah transfer/scan pembayaran BENAR-BENAR masuk. Tombol ini muncul setelah kamu memilih metode pembayaran pada tagihan tersebut — klik hanya setelah dana diterima, supaya status langganan tidak salah aktif sebelum pembayaran nyata."),
        },
        {
          q: tf("billing.faq.access.q", "Kapan akses penuh terbuka setelah bayar?"),
          a: tf("billing.faq.access.a", "Begitu SEMUA tagihan dari satu checkout yang sama berstatus lunas (bukan cuma sebagian), status langganan otomatis berubah menjadi \"Aktif\" (30 hari untuk bulanan, 12 bulan untuk tahunan) — tidak perlu refresh manual atau menunggu approval tambahan."),
        },
        {
          q: tf("billing.faq.editCheckout.q", "Saya sudah checkout tapi mau ubah/batalkan item — bisa?"),
          a: tf("billing.faq.editCheckout.a", "Sebelum klik \"Checkout\", isi keranjang bebas diubah/dihapus lewat tombol +/- di etalase. Setelah checkout ditekan, item sudah terkunci jadi satu tagihan — hubungi NEXBILL kalau perlu penyesuaian setelah itu."),
        },
      ],
    },
    {
      title: t("billing.faq.group.renewal", "Perpanjangan & Masa Tenggang"),
      items: [
        {
          q: tf("billing.faq.renewalInvoice.q", "Kapan tagihan perpanjangan bulan berikutnya dibuat?"),
          a: tf("billing.faq.renewalInvoice.a", "Otomatis dibuat 7 hari sebelum periode langganan berakhir. Kamu juga bisa membayar lebih awal kapan saja lewat tombol \"Perpanjang Sekarang\" begitu tidak ada tagihan lain yang masih menunggu pembayaran."),
        },
        {
          q: tf("billing.faq.grace.q", "Apa itu \"Masa Tenggang\"?"),
          a: tf("billing.faq.grace.a", "Kalau periode langganan habis dan tagihan perpanjangan belum dibayar, kamu diberi toleransi 7 hari (status \"Masa Tenggang\") sebelum akses dikunci penuh — akses masih tetap berjalan normal selama masa tenggang ini, dengan pengingat pembayaran yang muncul sekali sehari."),
        },
        {
          q: tf("billing.faq.suspended.q", "Apa yang terjadi kalau tidak bayar sampai masa tenggang habis?"),
          a: tf("billing.faq.suspended.a", "Status berubah menjadi \"Ditangguhkan\" (suspended) dan dashboard masuk mode read-only penuh, sama seperti trial yang berakhir — bayar tagihan perpanjangan yang tertunda untuk membuka akses lagi."),
        },
      ],
    },
    {
      title: t("billing.faq.group.multiOutlet", "Multi-Outlet (Cabang)"),
      items: [
        {
          q: tf("billing.faq.billingGroup.q", "Apa itu Tagihan Gabungan (Billing Group)?"),
          a: tf("billing.faq.billingGroup.a", "Kalau kamu punya lebih dari satu outlet/cabang di bawah akun Owner yang sama, semuanya digabung dalam SATU tagihan perpanjangan — satu kali pembayaran memperpanjang semua cabang sekaligus, ditampilkan sebagai kartu \"Tagihan Gabungan\" di bagian atas halaman ini."),
        },
        {
          q: tf("billing.faq.branchStatus.q", "Kalau salah satu cabang statusnya beda dari cabang lain, kenapa?"),
          a: tf("billing.faq.branchStatus.a", "Status tiap cabang (trial/aktif/tenggang) dihitung sendiri-sendiri sampai bergabung dalam satu tagihan perpanjangan berikutnya — jadi wajar kalau cabang yang baru dibuat masih trial sementara cabang lama sudah aktif, sampai keduanya sinkron di siklus tagihan gabungan berikutnya."),
        },
      ],
    },
    {
      title: t("billing.faq.group.other", "Lainnya"),
      items: [
        {
          q: tf("billing.faq.whoCanPay.q", "Siapa yang bisa mengelola pembayaran/checkout di halaman ini?"),
          a: tf("billing.faq.whoCanPay.a", "Hanya akun dengan izin \"manage_settings\" (biasanya Owner) yang bisa checkout, memilih metode bayar, dan menandai tagihan lunas. Role lain tetap bisa melihat status langganan tapi tombol aksinya disembunyikan."),
        },
        {
          q: tf("billing.faq.manual.q", "Di mana saya download buku manual Smart Plug?"),
          a: tf("billing.faq.manual.a", "Tombol \"Download Buku Manual Smart Plug\" otomatis muncul di kartu status paket begitu kamu pernah membeli minimal 1 unit Smart Plug."),
        },
        {
          q: tf("billing.faq.superuser.q", "Akun Superuser kena aturan trial/kunci juga?"),
          a: tf("billing.faq.superuser.a", "Tidak — akun Superuser (internal/testing NEXBILL) tidak pernah dibatasi trial, kunci akses, atau masa tenggang, supaya semua fitur tetap bisa diuji kapan saja. Bagian checkout & riwayat tagihan tetap tersedia kalau ingin tetap dipakai."),
        },
      ],
    },
  ];

  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 font-semibold mb-3">
        <HelpCircle size={16} className="text-cyan-400" /> {t("billing.faq.title", "Pertanyaan yang Sering Diajukan (FAQ)")}
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
