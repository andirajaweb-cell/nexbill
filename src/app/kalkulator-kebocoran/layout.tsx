import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";

export const metadata: Metadata = {
  title: "Kalkulator Kebocoran Rental PS — NEXBILL",
  description: "Hitung berapa uang rental PS yang bocor tiap bulan dari selisih kas, menit main yang tidak tertagih, dan listrik TV yang menyala tanpa sesi.",
  alternates: { canonical: `${SITE_URL}/kalkulator-kebocoran` },
};

export default function LeakageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
