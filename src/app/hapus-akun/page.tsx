import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

/**
 * Halaman publik "Hapus Akun" — URL ini diisi di Play Console (Keamanan data → URL penghapusan
 * akun). Google mewajibkan cara meminta penghapusan akun yang bisa diakses TANPA memasang ulang
 * aplikasi. Detail lengkap ada di Kebijakan Privasi bagian 8–9.
 */
const EMAIL = "sales@nexbill.id";
const WA = "+62 8557 3333 20";
const WA_LINK = "https://wa.me/6285573333320?text=" + encodeURIComponent("Halo NEXBILL, saya ingin menghapus akun dan data outlet saya. Nama outlet: ");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-cyan-300">{title}</h2>
      <div className="text-sm text-neutral-400 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function HapusAkunPage() {
  return (
    <div className="min-h-screen bg-[#05070f] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Hapus Akun" }]} />
          <h1 className="gm-display text-2xl font-bold gm-gradient-title mt-2">Hapus Akun NEXBILL</h1>
          <p className="text-sm text-neutral-500 mt-1">
            NEXBILL oleh Digitrajasa. Berlaku untuk akun di dashboard.nexbill.id dan aplikasi NEXBILL untuk Android.
          </p>
        </div>

        <Section title="Cara 1 — Langsung di aplikasi (paling cepat)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Masuk sebagai <strong>Owner</strong> di aplikasi NEXBILL atau dashboard.nexbill.id.</li>
            <li>Buka <strong>Pengaturan → Akun Saya</strong>, gulir ke kartu <strong>Hapus Akun &amp; Data</strong>.</li>
            <li>Tekan <strong>Kirim Kode Konfirmasi</strong> — kode 6 digit dikirim ke email Owner.</li>
            <li>Masukkan kode, ketik <strong>HAPUS</strong>, lalu tekan <strong>Hapus Akun Permanen</strong>.</li>
          </ol>
        </Section>

        <Section title="Cara 2 — Lewat email atau WhatsApp (tanpa membuka aplikasi)">
          <p>
            Kirim permintaan dari email yang terdaftar sebagai Owner ke{" "}
            <a href={`mailto:${EMAIL}?subject=Permintaan%20Hapus%20Akun%20NEXBILL`} className="text-cyan-400 hover:underline">{EMAIL}</a>{" "}
            dengan subjek <em>&quot;Permintaan Hapus Akun NEXBILL&quot;</em>, atau{" "}
            <a href={WA_LINK} target="_blank" rel="noopener" className="text-cyan-400 hover:underline">WhatsApp {WA}</a>. Sebutkan nama outlet.
            Kami akan memverifikasi bahwa Anda pemilik akun (kode ke email terdaftar) sebelum memproses.
          </p>
        </Section>

        <Section title="Apa yang dihapus dan kapan">
          <ul className="list-disc pl-5 space-y-1">
            <li>Begitu dikonfirmasi: akun Owner, akun staf outlet, dan outlet langsung <strong>dinonaktifkan</strong>; langganan dihentikan.</li>
            <li>
              Paling lambat <strong>30 hari</strong> kemudian: data pribadi dihapus atau dianonimkan — nama, email, telepon, alamat, data
              pelanggan &amp; member, data/foto identitas penyewa, rekening bank, NPWP, logo, kredensial perangkat.
            </li>
            <li>
              Yang tetap disimpan (tanpa identitas): catatan transaksi, laporan keuangan, dan invoice yang wajib disimpan menurut hukum,
              selama jangka waktu yang diwajibkan.
            </li>
            <li>Ingin membatalkan? Hubungi {EMAIL} atau WhatsApp {WA} sebelum 30 hari berakhir.</li>
          </ul>
        </Section>

        <Section title="Staf dan pelanggan outlet">
          <p>
            Akun staf (bukan Owner) dihapus aksesnya oleh Owner di menu <strong>Staf &amp; Hak Akses</strong>. Pelanggan outlet yang ingin
            datanya dihapus dapat menghubungi outlet terkait atau kami melalui kontak di atas.
          </p>
        </Section>

        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/kebijakan-privasi#hapus-akun" className="text-xs text-cyan-400 hover:underline">Kebijakan Privasi →</Link>
          <Link href="/" className="text-xs text-cyan-400 hover:underline">← Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}
