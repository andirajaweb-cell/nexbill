"use client";
import { useState } from "react";

/**
 * Landing — section "Aplikasi Android": dua mockup HP berisi screenshot ASLI NEXBILL
 * (public/landing/app-*.webp), lencana Android & Google Play dengan ukuran seragam, dan grid
 * integrasi "Bekerja dengan" (ubin berukuran sama, logo resmi dari public/brands).
 *
 * Logo pihak ketiga TIDAK digambar ulang — berkas resmi dari pemilik merek (lihat
 * public/brands/README.md). Yang diubah hanya batas area gambar (viewBox) bila berkas aslinya
 * terpotong / berpadding. Badge Google Play baru menjadi tautan setelah PLAY_STORE_URL diisi.
 */

/**
 * Isi dengan alamat halaman Play Store SETELAH NEXBILL rilis produksi — badge otomatis menjadi
 * tautan dan keterangan "Segera hadir" hilang. Selama null, badge tampil tanpa tautan.
 */
export const PLAY_STORE_URL: string | null = null; // "https://play.google.com/store/apps/details?id=id.nexbill.app"

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
  bullets: [string, string, string];
  availableOn: string;
  chipRevenueLabel: string;
  chipTimeLabel: string;
  worksWithSub: string;
  caps: { tuya: string; tasmota: string; ipaymu: string; googleTv: string; qris: string };
}

type CapKey = keyof ShowcaseCopy["caps"];

export const SUPPORTED_SYSTEMS: { key: CapKey; label: string; file: string; h?: number }[] = [
  { key: "tuya", label: "Tuya Smart / Smart Life", file: "/brands/tuya.svg", h: 30 },
  { key: "tasmota", label: "Tasmota (MQTT)", file: "/brands/tasmota.svg", h: 38 },
  { key: "googleTv", label: "Google TV / Android TV", file: "/brands/google-tv.svg", h: 26 },
  { key: "qris", label: "QRIS", file: "/brands/qris.svg", h: 26 },
  { key: "ipaymu", label: "iPaymu", file: "/brands/ipaymu.png", h: 30 },
];

const CSS = `
.nbx { position: relative; overflow: hidden; }
.nbx-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; }
.nbx-copy h2 { font-family: var(--nb-font-display, inherit); font-size: clamp(30px, 4vw, 46px); line-height: 1.08; letter-spacing: -0.02em; margin: 14px 0 16px; }
.nbx-copy .nbx-sub { color: var(--text-dim); font-size: 16.5px; line-height: 1.65; margin: 0 0 22px; max-width: 520px; }
.nbx-kicker { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--cyan); padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(56,189,248,.28); background: rgba(56,189,248,.08); }
.nbx-kicker i { width: 6px; height: 6px; border-radius: 999px; background: var(--green); box-shadow: 0 0 10px var(--green); }
.nbx-list { list-style: none; padding: 0; margin: 0 0 28px; display: grid; gap: 12px; }
.nbx-list li { display: flex; gap: 12px; align-items: flex-start; color: var(--text); font-size: 15px; line-height: 1.5; }
.nbx-check { flex: 0 0 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; background: rgba(52,211,153,.14); border: 1px solid rgba(52,211,153,.35); color: var(--green); font-size: 12px; font-weight: 800; margin-top: 1px; }
.nbx-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.nbx-badge { height: 52px; display: inline-flex; align-items: center; gap: 10px; padding: 0 16px 0 12px; border-radius: 10px; background: #000; border: 1px solid #a6a6a6; color: #fff; text-decoration: none; box-sizing: border-box; text-align: left; }
.nbx-badge small { display: block; font-size: 10px; letter-spacing: .04em; line-height: 1; opacity: .9; text-transform: uppercase; }
.nbx-badge strong { display: block; font-size: 20px; line-height: 1.1; font-weight: 600; letter-spacing: -0.01em; }
.nbx-badge-img { height: 52px; width: auto; display: block; }
.nbx-soon { margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-dim); }
.nbx-soon b { color: #67e8f9; font-weight: 600; }
.nbx-stage { position: relative; height: 560px; display: flex; align-items: center; justify-content: center; }
.nbx-orb { position: absolute; inset: 10% 8%; border-radius: 50%; background: radial-gradient(closest-side, rgba(56,189,248,.35), rgba(59,130,246,.18) 45%, transparent 72%); filter: blur(20px); pointer-events: none; }
.nbx-ring { position: absolute; width: 480px; height: 480px; border-radius: 50%; border: 1px dashed rgba(148,163,184,.18); pointer-events: none; }
.nbx-phone { position: absolute; width: 238px; border-radius: 38px; padding: 8px; background: linear-gradient(160deg, #2a3446 0%, #0b1020 55%, #1a2232 100%); box-shadow: 0 40px 80px -24px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.07), inset 0 1px 0 rgba(255,255,255,.12); }
.nbx-phone img { display: block; width: 100%; height: auto; border-radius: 31px; }
.nbx-phone::before { content: ""; position: absolute; top: 3px; left: 50%; transform: translateX(-50%); width: 46px; height: 3px; border-radius: 999px; background: rgba(255,255,255,.16); }
.nbx-phone.back { transform: translateX(-104px) translateY(14px) rotate(-7deg); opacity: .96; }
.nbx-phone.front { transform: translateX(96px) translateY(-6px) rotate(5deg); z-index: 2; }
.nbx-chip { position: absolute; z-index: 3; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; background: rgba(13,21,38,.72); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 18px 40px -12px rgba(0,0,0,.6); animation: nbxFloat 6s ease-in-out infinite; text-align: left; }
.nbx-chip small { display: block; font-size: 10.5px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .08em; }
.nbx-chip strong { display: block; font-family: var(--nb-font-display, inherit); font-size: 17px; color: #fff; letter-spacing: -0.01em; }
.nbx-chip .dot { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: 16px; }
.nbx-chip.c1 { top: 34px; left: 0; }
.nbx-chip.c2 { bottom: 40px; right: 0; animation-delay: -3s; }
@keyframes nbxFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.nbx-int { margin-top: 72px; padding-top: 44px; border-top: 1px solid rgba(255,255,255,.07); text-align: center; }
.nbx-int h3 { font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--text-dim); margin: 0 0 6px; }
.nbx-int p { color: var(--text-faint); font-size: 14px; margin: 0 0 26px; }
.nbx-tiles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; max-width: 980px; margin: 0 auto; }
.nbx-tile { display: flex; flex-direction: column; align-items: stretch; gap: 10px; }
.nbx-tile-logo { height: 84px; border-radius: 16px; background: #fff; display: grid; place-items: center; padding: 0 18px; box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 14px 30px -14px rgba(0,0,0,.7); transition: transform .25s ease, box-shadow .25s ease; }
.nbx-tile-logo img { max-width: 100%; width: auto; object-fit: contain; display: block; }
.nbx-tile:hover .nbx-tile-logo { transform: translateY(-3px); box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 20px 40px -14px rgba(56,189,248,.35); }
.nbx-tile span { font-size: 12.5px; color: var(--text-dim); }
@media (max-width: 980px) {
  .nbx-grid { grid-template-columns: 1fr; gap: 24px; }
  .nbx-copy { text-align: center; }
  .nbx-copy .nbx-sub { margin-left: auto; margin-right: auto; }
  .nbx-list { max-width: 440px; margin-left: auto; margin-right: auto; text-align: left; }
  .nbx-badges { justify-content: center; }
  .nbx-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .nbx-stage { height: 470px; transform: scale(.82); margin: -40px 0; }
  .nbx-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .nbx-tile-logo { height: 72px; }
  .nbx-chip.c1 { left: -6px; } .nbx-chip.c2 { right: -6px; }
}
@media (prefers-reduced-motion: reduce) { .nbx-chip { animation: none; } }
`;

export function AppShowcase({ copy }: { copy: ShowcaseCopy }) {
  const [playBadgeFailed, setPlayBadgeFailed] = useState(false);
  const playImg = (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="nbx-badge-img" src="/brands/google-play-badge.svg" alt="Get it on Google Play" onError={() => setPlayBadgeFailed(true)} />
  );
  return (
    <section id="aplikasi-android" className="nbx" style={{ backgroundColor: "transparent" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="nbx-grid">
          <div className="nbx-copy">
            <span className="nbx-kicker"><i /> {copy.kicker}</span>
            <h2>{copy.title}</h2>
            <p className="nbx-sub">{copy.sub}</p>
            <ul className="nbx-list">
              {copy.bullets.map((b, i) => (
                <li key={i}><span className="nbx-check">✓</span>{b}</li>
              ))}
            </ul>
            <div className="nbx-badges">
              {/* Lencana Android: robot Android resmi (public/brands/android-robot.svg) dalam bingkai
                  hitam setinggi & sebentuk badge Google Play supaya sepasang lencana terlihat seragam. */}
              <span className="nbx-badge" aria-label="Android">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brands/android-robot.svg" alt="" style={{ height: "26px", width: "auto" }} />
                <span>
                  <small>{copy.availableOn}</small>
                  <strong>Android</strong>
                </span>
              </span>
              {!playBadgeFailed && (PLAY_STORE_URL ? (
                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Play">{playImg}</a>
              ) : playImg)}
            </div>
            {!PLAY_STORE_URL && (
              <div className="nbx-soon"><b>●</b> {copy.playSoon}</div>
            )}
          </div>

          <div className="nbx-stage">
            <div className="nbx-orb" />
            <div className="nbx-ring" />
            <div className="nbx-phone back">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/app-dashboard.webp" alt={copy.altDashboard} loading="lazy" width={540} height={1083} />
            </div>
            <div className="nbx-phone front">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/app-rental.webp" alt={copy.altRental} loading="lazy" width={540} height={1083} />
            </div>
            <div className="nbx-chip c1">
              <span className="dot" style={{ background: "rgba(52,211,153,.15)", color: "#34d399" }}>↗</span>
              <span><small>{copy.chipRevenueLabel}</small><strong>Rp56.000</strong></span>
            </div>
            <div className="nbx-chip c2">
              <span className="dot" style={{ background: "rgba(56,189,248,.15)", color: "#38bdf8" }}>⏱</span>
              <span><small>{copy.chipTimeLabel}</small><strong>01:59:51</strong></span>
            </div>
          </div>
        </div>

        <div className="nbx-int">
          <h3>{copy.worksWith}</h3>
          <p>{copy.worksWithSub}</p>
          <div className="nbx-tiles">
            {SUPPORTED_SYSTEMS.map((s) => (
              <div className="nbx-tile" key={s.key} title={s.label}>
                <div className="nbx-tile-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.file} alt={s.label} loading="lazy" style={{ height: `${s.h ?? 28}px` }} />
                </div>
                <span>{copy.caps[s.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
