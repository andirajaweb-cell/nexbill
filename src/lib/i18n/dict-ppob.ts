import { registerDict } from "./registry";

/**
 * Translations for /dashboard/ppob — the PPOB (Payment Point Online Bank) bill-payment module:
 * e-wallet top-ups, electricity tokens, mobile credit, transfers, cash withdrawals, provider
 * pricing/margin rules, and the transaction ledger. "PPOB" itself is kept untranslated in every
 * language — it's the actual industry/product term (Indonesian: Payment Point Online Bank), not
 * a phrase to localize. Registered as a side effect on import; import this file once near the
 * top of the PPOB page before any component calls useDashboardLang().t().
 */
registerDict({
  // --- Module disabled placeholder (Settings > Feature Management > PPOB_ENABLED) ---
  "ppob.disabledNotice": { id: "Modul PPOB sedang nonaktif.", en: "The PPOB module is currently disabled.", ms: "Modul PPOB sedang dinyahaktifkan.", th: "โมดูล PPOB ปิดใช้งานอยู่ในขณะนี้", fil: "Naka-disable sa ngayon ang PPOB module.", vi: "Mô-đun PPOB hiện đang tắt." },
  "ppob.disabledEnablePrefix": { id: "Aktifkan di ", en: "Enable it in ", ms: "Aktifkan di ", th: "เปิดใช้งานที่ ", fil: "I-enable sa ", vi: "Bật tại " },
  "ppob.disabledEnableLinkText": { id: "Pengaturan > Feature Management", en: "Settings > Feature Management", ms: "Tetapan > Feature Management", th: "การตั้งค่า > Feature Management", fil: "Settings > Feature Management", vi: "Cài đặt > Feature Management" },
  "ppob.disabledEnableSuffix": { id: ".", en: ".", ms: ".", th: "", fil: ".", vi: "." },
  "ppob.disabledContactAdmin": { id: "Hubungi Owner/Superuser untuk mengaktifkannya.", en: "Contact the Owner/Superuser to enable it.", ms: "Hubungi Owner/Superuser untuk mengaktifkannya.", th: "ติดต่อ Owner/Superuser เพื่อเปิดใช้งาน", fil: "Makipag-ugnayan sa Owner/Superuser para i-enable ito.", vi: "Liên hệ Owner/Superuser để bật tính năng này." },

  // --- Product categories (shared: summary cards, price rules, entry form) ---
  "ppob.category.ewalletTopup": { id: "Top Up E-Wallet", en: "E-Wallet Top Up", ms: "Isi Semula E-Wallet", th: "เติมเงินอีวอลเล็ต", fil: "Top Up ng E-Wallet", vi: "Nạp ví điện tử" },
  "ppob.category.tokenListrik": { id: "Token Listrik PLN", en: "PLN Electricity Token", ms: "Token Elektrik PLN", th: "โทเค็นไฟฟ้า PLN", fil: "Token ng Kuryente ng PLN", vi: "Mã token tiền điện PLN" },
  "ppob.category.pulsa": { id: "Pulsa", en: "Mobile Credit", ms: "Prabayar Telefon", th: "เติมเงินมือถือ", fil: "Load", vi: "Nạp thẻ điện thoại" },
  "ppob.category.transfer": { id: "Transfer", en: "Transfer", ms: "Pemindahan", th: "โอนเงิน", fil: "Padala ng Pera", vi: "Chuyển khoản" },
  "ppob.category.tarikTunai": { id: "Tarik Tunai", en: "Cash Withdrawal", ms: "Pengeluaran Tunai", th: "ถอนเงินสด", fil: "Pag-withdraw ng Cash", vi: "Rút tiền mặt" },
  "ppob.category.lainnya": { id: "Lainnya", en: "Other", ms: "Lain-lain", th: "อื่นๆ", fil: "Iba pa", vi: "Khác" },

  // --- Header ---
  "ppob.subtitle": {
    id: "Pencatatan transaksi PPOB (top up e-wallet, token listrik, pulsa, transfer, tarik tunai) via Fastpay — terpisah dari stok F&B, tetap satu accounting. Biaya provider (Fastpay Fee Outlet, tier Basic) dibukukan sebagai beban riil, terpisah dari margin toko yang Anda atur sendiri. Edit dan hapus permanen transaksi hanya bisa dilakukan akun Superuser.",
    en: "PPOB transaction records (e-wallet top-ups, electricity tokens, mobile credit, transfers, cash withdrawals) via Fastpay — kept separate from F&B stock, but still one accounting ledger. Provider fees (Fastpay Fee Outlet, Basic tier) are booked as a real expense, separate from the store margin you set yourself. Editing and permanently deleting transactions can only be done by a Superuser account.",
    ms: "Rekod transaksi PPOB (isi semula e-wallet, token elektrik, prabayar telefon, pemindahan, pengeluaran tunai) melalui Fastpay — berasingan daripada stok F&B, tetapi tetap satu perakaunan. Fi penyedia (Fastpay Fee Outlet, tier Basic) direkodkan sebagai perbelanjaan sebenar, berasingan daripada margin kedai yang anda tetapkan sendiri. Sunting dan padam kekal transaksi hanya boleh dilakukan oleh akaun Superuser.",
    th: "บันทึกธุรกรรม PPOB (เติมเงินอีวอลเล็ต โทเค็นไฟฟ้า เติมเงินมือถือ โอนเงิน ถอนเงินสด) ผ่าน Fastpay — แยกจากสต็อก F&B แต่ยังคงอยู่ในบัญชีเดียวกัน ค่าธรรมเนียมผู้ให้บริการ (Fastpay Fee Outlet ระดับ Basic) จะถูกบันทึกเป็นค่าใช้จ่ายจริง แยกจากมาร์จิ้นร้านที่คุณกำหนดเอง การแก้ไขและลบธุรกรรมถาวรทำได้เฉพาะบัญชี Superuser เท่านั้น",
    fil: "Pagtatala ng transaksyon ng PPOB (top up ng e-wallet, token ng kuryente, load, padala ng pera, pag-withdraw ng cash) sa pamamagitan ng Fastpay — hiwalay sa stock ng F&B, pero iisa pa rin ang accounting. Ang bayad sa provider (Fastpay Fee Outlet, tier Basic) ay itinatala bilang tunay na gastos, hiwalay sa margin ng tindahan na sarili mong itinakda. Ang pag-edit at permanenteng pagtanggal ng transaksyon ay puwede lang gawin ng Superuser account.",
    vi: "Ghi nhận giao dịch PPOB (nạp ví điện tử, mã token tiền điện, nạp thẻ điện thoại, chuyển khoản, rút tiền mặt) qua Fastpay — tách riêng khỏi tồn kho F&B nhưng vẫn chung một sổ kế toán. Phí nhà cung cấp (Fastpay Fee Outlet, gói Basic) được ghi nhận là chi phí thực tế, tách biệt với biên lợi nhuận cửa hàng do bạn tự thiết lập. Chỉnh sửa và xóa vĩnh viễn giao dịch chỉ có thể thực hiện bởi tài khoản Superuser.",
  },

  // --- Date filter toolbar ---
  "ppob.filter.from": { id: "Dari", en: "From", ms: "Dari", th: "จาก", fil: "Mula", vi: "Từ" },
  "ppob.filter.to": { id: "Sampai", en: "To", ms: "Hingga", th: "ถึง", fil: "Hanggang", vi: "Đến" },
  "ppob.filter.today": { id: "Hari Ini", en: "Today", ms: "Hari Ini", th: "วันนี้", fil: "Ngayon", vi: "Hôm nay" },
  "ppob.filter.thisMonth": { id: "Bulan Ini", en: "This Month", ms: "Bulan Ini", th: "เดือนนี้", fil: "Ngayong Buwan", vi: "Tháng này" },
  "ppob.btnManagePriceRules": { id: "Kelola Harga Provider & Margin", en: "Manage Provider Pricing & Margin", ms: "Urus Harga Penyedia & Margin", th: "จัดการราคาผู้ให้บริการ & มาร์จิ้น", fil: "Pamahalaan ang Presyo ng Provider & Margin", vi: "Quản lý giá nhà cung cấp & biên lợi nhuận" },
  "ppob.btnCloseFormPriceRules": { id: "Tutup Harga Provider & Margin", en: "Close Provider Pricing & Margin", ms: "Tutup Harga Penyedia & Margin", th: "ปิดราคาผู้ให้บริการ & มาร์จิ้น", fil: "Isara ang Presyo ng Provider & Margin", vi: "Đóng giá nhà cung cấp & biên lợi nhuận" },

  // --- Price Rules panel ---
  "ppob.priceRules.heading": { id: "Harga Provider & Margin", en: "Provider Pricing & Margin", ms: "Harga Penyedia & Margin", th: "ราคาผู้ให้บริการ & มาร์จิ้น", fil: "Presyo ng Provider & Margin", vi: "Giá nhà cung cấp & biên lợi nhuận" },
  "ppob.priceRules.description": {
    id: "Biaya Fastpay diisi dari daftar Fee Outlet tier Basic (fastpay.co.id/blog/layanan-fee) — margin sepenuhnya Anda atur sendiri. Keduanya jadi default saat kasir memilih produk ini, tapi tetap bisa diubah per transaksi.",
    en: "The Fastpay fee is filled in from the Basic tier Fee Outlet list (fastpay.co.id/blog/layanan-fee) — the margin is entirely up to you. Both become the default when the cashier selects this product, but can still be changed per transaction.",
    ms: "Fi Fastpay diisi daripada senarai Fee Outlet tier Basic (fastpay.co.id/blog/layanan-fee) — margin sepenuhnya anda tetapkan sendiri. Kedua-duanya menjadi lalai apabila juruwang memilih produk ini, tetapi masih boleh diubah bagi setiap transaksi.",
    th: "ค่าธรรมเนียม Fastpay กรอกจากรายการ Fee Outlet ระดับ Basic (fastpay.co.id/blog/layanan-fee) — ส่วนมาร์จิ้นคุณกำหนดเองทั้งหมด ทั้งสองค่าจะถูกใช้เป็นค่าเริ่มต้นเมื่อแคชเชียร์เลือกสินค้านี้ แต่ยังสามารถเปลี่ยนได้ต่อธุรกรรม",
    fil: "Ang bayad sa Fastpay ay kinukuha mula sa listahan ng Fee Outlet tier Basic (fastpay.co.id/blog/layanan-fee) — ikaw mismo ang buong nagtatakda ng margin. Pareho itong magiging default kapag pinili ng cashier ang produktong ito, pero puwede pa ring baguhin kada transaksyon.",
    vi: "Phí Fastpay được điền từ danh sách Fee Outlet gói Basic (fastpay.co.id/blog/layanan-fee) — biên lợi nhuận hoàn toàn do bạn tự thiết lập. Cả hai sẽ trở thành giá trị mặc định khi thu ngân chọn sản phẩm này, nhưng vẫn có thể thay đổi theo từng giao dịch.",
  },
  "ppob.priceRules.col.category": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "ppob.priceRules.col.product": { id: "Produk", en: "Product", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "ppob.priceRules.col.providerFee": { id: "Biaya Fastpay", en: "Fastpay Fee", ms: "Fi Fastpay", th: "ค่าธรรมเนียม Fastpay", fil: "Bayad sa Fastpay", vi: "Phí Fastpay" },
  "ppob.priceRules.col.defaultMargin": { id: "Margin Default", en: "Default Margin", ms: "Margin Lalai", th: "มาร์จิ้นเริ่มต้น", fil: "Default na Margin", vi: "Biên lợi nhuận mặc định" },
  "ppob.priceRules.productPlaceholder": { id: "Nama produk", en: "Product name", ms: "Nama produk", th: "ชื่อสินค้า", fil: "Pangalan ng produkto", vi: "Tên sản phẩm" },
  "ppob.priceRules.providerFeePlaceholder": { id: "Biaya Fastpay", en: "Fastpay fee", ms: "Fi Fastpay", th: "ค่าธรรมเนียม Fastpay", fil: "Bayad sa Fastpay", vi: "Phí Fastpay" },
  "ppob.priceRules.defaultMarginPlaceholder": { id: "Margin default", en: "Default margin", ms: "Margin lalai", th: "มาร์จิ้นเริ่มต้น", fil: "Default na margin", vi: "Biên lợi nhuận mặc định" },
  "ppob.confirmDeletePriceRule": { id: "Hapus aturan harga ini?", en: "Delete this pricing rule?", ms: "Padam peraturan harga ini?", th: "ลบกฎราคานี้หรือไม่?", fil: "Tatanggalin ang panuntunan ng presyong ito?", vi: "Xóa quy tắc giá này?" },

  // --- Entry form ---
  "ppob.entryForm.heading": { id: "Catat Transaksi PPOB", en: "Record a PPOB Transaction", ms: "Catat Transaksi PPOB", th: "บันทึกธุรกรรม PPOB", fil: "Itala ang Transaksyon ng PPOB", vi: "Ghi nhận giao dịch PPOB" },
  "ppob.entryForm.productPlaceholder": { id: "Produk (mis. DANA)", en: "Product (e.g. DANA)", ms: "Produk (cth. DANA)", th: "สินค้า (เช่น DANA)", fil: "Produkto (hal. DANA)", vi: "Sản phẩm (vd: DANA)" },
  "ppob.entryForm.serviceRefPlaceholder": { id: "No. HP / ID Pelanggan (perintah jasa)", en: "Phone No. / Customer ID (service reference)", ms: "No. Telefon / ID Pelanggan (rujukan perkhidmatan)", th: "หมายเลขโทรศัพท์ / รหัสลูกค้า (อ้างอิงบริการ)", fil: "Numero ng Telepono / ID ng Customer (service reference)", vi: "Số điện thoại / Mã khách hàng (mã dịch vụ)" },
  "ppob.entryForm.customerNamePlaceholder": { id: "Nama customer (opsional)", en: "Customer name (optional)", ms: "Nama pelanggan (pilihan)", th: "ชื่อลูกค้า (ไม่บังคับ)", fil: "Pangalan ng customer (opsyonal)", vi: "Tên khách hàng (không bắt buộc)" },
  "ppob.entryForm.modalPlaceholder": { id: "Modal (default = nominal)", en: "Cost (default = amount)", ms: "Modal (lalai = nominal)", th: "ต้นทุน (ค่าเริ่มต้น = จำนวนเงิน)", fil: "Puhunan (default = halaga)", vi: "Vốn (mặc định = số tiền)" },
  "ppob.entryForm.uangMasukLabel": { id: "Uang Masuk (dibebankan ke customer)", en: "Cash In (charged to customer)", ms: "Wang Masuk (dikenakan kepada pelanggan)", th: "เงินเข้า (เรียกเก็บจากลูกค้า)", fil: "Papasok na Pera (sisingilin sa customer)", vi: "Tiền thu vào (tính cho khách hàng)" },
  "ppob.entryForm.saving": { id: "Menyimpan...", en: "Saving...", ms: "Menyimpan...", th: "กำลังบันทึก...", fil: "Sine-save...", vi: "Đang lưu..." },
  "ppob.entryForm.submit": { id: "Simpan Transaksi", en: "Save Transaction", ms: "Simpan Transaksi", th: "บันทึกธุรกรรม", fil: "I-save ang Transaksyon", vi: "Lưu giao dịch" },

  // --- Shared field placeholders (entry form + edit modal) ---
  "ppob.field.nominalPlaceholder": { id: "Nominal", en: "Amount", ms: "Nominal", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "ppob.field.providerFeePlaceholder": { id: "Biaya Fastpay (beban)", en: "Fastpay fee (expense)", ms: "Fi Fastpay (perbelanjaan)", th: "ค่าธรรมเนียม Fastpay (ค่าใช้จ่าย)", fil: "Bayad sa Fastpay (gastos)", vi: "Phí Fastpay (chi phí)" },
  "ppob.field.feeAdminPlaceholder": { id: "Margin (keuntungan)", en: "Margin (profit)", ms: "Margin (keuntungan)", th: "มาร์จิ้น (กำไร)", fil: "Margin (tubo)", vi: "Biên lợi nhuận (lợi nhuận)" },
  "ppob.field.fundingPlaceholder": { id: "Sumber Modal (keluar)", en: "Funding Source (outgoing)", ms: "Sumber Modal (keluar)", th: "แหล่งเงินทุน (จ่ายออก)", fil: "Pinagkunan ng Puhunan (papalabas)", vi: "Nguồn vốn (chi ra)" },
  "ppob.field.receivingPlaceholder": { id: "Penerima (uang masuk)", en: "Receiving Account (incoming)", ms: "Akaun Penerima (masuk)", th: "บัญชีผู้รับ (เงินเข้า)", fil: "Tatanggap (papasok na pera)", vi: "Tài khoản nhận (tiền vào)" },
  "ppob.field.notesPlaceholder": { id: "Catatan (opsional)", en: "Notes (optional)", ms: "Catatan (pilihan)", th: "หมายเหตุ (ไม่บังคับ)", fil: "Tala (opsyonal)", vi: "Ghi chú (không bắt buộc)" },
  "ppob.field.productPlaceholder": { id: "Produk", en: "Product", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "ppob.field.serviceRefPlaceholderShort": { id: "No. HP / ID Pelanggan", en: "Phone No. / Customer ID", ms: "No. Telefon / ID Pelanggan", th: "หมายเลขโทรศัพท์ / รหัสลูกค้า", fil: "Numero ng Telepono / ID ng Customer", vi: "Số điện thoại / Mã khách hàng" },
  "ppob.field.customerNamePlaceholderShort": { id: "Nama customer", en: "Customer name", ms: "Nama pelanggan", th: "ชื่อลูกค้า", fil: "Pangalan ng customer", vi: "Tên khách hàng" },
  "ppob.field.modalPlaceholderShort": { id: "Modal", en: "Cost", ms: "Modal", th: "ต้นทุน", fil: "Puhunan", vi: "Vốn" },
  "ppob.field.notesPlaceholderShort": { id: "Catatan", en: "Notes", ms: "Catatan", th: "หมายเหตุ", fil: "Tala", vi: "Ghi chú" },

  // --- Edit modal (Superuser correction) ---
  "ppob.editModal.heading": { id: "Edit Transaksi PPOB", en: "Edit PPOB Transaction", ms: "Edit Transaksi PPOB", th: "แก้ไขธุรกรรม PPOB", fil: "I-edit ang Transaksyon ng PPOB", vi: "Sửa giao dịch PPOB" },
  "ppob.editModal.warning": {
    id: "Jurnal lama akan dibatalkan otomatis dan diganti jurnal baru sesuai angka yang dikoreksi.",
    en: "The old journal entry will be automatically voided and replaced with a new one based on the corrected figures.",
    ms: "Jurnal lama akan dibatalkan secara automatik dan digantikan dengan jurnal baharu mengikut angka yang dibetulkan.",
    th: "รายการบัญชีเดิมจะถูกยกเลิกโดยอัตโนมัติและแทนที่ด้วยรายการใหม่ตามตัวเลขที่แก้ไข",
    fil: "Awtomatikong ibi-void ang lumang journal entry at papalitan ng bago batay sa itinamang numero.",
    vi: "Bút toán cũ sẽ tự động bị hủy và thay bằng bút toán mới theo số liệu đã điều chỉnh.",
  },
  "ppob.editModal.uangMasukLabel": { id: "Uang Masuk", en: "Cash In", ms: "Wang Masuk", th: "เงินเข้า", fil: "Papasok na Pera", vi: "Tiền thu vào" },
  "ppob.editModal.submit": { id: "Simpan Koreksi", en: "Save Correction", ms: "Simpan Pembetulan", th: "บันทึกการแก้ไข", fil: "I-save ang Pagwawasto", vi: "Lưu điều chỉnh" },
  "ppob.close": { id: "Tutup", en: "Close", ms: "Tutup", th: "ปิด", fil: "Isara", vi: "Đóng" },

  // --- Generic action labels ---
  "ppob.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "ppob.add": { id: "Tambah", en: "Add", ms: "Tambah", th: "เพิ่ม", fil: "Idagdag", vi: "Thêm" },
  "ppob.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "ppob.edit": { id: "Edit", en: "Edit", ms: "Edit", th: "แก้ไข", fil: "I-edit", vi: "Sửa" },
  "ppob.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },
  "ppob.void": { id: "Batalkan", en: "Void", ms: "Batalkan", th: "ยกเลิก", fil: "Bawiin", vi: "Hủy giao dịch" },

  // --- Alerts / confirms / prompts ---
  "ppob.alertFillProductName": { id: "Isi nama produk.", en: "Enter the product name.", ms: "Isi nama produk.", th: "กรุณากรอกชื่อสินค้า", fil: "Ilagay ang pangalan ng produkto.", vi: "Vui lòng nhập tên sản phẩm." },
  "ppob.alertNominalPositive": { id: "Nominal harus lebih dari 0.", en: "Amount must be greater than 0.", ms: "Nominal mesti lebih daripada 0.", th: "จำนวนเงินต้องมากกว่า 0", fil: "Dapat higit sa 0 ang halaga.", vi: "Số tiền phải lớn hơn 0." },
  "ppob.alertSelectAccounts": { id: "Pilih akun sumber modal dan akun penerima.", en: "Select the funding source account and the receiving account.", ms: "Pilih akaun sumber modal dan akaun penerima.", th: "โปรดเลือกบัญชีแหล่งเงินทุนและบัญชีผู้รับ", fil: "Pumili ng account ng pinagkunan ng puhunan at account na tatanggap.", vi: "Chọn tài khoản nguồn vốn và tài khoản nhận." },
  "ppob.promptVoidReason": { id: "Alasan pembatalan transaksi PPOB ini?", en: "Reason for voiding this PPOB transaction?", ms: "Sebab pembatalan transaksi PPOB ini?", th: "เหตุผลในการยกเลิกธุรกรรม PPOB นี้?", fil: "Ano ang dahilan ng pag-void sa transaksyong PPOB na ito?", vi: "Lý do hủy giao dịch PPOB này?" },
  "ppob.confirmDeleteTransaction": {
    id: "Hapus transaksi PPOB ini secara PERMANEN? Beda dengan Batalkan — ini menghapus total dari sistem (termasuk jurnal akuntansinya) dan tidak bisa dibatalkan.",
    en: "PERMANENTLY delete this PPOB transaction? This is different from Void — it removes it completely from the system (including its accounting journal) and cannot be undone.",
    ms: "Padam transaksi PPOB ini secara KEKAL? Berbeza dengan Batalkan — ini memadam sepenuhnya daripada sistem (termasuk jurnal perakaunannya) dan tidak boleh diundur.",
    th: "ลบธุรกรรม PPOB นี้อย่างถาวรหรือไม่? แตกต่างจากการยกเลิก — การกระทำนี้จะลบออกจากระบบทั้งหมด (รวมถึงรายการบัญชี) และไม่สามารถย้อนกลับได้",
    fil: "PERMANENTENG tatanggalin ang transaksyong PPOB na ito? Iba ito sa Void — ganap itong tatanggalin sa sistema (kasama ang accounting journal nito) at hindi na maibabalik.",
    vi: "Xóa VĨNH VIỄN giao dịch PPOB này? Khác với Hủy — thao tác này xóa hoàn toàn khỏi hệ thống (bao gồm cả bút toán kế toán) và không thể hoàn tác.",
  },
  "ppob.alertTransactionDeleted": { id: "Transaksi PPOB berhasil dihapus.", en: "PPOB transaction deleted successfully.", ms: "Transaksi PPOB berjaya dipadam.", th: "ลบธุรกรรม PPOB สำเร็จแล้ว", fil: "Matagumpay na natanggal ang transaksyong PPOB.", vi: "Đã xóa giao dịch PPOB thành công." },

  // --- Transaction table columns ---
  "ppob.col.time": { id: "Waktu", en: "Time", ms: "Masa", th: "เวลา", fil: "Oras", vi: "Thời gian" },
  "ppob.col.cashier": { id: "Kasir", en: "Cashier", ms: "Juruwang", th: "แคชเชียร์", fil: "Cashier", vi: "Thu ngân" },
  "ppob.col.category": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "ppob.col.product": { id: "Produk", en: "Product", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "ppob.col.ref": { id: "Ref", en: "Ref", ms: "Ref", th: "อ้างอิง", fil: "Ref", vi: "Ref" },
  "ppob.col.nominal": { id: "Nominal", en: "Amount", ms: "Nominal", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "ppob.col.modal": { id: "Modal", en: "Cost", ms: "Modal", th: "ต้นทุน", fil: "Puhunan", vi: "Vốn" },
  "ppob.col.providerFee": { id: "Biaya Fastpay", en: "Fastpay Fee", ms: "Fi Fastpay", th: "ค่าธรรมเนียม Fastpay", fil: "Bayad sa Fastpay", vi: "Phí Fastpay" },
  "ppob.col.margin": { id: "Margin", en: "Margin", ms: "Margin", th: "มาร์จิ้น", fil: "Margin", vi: "Biên lợi nhuận" },
  "ppob.col.uangMasuk": { id: "Uang Masuk", en: "Cash In", ms: "Wang Masuk", th: "เงินเข้า", fil: "Papasok na Pera", vi: "Tiền thu vào" },
  "ppob.col.account": { id: "Akun", en: "Account", ms: "Akaun", th: "บัญชี", fil: "Account", vi: "Tài khoản" },
  "ppob.col.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "ppob.col.action": { id: "Aksi", en: "Action", ms: "Tindakan", th: "การดำเนินการ", fil: "Aksyon", vi: "Thao tác" },
  "ppob.noTransactions": { id: "Belum ada transaksi PPOB pada periode ini.", en: "No PPOB transactions in this period yet.", ms: "Belum ada transaksi PPOB dalam tempoh ini.", th: "ยังไม่มีธุรกรรม PPOB ในช่วงเวลานี้", fil: "Wala pang transaksyon ng PPOB sa panahong ito.", vi: "Chưa có giao dịch PPOB nào trong khoảng thời gian này." },

  // --- Status badges ---
  "ppob.status.success": { id: "Sukses", en: "Success", ms: "Berjaya", th: "สำเร็จ", fil: "Matagumpay", vi: "Thành công" },
  "ppob.status.reversed": { id: "Reversed", en: "Reversed", ms: "Dibatalkan", th: "ยกเลิกแล้ว", fil: "Na-reverse", vi: "Đã hủy" },

  // --- Summary cards ---
  "ppob.summary.saldoFastpay": { id: "Saldo Deposit Fastpay", en: "Fastpay Deposit Balance", ms: "Baki Deposit Fastpay", th: "ยอดเงินฝาก Fastpay", fil: "Balanse ng Deposit sa Fastpay", vi: "Số dư ký quỹ Fastpay" },
  "ppob.summary.transactionsPeriod": { id: "Transaksi (periode ini)", en: "Transactions (this period)", ms: "Transaksi (tempoh ini)", th: "ธุรกรรม (ช่วงเวลานี้)", fil: "Transaksyon (sa panahong ito)", vi: "Giao dịch (trong kỳ này)" },
  "ppob.summary.providerFeeExpense": { id: "Beban Biaya Fastpay", en: "Fastpay Fee Expense", ms: "Perbelanjaan Fi Fastpay", th: "ค่าใช้จ่ายค่าธรรมเนียม Fastpay", fil: "Gastos sa Bayad ng Fastpay", vi: "Chi phí phí Fastpay" },
  "ppob.summary.marginNetProfit": { id: "Margin (Keuntungan Bersih)", en: "Margin (Net Profit)", ms: "Margin (Untung Bersih)", th: "มาร์จิ้น (กำไรสุทธิ)", fil: "Margin (Net Profit)", vi: "Biên lợi nhuận (Lợi nhuận ròng)" },
  "ppob.summary.categoryLine": { id: "{count}x · {amount} margin", en: "{count}x · {amount} margin", ms: "{count}x · {amount} margin", th: "{count} ครั้ง · มาร์จิ้น {amount}", fil: "{count}x · {amount} margin", vi: "{count} lần · lợi nhuận {amount}" },
});
