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

  // Longer-form explanation shown live under the "Jenis" dropdown on the add/edit form, so an
  // outlet owner picks the right one without having to guess from the short option label alone.
  "payments.kindHelp": {
    id: 'Pilih "Info Saja" kalau uangnya langsung masuk ke rekening bank/EDC outlet tanpa perlu dicek lagi (mis. transfer bank, kartu debit/kredit) — sistem cukup mencatat sudah dibayar. Pilih "Saldo Terlacak" kalau uangnya masuk ke saldo aplikasi outlet sendiri (mis. saldo DANA/GoPay/ShopeePay milik outlet) — saat tutup shift, kasir akan diminta mencocokkan saldo aplikasi itu dengan total transaksi hari ini, supaya ketahuan kalau ada selisih.',
    en: 'Choose "Info Only" if the money goes straight into the outlet\'s own bank account/EDC with nothing left to check (e.g. bank transfer, debit/credit card) — the system just records it as paid. Choose "Tracked Balance" if the money lands in the outlet\'s own app balance (e.g. the outlet\'s own DANA/GoPay/ShopeePay balance) — at shift close, the cashier will be asked to match that app balance against today\'s total transactions, so any mismatch gets caught.',
    ms: 'Pilih "Maklumat Sahaja" jika wang terus masuk ke akaun bank/EDC outlet tanpa perlu disemak lagi (cth. pindahan bank, kad debit/kredit) — sistem cuma merekod sebagai dibayar. Pilih "Baki Dijejak" jika wang masuk ke baki aplikasi outlet sendiri (cth. baki DANA/GoPay/ShopeePay milik outlet) — semasa tutup syif, juruwang akan diminta memadankan baki aplikasi itu dengan jumlah transaksi hari ini, supaya sebarang percanggahan dapat dikesan.',
    th: 'เลือก "ข้อมูลเท่านั้น" ถ้าเงินเข้าบัญชีธนาคาร/EDC ของสาขาโดยตรงโดยไม่ต้องตรวจสอบอีก (เช่น โอนเงินผ่านธนาคาร, บัตรเดบิต/เครดิต) — ระบบแค่บันทึกว่าชำระแล้ว เลือก "ยอดคงเหลือที่ติดตาม" ถ้าเงินเข้ายอดคงเหลือในแอปของสาขาเอง (เช่น ยอด DANA/GoPay/ShopeePay ของสาขา) — ตอนปิดกะ แคชเชียร์จะถูกขอให้ตรวจสอบยอดคงเหลือในแอปนั้นกับยอดรวมธุรกรรมวันนี้ เพื่อให้ทราบหากมีส่วนต่าง',
    fil: 'Piliin ang "Impormasyon Lang" kung diretso ang pera sa sariling bank account/EDC ng outlet nang walang kailangan pang i-check (hal. bank transfer, debit/credit card) — itatala lang ito ng system bilang bayad na. Piliin ang "Tinatrack na Balanse" kung napupunta ang pera sa sariling app balance ng outlet (hal. sariling balanse ng DANA/GoPay/ShopeePay ng outlet) — pag-close ng shift, hihilingin sa cashier na itugma ang balanse ng app na iyon sa kabuuang transaksyon ngayong araw, para mahuli agad kung may diperensya.',
    vi: 'Chọn "Chỉ thông tin" nếu tiền vào thẳng tài khoản ngân hàng/EDC của cửa hàng, không cần kiểm tra thêm (vd. chuyển khoản, thẻ ghi nợ/tín dụng) — hệ thống chỉ ghi nhận là đã thanh toán. Chọn "Số dư được theo dõi" nếu tiền vào số dư ứng dụng riêng của cửa hàng (vd. số dư DANA/GoPay/ShopeePay của cửa hàng) — khi đóng ca, thu ngân sẽ được yêu cầu đối chiếu số dư ứng dụng đó với tổng giao dịch hôm nay, để phát hiện nếu có chênh lệch.',
  },

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

  // The "Aktifkan Kanal iPaymu" quick-add panel these keys used to serve was removed 2026-09-13 —
  // see the doc comment in dashboard/payments/page.tsx for why (it let outlets collect customer
  // payments through NEXBILL's own merchant-to-platform iPaymu account by mistake).

  // --- iPaymu connection test ---
  "payments.ipaymu.testButton": { id: "Test Koneksi iPaymu", en: "Test iPaymu Connection", ms: "Uji Sambungan iPaymu", th: "ทดสอบการเชื่อมต่อ iPaymu", fil: "Test Koneksyon ng iPaymu", vi: "Kiểm tra kết nối iPaymu" },
  "payments.ipaymu.testing": { id: "Menguji koneksi...", en: "Testing connection...", ms: "Menguji sambungan...", th: "กำลังทดสอบการเชื่อมต่อ...", fil: "Sinusubukan ang koneksyon...", vi: "Đang kiểm tra kết nối..." },
  "payments.ipaymu.testHint": {
    id: "Memanggil API Check Balance iPaymu langsung — bukti nyata kredensial di server benar-benar terhubung, bukan cuma env var terisi.",
    en: "Calls iPaymu's Check Balance API directly — real proof the server's credentials are actually connected, not just that the env vars are filled in.",
    ms: "Memanggil API Check Balance iPaymu secara terus — bukti sebenar kredensial pelayan benar-benar tersambung, bukan sekadar env var diisi.",
    th: "เรียก API Check Balance ของ iPaymu โดยตรง — เป็นหลักฐานจริงว่าข้อมูลรับรองของเซิร์ฟเวอร์เชื่อมต่อได้จริง ไม่ใช่แค่กรอกตัวแปรสภาพแวดล้อมไว้",
    fil: "Direktang tinatawag ang Check Balance API ng iPaymu — tunay na patunay na talagang konektado ang credentials sa server, hindi lang basta napunan ang env vars.",
    vi: "Gọi trực tiếp API Check Balance của iPaymu — bằng chứng thực sự rằng thông tin xác thực trên server đã kết nối thật, không chỉ là điền biến môi trường.",
  },
  "payments.ipaymu.testNotConfigured": {
    id: "Belum dikonfigurasi — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY belum diisi di environment variables server. Semua kanal iPaymu saat ini berjalan dalam mode simulasi (mock), transaksi tidak benar-benar terkirim ke iPaymu.",
    en: "Not configured yet — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY aren't set in the server's environment variables. All iPaymu channels currently run in simulated (mock) mode; transactions are never actually sent to iPaymu.",
    ms: "Belum dikonfigurasi — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY belum diisi dalam environment variables pelayan. Semua saluran iPaymu kini berjalan dalam mod simulasi (mock), transaksi tidak benar-benar dihantar ke iPaymu.",
    th: "ยังไม่ได้ตั้งค่า — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY ยังไม่ได้กรอกในตัวแปรสภาพแวดล้อมของเซิร์ฟเวอร์ ช่องทาง iPaymu ทั้งหมดตอนนี้ทำงานในโหมดจำลอง (mock) ธุรกรรมไม่ได้ถูกส่งไปยัง iPaymu จริง",
    fil: "Hindi pa naka-configure — hindi pa nakalagay ang IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY sa environment variables ng server. Lahat ng channel ng iPaymu ay tumatakbo sa mock mode ngayon, hindi talaga naipapadala ang mga transaksyon sa iPaymu.",
    vi: "Chưa được cấu hình — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY chưa được thiết lập trong biến môi trường của server. Tất cả kênh iPaymu hiện chạy ở chế độ giả lập (mock), giao dịch chưa thực sự được gửi tới iPaymu.",
  },
  "payments.ipaymu.testSuccess": {
    id: "Terhubung — kredensial valid dan iPaymu merespons.",
    en: "Connected — credentials are valid and iPaymu responded.",
    ms: "Tersambung — kredensial sah dan iPaymu bertindak balas.",
    th: "เชื่อมต่อแล้ว — ข้อมูลรับรองถูกต้องและ iPaymu ตอบกลับ",
    fil: "Nakakonekta — valid ang credentials at tumugon ang iPaymu.",
    vi: "Đã kết nối — thông tin xác thực hợp lệ và iPaymu đã phản hồi.",
  },
  "payments.ipaymu.testBaseUrl": { id: "Base URL:", en: "Base URL:", ms: "Base URL:", th: "Base URL:", fil: "Base URL:", vi: "Base URL:" },
  "payments.ipaymu.testVa": { id: "VA:", en: "VA:", ms: "VA:", th: "VA:", fil: "VA:", vi: "VA:" },
  "payments.ipaymu.testMerchantBalance": { id: "Saldo Merchant:", en: "Merchant Balance:", ms: "Baki Merchant:", th: "ยอดคงเหลือร้านค้า:", fil: "Balanse ng Merchant:", vi: "Số dư Merchant:" },
  "payments.ipaymu.testMemberBalance": { id: "Saldo Member:", en: "Member Balance:", ms: "Baki Member:", th: "ยอดคงเหลือสมาชิก:", fil: "Balanse ng Member:", vi: "Số dư Member:" },
  "payments.ipaymu.testFailed": {
    id: "Gagal terhubung — kredensial terisi tapi iPaymu menolak permintaan.",
    en: "Connection failed — credentials are set but iPaymu rejected the request.",
    ms: "Gagal tersambung — kredensial diisi tetapi iPaymu menolak permintaan.",
    th: "เชื่อมต่อล้มเหลว — กรอกข้อมูลรับรองแล้วแต่ iPaymu ปฏิเสธคำขอ",
    fil: "Nabigo ang koneksyon — napunan ang credentials pero tinanggihan ng iPaymu ang request.",
    vi: "Kết nối thất bại — đã điền thông tin xác thực nhưng iPaymu từ chối yêu cầu.",
  },
  "payments.ipaymu.testFailedHint": {
    id: "Cek: (1) IPAYMU_VA & IPAYMU_API_KEY sepasang dan berasal dari mode yang sama (Sandbox atau Production) dengan IPAYMU_BASE_URL, (2) tidak ada spasi/karakter tersembunyi saat menyalin dari dashboard iPaymu, (3) untuk mode Production, IP server & domain notify/return/cancel URL sudah didaftarkan & disetujui iPaymu.",
    en: "Check: (1) IPAYMU_VA & IPAYMU_API_KEY are a matching pair from the same mode (Sandbox or Production) as IPAYMU_BASE_URL, (2) no stray spaces/hidden characters when copying from the iPaymu dashboard, (3) for Production mode, the server IP & notify/return/cancel URL domain are registered and approved by iPaymu.",
    ms: "Semak: (1) IPAYMU_VA & IPAYMU_API_KEY sepasang dan daripada mod yang sama (Sandbox atau Production) dengan IPAYMU_BASE_URL, (2) tiada ruang/aksara tersembunyi semasa menyalin dari dashboard iPaymu, (3) untuk mod Production, IP pelayan & domain notify/return/cancel URL telah didaftarkan & diluluskan iPaymu.",
    th: "ตรวจสอบ: (1) IPAYMU_VA และ IPAYMU_API_KEY เป็นคู่ที่มาจากโหมดเดียวกัน (Sandbox หรือ Production) กับ IPAYMU_BASE_URL, (2) ไม่มีช่องว่าง/อักขระที่ซ่อนอยู่เมื่อคัดลอกจากแดชบอร์ด iPaymu, (3) สำหรับโหมด Production ต้องลงทะเบียนและได้รับอนุมัติ IP เซิร์ฟเวอร์และโดเมน notify/return/cancel URL จาก iPaymu แล้ว",
    fil: "Suriin: (1) magkatugma ang IPAYMU_VA at IPAYMU_API_KEY mula sa parehong mode (Sandbox o Production) tulad ng IPAYMU_BASE_URL, (2) walang extra space/hidden character kapag kinopya mula sa dashboard ng iPaymu, (3) para sa Production mode, dapat naka-register at aprubado na ng iPaymu ang IP ng server at domain ng notify/return/cancel URL.",
    vi: "Kiểm tra: (1) IPAYMU_VA & IPAYMU_API_KEY là một cặp khớp nhau từ cùng chế độ (Sandbox hoặc Production) với IPAYMU_BASE_URL, (2) không có khoảng trắng/ký tự ẩn khi sao chép từ dashboard iPaymu, (3) đối với chế độ Production, IP server & domain notify/return/cancel URL đã được đăng ký và iPaymu chấp thuận.",
  },

  // --- iPaymu channel status panel ---
  "payments.ipaymu.channelsButton": { id: "Status Kanal iPaymu", en: "iPaymu Channel Status", ms: "Status Saluran iPaymu", th: "สถานะช่องทาง iPaymu", fil: "Status ng Channel ng iPaymu", vi: "Trạng thái kênh iPaymu" },
  "payments.ipaymu.channelsLoading": { id: "Memuat status kanal...", en: "Loading channel status...", ms: "Memuat status saluran...", th: "กำลังโหลดสถานะช่องทาง...", fil: "Nilo-load ang status ng channel...", vi: "Đang tải trạng thái kênh..." },
  "payments.ipaymu.channelsHint": {
    id: "Menampilkan status online/aktif tiap kanal langsung dari iPaymu — bedakan kanal gagal karena iPaymu sedang gangguan vs masalah di sistem kita.",
    en: "Shows each channel's live online/active status straight from iPaymu — tells a channel failing because iPaymu itself is down apart from a problem in our own system.",
    ms: "Memaparkan status online/aktif setiap saluran terus daripada iPaymu — bezakan saluran gagal kerana iPaymu mengalami gangguan berbanding masalah di sistem kita.",
    th: "แสดงสถานะออนไลน์/ใช้งานได้ของแต่ละช่องทางโดยตรงจาก iPaymu — แยกแยะช่องทางที่ล้มเหลวเพราะ iPaymu มีปัญหาเองกับปัญหาที่ระบบของเรา",
    fil: "Ipinapakita ang live na online/active status ng bawat channel direkta mula sa iPaymu — para malaman kung nabigo ang channel dahil may problema sa iPaymu mismo o sa sarili nating sistema.",
    vi: "Hiển thị trạng thái online/hoạt động trực tiếp của từng kênh từ iPaymu — phân biệt kênh lỗi do bản thân iPaymu gặp sự cố hay do lỗi ở hệ thống của mình.",
  },
  "payments.ipaymu.channelsFeature": { id: "Fitur", en: "Feature", ms: "Ciri", th: "ฟีเจอร์", fil: "Feature", vi: "Tính năng" },
  "payments.ipaymu.channelsHealth": { id: "Kesehatan", en: "Health", ms: "Kesihatan", th: "สุขภาพ", fil: "Health", vi: "Tình trạng" },
  "payments.ipaymu.channelsEmpty": { id: "Tidak ada data kanal dikembalikan iPaymu.", en: "No channel data returned by iPaymu.", ms: "Tiada data saluran dikembalikan oleh iPaymu.", th: "iPaymu ไม่ได้ส่งข้อมูลช่องทางกลับมา", fil: "Walang channel data na ibinalik ng iPaymu.", vi: "iPaymu không trả về dữ liệu kênh nào." },
});
