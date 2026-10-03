import type { Metadata } from "next";

// Halaman QR bilik bersifat pribadi per unit — jangan sampai diindeks mesin pencari.
export const metadata: Metadata = {
  title: "NEXBILL — Bilik Saya",
  robots: { index: false, follow: false },
};

export default function UnitQrLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#05070f] text-neutral-100">{children}</div>;
}
