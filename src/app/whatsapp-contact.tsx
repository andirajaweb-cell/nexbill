"use client";

// Kontak WhatsApp admin NEXBILL di situs utama (2026-11-22): baris di footer, ajakan di bagian
// Harga, dan tombol mengambang — semuanya membuka chat dengan pesan "ingin berlangganan" yang sudah
// terisi sesuai bahasa halaman. Nomor diatur di src/lib/site-config.ts (SALES_WHATSAPP).
import { MessageCircle } from "lucide-react";
import { SALES_WHATSAPP, salesWhatsappLink } from "@/lib/site-config";
import { useLanguage } from "./landing-i18n";

const WA_GREEN = "#25D366";

/** Ikon obrolan berwarna hijau WhatsApp (ikon umum, bukan logo merek). */
export function WaBadgeIcon({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-grid", placeItems: "center", width: size + 10, height: size + 10, borderRadius: "999px", background: WA_GREEN, color: "#fff", flexShrink: 0 }}
    >
      <MessageCircle size={size} strokeWidth={2.4} />
    </span>
  );
}

/** Baris kontak WhatsApp di footer. */
export function FooterWhatsapp() {
  const { t } = useLanguage();
  return (
    <p style={{ marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <strong>{t.contact.waLabel}</strong>
      <a
        href={salesWhatsappLink(t.contact.message)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#4ade80", fontWeight: 600, textDecoration: "none" }}
      >
        <WaBadgeIcon size={12} />
        {SALES_WHATSAPP.display}
      </a>
    </p>
  );
}

/** Ajakan di bawah kartu harga: tanya paket / berlangganan lewat admin. */
export function PricingWhatsappCta() {
  const { t } = useLanguage();
  return (
    <div
      style={{
        marginTop: "28px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        padding: "18px 20px",
        borderRadius: "18px",
        border: "1px solid rgba(37,211,102,0.35)",
        background: "rgba(37,211,102,0.07)",
        textAlign: "center",
      }}
    >
      <WaBadgeIcon size={20} />
      <div style={{ minWidth: "200px" }}>
        <div style={{ fontWeight: 700, fontSize: "16px" }}>{t.contact.ctaTitle}</div>
        <div style={{ fontSize: "13.5px", color: "var(--text-dim)" }}>
          {t.contact.ctaSub} <strong style={{ color: "#4ade80", whiteSpace: "nowrap" }}>{SALES_WHATSAPP.display}</strong>
        </div>
      </div>
      <a
        href={salesWhatsappLink(t.contact.message)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn"
        style={{ background: WA_GREEN, color: "#04140a", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        <MessageCircle size={18} strokeWidth={2.4} /> {t.contact.ctaButton}
      </a>
    </div>
  );
}

/** Tombol WhatsApp mengambang di pojok kanan bawah halaman pemasaran. */
export function WhatsappFab() {
  const { t } = useLanguage();
  return (
    <a
      href={salesWhatsappLink(t.contact.message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t.contact.fab} — ${SALES_WHATSAPP.display}`}
      title={`${t.contact.fab} — ${SALES_WHATSAPP.display}`}
      style={{
        position: "fixed",
        right: "18px",
        bottom: "calc(18px + env(safe-area-inset-bottom))",
        zIndex: 150,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px 10px 10px",
        borderRadius: "999px",
        background: WA_GREEN,
        color: "#04140a",
        fontWeight: 700,
        fontSize: "14px",
        boxShadow: "0 10px 30px -8px rgba(37,211,102,0.6), 0 2px 8px rgba(0,0,0,0.35)",
        textDecoration: "none",
      }}
    >
      <span style={{ display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: "999px", background: "rgba(255,255,255,0.25)" }}>
        <MessageCircle size={20} strokeWidth={2.4} />
      </span>
      {t.contact.fab}
    </a>
  );
}
