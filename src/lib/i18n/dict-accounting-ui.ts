import { registerDict } from "./registry";

/**
 * Teks halaman Accounting yang sebelumnya hanya punya fallback Bahasa Indonesia di kode (kunci t()
 * dipakai tapi belum pernah didaftarkan): tab Audit, Peta Kas, CALK, Migrasi Data, langkah Laba Rugi,
 * dan tombol Panduan. Diimpor oleh dict-accounting.ts, jadi semua yang sudah mengimpor
 * dict-accounting ikut mendapatkannya.
 */
registerDict({
  // --- Audit ---

  // --- Peta Kas & Bank ---
  "accounting.audit.cm.fam.kas": { id: "Kas 111x", en: "Cash 111x", ms: "Tunai 111x", th: "เงินสด 111x", fil: "Cash 111x", vi: "Tiền mặt 111x" },
  "accounting.audit.cm.fam.bank": { id: "Bank 112x", en: "Bank 112x", ms: "Bank 112x", th: "ธนาคาร 112x", fil: "Bangko 112x", vi: "Ngân hàng 112x" },
  "accounting.audit.cm.fam.digital": { id: "Digital/QRIS 113x", en: "Digital/QRIS 113x", ms: "Digital/QRIS 113x", th: "ดิจิทัล/QRIS 113x", fil: "Digital/QRIS 113x", vi: "Số/QRIS 113x" },
  "accounting.audit.cm.fam.deposit": { id: "Deposit PPOB 115x", en: "PPOB deposit 115x", ms: "Deposit PPOB 115x", th: "เงินฝาก PPOB 115x", fil: "PPOB deposit 115x", vi: "Ký quỹ PPOB 115x" },
  "accounting.audit.cm.fam.other": { id: "Bukan kas/bank", en: "Not cash/bank", ms: "Bukan tunai/bank", th: "ไม่ใช่เงินสด/ธนาคาร", fil: "Hindi cash/bangko", vi: "Không phải tiền/ngân hàng" },

  // --- CALK (SAK EMKM) ---

  // --- Migrasi Data / Impor Historis ---
  "accounting.migration.cat.penjualan.title": { id: "Penjualan", en: "Sales", ms: "Jualan", th: "ยอดขาย", fil: "Benta", vi: "Bán hàng" },
  "accounting.migration.cat.penjualan.desc": {
    id: "Omzet lama per hari/per kategori (rental, F&B, produk, PPOB), lengkap dengan diskon dan HPP supaya Laba Kotor historis benar.",
    en: "Old revenue per day/per category (rental, F&B, products, PPOB), with discounts and COGS so historical gross profit is right.",
    ms: "Jualan lama mengikut hari/kategori (sewa, F&B, produk, PPOB), lengkap dengan diskaun dan kos jualan supaya Untung Kasar sejarah tepat.",
    th: "ยอดขายเดิมรายวัน/รายหมวด (ค่าเช่า อาหารและเครื่องดื่ม สินค้า PPOB) พร้อมส่วนลดและต้นทุนขาย เพื่อให้กำไรขั้นต้นย้อนหลังถูกต้อง",
    fil: "Lumang benta kada araw/kategorya (rental, F&B, produkto, PPOB), kasama ang discount at COGS para tama ang historical gross profit.",
    vi: "Doanh thu cũ theo ngày/danh mục (thuê máy, F&B, sản phẩm, PPOB), kèm chiết khấu và giá vốn để lợi nhuận gộp lịch sử chính xác.",
  },
  "accounting.migration.cat.pembelian.title": { id: "Pembelian", en: "Purchases", ms: "Pembelian", th: "การซื้อ", fil: "Pagbili", vi: "Mua hàng" },
  "accounting.migration.cat.pembelian.desc": {
    id: "Belanja stok (masuk Persediaan) atau barang habis pakai (beban), tunai atau utang supplier.",
    en: "Stock purchases (into Inventory) or consumables (expense), paid in cash or on supplier credit.",
    ms: "Belian stok (masuk Inventori) atau barang guna habis (belanja), tunai atau hutang pembekal.",
    th: "ซื้อสต็อก (เข้าสินค้าคงเหลือ) หรือวัสดุสิ้นเปลือง (ค่าใช้จ่าย) จ่ายเงินสดหรือเป็นหนี้ซัพพลายเออร์",
    fil: "Pagbili ng stock (papasok sa Inventory) o consumables (gastos), cash o utang sa supplier.",
    vi: "Mua hàng tồn kho (vào Hàng tồn kho) hoặc vật tư tiêu hao (chi phí), trả tiền mặt hoặc nợ nhà cung cấp.",
  },
  "accounting.migration.cat.pendapatan_lain.title": { id: "Pendapatan Lain-lain", en: "Other Income", ms: "Pendapatan Lain", th: "รายได้อื่น", fil: "Ibang Kita", vi: "Thu nhập khác" },
  "accounting.migration.cat.pendapatan_lain.desc": {
    id: "Komisi, sewa tempat, penjualan barang bekas, sponsorship, denda, bunga bank, dan pendapatan non-inti lainnya.",
    en: "Commissions, space rental, sale of used goods, sponsorships, fines, bank interest, and other non-core income.",
    ms: "Komisen, sewa ruang, jualan barang terpakai, tajaan, denda, faedah bank, dan pendapatan bukan teras lain.",
    th: "ค่านายหน้า ค่าเช่าพื้นที่ ขายของมือสอง สปอนเซอร์ ค่าปรับ ดอกเบี้ยธนาคาร และรายได้นอกธุรกิจหลักอื่น ๆ",
    fil: "Komisyon, renta ng puwesto, pagbebenta ng gamit na, sponsorship, multa, interes sa bangko, at iba pang kita na hindi pangunahing negosyo.",
    vi: "Hoa hồng, cho thuê mặt bằng, bán đồ cũ, tài trợ, tiền phạt, lãi ngân hàng và các khoản thu ngoài hoạt động chính khác.",
  },
  "accounting.migration.cat.pengeluaran.title": { id: "Pengeluaran", en: "Expenses", ms: "Perbelanjaan", th: "ค่าใช้จ่าย", fil: "Gastos", vi: "Chi phí" },
  "accounting.migration.cat.pengeluaran.desc": {
    id: "Gaji, sewa, listrik, air, internet, servis, iklan, admin bank, pajak, dan beban lain — tunai atau utang.",
    en: "Salaries, rent, electricity, water, internet, servicing, advertising, bank fees, taxes, and other expenses — cash or on credit.",
    ms: "Gaji, sewa, elektrik, air, internet, servis, iklan, caj bank, cukai, dan belanja lain — tunai atau hutang.",
    th: "เงินเดือน ค่าเช่า ค่าไฟ ค่าน้ำ อินเทอร์เน็ต ค่าซ่อม ค่าโฆษณา ค่าธรรมเนียมธนาคาร ภาษี และค่าใช้จ่ายอื่น — เงินสดหรือค้างจ่าย",
    fil: "Sahod, renta, kuryente, tubig, internet, serbisyo, advertising, bank fee, buwis, at iba pang gastos — cash o utang.",
    vi: "Lương, tiền thuê, điện, nước, internet, sửa chữa, quảng cáo, phí ngân hàng, thuế và chi phí khác — tiền mặt hoặc công nợ.",
  },

  // --- Laba Rugi (langkah) ---

  // --- Panduan (TabGuide / WorkflowGuide) ---
  "accounting.guide.prefix": { id: "Panduan: {tab}", en: "Guide: {tab}", ms: "Panduan: {tab}", th: "คู่มือ: {tab}", fil: "Gabay: {tab}", vi: "Hướng dẫn: {tab}" },
  "accounting.guide.read": { id: "Baca panduan", en: "Read guide", ms: "Baca panduan", th: "อ่านคู่มือ", fil: "Basahin ang gabay", vi: "Đọc hướng dẫn" },
  "accounting.guide.close": { id: "Tutup", en: "Close", ms: "Tutup", th: "ปิด", fil: "Isara", vi: "Đóng" },
  "accounting.guide.concept": { id: "Konsep akuntansinya", en: "The accounting concept", ms: "Konsep perakaunannya", th: "แนวคิดทางบัญชี", fil: "Ang konsepto sa accounting", vi: "Khái niệm kế toán" },
  "accounting.guide.uses": { id: "Kegunaan", en: "What it's for", ms: "Kegunaan", th: "ประโยชน์", fil: "Gamit", vi: "Công dụng" },
  "accounting.guide.watch": { id: "Yang harus diperhatikan", en: "Watch out for", ms: "Perkara yang perlu diberi perhatian", th: "สิ่งที่ต้องระวัง", fil: "Mga dapat bantayan", vi: "Cần lưu ý" },
  "accounting.guide.steps": { id: "Langkah kerja", en: "Steps", ms: "Langkah kerja", th: "ขั้นตอน", fil: "Mga hakbang", vi: "Các bước" },
  "accounting.guide.workflowTitle": { id: "Panduan Alur Kerja Akuntansi Outlet", en: "Outlet Accounting Workflow Guide", ms: "Panduan Aliran Kerja Perakaunan Outlet", th: "คู่มือขั้นตอนงานบัญชีของร้าน", fil: "Gabay sa Workflow ng Accounting ng Outlet", vi: "Hướng dẫn quy trình kế toán cửa hàng" },
  "accounting.guide.workflowIntro": {
    id: "Hampir semua jurnal dibuat otomatis dari kasir, rental, expense, belanja supplier, dan aset. Tugas Anda: memastikan setiap transaksi tercatat di menunya, lalu memeriksa dan menutup buku secara rutin.",
    en: "Almost every journal entry is created automatically from the cashier, rentals, expenses, supplier purchases, and assets. Your job: make sure every transaction is recorded in its own menu, then review and close the books regularly.",
    ms: "Hampir semua jurnal dibuat secara automatik daripada juruwang, sewaan, perbelanjaan, belian pembekal, dan aset. Tugas anda: pastikan setiap transaksi direkod dalam menunya, kemudian semak dan tutup buku secara berkala.",
    th: "รายการบัญชีเกือบทั้งหมดสร้างอัตโนมัติจากแคชเชียร์ การเช่า ค่าใช้จ่าย การซื้อจากซัพพลายเออร์ และสินทรัพย์ หน้าที่ของคุณ: ตรวจให้แน่ใจว่าทุกรายการถูกบันทึกในเมนูของมัน แล้วตรวจสอบและปิดบัญชีเป็นประจำ",
    fil: "Halos lahat ng journal entry ay awtomatikong ginagawa mula sa cashier, rental, gastos, pagbili sa supplier, at assets. Ang trabaho mo: siguraduhing naitatala ang bawat transaksyon sa sarili nitong menu, saka regular na suriin at isara ang libro.",
    vi: "Hầu hết bút toán được tạo tự động từ thu ngân, cho thuê, chi phí, mua hàng nhà cung cấp và tài sản. Việc của bạn: đảm bảo mọi giao dịch được ghi ở đúng menu, rồi kiểm tra và khóa sổ định kỳ.",
  },
  "accounting.guide.closeAria": { id: "Tutup panduan", en: "Close guide", ms: "Tutup panduan", th: "ปิดคู่มือ", fil: "Isara ang gabay", vi: "Đóng hướng dẫn" },
  "accounting.guide.golden": { id: "Aturan emas pembukuan", en: "Golden rules of bookkeeping", ms: "Peraturan emas simpan kira", th: "กฎทองของการทำบัญชี", fil: "Mga gintong tuntunin ng bookkeeping", vi: "Quy tắc vàng ghi sổ" },
  "accounting.guide.startFrom": { id: "Mulai dari:", en: "Start with:", ms: "Mula dengan:", th: "เริ่มจาก:", fil: "Magsimula sa:", vi: "Bắt đầu từ:" },

  // --- Pesan galat ---
  "accounting.common.unknownCause": { id: "penyebab tidak diketahui", en: "unknown cause", ms: "punca tidak diketahui", th: "ไม่ทราบสาเหตุ", fil: "hindi alam ang dahilan", vi: "không rõ nguyên nhân" },
  "accounting.audit.cm.kindCash": { id: "tunai", en: "cash", ms: "tunai", th: "เงินสด", fil: "cash", vi: "tiền mặt" },
  "accounting.audit.cm.kindNonCash": { id: "non-tunai", en: "non-cash", ms: "bukan tunai", th: "ไม่ใช่เงินสด", fil: "hindi cash", vi: "không dùng tiền mặt" },
  "accounting.audit.cm.primary": { id: "utama", en: "primary", ms: "utama", th: "หลัก", fil: "pangunahin", vi: "chính" },
});
