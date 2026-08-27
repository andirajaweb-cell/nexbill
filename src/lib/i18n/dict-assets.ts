import { registerDict } from "./registry";

/**
 * Translations for /dashboard/assets — Fixed Asset register & depreciation. Registered as a
 * side effect on import; import this file (for its side effect) from the assets page before
 * any component calls useDashboardLang().t().
 */
registerDict({
  "assets.pageTitle": { id: "Fixed Asset & Depreciation", en: "Fixed Asset & Depreciation", ms: "Aset Tetap & Susut Nilai", th: "สินทรัพย์ถาวรและค่าเสื่อมราคา", fil: "Fixed Asset at Depreciation", vi: "Tài sản cố định & Khấu hao" },
  "assets.pageSubtitle": { id: "Register aset (PS/TV/Controller/dst), penyusutan garis lurus otomatis, dan pelepasan aset — semuanya langsung membentuk jurnal ke General Ledger.", en: "Register assets (PS/TV/Controller/etc.), automatic straight-line depreciation, and asset disposal — all of it posts straight to the General Ledger.", ms: "Daftarkan aset (PS/TV/Controller/dll), susut nilai garis lurus automatik, dan pelupusan aset — semuanya terus membentuk jurnal ke Lejar Am.", th: "ลงทะเบียนสินทรัพย์ (PS/TV/Controller ฯลฯ) คำนวณค่าเสื่อมราคาแบบเส้นตรงอัตโนมัติ และการจำหน่ายสินทรัพย์ — ทั้งหมดจะบันทึกบัญชีเข้าบัญชีแยกประเภททั่วไปโดยตรง", fil: "Irehistro ang mga asset (PS/TV/Controller, atbp.), awtomatikong straight-line depreciation, at pag-dispose ng asset — lahat ito ay direktang bumubuo ng journal papunta sa General Ledger.", vi: "Đăng ký tài sản (PS/TV/Tay cầm/v.v.), tự động khấu hao đường thẳng, và thanh lý tài sản — tất cả đều tự động ghi thẳng bút toán vào Sổ Cái." },

  "assets.tabList": { id: "Daftar Aset", en: "Asset List", ms: "Senarai Aset", th: "รายการสินทรัพย์", fil: "Listahan ng Asset", vi: "Danh sách tài sản" },
  "assets.tabDepreciation": { id: "Penyusutan", en: "Depreciation", ms: "Susut Nilai", th: "ค่าเสื่อมราคา", fil: "Depreciation", vi: "Khấu hao" },

  "assets.category.playstation": { id: "PlayStation", en: "PlayStation", ms: "PlayStation", th: "PlayStation", fil: "PlayStation", vi: "PlayStation" },
  "assets.category.tv": { id: "TV", en: "TV", ms: "TV", th: "TV", fil: "TV", vi: "TV" },
  "assets.category.controller": { id: "Controller", en: "Controller", ms: "Controller", th: "Controller", fil: "Controller", vi: "Tay cầm" },
  "assets.category.furniture": { id: "Furniture", en: "Furniture", ms: "Perabot", th: "เฟอร์นิเจอร์", fil: "Furniture", vi: "Nội thất" },
  "assets.category.vehicle": { id: "Kendaraan", en: "Vehicle", ms: "Kenderaan", th: "ยานพาหนะ", fil: "Sasakyan", vi: "Phương tiện" },
  "assets.category.other": { id: "Lainnya", en: "Other", ms: "Lain-lain", th: "อื่นๆ", fil: "Iba pa", vi: "Khác" },

  "assets.status.active": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งานอยู่", fil: "Aktibo", vi: "Đang hoạt động" },
  "assets.status.underMaintenance": { id: "Maintenance", en: "Maintenance", ms: "Penyelenggaraan", th: "ซ่อมบำรุง", fil: "Maintenance", vi: "Đang bảo trì" },
  "assets.status.disposed": { id: "Dilepas (Disposed)", en: "Disposed", ms: "Dilupuskan", th: "จำหน่ายแล้ว", fil: "Na-dispose", vi: "Đã thanh lý" },

  "assets.registeredCount": { id: "{n} aset terdaftar", en: "{n} assets registered", ms: "{n} aset didaftarkan", th: "ลงทะเบียนสินทรัพย์ {n} รายการ", fil: "{n} asset na nakarehistro", vi: "{n} tài sản đã đăng ký" },
  "assets.newAssetButton": { id: "+ Aset Baru", en: "+ New Asset", ms: "+ Aset Baharu", th: "+ เพิ่มสินทรัพย์", fil: "+ Bagong Asset", vi: "+ Tài sản mới" },
  "assets.closeForm": { id: "Tutup Form", en: "Close Form", ms: "Tutup Borang", th: "ปิดแบบฟอร์ม", fil: "Isara ang Form", vi: "Đóng biểu mẫu" },

  "assets.alertRequiredFields": { id: "Nama, harga perolehan, dan umur ekonomis wajib diisi.", en: "Name, acquisition cost, and useful life are required.", ms: "Nama, kos perolehan, dan hayat guna wajib diisi.", th: "กรุณากรอกชื่อ ราคาทุน และอายุการใช้งาน", fil: "Kailangan punan ang pangalan, acquisition cost, at useful life.", vi: "Bắt buộc nhập tên, nguyên giá và thời gian sử dụng hữu ích." },
  "assets.alertSelectCashOrPayable": { id: "Pilih akun kas/bank, atau centang 'Catat sebagai hutang'.", en: "Select a cash/bank account, or check 'Record as payable'.", ms: "Pilih akaun tunai/bank, atau tandakan 'Rekod sebagai hutang'.", th: "เลือกบัญชีเงินสด/ธนาคาร หรือทำเครื่องหมาย 'บันทึกเป็นเจ้าหนี้'", fil: "Pumili ng cash/bank account, o i-check ang 'Itala bilang utang'.", vi: "Chọn tài khoản tiền mặt/ngân hàng, hoặc chọn 'Ghi nhận là khoản phải trả'." },
  "assets.alertDisposeReasonRequired": { id: "Alasan pelepasan wajib diisi.", en: "Disposal reason is required.", ms: "Sebab pelupusan wajib diisi.", th: "กรุณาระบุเหตุผลในการจำหน่าย", fil: "Kailangan punan ang dahilan ng pag-dispose.", vi: "Bắt buộc nhập lý do thanh lý." },
  "assets.alertDisposeCashAccountRequired": { id: "Pilih akun kas/bank penerima hasil pelepasan.", en: "Select the cash/bank account receiving the disposal proceeds.", ms: "Pilih akaun tunai/bank penerima hasil pelupusan.", th: "เลือกบัญชีเงินสด/ธนาคารที่รับเงินจากการจำหน่าย", fil: "Pumili ng cash/bank account na tatanggap ng proceeds mula sa pag-dispose.", vi: "Chọn tài khoản tiền mặt/ngân hàng nhận tiền thanh lý." },
  "assets.alertMaintenanceDescRequired": { id: "Deskripsi maintenance wajib diisi.", en: "Maintenance description is required.", ms: "Penerangan penyelenggaraan wajib diisi.", th: "กรุณากรอกรายละเอียดการซ่อมบำรุง", fil: "Kailangan punan ang paglalarawan ng maintenance.", vi: "Bắt buộc nhập mô tả bảo trì." },
  "assets.alertMaintenanceAccountRequired": { id: "Pilih akun beban untuk membuat expense maintenance.", en: "Select an expense account to create the maintenance expense.", ms: "Pilih akaun perbelanjaan untuk membuat perbelanjaan penyelenggaraan.", th: "เลือกบัญชีค่าใช้จ่ายเพื่อสร้างค่าใช้จ่ายการซ่อมบำรุง", fil: "Pumili ng expense account para gumawa ng maintenance expense.", vi: "Chọn tài khoản chi phí để tạo khoản chi phí bảo trì." },

  "assets.formTitle": { id: "Form Aset Baru", en: "New Asset Form", ms: "Borang Aset Baharu", th: "แบบฟอร์มสินทรัพย์ใหม่", fil: "Form ng Bagong Asset", vi: "Biểu mẫu tài sản mới" },
  "assets.placeholderName": { id: "Nama aset (mis. PS5 Unit 5)", en: "Asset name (e.g. PS5 Unit 5)", ms: "Nama aset (cth. PS5 Unit 5)", th: "ชื่อสินทรัพย์ (เช่น PS5 เครื่องที่ 5)", fil: "Pangalan ng asset (hal. PS5 Unit 5)", vi: "Tên tài sản (vd. PS5 Máy 5)" },
  "assets.optionRentalUnit": { id: "Unit PS terkait (opsional)", en: "Related PS unit (optional)", ms: "Unit PS berkaitan (pilihan)", th: "เครื่อง PS ที่เกี่ยวข้อง (ไม่บังคับ)", fil: "Kaugnay na PS unit (opsyonal)", vi: "Máy PS liên quan (không bắt buộc)" },
  "assets.placeholderAcquisitionCost": { id: "Harga Perolehan", en: "Acquisition Cost", ms: "Kos Perolehan", th: "ราคาทุน", fil: "Acquisition Cost", vi: "Nguyên giá" },
  "assets.placeholderSalvageValue": { id: "Nilai Sisa (Salvage)", en: "Salvage Value", ms: "Nilai Sisa (Salvage)", th: "มูลค่าซาก (Salvage)", fil: "Salvage Value", vi: "Giá trị thu hồi (Salvage)" },
  "assets.placeholderUsefulLife": { id: "Umur Ekonomis (bulan)", en: "Useful Life (months)", ms: "Hayat Guna (bulan)", th: "อายุการใช้งาน (เดือน)", fil: "Useful Life (buwan)", vi: "Thời gian sử dụng hữu ích (tháng)" },
  "assets.optionSupplier": { id: "Supplier (opsional)", en: "Supplier (optional)", ms: "Pembekal (pilihan)", th: "ผู้จัดจำหน่าย (ไม่บังคับ)", fil: "Supplier (opsyonal)", vi: "Nhà cung cấp (không bắt buộc)" },
  "assets.paymentCash": { id: "Cash", en: "Cash", ms: "Tunai", th: "เงินสด", fil: "Cash", vi: "Tiền mặt" },
  "assets.paymentBank": { id: "Bank", en: "Bank", ms: "Bank", th: "ธนาคาร", fil: "Bank", vi: "Ngân hàng" },
  "assets.paymentTransfer": { id: "Transfer", en: "Transfer", ms: "Pindahan", th: "โอนเงิน", fil: "Transfer", vi: "Chuyển khoản" },
  "assets.paymentQris": { id: "QRIS", en: "QRIS", ms: "QRIS", th: "QRIS", fil: "QRIS", vi: "QRIS" },
  "assets.optionCashBankAccount": { id: "Akun Kas/Bank", en: "Cash/Bank Account", ms: "Akaun Tunai/Bank", th: "บัญชีเงินสด/ธนาคาร", fil: "Cash/Bank Account", vi: "Tài khoản tiền mặt/ngân hàng" },
  "assets.checkboxRecordAsPayable": { id: "Catat sebagai hutang", en: "Record as payable", ms: "Rekod sebagai hutang", th: "บันทึกเป็นเจ้าหนี้", fil: "Itala bilang utang", vi: "Ghi nhận là khoản phải trả" },
  "assets.placeholderNotes": { id: "Catatan (opsional)", en: "Notes (optional)", ms: "Catatan (pilihan)", th: "หมายเหตุ (ไม่บังคับ)", fil: "Tala (opsyonal)", vi: "Ghi chú (không bắt buộc)" },
  "assets.saveAsset": { id: "Simpan Aset", en: "Save Asset", ms: "Simpan Aset", th: "บันทึกสินทรัพย์", fil: "I-save ang Asset", vi: "Lưu tài sản" },

  "assets.disposeTitle": { id: "Lepas Aset (Dispose)", en: "Dispose Asset", ms: "Lupuskan Aset", th: "จำหน่ายสินทรัพย์ (Dispose)", fil: "I-dispose ang Asset", vi: "Thanh lý tài sản" },
  "assets.placeholderDisposalAmount": { id: "Hasil pelepasan (Rp, 0 jika tidak ada)", en: "Disposal proceeds (Rp, 0 if none)", ms: "Hasil pelupusan (Rp, 0 jika tiada)", th: "เงินที่ได้จากการจำหน่าย (Rp, 0 หากไม่มี)", fil: "Kita mula sa pag-dispose (Rp, 0 kung wala)", vi: "Số tiền thu được khi thanh lý (Rp, 0 nếu không có)" },
  "assets.optionCashBankAccountResult": { id: "Akun Kas/Bank (jika ada hasil)", en: "Cash/Bank Account (if there are proceeds)", ms: "Akaun Tunai/Bank (jika ada hasil)", th: "บัญชีเงินสด/ธนาคาร (หากมีเงินที่ได้รับ)", fil: "Cash/Bank Account (kung may proceeds)", vi: "Tài khoản tiền mặt/ngân hàng (nếu có tiền thu được)" },
  "assets.placeholderDisposeReason": { id: "Alasan (rusak, dijual, hilang, dst)", en: "Reason (damaged, sold, lost, etc.)", ms: "Sebab (rosak, dijual, hilang, dll)", th: "เหตุผล (ชำรุด, ขาย, สูญหาย ฯลฯ)", fil: "Dahilan (sira, naibenta, nawala, atbp.)", vi: "Lý do (hỏng, đã bán, mất, v.v.)" },
  "assets.disposeAsset": { id: "Lepas Aset", en: "Dispose Asset", ms: "Lupuskan Aset", th: "จำหน่ายสินทรัพย์", fil: "I-dispose ang Asset", vi: "Thanh lý tài sản" },
  "assets.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },

  "assets.maintenanceTitle": { id: "Catat Maintenance", en: "Log Maintenance", ms: "Rekod Penyelenggaraan", th: "บันทึกการซ่อมบำรุง", fil: "Itala ang Maintenance", vi: "Ghi nhận bảo trì" },
  "assets.placeholderMaintDesc": { id: "Deskripsi (mis. Ganti thermal paste)", en: "Description (e.g. Replace thermal paste)", ms: "Penerangan (cth. Tukar thermal paste)", th: "รายละเอียด (เช่น เปลี่ยนซิลิโคนระบายความร้อน)", fil: "Paglalarawan (hal. Palitan ang thermal paste)", vi: "Mô tả (vd. Thay keo tản nhiệt)" },
  "assets.placeholderMaintCost": { id: "Biaya (Rp, 0 jika gratis)", en: "Cost (Rp, 0 if free)", ms: "Kos (Rp, 0 jika percuma)", th: "ค่าใช้จ่าย (Rp, 0 หากฟรี)", fil: "Gastos (Rp, 0 kung libre)", vi: "Chi phí (Rp, 0 nếu miễn phí)" },
  "assets.checkboxCreateExpense": { id: "Buat Expense (Beban Maintenance)", en: "Create Expense (Maintenance Cost)", ms: "Buat Perbelanjaan (Kos Penyelenggaraan)", th: "สร้างค่าใช้จ่าย (ค่าซ่อมบำรุง)", fil: "Gumawa ng Expense (Gastos sa Maintenance)", vi: "Tạo chi phí (Chi phí bảo trì)" },
  "assets.optionExpenseAccount": { id: "Akun Beban (COA)", en: "Expense Account (COA)", ms: "Akaun Perbelanjaan (COA)", th: "บัญชีค่าใช้จ่าย (COA)", fil: "Expense Account (COA)", vi: "Tài khoản chi phí (COA)" },
  "assets.optionCashBankAccountOrPayable": { id: "Akun Kas/Bank (kosongkan = hutang)", en: "Cash/Bank Account (leave blank = payable)", ms: "Akaun Tunai/Bank (kosongkan = hutang)", th: "บัญชีเงินสด/ธนาคาร (เว้นว่าง = เจ้าหนี้)", fil: "Cash/Bank Account (iwanang blangko = utang)", vi: "Tài khoản tiền mặt/ngân hàng (để trống = khoản phải trả)" },
  "assets.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },

  "assets.tableName": { id: "Nama", en: "Name", ms: "Nama", th: "ชื่อ", fil: "Pangalan", vi: "Tên" },
  "assets.tableCategory": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "assets.tableAcquisition": { id: "Perolehan", en: "Acquisition", ms: "Perolehan", th: "ราคาทุน", fil: "Acquisition", vi: "Nguyên giá" },
  "assets.tableAccumDepreciation": { id: "Akum. Penyusutan", en: "Accum. Depreciation", ms: "Susut Nilai Terkumpul", th: "ค่าเสื่อมราคาสะสม", fil: "Akumuladong Depreciation", vi: "Khấu hao lũy kế" },
  "assets.tableBookValue": { id: "Nilai Buku", en: "Book Value", ms: "Nilai Buku", th: "มูลค่าตามบัญชี", fil: "Book Value", vi: "Giá trị còn lại" },
  "assets.tableStatus": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "assets.addMaintenance": { id: "+ Maintenance", en: "+ Maintenance", ms: "+ Penyelenggaraan", th: "+ ซ่อมบำรุง", fil: "+ Maintenance", vi: "+ Bảo trì" },
  "assets.emptyAssets": { id: "Belum ada aset terdaftar.", en: "No assets registered yet.", ms: "Belum ada aset didaftarkan.", th: "ยังไม่มีสินทรัพย์ที่ลงทะเบียน", fil: "Wala pang nakarehistrong asset.", vi: "Chưa có tài sản nào được đăng ký." },

  "assets.runDepreciationTitle": { id: "Jalankan Penyusutan Bulanan", en: "Run Monthly Depreciation", ms: "Jalankan Susut Nilai Bulanan", th: "รันค่าเสื่อมราคารายเดือน", fil: "Patakbuhin ang Buwanang Depreciation", vi: "Chạy khấu hao hàng tháng" },
  "assets.runDepreciationDesc": { id: "Memposting jurnal Dr Beban Penyusutan / Cr Akumulasi Penyusutan untuk semua aset aktif pada periode terpilih — dilewati otomatis jika periode itu sudah pernah dijalankan atau aset sudah terdepresiasi penuh.", en: "Posts a Dr Depreciation Expense / Cr Accumulated Depreciation journal entry for every active asset in the selected period — automatically skipped if that period has already been run or the asset is already fully depreciated.", ms: "Memposkan jurnal Dr Perbelanjaan Susut Nilai / Cr Susut Nilai Terkumpul untuk semua aset aktif pada tempoh yang dipilih — dilangkau secara automatik jika tempoh itu sudah pernah dijalankan atau aset sudah susut nilai sepenuhnya.", th: "บันทึกบัญชี Dr ค่าเสื่อมราคา / Cr ค่าเสื่อมราคาสะสม สำหรับสินทรัพย์ที่ใช้งานอยู่ทั้งหมดในงวดที่เลือก — จะข้ามโดยอัตโนมัติหากงวดนั้นเคยรันไปแล้วหรือสินทรัพย์เสื่อมราคาเต็มจำนวนแล้ว", fil: "Nagpo-post ng journal na Dr Depreciation Expense / Cr Accumulated Depreciation para sa lahat ng aktibong asset sa napiling period — awtomatikong nili-skip kung natakbo na ang period na iyon o kung fully depreciated na ang asset.", vi: "Ghi bút toán Nợ Chi phí khấu hao / Có Khấu hao lũy kế cho tất cả tài sản đang hoạt động trong kỳ đã chọn — tự động bỏ qua nếu kỳ đó đã được chạy trước đó hoặc tài sản đã khấu hao hết." },
  "assets.estimatedTotal": { id: "Estimasi total: {amount}", en: "Estimated total: {amount}", ms: "Anggaran jumlah: {amount}", th: "ยอดประมาณการรวม: {amount}", fil: "Tinatayang kabuuan: {amount}", vi: "Tổng ước tính: {amount}" },
  "assets.processing": { id: "Memproses...", en: "Processing...", ms: "Memproses...", th: "กำลังประมวลผล...", fil: "Nagpoproseso...", vi: "Đang xử lý..." },
  "assets.runDepreciation": { id: "Jalankan Penyusutan", en: "Run Depreciation", ms: "Jalankan Susut Nilai", th: "รันค่าเสื่อมราคา", fil: "Patakbuhin ang Depreciation", vi: "Chạy khấu hao" },
  "assets.depreciationHistoryTitle": { id: "Riwayat Penyusutan", en: "Depreciation History", ms: "Sejarah Susut Nilai", th: "ประวัติค่าเสื่อมราคา", fil: "Kasaysayan ng Depreciation", vi: "Lịch sử khấu hao" },
  "assets.tableAsset": { id: "Aset", en: "Asset", ms: "Aset", th: "สินทรัพย์", fil: "Asset", vi: "Tài sản" },
  "assets.tablePeriod": { id: "Periode", en: "Period", ms: "Tempoh", th: "งวด", fil: "Panahon", vi: "Kỳ" },
  "assets.tableAmount": { id: "Nominal", en: "Amount", ms: "Jumlah", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "assets.emptyDepreciationHistory": { id: "Belum ada riwayat penyusutan.", en: "No depreciation history yet.", ms: "Belum ada sejarah susut nilai.", th: "ยังไม่มีประวัติค่าเสื่อมราคา", fil: "Wala pang kasaysayan ng depreciation.", vi: "Chưa có lịch sử khấu hao." },
});
