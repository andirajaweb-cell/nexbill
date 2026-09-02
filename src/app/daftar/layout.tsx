import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Daftar Gratis",
  description: "Daftar NEXBILL gratis dan mulai kelola rental PlayStation Anda dalam satu sistem: kasir, kontrol TV otomatis, booking online, dan laporan keuangan.",
  alternates: { canonical: `${SITE_URL}/daftar` },
};

export default function DaftarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
