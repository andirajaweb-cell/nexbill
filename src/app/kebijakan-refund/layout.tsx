import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Kebijakan Refund",
  description: "Kebijakan pengembalian dana (refund) untuk layanan berlangganan NEXBILL.",
  alternates: { canonical: `${SITE_URL}/kebijakan-refund` },
};

export default function KebijakanRefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
