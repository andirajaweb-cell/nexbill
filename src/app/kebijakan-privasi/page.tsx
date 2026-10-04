import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

/**
 * Kebijakan Privasi NEXBILL — wajib untuk Google Play (URL publik) dan UU No. 27 Tahun 2022
 * tentang Pelindungan Data Pribadi (UU PDP). Isinya disusun dari data & layanan pihak ketiga
 * yang benar-benar dipakai aplikasi (lihat src/db/schema.ts dan src/lib/*). Kalau ada layanan
 * pihak ketiga baru atau jenis data baru, perbarui bagian 3 & 5 di sini dan tanggal di atas.
 */

const LAST_UPDATED = "4 Oktober 2026";
const CONTACT_EMAIL = "sales@nexbill.id";
const CONTACT_WA = "+62 8557 3333 20";
const CONTACT_ADDRESS = "Komp. Bumi Adipura Jl. Tulip V No. 40 RT.02/RW 04, Kel. Rancabolang, Kec. Gedebage, Kota Bandung, Jawa Barat 40295, Indonesia";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-2 scroll-mt-6">
      <h2 className="text-base font-semibold text-cyan-300">{title}</h2>
      <div className="text-sm text-neutral-400 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05070f] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Kebijakan Privasi" }]} />
          <Link href="/" className="text-xs text-cyan-400 hover:underline mt-2 inline-block">
            ← Kembali ke Beranda
          </Link>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title mt-2">Kebijakan Privasi</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Berlaku untuk situs nexbill.id, dashboard NEXBILL (dashboard.nexbill.id), dan aplikasi NEXBILL untuk Android. Terakhir
            diperbarui: {LAST_UPDATED}.
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            <a href="#english" className="text-cyan-400 hover:underline">English summary below ↓</a>
          </p>
        </div>

        <Section title="1. Tentang Kebijakan Ini">
          <p>
            NEXBILL adalah sistem billing, kasir, dan manajemen usaha untuk rental PlayStation dan sejenisnya. NEXBILL dikembangkan dan
            dikelola oleh <strong>Digitrajasa</strong> (&quot;kami&quot;). Kebijakan ini menjelaskan data apa yang kami kumpulkan, untuk apa,
            dengan siapa data dibagikan, berapa lama disimpan, dan hak Anda atas data tersebut, sesuai Undang-Undang No. 27 Tahun 2022
            tentang Pelindungan Data Pribadi (UU PDP).
          </p>
          <p>
            Dengan mendaftar atau memakai NEXBILL, Anda memahami pemrosesan data sebagaimana dijelaskan di sini. Kebijakan ini dibaca
            bersama <Link href="/syarat-ketentuan" className="text-cyan-400 hover:underline">Syarat &amp; Ketentuan</Link> dan{" "}
            <Link href="/kebijakan-cookie" className="text-cyan-400 hover:underline">Kebijakan Cookie</Link>.
          </p>
        </Section>

        <Section title="2. Peran Kami: Pengendali dan Pemroses Data">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Untuk data <strong>akun pemilik outlet, staf, dan langganan</strong> (bagian 3A–3B), kami adalah <strong>pengendali data</strong>.
            </li>
            <li>
              Untuk data <strong>pelanggan outlet</strong> yang dimasukkan outlet ke NEXBILL (bagian 3C), <strong>outlet adalah pengendali
              data</strong> dan kami bertindak sebagai <strong>pemroses data</strong> atas nama outlet. Outlet bertanggung jawab memiliki dasar
              yang sah untuk mencatat data pelanggannya dan menjawab permintaan pelanggannya. Pelanggan outlet yang ingin mengakses atau
              menghapus datanya sebaiknya menghubungi outlet terkait; kami akan membantu outlet memenuhinya.
            </li>
          </ul>
        </Section>

        <Section title="3. Data yang Kami Kumpulkan">
          <p className="font-medium text-neutral-300">A. Akun pemilik &amp; staf</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nama, alamat email, nomor telepon/WhatsApp, peran (Owner, Manager, Kasir, dll.).</li>
            <li>Kata sandi — disimpan hanya dalam bentuk <em>hash</em> (tidak bisa dibaca siapa pun, termasuk kami).</li>
            <li>Bila masuk dengan Google: nama, email, dan ID akun Google Anda (kami tidak menerima kata sandi Google Anda).</li>
            <li>Data sesi login: waktu masuk, jenis perangkat/browser (user agent), dan alamat IP — untuk keamanan akun (satu perangkat aktif per akun) dan mencegah penyalahgunaan.</li>
            <li>Catatan aktivitas (audit log): siapa melakukan apa dan kapan di dashboard, misalnya void, refund, ubah harga, tutup shift.</li>
          </ul>

          <p className="font-medium text-neutral-300 pt-2">B. Data usaha &amp; langganan</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nama outlet/cabang, alamat, telepon, logo, profil usaha saat pendaftaran (jumlah unit, shift, karyawan).</li>
            <li>Data pajak &amp; tagihan bila diisi: NPWP, nama dan alamat penagihan.</li>
            <li>Rekening bank untuk pencairan komisi referral (bila Anda ikut program referral).</li>
            <li>Riwayat langganan, invoice, metode pembayaran yang dipilih, dan status pembayaran. Kami <strong>tidak menyimpan nomor kartu</strong> — pembayaran diproses oleh penyedia pembayaran.</li>
            <li>Alamat pengiriman untuk pembelian perangkat (smart plug).</li>
          </ul>

          <p className="font-medium text-neutral-300 pt-2">C. Data operasional outlet (dimasukkan oleh outlet)</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Transaksi rental, kasir/F&amp;B, pembayaran, shift &amp; kas, stok, pengeluaran, aset, laporan keuangan dan akuntansi.</li>
            <li>Data pelanggan outlet: nama, nomor telepon, data member (saldo, poin, riwayat kunjungan), booking, deposit, serta skor kepercayaan pelanggan yang dihitung dari riwayat transaksi di outlet tersebut.</li>
            <li>
              Fitur Rental ke Rumah (bila dipakai outlet): jenis &amp; nomor identitas (KTP/SIM/paspor), alamat, foto identitas, dan foto
              selfie dengan identitas untuk verifikasi penyewa. Data ini sensitif — hanya dapat dilihat oleh staf outlet yang berwenang dan
              dipakai semata untuk verifikasi serta penagihan sewa.
            </li>
            <li>File yang diunggah: foto produk, banner, bukti pengeluaran, gambar QRIS outlet.</li>
            <li>Data perangkat outlet: nama/ID TV, smart plug, dan status koneksinya untuk kontrol otomatis.</li>
          </ul>

          <p className="font-medium text-neutral-300 pt-2">D. Pengunjung halaman publik</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Halaman booking online outlet: nama, nomor telepon, dan jadwal yang Anda isi saat memesan.</li>
            <li>Halaman QR Pelanggan di bilik: isi pesanan F&amp;B, permintaan tambah waktu, atau panggilan kasir. Tidak perlu login dan tidak meminta data pribadi.</li>
            <li>Formulir kontak/WhatsApp dan pesan yang Anda kirim ke kami (termasuk lewat Instagram atau WhatsApp).</li>
          </ul>

          <p className="font-medium text-neutral-300 pt-2">E. Data teknis</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cookie sesi login dan preferensi (lihat <Link href="/kebijakan-cookie" className="text-cyan-400 hover:underline">Kebijakan Cookie</Link>).</li>
            <li>Penyimpanan lokal di perangkat Anda (tidak dikirim ke server kami): pilihan bahasa, lebar kertas &amp; printer, dan ID printer Bluetooth yang dipasangkan.</li>
            <li>Log server standar (waktu, alamat IP, halaman yang diakses, pesan error) untuk keamanan dan perbaikan gangguan.</li>
            <li>
              Bila Anda mengaktifkan notifikasi di HP: alamat langganan push perangkat (dibuat oleh browser/Android) dan pilihan jenis
              notifikasi. Isi notifikasi berupa ringkasan kejadian outlet (mis. sesi hampir habis, booking baru) dan dikirim melalui layanan
              push Google/browser. Notifikasi bisa dimatikan kapan saja di Pengaturan → Akun Saya atau pengaturan HP.
            </li>
          </ul>

          <p className="font-medium text-neutral-300 pt-2">F. Informasi usaha dari sumber publik</p>
          <p>
            Untuk menawarkan layanan, kami dapat mencatat informasi usaha yang tersedia publik (misalnya nama usaha, alamat, dan nomor
            telepon usaha yang tercantum di Google Maps) dan menghubungi usaha tersebut. Anda dapat meminta untuk tidak dihubungi lagi dan
            datanya dihapus kapan saja melalui kontak di bagian 12.
          </p>
        </Section>

        <Section title="4. Untuk Apa Data Dipakai">
          <ul className="list-disc pl-5 space-y-1">
            <li>Menjalankan layanan: billing &amp; timer, kasir, booking, member, laporan, kontrol TV/smart plug, cetak struk.</li>
            <li>Membuat dan mengelola akun, langganan, invoice, serta memproses pembayaran dan pengiriman perangkat.</li>
            <li>Keamanan: verifikasi login, satu sesi aktif per akun, deteksi penyalahgunaan dan kecurangan (misalnya audit log, deteksi shift berisiko).</li>
            <li>Mengirim email/notifikasi penting: verifikasi email, reset kata sandi, pengingat tagihan dan masa percobaan, pemberitahuan layanan.</li>
            <li>Dukungan pelanggan dan perbaikan produk berdasarkan masukan dan data penggunaan agregat.</li>
            <li>Fitur AI Business Assistant (bila diaktifkan Owner): ringkasan data usaha outlet dikirim ke penyedia AI untuk menghasilkan analisis dan rekomendasi.</li>
            <li>Memenuhi kewajiban hukum, misalnya pencatatan transaksi dan perpajakan.</li>
          </ul>
          <p>Kami <strong>tidak menjual</strong> data pribadi, dan tidak memakai data pelanggan outlet untuk iklan.</p>
        </Section>

        <Section title="5. Pihak Ketiga yang Memproses Data">
          <p>Kami memakai penyedia layanan berikut, masing-masing hanya menerima data yang diperlukan untuk fungsinya:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Vercel</strong> — hosting aplikasi web.</li>
            <li><strong>Supabase</strong> — database dan penyimpanan file.</li>
            <li><strong>Cloudflare</strong> — DNS dan keamanan jaringan.</li>
            <li><strong>iPaymu</strong> — pemrosesan pembayaran langganan dan, bila outlet memakainya, pembayaran non-tunai pelanggan outlet.</li>
            <li><strong>BukuPay</strong> — pemrosesan transaksi PPOB (pulsa, token, tagihan) bila outlet memakai fitur PPOB.</li>
            <li><strong>Biteship</strong> — pengiriman perangkat (nama penerima, telepon, alamat).</li>
            <li><strong>Tuya / Smart Life</strong> — kontrol smart plug melalui akun cloud milik outlet.</li>
            <li><strong>Resend</strong> — pengiriman email transaksional.</li>
            <li><strong>Anthropic</strong> — penyedia model AI untuk fitur AI Business Assistant (hanya saat fitur dipakai).</li>
            <li><strong>Google</strong> — login dengan Google, serta Google Maps untuk informasi usaha publik (bagian 3F).</li>
            <li><strong>Meta (Instagram/WhatsApp)</strong> — bila Anda berkomunikasi dengan kami melalui kanal tersebut.</li>
            <li><strong>Layanan push Google / browser</strong> — mengantarkan notifikasi ke HP bila Anda mengaktifkannya.</li>
          </ul>
          <p>
            Kami juga dapat mengungkapkan data bila diwajibkan oleh hukum atau perintah instansi berwenang, atau untuk melindungi hak,
            keamanan, dan properti kami maupun pengguna.
          </p>
        </Section>

        <Section title="6. Penyimpanan &amp; Transfer Data ke Luar Negeri">
          <p>
            Sebagian penyedia di atas menyimpan atau memproses data di pusat data di luar Indonesia. Kami hanya memakai penyedia yang
            menerapkan standar keamanan yang memadai, dan transfer dilakukan sebatas yang diperlukan untuk menjalankan layanan, sesuai
            ketentuan UU PDP.
          </p>
        </Section>

        <Section title="7. Keamanan Data">
          <ul className="list-disc pl-5 space-y-1">
            <li>Seluruh komunikasi dienkripsi dengan HTTPS/TLS.</li>
            <li>Kata sandi disimpan dalam bentuk hash; token akses dibatasi waktu.</li>
            <li>Data setiap outlet dipisahkan (isolasi tenant), dan akses staf dibatasi sesuai peran serta izin yang diatur Owner.</li>
            <li>Satu akun hanya aktif di satu perangkat; aktivitas penting dicatat di audit log.</li>
          </ul>
          <p>
            Tidak ada sistem yang 100% aman. Bila terjadi kegagalan pelindungan data yang berdampak pada Anda, kami akan memberi tahu
            Anda dan pihak berwenang sesuai ketentuan UU PDP.
          </p>
        </Section>

        <Section title="8. Berapa Lama Data Disimpan">
          <ul className="list-disc pl-5 space-y-1">
            <li>Data akun dan data outlet disimpan selama akun aktif atau selama diperlukan untuk menyediakan layanan.</li>
            <li>
              Bila langganan berakhir atau ditangguhkan tanpa permintaan penghapusan, data tetap disimpan untuk jangka waktu yang wajar
              agar outlet mudah mengaktifkan kembali, dan Owner dapat meminta penghapusan kapan saja (bagian 9).
            </li>
            <li>
              Setelah akun/outlet dihapus, data dihapus atau dianonimkan paling lambat 30 hari, <strong>kecuali</strong> data yang wajib
              disimpan lebih lama menurut hukum (misalnya invoice dan catatan transaksi untuk keperluan perpajakan dan akuntansi), yang
              disimpan sesuai jangka waktu yang diwajibkan lalu dihapus.
            </li>
            <li>Cadangan (backup) sistem terhapus otomatis mengikuti siklus rotasi backup.</li>
          </ul>
        </Section>

        <Section id="hapus-akun" title="9. Menghapus Akun &amp; Data">
          <p>Owner dapat menghapus akun beserta data outlet kapan saja, dengan salah satu cara berikut:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <strong>Langsung di aplikasi/dashboard:</strong> buka <em>Pengaturan → Akun Saya → Hapus Akun &amp; Data</em>, tekan{" "}
              <em>Kirim Kode Konfirmasi</em>, lalu masukkan kode 6 digit yang dikirim ke email Owner dan ketik <em>HAPUS</em>.
            </li>
            <li>
              <strong>Lewat email atau WhatsApp</strong> (misalnya bila tidak bisa masuk lagi): kirim permintaan dari email yang terdaftar
              sebagai Owner ke <a href={`mailto:${CONTACT_EMAIL}?subject=Permintaan%20Hapus%20Akun%20NEXBILL`} className="text-cyan-400 hover:underline">{CONTACT_EMAIL}</a>{" "}
              dengan subjek <em>&quot;Permintaan Hapus Akun NEXBILL&quot;</em>, atau hubungi WhatsApp {CONTACT_WA}. Sebutkan nama outlet; kami
              memverifikasi bahwa permintaan berasal dari pemilik akun (misalnya kode konfirmasi ke email terdaftar).
            </li>
          </ol>
          <p>
            Setelah dikonfirmasi, akun Owner, akun staf outlet, dan outlet langsung dinonaktifkan, langganan dihentikan, lalu data pribadi
            dihapus atau dianonimkan sesuai bagian 8. Kami dapat mengirimkan ekspor data Anda terlebih dahulu bila diminta. Panduan singkat
            juga tersedia di <Link href="/hapus-akun" className="text-cyan-400 hover:underline">nexbill.id/hapus-akun</Link>.
          </p>
          <p>
            Staf (bukan Owner) dapat dihapus aksesnya oleh Owner melalui menu Staf &amp; Hak Akses. Pelanggan outlet yang ingin datanya
            dihapus dapat menghubungi outlet terkait atau kami.
          </p>
        </Section>

        <Section title="10. Hak Anda">
          <p>Sesuai UU PDP, Anda berhak untuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mendapatkan informasi tentang pemrosesan data Anda dan mengakses salinannya.</li>
            <li>Memperbaiki data yang tidak akurat — sebagian besar dapat diubah langsung di Pengaturan dashboard.</li>
            <li>Meminta penghapusan data (bagian 9) atau pembatasan pemrosesan.</li>
            <li>Menarik persetujuan, misalnya berhenti menerima pesan penawaran.</li>
            <li>Mendapatkan data Anda dalam format yang dapat dibaca mesin (ekspor laporan/data).</li>
            <li>Mengajukan keberatan atas pemrosesan tertentu dan mengajukan pengaduan.</li>
          </ul>
          <p>Kami menanggapi permintaan dalam waktu yang ditentukan UU PDP setelah identitas Anda terverifikasi.</p>
        </Section>

        <Section title="11. Aplikasi Android, Izin Perangkat &amp; Anak-anak">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Aplikasi NEXBILL untuk Android menampilkan dashboard NEXBILL; data yang diproses sama dengan versi web di atas.
            </li>
            <li>
              <strong>Bluetooth / Perangkat di sekitar</strong> — hanya dipakai saat Anda memilih dan mencetak ke printer struk Bluetooth.
              Kami tidak memindai atau menyimpan daftar perangkat Bluetooth di server; ID printer yang dipilih disimpan di perangkat Anda saja.
            </li>
            <li>
              <strong>Notifikasi</strong> — hanya bila Anda mengaktifkannya, untuk pemberitahuan operasional outlet (sesi, permintaan
              pelanggan, booking, pembayaran, stok, shift). Bisa dimatikan kapan saja.
            </li>
            <li>Kami tidak mengumpulkan lokasi GPS, kontak, atau isi galeri perangkat Anda. Foto hanya diunggah bila Anda memilih file sendiri.</li>
            <li>
              NEXBILL adalah alat usaha untuk pengguna dewasa dan <strong>tidak ditujukan untuk anak di bawah 18 tahun</strong>. Kami tidak
              dengan sengaja mengumpulkan data anak sebagai pengguna akun.
            </li>
          </ul>
        </Section>

        <Section title="12. Kontak">
          <p>Pertanyaan, permintaan hak atas data, atau pengaduan privasi dapat disampaikan ke:</p>
          <ul className="list-none space-y-1">
            <li><strong>Digitrajasa — NEXBILL</strong></li>
            <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:underline">{CONTACT_EMAIL}</a></li>
            <li>WhatsApp: {CONTACT_WA}</li>
            <li>Alamat: {CONTACT_ADDRESS}</li>
            <li>Situs pengembang: <a href="https://www.digitrajasa.web.id" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">www.digitrajasa.web.id</a></li>
          </ul>
        </Section>

        <Section title="13. Perubahan Kebijakan">
          <p>
            Kebijakan ini dapat diperbarui mengikuti perubahan layanan atau hukum. Perubahan penting akan diberitahukan melalui dashboard
            atau email terdaftar. Tanggal pembaruan terakhir tercantum di bagian atas halaman ini.
          </p>
        </Section>

        <section id="english" className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 scroll-mt-6">
          <h2 className="text-base font-semibold text-cyan-300">English Summary</h2>
          <div className="text-sm text-neutral-400 leading-relaxed space-y-2">
            <p>
              NEXBILL (web, dashboard, and Android app) is developed and operated by Digitrajasa, Indonesia. We collect account data
              (name, email, phone, hashed password, Google sign-in ID, login/session and audit logs), business and subscription data
              (outlet profile, tax and billing details, invoices, shipping address), and operational data that outlets enter (rentals,
              sales, payments, shifts, inventory, expenses, customer and membership records, and — for the home-rental feature — renter
              ID numbers and ID/selfie photos). For outlet customer data, the outlet is the controller and we act as its processor.
            </p>
            <p>
              Data is used only to provide and secure the service, process payments and shipments, send service messages, provide
              support, power optional AI analysis requested by the owner, and meet legal obligations. We do not sell personal data.
              Processors: Vercel, Supabase, Cloudflare, iPaymu, BukuPay, Biteship, Tuya, Resend, Anthropic, Google, and Meta; some
              process data outside Indonesia. Data is encrypted in transit and isolated per outlet.
            </p>
            <p>
              Account owners can delete their account and data in the app (Settings → Akun Saya → Hapus Akun &amp; Data, confirmed
              with a code sent to the owner email) or by emailing {CONTACT_EMAIL} (subject &quot;Permintaan Hapus Akun NEXBILL&quot;) or
              via WhatsApp {CONTACT_WA} (see nexbill.id/hapus-akun); data is deleted or anonymised within 30 days except records we must keep
              by law. The Android app uses Bluetooth only to print receipts to a printer you select, and does not collect location,
              contacts, or photos you did not choose to upload. The service is not intended for children under 18.
            </p>
          </div>
        </section>

        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/" className="text-xs text-cyan-400 hover:underline">← Kembali ke Beranda</Link>
          <Link href="/syarat-ketentuan" className="text-xs text-cyan-400 hover:underline">Syarat &amp; Ketentuan →</Link>
          <Link href="/kebijakan-cookie" className="text-xs text-cyan-400 hover:underline">Kebijakan Cookie →</Link>
          <Link href="/kebijakan-refund" className="text-xs text-cyan-400 hover:underline">Kebijakan Refund &amp; Pembatalan →</Link>
        </div>
      </div>
    </div>
  );
}
