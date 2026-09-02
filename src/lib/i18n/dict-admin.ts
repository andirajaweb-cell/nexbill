import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/admin ("Admin Data") page — the raw master-data table
 * browser plus the outlet-scoped full data reset ("Danger Zone") section. Registered as a
 * side effect on import; import this file from the page before any component calls
 * useDashboardLang().t().
 */
registerDict({
  // --- Page header ---
  "admin.title": { id: "Admin Data", en: "Admin Data", ms: "Data Admin", th: "ข้อมูลผู้ดูแลระบบ", fil: "Admin Data", vi: "Dữ liệu Admin" },
  "admin.subtitle": {
    id: "Akses langsung ke tabel data master — tambah, ubah, hapus. Ini adalah jalur pintas ke database, gunakan dengan hati-hati. Tabel transaksi (order, pembayaran, jurnal akuntansi, riwayat stok) sengaja tidak ditampilkan di sini supaya integritas akuntansi & audit trail tidak rusak.",
    en: "Direct access to master data tables — add, edit, delete. This is a shortcut straight to the database, use it carefully. Transaction tables (orders, payments, accounting journals, stock history) are intentionally hidden here to protect accounting integrity & the audit trail.",
    ms: "Akses terus ke jadual data induk — tambah, ubah, padam. Ini adalah laluan pintas terus ke pangkalan data, gunakan dengan berhati-hati. Jadual transaksi (pesanan, pembayaran, jurnal perakaunan, sejarah stok) sengaja tidak dipaparkan di sini supaya integriti perakaunan & jejak audit tidak terjejas.",
    th: "เข้าถึงตารางข้อมูลหลักโดยตรง — เพิ่ม แก้ไข ลบ นี่คือทางลัดตรงสู่ฐานข้อมูล ใช้ด้วยความระมัดระวัง ตารางธุรกรรม (คำสั่งซื้อ การชำระเงิน สมุดบัญชี ประวัติสต็อก) ถูกซ่อนไว้โดยตั้งใจเพื่อรักษาความถูกต้องทางบัญชีและ audit trail",
    fil: "Direktang access sa master data tables — magdagdag, i-edit, tanggalin. Ito ay shortcut diretso sa database, gamitin nang maingat. Ang mga transaction table (order, bayad, accounting journal, history ng stock) ay sadyang hindi ipinapakita dito para hindi masira ang integridad ng accounting at audit trail.",
    vi: "Truy cập trực tiếp vào các bảng dữ liệu gốc — thêm, sửa, xóa. Đây là lối tắt thẳng vào cơ sở dữ liệu, hãy sử dụng cẩn thận. Các bảng giao dịch (đơn hàng, thanh toán, sổ nhật ký kế toán, lịch sử tồn kho) cố tình không hiển thị ở đây để bảo vệ tính toàn vẹn kế toán & nhật ký kiểm toán.",
  },
  "admin.isolationNote": {
    id: "Semua data di halaman ini terisolasi per outlet/merchant — kamu hanya melihat & mengubah data outlet kamu sendiri, tidak pernah data tenant lain.",
    en: "All data on this page is isolated per outlet/merchant — you only see & change your own outlet's data, never another tenant's.",
    ms: "Semua data pada halaman ini diasingkan mengikut outlet/peniaga — anda hanya melihat & mengubah data outlet anda sendiri, tidak sekali-kali data penyewa lain.",
    th: "ข้อมูลทั้งหมดในหน้านี้แยกตามสาขา/ผู้ค้า — คุณจะเห็นและแก้ไขได้เฉพาะข้อมูลสาขาของคุณเองเท่านั้น ไม่มีทางเห็นข้อมูลของผู้เช่ารายอื่น",
    fil: "Lahat ng data sa page na ito ay naka-isolate per outlet/merchant — makikita at mababago mo lang ang data ng sarili mong outlet, hindi kailanman ang data ng ibang tenant.",
    vi: "Mọi dữ liệu trên trang này được cô lập theo từng chi nhánh/merchant — bạn chỉ xem & thay đổi dữ liệu chi nhánh của mình, không bao giờ là dữ liệu của tenant khác.",
  },
  "admin.accessDenied": {
    id: "Halaman ini khusus Owner / Superuser.",
    en: "This page is only for Owner / Superuser.",
    ms: "Halaman ini khusus untuk Owner / Superuser.",
    th: "หน้านี้สำหรับ Owner / Superuser เท่านั้น",
    fil: "Ang page na ito ay para lamang sa Owner / Superuser.",
    vi: "Trang này chỉ dành cho Owner / Superuser.",
  },
  "admin.staffNote": {
    id: 'Tambah staf baru (perlu password) tetap lewat halaman "Staf & Hak Akses" — di sini kamu bisa ubah role/status atau hapus.',
    en: 'Adding new staff (requires a password) is still done via the "Staff & Permissions" page — here you can change role/status or delete.',
    ms: 'Menambah staf baharu (memerlukan kata laluan) masih dilakukan melalui halaman "Staf & Kebenaran" — di sini anda boleh mengubah peranan/status atau memadam.',
    th: 'การเพิ่มพนักงานใหม่ (ต้องใช้รหัสผ่าน) ยังคงทำผ่านหน้า "พนักงานและสิทธิ์" — ที่นี่คุณสามารถเปลี่ยนบทบาท/สถานะ หรือลบได้',
    fil: 'Ang pagdagdag ng bagong staff (kailangan ng password) ay ginagawa pa rin sa page na "Staff at Access" — dito, puwede mong baguhin ang role/status o tanggalin.',
    vi: 'Việc thêm nhân viên mới (cần mật khẩu) vẫn thực hiện qua trang "Nhân viên & Quyền hạn" — tại đây bạn có thể đổi vai trò/trạng thái hoặc xóa.',
  },
  "admin.ownerOnlyNote": {
    id: 'Akses penuh Admin Data (tambah/ubah/hapus tabel master) khusus Superuser. Kamu login sebagai Owner — bagian "Hapus Semua Data" di bawah tetap bisa kamu akses.',
    en: 'Full Admin Data access (add/edit/delete master tables) is Superuser-only. You\'re logged in as Owner — the "Delete All Data" section below is still available to you.',
    ms: 'Akses penuh Data Admin (tambah/ubah/padam jadual induk) khusus untuk Superuser. Anda log masuk sebagai Owner — bahagian "Padam Semua Data" di bawah masih boleh anda akses.',
    th: 'สิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบแบบเต็ม (เพิ่ม/แก้ไข/ลบตารางหลัก) สำหรับ Superuser เท่านั้น คุณเข้าสู่ระบบในฐานะ Owner — ส่วน "ลบข้อมูลทั้งหมด" ด้านล่างยังคงใช้งานได้',
    fil: 'Ang buong access sa Admin Data (magdagdag/i-edit/tanggalin ang master table) ay para lamang sa Superuser. Naka-login ka bilang Owner — ang seksyong "Tanggalin ang Lahat ng Data" sa ibaba ay puwede mo pa ring ma-access.',
    vi: 'Quyền truy cập đầy đủ vào Dữ liệu Admin (thêm/sửa/xóa bảng gốc) chỉ dành cho Superuser. Bạn đang đăng nhập với vai trò Owner — phần "Xóa toàn bộ dữ liệu" bên dưới vẫn có thể truy cập được.',
  },

  // --- Table tab labels ---
  "admin.table.products": { id: "Produk", en: "Products", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "admin.table.customers": { id: "Customer", en: "Customers", ms: "Pelanggan", th: "ลูกค้า", fil: "Customer", vi: "Khách hàng" },
  "admin.table.suppliers": { id: "Supplier", en: "Suppliers", ms: "Pembekal", th: "ซัพพลายเออร์", fil: "Supplier", vi: "Nhà cung cấp" },
  "admin.table.staff": { id: "Staff", en: "Staff", ms: "Staf", th: "พนักงาน", fil: "Staff", vi: "Nhân viên" },
  "admin.table.promos": { id: "Promo", en: "Promos", ms: "Promosi", th: "โปรโมชั่น", fil: "Promo", vi: "Khuyến mãi" },
  "admin.table.membershipTiers": { id: "Membership Tier", en: "Membership Tier", ms: "Tahap Keahlian", th: "ระดับสมาชิก", fil: "Membership Tier", vi: "Hạng thành viên" },
  "admin.table.loyaltyRates": { id: "Rate Poin Main (per Konsol)", en: "Play Points Rate (per Console)", ms: "Kadar Mata Main (per Konsol)", th: "อัตราคะแนนเล่น (ต่อเครื่อง)", fil: "Rate ng Play Points (per Console)", vi: "Tỷ lệ điểm chơi (theo máy)" },
  "admin.table.rentalUnits": { id: "Unit PS", en: "PS Units", ms: "Unit PS", th: "เครื่อง PS", fil: "Unit ng PS", vi: "Máy PS" },
  "admin.table.outlets": { id: "Outlet", en: "Outlets", ms: "Outlet", th: "สาขา", fil: "Outlet", vi: "Chi nhánh" },
  "admin.table.devices": { id: "Device", en: "Devices", ms: "Peranti", th: "อุปกรณ์", fil: "Device", vi: "Thiết bị" },
  "admin.table.warehouses": { id: "Gudang", en: "Warehouses", ms: "Gudang", th: "คลังสินค้า", fil: "Warehouse", vi: "Kho" },
  "admin.table.recipes": { id: "Resep", en: "Recipes", ms: "Resipi", th: "สูตร", fil: "Recipe", vi: "Công thức" },
  "admin.table.pricingRules": { id: "Aturan Harga", en: "Pricing Rules", ms: "Peraturan Harga", th: "กฎการตั้งราคา", fil: "Pricing Rules", vi: "Quy tắc giá" },
  "admin.table.vouchers": { id: "Voucher", en: "Vouchers", ms: "Baucar", th: "บัตรกำนัล", fil: "Voucher", vi: "Phiếu giảm giá" },
  "admin.table.cashBankAccounts": { id: "Akun Kas/Bank", en: "Cash/Bank Accounts", ms: "Akaun Tunai/Bank", th: "บัญชีเงินสด/ธนาคาร", fil: "Cash/Bank Account", vi: "Tài khoản tiền mặt/ngân hàng" },
  "admin.table.accounts": { id: "Chart of Accounts", en: "Chart of Accounts", ms: "Carta Akaun", th: "ผังบัญชี", fil: "Chart of Accounts", vi: "Hệ thống tài khoản" },
  "admin.table.agentSettings": { id: "Pengaturan AI Agent", en: "AI Agent Settings", ms: "Tetapan AI Agent", th: "การตั้งค่า AI Agent", fil: "Setting ng AI Agent", vi: "Cài đặt AI Agent" },

  // --- Table view ---
  "admin.table.editBtn": { id: "Edit", en: "Edit", ms: "Edit", th: "แก้ไข", fil: "I-edit", vi: "Sửa" },
  "admin.table.deleteBtn": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },
  "admin.table.noData": { id: "Belum ada data.", en: "No data yet.", ms: "Belum ada data.", th: "ยังไม่มีข้อมูล", fil: "Wala pang data.", vi: "Chưa có dữ liệu." },

  // --- Create/Edit form ---
  "admin.form.editTitle": { id: "Edit {label}", en: "Edit {label}", ms: "Edit {label}", th: "แก้ไข {label}", fil: "I-edit ang {label}", vi: "Sửa {label}" },
  "admin.form.addTitle": { id: "Tambah {label}", en: "Add {label}", ms: "Tambah {label}", th: "เพิ่ม {label}", fil: "Magdagdag ng {label}", vi: "Thêm {label}" },
  "admin.form.saveBtn": { id: "Simpan Perubahan", en: "Save Changes", ms: "Simpan Perubahan", th: "บันทึกการเปลี่ยนแปลง", fil: "I-save ang mga Pagbabago", vi: "Lưu thay đổi" },
  "admin.form.addBtn": { id: "Tambah", en: "Add", ms: "Tambah", th: "เพิ่ม", fil: "Magdagdag", vi: "Thêm" },
  "admin.form.cancelBtn": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },

  "admin.confirmDeleteRow": { id: "Hapus data ini dari {label}?", en: "Delete this record from {label}?", ms: "Padam data ini daripada {label}?", th: "ลบข้อมูลนี้จาก {label}?", fil: "Tanggalin ang data na ito mula sa {label}?", vi: "Xóa dữ liệu này khỏi {label}?" },

  // --- Reset Data ("Danger Zone") section ---
  "admin.reset.title": {
    id: "Hapus Semua Data (Reset Total) — Outlet Ini Saja",
    en: "Delete All Data (Full Reset) — This Outlet Only",
    ms: "Padam Semua Data (Reset Penuh) — Outlet Ini Sahaja",
    th: "ลบข้อมูลทั้งหมด (รีเซ็ตทั้งหมด) — เฉพาะสาขานี้",
    fil: "Tanggalin ang Lahat ng Data (Full Reset) — Outlet na Ito Lang",
    vi: "Xóa toàn bộ dữ liệu (Đặt lại hoàn toàn) — Chỉ chi nhánh này",
  },
  "admin.reset.desc1Pre": { id: "Menghapus permanen, ", en: "Permanently deletes, ", ms: "Memadam secara kekal, ", th: "ลบถาวร ", fil: "Permanenteng tatanggalin, ", vi: "Xóa vĩnh viễn, " },
  "admin.reset.desc1Bold": {
    id: "hanya untuk outlet yang sedang aktif",
    en: "only for the currently active outlet",
    ms: "hanya untuk outlet yang sedang aktif",
    th: "เฉพาะสาขาที่ใช้งานอยู่ในขณะนี้เท่านั้น",
    fil: "para lang sa kasalukuyang aktibong outlet",
    vi: "chỉ dành cho chi nhánh đang hoạt động",
  },
  "admin.reset.desc1Rest": {
    id: ": semua transaksi POS, order, pembayaran, booking, sesi rental, jurnal & laporan akuntansi, produk & resep/BOM, stok & supplier, pelanggan & membership, promo/voucher, expense, aset, data Home Rental, notifikasi, audit log, chart of accounts, metode pembayaran, satuan, dan pengaturan lainnya. Data outlet/merchant lain di sistem ini sama sekali tidak tersentuh.",
    en: ": all POS transactions, orders, payments, bookings, rental sessions, accounting journals & reports, products & recipes/BOM, stock & suppliers, customers & memberships, promos/vouchers, expenses, assets, Home Rental data, notifications, audit logs, chart of accounts, payment methods, units, and other settings. Other outlets/merchants in this system are completely untouched.",
    ms: ": semua transaksi POS, pesanan, pembayaran, tempahan, sesi sewa, jurnal & laporan perakaunan, produk & resipi/BOM, stok & pembekal, pelanggan & keahlian, promosi/baucar, perbelanjaan, aset, data Home Rental, notifikasi, log audit, carta akaun, kaedah pembayaran, unit, dan tetapan lain. Outlet/peniaga lain dalam sistem ini langsung tidak terjejas.",
    th: ": ธุรกรรม POS ทั้งหมด คำสั่งซื้อ การชำระเงิน การจอง เซสชันการเช่า สมุดบัญชีและรายงานบัญชี สินค้าและสูตร/BOM สต็อกและซัพพลายเออร์ ลูกค้าและสมาชิก โปรโมชั่น/บัตรกำนัล ค่าใช้จ่าย สินทรัพย์ ข้อมูล Home Rental การแจ้งเตือน audit log ผังบัญชี วิธีการชำระเงิน หน่วยนับ และการตั้งค่าอื่นๆ สาขา/ผู้ค้ารายอื่นในระบบนี้จะไม่ได้รับผลกระทบใดๆ เลย",
    fil: ": lahat ng transaksyon sa POS, order, bayad, booking, rental session, accounting journal at report, produkto at recipe/BOM, stock at supplier, customer at membership, promo/voucher, gastos, asset, data ng Home Rental, notification, audit log, chart of accounts, paraan ng bayad, unit, at iba pang setting. Ang ibang outlet/merchant sa system na ito ay hindi talaga maaapektuhan.",
    vi: ": tất cả giao dịch POS, đơn hàng, thanh toán, đặt chỗ, phiên thuê, sổ nhật ký & báo cáo kế toán, sản phẩm & công thức/BOM, tồn kho & nhà cung cấp, khách hàng & thành viên, khuyến mãi/phiếu giảm giá, chi phí, tài sản, dữ liệu Home Rental, thông báo, nhật ký kiểm toán, hệ thống tài khoản, phương thức thanh toán, đơn vị tính, và các cài đặt khác. Các chi nhánh/merchant khác trong hệ thống này hoàn toàn không bị ảnh hưởng.",
  },
  "admin.reset.desc2Pre": { id: "Yang ", en: "What ", ms: "Yang ", th: "สิ่งที่ ", fil: "Ang mga bagay na ", vi: "Những gì " },
  "admin.reset.desc2Bold1": { id: "tetap ada", en: "stays", ms: "tetap ada", th: "ยังคงอยู่", fil: "mananatili", vi: "vẫn còn" },
  "admin.reset.desc2Mid": {
    id: " supaya sistem tidak terkunci total: data cabang/outlet itu sendiri, dan akun staf dengan role ",
    en: " so the system isn't completely locked out: the branch/outlet record itself, and staff accounts with the role ",
    ms: " supaya sistem tidak terkunci sepenuhnya: rekod cabang/outlet itu sendiri, dan akaun staf dengan peranan ",
    th: " เพื่อไม่ให้ระบบถูกล็อกทั้งหมด: ข้อมูลสาขา/outlet เอง และบัญชีพนักงานที่มีบทบาท ",
    fil: " para hindi ganap na maka-lock ang system: ang record mismo ng branch/outlet, at ang staff account na may role na ",
    vi: " để hệ thống không bị khóa hoàn toàn: bản ghi chi nhánh/outlet, và các tài khoản nhân viên có vai trò ",
  },
  "admin.reset.desc2Suffix": {
    id: " (akun lain dengan role tersebut juga tetap ada). Semua akun staf non-Superuser/Owner (Manager, Kasir, dll) di outlet ini ikut terhapus.",
    en: " (other accounts with that role also remain). All non-Superuser/Owner staff accounts (Manager, Cashier, etc.) at this outlet will be deleted too.",
    ms: " (akaun lain dengan peranan tersebut juga kekal). Semua akaun staf bukan Superuser/Owner (Manager, Juruwang, dll) di outlet ini turut dipadam.",
    th: " (บัญชีอื่นที่มีบทบาทนี้ก็จะยังคงอยู่) บัญชีพนักงานที่ไม่ใช่ Superuser/Owner ทั้งหมด (ผู้จัดการ แคชเชียร์ ฯลฯ) ในสาขานี้จะถูกลบไปด้วย",
    fil: " (mananatili rin ang ibang account na may role na iyon). Lahat ng staff account na hindi Superuser/Owner (Manager, Cashier, atbp.) sa outlet na ito ay matatanggal din.",
    vi: " (các tài khoản khác có vai trò đó vẫn được giữ lại). Tất cả tài khoản nhân viên không phải Superuser/Owner (Quản lý, Thu ngân, v.v.) tại chi nhánh này cũng sẽ bị xóa.",
  },
  "admin.reset.typeExactly": { id: "Ketik persis: ", en: "Type exactly: ", ms: "Taip tepat: ", th: "พิมพ์ให้ตรงทุกตัวอักษร: ", fil: "I-type nang eksakto: ", vi: "Nhập chính xác: " },
  "admin.reset.passwordLabel": { id: "Password kamu (konfirmasi ulang)", en: "Your password (re-confirm)", ms: "Kata laluan anda (sahkan semula)", th: "รหัสผ่านของคุณ (ยืนยันอีกครั้ง)", fil: "Password mo (kumpirmahin ulit)", vi: "Mật khẩu của bạn (xác nhận lại)" },
  "admin.reset.deletingBtn": { id: "Menghapus...", en: "Deleting...", ms: "Memadam...", th: "กำลังลบ...", fil: "Tinatanggal...", vi: "Đang xóa..." },
  "admin.reset.deleteNowBtn": {
    id: "Hapus Semua Data Outlet Ini Sekarang",
    en: "Delete All Data For This Outlet Now",
    ms: "Padam Semua Data Outlet Ini Sekarang",
    th: "ลบข้อมูลทั้งหมดของสาขานี้ตอนนี้",
    fil: "Tanggalin ang Lahat ng Data ng Outlet na Ito Ngayon",
    vi: "Xóa toàn bộ dữ liệu chi nhánh này ngay",
  },
  "admin.reset.retypeExact": {
    id: 'Ketik ulang persis: "{phrase}"',
    en: 'Retype exactly: "{phrase}"',
    ms: 'Taip semula tepat: "{phrase}"',
    th: 'พิมพ์ซ้ำให้ตรงทุกตัวอักษร: "{phrase}"',
    fil: 'I-type ulit nang eksakto: "{phrase}"',
    vi: 'Nhập lại chính xác: "{phrase}"',
  },
  "admin.reset.enterPassword": { id: "Masukkan password kamu.", en: "Enter your password.", ms: "Masukkan kata laluan anda.", th: "กรอกรหัสผ่านของคุณ", fil: "Ilagay ang password mo.", vi: "Nhập mật khẩu của bạn." },
  "admin.reset.confirmMessage": {
    id: "Ini akan MENGHAPUS PERMANEN semua data operasional outlet ini — produk, transaksi, booking, akuntansi, staf lain, dan lainnya. Outlet/tenant lain tidak terpengaruh. Tidak bisa dibatalkan dari aplikasi. Lanjutkan?",
    en: "This will PERMANENTLY DELETE all operational data for this outlet — products, transactions, bookings, accounting, other staff, and more. Other outlets/tenants are not affected. This cannot be undone from within the app. Continue?",
    ms: "Ini akan MEMADAM SECARA KEKAL semua data operasi outlet ini — produk, transaksi, tempahan, perakaunan, staf lain, dan lain-lain. Outlet/penyewa lain tidak terjejas. Tidak boleh dibatalkan dari dalam aplikasi. Teruskan?",
    th: "การกระทำนี้จะลบถาวรข้อมูลการดำเนินงานทั้งหมดของสาขานี้ — สินค้า ธุรกรรม การจอง บัญชี พนักงานอื่นๆ และอื่นๆ สาขา/ผู้เช่ารายอื่นจะไม่ได้รับผลกระทบ ไม่สามารถยกเลิกได้จากภายในแอป ดำเนินการต่อหรือไม่?",
    fil: "Ito ay PERMANENTENG TATANGGALIN ang lahat ng operational data ng outlet na ito — produkto, transaksyon, booking, accounting, ibang staff, at marami pa. Hindi maaapektuhan ang ibang outlet/tenant. Hindi na ito puwedeng bawiin sa loob ng app. Magpatuloy?",
    vi: "Thao tác này sẽ XÓA VĨNH VIỄN toàn bộ dữ liệu vận hành của chi nhánh này — sản phẩm, giao dịch, đặt chỗ, kế toán, nhân viên khác, và nhiều hơn nữa. Các chi nhánh/tenant khác không bị ảnh hưởng. Không thể hoàn tác từ trong ứng dụng. Tiếp tục?",
  },
  "admin.reset.doneMessage": {
    id: "Selesai. {n} tabel dikosongkan (hanya milik outlet ini). Kamu akan diarahkan ke halaman login.",
    en: "Done. {n} tables were cleared (belonging to this outlet only). You'll be redirected to the login page.",
    ms: "Selesai. {n} jadual telah dikosongkan (milik outlet ini sahaja). Anda akan diarahkan ke halaman log masuk.",
    th: "เสร็จสิ้น ล้างข้อมูลไปแล้ว {n} ตาราง (เฉพาะของสาขานี้) คุณจะถูกนำไปยังหน้าเข้าสู่ระบบ",
    fil: "Tapos na. {n} table ang na-clear (pag-aari lang ng outlet na ito). Ire-redirect ka sa login page.",
    vi: "Hoàn tất. {n} bảng đã được xóa sạch (chỉ thuộc chi nhánh này). Bạn sẽ được chuyển đến trang đăng nhập.",
  },
});
