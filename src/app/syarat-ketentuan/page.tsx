import Link from "next/link";

export const metadata = {
  title: "Syarat & Ketentuan — NEXBILL",
  description: "Syarat dan ketentuan penggunaan layanan NEXBILL.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-cyan-300">{title}</h2>
      <div className="text-sm text-neutral-400 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05070f] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard/billing" className="text-xs text-cyan-400 hover:underline">
            ← Kembali ke Halaman Langganan
          </Link>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title mt-2">Syarat &amp; Ketentuan</h1>
          <p className="text-sm text-neutral-500 mt-1">Berlaku untuk semua pengguna nextbill.id. Terakhir diperbarui: Agustus 2026.</p>
        </div>

        <Section title="1. Definisi & Ruang Lingkup">
          <p>
            "NEXBILL" merujuk pada layanan software-as-a-service (SaaS) yang diakses lewat nextbill.id, mencakup kasir (POS), manajemen
            rental PlayStation, kontrol perangkat TV/konsol jarak jauh, booking online, membership, akuntansi, laporan, dan AI Assistant.
            "Outlet" atau "Merchant" adalah bisnis yang mendaftar dan menggunakan NEXBILL. "Pengguna" adalah setiap akun staf (Owner,
            Manager, Kasir, dsb.) yang login ke dashboard outlet tersebut. Dengan mendaftar atau menggunakan NEXBILL, Outlet dan setiap
            Penggunanya dianggap telah membaca, memahami, dan menyetujui Syarat &amp; Ketentuan ini.
          </p>
        </Section>

        <Section title="2. Pendaftaran Akun & Kelayakan">
          <ul className="list-disc pl-5 space-y-1">
            <li>Pendaftar harus berusia minimal 18 tahun atau memiliki kewenangan sah untuk mengikat bisnisnya pada perjanjian ini.</li>
            <li>Informasi yang didaftarkan (nama usaha, email, kontak) harus akurat dan diperbarui bila berubah.</li>
            <li>
              Akun Owner bertanggung jawab penuh atas seluruh akun staf yang dibuat di bawah outlet tersebut, termasuk pengaturan hak akses
              (role &amp; permission) masing-masing staf.
            </li>
            <li>Satu email hanya dapat digunakan untuk satu akun login — lihat menu Staf &amp; Hak Akses untuk menambah pengguna lain.</li>
          </ul>
        </Section>

        <Section title="3. Deskripsi Layanan">
          <p>
            NEXBILL menyediakan alat bantu operasional untuk bisnis rental PlayStation/warnet gaming dan sejenisnya: transaksi kasir,
            sesi rental (mulai/jeda/lanjut/selesai), booking online publik, kontrol nyala/mati perangkat TV/konsol (lewat Smart Plug atau
            kontrol Android TV, termasuk opsi Relay Agent untuk server yang di-hosting di cloud), membership &amp; loyalti, akuntansi
            (jurnal, laporan keuangan), manajemen staf berbasis peran, serta AI Assistant untuk bantuan analisis dan operasional. Daftar
            lengkap fitur dan cara pakainya tersedia di halaman Bantuan &amp; Panduan pada dashboard.
          </p>
          <p>
            NEXBILL dapat menambah, mengubah, atau menghentikan fitur tertentu dari waktu ke waktu untuk peningkatan layanan, dengan
            pemberitahuan wajar melalui dashboard bila perubahan tersebut berdampak signifikan pada penggunaan sehari-hari.
          </p>
        </Section>

        <Section title="4. Masa Percobaan & Langganan Berbayar">
          <p>
            Outlet baru mendapat masa percobaan gratis 30 hari tanpa perlu memasukkan metode pembayaran apa pun. Setelah masa percobaan
            berakhir, akses penuh memerlukan langganan berbayar sesuai paket yang berlaku, dibayar manual lewat halaman Langganan (Cash,
            QRIS, atau Virtual Account) — NEXBILL tidak menyimpan data kartu dan tidak melakukan penagihan otomatis tanpa tindakan aktif
            dari Outlet. Ketentuan lengkap soal pengembalian dana dan pembatalan langganan diatur terpisah di{" "}
            <Link href="/kebijakan-refund" className="text-cyan-400 hover:underline">
              Kebijakan Refund &amp; Pembatalan
            </Link>
            , yang menjadi satu kesatuan dengan dokumen ini.
          </p>
        </Section>

        <Section title="5. Kewajiban Pengguna">
          <ul className="list-disc pl-5 space-y-1">
            <li>Menjaga kerahasiaan email dan kata sandi akun — segala aktivitas dari akun yang bersangkutan menjadi tanggung jawab pemiliknya.</li>
            <li>Menggunakan NEXBILL hanya untuk keperluan bisnis yang sah, tidak untuk aktivitas ilegal, penipuan, atau merugikan pihak lain.</li>
            <li>Tidak melakukan reverse engineering, scraping otomatis di luar API resmi, atau upaya mengganggu keamanan/ketersediaan sistem.</li>
            <li>Tidak membagikan akses akun ke pihak yang tidak berwenang di luar staf outlet sendiri.</li>
            <li>Bertanggung jawab atas keakuratan data yang diinput sendiri (harga, transaksi, data pelanggan, dsb.) — NEXBILL menyediakan alat, bukan pengganti pengawasan operasional outlet.</li>
          </ul>
        </Section>

        <Section title="6. Kepemilikan & Penggunaan Data">
          <p>
            Seluruh data transaksi, pelanggan, dan operasional yang diinput Outlet ke dalam NEXBILL tetap menjadi milik Outlet sepenuhnya.
            NEXBILL bertindak sebagai penyedia layanan pemrosesan data tersebut, bukan pemiliknya, dan tidak akan menjual data Outlet ke
            pihak ketiga. Outlet dapat mengekspor datanya sendiri lewat fitur laporan yang tersedia di dashboard. Bila langganan berakhir
            atau akun ditangguhkan, data tetap disimpan (tidak langsung dihapus) untuk jangka waktu wajar guna memudahkan aktivasi ulang,
            sebelum akhirnya dapat dihapus permanen sesuai kebijakan retensi NEXBILL.
          </p>
        </Section>

        <Section title="7. Kontrol Perangkat Jarak Jauh (Smart Plug / Android TV / Relay Agent)">
          <p>
            Fitur kontrol nyala/mati TV atau konsol bergantung pada perangkat pihak ketiga (Smart Plug, TV Android) dan koneksi
            internet/jaringan lokal outlet sendiri. NEXBILL tidak bertanggung jawab atas kegagalan fungsi perangkat pihak ketiga,
            gangguan internet/listrik di lokasi outlet, atau keterlambatan respons akibat hal-hal di luar kendali wajar sistem NEXBILL.
            Outlet disarankan tetap memiliki cara manual (remote/tombol fisik) sebagai cadangan.
          </p>
        </Section>

        <Section title="8. Fitur AI Assistant & Insights">
          <p>
            Fitur AI menyediakan bantuan analisis, ringkasan, dan saran operasional berbasis data outlet. Output AI dapat mengandung
            kesalahan atau ketidakakuratan dan tidak dimaksudkan sebagai pengganti nasihat profesional (akuntan, pajak, hukum, atau
            bisnis). Keputusan akhir tetap menjadi tanggung jawab Outlet — selalu verifikasi informasi penting sebelum digunakan untuk
            pengambilan keputusan.
          </p>
        </Section>

        <Section title="9. Ketersediaan Layanan">
          <p>
            NEXBILL berupaya menjaga layanan tetap dapat diakses secara konsisten, namun tidak menjamin ketersediaan 100% tanpa gangguan.
            Pemeliharaan terjadwal, pembaruan sistem, atau gangguan dari penyedia infrastruktur pihak ketiga dapat menyebabkan layanan
            tidak dapat diakses sementara. Gangguan signifikan akan diinformasikan lewat dashboard bila memungkinkan.
          </p>
        </Section>

        <Section title="10. Batasan Tanggung Jawab">
          <p>
            Sepanjang diizinkan oleh hukum yang berlaku, NEXBILL tidak bertanggung jawab atas kerugian tidak langsung, kehilangan
            keuntungan/omzet, atau kerugian konsekuensial lain yang timbul dari penggunaan layanan. Total tanggung jawab NEXBILL atas
            klaim apa pun terkait layanan ini dibatasi maksimal sejumlah biaya langganan yang telah dibayarkan Outlet dalam 1 (satu) bulan
            terakhir sebelum klaim diajukan.
          </p>
        </Section>

        <Section title="11. Kerahasiaan & Keamanan Data">
          <p>
            NEXBILL menerapkan praktik keamanan yang wajar (enkripsi kata sandi, kontrol akses berbasis peran, dsb.) untuk melindungi data
            Outlet. Meski demikian, tidak ada sistem yang sepenuhnya bebas risiko — Outlet tetap disarankan menjaga kerahasiaan kredensial
            login dan segera melaporkan ke NEXBILL bila mencurigai adanya akses tidak sah ke akunnya.
          </p>
        </Section>

        <Section title="12. Penghentian Layanan">
          <p>
            Outlet dapat berhenti menggunakan NEXBILL kapan saja dengan tidak melanjutkan pembayaran perpanjangan (lihat Kebijakan Refund
            &amp; Pembatalan). NEXBILL berhak menangguhkan atau menghentikan akses suatu akun bila ditemukan pelanggaran nyata terhadap
            Syarat &amp; Ketentuan ini (penyalahgunaan, aktivitas ilegal, atau tunggakan pembayaran melewati masa tenggang), dengan
            pemberitahuan wajar sebelumnya kecuali dalam kasus yang memerlukan tindakan segera untuk melindungi sistem atau pengguna lain.
          </p>
        </Section>

        <Section title="13. Perubahan Ketentuan">
          <p>
            NEXBILL dapat memperbarui Syarat &amp; Ketentuan ini dari waktu ke waktu. Perubahan yang bersifat signifikan akan
            diinformasikan melalui dashboard atau email terdaftar. Penggunaan layanan yang berlanjut setelah perubahan berlaku dianggap
            sebagai persetujuan atas ketentuan yang telah diperbarui.
          </p>
        </Section>

        <Section title="14. Hukum yang Berlaku & Penyelesaian Sengketa">
          <p>
            Syarat &amp; Ketentuan ini tunduk pada hukum Republik Indonesia. Setiap perselisihan yang timbul akan diupayakan penyelesaian
            secara musyawarah terlebih dahulu antara Outlet dan NEXBILL sebelum menempuh jalur penyelesaian sengketa lain sesuai ketentuan
            hukum yang berlaku.
          </p>
        </Section>

        <Section title="15. Kontak">
          <p>Pertanyaan seputar Syarat &amp; Ketentuan ini bisa disampaikan lewat kanal support resmi NEXBILL.</p>
        </Section>

        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/dashboard/billing" className="text-xs text-cyan-400 hover:underline">
            ← Kembali ke Halaman Langganan
          </Link>
          <Link href="/kebijakan-refund" className="text-xs text-cyan-400 hover:underline">
            Kebijakan Refund &amp; Pembatalan →
          </Link>
        </div>
      </div>
    </div>
  );
}
