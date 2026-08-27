/**
 * This is NOT a booking page — it's a deliberate dead end. Each outlet/merchant on the
 * platform has its own public booking page at /book/[slug] (see src/app/book/[slug]/page.tsx
 * and src/lib/outlets/slug.ts). This bare /book route used to silently show whichever outlet
 * happened to be first in the shared database to every visitor, regardless of which merchant's
 * link they'd actually clicked — a real cross-tenant data leak, not just a cosmetic gap. Rather
 * than guess or default to some outlet here, it just tells the visitor their link is incomplete.
 */
export default function BookIndexPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-3 rounded-xl border border-blue-500/15 bg-[#0d1526]/80 backdrop-blur-md p-8">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">Link Booking Tidak Lengkap</h1>
        <p className="text-sm text-[#93a2c4]">
          Setiap outlet punya link booking sendiri. Minta link lengkapnya (formatnya{" "}
          <code className="text-blue-300">/book/nama-outlet</code>) langsung ke outlet/merchant yang ingin kamu datangi.
        </p>
      </div>
    </div>
  );
}
