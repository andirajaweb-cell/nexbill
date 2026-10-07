import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// Judul, dek, tanggal, URL & pasangan hreflang: blog-data.ts ("pricing"). Versi Inggris: src/app/en/blog/.
export const metadata = blogArticleMetadata("pricing", "id");

export default function Page() {
  return (
    <BlogArticle lang="id" articleKey="pricing" relatedPillars={["billing", "app"]} relatedArticles={["breakEven", "ps4VsPs5"]}>
      <p>
        Banyak pemilik rental PS baru menentukan tarif dengan cara paling sederhana: lihat outlet sebelah pasang harga berapa, lalu pasang harga yang sama atau sedikit lebih murah. Cara ini kelihatan aman, tapi sebenarnya berisiko — Anda tidak tahu apakah outlet sebelah itu sendiri untung atau justru menutupi kerugian dengan volume pelanggan yang lebih besar. Tarif yang sehat harus dihitung dari struktur biaya Anda sendiri, baru dibandingkan dengan pasar.
      </p>

      <h2>Metode 1: Cost-Plus — Hitung dari Biaya, Baru Tambah Margin</h2>
      <p>
        Cara paling dasar adalah menghitung berapa biaya yang Anda keluarkan untuk menjalankan satu unit selama satu jam, lalu menambahkan margin keuntungan di atasnya. Biaya per jam per unit biasanya terdiri dari:
      </p>
      <ul>
        <li><strong>Biaya listrik</strong> — konsumsi daya TV + konsol selama satu jam pemakaian aktif.</li>
        <li><strong>Alokasi sewa tempat</strong> — total sewa bulanan dibagi jam operasional dan jumlah unit.</li>
        <li><strong>Alokasi gaji staf</strong> — total gaji kasir per bulan dibagi total jam kerja dan kapasitas unit yang bisa ditangani.</li>
        <li><strong>Depresiasi/perawatan unit</strong> — perkiraan biaya servis dan penggantian stik/aksesori dibagi rata ke jam pemakaian.</li>
      </ul>
      <p>
        Setelah biaya per jam per unit ketemu, tambahkan margin — umumnya 30–50% di atas biaya, tergantung seberapa kompetitif pasar di sekitar Anda. Margin yang terlalu tipis membuat outlet rentan rugi begitu ada bulan sepi; margin yang terlalu tebal membuat Anda kalah bersaing.
      </p>

      <h2>Metode 2: Benchmark Pasar — Tapi Jangan Berhenti di Sini Saja</h2>
      <p>
        Survei 3–5 outlet rental PS terdekat sekelas Anda (jumlah unit, jenis TV, lokasi) memberi gambaran rentang harga yang wajar diterima pasar. Masalahnya, benchmark saja tidak memberi tahu Anda apakah tarif itu <strong>menguntungkan untuk Anda</strong> — struktur biaya tiap outlet berbeda (sewa tempat di lokasi ramai lebih mahal, misalnya). Cara paling aman: pakai benchmark sebagai batas atas dan bawah yang masuk akal, lalu pastikan tarif hasil hitungan cost-plus Anda masih berada di rentang itu.
      </p>

      <h2>Menentukan Tarif Paket Hemat dan Harga Member</h2>
      <p>
        Paket hemat (misalnya sewa 3 jam dibayar seharga 2,5 jam) dan harga member biasanya diberi diskon 10–20% dari tarif reguler — tujuannya mendorong sesi lebih panjang atau kunjungan berulang, bukan sekadar diskon tanpa alasan. Aturan praktisnya: diskon paket/member tidak boleh membuat tarif efektif jatuh di bawah titik cost-plus Anda. Kalau tarif regulernya sudah pas-pasan margin-nya, memberi diskon besar untuk paket hemat justru bisa membuat sesi yang ramai malah tidak menguntungkan.
      </p>

      <h2>Contoh Ilustrasi Perhitungan</h2>
      <p>
        <em>Angka di bawah ini hanya contoh ilustrasi untuk memudahkan cara berpikirnya — sesuaikan dengan biaya nyata di outlet Anda.</em>
      </p>
      <p>
        Misalnya biaya per jam per unit (listrik + alokasi sewa + alokasi gaji + perawatan) Anda hitung sekitar Rp4.000/jam, dan Anda ingin margin 50%. Tarif reguler yang masuk akal adalah sekitar Rp6.000/jam. Kalau outlet sekitar rata-rata mematok Rp6.000–Rp8.000/jam, tarif ini masih kompetitif sekaligus tetap untung. Untuk paket hemat 3 jam, diskon 15% dari Rp18.000 (3 × Rp6.000) menjadi sekitar Rp15.300 — masih di atas titik biaya (3 × Rp4.000 = Rp12.000), jadi tetap aman.
      </p>

      <h2>Kenapa Ini Sering Salah Kalau Dihitung Manual Setiap Sesi</h2>
      <p>
        Menentukan tarifnya bisa dilakukan sekali di awal — tapi menerapkannya secara konsisten ke setiap sesi, dengan kombinasi tarif reguler, paket, dan member yang berbeda-beda, itu yang sering jadi sumber kesalahan kalau masih dihitung manual oleh kasir. Di sinilah sistem billing otomatis berperan: begitu tarif ditentukan sekali di sistem, setiap sesi dihitung tepat sesuai aturan itu, tanpa tergantung kasir ingat atau tidak.
      </p>
    </BlogArticle>
  );
}
