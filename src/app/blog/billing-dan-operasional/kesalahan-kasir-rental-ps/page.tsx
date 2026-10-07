import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// Judul, dek, tanggal, URL & pasangan hreflang: blog-data.ts ("cashierMistakes"). Versi Inggris: src/app/en/blog/.
export const metadata = blogArticleMetadata("cashierMistakes", "id");

export default function Page() {
  return (
    <BlogArticle lang="id" articleKey="cashierMistakes" relatedPillars={["billing", "software"]} relatedArticles={["closeShift", "breakEven"]}>
      <p>
        Kalau kas rental PS Anda sering selisih di akhir hari, kecurigaan pertama biasanya jatuh ke staf — padahal dalam banyak kasus, penyebabnya adalah kebiasaan operasional yang salah, bukan niat buruk. Berikut lima kesalahan paling umum yang saya temui, baik dari pengalaman outlet sendiri maupun cerita sesama pemilik rental.
      </p>

      <h2>1. Membulatkan Durasi Sewa Secara Manual</h2>
      <p>
        Kasir yang mencatat waktu mulai dan selesai di kertas atau buku catatan cenderung membulatkan — "ya sekitar 2 jam-lah" — padahal durasi sebenarnya bisa 2 jam 20 menit. Pembulatan ke bawah ini kelihatan sepele per sesi, tapi terakumulasi jadi kebocoran pendapatan yang nyata dalam sebulan.
      </p>

      <h2>2. Lupa Mencatat Sesi Tambah Jam (Extend)</h2>
      <p>
        Pelanggan yang minta tambah waktu di tengah sesi sering hanya dicatat lisan ke kasir, tanpa update tertulis. Kalau kasir sibuk atau ganti shift sebelum sesi selesai, tambahan jam ini gampang terlewat saat penagihan akhir.
      </p>

      <h2>3. Tidak Konsisten Menerapkan Diskon Member atau Paket</h2>
      <p>
        Tanpa aturan yang jelas dan tercatat di sistem, penerapan diskon jadi tergantung ingatan dan mood kasir hari itu. Ada pelanggan yang dapat diskon member padahal sudah tidak aktif, ada yang seharusnya dapat paket hemat tapi dikenakan tarif reguler — dua-duanya sama-sama merugikan, satu ke outlet, satu ke pelanggan.
      </p>

      <h2>4. Uang Tunai Campur dengan Kas Pribadi atau Kasbon</h2>
      <p>
        Praktik umum di rental kecil: kasir "meminjam" dari laci kas untuk keperluan mendadak (beli galon, kasih kembalian ke tetangga) dengan niat mengganti nanti. Tanpa pencatatan yang disiplin, kasbon kecil-kecil ini menumpuk dan sulit ditelusuri saat rekonsiliasi akhir bulan.
      </p>

      <h2>5. Tidak Ada Serah Terima Kas yang Terdokumentasi Antar Shift</h2>
      <p>
        Saat pergantian shift dilakukan cuma dengan serah terima lisan ("kas segini ya"), tidak ada titik yang jelas untuk melacak di shift mana selisih itu mulai muncul. Begitu selisih ditemukan di akhir hari, sudah tidak mungkin tahu itu terjadi di shift pagi atau sore.
      </p>

      <h2>Benang Merahnya: Pencatatan Manual di Titik Kritis</h2>
      <p>
        Kelima kesalahan ini punya pola yang sama — semuanya terjadi di titik-titik yang masih bergantung pada pencatatan manual atau ingatan manusia: durasi sesi, tambahan jam, aturan diskon, arus kas, dan serah terima shift. Sistem billing dan kasir yang mencatat otomatis di setiap titik ini tidak menghilangkan kebutuhan kejujuran staf, tapi menghilangkan ruang untuk kesalahan tidak sengaja yang selama ini paling sering jadi sumber kebocoran.
      </p>
    </BlogArticle>
  );
}
