import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan layanan NEXBILL.",
  alternates: { canonical: `${SITE_URL}/syarat-ketentuan` },
};

export default function SyaratKetentuanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
