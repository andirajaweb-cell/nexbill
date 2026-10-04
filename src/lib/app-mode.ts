"use client";
import { useEffect, useState } from "react";

/**
 * "Mode aplikasi Android" — NEXBILL dibuka dari aplikasi Play Store (Trusted Web Activity,
 * package id.nexbill.app). Aturan pembayaran Google Play: layanan DIGITAL (langganan Starter/Pro,
 * AI Add-on, saldo deposit langganan) tidak boleh dibeli di dalam aplikasi tanpa Google Play
 * Billing, dan aplikasi tidak boleh berisi tombol/tautan ke pembayaran di luar. Jadi di mode ini
 * semua tombol bayar/checkout langganan disembunyikan dan diganti kalimat netral tanpa tautan
 * ("consumption-only"). Barang fisik (Toko: smart plug) tetap boleh dibeli.
 *
 * Deteksi: TWA membuka halaman pertama dengan document.referrer "android-app://<package>" dan
 * start URL berisi ?source=twa. Ditandai di sessionStorage (bukan localStorage) karena TWA
 * berbagi penyimpanan dengan Chrome — tab Chrome biasa punya sessionStorage sendiri sehingga
 * pembayaran di browser tetap tampil normal.
 */
export const ANDROID_APP_PACKAGE = "id.nexbill.app";
const KEY = "nb_android_app";

export function detectAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(KEY) === "1") return true;
    const fromReferrer = document.referrer.startsWith(`android-app://${ANDROID_APP_PACKAGE}`);
    const fromQuery = new URLSearchParams(window.location.search).get("source") === "twa";
    if (fromReferrer || fromQuery) {
      window.sessionStorage.setItem(KEY, "1");
      return true;
    }
  } catch {
    // sessionStorage bisa diblokir — anggap bukan aplikasi.
  }
  return false;
}

/** Hook: true kalau halaman berjalan di aplikasi NEXBILL Android. Selalu false saat render server. */
export function useIsAndroidApp(): boolean {
  const [isApp, setIsApp] = useState(false);
  useEffect(() => {
    setIsApp(detectAndroidApp());
  }, []);
  return isApp;
}
