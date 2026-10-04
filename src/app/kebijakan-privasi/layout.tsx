import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan Privasi NEXBILL — data yang dikumpulkan, penggunaannya, pihak ketiga, keamanan, penyimpanan, hak Anda sesuai UU PDP, dan cara menghapus akun.",
  alternates: { canonical: `${SITE_URL}/kebijakan-privasi` },
};

export default function KebijakanPrivasiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
