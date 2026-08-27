import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/other-income page — recording non-core revenue (vendor
 * commissions, asset rental/sale, sponsorships, penalties/compensation, bank interest/cashback,
 * etc.). Registered as a side effect on import; import this file once from the page module.
 */
registerDict({
  "otherIncome.title": { id: "Pendapatan Lain-lain", en: "Other Income", ms: "Pendapatan Lain", th: "รายได้อื่นๆ", fil: "Iba pang Kita", vi: "Thu nhập khác" },
  "otherIncome.subtitle": {
    id: "Uang masuk di luar penjualan Rental/F&B/PPOB/Produk — komisi vendor, sewa tempat/aset, penjualan barang bekas, sponsorship, denda/ganti rugi, bunga/cashback, dst. Setiap entri langsung terbukukan ke jurnal dan ikut diperhitungkan saat tutup shift (kalau diterima tunai atau lewat channel bersaldo).",
    en: "Money coming in outside Rental/F&B/PPOB/Product sales — vendor commissions, space/asset rental, sale of used goods, sponsorships, penalties/compensation, interest/cashback, etc. Every entry is posted straight to the journal and counted at shift close-out (if received as cash or through a balance-based channel).",
    ms: "Wang masuk selain jualan Sewa/F&B/PPOB/Produk — komisen vendor, sewa tempat/aset, jualan barang terpakai, sponsorship, denda/pampasan, faedah/cashback, dan lain-lain. Setiap entri terus dibukukan ke jurnal dan turut dikira semasa tutup syif (jika diterima tunai atau melalui saluran berbaki).",
    th: "เงินที่เข้ามานอกเหนือจากยอดขายเช่า/F&B/PPOB/สินค้า — ค่าคอมมิชชั่นตัวแทน ค่าเช่าพื้นที่/สินทรัพย์ การขายของเก่า สปอนเซอร์ ค่าปรับ/ค่าชดเชย ดอกเบี้ย/แคชแบ็ก ฯลฯ ทุกรายการจะถูกบันทึกลงบัญชีทันทีและนับรวมตอนปิดกะ (ถ้ารับเป็นเงินสดหรือผ่านช่องทางที่มียอดคงเหลือ)",
    fil: "Pera na papasok na hiwalay sa benta ng Rental/F&B/PPOB/Produkto — komisyon ng vendor, upa ng lugar/asset, benta ng gamit na segunda mano, sponsorship, multa/kompensasyon, interes/cashback, atbp. Direktang naitatala sa journal ang bawat entry at kasama ito sa pagkalkula pag-close ng shift (kung natanggap na cash o sa channel na may balanse).",
    vi: "Tiền vào ngoài doanh thu Thuê/F&B/PPOB/Sản phẩm — hoa hồng nhà cung cấp, cho thuê mặt bằng/tài sản, bán đồ cũ, tài trợ, phạt/bồi thường, lãi ngân hàng/hoàn tiền, v.v. Mỗi khoản được ghi thẳng vào sổ nhật ký và được tính khi đóng ca (nếu nhận bằng tiền mặt hoặc qua kênh có số dư).",
  },

  // --- Category labels ---
  "otherIncome.category.vendorCommission": { id: "Komisi / Kerjasama Vendor", en: "Vendor Commission / Partnership", ms: "Komisen / Kerjasama Vendor", th: "ค่าคอมมิชชั่น / ความร่วมมือกับตัวแทน", fil: "Komisyon / Partnership sa Vendor", vi: "Hoa hồng / Hợp tác nhà cung cấp" },
  "otherIncome.category.assetRental": { id: "Sewa Tempat/Aset ke Pihak Lain", en: "Renting Out Space/Assets to Others", ms: "Sewa Tempat/Aset kepada Pihak Lain", th: "ให้เช่าพื้นที่/สินทรัพย์แก่บุคคลอื่น", fil: "Pag-upa ng Lugar/Asset sa Iba", vi: "Cho thuê mặt bằng/tài sản cho bên khác" },
  "otherIncome.category.assetSale": { id: "Penjualan Aset/Barang Bekas", en: "Sale of Assets/Used Goods", ms: "Jualan Aset/Barang Terpakai", th: "ขายสินทรัพย์/ของเก่า", fil: "Benta ng Asset/Gamit na Segunda Mano", vi: "Bán tài sản/đồ cũ" },
  "otherIncome.category.sponsorship": { id: "Sponsorship / Kerjasama Event", en: "Sponsorship / Event Partnership", ms: "Sponsorship / Kerjasama Acara", th: "สปอนเซอร์ / ความร่วมมือกิจกรรม", fil: "Sponsorship / Partnership sa Event", vi: "Tài trợ / Hợp tác sự kiện" },
  "otherIncome.category.penaltyCompensation": { id: "Denda / Ganti Rugi dari Pelanggan", en: "Penalty / Compensation from Customers", ms: "Denda / Pampasan daripada Pelanggan", th: "ค่าปรับ / ค่าชดเชยจากลูกค้า", fil: "Multa / Kompensasyon mula sa Customer", vi: "Phạt / Bồi thường từ khách hàng" },
  "otherIncome.category.bankInterestCashback": { id: "Bunga Bank / Cashback / Promo", en: "Bank Interest / Cashback / Promo", ms: "Faedah Bank / Cashback / Promosi", th: "ดอกเบี้ยธนาคาร / แคชแบ็ก / โปรโมชั่น", fil: "Interes sa Bangko / Cashback / Promo", vi: "Lãi ngân hàng / Hoàn tiền / Khuyến mãi" },
  "otherIncome.category.other": { id: "Lain-lain", en: "Other", ms: "Lain-lain", th: "อื่นๆ", fil: "Iba pa", vi: "Khác" },

  // --- Summary + filters ---
  "otherIncome.totalPeriod": { id: "Total Periode Ini", en: "Total This Period", ms: "Jumlah Tempoh Ini", th: "ยอดรวมช่วงนี้", fil: "Total Ngayong Panahon", vi: "Tổng kỳ này" },
  "otherIncome.filterFrom": { id: "Dari", en: "From", ms: "Dari", th: "จาก", fil: "Mula", vi: "Từ" },
  "otherIncome.filterTo": { id: "Sampai", en: "To", ms: "Hingga", th: "ถึง", fil: "Hanggang", vi: "Đến" },
  "otherIncome.today": { id: "Hari Ini", en: "Today", ms: "Hari Ini", th: "วันนี้", fil: "Ngayong Araw", vi: "Hôm nay" },
  "otherIncome.thisMonth": { id: "Bulan Ini", en: "This Month", ms: "Bulan Ini", th: "เดือนนี้", fil: "Ngayong Buwan", vi: "Tháng này" },

  "otherIncome.noPermission": {
    id: "Role kamu tidak punya izin mencatat Pendapatan Lain-lain — hubungi Owner/Manager kalau perlu akses ini.",
    en: "Your role doesn't have permission to record Other Income — contact the Owner/Manager if you need access.",
    ms: "Peranan anda tidak mempunyai kebenaran untuk merekod Pendapatan Lain — hubungi Owner/Manager jika perlu akses ini.",
    th: "บทบาทของคุณไม่มีสิทธิ์บันทึกรายได้อื่นๆ — ติดต่อเจ้าของ/ผู้จัดการหากต้องการสิทธิ์นี้",
    fil: "Wala kang pahintulot na mag-record ng Iba pang Kita sa role mo — makipag-ugnayan sa Owner/Manager kung kailangan mo ng access na ito.",
    vi: "Vai trò của bạn không có quyền ghi nhận Thu nhập khác — liên hệ Chủ sở hữu/Quản lý nếu cần quyền truy cập này.",
  },

  // --- Table ---
  "otherIncome.table.time": { id: "Waktu", en: "Time", ms: "Masa", th: "เวลา", fil: "Oras", vi: "Thời gian" },
  "otherIncome.table.number": { id: "No.", en: "No.", ms: "No.", th: "เลขที่", fil: "Blg.", vi: "Số" },
  "otherIncome.table.category": { id: "Kategori", en: "Category", ms: "Kategori", th: "หมวดหมู่", fil: "Kategorya", vi: "Danh mục" },
  "otherIncome.table.description": { id: "Deskripsi", en: "Description", ms: "Keterangan", th: "รายละเอียด", fil: "Deskripsyon", vi: "Mô tả" },
  "otherIncome.table.from": { id: "Dari", en: "From", ms: "Dari", th: "จาก", fil: "Mula kay", vi: "Từ" },
  "otherIncome.table.amount": { id: "Nominal", en: "Amount", ms: "Jumlah", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "otherIncome.table.method": { id: "Metode", en: "Method", ms: "Kaedah", th: "วิธีการ", fil: "Paraan", vi: "Phương thức" },
  "otherIncome.table.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "otherIncome.table.action": { id: "Aksi", en: "Action", ms: "Tindakan", th: "การดำเนินการ", fil: "Aksyon", vi: "Thao tác" },
  "otherIncome.empty": {
    id: "Belum ada entri pendapatan lain-lain pada periode ini.",
    en: "No other income entries recorded for this period yet.",
    ms: "Belum ada entri pendapatan lain pada tempoh ini.",
    th: "ยังไม่มีรายการรายได้อื่นๆ ในช่วงเวลานี้",
    fil: "Wala pang entry ng iba pang kita sa panahong ito.",
    vi: "Chưa có khoản thu nhập khác nào trong kỳ này.",
  },

  // --- Status badges ---
  "otherIncome.statusPosted": { id: "Posted", en: "Posted", ms: "Posted", th: "บันทึกแล้ว", fil: "Posted", vi: "Đã ghi sổ" },
  "otherIncome.statusVoid": { id: "Void", en: "Void", ms: "Void", th: "ยกเลิก", fil: "Void", vi: "Đã hủy" },

  // --- Actions ---
  "otherIncome.voidAction": { id: "Void", en: "Void", ms: "Void", th: "ยกเลิกรายการ", fil: "I-void", vi: "Hủy" },
  "otherIncome.voidPrompt": {
    id: "Alasan void entri pendapatan lain-lain ini?",
    en: "Reason for voiding this other income entry?",
    ms: "Sebab void entri pendapatan lain ini?",
    th: "เหตุผลในการยกเลิกรายการรายได้อื่นๆ นี้?",
    fil: "Dahilan sa pag-void ng entry na ito ng iba pang kita?",
    vi: "Lý do hủy khoản thu nhập khác này?",
  },

  // --- Entry form ---
  "otherIncome.formTitle": { id: "Catat Pendapatan Lain-lain", en: "Record Other Income", ms: "Rekod Pendapatan Lain", th: "บันทึกรายได้อื่นๆ", fil: "Mag-record ng Iba pang Kita", vi: "Ghi nhận thu nhập khác" },
  "otherIncome.descriptionPlaceholder": {
    id: "Deskripsi (mis. Sewa lahan parkir ke tetangga)",
    en: "Description (e.g. Renting parking space to a neighbor)",
    ms: "Keterangan (cth. Sewa tapak letak kereta kepada jiran)",
    th: "รายละเอียด (เช่น ให้เช่าที่จอดรถแก่เพื่อนบ้าน)",
    fil: "Deskripsyon (hal. Pag-upa ng parking space sa kapitbahay)",
    vi: "Mô tả (vd. Cho hàng xóm thuê bãi đỗ xe)",
  },
  "otherIncome.payerPlaceholder": {
    id: "Diterima dari (opsional)",
    en: "Received from (optional)",
    ms: "Diterima daripada (pilihan)",
    th: "รับจาก (ไม่บังคับ)",
    fil: "Natanggap mula kay (opsyonal)",
    vi: "Nhận từ (tùy chọn)",
  },
  "otherIncome.amountPlaceholder": { id: "Nominal", en: "Amount", ms: "Jumlah", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "otherIncome.saving": { id: "Menyimpan...", en: "Saving...", ms: "Menyimpan...", th: "กำลังบันทึก...", fil: "Sinesave...", vi: "Đang lưu..." },
  "otherIncome.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "otherIncome.amountRequired": {
    id: "Nominal harus lebih dari 0.",
    en: "Amount must be greater than 0.",
    ms: "Jumlah mesti lebih daripada 0.",
    th: "จำนวนเงินต้องมากกว่า 0",
    fil: "Ang halaga ay dapat higit sa 0.",
    vi: "Số tiền phải lớn hơn 0.",
  },
});
