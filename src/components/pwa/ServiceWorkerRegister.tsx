"use client";
import { useEffect } from "react";

/**
 * Daftarkan /sw.js (halaman offline + Mode Offline kasir untuk aplikasi Android TWA, PWA, dan
 * browser). Hanya di produksi; di situs landing (nexbill.id) hanya saat membuka dashboard.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const host = window.location.hostname;
    // Landing site visitors don't need a service worker — except staff opening the dashboard there,
    // who need it for Mode Offline (cached cashier page, see public/sw.js).
    if ((host === "nexbill.id" || host === "www.nexbill.id") && !window.location.pathname.startsWith("/dashboard")) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
