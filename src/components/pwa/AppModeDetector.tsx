"use client";
import { useEffect } from "react";
import { detectAndroidApp } from "@/lib/app-mode";

/** Tandai sesi aplikasi Android sejak halaman pertama (sebelum redirect login dsb.). Lihat lib/app-mode.ts. */
export function AppModeDetector() {
  useEffect(() => {
    detectAndroidApp();
  }, []);
  return null;
}
