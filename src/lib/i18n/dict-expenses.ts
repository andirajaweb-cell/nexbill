import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/expenses page — the draft/submit/approve/pay expense
 * workflow that feeds accounting (journal, General Ledger, Trial Balance, P&L, Cash Flow,
 * Balance Sheet). Registered as a side effect on import; import this file once from the page
 * module.
 */
registerDict({
  // --- Header ---
  "expenses.title": { id: "Expense Management", en: "Expense Management", ms: "Pengurusan Perbelanjaan", th: "จัดการค่าใช้จ่าย", fil: "Pamamahala ng Gastos", vi: "Quản lý chi phí" },
  "expenses.subtitle": {
    id: "Pintu masuk transaksi biaya ke accounting — setiap expense yang disetujui otomatis membuat jurnal, masuk ke General Ledger, Trial Balance, Laba Rugi, Arus Kas, dan Neraca.",
    en: "The entry point for expense transactions into accounting — every approved expense automatically creates a journal entry and flows into the General Ledger, Trial Balance, Income Statement, Cash Flow, and Balance Sheet.",
    ms: "Pintu masuk transaksi perbelanjaan ke perakaunan — setiap perbelanjaan yang diluluskan secara automatik mencipta jurnal, masuk ke Lejar Am, Imbangan Duga, Penyata Untung Rugi, Aliran Tunai, dan Kunci Kira-kira.",
    th: "จุดเริ่มต้นของธุรกรรมค่าใช้จ่ายเข้าสู่ระบบบัญชี — ค่าใช้จ่ายที่ได้รับอนุมัติทุกรายการจะสร้างสมุดรายวันโดยอัตโนมัติ และเข้าสู่บัญชีแยกประเภททั่วไป งบทดลอง งบกำไรขาดทุน งบกระแสเงินสด และงบดุล",
    fil: "Ang pintuan ng mga transaksyon ng gastos papunta sa accounting — bawat expense na na-approve ay awtomatikong gumagawa ng journal entry at napupunta sa General Ledger, Trial Balance, Income Statement, Cash Flow, at Balance Sheet.",
    vi: "Cửa ngõ đưa giao dịch chi phí vào kế toán — mỗi khoản chi được duyệt sẽ tự động tạo bút toán, đưa vào Sổ Cái, Bảng Cân đối thử, Báo cáo Kết quả Kinh doanh, Lưu chuyển Tiền tệ và Bảng Cân đối Kế toán.",
  },

  // --- Tabs ---
  "expenses.tab.dashboard": { id: "Dashboard", en: "Dashboard", ms: "Dashboard", th: "แดชบอร์ด", fil: "Dashboard", vi: "Tổng quan" },
  "expenses.tab.list": { id: "Daftar Expense", en: "Expense List", ms: "Senarai Perbelanjaan", th: "รายการค่าใช้จ่าย", fil: "Listahan ng Gastos", vi: "Danh sách chi phí" },
  "expenses.tab.costCenter": { id: "Cost Center", en: "Cost Center", ms: "Pusat Kos", th: "ศูนย์ต้นทุน", fil: "Cost Center", vi: "Trung tâm chi phí" },
  "expenses.tab.recurring": { id: "Recurring", en: "Recurring", ms: "Berulang", th: "รายการประจำ", fil: "Recurring", vi: "Định kỳ" },

  // --- Status labels ---
  "expenses.status.draft": { id: "Draft", en: "Draft", ms: "Draf", th: "แบบร่าง", fil: "Draft", vi: "Bản nháp" },
  "expenses.status.pendingApproval": { id: "Pending Approval", en: "Pending Approval", ms: "Menunggu Kelulusan", th: "รอการอนุมัติ", fil: "Naghihintay ng Approval", vi: "Chờ duyệt" },
  "expenses.status.approved": { id: "Approved (Belum Dibayar)", en: "Approved (Not Paid Yet)", ms: "Diluluskan (Belum Dibayar)", th: "อนุมัติแล้ว (ยังไม่ชำระ)", fil: "Approved (Hindi Pa Bayad)", vi: "Đã duyệt (Chưa thanh toán)" },
  "expenses.status.paid": { id: "Paid", en: "Paid", ms: "Dibayar", th: "ชำระแล้ว", fil: "Bayad na", vi: "Đã thanh toán" },
  "expenses.status.rejected": { id: "Rejected", en: "Rejected", ms: "Ditolak", th: "ถูกปฏิเสธ", fil: "Tinanggihan", vi: "Đã từ chối" },
  "expenses.status.cancelled": { id: "Cancelled", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิกแล้ว", fil: "Kinansela", vi: "Đã hủy" },

  // --- Dashboard tab ---
  "expenses.loading": { id: "Memuat...", en: "Loading...", ms: "Memuatkan...", th: "กำลังโหลด...", fil: "Nilo-load...", vi: "Đang tải..." },
  "expenses.today": { id: "Hari Ini", en: "Today", ms: "Hari Ini", th: "วันนี้", fil: "Ngayong Araw", vi: "Hôm nay" },
  "expenses.thisMonth": { id: "Bulan Ini", en: "This Month", ms: "Bulan Ini", th: "เดือนนี้", fil: "Ngayong Buwan", vi: "Tháng này" },
  "expenses.outstandingPayable": { id: "Outstanding (Hutang)", en: "Outstanding (Payable)", ms: "Belum Selesai (Hutang)", th: "ค้างชำระ (เจ้าหนี้)", fil: "Outstanding (Utang)", vi: "Còn nợ (Phải trả)" },
  "expenses.stat.pendingApprovalWithAmount": { id: "Pending Approval ({amount})", en: "Pending Approval ({amount})", ms: "Menunggu Kelulusan ({amount})", th: "รออนุมัติ ({amount})", fil: "Naghihintay ng Approval ({amount})", vi: "Chờ duyệt ({amount})" },
  "expenses.stat.paidThisMonth": { id: "Paid Bulan Ini", en: "Paid This Month", ms: "Dibayar Bulan Ini", th: "ชำระแล้วเดือนนี้", fil: "Bayad Ngayong Buwan", vi: "Đã thanh toán tháng này" },
  "expenses.stat.dueSoon": { id: "Jatuh Tempo ≤3 Hari", en: "Due Within 3 Days", ms: "Tempoh Bayaran ≤3 Hari", th: "ครบกำหนดภายใน 3 วัน", fil: "Due sa loob ng ≤3 Araw", vi: "Đến hạn trong ≤3 ngày" },
  "expenses.paymentReminder": { id: "Payment Reminder", en: "Payment Reminder", ms: "Peringatan Bayaran", th: "การแจ้งเตือนการชำระเงิน", fil: "Paalala sa Bayad", vi: "Nhắc nhở thanh toán" },
  "expenses.dueDateLabel": { id: "jatuh tempo", en: "due", ms: "tempoh", th: "ครบกำหนด", fil: "due", vi: "đến hạn" },
  "expenses.categoryThisMonth": { id: "Expense by Category (Bulan Ini)", en: "Expense by Category (This Month)", ms: "Perbelanjaan mengikut Kategori (Bulan Ini)", th: "ค่าใช้จ่ายตามหมวดหมู่ (เดือนนี้)", fil: "Gastos ayon sa Kategorya (Ngayong Buwan)", vi: "Chi phí theo danh mục (tháng này)" },
  "expenses.noData": { id: "Belum ada data.", en: "No data yet.", ms: "Belum ada data.", th: "ยังไม่มีข้อมูล", fil: "Wala pang data.", vi: "Chưa có dữ liệu." },
  "expenses.branchThisMonth": { id: "Expense by Branch (Bulan Ini)", en: "Expense by Branch (This Month)", ms: "Perbelanjaan mengikut Cawangan (Bulan Ini)", th: "ค่าใช้จ่ายตามสาขา (เดือนนี้)", fil: "Gastos ayon sa Branch (Ngayong Buwan)", vi: "Chi phí theo chi nhánh (tháng này)" },
  "expenses.trend30d": { id: "Expense Trend (30 Hari)", en: "Expense Trend (30 Days)", ms: "Trend Perbelanjaan (30 Hari)", th: "แนวโน้มค่าใช้จ่าย (30 วัน)", fil: "Trend ng Gastos (30 Araw)", vi: "Xu hướng chi phí (30 ngày)" },

  // --- Cash Out Cepat ---
  "expenses.cashOutQuick": { id: "Cash Out Cepat", en: "Quick Cash Out", ms: "Cash Out Pantas", th: "เบิกเงินสดด่วน", fil: "Mabilis na Cash Out", vi: "Chi tiền nhanh" },
  "expenses.cashOutDescription": {
    id: "Pengeluaran kas kecil (parkir, beli air galon, dll) — langsung lunas dari {account}, tanpa isi form lengkap.",
    en: "Small cash expenses (parking, buying water gallons, etc.) — settled instantly from {account}, no need to fill out the full form.",
    ms: "Perbelanjaan tunai kecil (parkir, beli air botol, dll) — terus selesai daripada {account}, tanpa isi borang penuh.",
    th: "รายจ่ายเงินสดจำนวนน้อย (ค่าจอดรถ ซื้อน้ำถัง ฯลฯ) — หักจาก {account} ทันที ไม่ต้องกรอกฟอร์มเต็มรูปแบบ",
    fil: "Maliit na cash expense (parking, pambili ng tubig, atbp.) — direktang babawasin mula sa {account}, hindi na kailangang punan ang buong form.",
    vi: "Chi tiền mặt nhỏ (gửi xe, mua nước bình, v.v.) — trừ ngay từ {account}, không cần điền form đầy đủ.",
  },
  "expenses.defaultCashAccountName": { id: "akun Kas", en: "Cash account", ms: "akaun Tunai", th: "บัญชีเงินสด", fil: "cash account", vi: "tài khoản tiền mặt" },
  "expenses.optionCategoryAccount": { id: "Kategori (Akun Beban)", en: "Category (Expense Account)", ms: "Kategori (Akaun Perbelanjaan)", th: "หมวดหมู่ (บัญชีค่าใช้จ่าย)", fil: "Kategorya (Expense Account)", vi: "Danh mục (Tài khoản chi phí)" },
  "expenses.placeholderAmountRp": { id: "Nominal (Rp)", en: "Amount (Rp)", ms: "Jumlah (Rp)", th: "จำนวนเงิน (Rp)", fil: "Halaga (Rp)", vi: "Số tiền (Rp)" },
  "expenses.placeholderNote": { id: "Catatan (opsional)", en: "Note (optional)", ms: "Catatan (pilihan)", th: "หมายเหตุ (ไม่บังคับ)", fil: "Tala (opsyonal)", vi: "Ghi chú (tùy chọn)" },
  "expenses.processing": { id: "Memproses...", en: "Processing...", ms: "Memproses...", th: "กำลังดำเนินการ...", fil: "Prinoseso...", vi: "Đang xử lý..." },
  "expenses.recordCashOut": { id: "Catat Cash Out", en: "Record Cash Out", ms: "Rekod Cash Out", th: "บันทึกการเบิกเงินสด", fil: "I-record ang Cash Out", vi: "Ghi nhận chi tiền" },

  // --- Alerts ---
  "expenses.alert.selectCategoryAndAmount": { id: "Pilih kategori beban dan isi nominal.", en: "Select an expense category and enter the amount.", ms: "Pilih kategori perbelanjaan dan isi jumlah.", th: "เลือกหมวดหมู่ค่าใช้จ่ายและกรอกจำนวนเงิน", fil: "Pumili ng kategorya ng gastos at ilagay ang halaga.", vi: "Chọn danh mục chi phí và nhập số tiền." },
  "expenses.alert.noCashAccount": { id: "Belum ada akun Kas — atur dulu di halaman Pembayaran.", en: "No Cash account set up yet — configure one on the Payments page first.", ms: "Belum ada akaun Tunai — sediakan dahulu di halaman Pembayaran.", th: "ยังไม่มีบัญชีเงินสด — กรุณาตั้งค่าที่หน้าการชำระเงินก่อน", fil: "Wala pang Cash account — i-setup muna sa Payments page.", vi: "Chưa có tài khoản Tiền mặt — hãy thiết lập trước ở trang Thanh toán." },
  "expenses.alert.overThreshold": {
    id: 'Nominal melebihi batas approval otomatis — Cash Out ini menunggu persetujuan dulu (lihat status "Pending Approval" di daftar bawah).',
    en: 'The amount exceeds the auto-approval limit — this Cash Out will wait for approval first (see the "Pending Approval" status in the list below).',
    ms: 'Jumlah melebihi had kelulusan automatik — Cash Out ini akan menunggu kelulusan dahulu (lihat status "Pending Approval" di senarai bawah).',
    th: 'จำนวนเงินเกินวงเงินอนุมัติอัตโนมัติ — รายการเบิกเงินสดนี้จะรอการอนุมัติก่อน (ดูสถานะ "Pending Approval" ในรายการด้านล่าง)',
    fil: 'Lumagpas sa auto-approval limit ang halaga — maghihintay muna ng approval ang Cash Out na ito (tingnan ang status na "Pending Approval" sa listahan sa baba).',
    vi: 'Số tiền vượt hạn mức tự động duyệt — khoản chi này sẽ chờ phê duyệt trước (xem trạng thái "Pending Approval" trong danh sách bên dưới).',
  },
  "expenses.alert.requiredFields": { id: "Akun, kategori, dan nominal wajib diisi.", en: "Account, category, and amount are required.", ms: "Akaun, kategori, dan jumlah wajib diisi.", th: "ต้องกรอกบัญชี หมวดหมู่ และจำนวนเงิน", fil: "Kinakailangan ang account, kategorya, at halaga.", vi: "Bắt buộc nhập tài khoản, danh mục và số tiền." },
  "expenses.alert.selectCashBankOrPayable": { id: "Pilih akun kas/bank, atau centang 'Catat sebagai hutang'.", en: "Select a cash/bank account, or check 'Record as payable'.", ms: "Pilih akaun tunai/bank, atau tandakan 'Rekod sebagai hutang'.", th: "เลือกบัญชีเงินสด/ธนาคาร หรือทำเครื่องหมายที่ 'บันทึกเป็นเจ้าหนี้'", fil: "Pumili ng cash/bank account, o i-check ang 'Itala bilang utang'.", vi: "Chọn tài khoản tiền mặt/ngân hàng, hoặc chọn 'Ghi nhận là khoản phải trả'." },
  "expenses.alert.selectCashBank": { id: "Pilih akun kas/bank.", en: "Select a cash/bank account.", ms: "Pilih akaun tunai/bank.", th: "เลือกบัญชีเงินสด/ธนาคาร", fil: "Pumili ng cash/bank account.", vi: "Chọn tài khoản tiền mặt/ngân hàng." },
  "expenses.alert.recurringRequiredFields": { id: "Nama, akun, kategori, nominal, dan tanggal jatuh tempo berikutnya wajib diisi.", en: "Name, account, category, amount, and next due date are required.", ms: "Nama, akaun, kategori, jumlah, dan tarikh tempoh bayaran seterusnya wajib diisi.", th: "ต้องกรอกชื่อ บัญชี หมวดหมู่ จำนวนเงิน และวันครบกำหนดถัดไป", fil: "Kinakailangan ang pangalan, account, kategorya, halaga, at susunod na due date.", vi: "Bắt buộc nhập tên, tài khoản, danh mục, số tiền và ngày đến hạn kế tiếp." },

  // --- Prompts / confirms ---
  "expenses.promptCancelReason": { id: "Alasan cancel?", en: "Reason for cancelling?", ms: "Sebab pembatalan?", th: "เหตุผลในการยกเลิก?", fil: "Dahilan ng pagkansela?", vi: "Lý do hủy?" },
  "expenses.promptRejectReason": { id: "Alasan reject?", en: "Reason for rejecting?", ms: "Sebab penolakan?", th: "เหตุผลในการปฏิเสธ?", fil: "Dahilan ng pagtanggi?", vi: "Lý do từ chối?" },
  "expenses.promptVoidReason": { id: "Alasan void (akan membalik jurnal)?", en: "Reason for voiding (this will reverse the journal entry)?", ms: "Sebab void (akan membalikkan jurnal)?", th: "เหตุผลในการยกเลิกรายการ (จะกลับรายการบัญชี)?", fil: "Dahilan ng pag-void (mababaligtad ang journal entry)?", vi: "Lý do hủy bỏ (sẽ đảo bút toán)?" },
  "expenses.confirmDeactivateRecurring": { id: "Nonaktifkan recurring expense ini?", en: "Deactivate this recurring expense?", ms: "Nyahaktifkan perbelanjaan berulang ini?", th: "ปิดใช้งานค่าใช้จ่ายประจำนี้หรือไม่?", fil: "I-deactivate ang recurring expense na ito?", vi: "Ngừng hoạt động khoản chi định kỳ này?" },

  // --- List controls ---
  "expenses.allStatus": { id: "Semua Status", en: "All Statuses", ms: "Semua Status", th: "สถานะทั้งหมด", fil: "Lahat ng Status", vi: "Tất cả trạng thái" },
  "expenses.closeForm": { id: "Tutup Form", en: "Close Form", ms: "Tutup Borang", th: "ปิดฟอร์ม", fil: "Isara ang Form", vi: "Đóng biểu mẫu" },
  "expenses.newExpense": { id: "+ Expense Baru", en: "+ New Expense", ms: "+ Perbelanjaan Baharu", th: "+ ค่าใช้จ่ายใหม่", fil: "+ Bagong Gastos", vi: "+ Chi phí mới" },

  // --- Form Expense ---
  "expenses.formTitle": { id: "Form Expense", en: "Expense Form", ms: "Borang Perbelanjaan", th: "ฟอร์มค่าใช้จ่าย", fil: "Expense Form", vi: "Biểu mẫu chi phí" },
  "expenses.optionAccountCoa": { id: "Akun Beban (COA)", en: "Expense Account (COA)", ms: "Akaun Perbelanjaan (COA)", th: "บัญชีค่าใช้จ่าย (COA)", fil: "Expense Account (COA)", vi: "Tài khoản chi phí (COA)" },
  "expenses.placeholderCategoryExample": { id: "Kategori (mis. Listrik)", en: "Category (e.g. Electricity)", ms: "Kategori (cth. Elektrik)", th: "หมวดหมู่ (เช่น ค่าไฟฟ้า)", fil: "Kategorya (hal. Kuryente)", vi: "Danh mục (vd. Tiền điện)" },
  "expenses.dueDateTooltip": { id: "Jatuh tempo (jika hutang)", en: "Due date (if payable)", ms: "Tarikh tempoh (jika hutang)", th: "วันครบกำหนด (ถ้าเป็นเจ้าหนี้)", fil: "Due date (kung utang)", vi: "Ngày đến hạn (nếu là khoản phải trả)" },
  "expenses.placeholderDescription": { id: "Deskripsi", en: "Description", ms: "Keterangan", th: "รายละเอียด", fil: "Deskripsyon", vi: "Mô tả" },
  "expenses.placeholderPayee": { id: "Payee (nama, jika bukan supplier)", en: "Payee (name, if not a supplier)", ms: "Penerima Bayaran (nama, jika bukan pembekal)", th: "ผู้รับเงิน (ชื่อ หากไม่ใช่ซัพพลายเออร์)", fil: "Payee (pangalan, kung hindi supplier)", vi: "Người nhận (tên, nếu không phải nhà cung cấp)" },
  "expenses.optionSupplier": { id: "Supplier (opsional)", en: "Supplier (optional)", ms: "Pembekal (pilihan)", th: "ซัพพลายเออร์ (ไม่บังคับ)", fil: "Supplier (opsyonal)", vi: "Nhà cung cấp (tùy chọn)" },
  "expenses.placeholderQty": { id: "Qty", en: "Qty", ms: "Kuantiti", th: "จำนวน", fil: "Qty", vi: "SL" },
  "expenses.amountLabel": { id: "Nominal", en: "Amount", ms: "Jumlah", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "expenses.placeholderTax": { id: "Pajak (opsional)", en: "Tax (optional)", ms: "Cukai (pilihan)", th: "ภาษี (ไม่บังคับ)", fil: "Buwis (opsyonal)", vi: "Thuế (tùy chọn)" },
  "expenses.optionCostCenter": { id: "Cost Center (opsional)", en: "Cost Center (optional)", ms: "Pusat Kos (pilihan)", th: "ศูนย์ต้นทุน (ไม่บังคับ)", fil: "Cost Center (opsyonal)", vi: "Trung tâm chi phí (tùy chọn)" },
  "expenses.optionRentalUnit": { id: "Unit PS terkait (opsional)", en: "Related PS Unit (optional)", ms: "Unit PS berkaitan (pilihan)", th: "เครื่อง PS ที่เกี่ยวข้อง (ไม่บังคับ)", fil: "Kaugnay na Unit ng PS (opsyonal)", vi: "Máy PS liên quan (tùy chọn)" },
  "expenses.optionCashBankAccount": { id: "Akun Kas/Bank", en: "Cash/Bank Account", ms: "Akaun Tunai/Bank", th: "บัญชีเงินสด/ธนาคาร", fil: "Cash/Bank Account", vi: "Tài khoản tiền mặt/ngân hàng" },
  "expenses.recordAsPayableCheckbox": { id: "Catat sebagai hutang (belum dibayar)", en: "Record as payable (not yet paid)", ms: "Rekod sebagai hutang (belum dibayar)", th: "บันทึกเป็นเจ้าหนี้ (ยังไม่ชำระ)", fil: "Itala bilang utang (hindi pa bayad)", vi: "Ghi nhận là khoản phải trả (chưa thanh toán)" },
  "expenses.uploading": { id: "Mengunggah...", en: "Uploading...", ms: "Memuat naik...", th: "กำลังอัปโหลด...", fil: "Ina-upload...", vi: "Đang tải lên..." },
  "expenses.viewProof": { id: "Lihat bukti", en: "View receipt", ms: "Lihat bukti", th: "ดูหลักฐาน", fil: "Tingnan ang resibo", vi: "Xem chứng từ" },
  "expenses.saveAndSubmit": { id: "Simpan & Submit", en: "Save & Submit", ms: "Simpan & Hantar", th: "บันทึกและส่ง", fil: "I-save at I-submit", vi: "Lưu & Gửi" },

  // --- Payment methods ---
  "expenses.method.cash": { id: "Cash", en: "Cash", ms: "Tunai", th: "เงินสด", fil: "Cash", vi: "Tiền mặt" },
  "expenses.method.bank": { id: "Bank", en: "Bank", ms: "Bank", th: "ธนาคาร", fil: "Bank", vi: "Ngân hàng" },
  "expenses.method.transfer": { id: "Transfer", en: "Transfer", ms: "Pindahan", th: "โอนเงิน", fil: "Transfer", vi: "Chuyển khoản" },
  "expenses.method.qris": { id: "QRIS", en: "QRIS", ms: "QRIS", th: "QRIS", fil: "QRIS", vi: "QRIS" },

  // --- Pay debt form ---
  "expenses.payDebtTitle": { id: "Bayar Hutang Expense", en: "Pay Expense Debt", ms: "Bayar Hutang Perbelanjaan", th: "ชำระหนี้ค่าใช้จ่าย", fil: "Bayaran ng Utang na Gastos", vi: "Thanh toán nợ chi phí" },
  "expenses.action.pay": { id: "Bayar", en: "Pay", ms: "Bayar", th: "ชำระเงิน", fil: "Bayaran", vi: "Thanh toán" },
  "expenses.action.batal": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },

  // --- Table headers ---
  "expenses.table.no": { id: "No.", en: "No.", ms: "No.", th: "เลขที่", fil: "Blg.", vi: "Số" },
  "expenses.table.date": { id: "Tanggal", en: "Date", ms: "Tarikh", th: "วันที่", fil: "Petsa", vi: "Ngày" },
  "expenses.table.account": { id: "Akun", en: "Account", ms: "Akaun", th: "บัญชี", fil: "Account", vi: "Tài khoản" },
  "expenses.table.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },

  // --- Row action buttons ---
  "expenses.action.submit": { id: "Submit", en: "Submit", ms: "Hantar", th: "ส่ง", fil: "I-submit", vi: "Gửi" },
  "expenses.action.submitAgain": { id: "Submit Ulang", en: "Resubmit", ms: "Hantar Semula", th: "ส่งอีกครั้ง", fil: "I-submit Muli", vi: "Gửi lại" },
  "expenses.action.cancel": { id: "Cancel", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "expenses.action.approve": { id: "Approve", en: "Approve", ms: "Luluskan", th: "อนุมัติ", fil: "I-approve", vi: "Duyệt" },
  "expenses.action.reject": { id: "Reject", en: "Reject", ms: "Tolak", th: "ปฏิเสธ", fil: "Tanggihan", vi: "Từ chối" },
  "expenses.action.void": { id: "Void", en: "Void", ms: "Void", th: "ยกเลิกรายการ", fil: "I-void", vi: "Hủy bỏ" },
  "expenses.proofLink": { id: "bukti", en: "receipt", ms: "bukti", th: "หลักฐาน", fil: "resibo", vi: "chứng từ" },
  "expenses.emptyList": { id: "Belum ada expense.", en: "No expenses recorded yet.", ms: "Belum ada perbelanjaan.", th: "ยังไม่มีค่าใช้จ่าย", fil: "Wala pang gastos.", vi: "Chưa có khoản chi nào." },

  // --- Cost Center tab ---
  "expenses.costCenterExplainer": {
    id: 'Cost center = pembagian biaya per divisi/area (Rental, F&B, Kitchen, Administration, dst) dalam satu cabang — dipakai untuk laporan "biaya per cost center".',
    en: 'Cost center = splitting costs by division/area (Rental, F&B, Kitchen, Administration, etc.) within one branch — used for "cost by cost center" reports.',
    ms: 'Pusat kos = pembahagian kos mengikut bahagian/kawasan (Sewa, F&B, Dapur, Pentadbiran, dll) dalam satu cawangan — digunakan untuk laporan "kos mengikut pusat kos".',
    th: 'ศูนย์ต้นทุน = การแบ่งค่าใช้จ่ายตามฝ่าย/พื้นที่ (เช่า, F&B, ครัว, ธุรการ ฯลฯ) ภายในสาขาเดียว — ใช้สำหรับรายงาน "ค่าใช้จ่ายตามศูนย์ต้นทุน"',
    fil: 'Cost center = paghahati ng gastos ayon sa dibisyon/lugar (Rental, F&B, Kitchen, Administration, atbp.) sa loob ng isang branch — ginagamit para sa report na "gastos kada cost center".',
    vi: 'Trung tâm chi phí = phân bổ chi phí theo bộ phận/khu vực (Cho thuê, F&B, Bếp, Hành chính, v.v.) trong một chi nhánh — dùng cho báo cáo "chi phí theo trung tâm chi phí".',
  },
  "expenses.addCostCenterTitle": { id: "Tambah Cost Center", en: "Add Cost Center", ms: "Tambah Pusat Kos", th: "เพิ่มศูนย์ต้นทุน", fil: "Magdagdag ng Cost Center", vi: "Thêm trung tâm chi phí" },
  "expenses.placeholderNameCostCenter": { id: "Nama (mis. Kitchen)", en: "Name (e.g. Kitchen)", ms: "Nama (cth. Dapur)", th: "ชื่อ (เช่น ครัว)", fil: "Pangalan (hal. Kitchen)", vi: "Tên (vd. Bếp)" },
  "expenses.placeholderCode": { id: "Kode (opsional)", en: "Code (optional)", ms: "Kod (pilihan)", th: "รหัส (ไม่บังคับ)", fil: "Code (opsyonal)", vi: "Mã (tùy chọn)" },
  "expenses.addButton": { id: "Tambah", en: "Add", ms: "Tambah", th: "เพิ่ม", fil: "Idagdag", vi: "Thêm" },
  "expenses.emptyCostCenter": { id: "Belum ada cost center.", en: "No cost centers yet.", ms: "Belum ada pusat kos.", th: "ยังไม่มีศูนย์ต้นทุน", fil: "Wala pang cost center.", vi: "Chưa có trung tâm chi phí nào." },

  // --- Recurring tab ---
  "expenses.recurringExplainer": {
    id: "Untuk biaya rutin — listrik, internet, sewa, gaji, dst. Setiap periode buat draft expense baru secara otomatis (lewat tombol Generate di bawah), lalu tinggal Submit seperti expense biasa.",
    en: "For recurring costs — electricity, internet, rent, payroll, etc. Each period automatically creates a new draft expense (via the Generate button below), which you then Submit like a regular expense.",
    ms: "Untuk kos rutin — elektrik, internet, sewa, gaji, dll. Setiap tempoh mencipta draf perbelanjaan baharu secara automatik (melalui butang Generate di bawah), kemudian tinggal Hantar seperti perbelanjaan biasa.",
    th: "สำหรับค่าใช้จ่ายประจำ — ค่าไฟ อินเทอร์เน็ต ค่าเช่า เงินเดือน ฯลฯ แต่ละงวดจะสร้างค่าใช้จ่ายฉบับร่างใหม่โดยอัตโนมัติ (ผ่านปุ่ม Generate ด้านล่าง) จากนั้นกด Submit เหมือนค่าใช้จ่ายทั่วไป",
    fil: "Para sa regular na gastos — kuryente, internet, upa, sweldo, atbp. Sa bawat period, awtomatikong gumagawa ng bagong draft expense (gamit ang Generate button sa baba), tapos Submit na lang tulad ng regular na expense.",
    vi: "Dành cho chi phí định kỳ — điện, internet, thuê mặt bằng, lương, v.v. Mỗi kỳ sẽ tự động tạo một khoản chi nháp mới (qua nút Generate bên dưới), sau đó chỉ cần Gửi như chi phí thông thường.",
  },
  "expenses.newRecurringTemplate": { id: "Template Recurring Baru", en: "New Recurring Template", ms: "Templat Berulang Baharu", th: "เทมเพลตรายการประจำใหม่", fil: "Bagong Recurring Template", vi: "Mẫu chi định kỳ mới" },
  "expenses.placeholderNameRecurring": { id: "Nama (mis. Listrik Bulanan)", en: "Name (e.g. Monthly Electricity)", ms: "Nama (cth. Elektrik Bulanan)", th: "ชื่อ (เช่น ค่าไฟรายเดือน)", fil: "Pangalan (hal. Buwanang Kuryente)", vi: "Tên (vd. Tiền điện hàng tháng)" },
  "expenses.placeholderCategoryPlain": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "expenses.frequency.monthly": { id: "Bulanan", en: "Monthly", ms: "Bulanan", th: "รายเดือน", fil: "Buwanan", vi: "Hàng tháng" },
  "expenses.frequency.weekly": { id: "Mingguan", en: "Weekly", ms: "Mingguan", th: "รายสัปดาห์", fil: "Lingguhan", vi: "Hàng tuần" },
  "expenses.frequency.yearly": { id: "Tahunan", en: "Yearly", ms: "Tahunan", th: "รายปี", fil: "Taunan", vi: "Hàng năm" },
  "expenses.nextDueDate": { id: "Jatuh tempo berikutnya", en: "Next due date", ms: "Tarikh tempoh seterusnya", th: "วันครบกำหนดถัดไป", fil: "Susunod na due date", vi: "Ngày đến hạn kế tiếp" },
  "expenses.recordAsPayableAtCreation": { id: "Catat sebagai hutang saat dibuat", en: "Record as payable when created", ms: "Rekod sebagai hutang semasa dicipta", th: "บันทึกเป็นเจ้าหนี้เมื่อสร้าง", fil: "Itala bilang utang kapag nagawa", vi: "Ghi nhận là khoản phải trả khi tạo" },
  "expenses.saveTemplate": { id: "Simpan Template", en: "Save Template", ms: "Simpan Templat", th: "บันทึกเทมเพลต", fil: "I-save ang Template", vi: "Lưu mẫu" },
  "expenses.generateDue": { id: "Generate Expense yang Jatuh Tempo", en: "Generate Due Expenses", ms: "Generate Perbelanjaan yang Tempoh", th: "สร้างค่าใช้จ่ายที่ครบกำหนด", fil: "I-generate ang Due na Gastos", vi: "Tạo các khoản chi đến hạn" },
  "expenses.generatedCount": { id: "{n} draft expense dibuat.", en: "{n} draft expenses created.", ms: "{n} draf perbelanjaan dicipta.", th: "สร้างค่าใช้จ่ายฉบับร่าง {n} รายการ", fil: "{n} draft expense ang nagawa.", vi: "Đã tạo {n} khoản chi nháp." },
  "expenses.inactive": { id: "(nonaktif)", en: "(inactive)", ms: "(tidak aktif)", th: "(ปิดใช้งาน)", fil: "(hindi aktibo)", vi: "(ngừng hoạt động)" },
  "expenses.deactivate": { id: "Nonaktifkan", en: "Deactivate", ms: "Nyahaktifkan", th: "ปิดใช้งาน", fil: "I-deactivate", vi: "Ngừng hoạt động" },
  "expenses.emptyRecurring": { id: "Belum ada template recurring.", en: "No recurring templates yet.", ms: "Belum ada templat berulang.", th: "ยังไม่มีเทมเพลตรายการประจำ", fil: "Wala pang recurring template.", vi: "Chưa có mẫu chi định kỳ nào." },
});
