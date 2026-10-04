import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Hapus Akun NEXBILL",
  description: "Cara menghapus akun NEXBILL dan data outlet: langsung di aplikasi atau lewat email/WhatsApp. Data dihapus paling lambat 30 hari.",
  alternates: { canonical: `${SITE_URL}/hapus-akun` },
};

export default function HapusAkunLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
