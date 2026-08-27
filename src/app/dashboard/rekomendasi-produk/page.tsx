"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { ShoppingBag, ExternalLink, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import "@/lib/i18n/dict-rekomendasi-produk";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

interface AffiliateProduct {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  shopeeUrl: string;
  priceLabel: string | null;
  category: string | null;
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
  const { t } = useDashboardLang();
  const [items, setItems] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);

  useEffect(() => {
    fetchJsonArray<AffiliateProduct>("/api/affiliate-products").then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => p.category && set.add(p.category));
    return [ALL_CATEGORY, ...Array.from(set)];
  }, [items]);

  const filtered = activeCategory === ALL_CATEGORY ? items : items.filter((p) => p.category === activeCategory);

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
                key={c}
                onClick={() => setActiveCategory(c)}
                className={clsx(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition",
                  activeCategory === c
                    ? "border-amber-400/50 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(217,180,90,0.25)]"
                    : "border-white/10 text-neutral-400 hover:border-amber-400/30 hover:text-amber-200/80"
                )}
              >
                {c === ALL_CATEGORY ? t("rekomendasiProduk.categoryAll", "Semua") : c}
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
                  {p.description && (
                    <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-medium text-amber-300">{p.priceLabel || t("rekomendasiProduk.viewDetail", "Lihat Detail")}</span>
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
