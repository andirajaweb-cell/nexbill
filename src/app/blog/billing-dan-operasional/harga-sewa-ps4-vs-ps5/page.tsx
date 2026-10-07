import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// Judul, dek, tanggal, URL & pasangan hreflang: blog-data.ts ("ps4VsPs5"). Versi Inggris: src/app/en/blog/.
export const metadata = blogArticleMetadata("ps4VsPs5", "id");

export default function Page() {
  return (
    <BlogArticle lang="id" articleKey="ps4VsPs5" relatedPillars={["billing", "system"]} relatedArticles={["pricing", "breakEven"]}>
      <p>
        Banyak outlet yang punya unit PS4 dan PS5 sekaligus terjebak dua pilihan yang sama-sama bermasalah: menyamakan tarif keduanya (PS5 jadi terlalu murah dibanding biaya dan permintaannya), atau membuat selisih terlalu jauh (unit PS4 jadi sepi karena dianggap "kelas dua" tanpa alasan yang jelas bagi pelanggan). Ada jalan tengah yang lebih masuk akal.
      </p>

      <h2>Kenapa Menyamakan Tarif Biasanya Bermasalah</h2>
      <p>
        PS5 punya biaya modal lebih tinggi (harga unit, harga game, kadang TV yang lebih baik untuk memaksimalkan fitur grafisnya) dan permintaan yang biasanya lebih tinggi juga, terutama untuk game-game rilisan baru yang hanya jalan optimal di PS5. Kalau tarifnya disamakan dengan PS4, dua hal terjadi: margin di unit PS5 tertekan karena biaya modalnya tidak tertutup proporsional, dan unit PS5 jadi selalu penuh booking sementara PS4 sering kosong — permintaan tidak terdistribusi sesuai kapasitas.
      </p>

      <h2>Cara Menentukan Selisih yang Wajar</h2>
      <p>
        Alih-alih menebak angka selisihnya, hitung dari dua sisi: selisih biaya modal (proporsi cicilan/depresiasi unit PS5 dibanding PS4, dibagi ke estimasi jam pakai) dan selisih permintaan riil di outlet Anda sendiri (rasio okupansi PS5 vs PS4 dalam sebulan terakhir, kalau datanya ada). Kombinasi dua angka ini biasanya menghasilkan selisih tarif PS5 sekitar 20–40% lebih tinggi dari PS4 — tapi rentang ini sangat tergantung kondisi lokal Anda, bukan angka baku.
      </p>

      <h2>Strategi Menjaga Okupansi PS4 Tetap Sehat</h2>
      <p>
        Karena PS5 secara alami lebih diminati, PS4 perlu insentif tersendiri supaya tidak selalu jadi pilihan kedua:
      </p>
      <ul>
        <li><strong>Paket jam lebih murah untuk PS4</strong> — bukan sekadar tarif per jam lebih rendah, tapi paket panjang (3–5 jam) dengan diskon lebih agresif dibanding paket PS5.</li>
        <li><strong>Posisikan PS4 untuk grup/anak-anak</strong> — game-game lama yang familiar dan ringan sering lebih cocok untuk sesi santai atau pemain yang baru belajar, jadi framing-nya bukan "PS5 kelas satu, PS4 sisa".</li>
        <li><strong>Jangan biarkan katalog game PS4 usang</strong> — kalau koleksi game PS4 tidak pernah diperbarui sementara PS5 terus dapat judul baru, kesenjangan daya tariknya makin melebar dari waktu ke waktu.</li>
      </ul>

      <h2>Contoh Ilustrasi Struktur Tarif</h2>
      <p>
        <em>Angka di bawah ini contoh ilustrasi, bukan tarif baku yang harus diikuti.</em>
      </p>
      <p>
        Misalnya tarif PS4 reguler Rp5.000/jam. Dengan selisih 30% berdasarkan biaya modal dan permintaan, tarif PS5 reguler jadi sekitar Rp6.500/jam. Untuk mendorong okupansi PS4, paket 4 jam PS4 didiskon jadi Rp17.000 (setara Rp4.250/jam) — jauh lebih menarik dibanding paket 4 jam PS5 di kisaran Rp22.000–Rp24.000, memberi pelanggan sensitif harga alasan jelas memilih PS4 tanpa merasa dapat "yang murahan".
      </p>

      <h2>Konsistensi Penerapan yang Sering Jadi Masalah</h2>
      <p>
        Setelah struktur tarif dua tingkat ini ditentukan, tantangan berikutnya adalah menerapkannya konsisten di setiap transaksi — kasir harus ingat tarif mana yang berlaku untuk unit mana, ditambah aturan paket yang berbeda pula. Ini salah satu area yang paling rawan salah kalau masih dihitung manual, dan salah satu yang paling mudah dijaga konsisten begitu tarif per unit sudah diatur sekali di sistem billing.
      </p>
    </BlogArticle>
  );
}
