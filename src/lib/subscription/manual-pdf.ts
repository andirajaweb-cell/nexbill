import PDFDocument from "pdfkit";

/**
 * Static "Buku Manual" PDF for the Smart Plug BARDI (Basic + Pro/Energy Monitor variants) sold
 * through the NEXBILL storefront (see ensureDefaultProducts in service.ts). Gated behind a paid
 * smart_plug_purchase — see /api/subscription/manual/route.ts, which calls buildSmartPlugManualPdf()
 * fresh on every download rather than serving a static file from /public, since the download itself
 * must stay behind the paid-purchase check (a public/ file would be guessable by URL).
 *
 * Pairing steps (section 6) match BARDI's own published instructions
 * (https://bardi.co.id/cara-pemasangan-bardi-smart-plug/) as of Aug 2026 — re-verify against that
 * page if BARDI changes their app flow.
 *
 * Section 7 reflects how device onboarding actually works in this codebase: one shared Tuya
 * Cloud API account (platformTuyaAccount) is set up once by the NEXBILL platform team and used
 * for every outlet/merchant — not self-service by the merchant (see the note in help/content.ts)
 * — so after pairing in the consumer app, the merchant has to hand off the device name to
 * NEXBILL support before it appears as a controllable device on their own Dashboard > Perangkat
 * page.
 */

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const CYAN = "#0891b2";
const INK = "#111827";
const MUTED = "#6b7280";

function finalize(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
    doc.addPage();
  }
}

function heading(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(CYAN).text(text, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveTo(PAGE_MARGIN, doc.y + 2).lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y + 2).strokeColor("#e5e7eb").stroke();
  doc.moveDown(0.5);
  doc.fillColor(INK);
}

function subheading(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 24);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(text, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.2);
}

function paragraph(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 20);
  doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(text, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, align: "left", lineGap: 2 });
  doc.moveDown(0.4);
}

function bullets(doc: PDFKit.PDFDocument, items: string[], numbered = false) {
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  items.forEach((item, i) => {
    const prefix = numbered ? `${i + 1}. ` : "•  ";
    const text = prefix + item;
    const width = CONTENT_WIDTH - 10;
    ensureSpace(doc, doc.heightOfString(text, { width }) + 6);
    doc.text(text, PAGE_MARGIN + 10, doc.y, { width, lineGap: 1 });
    doc.moveDown(0.2);
  });
  doc.moveDown(0.3);
}

function specTable(doc: PDFKit.PDFDocument, rows: [string, string, string][]) {
  ensureSpace(doc, 20 * rows.length + 30);
  const colX = [PAGE_MARGIN, PAGE_MARGIN + 170, PAGE_MARGIN + 340];
  const colW = [170, 170, CONTENT_WIDTH - 340];
  const rowH = 18;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(9);
  ["Spesifikasi", "Smart Plug BARDI Basic", "Smart Plug BARDI Pro"].forEach((label, i) => {
    doc.text(label, colX[i], y, { width: colW[i] });
  });
  y += rowH;
  doc.moveTo(PAGE_MARGIN, y - 3).lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 3).strokeColor("#999").stroke();

  doc.font("Helvetica").fontSize(9);
  rows.forEach(([a, b, c]) => {
    const cellHeights = [a, b, c].map((t, i) => doc.heightOfString(t, { width: colW[i] }));
    const h = Math.max(rowH, ...cellHeights) + 4;
    if (y + h > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.text(a, colX[0], y, { width: colW[0] });
    doc.text(b, colX[1], y, { width: colW[1] });
    doc.text(c, colX[2], y, { width: colW[2] });
    y += h;
  });
  doc.y = y + 6;
  doc.moveDown(0.3);
}

function troubleshootTable(doc: PDFKit.PDFDocument, rows: [string, string][]) {
  ensureSpace(doc, 40);
  const colX = [PAGE_MARGIN, PAGE_MARGIN + 200];
  const colW = [190, CONTENT_WIDTH - 200];
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Masalah", colX[0], y, { width: colW[0] });
  doc.text("Solusi", colX[1], y, { width: colW[1] });
  y += 16;
  doc.moveTo(PAGE_MARGIN, y - 3).lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 3).strokeColor("#999").stroke();

  doc.font("Helvetica").fontSize(9);
  rows.forEach(([problem, solution]) => {
    const h = Math.max(doc.heightOfString(problem, { width: colW[0] }), doc.heightOfString(solution, { width: colW[1] })) + 8;
    if (y + h > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.text(problem, colX[0], y, { width: colW[0], lineGap: 1 });
    doc.text(solution, colX[1], y, { width: colW[1], lineGap: 1 });
    y += h;
  });
  doc.y = y + 6;
}

export async function buildSmartPlugManualPdf(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });

  // Cover
  doc.font("Helvetica-Bold").fontSize(20).fillColor(CYAN).text("Buku Manual", PAGE_MARGIN, PAGE_MARGIN + 20);
  doc.fontSize(20).text("Smart Plug BARDI", PAGE_MARGIN, doc.y);
  doc.font("Helvetica").fontSize(11).fillColor(MUTED).text("Basic & Pro (Energy Monitor) — untuk pelanggan NEXBILL", PAGE_MARGIN, doc.y + 6);
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(
    `Dokumen ini berlaku untuk kedua varian Smart Plug BARDI yang dijual di storefront NEXBILL. Perbedaan antar varian ditandai secara eksplisit di tiap bagian yang relevan. Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}.`,
    PAGE_MARGIN,
    doc.y,
    { width: CONTENT_WIDTH }
  );
  doc.fillColor(INK);

  heading(doc, "1. Apa Itu Smart Plug BARDI");
  paragraph(
    doc,
    "Smart Plug BARDI adalah colokan pintar berbasis WiFi yang memungkinkan NEXBILL menyalakan/mematikan daya TV atau konsol dari jarak jauh — dipakai khusus untuk unit rental yang TV/perangkatnya BUKAN Android TV (yang sudah punya kontrol relay/ADB sendiri). Setelah terpasang dan tertaut ke dashboard, unit tersebut bisa ikut diatur otomatis mengikuti sesi sewa (nyala saat sesi dimulai, mati saat sesi berakhir) sama seperti unit Android TV lainnya."
  );
  paragraph(
    doc,
    "Varian Pro menambahkan fitur pemantauan konsumsi listrik (watt per jam) per unit — berguna untuk memperkirakan biaya listrik per bilik/unit secara terpisah. Fungsi kontrol nyala/mati kedua varian identik."
  );

  heading(doc, "2. Spesifikasi");
  specTable(doc, [
    ["Konektivitas", "WiFi 2.4GHz (via app Bardi Smart Home / Smart Life by Tuya)", "WiFi 2.4GHz (via app Bardi Smart Home / Smart Life by Tuya)"],
    ["Kontrol", "On/Off jarak jauh via Tuya Cloud, terintegrasi ke dashboard NEXBILL", "On/Off jarak jauh via Tuya Cloud, terintegrasi ke dashboard NEXBILL"],
    ["Pemantauan energi", "Tidak tersedia", "Tersedia — konsumsi watt/jam per unit, dilihat dari app"],
    ["Catu daya rumah", "Colok langsung ke stopkontak dinding standar", "Colok langsung ke stopkontak dinding standar"],
    ["Beban maksimum", "Ikuti rating pada label unit fisik (umumnya 10A/2200W) — jangan melebihi ini", "Ikuti rating pada label unit fisik (umumnya 10A/2200W) — jangan melebihi ini"],
  ]);

  heading(doc, "3. Petunjuk Keselamatan");
  bullets(doc, [
    "Jangan gunakan di area lembap/basah atau di luar ruangan tanpa pelindung.",
    "Jangan menyambungkan perangkat dengan daya total melebihi rating maksimum yang tertera di badan Smart Plug.",
    "Pastikan stopkontak dinding dalam kondisi baik (tidak longgar/korslet) sebelum memasang.",
    "Jauhkan dari jangkauan anak-anak dan hindari menarik kabel secara paksa saat mencabut.",
    "Matikan/cabut Smart Plug jika tercium bau terbakar atau terasa panas berlebih, lalu hubungi support NEXBILL.",
  ]);

  heading(doc, "4. Isi Paket");
  paragraph(doc, "Jumlah unit Smart Plug yang diterima mengikuti qty pada invoice pembelian di Dashboard > Langganan. Setiap unit sudah dalam kondisi siap pasang (plug-and-play) — tidak perlu perakitan tambahan.");

  heading(doc, "5. Pemasangan Fisik");
  bullets(
    doc,
    [
      "Colokkan Smart Plug langsung ke stopkontak dinding.",
      "Colokkan kabel power TV/konsol ke soket keluaran pada Smart Plug.",
      "Pastikan lampu indikator pada Smart Plug menyala — ini menandakan perangkat mendapat daya dan siap dipasangkan (pairing) ke WiFi.",
    ],
    true
  );

  heading(doc, "6. Menghubungkan ke WiFi (Pairing)");
  paragraph(doc, "Gunakan salah satu aplikasi: Bardi Smart Home atau Smart Life by Tuya (keduanya kompatibel, Smart Life mendukung lebih banyak tipe perangkat). Pastikan smartphone tersambung ke jaringan WiFi 2.4GHz yang akan dipakai Smart Plug — Smart Plug tidak mendukung WiFi 5GHz.");
  bullets(
    doc,
    [
      "Unduh aplikasi dari Play Store/App Store, lalu daftar akun dengan email atau nomor telepon.",
      "Di layar Home, tekan tanda \"+\" di pojok kanan atas untuk menambah perangkat.",
      "Pilih kategori perangkat yang sesuai (Socket / Smart Plug), lalu pastikan Smart Plug sudah menyala/tercolok.",
      "Jika lampu indikator berkedip cepat, tekan tombol konfirmasi \"Indicator Rapidly Blink\" di app. Jika lampu TIDAK berkedip cepat, tahan tombol reset di badan Smart Plug selama 5 detik sampai lampu berkedip cepat, baru tekan tombol konfirmasi tersebut.",
      "Masukkan nama & password WiFi 2.4GHz, lalu tekan Confirm dan tunggu proses penyambungan selesai.",
      "Setelah muncul \"Device Added Successfully\", beri nama perangkat (mis. \"Smart Plug Bilik 1\") lalu tekan Completed.",
    ],
    true
  );

  heading(doc, "7. Menautkan Perangkat ke Dashboard NEXBILL");
  paragraph(
    doc,
    "Kredensial Tuya Cloud API dikelola terpusat oleh tim platform NEXBILL (bukan diatur sendiri oleh outlet), jadi setelah pairing berhasil di aplikasi, perangkat belum otomatis muncul di Dashboard NEXBILL. Langkah selanjutnya:"
  );
  bullets(
    doc,
    [
      "Hubungi tim support NEXBILL (kanal yang sama dengan pengajuan dukungan lain di Dashboard) dan sertakan nama outlet serta nama perangkat yang baru ditambahkan di app.",
      "Tim NEXBILL akan mengaktifkan perangkat tersebut agar bisa dikontrol dari sistem.",
      "Setelah aktif, buka Dashboard > Perangkat — perangkat akan tersedia untuk ditautkan ke unit rental yang sesuai lewat tabel \"Hubungkan Perangkat ke Unit Rental\" (butuh izin manage_devices).",
    ],
    true
  );

  heading(doc, "8. Cara Pakai dari Dashboard NEXBILL");
  bullets(doc, [
    "Nyala/mati manual: dari halaman Perangkat, tombol on/off tersedia untuk staf dengan akses dasar (tanpa perlu izin manage_devices).",
    "Otomatis mengikuti sesi sewa: setelah ditautkan ke unit rental, Smart Plug akan menyala saat sesi sewa dimulai dan mati saat sesi berakhir, sama seperti unit Android TV lainnya.",
  ]);

  heading(doc, "9. Fitur Pemantauan Energi (Khusus BARDI Pro)");
  paragraph(doc, "Buka aplikasi Bardi Smart Home / Smart Life, pilih perangkat, lalu lihat grafik konsumsi daya (watt) pada halaman detail perangkat. Data ini berguna untuk memperkirakan biaya listrik per bilik/unit secara mandiri — fitur ini tidak ditampilkan di Dashboard NEXBILL, hanya di aplikasi Tuya.");

  heading(doc, "10. Troubleshooting");
  troubleshootTable(doc, [
    ["Lampu indikator tidak menyala sama sekali", "Cek stopkontak (coba titik lain), pastikan Smart Plug tercolok dengan benar. Jika tetap mati, kemungkinan unit rusak — ajukan klaim sesuai Kebijakan Refund (7 hari pertama untuk unit cacat/rusak)."],
    ["Gagal terhubung ke WiFi saat pairing", "Pastikan menggunakan WiFi 2.4GHz (bukan 5GHz), password benar, dan smartphone berada dekat router. Tahan tombol reset 5 detik lalu ulangi proses pairing dari awal."],
    ["Sudah berhasil pairing di app tapi tidak muncul di Dashboard NEXBILL", "Perangkat belum diaktivasi oleh tim NEXBILL — hubungi support dan sertakan nama outlet + nama perangkat di app (lihat Bagian 7)."],
    ["Ingin pindah WiFi atau pindahkan Smart Plug ke outlet lain", "Tahan tombol reset di badan Smart Plug selama 5 detik sampai lampu berkedip cepat (perangkat kembali ke mode pairing), lalu ulangi Bagian 6 dengan jaringan WiFi yang baru."],
    ["Perangkat sering \"offline\" di app", "Biasanya karena sinyal WiFi lemah di lokasi pemasangan — pindahkan router lebih dekat atau gunakan WiFi extender."],
  ]);

  heading(doc, "11. Garansi & Dukungan");
  paragraph(
    doc,
    "Unit yang cacat produksi, rusak saat diterima, atau salah kirim bisa diajukan penggantian/pengembalian dalam 7 hari sejak diterima — lihat Kebijakan Refund NEXBILL di Dashboard > Langganan untuk syarat lengkapnya. Untuk kendala teknis lain (pairing, konektivitas, dsb.), hubungi tim support NEXBILL melalui kanal yang sama dengan pengajuan dukungan di Dashboard."
  );

  return finalize(doc);
}
