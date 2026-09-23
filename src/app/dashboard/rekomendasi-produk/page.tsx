"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { ShoppingBag, ExternalLink, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import "@/lib/i18n/dict-rekomendasi-produk";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { pickProductLang } from "@/lib/affiliate/product-lang";

interface AffiliateProduct {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  shopeeUrl: string;
  priceLabel: string | null;
  category: string | null;
  /** Judul/deskripsi/kategori dalam lima bahasa selain Indonesia — dibuat otomatis saat produk disimpan; lihat lib/affiliate/translate-product.ts. */
  translationsJson: string | null;
}

/**
 * `priceLabel` adalah teks bebas yang diisi tim NEXBILL lewat /platform-admin/affiliate, jadi isinya
 * bisa apa saja: "Rp375.000", "mulai 2 jutaan", atau — seperti yang terjadi — angka telanjang
 * "375000" yang tampil apa adanya di layar merchant dan terbaca seperti data mentah yang bocor.
 *
 * Fungsi ini hanya merapikan kasus terakhir itu: bila seluruh isinya angka (boleh berspasi, titik,
 * atau koma sebagai pemisah ribuan), ditampilkan sebagai Rupiah berformat. Teks yang sudah punya
 * kata atau simbol dibiarkan UTUH — kurator mungkin sengaja menulis "mulai Rp2 jutaan", dan menebak
 * maksudnya lalu menimpanya akan lebih merugikan daripada membiarkannya.
 */
function formatPriceLabel(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[\d.,\s]+$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return trimmed;
  return `Rp${Number(digits).toLocaleString("id-ID")}`;
}

/**
 * "Rekomendasi Produk" — a standalone showcase page (deliberately NOT part of /dashboard/billing
 * itself, just linked from it) presenting Shopee affiliate links for rental-business gear. Pure
 * outbound links curated via /platform-admin/affiliate — nothing here ever touches the app's own
 * cart/checkout (see billing/page.tsx for that flow); clicking a card just opens Shopee in a new
 * tab. Styled deliberately more "boutique storefront" than the rest of the utilitarian dashboard —
 * gold/amber accents instead of the app's usual cyan/purple neon, generous spacing, serif-leaning
 * display type — since the request was explicitly to make this feel elegant and premium.
 */
// Sentinel value for the "All categories" filter option — kept as a stable internal value
// (not user-facing) so the displayed label can be translated independently below.
const ALL_CATEGORY = "Semua";

export default function RekomendasiProdukPage() {
  const { t, lang } = useDashboardLang();
  const [items, setItems] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);

  useEffect(() => {
    fetchJsonArray<AffiliateProduct>("/api/affiliate-products").then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, []);

  /*
   * Tiap produk diterjemahkan lebih dulu ke bahasa yang sedang dipilih, tapi NILAI KATEGORI ASLI
   * (Bahasa Indonesia) tetap disimpan terpisah sebagai `categoryKey`.
   *
   * Itu yang menjaga filter tetap utuh saat bahasa diganti: pengelompokan dan pencocokan dilakukan
   * atas kategori asli, sementara yang ditampilkan di tombol adalah terjemahannya. Kalau filter
   * memakai teks terjemahan, mengganti bahasa akan membuat pilihan yang sedang aktif tidak lagi
   * cocok dengan produk mana pun — daftarnya mendadak kosong tanpa sebab yang terlihat.
   */
  const localized = useMemo(
    () => items.map((p) => ({ ...p, ...pickProductLang(p, lang), categoryKey: p.category ?? null })),
    [items, lang]
  );

  const categories = useMemo(() => {
    // Nama tampilan per kategori diambil dari produk pertama yang memakainya — semua produk dalam
    // satu kategori menerjemahkan teks yang sama, jadi mana pun yang diambil hasilnya sama.
    const byKey = new Map<string, string>();
    localized.forEach((p) => {
      if (p.categoryKey && !byKey.has(p.categoryKey)) byKey.set(p.categoryKey, p.category ?? p.categoryKey);
    });
    return [{ key: ALL_CATEGORY, label: t("rekomendasiProduk.categoryAll", "Semua") }, ...Array.from(byKey, ([key, label]) => ({ key, label }))];
  }, [localized, t]);

  const filtered = activeCategory === ALL_CATEGORY ? localized : localized.filter((p) => p.categoryKey === activeCategory);

  return (
    <div className="min-h-screen bg-[#05060a]">
      {/* Ambient premium backdrop — soft gold glow instead of the app's usual cyan/purple, kept
          local to this page (not gm-body) so the rest of the dashboard is untouched. */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 15% 0%, rgba(217,180,90,0.10), transparent 60%), radial-gradient(900px circle at 85% 20%, rgba(190,140,50,0.08), transparent 60%), linear-gradient(180deg, #05060a 0%, #0a0906 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-amber-300 transition mb-6">
          <ArrowLeft size={13} /> {t("rekomendasiProduk.backToBilling", "Kembali ke Langganan")}
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-300/90 mb-5">
            <Sparkles size={12} /> {t("rekomendasiProduk.badge", "Kurasi NEXBILL")}
          </div>
          <h1 className="gm-display text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
            {t("rekomendasiProduk.heading", "Rekomendasi Produk")}
          </h1>
          <p className="mt-3 text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            {t(
              "rekomendasiProduk.subtitle",
              "Pilihan perlengkapan penunjang bisnis rental — aksesoris, kabel, jaringan, hingga perawatan — yang kami kurasi khusus untuk Anda. Setiap pembelian dilakukan langsung di toko online tujuan, di luar aplikasi NEXBILL."
            )}
          </p>
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={clsx(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition",
                  activeCategory === c.key
                    ? "border-amber-400/50 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(217,180,90,0.25)]"
                    : "border-white/10 text-neutral-400 hover:border-amber-400/30 hover:text-amber-200/80"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-neutral-500 py-16">{t("rekomendasiProduk.loading", "Memuat rekomendasi...")}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="mx-auto mb-3 text-neutral-700" size={36} />
            <p className="text-sm text-neutral-500">{t("rekomendasiProduk.emptyState", "Belum ada produk rekomendasi untuk kategori ini.")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <a
                key={p.id}
                href={p.shopeeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-md transition hover:border-amber-400/30 hover:shadow-[0_0_28px_-6px_rgba(217,180,90,0.35)]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#0e0d09]">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-700">
                      <ShoppingBag size={28} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  {p.category && (
                    <span className="text-[10px] uppercase tracking-widest text-amber-400/70">{p.category}</span>
                  )}
                  <h3 className="gm-heading text-sm font-semibold text-neutral-100 leading-snug">{p.title}</h3>
                  {/*
                   * Dulu "line-clamp-2": deskripsi dipotong pada baris kedua dan diakhiri elipsis.
                   * Di sini itu merugikan — deskripsinya bukan basa-basi pemasaran, melainkan
                   * alasan kenapa produk ini relevan untuk rental PS ("Internet ISP utama mati
                   * total bukan berarti operasional rental berhenti..."), dan justru kalimat
                   * setelah potongan itulah yang menjelaskannya. Menyembunyikan bagian yang paling
                   * menentukan keputusan beli sama saja membuat kurasinya sia-sia.
                   *
                   * Tinggi kartu tetap rapi karena grid meregangkan tiap sel setinggi barisnya, dan
                   * baris harga dipaku ke bawah dengan mt-auto.
                   */}
                  {p.description && (
                    <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-line">{p.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-medium text-amber-300">{formatPriceLabel(p.priceLabel) || t("rekomendasiProduk.viewDetail", "Lihat Detail")}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200 transition group-hover:bg-amber-500/20">
                      {t("rekomendasiProduk.buyNow", "Beli Sekarang")} <ExternalLink size={11} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-neutral-600 mt-14">
          {t(
            "rekomendasiProduk.footerDisclaimer",
            "Link di halaman ini adalah link affiliate ke toko online partner — pembelian, pembayaran, dan pengiriman sepenuhnya ditangani oleh toko tujuan, di luar sistem NEXBILL."
          )}
        </p>
      </div>
    </div>
  );
}
