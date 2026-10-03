"use client";
import { useEffect } from "react";

/**
 * Daftarkan /sw.js (halaman offline untuk aplikasi Android TWA & PWA). Hanya di produksi dan
 * di luar situs landing (nexbill.id) — aplikasi membungkus dashboard.nexbill.id.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const host = window.location.hostname;
    if (host === "nexbill.id" || host === "www.nexbill.id") return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
