import type { Metadata } from "next";

/**
 * noindex: halaman ini adalah papan tampilan sebuah perangkat, bukan halaman untuk dibaca orang
 * lewat pencarian. Tanpa ini, /tv bisa terindeks dan muncul di hasil Google sebagai halaman kosong
 * milik NEXBILL — merugikan SEO domain utama tanpa memberi manfaat apa pun.
 */
export const metadata: Metadata = {
  title: "NEXBILL TV",
  robots: { index: false, follow: false },
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black text-white overflow-hidden">{children}</div>;
}
