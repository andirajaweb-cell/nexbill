import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Kebijakan Cookie",
  description: "Kebijakan penggunaan cookie NEXBILL — bagaimana kami menggunakan cookie untuk meningkatkan pengalaman Anda di website kami.",
  alternates: { canonical: `${SITE_URL}/kebijakan-cookie` },
};

export default function KebijakanCookieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
