import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

export const metadata = {
  title: "Kebijakan Cookie — NEXBILL",
  description: "Penjelasan cookie yang digunakan situs dan dashboard NEXBILL, dan cara mengatur preferensi Anda.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-cyan-300">{title}</h2>
      <div className="text-sm text-neutral-400 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#05070f] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Kebijakan Cookie" }]} />
          <Link href="/" className="text-xs text-cyan-400 hover:underline mt-2 inline-block">
            ← Kembali ke Beranda
          </Link>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title mt-2">Kebijakan Cookie</h1>
          <p className="text-sm text-neutral-500 mt-1">Berlaku untuk situs nexbill.id dan dashboard NEXBILL. Terakhir diperbarui: Agustus 2026.</p>
        </div>

        <Section title="1. Apa itu Cookie">
          <p>
            Cookie adalah berkas teks kecil yang disimpan browser Anda saat mengunjungi situs kami. Cookie membantu situs mengingat
            preferensi Anda (misalnya pilihan bahasa) dan memahami bagaimana pengunjung menggunakan situs, sehingga kami bisa
            meningkatkan pengalaman dari waktu ke waktu.
          </p>
        </Section>

        <Section title="2. Jenis Cookie yang Kami Gunakan">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Cookie Esensial</strong> — diperlukan agar situs dan dashboard berfungsi, misalnya cookie sesi login
              (<code className="text-cyan-300/80">pos_session</code>) yang menjaga Anda tetap masuk ke akun outlet setelah login. Cookie
              ini tidak dapat dinonaktifkan karena tanpanya sebagian fitur inti (login, checkout langganan) tidak akan bekerja.
            </li>
            <li>
              <strong>Cookie Preferensi</strong> — mengingat pilihan Anda seperti bahasa tampilan situs, supaya tidak perlu memilih ulang
              setiap kunjungan.
            </li>
            <li>
              <strong>Cookie Persetujuan Cookie</strong> — menyimpan pilihan Anda (terima/tolak) di banner cookie
              (<code className="text-cyan-300/80">nb_cookie_consent</code>) selama 180 hari, supaya banner tidak muncul berulang.
            </li>
            <li>
              <strong>Cookie Analitik (bila diaktifkan)</strong> — membantu kami memahami traffic dan halaman yang paling banyak
              dikunjungi, dalam bentuk data agregat yang tidak mengidentifikasi Anda secara pribadi.
            </li>
          </ul>
        </Section>

        <Section title="3. Cookie Pihak Ketiga">
          <p>
            NEXBILL dapat menggunakan layanan pihak ketiga (misalnya payment gateway saat proses pembayaran langganan) yang turut
            menempatkan cookie mereka sendiri sesuai kebijakan privasi masing-masing penyedia. NEXBILL tidak mengendalikan cookie pihak
            ketiga tersebut secara langsung.
          </p>
        </Section>

        <Section title="4. Mengatur Preferensi Cookie">
          <p>
            Saat pertama kali mengunjungi situs kami, Anda akan melihat banner untuk menerima atau menolak cookie non-esensial. Anda juga
            dapat mengatur atau menghapus cookie langsung lewat pengaturan browser Anda kapan saja — perlu diingat bahwa menonaktifkan
            cookie esensial dapat membuat sebagian fitur situs/dashboard tidak berfungsi normal, misalnya proses login.
          </p>
        </Section>

        <Section title="5. Perubahan Kebijakan">
          <p>
            Kebijakan Cookie ini dapat diperbarui dari waktu ke waktu mengikuti perubahan layanan atau ketentuan hukum yang berlaku.
            Versi terbaru selalu tersedia di halaman ini.
          </p>
        </Section>

        <Section title="6. Kontak">
          <p>Pertanyaan seputar Kebijakan Cookie ini bisa disampaikan lewat kanal support resmi NEXBILL.</p>
        </Section>

        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/" className="text-xs text-cyan-400 hover:underline">
            ← Kembali ke Beranda
          </Link>
          <Link href="/syarat-ketentuan" className="text-xs text-cyan-400 hover:underline">
            Syarat &amp; Ketentuan →
          </Link>
          <Link href="/kebijakan-refund" className="text-xs text-cyan-400 hover:underline">
            Kebijakan Refund &amp; Pembatalan →
          </Link>
        </div>
      </div>
    </div>
  );
}
