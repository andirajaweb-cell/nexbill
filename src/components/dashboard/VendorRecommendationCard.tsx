"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Gift, HandCoins, Info, X, ArrowUpRight } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import type { VendorRecPublic, VendorRecTarget } from "@/lib/vendor-recommendations/core";
import "@/lib/i18n/dict-vendor-rec";

/**
 * Kartu "solusi tambahan" dari NEXBILL (mis. Fastpay di halaman PPOB). Dibuat terasa sebagai saran
 * bisnis, bukan spanduk iklan: warnanya mengikuti kartu dashboard, isinya manfaat konkret, ada cara
 * menyembunyikannya, dan keterangan tautan mitra selalu terlihat. Isi (teks vendor) diatur tim
 * NEXBILL di /platform-admin/vendor-recommendations.
 */
export function VendorRecommendationView({
  rec,
  placement,
  preview = false,
  onDismiss,
}: {
  rec: VendorRecPublic;
  placement: string;
  preview?: boolean;
  onDismiss?: () => void;
}) {
  const { t } = useDashboardLang();
  const hrefFor = (target: VendorRecTarget) => (preview ? undefined : `/api/vendor-recommendations/${encodeURIComponent(rec.id)}/go?target=${target}`);
  const [primary, ...others] = rec.ctas;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] via-white/[0.02] to-cyan-500/[0.05] p-4 sm:p-5">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
          title={t("vendorRec.hideTitle", "Sembunyikan rekomendasi ini selama 30 hari")}
        >
          <X size={13} /> {t("vendorRec.hide", "Sembunyikan")}
        </button>
      )}

      <div className="flex items-start gap-3 pr-20">
        <div className="shrink-0 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-emerald-500/15 text-emerald-300">
          {rec.logoUrl ? <img src={rec.logoUrl} alt={rec.vendorName} className="h-full w-full object-contain bg-white p-1" /> : <HandCoins size={22} />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-emerald-300">{t("vendorRec.kicker", "Ide menambah pendapatan")}</span>
            {rec.badge && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-neutral-300">{rec.badge}</span>}
          </div>
          <h2 className="mt-1 text-base font-semibold text-neutral-100 sm:text-lg">{rec.headline}</h2>
          <p className="text-[11px] text-neutral-500">{t("vendorRec.byLine", "Solusi rekomendasi NEXBILL: {vendor}").replace("{vendor}", rec.vendorName)}</p>
        </div>
      </div>

      {rec.body && <p className="mt-3 text-sm leading-relaxed text-neutral-300">{rec.body}</p>}

      {rec.benefits.length > 0 && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {rec.benefits.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-neutral-200">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {rec.promoText && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <Gift size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <span>{rec.promoText}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {primary && (
          <a
            href={hrefFor(primary.target)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={preview ? (e) => e.preventDefault() : undefined}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            {primary.label} <ArrowUpRight size={15} />
          </a>
        )}
        {others.map((c) => (
          <a
            key={c.target}
            href={hrefFor(c.target)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={preview ? (e) => e.preventDefault() : undefined}
            className="inline-flex items-center gap-1 text-sm text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
          >
            {c.label} <ArrowUpRight size={13} />
          </a>
        ))}
      </div>

      {placement === "ppob" && (
        <p className="mt-3 text-xs text-neutral-400">
          {t("vendorRec.ppobHint", "Sudah jadi agen? Catat setiap transaksinya di formulir PPOB di halaman ini — margin dan saldo deposit otomatis masuk laporan & pembukuan.")}
        </p>
      )}

      {(rec.footnote || rec.disclosure) && (
        <div className="mt-3 space-y-1 border-t border-white/5 pt-2 text-[11px] text-neutral-500">
          {rec.footnote && <p>{rec.footnote}</p>}
          {rec.disclosure && (
            <p className="flex items-start gap-1">
              <Info size={12} className="mt-0.5 shrink-0" /> {rec.disclosure}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Mengambil & menampilkan rekomendasi untuk satu halaman, mencatat "dilihat" dan "disembunyikan". */
export function VendorRecommendations({ placement }: { placement: string }) {
  const [items, setItems] = useState<VendorRecPublic[]>([]);
  const seenRef = useRef(new Set<string>());
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let alive = true;
    fetch(`/api/vendor-recommendations?placement=${encodeURIComponent(placement)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => alive && setItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [placement]);

  useEffect(() => {
    if (items.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.recId;
          if (!id || !e.isIntersecting || seenRef.current.has(id)) continue;
          seenRef.current.add(id);
          fetch(`/api/vendor-recommendations/${encodeURIComponent(id)}/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "impression" }),
          }).catch(() => {});
        }
      },
      { threshold: 0.4 }
    );
    for (const el of refs.current.values()) io.observe(el);
    return () => io.disconnect();
  }, [items]);

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    fetch(`/api/vendor-recommendations/${encodeURIComponent(id)}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "dismiss" }),
    }).catch(() => {});
  };

  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((rec) => (
        <div
          key={rec.id}
          data-rec-id={rec.id}
          ref={(el) => {
            if (el) refs.current.set(rec.id, el);
            else refs.current.delete(rec.id);
          }}
        >
          <VendorRecommendationView rec={rec} placement={placement} onDismiss={() => dismiss(rec.id)} />
        </div>
      ))}
    </div>
  );
}
