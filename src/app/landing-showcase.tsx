"use client";
import { useState } from "react";

/**
 * Landing — "aplikasi di HP" showcase: dua mockup HP berisi screenshot ASLI dashboard NEXBILL
 * (public/landing/app-*.webp, dipotong dari tangkapan layar Android tanpa status bar), lencana
 * ketersediaan Android/Google Play, dan strip "Bekerja dengan" untuk sistem yang didukung.
 *
 * Logo merek pihak ketiga (Google Play, Android, Tuya, dll.) TIDAK digambar ulang di kode — memakai
 * berkas resmi dari pemilik merek yang ditaruh di public/brands/<key>.(svg|png). Selama berkasnya
 * belum ada, yang tampil adalah chip teks nama sistem (penyebutan nama untuk menunjukkan
 * kompatibilitas). Lihat public/brands/README.md untuk daftar berkas & sumber resminya.
 */

export interface ShowcaseCopy {
  kicker: string;
  title: string;
  sub: string;
  androidTitle: string;
  androidSub: string;
  playSoon: string;
  worksWith: string;
  altDashboard: string;
  altRental: string;
}

export const SUPPORTED_SYSTEMS: { key: string; label: string; file?: string }[] = [
  { key: "tuya", label: "Tuya Smart / Smart Life", file: "/brands/tuya.svg" },
  { key: "android-tv", label: "Android TV / Google TV", file: "/brands/android-tv.svg" },
  { key: "tasmota", label: "Tasmota (MQTT)", file: "/brands/tasmota.svg" },
  { key: "qris", label: "QRIS", file: "/brands/qris.svg" },
  { key: "ipaymu", label: "iPaymu", file: "/brands/ipaymu.svg" },
  { key: "bluetooth-printer", label: "Printer Thermal Bluetooth (ESC/POS)" },
];

/** Logo resmi bila berkasnya ada di public/brands, selain itu chip teks. */
function BrandChip({ label, file }: { label: string; file?: string }) {
  const [failed, setFailed] = useState(!file);
  return (
    <div
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "44px",
        padding: "8px 16px",
        borderRadius: "12px",
        border: "1px solid var(--card-border)",
        background: "rgba(13, 21, 38, 0.55)",
        backdropFilter: "blur(8px)",
        color: "var(--text-dim)",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      {failed ? (
        label
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file} alt={label} style={{ height: "26px", width: "auto", objectFit: "contain" }} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

function PhoneFrame({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: "min(230px, 46vw)",
        borderRadius: "34px",
        padding: "9px",
        background: "linear-gradient(145deg, #1f2937, #0b0f1a)",
        boxShadow: "0 30px 60px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(34,211,238,0.15)",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ position: "absolute", top: "3px", left: "50%", transform: "translateX(-50%)", width: "44px", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.18)", zIndex: 2 }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" width={540} height={1083} style={{ display: "block", width: "100%", height: "auto", borderRadius: "26px" }} />
    </div>
  );
}

export function AppShowcase({ copy }: { copy: ShowcaseCopy }) {
  const [playBadgeFailed, setPlayBadgeFailed] = useState(false);
  return (
    <section id="aplikasi-android" style={{ backgroundColor: "transparent" }}>
      <div className="wrap">
        <div className="section-head">
          <div className="kicker">{copy.kicker}</div>
          <h2>{copy.title}</h2>
          <p>{copy.sub}</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "48px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: "min(480px, 95vw)" }}>
            <PhoneFrame src="/landing/app-dashboard.webp" alt={copy.altDashboard} style={{ transform: "rotate(-6deg) translateY(10px)", zIndex: 1 }} />
            <PhoneFrame src="/landing/app-rental.webp" alt={copy.altRental} style={{ transform: "rotate(5deg)", marginLeft: "min(-60px, -10vw)", zIndex: 2 }} />
          </div>

          <div style={{ maxWidth: "380px", display: "grid", gap: "14px" }}>
            <div className="feat-card" style={{ backdropFilter: "blur(10px)", backgroundColor: "rgba(13, 21, 38, 0.6)" }}>
              <h3 style={{ marginBottom: "6px" }}>{copy.androidTitle}</h3>
              <p style={{ marginBottom: "14px" }}>{copy.androidSub}</p>
              {playBadgeFailed ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid rgba(34,211,238,0.35)", borderRadius: "10px", padding: "10px 14px", color: "#e0f2fe", fontSize: "14px", fontWeight: 600 }}>
                  {copy.playSoon}
                </span>
              ) : (
                // Badge resmi "Get it on Google Play" — taruh di public/brands/google-play-badge.png
                // (unduh dari Google Play badge generator) dan ganti href ke halaman aplikasi
                // setelah rilis produksi. Selama berkasnya belum ada, tampil teks "Segera hadir".
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brands/google-play-badge.png" alt="Google Play" style={{ height: "52px", width: "auto" }} onError={() => setPlayBadgeFailed(true)} />
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "14px", letterSpacing: "0.05em", textTransform: "uppercase" }}>{copy.worksWith}</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
            {SUPPORTED_SYSTEMS.map((s) => (
              <BrandChip key={s.key} label={s.label} file={s.file} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
