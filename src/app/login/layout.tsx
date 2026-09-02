import type { Metadata } from "next";
import { SITE_URL } from "../layout";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun NEXBILL Anda untuk mengelola dashboard rental PlayStation.",
  // Kept indexable (not noindex) on purpose — SaaS "login" pages are legitimate branded
  // navigational search targets ("nexbill login"), same as competitors' login pages.
  alternates: { canonical: `${SITE_URL}/login` },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
