import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/staff ("Staff & Permissions") page — staff account CRUD,
 * void/refund approval requests, the audit log, and the role permission checklist. Registered
 * as a side effect on import; import this file from the page before any component calls
 * useDashboardLang().t().
 *
 * Note: permission group/label text itself (PERMISSION_GROUPS / PERMISSION_LABEL) and role
 * display names (roleLabel) live in src/lib/auth/permissions.ts and are intentionally NOT
 * covered here — only strings hardcoded directly in the page component's JSX are.
 */
registerDict({
  // --- Page header ---
  "staff.title": { id: "Staf & Hak Akses (RBAC)", en: "Staff & Permissions (RBAC)", ms: "Staf & Kebenaran (RBAC)", th: "พนักงานและสิทธิ์ (RBAC)", fil: "Staff at Access (RBAC)", vi: "Nhân viên & Quyền hạn (RBAC)" },
  "staff.subtitle": {
    id: "Kelola staf, role, permintaan void/refund yang butuh approval, dan jejak audit.",
    en: "Manage staff, roles, void/refund requests that need approval, and the audit trail.",
    ms: "Urus staf, peranan, permintaan void/bayaran balik yang memerlukan kelulusan, dan jejak audit.",
    th: "จัดการพนักงาน บทบาท คำขอ void/คืนเงินที่ต้องอนุมัติ และบันทึกการตรวจสอบ",
    fil: "Pamahalaan ang staff, role, mga void/refund request na kailangan ng approval, at ang audit trail.",
    vi: "Quản lý nhân viên, vai trò, các yêu cầu void/hoàn tiền cần phê duyệt, và nhật ký kiểm toán.",
  },

  // --- Tabs ---
  "staff.tabs.staffList": { id: "Daftar Staf", en: "Staff List", ms: "Senarai Staf", th: "รายชื่อพนักงาน", fil: "Listahan ng Staff", vi: "Danh sách nhân viên" },
  "staff.tabs.approvals": { id: "Approval", en: "Approvals", ms: "Kelulusan", th: "การอนุมัติ", fil: "Approval", vi: "Phê duyệt" },
  "staff.tabs.audit": { id: "Audit Log", en: "Audit Log", ms: "Log Audit", th: "บันทึกการตรวจสอบ", fil: "Audit Log", vi: "Nhật ký kiểm toán" },
  "staff.tabs.roles": { id: "Role & Izin", en: "Roles & Permissions", ms: "Peranan & Kebenaran", th: "บทบาทและสิทธิ์", fil: "Role at Permission", vi: "Vai trò & Quyền hạn" },

  // --- Add Staff ---
  "staff.addStaff.title": { id: "Tambah Staf", en: "Add Staff", ms: "Tambah Staf", th: "เพิ่มพนักงาน", fil: "Magdagdag ng Staff", vi: "Thêm nhân viên" },
  "staff.addStaff.namePlaceholder": { id: "Nama", en: "Name", ms: "Nama", th: "ชื่อ", fil: "Pangalan", vi: "Tên" },
  "staff.addStaff.emailPlaceholder": { id: "Email", en: "Email", ms: "E-mel", th: "อีเมล", fil: "Email", vi: "Email" },
  "staff.addStaff.passwordPlaceholder": { id: "Password", en: "Password", ms: "Kata Laluan", th: "รหัสผ่าน", fil: "Password", vi: "Mật khẩu" },
  "staff.addStaff.addBtn": { id: "Tambah", en: "Add", ms: "Tambah", th: "เพิ่ม", fil: "Idagdag", vi: "Thêm" },
  "staff.addStaff.noPermission": {
    id: "Role kamu ({role}) tidak punya izin menambah staf.",
    en: "Your role ({role}) doesn't have permission to add staff.",
    ms: "Peranan anda ({role}) tidak mempunyai kebenaran untuk menambah staf.",
    th: "บทบาทของคุณ ({role}) ไม่มีสิทธิ์เพิ่มพนักงาน",
    fil: "Ang role mo ({role}) ay walang permiso na magdagdag ng staff.",
    vi: "Vai trò của bạn ({role}) không có quyền thêm nhân viên.",
  },

  // --- Staff table ---
  "staff.table.name": { id: "Nama", en: "Name", ms: "Nama", th: "ชื่อ", fil: "Pangalan", vi: "Tên" },
  "staff.table.email": { id: "Email", en: "Email", ms: "E-mel", th: "อีเมล", fil: "Email", vi: "Email" },
  "staff.table.role": { id: "Role", en: "Role", ms: "Peranan", th: "บทบาท", fil: "Role", vi: "Vai trò" },
  "staff.table.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "staff.table.superuserReserved": { id: "Superuser (reserved)", en: "Superuser (reserved)", ms: "Superuser (dikhaskan)", th: "Superuser (สงวนไว้)", fil: "Superuser (nakalaan)", vi: "Superuser (dành riêng)" },

  "staff.status.active": { id: "Aktif", en: "Active", ms: "Aktif", th: "เปิดใช้งาน", fil: "Aktibo", vi: "Đang hoạt động" },
  "staff.status.inactive": { id: "Nonaktif", en: "Inactive", ms: "Tidak Aktif", th: "ปิดใช้งาน", fil: "Hindi Aktibo", vi: "Ngừng hoạt động" },

  "staff.action.deactivate": { id: "Nonaktifkan", en: "Deactivate", ms: "Nyahaktifkan", th: "ปิดใช้งาน", fil: "I-deactivate", vi: "Vô hiệu hóa" },
  "staff.action.activate": { id: "Aktifkan", en: "Activate", ms: "Aktifkan", th: "เปิดใช้งาน", fil: "I-activate", vi: "Kích hoạt" },
  "staff.action.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },

  // --- Alerts / confirms ---
  "staff.alert.cannotDeleteSelf": {
    id: "Tidak bisa menghapus akun sendiri yang sedang login.",
    en: "You can't delete the account you're currently logged in with.",
    ms: "Anda tidak boleh memadam akaun sendiri yang sedang log masuk.",
    th: "คุณไม่สามารถลบบัญชีของตัวเองที่กำลังเข้าสู่ระบบอยู่ได้",
    fil: "Hindi mo puwedeng tanggalin ang sarili mong account na kasalukuyang naka-login.",
    vi: "Bạn không thể xóa tài khoản đang đăng nhập của chính mình.",
  },
  "staff.confirm.deleteStaff": {
    id: 'Hapus staf "{name}"? Data histori (order, jurnal) tetap tersimpan.',
    en: 'Delete staff "{name}"? Historical data (orders, journals) will still be kept.',
    ms: 'Padam staf "{name}"? Data sejarah (pesanan, jurnal) tetap disimpan.',
    th: 'ลบพนักงาน "{name}"? ข้อมูลประวัติ (คำสั่งซื้อ สมุดบัญชี) จะยังคงถูกเก็บไว้',
    fil: 'Tanggalin ang staff na "{name}"? Mananatiling naka-save ang historical data (order, journal).',
    vi: 'Xóa nhân viên "{name}"? Dữ liệu lịch sử (đơn hàng, sổ nhật ký) vẫn được lưu giữ.',
  },
  "staff.confirm.resetRole": {
    id: 'Kembalikan izin role "{role}" ke pengaturan bawaan aplikasi?',
    en: 'Reset the "{role}" role\'s permissions back to the app\'s default settings?',
    ms: 'Kembalikan kebenaran peranan "{role}" kepada tetapan lalai aplikasi?',
    th: 'รีเซ็ตสิทธิ์ของบทบาท "{role}" กลับไปเป็นค่าเริ่มต้นของแอปหรือไม่?',
    fil: 'Ibalik ang mga permission ng role na "{role}" sa default na setting ng app?',
    vi: 'Đặt lại quyền của vai trò "{role}" về cài đặt mặc định của ứng dụng?',
  },
  "staff.matrix.loadError": {
    id: "Gagal memuat matriks izin.",
    en: "Failed to load the permission matrix.",
    ms: "Gagal memuatkan matriks kebenaran.",
    th: "โหลดตารางสิทธิ์ไม่สำเร็จ",
    fil: "Nabigong i-load ang permission matrix.",
    vi: "Tải ma trận quyền hạn thất bại.",
  },
  "staff.matrix.toggleError": {
    id: "Gagal mengubah izin.",
    en: "Failed to update the permission.",
    ms: "Gagal mengubah kebenaran.",
    th: "แก้ไขสิทธิ์ไม่สำเร็จ",
    fil: "Nabigong baguhin ang permission.",
    vi: "Cập nhật quyền hạn thất bại.",
  },
  "staff.matrix.resetError": {
    id: "Gagal reset.",
    en: "Failed to reset.",
    ms: "Gagal reset.",
    th: "รีเซ็ตไม่สำเร็จ",
    fil: "Nabigong i-reset.",
    vi: "Đặt lại thất bại.",
  },
  "staff.void.failedPrefix": { id: "Gagal: ", en: "Failed: ", ms: "Gagal: ", th: "ล้มเหลว: ", fil: "Nabigo: ", vi: "Thất bại: " },
  "staff.void.pendingMsg": {
    id: "Permintaan void dikirim, menunggu persetujuan owner/manager.",
    en: "Void request sent, waiting for owner/manager approval.",
    ms: "Permintaan void dihantar, menunggu kelulusan owner/manager.",
    th: "ส่งคำขอ void แล้ว กำลังรอการอนุมัติจาก owner/manager",
    fil: "Naipadala ang void request, hinihintay ang approval ng owner/manager.",
    vi: "Đã gửi yêu cầu void, đang chờ owner/manager phê duyệt.",
  },
  "staff.void.successMsg": {
    id: "Order berhasil dibatalkan langsung (jurnal & stok sudah disesuaikan).",
    en: "Order was cancelled directly (journal & stock already adjusted).",
    ms: "Pesanan berjaya dibatalkan terus (jurnal & stok telah diselaraskan).",
    th: "ยกเลิกคำสั่งซื้อโดยตรงสำเร็จ (ปรับสมุดบัญชีและสต็อกแล้ว)",
    fil: "Matagumpay na na-cancel agad ang order (na-adjust na ang journal at stock).",
    vi: "Đơn hàng đã được hủy trực tiếp (sổ nhật ký & tồn kho đã được điều chỉnh).",
  },

  // --- Void / cancel order card ---
  "staff.void.title": { id: "Ajukan Void / Batalkan Order", en: "Submit Void / Cancel Order", ms: "Ajukan Void / Batalkan Pesanan", th: "ส่งคำขอ Void / ยกเลิกคำสั่งซื้อ", fil: "Mag-request ng Void / Ikansela ang Order", vi: "Gửi yêu cầu Void / Hủy đơn hàng" },
  "staff.void.directPermissionNote": {
    id: "Role kamu bisa void langsung tanpa approval.",
    en: "Your role can void directly without approval.",
    ms: "Peranan anda boleh void terus tanpa kelulusan.",
    th: "บทบาทของคุณสามารถ void ได้โดยตรงโดยไม่ต้องขออนุมัติ",
    fil: "Ang role mo ay puwedeng mag-void agad nang walang approval.",
    vi: "Vai trò của bạn có thể void trực tiếp mà không cần phê duyệt.",
  },
  "staff.void.needApprovalNote": {
    id: "Role kamu perlu persetujuan owner/manager sebelum order dibatalkan.",
    en: "Your role needs owner/manager approval before an order can be cancelled.",
    ms: "Peranan anda memerlukan kelulusan owner/manager sebelum pesanan boleh dibatalkan.",
    th: "บทบาทของคุณต้องได้รับการอนุมัติจาก owner/manager ก่อนยกเลิกคำสั่งซื้อ",
    fil: "Kailangan ng role mo ng approval ng owner/manager bago ma-cancel ang order.",
    vi: "Vai trò của bạn cần owner/manager phê duyệt trước khi hủy đơn hàng.",
  },
  "staff.void.orderIdPlaceholder": { id: "ID Order yang mau dibatalkan", en: "Order ID to cancel", ms: "ID Pesanan yang hendak dibatalkan", th: "รหัสคำสั่งซื้อที่ต้องการยกเลิก", fil: "ID ng Order na ikakansela", vi: "Mã đơn hàng cần hủy" },
  "staff.void.reasonPlaceholder": { id: "Alasan", en: "Reason", ms: "Sebab", th: "เหตุผล", fil: "Dahilan", vi: "Lý do" },
  "staff.void.submitBtn": { id: "Ajukan Void", en: "Submit Void", ms: "Ajukan Void", th: "ส่งคำขอ Void", fil: "I-submit ang Void", vi: "Gửi yêu cầu Void" },

  // --- Approvals list ---
  "staff.approvalsList.title": { id: "Daftar Permintaan", en: "Request List", ms: "Senarai Permintaan", th: "รายการคำขอ", fil: "Listahan ng Request", vi: "Danh sách yêu cầu" },
  "staff.approvalsList.type": { id: "Tipe", en: "Type", ms: "Jenis", th: "ประเภท", fil: "Uri", vi: "Loại" },
  "staff.approvalsList.ref": { id: "Referensi", en: "Reference", ms: "Rujukan", th: "อ้างอิง", fil: "Reference", vi: "Tham chiếu" },
  "staff.approvalsList.requestedBy": { id: "Diajukan Oleh", en: "Requested By", ms: "Diajukan Oleh", th: "ผู้ขอ", fil: "Hiniling Ni", vi: "Người yêu cầu" },
  "staff.approvalsList.reason": { id: "Alasan", en: "Reason", ms: "Sebab", th: "เหตุผล", fil: "Dahilan", vi: "Lý do" },
  "staff.approvalsList.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "staff.approvalsList.approveBtn": { id: "Setujui", en: "Approve", ms: "Luluskan", th: "อนุมัติ", fil: "Aprubahan", vi: "Duyệt" },
  "staff.approvalType.voidOrder": { id: "Batalkan Order", en: "Void Order", ms: "Batalkan Pesanan", th: "ยกเลิกออเดอร์", fil: "I-void ang Order", vi: "Hủy đơn hàng" },
  "staff.approvalType.voidItem": { id: "Batalkan Item", en: "Void Item", ms: "Batalkan Item", th: "ยกเลิกรายการ", fil: "I-void ang Item", vi: "Hủy mặt hàng" },
  "staff.approvalType.refund": { id: "Refund", en: "Refund", ms: "Bayaran Balik", th: "คืนเงิน", fil: "Refund", vi: "Hoàn tiền" },
  "staff.approvalType.discountOverride": { id: "Override Diskon", en: "Discount Override", ms: "Override Diskaun", th: "แก้ไขส่วนลดพิเศษ", fil: "Discount Override", vi: "Ghi đè giảm giá" },
  "staff.approvalType.cancelSession": { id: "Batalkan Sesi", en: "Cancel Session", ms: "Batalkan Sesi", th: "ยกเลิกเซสชัน", fil: "Kanselahin ang Session", vi: "Hủy phiên" },
  "staff.approvalType.shiftCloseReview": { id: "Review Tutup Shift (Anti-Fraud)", en: "Shift Close Review (Anti-Fraud)", ms: "Semakan Tutup Syif (Anti-Fraud)", th: "ตรวจสอบการปิดกะ (ป้องกันทุจริต)", fil: "Review sa Pagsara ng Shift (Anti-Fraud)", vi: "Xem xét đóng ca (chống gian lận)" },
  "staff.approvalType.cashTransfer": { id: "Pindah Kas", en: "Cash Transfer", ms: "Pindahan Tunai", th: "โอนเงินสด", fil: "Paglipat ng Cash", vi: "Chuyển quỹ tiền mặt" },
  "staff.approvalsList.rejectBtn": { id: "Tolak", en: "Reject", ms: "Tolak", th: "ปฏิเสธ", fil: "Tanggihan", vi: "Từ chối" },

  // --- Audit tab ---
  "staff.audit.title": { id: "Jejak Audit (Audit Log)", en: "Audit Trail (Audit Log)", ms: "Jejak Audit (Log Audit)", th: "เส้นทางการตรวจสอบ (Audit Log)", fil: "Audit Trail (Audit Log)", vi: "Nhật ký kiểm toán (Audit Log)" },
  "staff.audit.time": { id: "Waktu", en: "Time", ms: "Masa", th: "เวลา", fil: "Oras", vi: "Thời gian" },
  "staff.audit.action": { id: "Aksi", en: "Action", ms: "Tindakan", th: "การกระทำ", fil: "Aksyon", vi: "Hành động" },
  "staff.audit.entity": { id: "Entitas", en: "Entity", ms: "Entiti", th: "เอนทิตี", fil: "Entity", vi: "Đối tượng" },
  "staff.audit.detail": { id: "Detail", en: "Detail", ms: "Perincian", th: "รายละเอียด", fil: "Detalye", vi: "Chi tiết" },

  // --- Roles & permission matrix tab ---
  "staff.roles.title": { id: "Checklist Izin per Role", en: "Permission Checklist per Role", ms: "Senarai Semak Kebenaran mengikut Peranan", th: "รายการตรวจสอบสิทธิ์ตามบทบาท", fil: "Checklist ng Permission bawat Role", vi: "Danh sách quyền theo vai trò" },
  "staff.roles.description": {
    id: 'Centang untuk memberi izin, hapus centang untuk mencabut. Perubahan berlaku langsung untuk seluruh staf dengan role tersebut. Superuser dan Owner tidak bisa kehilangan izin "Kelola Staf & Role" agar tidak ada yang terkunci dari halaman ini.',
    en: 'Check to grant a permission, uncheck to revoke it. Changes apply immediately to every staff member with that role. Superuser and Owner can never lose the "Manage Staff & Roles" permission, so no one gets locked out of this page.',
    ms: 'Tandakan untuk memberi kebenaran, nyahtanda untuk menariknya balik. Perubahan berkuat kuasa serta-merta untuk semua staf dengan peranan tersebut. Superuser dan Owner tidak boleh kehilangan kebenaran "Urus Staf & Peranan" supaya tiada sesiapa terkunci daripada halaman ini.',
    th: 'ทำเครื่องหมายเพื่อให้สิทธิ์ ยกเลิกเครื่องหมายเพื่อเพิกถอน การเปลี่ยนแปลงมีผลทันทีกับพนักงานทุกคนที่มีบทบาทนั้น Superuser และ Owner จะไม่สามารถสูญเสียสิทธิ์ "จัดการพนักงานและบทบาท" ได้ เพื่อไม่ให้ใครถูกล็อกออกจากหน้านี้',
    fil: 'I-check para magbigay ng permission, i-uncheck para bawiin ito. Agad na naaapply ang mga pagbabago sa lahat ng staff na may role na iyon. Hindi puwedeng mawalan ng permission na "Pamahalaan ang Staff at Role" ang Superuser at Owner, para walang ma-lock out sa page na ito.',
    vi: 'Đánh dấu để cấp quyền, bỏ đánh dấu để thu hồi. Thay đổi có hiệu lực ngay lập tức cho toàn bộ nhân viên có vai trò đó. Superuser và Owner không bao giờ được mất quyền "Quản lý Nhân viên & Vai trò" để không ai bị khóa khỏi trang này.',
  },
  "staff.roles.loading": { id: "Memuat matriks izin…", en: "Loading permission matrix…", ms: "Memuatkan matriks kebenaran…", th: "กำลังโหลดตารางสิทธิ์…", fil: "Nilo-load ang permission matrix…", vi: "Đang tải ma trận quyền hạn…" },
  "staff.roles.permissionCol": { id: "Izin", en: "Permission", ms: "Kebenaran", th: "สิทธิ์", fil: "Permission", vi: "Quyền hạn" },
  "staff.roles.resetBtn": { id: "reset", en: "reset", ms: "reset", th: "รีเซ็ต", fil: "i-reset", vi: "đặt lại" },
  "staff.roles.lockedTitle": {
    id: "Wajib aktif agar Superuser tidak terkunci dari halaman ini.",
    en: "Must stay on so Superuser doesn't get locked out of this page.",
    ms: "Wajib kekal aktif supaya Superuser tidak terkunci daripada halaman ini.",
    th: "ต้องเปิดใช้งานเสมอ เพื่อไม่ให้ Superuser ถูกล็อกออกจากหน้านี้",
    fil: "Dapat laging naka-on para hindi ma-lock out ang Superuser sa page na ito.",
    vi: "Phải luôn bật để Superuser không bị khóa khỏi trang này.",
  },

  // --- Staff (terjemahan yang sebelumnya hilang) ---
  "staff.singleDevice.title": { id: "Keamanan login: satu akun = satu perangkat", en: "Login security: one account = one device", ms: "Keselamatan log masuk: satu akaun = satu peranti", th: "ความปลอดภัยการเข้าสู่ระบบ: หนึ่งบัญชี = หนึ่งอุปกรณ์", fil: "Seguridad ng login: isang account = isang device", vi: "Bảo mật đăng nhập: một tài khoản = một thiết bị" },
  "staff.singleDevice.onDesc": { id: "AKTIF — akun yang sedang dipakai di satu browser tidak bisa login di browser/PC lain sampai logout, {n} menit tidak dipakai, atau dikeluarkan di bawah.", en: "ON — an account in use in one browser can't log in on another browser/PC until it logs out, is idle for {n} minutes, or is signed out below.", ms: "AKTIF — akaun yang sedang digunakan dalam satu pelayar tidak boleh log masuk di pelayar/PC lain sehingga log keluar, {n} minit tidak digunakan, atau dikeluarkan di bawah.", th: "เปิด — บัญชีที่ใช้อยู่ในเบราว์เซอร์หนึ่งจะเข้าสู่ระบบในเบราว์เซอร์/PC อื่นไม่ได้ จนกว่าจะออกจากระบบ ไม่ได้ใช้งาน {n} นาที หรือถูกบังคับออกด้านล่าง", fil: "NAKA-ON — hindi makakapag-login sa ibang browser/PC ang account na ginagamit sa isang browser hanggang mag-logout, {n} minutong hindi ginamit, o i-sign out sa ibaba.", vi: "BẬT — tài khoản đang dùng trên một trình duyệt không thể đăng nhập trên trình duyệt/PC khác cho đến khi đăng xuất, không dùng {n} phút, hoặc bị buộc đăng xuất bên dưới." },
  "staff.singleDevice.offDesc": { id: "NONAKTIF — satu akun bisa login di beberapa browser/PC sekaligus.", en: "OFF — one account can log in on several browsers/PCs at once.", ms: "TIDAK AKTIF — satu akaun boleh log masuk di beberapa pelayar/PC serentak.", th: "ปิด — บัญชีเดียวเข้าสู่ระบบได้หลายเบราว์เซอร์/PC พร้อมกัน", fil: "NAKA-OFF — puwedeng mag-login ang isang account sa ilang browser/PC nang sabay.", vi: "TẮT — một tài khoản có thể đăng nhập trên nhiều trình duyệt/PC cùng lúc." },
  "staff.singleDevice.turnOff": { id: "Matikan", en: "Turn off", ms: "Matikan", th: "ปิด", fil: "I-off", vi: "Tắt" },
  "staff.singleDevice.turnOn": { id: "Aktifkan", en: "Turn on", ms: "Aktifkan", th: "เปิด", fil: "I-on", vi: "Bật" },
  "staff.table.device": { id: "Perangkat aktif", en: "Active device", ms: "Peranti aktif", th: "อุปกรณ์ที่ใช้งานอยู่", fil: "Aktibong device", vi: "Thiết bị đang dùng" },
  "staff.action.revokeSession": { id: "Keluarkan", en: "Sign out", ms: "Keluarkan", th: "บังคับออก", fil: "I-sign out", vi: "Đăng xuất" },

  // --- Teks yang sebelumnya ditulis langsung di kode (audit i18n) ---
  "staff.session.revokeSelfConfirm": { id: "Keluarkan akunmu sendiri dari perangkat ini? Kamu akan diminta login lagi.", en: "Sign your own account out of this device? You'll need to log in again.", ms: "Log keluar akaun anda sendiri daripada peranti ini? Anda perlu log masuk semula.", th: "ออกจากระบบบัญชีของคุณเองบนอุปกรณ์นี้? คุณจะต้องเข้าสู่ระบบอีกครั้ง", fil: "I-sign out ang sarili mong account sa device na ito? Kailangan mong mag-login ulit.", vi: "Đăng xuất tài khoản của chính bạn khỏi thiết bị này? Bạn sẽ phải đăng nhập lại." },
  "staff.session.revokeConfirm": { id: "Keluarkan {name} dari perangkat yang sedang dipakainya? Sesi di perangkat itu langsung berakhir dan {name} bisa login di perangkat lain.", en: "Sign {name} out of the device they're using? The session on that device ends immediately and {name} can log in on another device.", ms: "Log keluar {name} daripada peranti yang sedang digunakan? Sesi pada peranti itu tamat serta-merta dan {name} boleh log masuk pada peranti lain.", th: "ออกจากระบบ {name} จากอุปกรณ์ที่กำลังใช้อยู่? เซสชันบนอุปกรณ์นั้นจะสิ้นสุดทันที และ {name} จะเข้าสู่ระบบบนอุปกรณ์อื่นได้", fil: "I-sign out si {name} sa device na ginagamit niya? Agad matatapos ang session sa device na iyon at makakapag-login si {name} sa ibang device.", vi: "Đăng xuất {name} khỏi thiết bị đang dùng? Phiên trên thiết bị đó kết thúc ngay và {name} có thể đăng nhập trên thiết bị khác." },
  "staff.session.revokeFailed": { id: "Gagal mengeluarkan sesi.", en: "Failed to end the session.", ms: "Gagal menamatkan sesi.", th: "สิ้นสุดเซสชันไม่สำเร็จ", fil: "Hindi natapos ang session.", vi: "Không kết thúc được phiên." },
  "staff.session.singleDeviceOnConfirm": { id: "Aktifkan aturan satu akun satu perangkat? Akun yang sedang aktif di satu browser tidak bisa login di browser/PC lain sampai logout, 30 menit tidak dipakai, atau dikeluarkan dari halaman ini.", en: "Turn on the one-account-one-device rule? An account active in one browser can't log in on another browser/PC until it logs out, sits idle for 30 minutes, or is signed out from this page.", ms: "Hidupkan peraturan satu akaun satu peranti? Akaun yang aktif dalam satu pelayar tidak boleh log masuk di pelayar/PC lain sehingga log keluar, tidak digunakan 30 minit, atau dilog keluar dari halaman ini.", th: "เปิดกฎหนึ่งบัญชีหนึ่งอุปกรณ์? บัญชีที่ใช้งานอยู่ในเบราว์เซอร์หนึ่งจะเข้าสู่ระบบในเบราว์เซอร์/PC อื่นไม่ได้จนกว่าจะออกจากระบบ ไม่ได้ใช้งาน 30 นาที หรือถูกนำออกจากหน้านี้", fil: "I-on ang patakarang isang account isang device? Ang account na aktibo sa isang browser ay hindi makakapag-login sa ibang browser/PC hanggang mag-logout, 30 minutong hindi gamitin, o i-sign out mula sa pahinang ito.", vi: "Bật quy tắc một tài khoản một thiết bị? Tài khoản đang hoạt động trên một trình duyệt sẽ không đăng nhập được trên trình duyệt/PC khác cho đến khi đăng xuất, không dùng 30 phút, hoặc bị đăng xuất từ trang này." },
  "staff.session.singleDeviceOffConfirm": { id: "Matikan aturan ini? Satu akun bisa login di beberapa browser/PC sekaligus — kurang aman bila password staf bocor. Matikan hanya bila outlet memang memakai satu akun di beberapa perangkat (mis. kasir + tablet dapur).", en: "Turn this rule off? One account can then log in on several browsers/PCs at once — less safe if a staff password leaks. Only turn it off if the outlet really uses one account on several devices (e.g. cashier + kitchen tablet).", ms: "Matikan peraturan ini? Satu akaun boleh log masuk di beberapa pelayar/PC serentak — kurang selamat jika kata laluan staf bocor. Matikan hanya jika outlet memang menggunakan satu akaun pada beberapa peranti (cth. juruwang + tablet dapur).", th: "ปิดกฎนี้? บัญชีเดียวจะเข้าสู่ระบบได้หลายเบราว์เซอร์/PC พร้อมกัน ซึ่งปลอดภัยน้อยลงหากรหัสผ่านพนักงานรั่วไหล ปิดเฉพาะเมื่อร้านใช้บัญชีเดียวบนหลายอุปกรณ์จริงๆ (เช่น แคชเชียร์ + แท็บเล็ตครัว)", fil: "I-off ang patakarang ito? Makakapag-login ang isang account sa ilang browser/PC nang sabay — hindi gaanong ligtas kung ma-leak ang password ng staff. I-off lang kung talagang gumagamit ang outlet ng isang account sa ilang device (hal. cashier + tablet sa kusina).", vi: "Tắt quy tắc này? Một tài khoản có thể đăng nhập trên nhiều trình duyệt/PC cùng lúc — kém an toàn nếu lộ mật khẩu nhân viên. Chỉ tắt khi cửa hàng thật sự dùng một tài khoản trên nhiều thiết bị (vd. thu ngân + máy tính bảng bếp)." },
  "staff.session.saveFailed": { id: "Gagal menyimpan.", en: "Failed to save.", ms: "Gagal menyimpan.", th: "บันทึกไม่สำเร็จ", fil: "Hindi na-save.", vi: "Lưu thất bại." },
  "staff.session.justNow": { id: "baru saja", en: "just now", ms: "baru sahaja", th: "เมื่อสักครู่", fil: "ngayon lang", vi: "vừa xong" },
  "staff.session.minutesAgo": { id: "{n} menit lalu", en: "{n} min ago", ms: "{n} minit lalu", th: "{n} นาทีที่แล้ว", fil: "{n} minuto na ang nakalipas", vi: "{n} phút trước" },
  "staff.session.hoursAgo": { id: "{n} jam lalu", en: "{n} h ago", ms: "{n} jam lalu", th: "{n} ชั่วโมงที่แล้ว", fil: "{n} oras na ang nakalipas", vi: "{n} giờ trước" },
  "staff.session.device": { id: "Perangkat", en: "Device", ms: "Peranti", th: "อุปกรณ์", fil: "Device", vi: "Thiết bị" },
  "staff.session.you": { id: "(kamu)", en: "(you)", ms: "(anda)", th: "(คุณ)", fil: "(ikaw)", vi: "(bạn)" },
  "staff.session.activeAgo": { id: "aktif {ago}", en: "active {ago}", ms: "aktif {ago}", th: "ใช้งาน {ago}", fil: "aktibo {ago}", vi: "hoạt động {ago}" },
  "staff.session.inactiveSince": { id: "tidak aktif sejak {ago}", en: "inactive since {ago}", ms: "tidak aktif sejak {ago}", th: "ไม่ได้ใช้งานตั้งแต่ {ago}", fil: "hindi aktibo mula {ago}", vi: "không hoạt động từ {ago}" },

  // --- Role, grup izin & label izin (lib/auth/permissions.ts) ---
  "staff.permGroup.general": { id: "Umum", en: "General", ms: "Umum", th: "ทั่วไป", fil: "Pangkalahatan", vi: "Chung" },
  "staff.permGroup.cashier": { id: "Kasir & Transaksi", en: "Cashier & Transactions", ms: "Juruwang & Transaksi", th: "แคชเชียร์และธุรกรรม", fil: "Cashier at Transaksyon", vi: "Thu ngân & Giao dịch" },
  "staff.permGroup.otherIncome": { id: "Pendapatan Lain-lain", en: "Other Income", ms: "Pendapatan Lain-lain", th: "รายได้อื่น", fil: "Iba pang Kita", vi: "Thu nhập khác" },
  "staff.permGroup.marketplace": { id: "Marketplace Antar-Outlet", en: "Inter-Outlet Marketplace", ms: "Pasaran Antara Outlet", th: "ตลาดซื้อขายระหว่างร้าน", fil: "Marketplace sa Pagitan ng mga Outlet", vi: "Chợ giữa các cửa hàng" },
  "staff.permGroup.cashDeposit": { id: "Setoran Kas", en: "Cash Deposits", ms: "Setoran Tunai", th: "การนำส่งเงินสด", fil: "Cash Deposit", vi: "Nộp tiền mặt" },
  "staff.permGroup.homeRental": { id: "Home Rental (Sewa Dibawa Pulang)", en: "Home Rental (Take-Home Rentals)", ms: "Sewa Bawa Pulang", th: "เช่ากลับบ้าน", fil: "Home Rental (Renta na Iuuwi)", vi: "Thuê mang về nhà" },
  "staff.permGroup.inventory": { id: "Inventori & Harga", en: "Inventory & Pricing", ms: "Inventori & Harga", th: "สินค้าคงคลังและราคา", fil: "Imbentaryo at Presyo", vi: "Kho hàng & Giá" },
  "staff.permGroup.accounting": { id: "Accounting & Keuangan", en: "Accounting & Finance", ms: "Perakaunan & Kewangan", th: "บัญชีและการเงิน", fil: "Accounting at Pananalapi", vi: "Kế toán & Tài chính" },
  "staff.permGroup.reports": { id: "Laporan & Perangkat", en: "Reports & Devices", ms: "Laporan & Peranti", th: "รายงานและอุปกรณ์", fil: "Mga Ulat at Device", vi: "Báo cáo & Thiết bị" },
  "staff.permission.viewDashboardOwner": { id: "Lihat Dashboard Owner (ringkasan bisnis)", en: "View Owner Dashboard (business summary)", ms: "Lihat Papan Pemuka Pemilik (ringkasan perniagaan)", th: "ดูแดชบอร์ดเจ้าของ (สรุปธุรกิจ)", fil: "Tingnan ang Owner Dashboard (buod ng negosyo)", vi: "Xem Bảng điều khiển chủ (tóm tắt kinh doanh)" },
  "staff.permission.manageStaff": { id: "Kelola Staf & Role", en: "Manage Staff & Roles", ms: "Urus Staf & Peranan", th: "จัดการพนักงานและบทบาท", fil: "Pamahalaan ang Staff at Role", vi: "Quản lý nhân viên & vai trò" },
  "staff.permission.viewAccounting": { id: "Lihat Accounting (jurnal, laporan keuangan)", en: "View Accounting (journals, financial statements)", ms: "Lihat Perakaunan (jurnal, penyata kewangan)", th: "ดูบัญชี (สมุดรายวัน งบการเงิน)", fil: "Tingnan ang Accounting (journal, financial statements)", vi: "Xem Kế toán (bút toán, báo cáo tài chính)" },
  "staff.permission.postManualJournal": { id: "Input Jurnal Manual", en: "Post Manual Journals", ms: "Masukkan Jurnal Manual", th: "บันทึกรายการบัญชีด้วยตนเอง", fil: "Mag-post ng Manual Journal", vi: "Nhập bút toán thủ công" },
  "staff.permission.voidOrderDirect": { id: "Void Order Langsung (tanpa approval)", en: "Void Orders Directly (no approval)", ms: "Batal Pesanan Terus (tanpa kelulusan)", th: "ยกเลิกออเดอร์ได้ทันที (ไม่ต้องอนุมัติ)", fil: "Direktang Mag-void ng Order (walang approval)", vi: "Hủy đơn trực tiếp (không cần duyệt)" },
  "staff.permission.refundOrder": { id: "Refund Order Langsung (tanpa approval)", en: "Refund Orders Directly (no approval)", ms: "Bayar Balik Pesanan Terus (tanpa kelulusan)", th: "คืนเงินออเดอร์ได้ทันที (ไม่ต้องอนุมัติ)", fil: "Direktang Mag-refund ng Order (walang approval)", vi: "Hoàn tiền đơn trực tiếp (không cần duyệt)" },
  "staff.permission.approveRequests": { id: "Setujui/Tolak Permintaan Approval", en: "Approve/Reject Approval Requests", ms: "Luluskan/Tolak Permintaan Kelulusan", th: "อนุมัติ/ปฏิเสธคำขออนุมัติ", fil: "Aprubahan/Tanggihan ang mga Kahilingan sa Approval", vi: "Duyệt/Từ chối yêu cầu phê duyệt" },
  "staff.permission.managePricingPromo": { id: "Kelola Harga & Promo", en: "Manage Pricing & Promos", ms: "Urus Harga & Promosi", th: "จัดการราคาและโปรโมชัน", fil: "Pamahalaan ang Presyo at Promo", vi: "Quản lý giá & khuyến mãi" },
  "staff.permission.manageInventoryPurchasing": { id: "Kelola Inventori & Pembelian", en: "Manage Inventory & Purchasing", ms: "Urus Inventori & Pembelian", th: "จัดการสินค้าคงคลังและการจัดซื้อ", fil: "Pamahalaan ang Imbentaryo at Pagbili", vi: "Quản lý kho & mua hàng" },
  "staff.permission.manageSupplierPurchaseHistory": { id: "Lihat/Edit/Hapus Riwayat Belanja Supplier", en: "View/Edit/Delete Supplier Purchase History", ms: "Lihat/Sunting/Padam Sejarah Pembelian Pembekal", th: "ดู/แก้ไข/ลบประวัติการซื้อจากซัพพลายเออร์", fil: "Tingnan/I-edit/Burahin ang Kasaysayan ng Pagbili sa Supplier", vi: "Xem/Sửa/Xóa lịch sử mua hàng nhà cung cấp" },
  "staff.permission.permanentlyDeletePurchaseHistory": { id: "Hapus Permanen Riwayat Belanja Supplier (termasuk jurnal, tidak bisa dikembalikan)", en: "Permanently Delete Supplier Purchase History (incl. journals, cannot be undone)", ms: "Padam Kekal Sejarah Pembelian Pembekal (termasuk jurnal, tidak boleh dipulihkan)", th: "ลบประวัติการซื้อจากซัพพลายเออร์ถาวร (รวมรายการบัญชี กู้คืนไม่ได้)", fil: "Permanenteng Burahin ang Kasaysayan ng Pagbili sa Supplier (kasama ang journal, hindi na maibabalik)", vi: "Xóa vĩnh viễn lịch sử mua hàng nhà cung cấp (gồm bút toán, không thể hoàn tác)" },
  "staff.permission.viewReports": { id: "Lihat Laporan", en: "View Reports", ms: "Lihat Laporan", th: "ดูรายงาน", fil: "Tingnan ang mga Ulat", vi: "Xem báo cáo" },
  "staff.permission.manageDevices": { id: "Kontrol Perangkat", en: "Device Control", ms: "Kawalan Peranti", th: "ควบคุมอุปกรณ์", fil: "Kontrol ng Device", vi: "Điều khiển thiết bị" },
  "staff.permission.kitchenDisplay": { id: "Akses Kitchen Display", en: "Access Kitchen Display", ms: "Akses Paparan Dapur", th: "เข้าถึงจอแสดงผลครัว", fil: "Access sa Kitchen Display", vi: "Truy cập màn hình bếp" },
  "staff.permission.manageAdminData": { id: "Akses Panel Admin Data", en: "Access Data Admin Panel", ms: "Akses Panel Pentadbir Data", th: "เข้าถึงแผงผู้ดูแลข้อมูล", fil: "Access sa Data Admin Panel", vi: "Truy cập bảng quản trị dữ liệu" },
  "staff.permission.manageExpenses": { id: "Kelola Expense (buat/bayar di bawah ambang batas)", en: "Manage Expenses (create/pay below the threshold)", ms: "Urus Perbelanjaan (buat/bayar di bawah had)", th: "จัดการค่าใช้จ่าย (สร้าง/จ่ายต่ำกว่าเกณฑ์)", fil: "Pamahalaan ang Gastos (gumawa/magbayad sa ilalim ng threshold)", vi: "Quản lý chi phí (tạo/chi dưới ngưỡng)" },
  "staff.permission.approveExpenses": { id: "Setujui Expense di Atas Ambang Batas", en: "Approve Expenses Above the Threshold", ms: "Luluskan Perbelanjaan Melebihi Had", th: "อนุมัติค่าใช้จ่ายที่เกินเกณฑ์", fil: "Aprubahan ang Gastos na Lampas sa Threshold", vi: "Duyệt chi phí vượt ngưỡng" },
  "staff.permission.voidExpense": { id: "Batalkan Expense yang Sudah Diposting", en: "Void Posted Expenses", ms: "Batalkan Perbelanjaan yang Telah Dibukukan", th: "ยกเลิกค่าใช้จ่ายที่บันทึกบัญชีแล้ว", fil: "I-void ang Gastos na Naka-post na", vi: "Hủy chi phí đã ghi sổ" },
  "staff.permission.manageAssets": { id: "Kelola Aset Tetap & Penyusutan", en: "Manage Fixed Assets & Depreciation", ms: "Urus Aset Tetap & Susut Nilai", th: "จัดการสินทรัพย์ถาวรและค่าเสื่อมราคา", fil: "Pamahalaan ang Fixed Assets at Depreciation", vi: "Quản lý tài sản cố định & khấu hao" },
  "staff.permission.manageSettings": { id: "Kelola Pengaturan Outlet", en: "Manage Outlet Settings", ms: "Urus Tetapan Outlet", th: "จัดการการตั้งค่าร้าน", fil: "Pamahalaan ang Settings ng Outlet", vi: "Quản lý cài đặt cửa hàng" },
  "staff.permission.manageBookings": { id: "Kelola Booking", en: "Manage Bookings", ms: "Urus Tempahan", th: "จัดการการจอง", fil: "Pamahalaan ang mga Booking", vi: "Quản lý đặt chỗ" },
  "staff.permission.managePpob": { id: "Kelola Transaksi PPOB", en: "Manage Bill Payment (PPOB) Transactions", ms: "Urus Transaksi Bayaran Bil (PPOB)", th: "จัดการธุรกรรมชำระบิล (PPOB)", fil: "Pamahalaan ang mga Transaksyon sa Bills Payment (PPOB)", vi: "Quản lý giao dịch thanh toán hóa đơn (PPOB)" },
  "staff.permission.manageCoa": { id: "Kelola Chart of Accounts & Account Mapping", en: "Manage Chart of Accounts & Account Mapping", ms: "Urus Carta Akaun & Pemetaan Akaun", th: "จัดการผังบัญชีและการจับคู่บัญชี", fil: "Pamahalaan ang Chart of Accounts at Account Mapping", vi: "Quản lý hệ thống tài khoản & ánh xạ tài khoản" },
  "staff.permission.manageOtherIncome": { id: "Catat/Void Pendapatan Lain-lain", en: "Record/Void Other Income", ms: "Rekod/Batal Pendapatan Lain-lain", th: "บันทึก/ยกเลิกรายได้อื่น", fil: "Itala/I-void ang Iba pang Kita", vi: "Ghi/Hủy thu nhập khác" },
  "staff.permission.manageHomeRental": { id: "Operasikan Home Rental (Booking, Checkout, Return, Katalog)", en: "Operate Home Rental (Booking, Checkout, Return, Catalog)", ms: "Kendalikan Sewa Bawa Pulang (Tempahan, Daftar Keluar, Pemulangan, Katalog)", th: "ดำเนินงานเช่ากลับบ้าน (จอง เช็กเอาต์ คืน แคตตาล็อก)", fil: "Patakbuhin ang Home Rental (Booking, Checkout, Return, Catalog)", vi: "Vận hành thuê mang về (Đặt chỗ, Giao, Trả, Danh mục)" },
  "staff.permission.manageFeatureFlags": { id: "Kelola Feature Management (aktif/nonaktifkan modul)", en: "Manage Feature Management (enable/disable modules)", ms: "Urus Pengurusan Ciri (aktif/nyahaktif modul)", th: "จัดการฟีเจอร์ (เปิด/ปิดโมดูล)", fil: "Pamahalaan ang Feature Management (i-on/i-off ang mga module)", vi: "Quản lý tính năng (bật/tắt mô-đun)" },
  "staff.permission.manageMembership": { id: "Jual/Perpanjang Keanggotaan (terima pembayaran)", en: "Sell/Renew Memberships (collect payment)", ms: "Jual/Perbaharui Keahlian (terima bayaran)", th: "ขาย/ต่ออายุสมาชิก (รับชำระเงิน)", fil: "Magbenta/Mag-renew ng Membership (tumanggap ng bayad)", vi: "Bán/Gia hạn thành viên (thu tiền)" },
  "staff.permission.manageMarketplace": { id: "Jual/Beli di Marketplace Antar-Outlet", en: "Buy/Sell on the Inter-Outlet Marketplace", ms: "Jual/Beli di Pasaran Antara Outlet", th: "ซื้อ/ขายในตลาดระหว่างร้าน", fil: "Bumili/Magbenta sa Inter-Outlet Marketplace", vi: "Mua/Bán trên chợ giữa các cửa hàng" },
  "staff.permission.manageCashDeposit": { id: "Catat Setoran Kas (Kas Besar/Saldo Deposit/Kas Kecil/Prive/Dividen)", en: "Record Cash Deposits (Main Cash/Deposit Balance/Petty Cash/Owner Drawings/Dividends)", ms: "Rekod Setoran Tunai (Tunai Utama/Baki Deposit/Tunai Runcit/Ambilan Pemilik/Dividen)", th: "บันทึกการนำส่งเงินสด (เงินสดหลัก/ยอดเงินฝาก/เงินสดย่อย/เงินถอนเจ้าของ/เงินปันผล)", fil: "Itala ang Cash Deposit (Main Cash/Deposit Balance/Petty Cash/Owner Drawings/Dividends)", vi: "Ghi nộp tiền mặt (Quỹ chính/Số dư ký quỹ/Quỹ lặt vặt/Rút vốn chủ/Cổ tức)" },
  "staff.permission.voidCashDeposit": { id: "Batalkan Setoran Kas yang Sudah Diposting", en: "Void Posted Cash Deposits", ms: "Batalkan Setoran Tunai yang Telah Dibukukan", th: "ยกเลิกการนำส่งเงินสดที่บันทึกบัญชีแล้ว", fil: "I-void ang Cash Deposit na Naka-post na", vi: "Hủy khoản nộp tiền đã ghi sổ" },
  "staff.permission.closePeriod": { id: "Tutup Periode Akuntansi (Kunci Bulan)", en: "Close Accounting Periods (Lock Month)", ms: "Tutup Tempoh Perakaunan (Kunci Bulan)", th: "ปิดงวดบัญชี (ล็อกเดือน)", fil: "Isara ang Accounting Period (I-lock ang Buwan)", vi: "Khóa kỳ kế toán (Khóa tháng)" },
  "staff.permission.reopenPeriod": { id: "Buka Kembali Periode Akuntansi yang Sudah Ditutup", en: "Reopen Closed Accounting Periods", ms: "Buka Semula Tempoh Perakaunan yang Telah Ditutup", th: "เปิดงวดบัญชีที่ปิดแล้วอีกครั้ง", fil: "Muling Buksan ang Saradong Accounting Period", vi: "Mở lại kỳ kế toán đã khóa" },
});
