import { registerDict } from "./registry";

/**
 * Translations for /dashboard/semua-outlet — the cross-outlet summary + branch management hub
 * shown to accounts linked to more than one outlet. Registered as a side effect on import.
 */
registerDict({
  // --- Page header ---
  "semuaOutlet.title": { id: "Ringkasan Semua Outlet", en: "All Outlets Summary", ms: "Ringkasan Semua Outlet", th: "สรุปทุกสาขา", fil: "Buod ng Lahat ng Outlet", vi: "Tổng quan tất cả chi nhánh" },
  "semuaOutlet.subtitle": { id: "Performa tiap cabang yang terhubung ke akun Anda, berdampingan.", en: "Performance of every branch linked to your account, side by side.", ms: "Prestasi setiap cawangan yang berkaitan dengan akaun anda, berdampingan.", th: "ผลการดำเนินงานของแต่ละสาขาที่เชื่อมโยงกับบัญชีของคุณ เปรียบเทียบกัน", fil: "Performance ng bawat branch na naka-link sa account mo, magkatabi.", vi: "Hiệu suất của từng chi nhánh liên kết với tài khoản của bạn, đặt cạnh nhau." },
  "semuaOutlet.addOutlet": { id: "Tambah Outlet", en: "Add Outlet", ms: "Tambah Outlet", th: "เพิ่มสาขา", fil: "Magdagdag ng Outlet", vi: "Thêm chi nhánh" },

  // --- Add outlet form ---
  "semuaOutlet.addNewTitle": { id: "Tambah Outlet/Cabang Baru", en: "Add a New Outlet/Branch", ms: "Tambah Outlet/Cawangan Baharu", th: "เพิ่มสาขาใหม่", fil: "Magdagdag ng Bagong Outlet/Branch", vi: "Thêm chi nhánh mới" },
  "semuaOutlet.branchName": { id: "Nama Cabang", en: "Branch Name", ms: "Nama Cawangan", th: "ชื่อสาขา", fil: "Pangalan ng Branch", vi: "Tên chi nhánh" },
  "semuaOutlet.addressOptional": { id: "Alamat (opsional)", en: "Address (optional)", ms: "Alamat (pilihan)", th: "ที่อยู่ (ไม่บังคับ)", fil: "Address (opsyonal)", vi: "Địa chỉ (tùy chọn)" },
  "semuaOutlet.phoneOptional": { id: "Telepon (opsional)", en: "Phone (optional)", ms: "Telefon (pilihan)", th: "เบอร์โทร (ไม่บังคับ)", fil: "Telepono (opsyonal)", vi: "Số điện thoại (tùy chọn)" },
  "semuaOutlet.adding": { id: "Menambahkan...", en: "Adding...", ms: "Menambah...", th: "กำลังเพิ่ม...", fil: "Idinaragdag...", vi: "Đang thêm..." },
  "semuaOutlet.addOutletBtn": { id: "Tambah Outlet", en: "Add Outlet", ms: "Tambah Outlet", th: "เพิ่มสาขา", fil: "Magdagdag ng Outlet", vi: "Thêm chi nhánh" },
  "semuaOutlet.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },

  // --- Loading / empty states ---
  "semuaOutlet.loading": { id: "Memuat…", en: "Loading…", ms: "Memuatkan…", th: "กำลังโหลด…", fil: "Nilo-load…", vi: "Đang tải…" },
  "semuaOutlet.noOutlets": { id: "Belum ada outlet terhubung ke akun ini.", en: "No outlets are linked to this account yet.", ms: "Tiada outlet yang berkaitan dengan akaun ini lagi.", th: "ยังไม่มีสาขาที่เชื่อมโยงกับบัญชีนี้", fil: "Wala pang outlet na naka-link sa account na ito.", vi: "Chưa có chi nhánh nào liên kết với tài khoản này." },

  // --- Total omzet card ---
  "semuaOutlet.totalOmzetToday": { id: "Total Omzet Hari Ini ({n} outlet aktif)", en: "Today's Total Revenue ({n} active outlets)", ms: "Jumlah Hasil Hari Ini ({n} outlet aktif)", th: "รายได้รวมวันนี้ ({n} สาขาที่ใช้งาน)", fil: "Kabuuang Kita Ngayong Araw ({n} aktibong outlet)", vi: "Tổng doanh thu hôm nay ({n} chi nhánh hoạt động)" },

  // --- Outlet card ---
  "semuaOutlet.mainOutlet": { id: "Outlet utama", en: "Main outlet", ms: "Outlet utama", th: "สาขาหลัก", fil: "Pangunahing outlet", vi: "Chi nhánh chính" },
  "semuaOutlet.omzetToday": { id: "Omzet Hari Ini", en: "Today's Revenue", ms: "Hasil Hari Ini", th: "รายได้วันนี้", fil: "Kita Ngayong Araw", vi: "Doanh thu hôm nay" },
  "semuaOutlet.unitPs": { id: "Unit PS", en: "PS Units", ms: "Unit PS", th: "เครื่อง PS", fil: "Unit ng PS", vi: "Máy PS" },
  "semuaOutlet.availableOfTotal": { id: "{available} tersedia / {total} total", en: "{available} available / {total} total", ms: "{available} tersedia / {total} jumlah", th: "ว่าง {available} / รวม {total}", fil: "{available} available / {total} kabuuan", vi: "{available} còn trống / {total} tổng" },
  "semuaOutlet.playing": { id: "main", en: "in use", ms: "digunakan", th: "กำลังใช้งาน", fil: "ginagamit", vi: "đang chơi" },
  "semuaOutlet.billedTogether": { id: "Ditagih bersama dalam satu invoice grup.", en: "Billed together on one group invoice.", ms: "Dibil bersama dalam satu invois kumpulan.", th: "เรียกเก็บเงินร่วมกันในใบแจ้งหนี้กลุ่มเดียว", fil: "Sama-samang binibilling sa isang group invoice.", vi: "Được tính chung trong một hóa đơn nhóm." },

  "semuaOutlet.opening": { id: "Membuka…", en: "Opening…", ms: "Membuka…", th: "กำลังเปิด…", fil: "Binubuksan…", vi: "Đang mở…" },
  "semuaOutlet.openDashboard": { id: "Buka Dashboard Outlet Ini →", en: "Open This Outlet's Dashboard →", ms: "Buka Dashboard Outlet Ini →", th: "เปิดแดชบอร์ดสาขานี้ →", fil: "Buksan ang Dashboard ng Outlet na Ito →", vi: "Mở bảng điều khiển chi nhánh này →" },
  "semuaOutlet.editOutletTitle": { id: "Edit outlet", en: "Edit outlet", ms: "Edit outlet", th: "แก้ไขสาขา", fil: "I-edit ang outlet", vi: "Sửa chi nhánh" },
  "semuaOutlet.deactivateOutletTitle": { id: "Nonaktifkan outlet", en: "Deactivate outlet", ms: "Nyahaktifkan outlet", th: "ปิดใช้งานสาขา", fil: "I-deactivate ang outlet", vi: "Vô hiệu hóa chi nhánh" },

  // --- Edit form ---
  "semuaOutlet.saving": { id: "Menyimpan...", en: "Saving...", ms: "Menyimpan...", th: "กำลังบันทึก...", fil: "Sine-save...", vi: "Đang lưu..." },
  "semuaOutlet.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },

  // --- Archived section ---
  "semuaOutlet.hide": { id: "Sembunyikan", en: "Hide", ms: "Sembunyikan", th: "ซ่อน", fil: "Itago", vi: "Ẩn" },
  "semuaOutlet.view": { id: "Lihat", en: "View", ms: "Lihat", th: "ดู", fil: "Tingnan", vi: "Xem" },
  "semuaOutlet.deactivatedOutletsCount": { id: "outlet dinonaktifkan ({n})", en: "deactivated outlets ({n})", ms: "outlet dinyahaktifkan ({n})", th: "สาขาที่ปิดใช้งาน ({n})", fil: "na-deactivate na outlet ({n})", vi: "chi nhánh đã vô hiệu hóa ({n})" },
  "semuaOutlet.archivedOutletsHeading": { id: "Outlet Dinonaktifkan (Arsip)", en: "Deactivated Outlets (Archive)", ms: "Outlet Dinyahaktifkan (Arkib)", th: "สาขาที่ปิดใช้งาน (คลังเก็บ)", fil: "Mga Naka-deactivate na Outlet (Archive)", vi: "Chi nhánh đã vô hiệu hóa (Lưu trữ)" },
  "semuaOutlet.inactive": { id: "Nonaktif", en: "Inactive", ms: "Tidak Aktif", th: "ปิดใช้งาน", fil: "Hindi Aktibo", vi: "Không hoạt động" },
  "semuaOutlet.processing": { id: "Memproses…", en: "Processing…", ms: "Memproses…", th: "กำลังดำเนินการ…", fil: "Pinoproseso…", vi: "Đang xử lý…" },
  "semuaOutlet.reactivate": { id: "Aktifkan Kembali", en: "Reactivate", ms: "Aktifkan Semula", th: "เปิดใช้งานอีกครั้ง", fil: "I-reactivate", vi: "Kích hoạt lại" },
  "semuaOutlet.deletePermanentTitle": { id: "Hapus permanen", en: "Delete permanently", ms: "Padam kekal", th: "ลบถาวร", fil: "Permanenteng burahin", vi: "Xóa vĩnh viễn" },

  // --- Delete confirmation panel ---
  "semuaOutlet.deletePermanentHeading": { id: "Hapus Permanen \"{name}\" — tidak bisa dibatalkan.", en: "Permanently Delete \"{name}\" — cannot be undone.", ms: "Padam Kekal \"{name}\" — tidak boleh dibatalkan.", th: "ลบถาวร \"{name}\" — ไม่สามารถยกเลิกได้", fil: "Permanenteng Burahin \"{name}\" — hindi na maibabalik.", vi: "Xóa vĩnh viễn \"{name}\" — không thể hoàn tác." },
  "semuaOutlet.typeExactName": { id: "Ketik persis nama outlet:", en: "Type the exact outlet name:", ms: "Taip nama outlet dengan tepat:", th: "พิมพ์ชื่อสาขาให้ตรงกัน:", fil: "I-type ang eksaktong pangalan ng outlet:", vi: "Nhập chính xác tên chi nhánh:" },
  "semuaOutlet.yourPasswordConfirm": { id: "Password kamu (konfirmasi ulang)", en: "Your password (re-confirm)", ms: "Kata laluan anda (sahkan semula)", th: "รหัสผ่านของคุณ (ยืนยันอีกครั้ง)", fil: "Password mo (kumpirmahin muli)", vi: "Mật khẩu của bạn (xác nhận lại)" },
  "semuaOutlet.deleting": { id: "Menghapus...", en: "Deleting...", ms: "Memadam...", th: "กำลังลบ...", fil: "Binubura...", vi: "Đang xóa..." },
  "semuaOutlet.deletePermanentNow": { id: "Hapus Permanen Sekarang", en: "Delete Permanently Now", ms: "Padam Kekal Sekarang", th: "ลบถาวรตอนนี้", fil: "Permanenteng Burahin Ngayon", vi: "Xóa vĩnh viễn ngay" },

  // --- Status labels (subscriptionStatus) ---
  "semuaOutlet.status.active": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งานอยู่", fil: "Aktibo", vi: "Đang hoạt động" },
  "semuaOutlet.status.grace": { id: "Tenggang", en: "Grace Period", ms: "Tempoh Tenggang", th: "ช่วงผ่อนผัน", fil: "Grace Period", vi: "Thời gian gia hạn" },
  "semuaOutlet.status.trial": { id: "Trial", en: "Trial", ms: "Percubaan", th: "ทดลองใช้", fil: "Trial", vi: "Dùng thử" },
  "semuaOutlet.status.trialExpired": { id: "Trial Habis", en: "Trial Expired", ms: "Percubaan Tamat", th: "หมดเวลาทดลองใช้", fil: "Tapos na ang Trial", vi: "Hết hạn dùng thử" },
  "semuaOutlet.status.suspended": { id: "Suspend", en: "Suspended", ms: "Digantung", th: "ระงับใช้งาน", fil: "Suspended", vi: "Tạm ngưng" },
  "semuaOutlet.status.cancelled": { id: "Batal", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิกแล้ว", fil: "Kinansela", vi: "Đã hủy" },
  "semuaOutlet.status.pendingPayment": { id: "Menunggu Bayar", en: "Awaiting Payment", ms: "Menunggu Bayaran", th: "รอการชำระเงิน", fil: "Naghihintay ng Bayad", vi: "Chờ thanh toán" },

  // --- Dialog / alert strings (showAlert / showConfirm) ---
  "semuaOutlet.branchNameRequired": { id: "Nama cabang wajib diisi.", en: "Branch name is required.", ms: "Nama cawangan wajib diisi.", th: "กรุณากรอกชื่อสาขา", fil: "Kinakailangan ang pangalan ng branch.", vi: "Vui lòng nhập tên chi nhánh." },
  "semuaOutlet.confirmDeactivate": { id: "Nonaktifkan \"{name}\"? Outlet ini akan disembunyikan & tidak bisa dipakai transaksi baru — data historisnya tetap aman dan bisa diaktifkan lagi kapan saja.", en: "Deactivate \"{name}\"? This outlet will be hidden and can't be used for new transactions — its historical data stays safe and it can be reactivated anytime.", ms: "Nyahaktifkan \"{name}\"? Outlet ini akan disembunyikan & tidak boleh digunakan untuk transaksi baharu — data sejarahnya tetap selamat dan boleh diaktifkan semula bila-bila masa.", th: "ปิดใช้งาน \"{name}\" หรือไม่? สาขานี้จะถูกซ่อนและไม่สามารถใช้ทำธุรกรรมใหม่ได้ — ข้อมูลย้อนหลังยังคงปลอดภัยและสามารถเปิดใช้งานใหม่ได้ทุกเมื่อ", fil: "I-deactivate ang \"{name}\"? Itatago ang outlet na ito at hindi na magagamit para sa bagong transaksyon — ligtas pa rin ang historical data nito at pwedeng i-reactivate anumang oras.", vi: "Vô hiệu hóa \"{name}\"? Chi nhánh này sẽ bị ẩn và không thể dùng cho giao dịch mới — dữ liệu lịch sử vẫn an toàn và có thể kích hoạt lại bất cứ lúc nào." },
  "semuaOutlet.confirmReactivate": { id: "Aktifkan kembali \"{name}\"?", en: "Reactivate \"{name}\"?", ms: "Aktifkan semula \"{name}\"?", th: "เปิดใช้งาน \"{name}\" อีกครั้งหรือไม่?", fil: "I-reactivate ang \"{name}\"?", vi: "Kích hoạt lại \"{name}\"?" },
  "semuaOutlet.retypeExactName": { id: "Ketik ulang persis nama outlet: \"{name}\"", en: "Retype the exact outlet name: \"{name}\"", ms: "Taip semula nama outlet dengan tepat: \"{name}\"", th: "พิมพ์ชื่อสาขาให้ตรงอีกครั้ง: \"{name}\"", fil: "I-type muli ang eksaktong pangalan ng outlet: \"{name}\"", vi: "Nhập lại chính xác tên chi nhánh: \"{name}\"" },
  "semuaOutlet.enterYourPassword": { id: "Masukkan password kamu.", en: "Enter your password.", ms: "Masukkan kata laluan anda.", th: "กรุณากรอกรหัสผ่านของคุณ", fil: "Ilagay ang password mo.", vi: "Vui lòng nhập mật khẩu của bạn." },
  "semuaOutlet.confirmPermanentDelete": { id: "Ini akan MENGHAPUS PERMANEN outlet \"{name}\" — semua data, staf, dan riwayatnya hilang total, tidak bisa dikembalikan lewat aplikasi. Yakin lanjut?", en: "This will PERMANENTLY DELETE the outlet \"{name}\" — all its data, staff, and history will be lost completely and cannot be restored through the app. Are you sure you want to continue?", ms: "Ini akan MEMADAM SECARA KEKAL outlet \"{name}\" — semua data, staf, dan sejarahnya hilang sepenuhnya, tidak boleh dipulihkan melalui aplikasi. Pasti mahu teruskan?", th: "การกระทำนี้จะลบสาขา \"{name}\" อย่างถาวร — ข้อมูล พนักงาน และประวัติทั้งหมดจะหายไปโดยสิ้นเชิง ไม่สามารถกู้คืนผ่านแอปได้ ยืนยันที่จะดำเนินการต่อหรือไม่?", fil: "Ito ay PERMANENTENG magbubura sa outlet na \"{name}\" — lahat ng data, staff, at history nito ay mawawala nang tuluyan, hindi na mababawi sa app. Sigurado ka bang magpapatuloy?", vi: "Thao tác này sẽ XÓA VĨNH VIỄN chi nhánh \"{name}\" — toàn bộ dữ liệu, nhân viên và lịch sử sẽ mất hoàn toàn, không thể khôi phục qua ứng dụng. Bạn có chắc muốn tiếp tục?" },
  "semuaOutlet.deletedPermanently": { id: "Outlet \"{name}\" sudah dihapus permanen.", en: "Outlet \"{name}\" has been permanently deleted.", ms: "Outlet \"{name}\" telah dipadam secara kekal.", th: "สาขา \"{name}\" ถูกลบถาวรแล้ว", fil: "Permanenteng nabura na ang outlet na \"{name}\".", vi: "Chi nhánh \"{name}\" đã bị xóa vĩnh viễn." },
});
