import Link from "next/link";

// Custom branded 404 — this file is a Next.js App Router convention: it's automatically rendered
// (with a correct HTTP 404 status code, not 200) for any route that doesn't match, site-wide.
// Before this file existed, unmatched routes fell back to Next's generic unstyled 404, which is
// both off-brand and a worse signal to keep visitors from bouncing immediately.
export const metadata = {
  title: "Halaman Tidak Ditemukan",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-blue-500/15 bg-[#0d1526]/80 backdrop-blur-md p-8">
        <div className="text-sm font-bold tracking-widest text-blue-400">NEXBILL</div>
        <h1 className="text-5xl font-black bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">404</h1>
        <p className="text-sm text-[#93a2c4]">
          Halaman yang kamu cari tidak ditemukan atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
