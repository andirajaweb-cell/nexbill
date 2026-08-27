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
});
