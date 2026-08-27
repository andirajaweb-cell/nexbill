import { registerDict } from "./registry";

/**
 * Translations for /dashboard/maintenance — the asset repair/maintenance ticket workflow
 * (queued → in_progress → done). Registered as a side effect on import; import this file once
 * near the top of the maintenance page before any component calls useDashboardLang().t().
 */
registerDict({
  // --- Asset categories (shared with the ticket table + "new ticket" asset picker) ---
  "maintenance.category.playstation": { id: "PlayStation / Konsol", en: "PlayStation / Console", ms: "PlayStation / Konsol", th: "เพลย์สเตชัน / คอนโซล", fil: "PlayStation / Console", vi: "PlayStation / Máy chơi game" },
  "maintenance.category.tv": { id: "TV", en: "TV", ms: "TV", th: "ทีวี", fil: "TV", vi: "TV" },
  "maintenance.category.controller": { id: "Controller / Aksesoris", en: "Controller / Accessories", ms: "Kawalan / Aksesori", th: "จอยควบคุม / อุปกรณ์เสริม", fil: "Controller / Accessories", vi: "Tay cầm / Phụ kiện" },
  "maintenance.category.furniture": { id: "Furniture", en: "Furniture", ms: "Perabot", th: "เฟอร์นิเจอร์", fil: "Kasangkapan", vi: "Nội thất" },
  "maintenance.category.vehicle": { id: "Kendaraan", en: "Vehicle", ms: "Kenderaan", th: "ยานพาหนะ", fil: "Sasakyan", vi: "Phương tiện" },
  "maintenance.category.other": { id: "Lainnya", en: "Other", ms: "Lain-lain", th: "อื่นๆ", fil: "Iba pa", vi: "Khác" },

  // --- Ticket status ---
  "maintenance.status.queued": { id: "Masuk Maintenance", en: "Queued for Repair", ms: "Masuk Penyelenggaraan", th: "รอซ่อมบำรุง", fil: "Pasok sa Maintenance", vi: "Chờ bảo trì" },
  "maintenance.status.inProgress": { id: "Proses", en: "In Progress", ms: "Dalam Proses", th: "กำลังดำเนินการ", fil: "Isinasagawa", vi: "Đang xử lý" },
  "maintenance.status.done": { id: "Selesai", en: "Done", ms: "Selesai", th: "เสร็จสิ้น", fil: "Tapos na", vi: "Hoàn tất" },
  "maintenance.filterAll": { id: "Semua", en: "All", ms: "Semua", th: "ทั้งหมด", fil: "Lahat", vi: "Tất cả" },

  // --- Header ---
  "maintenance.title": { id: "Maintenance / Perbaikan", en: "Maintenance / Repairs", ms: "Penyelenggaraan / Pembaikan", th: "ซ่อมบำรุง / ซ่อมแซม", fil: "Maintenance / Pagkukumpuni", vi: "Bảo trì / Sửa chữa" },
  "maintenance.subtitlePrefix": { id: "Alur perbaikan TV, konsol, controller & aksesoris lain: Masuk Maintenance → Proses → Selesai. Data aset diambil langsung dari halaman", en: "Repair flow for TVs, consoles, controllers & other accessories: Queued for Repair → In Progress → Done. Asset data is pulled directly from the", ms: "Aliran pembaikan TV, konsol, kawalan & aksesori lain: Masuk Penyelenggaraan → Dalam Proses → Selesai. Data aset diambil terus daripada halaman", th: "ขั้นตอนการซ่อมทีวี คอนโซล จอยควบคุม และอุปกรณ์เสริมอื่นๆ: รอซ่อมบำรุง → กำลังดำเนินการ → เสร็จสิ้น ข้อมูลสินทรัพย์ดึงมาจากหน้า", fil: "Daloy ng pagkukumpuni ng TV, console, controller at iba pang accessories: Pasok sa Maintenance → Isinasagawa → Tapos na. Direktang kinukuha ang data ng asset mula sa pahina ng", vi: "Quy trình sửa chữa TV, máy chơi game, tay cầm & phụ kiện khác: Chờ bảo trì → Đang xử lý → Hoàn tất. Dữ liệu tài sản được lấy trực tiếp từ trang" },
  "maintenance.assetsLinkText": { id: "Aset", en: "Assets", ms: "Aset", th: "สินทรัพย์", fil: "Assets", vi: "Tài sản" },

  // --- Category summary cards ---
  "maintenance.availableOfTotal": { id: "tersedia / {total} total", en: "available / {total} total", ms: "tersedia / {total} jumlah", th: "พร้อมใช้งาน / รวม {total}", fil: "available / {total} kabuuan", vi: "còn dùng được / {total} tổng" },
  "maintenance.underMaintenanceCount": { id: "{n} sedang maintenance", en: "{n} under maintenance", ms: "{n} sedang diselenggara", th: "{n} เครื่องกำลังซ่อมบำรุง", fil: "{n} na nasa maintenance", vi: "{n} đang bảo trì" },
  "maintenance.noAssetsRegistered": { id: "Belum ada aset terdaftar — tambahkan dulu di halaman Aset.", en: "No assets registered yet — add one on the Assets page first.", ms: "Belum ada aset didaftarkan — tambah dahulu di halaman Aset.", th: "ยังไม่มีสินทรัพย์ที่ลงทะเบียน — โปรดเพิ่มที่หน้าสินทรัพย์ก่อน", fil: "Wala pang nakarehistrong asset — magdagdag muna sa pahina ng Assets.", vi: "Chưa có tài sản nào được đăng ký — hãy thêm tại trang Tài sản trước." },

  // --- Toolbar / toggle ---
  "maintenance.closeForm": { id: "Tutup Form", en: "Close Form", ms: "Tutup Borang", th: "ปิดแบบฟอร์ม", fil: "Isara ang Form", vi: "Đóng biểu mẫu" },
  "maintenance.addMaintenance": { id: "+ Tambah Maintenance", en: "+ Add Maintenance", ms: "+ Tambah Penyelenggaraan", th: "+ เพิ่มงานซ่อมบำรุง", fil: "+ Magdagdag ng Maintenance", vi: "+ Thêm bảo trì" },

  // --- New ticket form ---
  "maintenance.newTicketHeading": { id: "Tiket Maintenance Baru", en: "New Maintenance Ticket", ms: "Tiket Penyelenggaraan Baharu", th: "ตั๋วซ่อมบำรุงใหม่", fil: "Bagong Maintenance Ticket", vi: "Phiếu bảo trì mới" },
  "maintenance.selectAssetPlaceholder": { id: "Pilih aset...", en: "Select an asset...", ms: "Pilih aset...", th: "เลือกสินทรัพย์...", fil: "Pumili ng asset...", vi: "Chọn tài sản..." },
  "maintenance.ticketAlreadyRunning": { id: " (sudah ada tiket berjalan)", en: " (a ticket is already in progress)", ms: " (sudah ada tiket berjalan)", th: " (มีตั๋วที่กำลังดำเนินการอยู่แล้ว)", fil: " (may tiket na na patakbo)", vi: " (đã có phiếu đang xử lý)" },
  "maintenance.costPlaceholder": { id: "Biaya (Rp, 0 jika belum tahu)", en: "Cost (Rp, 0 if unknown)", ms: "Kos (Rp, 0 jika belum diketahui)", th: "ค่าใช้จ่าย (Rp, 0 หากยังไม่ทราบ)", fil: "Gastos (Rp, 0 kung hindi pa alam)", vi: "Chi phí (Rp, để 0 nếu chưa biết)" },
  "maintenance.descriptionPlaceholder": { id: "Deskripsi kerusakan (mis. Layar TV bergaris)", en: "Damage description (e.g. TV screen has lines)", ms: "Penerangan kerosakan (cth. Skrin TV bergaris)", th: "รายละเอียดความเสียหาย (เช่น จอทีวีมีเส้น)", fil: "Deskripsyon ng sira (hal. May guhit ang screen ng TV)", vi: "Mô tả hư hỏng (vd: Màn hình TV bị sọc)" },
  "maintenance.createExpenseCheckbox": { id: "Buat Expense (Beban Maintenance) sekarang", en: "Create an expense (maintenance cost) now", ms: "Buat Perbelanjaan (Kos Penyelenggaraan) sekarang", th: "สร้างรายจ่าย (ค่าซ่อมบำรุง) ตอนนี้", fil: "Gumawa ng Expense (Gastos sa Maintenance) ngayon", vi: "Tạo chi phí (bảo trì) ngay" },
  "maintenance.expenseAccountPlaceholder": { id: "Akun Beban (COA)", en: "Expense Account (COA)", ms: "Akaun Perbelanjaan (COA)", th: "บัญชีค่าใช้จ่าย (COA)", fil: "Expense Account (COA)", vi: "Tài khoản chi phí (COA)" },
  "maintenance.cashBankAccountPlaceholder": { id: "Akun Kas/Bank (kosongkan = hutang)", en: "Cash/Bank Account (leave blank = payable)", ms: "Akaun Tunai/Bank (kosongkan = hutang)", th: "บัญชีเงินสด/ธนาคาร (เว้นว่าง = เจ้าหนี้)", fil: "Cash/Bank Account (iwanang blangko = utang)", vi: "Tài khoản tiền mặt/ngân hàng (để trống = công nợ)" },
  "maintenance.saveTicket": { id: "Simpan Tiket", en: "Save Ticket", ms: "Simpan Tiket", th: "บันทึกตั๋ว", fil: "I-save ang Ticket", vi: "Lưu phiếu" },

  // --- Ticket table ---
  "maintenance.col.asset": { id: "Aset", en: "Asset", ms: "Aset", th: "สินทรัพย์", fil: "Asset", vi: "Tài sản" },
  "maintenance.col.category": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "maintenance.col.description": { id: "Deskripsi", en: "Description", ms: "Penerangan", th: "รายละเอียด", fil: "Deskripsyon", vi: "Mô tả" },
  "maintenance.col.cost": { id: "Biaya", en: "Cost", ms: "Kos", th: "ค่าใช้จ่าย", fil: "Gastos", vi: "Chi phí" },
  "maintenance.col.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "maintenance.col.dateIn": { id: "Masuk", en: "Date In", ms: "Tarikh Masuk", th: "วันที่รับเข้า", fil: "Petsa Pasok", vi: "Ngày vào" },
  "maintenance.deletedAsset": { id: "(aset terhapus)", en: "(deleted asset)", ms: "(aset dipadam)", th: "(สินทรัพย์ที่ถูกลบ)", fil: "(tinanggal na asset)", vi: "(tài sản đã xóa)" },
  "maintenance.recordedAsExpenseTitle": { id: "Sudah tercatat sebagai Expense — ubah lewat halaman Expense.", en: "Already recorded as an expense — edit it from the Expenses page.", ms: "Sudah direkodkan sebagai Perbelanjaan — ubah melalui halaman Perbelanjaan.", th: "บันทึกเป็นรายจ่ายแล้ว — แก้ไขได้ที่หน้ารายจ่าย", fil: "Naitala na bilang Expense — i-edit sa pahina ng Expense.", vi: "Đã được ghi nhận là chi phí — chỉnh sửa tại trang Chi phí." },

  // --- Row actions ---
  "maintenance.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "maintenance.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "maintenance.startProcess": { id: "Mulai Proses", en: "Start Processing", ms: "Mula Proses", th: "เริ่มดำเนินการ", fil: "Simulan ang Proseso", vi: "Bắt đầu xử lý" },
  "maintenance.markDone": { id: "Tandai Selesai", en: "Mark as Done", ms: "Tanda Selesai", th: "ทำเครื่องหมายว่าเสร็จสิ้น", fil: "Markahan bilang Tapos na", vi: "Đánh dấu hoàn tất" },
  "maintenance.edit": { id: "Edit", en: "Edit", ms: "Edit", th: "แก้ไข", fil: "I-edit", vi: "Sửa" },
  "maintenance.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },
  "maintenance.noTickets": { id: "Belum ada tiket maintenance.", en: "No maintenance tickets yet.", ms: "Belum ada tiket penyelenggaraan.", th: "ยังไม่มีตั๋วซ่อมบำรุง", fil: "Wala pang maintenance ticket.", vi: "Chưa có phiếu bảo trì nào." },

  // --- Alerts / confirms ---
  "maintenance.alertSelectAsset": { id: "Pilih aset yang mau di-maintenance.", en: "Select the asset to send for maintenance.", ms: "Pilih aset yang hendak diselenggara.", th: "โปรดเลือกสินทรัพย์ที่ต้องการซ่อมบำรุง", fil: "Pumili ng asset na gustong i-maintenance.", vi: "Chọn tài sản cần bảo trì." },
  "maintenance.alertDescriptionRequired": { id: "Deskripsi maintenance wajib diisi.", en: "A maintenance description is required.", ms: "Penerangan penyelenggaraan wajib diisi.", th: "กรุณากรอกรายละเอียดการซ่อมบำรุง", fil: "Kinakailangan ang deskripsyon ng maintenance.", vi: "Vui lòng nhập mô tả bảo trì." },
  "maintenance.alertSelectExpenseAccount": { id: "Pilih akun beban untuk membuat expense maintenance.", en: "Select an expense account to create the maintenance expense.", ms: "Pilih akaun perbelanjaan untuk membuat perbelanjaan penyelenggaraan.", th: "โปรดเลือกบัญชีค่าใช้จ่ายเพื่อสร้างรายจ่ายซ่อมบำรุง", fil: "Pumili ng expense account para gumawa ng maintenance expense.", vi: "Chọn tài khoản chi phí để tạo chi phí bảo trì." },
  "maintenance.confirmDeleteTicket": { id: 'Hapus tiket maintenance "{desc}"? Tindakan ini permanen.', en: 'Delete the maintenance ticket "{desc}"? This action is permanent.', ms: 'Padam tiket penyelenggaraan "{desc}"? Tindakan ini kekal.', th: 'ลบตั๋วซ่อมบำรุง "{desc}" หรือไม่? การกระทำนี้ถาวร', fil: 'Tatanggalin ang maintenance ticket na "{desc}"? Permanente ang aksyon na ito.', vi: 'Xóa phiếu bảo trì "{desc}"? Hành động này không thể hoàn tác.' },
});
