import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/payments page — managing the payment methods cashiers can pick
 * from in POS/Rental/Other Income, including the per-method Fee (%) (MDR-style deduction) field.
 * Registered as a side effect on import; import this file once from the page module.
 */
registerDict({
  "payments.title": { id: "Pembayaran", en: "Payment Methods", ms: "Kaedah Pembayaran", th: "วิธีการชำระเงิน", fil: "Paraan ng Pagbabayad", vi: "Phương thức thanh toán" },
  "payments.subtitle": {
    id: "Metode pembayaran yang bisa dipilih kasir di POS, Rental, dan Pendapatan Lain-lain. Tambah, ubah nama, nonaktifkan, atau hapus sesuai kebutuhan outlet — perubahan langsung berlaku di halaman kasir. Atur juga Biaya (%) per metode (mis. MDR QRIS) — biaya ini otomatis dipotong dari kas/bank setiap transaksi masuk lewat metode itu dan dibukukan sebagai beban di jurnal.",
    en: "Payment methods available for cashiers to select in POS, Rental, and Other Income. Add, rename, deactivate, or delete them as your outlet needs — changes apply instantly on the cashier screen. Also set a Fee (%) per method (e.g. QRIS MDR) — this fee is automatically deducted from cash/bank for every transaction through that method and posted as an expense in the journal.",
    ms: "Kaedah pembayaran yang boleh dipilih oleh juruwang di POS, Sewa, dan Pendapatan Lain. Tambah, tukar nama, nyahaktifkan, atau padam mengikut keperluan outlet — perubahan terus berkuat kuasa di skrin juruwang. Tetapkan juga Bayaran (%) bagi setiap kaedah (cth. MDR QRIS) — bayaran ini akan dipotong secara automatik daripada tunai/bank bagi setiap transaksi melalui kaedah itu dan direkodkan sebagai perbelanjaan dalam jurnal.",
    th: "วิธีการชำระเงินที่พนักงานแคชเชียร์เลือกได้ในหน้าขาย POS, เช่า และรายได้อื่นๆ เพิ่ม เปลี่ยนชื่อ ปิดใช้งาน หรือลบได้ตามความต้องการของสาขา — การเปลี่ยนแปลงมีผลทันทีที่หน้าแคชเชียร์ นอกจากนี้ยังตั้งค่าธรรมเนียม (%) ต่อวิธีการชำระเงินได้ (เช่น ค่า MDR ของ QRIS) — ค่าธรรมเนียมนี้จะถูกหักออกจากเงินสด/ธนาคารโดยอัตโนมัติทุกครั้งที่มีธุรกรรมผ่านวิธีนั้น และบันทึกเป็นค่าใช้จ่ายในสมุดบัญชี",
    fil: "Mga paraan ng pagbabayad na puwedeng piliin ng cashier sa POS, Rental, at Iba pang Kita. Magdagdag, palitan ang pangalan, i-deactivate, o burahin ayon sa pangangailangan ng outlet — agad kumakapit ang pagbabago sa screen ng cashier. I-set din ang Bayad (%) kada paraan (hal. MDR ng QRIS) — awtomatikong ibabawas ang bayad na ito sa cash/bank sa bawat transaksyong dumaan sa paraang iyon at itatala bilang gastos sa journal.",
    vi: "Các phương thức thanh toán mà thu ngân có thể chọn tại POS, Cho thuê và Thu nhập khác. Thêm, đổi tên, vô hiệu hóa hoặc xóa tùy theo nhu cầu của cửa hàng — thay đổi có hiệu lực ngay trên màn hình thu ngân. Bạn cũng có thể đặt Phí (%) cho từng phương thức (vd. phí MDR của QRIS) — phí này sẽ tự động bị trừ vào tiền mặt/ngân hàng cho mỗi giao dịch qua phương thức đó và được ghi nhận là chi phí trong sổ nhật ký.",
  },

  // --- Webhook info card ---
  "payments.webhookTitle": {
    id: "Webhook URLs (gateway QRIS/e-wallet live)",
    en: "Webhook URLs (live QRIS/e-wallet gateway)",
    ms: "URL Webhook (gateway QRIS/e-wallet live)",
    th: "Webhook URL (เกตเวย์ QRIS/e-wallet แบบใช้งานจริง)",
    fil: "Webhook URLs (live na QRIS/e-wallet gateway)",
    vi: "URL Webhook (cổng QRIS/ví điện tử live)",
  },
  "payments.webhookDesc": {
    id: "Kalau ada metode yang disambungkan ke Fastpay/BukuPay dengan kredensial live (isi env FASTPAY_*/BUKUPAY_*), daftarkan URL ini di dashboard masing-masing gateway:",
    en: "If any method is connected to Fastpay/BukuPay with live credentials (FASTPAY_*/BUKUPAY_* env vars set), register these URLs in each gateway's dashboard:",
    ms: "Jika ada kaedah yang disambungkan ke Fastpay/BukuPay dengan kredensial live (env FASTPAY_*/BUKUPAY_* diisi), daftarkan URL ini di papan pemuka setiap gateway:",
    th: "หากมีวิธีการชำระเงินที่เชื่อมต่อกับ Fastpay/BukuPay ด้วยข้อมูลรับรองแบบใช้งานจริง (ตั้งค่า env FASTPAY_*/BUKUPAY_* แล้ว) ให้ลงทะเบียน URL เหล่านี้ในแดชบอร์ดของแต่ละเกตเวย์:",
    fil: "Kung may paraan na naka-connect sa Fastpay/BukuPay gamit ang live credentials (naka-set ang env FASTPAY_*/BUKUPAY_*), irehistro ang mga URL na ito sa dashboard ng bawat gateway:",
    vi: "Nếu có phương thức được kết nối với Fastpay/BukuPay bằng thông tin xác thực live (đã thiết lập biến môi trường FASTPAY_*/BUKUPAY_*), hãy đăng ký các URL này trong dashboard của từng cổng thanh toán:",
  },

  // --- Kind descriptions (table + KIND_LABEL) ---
  "payments.kind.cash": {
    id: "Tunai (hitung fisik saat tutup shift)",
    en: "Cash (physically counted at shift close)",
    ms: "Tunai (dikira secara fizikal semasa tutup syif)",
    th: "เงินสด (นับจำนวนจริงตอนปิดกะ)",
    fil: "Cash (binibilang nang pisikal pag-close ng shift)",
    vi: "Tiền mặt (đếm thực tế khi đóng ca)",
  },
  "payments.kind.balanceTracked": {
    id: "Saldo Terlacak (cek saldo app saat tutup shift)",
    en: "Tracked Balance (app balance checked at shift close)",
    ms: "Baki Dijejak (semak baki app semasa tutup syif)",
    th: "ยอดคงเหลือที่ติดตาม (ตรวจสอบยอดคงเหลือในแอปตอนปิดกะ)",
    fil: "Tinatrack na Balanse (chine-check ang balanse ng app pag-close ng shift)",
    vi: "Số dư được theo dõi (kiểm tra số dư ứng dụng khi đóng ca)",
  },
  "payments.kind.infoOnly": {
    id: "Info Saja (langsung masuk bank/EDC, tanpa cek saldo)",
    en: "Info Only (goes straight to bank/EDC, no balance check)",
    ms: "Maklumat Sahaja (terus masuk bank/EDC, tanpa semakan baki)",
    th: "ข้อมูลเท่านั้น (เข้าธนาคาร/EDC โดยตรง ไม่ต้องตรวจสอบยอดคงเหลือ)",
    fil: "Impormasyon Lang (diretso sa bangko/EDC, walang balance check)",
    vi: "Chỉ thông tin (vào thẳng ngân hàng/EDC, không kiểm tra số dư)",
  },

  // --- Short kind options (dropdown) ---
  "payments.kindOption.infoOnly": { id: "Info Saja", en: "Info Only", ms: "Maklumat Sahaja", th: "ข้อมูลเท่านั้น", fil: "Impormasyon Lang", vi: "Chỉ thông tin" },
  "payments.kindOption.balanceTracked": { id: "Saldo Terlacak", en: "Tracked Balance", ms: "Baki Dijejak", th: "ยอดคงเหลือที่ติดตาม", fil: "Tinatrack na Balanse", vi: "Số dư được theo dõi" },

  // --- Alerts / confirm ---
  "payments.alertNameRequired": {
    id: "Isi nama metode pembayaran.",
    en: "Enter the payment method name.",
    ms: "Isi nama kaedah pembayaran.",
    th: "กรอกชื่อวิธีการชำระเงิน",
    fil: "Ilagay ang pangalan ng paraan ng pagbabayad.",
    vi: "Nhập tên phương thức thanh toán.",
  },
  "payments.confirmDelete": {
    id: 'Hapus metode pembayaran "{label}"? Transaksi lama tidak berubah, hanya hilang dari pilihan kasir ke depannya.',
    en: 'Delete payment method "{label}"? Past transactions stay unchanged — it just disappears from the cashier\'s options going forward.',
    ms: 'Padam kaedah pembayaran "{label}"? Transaksi lama tidak berubah, hanya hilang daripada pilihan juruwang selepas ini.',
    th: 'ลบวิธีการชำระเงิน "{label}" หรือไม่? ธุรกรรมเก่าจะไม่เปลี่ยนแปลง เพียงแต่จะหายไปจากตัวเลือกของแคชเชียร์ในครั้งต่อไป',
    fil: 'Burahin ang paraan ng pagbabayad na "{label}"? Hindi mababago ang mga lumang transaksyon, mawawala lang ito sa mga pagpipilian ng cashier mula ngayon.',
    vi: 'Xóa phương thức thanh toán "{label}"? Các giao dịch cũ không thay đổi, chỉ biến mất khỏi lựa chọn của thu ngân từ nay về sau.',
  },

  // --- Table headers ---
  "payments.table.name": { id: "Nama", en: "Name", ms: "Nama", th: "ชื่อ", fil: "Pangalan", vi: "Tên" },
  "payments.table.key": { id: "Key", en: "Key", ms: "Key", th: "คีย์", fil: "Key", vi: "Khóa" },
  "payments.table.kind": { id: "Jenis", en: "Type", ms: "Jenis", th: "ประเภท", fil: "Uri", vi: "Loại" },
  "payments.table.fee": { id: "Biaya (%)", en: "Fee (%)", ms: "Bayaran (%)", th: "ค่าธรรมเนียม (%)", fil: "Bayad (%)", vi: "Phí (%)" },
  "payments.table.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },

  // --- Status / actions ---
  "payments.active": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งาน", fil: "Aktibo", vi: "Đang hoạt động" },
  "payments.inactive": { id: "Nonaktif", en: "Inactive", ms: "Tidak Aktif", th: "ปิดใช้งาน", fil: "Hindi Aktibo", vi: "Ngừng hoạt động" },
  "payments.edit": { id: "Edit", en: "Edit", ms: "Edit", th: "แก้ไข", fil: "I-edit", vi: "Sửa" },
  "payments.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Burahin", vi: "Xóa" },
  "payments.loading": {
    id: "Memuat metode pembayaran…",
    en: "Loading payment methods…",
    ms: "Memuatkan kaedah pembayaran…",
    th: "กำลังโหลดวิธีการชำระเงิน…",
    fil: "Nilo-load ang mga paraan ng pagbabayad…",
    vi: "Đang tải phương thức thanh toán…",
  },

  // --- Form ---
  "payments.labelPlaceholder": {
    id: "Nama metode (mis. OVO, ShopeePay)",
    en: "Method name (e.g. OVO, ShopeePay)",
    ms: "Nama kaedah (cth. OVO, ShopeePay)",
    th: "ชื่อวิธีการ (เช่น OVO, ShopeePay)",
    fil: "Pangalan ng paraan (hal. OVO, ShopeePay)",
    vi: "Tên phương thức (vd. OVO, ShopeePay)",
  },
  "payments.feePlaceholder": {
    id: "Biaya % (mis. 0.7)",
    en: "Fee % (e.g. 0.7)",
    ms: "Bayaran % (cth. 0.7)",
    th: "ค่าธรรมเนียม % (เช่น 0.7)",
    fil: "Bayad % (hal. 0.7)",
    vi: "Phí % (vd. 0.7)",
  },
  "payments.feeTitle": {
    id: "Biaya (MDR) yang dipotong dari kas/bank tiap transaksi masuk lewat metode ini, mis. 0.7 untuk QRIS. Kosongkan/0 kalau tidak ada biaya.",
    en: "Fee (MDR) deducted from cash/bank for every transaction through this method, e.g. 0.7 for QRIS. Leave empty/0 if there's no fee.",
    ms: "Bayaran (MDR) yang dipotong daripada tunai/bank bagi setiap transaksi melalui kaedah ini, cth. 0.7 untuk QRIS. Kosongkan/0 jika tiada bayaran.",
    th: "ค่าธรรมเนียม (MDR) ที่หักจากเงินสด/ธนาคารสำหรับทุกธุรกรรมผ่านวิธีนี้ เช่น 0.7 สำหรับ QRIS เว้นว่าง/0 หากไม่มีค่าธรรมเนียม",
    fil: "Bayad (MDR) na ibabawas sa cash/bank kada transaksyong dumaan sa paraang ito, hal. 0.7 para sa QRIS. Iwanang blangko/0 kung walang bayad.",
    vi: "Phí (MDR) bị trừ vào tiền mặt/ngân hàng cho mỗi giao dịch qua phương thức này, vd. 0.7 cho QRIS. Để trống/0 nếu không có phí.",
  },
  "payments.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "payments.addMethod": { id: "Tambah Metode", en: "Add Method", ms: "Tambah Kaedah", th: "เพิ่มวิธีการ", fil: "Magdagdag ng Paraan", vi: "Thêm phương thức" },
  "payments.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
});
