"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Space_Grotesk, Inter } from "next/font/google";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// three does not ship declarations in this project; keep the runtime import until @types/three is added.
// @ts-expect-error TS7016: no declaration file is currently available for "three".
import * as THREE from "three";
import "./landing.css";

// Deklarasi global untuk Web Components (model-viewer & spline-viewer) agar TypeScript tidak error.
/* eslint-disable @typescript-eslint/no-namespace */
// Deklarasi Global untuk Web Components (model-viewer) agar TypeScript tidak error
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string;
          poster?: string;
          alt?: string;
          "auto-rotate"?: boolean | string;
          "camera-controls"?: boolean | string;
          "disable-zoom"?: boolean | string;
          "shadow-intensity"?: string;
        };
      }
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nb-font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--nb-font-body" });

const FEATURES = [
  { icon: "⏱️", title: "Timer Sewa Presisi Detik", desc: "Tap start, sistem hitung durasi & tagihan otomatis sampai ke detik. Berfungsi sempurna untuk tarif sewa PS4, PS5, maupun PS6." },
  { icon: "🖥️", title: "Manajemen Unit PS4, PS5 & PS6", desc: "Tiap unit dicatat terpisah. Pelanggan booking online tahu persis unit konsol generasi mana yang kosong dan spesifikasi TV-nya." },
  { icon: "🔌", title: "Kontrol TV & Konsol Otomatis", desc: "TV dan konsol otomatis menyala saat sesi dimulai dan mati saat waktu habis — terintegrasi dengan smart plug." },
  { icon: "🧾", title: "Kasir & POS Multi Pembayaran", desc: "Transaksi sewa, makanan/minuman, dan aksesoris dalam satu tagihan. Terima tunai, QRIS, e-wallet, dan lainnya." },
  { icon: "📅", title: "Booking Online 24 Jam", desc: "Pelanggan cek slot kosong dan booking sendiri lewat halaman outlet Anda, lengkap dengan pengingat WhatsApp otomatis." },
  { icon: "💰", title: "Manajemen Shift & Laporan", desc: "Tutup shift dengan hitung uang per pecahan. Laba rugi dan arus kas tersusun otomatis tanpa rekap manual Excel." },
];

const FAQS = [
  { q: "Apakah wajib pakai smart plug atau Android TV?", a: "Tidak wajib. Sistem tetap bisa dipakai penuh untuk kasir, booking, laporan, dan lainnya tanpa perangkat tambahan. Smart plug hanya untuk fitur nyala/mati otomatis." },
  { q: "Berapa lama proses setup awal?", a: "Biasanya 30-60 menit lewat remote (TeamViewer/AnyDesk/WhatsApp), termasuk input data unit PS4, PS5, PS6 dan harga sewa masing-masing konsol." },
  { q: "Apakah butuh koneksi internet terus-menerus?", a: "Untuk transaksi kasir harian disarankan koneksi internet stabil. Tim kami akan menginformasikan kebutuhan teknis sesuai paket yang dipilih." },
  { q: "Bagaimana kalau saya punya lebih dari satu outlet/cabang?", a: "Setiap outlet punya data, staf, dan link booking online sendiri-sendiri. Anda bisa pantau semua cabang dari satu akun owner." },
];

// --- FUNGSI UTILITAS MORFING 3D ---
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;
const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

// --- KOMPONEN 3D BACKGROUND ---
function RunrobrunGooBackground({ onFallback }: { onFallback: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    let renderer: THREE.WebGLRenderer | null = null;

    // 1. Fallback WebGL Check
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        console.warn("WebGL tidak didukung. Memuat fallback CSS murni.");
        onFallback(); // Panggil fungsi fallback untuk memunculkan CSS Blob
        return;
      }
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (error) {
      console.warn("WebGL Error:", error);
      onFallback();
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const baseRadius = 1.8;
    const baseGeometry = new THREE.IcosahedronGeometry(baseRadius, 32); 
    const originalPositions = baseGeometry.attributes.position.clone();

    // Material Kaca (Glass Object 3D)
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8, metalness: 0.1, roughness: 0.05,
      transmission: 0.95, ior: 1.4, thickness: 1.5, transparent: true,
    });
    const shellMesh = new THREE.Mesh(baseGeometry.clone(), shellMaterial);
    
    // Material Inti (Goo/Liquid 3D)
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, roughness: 0.4, metalness: 0.2,
      emissive: 0x1d4ed8, emissiveIntensity: 0.5,
    });
    const coreMesh = new THREE.Mesh(baseGeometry.clone(), coreMaterial);
    coreMesh.scale.set(0.65, 0.65, 0.65); 

    const gooGroup = new THREE.Group();
    gooGroup.add(shellMesh);
    gooGroup.add(coreMesh);
    scene.add(gooGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xec4899, 4, 15);
    pointLight.position.set(5, 5, 3);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x38bdf8, 3, 15);
    pointLight2.position.set(-5, -5, -3);
    scene.add(pointLight2);

    let time = 0;
    let scrollProgress = 0;
    let animationFrameId: number;

    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => { scrollProgress = self.progress; }
    });

    const animate = () => {
      if (!renderer) return;
      animationFrameId = requestAnimationFrame(animate);
      time += 0.015;

      gooGroup.rotation.y = time * 0.2;
      gooGroup.rotation.x = time * 0.1;

      const morphFactor = smoothstep(0.1, 0.8, scrollProgress); 

      const updateGeometry = (mesh: THREE.Mesh, isCore: boolean) => {
        const positions = mesh.geometry.attributes.position;
        const vertex = new THREE.Vector3();
        const originalVertex = new THREE.Vector3();
        const targetCubeVertex = new THREE.Vector3();

        for (let i = 0; i < positions.count; i++) {
          originalVertex.fromBufferAttribute(originalPositions, i);
          
          vertex.copy(originalVertex).normalize();
          const frequency = isCore ? 4.0 : 3.0; 
          const amplitude = isCore ? 0.3 : 0.2;
          
          const noise = Math.sin(vertex.x * frequency + time) * 
                        Math.cos(vertex.y * frequency + time) * 
                        Math.sin(vertex.z * frequency + time) * amplitude;
          
          const organicDistance = baseRadius + noise;
          const organicPos = vertex.clone().multiplyScalar(organicDistance);

          const cubeScale = baseRadius * 0.85; 
          targetCubeVertex.copy(originalVertex).normalize();
          const maxAbs = Math.max(Math.abs(targetCubeVertex.x), Math.abs(targetCubeVertex.y), Math.abs(targetCubeVertex.z));
          targetCubeVertex.divideScalar(maxAbs).multiplyScalar(cubeScale);

          const finalX = lerp(organicPos.x, targetCubeVertex.x, morphFactor);
          const finalY = lerp(organicPos.y, targetCubeVertex.y, morphFactor);
          const finalZ = lerp(organicPos.z, targetCubeVertex.z, morphFactor);

          positions.setXYZ(i, finalX, finalY, finalZ);
        }
        
        mesh.geometry.computeVertexNormals();
        positions.needsUpdate = true;
      };

      updateGeometry(shellMesh, false);
      updateGeometry(coreMesh, true);
      ambientLight.color.setHSL(lerp(0.55, 0.75, scrollProgress), 0.8, 0.5);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer) containerRef.current.removeChild(renderer.domElement);
      baseGeometry.dispose();
      shellMaterial.dispose();
      coreMaterial.dispose();
      if (renderer) renderer.dispose();
    };
  }, [onFallback]);

  return <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }} />;
}

// --- KOMPONEN UTAMA PAGE ---
export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [webGLFailed, setWebGLFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = prev; };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: Lenis | undefined;
    let rafCallback: ((time: number) => void) | undefined;
    const magneticCleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      rafCallback = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);

      const revealGroups = [".section-head", ".pain-card", ".feat-card", ".step", ".price-card", ".addon-card", ".faq-item"];
      revealGroups.forEach((sel) => {
        gsap.utils.toArray<HTMLElement>(sel).forEach((el, i) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              delay: (i % 3) * 0.08,
              scrollTrigger: { trigger: el, start: "top 88%" },
            }
          );
        });
      });

      // Animasi 3D Object Floating murni CSS/GSAP
      gsap.utils.toArray<HTMLElement>(".floating-3d-asset").forEach((el, i) => {
        gsap.to(el, {
          y: -12,
          rotationX: 15,
          rotationY: 10,
          duration: 2 + (i % 2), 
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      });

    }, root);

    return () => {
      magneticCleanups.forEach((fn) => fn());
      if (rafCallback) gsap.ticker.remove(rafCallback);
      lenis?.destroy();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className={`nb-landing ${spaceGrotesk.variable} ${inter.variable}`} style={{ position: 'relative', background: 'transparent' }}>
      {/* Script External: diubah ke afterInteractive agar lebih cepat termuat */}
      <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" strategy="afterInteractive" />

      {/* 3D Background */}
      <RunrobrunGooBackground onFallback={() => setWebGLFailed(true)} />

      {/* FALLBACK CSS BLOB */}
      {webGLFailed && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden', zIndex: -2 }}>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
      )}

      {/* NAVBAR */}
      <nav style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="wrap">
          <div className="logo">
            <span className="logo-badge floating-3d-asset" style={{ display: 'inline-flex', boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.2), 0 10px 15px -3px rgba(56, 189, 248, 0.4)' }}>🎮</span> 
            NEXBILL
          </div>
          <div className={`nav-links${navOpen ? " open" : ""}`}>
            <a href="#fitur" onClick={() => setNavOpen(false)}>Fitur</a>
            <a href="#solusi" onClick={() => setNavOpen(false)}>Solusi</a>
            <a href="#harga" onClick={() => setNavOpen(false)}>Harga</a>
            <Link href="/login" onClick={() => setNavOpen(false)}>Login</Link>
            <Link href="/daftar" onClick={() => setNavOpen(false)} style={{ display: navOpen ? 'block' : 'none' }}>Daftar</Link>
          </div>
          <div className="nav-cta" style={{ display: navOpen ? 'none' : 'flex' }}>
            <Link href="/daftar" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>Daftar Sekarang</Link>
          </div>
          <button className="nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">☰</button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="hero" style={{ backgroundColor: 'transparent' }}>
        <div className="wrap hero-inner">
          <span className="eyebrow" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}>⚡ Sistem Billing All-in-One untuk Rental PlayStation</span>
          <h1 style={{ textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>Bisnis rental PS Anda makin ramai, tapi <span className="glow-text">kasnya kok gak jelas larinya?</span></h1>
          <p className="sub" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.8)', color: '#fff' }}>Baik Anda menyewakan PS4 klasik, PS5 dengan TV 4K, hingga bersiap untuk era PS6, NEXBILL menyatukan manajemen kasir, kontrol unit otomatis, booking online, sampai laporan laba rugi dalam satu sistem cerdas.</p>
          <div className="hero-ctas">
            <Link href="/daftar" className="btn btn-primary">Coba Gratis 30 Hari →</Link>
            <a href="#fitur" className="btn btn-ghost" style={{ backdropFilter: 'blur(8px)' }}>Lihat Semua Fitur</a>
          </div>
          <p className="hero-note" style={{ color: '#cbd5e1' }}>Tanpa kontrak jangka panjang · Setup dibantu tim kami · Bisa berhenti kapan saja</p>

          <div className="stat-strip" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.4)', borderRadius: '16px', padding: '10px' }}>
            <div className="stat-item" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <div className="stat-num">Support</div>
              <div className="stat-label">Kompatibel untuk TV Analog, TV Smart OS & TV Android OS</div>
            </div>
            <div className="stat-item" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <div className="stat-num">Real-Time</div>
              <div className="stat-label">Pantau omzet & unit jalan dari HP</div>
            </div>
            <div className="stat-item" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <div className="stat-num">0% Bocor</div>
              <div className="stat-label">Sistem hitung otomatis per detik</div>
            </div>
            <div className="stat-item" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <div className="stat-num">24 Jam</div>
              <div className="stat-label">Sistem booking online mandiri</div>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION: SOLUSI - Background dibuat transparan agar animasi 3D terlihat */}
      <section id="solusi" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Kenapa Butuh Sistem Ini</div>
            <h2>Masalah yang sering dialami pemilik rental PS</h2>
            <p>Bukan karena sepi pelanggan — kebanyakan kebocoran rental PS terjadi diam-diam di pencatatan shift harian.</p>
          </div>
          <div className="pain-grid">
            <div className="pain-card" style={{ 
              backdropFilter: 'blur(20px)', 
              backgroundColor: 'rgba(13, 21, 38, 0.65)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)', 
              boxShadow: '0 25px 40px -10px rgba(0,0,0,0.5)'
            }}>
              <div className="icon floating-3d-asset" style={{ display: 'inline-block' }}>💸</div>
              <h3>Kebocoran kas yang gak kelihatan</h3>
              <p>Selisih hitung durasi antar shift — dikali puluhan transaksi sehari, bisa jadi kebocoran jutaan rupiah sebulan tanpa disadari siapa pun.</p>
            </div>
            <div className="pain-card" style={{ 
              backdropFilter: 'blur(20px)', 
              backgroundColor: 'rgba(13, 21, 38, 0.65)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 40px -10px rgba(0,0,0,0.5)'
            }}>
              <div className="icon floating-3d-asset" style={{ display: 'inline-block' }}>📺</div>
              <h3>Manajemen Unit PS/TV Berantakan</h3>
              <p>Tiap unit (PS4, PS5) punya kondisi berbeda. Tanpa pencatatan per unit, pelanggan gampang komplain karena salah dikasih unit.</p>
            </div>
            <div className="pain-card" style={{ 
              backdropFilter: 'blur(20px)', 
              backgroundColor: 'rgba(13, 21, 38, 0.65)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 40px -10px rgba(0,0,0,0.5)'
            }}>
              <div className="icon floating-3d-asset" style={{ display: 'inline-block' }}>🕹️</div>
              <h3>Matiin/Nyalain TV Masih Manual</h3>
              <p>Kasir harus jalan ke setiap unit untuk nyalain/matiin TV dan PS secara manual setiap sesi — buang waktu dan rawan lewat batas waktu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: FITUR */}
      <section id="fitur" style={{ backgroundColor: 'transparent' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Fitur Lengkap</div>
            <h2>Semua yang dibutuhkan rental PS, dalam satu sistem</h2>
          </div>
          <div className="feat-grid">
            {FEATURES.map((f) => (
              <div className="feat-card" key={f.title} style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.5)' }}>
                <div className="feat-icon floating-3d-asset" style={{ boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.1), 0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: HARGA & ADD-ONS */}
      <section id="harga" style={{ backgroundColor: 'transparent' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Harga</div>
            <h2>Satu harga, semua fitur</h2>
            <p>Sistem all-in-one tanpa biaya tersembunyi. Coba gratis 30 hari sebelum berlangganan.</p>
          </div>

          <div className="pricing-wrap">
            <div className="price-card" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(13, 21, 38, 0.65)' }}>
              <span className="price-badge">Harga Promo</span>
              <div className="price-plan">Paket Lengkap / Outlet</div>
              <div className="price-old">Rp399.000</div>
              <div className="price-now"><span className="amount">Rp249.000</span><span className="period">/bulan</span></div>
              <div className="price-save">Hemat Rp150.000 setiap bulan</div>
              <ul className="price-feats">
                <li><span className="check">✓</span> Termasuk hingga Unlimited konsol, User, & Outlet</li>
                <li><span className="check">✓</span> Semua fitur — kasir, booking, laporan keuangan & Akuntansi</li>
                <li><span className="check">✓</span> Fitur Bank Data penilaian customer (fraud)</li>
                <li><span className="check">✓</span> Kontrol TV otomatis (android system & smart plug)</li>
                <li><span className="check">✓</span> Update fitur baru gratis selamanya</li>
                <li><span className="check">✓</span> Fitur tambahan lainnya super lengkap</li>
                <li><span className="check">✓</span> Support prioritas via WhatsApp</li>
              </ul>
              <Link href="/daftar" className="btn btn-primary btn-block">Mulai Berlangganan</Link>
            </div>
          </div>

          <div className="addon-grid">
            <div className="addon-card" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.5)' }}>
              <div className="a-icon floating-3d-asset">🎮</div>
              <h4>Konsol Tambahan</h4>
              <div className="a-price">Free Tidak Ada Biaya</div>
              <p>Untuk outlet unlimited konsol</p>
            </div>

            {/* <model-viewer> UNTUK 3D PRODUCT SHOWCASE */}
            <div className="addon-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.5)' }}>
              <div style={{ width: '120px', height: '120px', marginBottom: '10px' }}>
                <model-viewer 
                  src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
                  poster="/poster-fallback.png"
                  alt="3D Smart Plug"
                  auto-rotate
                  camera-controls
                  disable-zoom
                  style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                  shadow-intensity="1"
                ></model-viewer>
              </div>
              <h4>Smart Plug Systems</h4>
              <div className="a-price">Rp275.000 /unit</div>
              <p>Untuk kontrol otomatis nyala/mati TV</p>
            </div>

            <div className="addon-card" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.5)' }}>
              <div className="a-icon floating-3d-asset">🛠️</div>
              <h4>Jasa Setup Jarak Jauh</h4>
              <div className="a-price">Rp125.000 sekali bayar</div>
              <p>Tim kami bantu setup penuh via remote</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: FAQ */}
      <section id="faq" style={{ backgroundColor: 'transparent' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">FAQ</div>
            <h2>Pertanyaan yang sering ditanyakan</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((item, i) => (
              <div className={`faq-item${openFaq === i ? " open" : ""}`} key={item.q} style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(13, 21, 38, 0.5)' }}>
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q} <span className="plus">+</span>
                </div>
                <div className="faq-a"><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="wrap">
          <div>
            <div className="logo" style={{ fontSize: 16, marginBottom: '16px' }}>
              <span className="logo-badge" style={{ width: 28, height: 28, fontSize: 14 }}>🎮</span> NEXBILL
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '13.5px', maxWidth: '350px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '8px' }}><strong>Alamat:</strong><br/> Komp. Bumi Adipura Jl. Tulip V No. 40 RT.02/RW 04 Kel. Rancabolang Kec. Gedebage Kota Bandung, Jawa Barat, Indonesia 40295</p>
              <p style={{ marginBottom: '4px' }}><strong>Telepon:</strong> +62 8557 3333 20</p>
              <p><strong>Email:</strong> sales@nexbill.id</p>
            </div>
          </div>
          <div className="foot-links">
            <a href="#fitur">Fitur</a>
            <a href="#solusi">Solusi</a>
            <a href="#harga">Harga</a>
            <Link href="/login">Login</Link>
            <Link href="/daftar">Daftar</Link>
          </div>
          <div className="copyright" style={{ width: '100%', textAlign: 'center', marginTop: '32px' }}>
            © 2026 NEXBILL Billing System. Semua hak dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}