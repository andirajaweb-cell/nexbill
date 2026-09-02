import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

export const metadata = {
  title: "Kebijakan Refund & Pembatalan — NEXBILL",
  description: "Kebijakan pengembalian dana dan pembatalan langganan NEXBILL.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-cyan-300">{title}</h2>
      <div className="text-sm text-neutral-400 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05070f] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Kebijakan Refund & Pembatalan" }]} />
          <Link href="/dashboard/billing" className="text-xs text-cyan-400 hover:underline mt-2 inline-block">
            ← Kembali ke Halaman Langganan
          </Link>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title mt-2">Kebijakan Refund &amp; Pembatalan</h1>
          <p className="text-sm text-neutral-500 mt-1">Berlaku untuk semua outlet/merchant pengguna NEXBILL. Terakhir diperbarui: Agustus 2026.</p>
        </div>

        <Section title="1. Ketentuan Umum">
          <p>
            Kebijakan ini menjelaskan kapan dan bagaimana pengembalian dana (refund) bisa diajukan untuk pembayaran yang dilakukan di halaman
            Langganan NEXBILL — mencakup biaya langganan bulanan, pembelian Smart Plug, Jasa Setup Jarak Jauh, AI Add-on, dan Konsol Tambahan.
            Tujuannya sederhana: melindungi pelanggan dari kesalahan sistem atau barang cacat, sekaligus melindungi NEXBILL dari pembatalan
            sepihak atas layanan/barang yang sudah benar-benar terpakai atau terkirim.
          </p>
        </Section>

        <Section title="2. Masa Percobaan Gratis (Trial 30 Hari)">
          <p>
            Setiap outlet baru mendapat 30 hari masa percobaan gratis tanpa perlu memasukkan metode pembayaran apa pun. Karena tidak ada
            pembayaran yang terjadi selama masa ini, ketentuan refund pada bagian ini tidak berlaku sampai kamu benar-benar melakukan
            checkout pertama kali.
          </p>
        </Section>

        <Section title="3. Biaya Langganan Bulanan">
          <p>
            Biaya langganan periode berjalan (baik checkout pertama maupun perpanjangan) pada dasarnya tidak dapat dikembalikan setelah
            pembayaran dikonfirmasi lunas, karena akses penuh ke sistem langsung terbuka selama 30 hari sejak itu. Pengecualian yang berhak
            atas refund penuh:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pembayaran ganda (double payment) untuk tagihan yang sama akibat kesalahan sistem.</li>
            <li>Akun belum pernah login/menggunakan dashboard sama sekali sejak pembayaran, dan pengajuan refund dilakukan dalam 3x24 jam.</li>
            <li>
              Downtime/kegagalan sistem dari sisi NEXBILL yang membuat outlet tidak bisa mengakses dashboard sama sekali selama lebih dari
              24 jam berturut-turut dalam periode berjalan — berhak atas kompensasi berupa perpanjangan masa aktif sejumlah hari downtime,
              atau refund prorata bila diminta.
            </li>
          </ul>
          <p>
            Di luar itu, langganan yang sudah aktif berjalan sampai akhir periode meskipun outlet berhenti memakainya lebih awal — tidak ada
            potongan/refund prorata untuk sisa hari yang tidak terpakai atas keputusan pelanggan sendiri.
          </p>
        </Section>

        <Section title="4. Perangkat Smart Plug (Barang Fisik)">
          <p>Karena ini barang fisik yang dikirim ke alamat outlet, berlaku aturan berbeda dari biaya langganan:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-neutral-300">Barang rusak/cacat produksi/tidak berfungsi saat pertama diterima</span> — berhak atas
              penggantian unit baru (replacement) atau refund penuh, dengan melapor dalam 7 hari sejak barang diterima.
            </li>
            <li>
              <span className="text-neutral-300">Salah kirim (varian/jumlah tidak sesuai pesanan)</span> — NEXBILL menanggung biaya
              pengiriman balik dan mengirimkan unit yang benar atau refund penuh, tanpa syarat tambahan.
            </li>
            <li>
              <span className="text-neutral-300">Berubah pikiran (tidak jadi dipakai) padahal barang normal</span> — bisa dikembalikan dalam
              7 hari sejak diterima selama unit belum dipasang/dicoba tersambung listrik dan kemasan masih lengkap, dipotong biaya
              pengiriman balik. Setelah 7 hari atau unit sudah pernah dipasang, pembelian dianggap final.
            </li>
          </ul>
        </Section>

        <Section title="5. Jasa Setup Jarak Jauh">
          <p>
            Karena ini jasa (waktu vendor), berlaku aturan berbasis progres pengerjaan: dibatalkan sebelum vendor mulai mengerjakan → refund
            penuh. Vendor sudah terjadwal/mulai menghubungi kontak PIC → refund 50%. Setup sudah selesai dikerjakan (Smart Plug sudah
            tersambung dan berfungsi) → tidak dapat dikembalikan, karena jasa sudah sepenuhnya diberikan.
          </p>
        </Section>

        <Section title="6. AI Add-on (Business Assistant &amp; Insights)">
          <p>
            AI Add-on ditagih bulanan terpisah dari langganan utama. Karena setiap pemakaiannya membebankan biaya nyata ke penyedia AI,
            berlaku: belum pernah dipakai sama sekali sejak aktivasi, dan pengajuan dalam 3x24 jam → refund penuh. Sudah pernah dipakai
            (walau sekali) → tidak dapat dikembalikan untuk periode berjalan, tapi tidak diperpanjang otomatis ke bulan berikutnya tanpa
            aktivasi ulang manual (lihat bagian 8).
          </p>
        </Section>

        <Section title="7. Konsol Tambahan">
          <p>
            Biaya konsol tambahan mengikuti aturan yang sama dengan biaya langganan bulanan (bagian 3) karena sifatnya adalah kuota akses
            sistem, bukan barang atau jasa terpisah.
          </p>
        </Section>

        <Section title="8. Pembatalan Langganan">
          <p>
            Kamu bisa berhenti berlangganan kapan saja, tanpa penalti dan tanpa perlu alasan — cukup tidak membayar tagihan perpanjangan
            berikutnya saat jatuh tempo. Akses tetap terbuka penuh sampai akhir periode yang sudah dibayar, baru kemudian masuk masa
            tenggang lalu ditangguhkan (lihat status langganan di halaman Langganan). Data outlet tidak dihapus otomatis — tetap tersimpan
            dan bisa diaktifkan kembali kapan pun dengan membayar tagihan yang tertunda.
          </p>
        </Section>

        <Section title="9. Tidak Ada Penagihan Otomatis Tanpa Persetujuan">
          <p>
            NEXBILL tidak menyimpan data kartu dan tidak pernah menagih/mendebit apa pun secara otomatis. Setiap pembayaran — checkout
            pertama, perpanjangan, maupun AI Add-on — memerlukan kamu sendiri yang memilih metode pembayaran dan menyelesaikannya secara
            aktif di halaman Langganan. Tidak akan ada tagihan mengejutkan tanpa tindakan dari kamu terlebih dahulu.
          </p>
        </Section>

        <Section title="10. Kesalahan Sistem atau Force Majeure">
          <p>
            Untuk kejadian di luar kendali wajar kedua pihak (bencana, gangguan penyedia layanan pihak ketiga, dsb.) yang membuat sistem
            tidak bisa diakses berkepanjangan, NEXBILL akan menawarkan kompensasi berupa perpanjangan masa aktif setara hari terdampak,
            atau refund prorata bila kompensasi tersebut tidak relevan bagi outlet yang bersangkutan.
          </p>
        </Section>

        <Section title="11. Cara Mengajukan Refund">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Hubungi tim NEXBILL lewat WhatsApp/email support dengan menyertakan nomor invoice yang bersangkutan.</li>
            <li>Jelaskan alasan pengajuan dan sertakan bukti pendukung bila ada (foto barang cacat, tangkapan layar error, dsb.).</li>
            <li>Tim NEXBILL akan meninjau dan memberi keputusan dalam maksimal 3 hari kerja.</li>
            <li>Refund yang disetujui diproses dalam 3–7 hari kerja setelah keputusan disampaikan.</li>
          </ol>
        </Section>

        <Section title="12. Metode &amp; Waktu Pengembalian Dana">
          <p>
            Dana dikembalikan lewat metode yang sama dengan pembayaran asal (transfer ke rekening yang sama untuk VA, atau sesuai
            kesepakatan untuk pembayaran Cash/QRIS). Waktu pemrosesan mengikuti kebijakan masing-masing bank/penyedia pembayaran, di luar
            kendali NEXBILL setelah dana dikirim dari sisi NEXBILL.
          </p>
        </Section>

        <Section title="13. Kontak">
          <p>Pertanyaan seputar kebijakan ini bisa disampaikan langsung ke tim support NEXBILL melalui kanal yang sama dengan pengajuan refund di atas.</p>
        </Section>

        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/dashboard/billing" className="text-xs text-cyan-400 hover:underline">
            ← Kembali ke Halaman Langganan
          </Link>
          <Link href="/syarat-ketentuan" className="text-xs text-cyan-400 hover:underline">
            Syarat &amp; Ketentuan →
          </Link>
        </div>
      </div>
    </div>
  );
}
