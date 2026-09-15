import { registerDict } from "./registry";

/**
 * Translations for /dashboard/transactions — the transaction history / order list page
 * (transaction list + filters, summary cards, detail modal, and cashier performance tab).
 * Registered as a side effect on import; import this file once from the page module before
 * any component on the page calls useDashboardLang().t().
 */
registerDict({
  // --- Page header ---
  "transactions.pageTitle": { id: "Pusat Transaksi", en: "Transaction Center", ms: "Pusat Transaksi", th: "ศูนย์ธุรกรรม", fil: "Sentro ng Transaksyon", vi: "Trung tâm giao dịch" },
  // Updated 2026-09-13 — the old copy said "PPOB akan muncul di sini setelah modulnya dibangun",
  // which is now stale/misleading: the PPOB module has long since shipped (see dashboard/ppob).
  // It was never going to grow rows in THIS table though — PPOB posts to its own ppobTransactions
  // table (lib/reports/transactions.ts), never to `orders`, so it has its own history page by
  // design, not a missing feature. The "PPOB Revenue" summary card here only ever shows the
  // aggregate admin-fee total from that table, not a per-transaction listing.
  "transactions.pageSubtitle": { id: "Seluruh transaksi Rental, F&B, dan Produk yang diinput kasir. Transaksi PPOB (pulsa/token/tagihan) punya riwayat tersendiri di menu PPOB — kartu \"PPOB Revenue\" di atas hanya menampilkan total fee admin PPOB, bukan daftar transaksinya. Hapus permanen hanya bisa dilakukan akun Owner/Superuser.", en: "All Rental, F&B, and Product transactions entered by cashiers. PPOB transactions (mobile credit/tokens/bills) have their own history under the PPOB menu — the \"PPOB Revenue\" card above only shows the total PPOB admin fee, not its transaction list. Permanent deletion is only available to Owner/Superuser accounts.", ms: "Semua transaksi Sewa, F&B, dan Produk yang dimasukkan oleh juruwang. Transaksi PPOB (kredit mudah alih/token/bil) mempunyai sejarah tersendiri di menu PPOB — kad \"PPOB Revenue\" di atas hanya memaparkan jumlah fi admin PPOB, bukan senarai transaksinya. Padam kekal hanya boleh dilakukan oleh akaun Owner/Superuser.", th: "ธุรกรรมเช่า, F&B และสินค้าทั้งหมดที่แคชเชียร์บันทึกไว้ ธุรกรรม PPOB (เติมเงิน/โทเค็น/บิล) มีประวัติของตัวเองอยู่ในเมนู PPOB — การ์ด \"PPOB Revenue\" ด้านบนแสดงเฉพาะยอดรวมค่าธรรมเนียมแอดมิน PPOB ไม่ใช่รายการธุรกรรม การลบถาวรทำได้เฉพาะบัญชี Owner/Superuser เท่านั้น", fil: "Lahat ng transaksyon sa Rental, F&B, at Produkto na inilagay ng cashier. May sariling history ang mga transaksyon sa PPOB (load/token/bayarin) sa menu ng PPOB — ang card na \"PPOB Revenue\" sa itaas ay nagpapakita lang ng kabuuang admin fee ng PPOB, hindi ang listahan ng transaksyon nito. Ang permanenteng pagbura ay para lang sa Owner/Superuser account.", vi: "Toàn bộ giao dịch Thuê, F&B và Sản phẩm do thu ngân nhập. Giao dịch PPOB (nạp tiền/thẻ/hóa đơn) có lịch sử riêng ở menu PPOB — thẻ \"PPOB Revenue\" ở trên chỉ hiển thị tổng phí quản trị PPOB, không phải danh sách giao dịch. Chỉ tài khoản Owner/Superuser mới có thể xóa vĩnh viễn." },

  "transactions.tab.list": { id: "Daftar Transaksi", en: "Transaction List", ms: "Senarai Transaksi", th: "รายการธุรกรรม", fil: "Listahan ng Transaksyon", vi: "Danh sách giao dịch" },
  "transactions.tab.cashier": { id: "Performa Kasir", en: "Cashier Performance", ms: "Prestasi Juruwang", th: "ผลงานแคชเชียร์", fil: "Performance ng Cashier", vi: "Hiệu suất thu ngân" },

  // --- Period presets ---
  "transactions.preset.today": { id: "Hari Ini", en: "Today", ms: "Hari Ini", th: "วันนี้", fil: "Ngayon", vi: "Hôm nay" },
  "transactions.preset.yesterday": { id: "Kemarin", en: "Yesterday", ms: "Semalam", th: "เมื่อวาน", fil: "Kahapon", vi: "Hôm qua" },
  "transactions.preset.thisWeek": { id: "Minggu Ini", en: "This Week", ms: "Minggu Ini", th: "สัปดาห์นี้", fil: "Ngayong Linggo", vi: "Tuần này" },
  "transactions.preset.lastWeek": { id: "Minggu Lalu", en: "Last Week", ms: "Minggu Lepas", th: "สัปดาห์ที่แล้ว", fil: "Nakaraang Linggo", vi: "Tuần trước" },
  "transactions.preset.thisMonth": { id: "Bulan Ini", en: "This Month", ms: "Bulan Ini", th: "เดือนนี้", fil: "Ngayong Buwan", vi: "Tháng này" },
  "transactions.preset.lastMonth": { id: "Bulan Lalu", en: "Last Month", ms: "Bulan Lepas", th: "เดือนที่แล้ว", fil: "Nakaraang Buwan", vi: "Tháng trước" },
  "transactions.preset.thisYear": { id: "Tahun Ini", en: "This Year", ms: "Tahun Ini", th: "ปีนี้", fil: "Ngayong Taon", vi: "Năm nay" },
  "transactions.preset.lastYear": { id: "Tahun Lalu", en: "Last Year", ms: "Tahun Lepas", th: "ปีที่แล้ว", fil: "Nakaraang Taon", vi: "Năm trước" },
  "transactions.preset.custom": { id: "Custom", en: "Custom", ms: "Custom", th: "กำหนดเอง", fil: "Pasadya", vi: "Tùy chỉnh" },

  // --- Filters ---
  "transactions.filter.allCashiers": { id: "Semua Kasir", en: "All Cashiers", ms: "Semua Juruwang", th: "แคชเชียร์ทั้งหมด", fil: "Lahat ng Cashier", vi: "Tất cả thu ngân" },
  "transactions.filter.allTypes": { id: "Semua Jenis", en: "All Types", ms: "Semua Jenis", th: "ทุกประเภท", fil: "Lahat ng Uri", vi: "Tất cả loại" },
  "transactions.filter.allPayments": { id: "Semua Payment", en: "All Payments", ms: "Semua Pembayaran", th: "การชำระเงินทั้งหมด", fil: "Lahat ng Bayad", vi: "Tất cả thanh toán" },
  "transactions.filter.allStatuses": { id: "Semua Status", en: "All Statuses", ms: "Semua Status", th: "สถานะทั้งหมด", fil: "Lahat ng Status", vi: "Tất cả trạng thái" },
  "transactions.filter.searchCustomer": { id: "Cari customer...", en: "Search customer...", ms: "Cari pelanggan...", th: "ค้นหาลูกค้า...", fil: "Maghanap ng customer...", vi: "Tìm khách hàng..." },
  "transactions.filter.minAmount": { id: "Min Rp", en: "Min Rp", ms: "Min Rp", th: "ขั้นต่ำ Rp", fil: "Min Rp", vi: "Tối thiểu Rp" },
  "transactions.filter.maxAmount": { id: "Max Rp", en: "Max Rp", ms: "Maks Rp", th: "สูงสุด Rp", fil: "Max Rp", vi: "Tối đa Rp" },

  // --- Transaction type labels ---
  "transactions.type.rental": { id: "Rental", en: "Rental", ms: "Sewa", th: "เช่า", fil: "Rental", vi: "Thuê" },
  "transactions.type.fnb": { id: "F&B", en: "F&B", ms: "F&B", th: "F&B", fil: "F&B", vi: "F&B" },
  "transactions.type.product": { id: "Produk", en: "Product", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "transactions.type.ppob": { id: "PPOB", en: "PPOB", ms: "PPOB", th: "PPOB", fil: "PPOB", vi: "PPOB" },

  // --- Status labels ---
  "transactions.status.open": { id: "Open", en: "Open", ms: "Terbuka", th: "เปิด", fil: "Open", vi: "Đang mở" },
  "transactions.status.awaitingPayment": { id: "Menunggu Bayar", en: "Awaiting Payment", ms: "Menunggu Bayaran", th: "รอชำระเงิน", fil: "Naghihintay ng Bayad", vi: "Chờ thanh toán" },
  "transactions.status.partial": { id: "Sebagian", en: "Partial", ms: "Sebahagian", th: "ชำระบางส่วน", fil: "Bahagya", vi: "Thanh toán một phần" },
  "transactions.status.paid": { id: "Lunas", en: "Paid", ms: "Selesai Bayar", th: "ชำระแล้ว", fil: "Bayad na", vi: "Đã thanh toán" },
  "transactions.status.cancelled": { id: "Dibatalkan", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิกแล้ว", fil: "Kinansela", vi: "Đã hủy" },

  // --- Payment group labels ---
  "transactions.paymentGroup.cash": { id: "Cash", en: "Cash", ms: "Tunai", th: "เงินสด", fil: "Cash", vi: "Tiền mặt" },
  "transactions.paymentGroup.transferBank": { id: "Transfer Bank", en: "Bank Transfer", ms: "Pindahan Bank", th: "โอนเงินผ่านธนาคาร", fil: "Bank Transfer", vi: "Chuyển khoản ngân hàng" },
  "transactions.paymentGroup.qris": { id: "QRIS", en: "QRIS", ms: "QRIS", th: "QRIS", fil: "QRIS", vi: "QRIS" },
  "transactions.paymentGroup.ewallet": { id: "E-Wallet", en: "E-Wallet", ms: "E-Wallet", th: "อีวอลเล็ต", fil: "E-Wallet", vi: "Ví điện tử" },
  "transactions.paymentGroup.card": { id: "Card", en: "Card", ms: "Kad", th: "บัตร", fil: "Card", vi: "Thẻ" },

  // --- Summary stat cards ---
  "transactions.stat.totalTransactions": { id: "Total Transaksi", en: "Total Transactions", ms: "Jumlah Transaksi", th: "จำนวนธุรกรรมทั้งหมด", fil: "Kabuuang Transaksyon", vi: "Tổng giao dịch" },
  "transactions.stat.netSales": { id: "Net Sales", en: "Net Sales", ms: "Jualan Bersih", th: "ยอดขายสุทธิ", fil: "Net Sales", vi: "Doanh số ròng" },
  "transactions.stat.grossSales": { id: "Gross Sales", en: "Gross Sales", ms: "Jualan Kasar", th: "ยอดขายรวม", fil: "Gross Sales", vi: "Doanh số gộp" },
  "transactions.summaryScopeNote": {
    id: "Kartu ringkasan di bawah dihitung dari dataset dan periode transaksi yang sama persis dengan tabel di bawahnya (berdasarkan tanggal transaksi dibuat) — bukan dari laporan Accounting/Laba Rugi yang cakupan tanggalnya berbeda (tanggal pengakuan pendapatan). Gross Sales = total seluruh transaksi valid pada tabel, Net Sales = Gross Sales dikurangi Refund. PPOB Revenue dihitung terpisah dari modul PPOB (belum tercatat sebagai baris di tabel ini) dan tidak termasuk dalam Gross/Net Sales. Laporan laba rugi di Accounting tetap terpisah dan tidak berubah.",
    en: "The summary cards below are computed from the exact same transaction dataset and period as the table beneath them (based on transaction creation date) — not from the Accounting/Laba Rugi report, whose date scope differs (revenue-recognition date). Gross Sales = sum of every valid transaction shown in the table, Net Sales = Gross Sales minus Refund. PPOB Revenue is computed separately from the PPOB module (its transactions don't appear as rows in this table) and is excluded from Gross/Net Sales. The Accounting profit & loss report remains separate and unchanged.",
    ms: "Kad ringkasan di bawah dikira daripada dataset dan tempoh transaksi yang sama persis dengan jadual di bawahnya (berdasarkan tarikh transaksi dibuat) — bukan daripada laporan Accounting/Laba Rugi yang skop tarikhnya berbeza (tarikh pengiktirafan hasil). Gross Sales = jumlah semua transaksi sah dalam jadual, Net Sales = Gross Sales tolak Refund. PPOB Revenue dikira berasingan daripada modul PPOB (transaksinya tidak muncul sebagai baris dalam jadual ini) dan tidak termasuk dalam Gross/Net Sales. Laporan untung rugi dalam Accounting kekal berasingan dan tidak berubah.",
    th: "การ์ดสรุปด้านล่างคำนวณจากชุดข้อมูลและช่วงเวลาธุรกรรมเดียวกันทุกประการกับตารางด้านล่าง (อิงตามวันที่สร้างธุรกรรม) — ไม่ใช่จากรายงานบัญชี/กำไรขาดทุนซึ่งขอบเขตวันที่ต่างกัน (วันที่รับรู้รายได้) Gross Sales = ผลรวมธุรกรรมที่ถูกต้องทั้งหมดในตาราง, Net Sales = Gross Sales ลบ Refund รายได้ PPOB คำนวณแยกจากโมดูล PPOB (ธุรกรรมไม่ปรากฏเป็นแถวในตารางนี้) และไม่รวมอยู่ใน Gross/Net Sales รายงานกำไรขาดทุนในบัญชียังคงแยกต่างหากและไม่เปลี่ยนแปลง",
    fil: "Ang mga summary card sa ibaba ay kinakalkula mula sa parehong eksaktong dataset at panahon ng transaksyon gaya ng talahanayan sa ibaba nito (batay sa petsa ng paggawa ng transaksyon) — hindi mula sa Accounting/Laba Rugi report na iba ang saklaw ng petsa (petsa ng pagkilala ng kita). Gross Sales = kabuuan ng lahat ng valid na transaksyon na nakalista sa talahanayan, Net Sales = Gross Sales bawas Refund. Ang PPOB Revenue ay kinakalkula nang hiwalay mula sa PPOB module (hindi lumalabas ang mga transaksyon nito bilang row sa talahanayang ito) at hindi kasama sa Gross/Net Sales. Ang Accounting profit & loss report ay nananatiling hiwalay at hindi nagbabago.",
    vi: "Các thẻ tổng hợp bên dưới được tính từ đúng cùng một tập dữ liệu và kỳ giao dịch với bảng bên dưới (dựa trên ngày tạo giao dịch) — không phải từ báo cáo Kế toán/Lãi Lỗ có phạm vi ngày khác (ngày ghi nhận doanh thu). Gross Sales = tổng tất cả giao dịch hợp lệ hiển thị trong bảng, Net Sales = Gross Sales trừ Refund. Doanh thu PPOB được tính riêng từ mô-đun PPOB (giao dịch của nó không xuất hiện dưới dạng hàng trong bảng này) và không tính vào Gross/Net Sales. Báo cáo lãi lỗ trong Kế toán vẫn tách biệt và không thay đổi.",
  },
  "transactions.stat.rentalRevenue": { id: "Rental Revenue", en: "Rental Revenue", ms: "Hasil Sewa", th: "รายได้จากการเช่า", fil: "Kita sa Rental", vi: "Doanh thu cho thuê" },
  "transactions.stat.fnbRevenue": { id: "F&B Revenue", en: "F&B Revenue", ms: "Hasil F&B", th: "รายได้ F&B", fil: "Kita sa F&B", vi: "Doanh thu F&B" },
  "transactions.stat.ppobRevenue": { id: "PPOB Revenue", en: "PPOB Revenue", ms: "Hasil PPOB", th: "รายได้ PPOB", fil: "Kita sa PPOB", vi: "Doanh thu PPOB" },
  "transactions.stat.otherProducts": { id: "Produk/Lainnya", en: "Product/Other", ms: "Produk/Lain-lain", th: "สินค้า/อื่นๆ", fil: "Produkto/Iba pa", vi: "Sản phẩm/Khác" },
  "transactions.stat.discount": { id: "Diskon", en: "Discount", ms: "Diskaun", th: "ส่วนลด", fil: "Diskwento", vi: "Giảm giá" },
  "transactions.stat.tax": { id: "Pajak", en: "Tax", ms: "Cukai", th: "ภาษี", fil: "Buwis", vi: "Thuế" },
  "transactions.stat.refund": { id: "Refund", en: "Refund", ms: "Bayaran Balik", th: "การคืนเงิน", fil: "Refund", vi: "Hoàn tiền" },

  // --- Table columns (Transaction List + Cashier Performance) ---
  "transactions.col.time": { id: "Waktu", en: "Time", ms: "Masa", th: "เวลา", fil: "Oras", vi: "Thời gian" },
  "transactions.col.timeCreatedTooltip": { id: "Order dibuat", en: "Order created", ms: "Order dibuat", th: "สร้างออเดอร์เมื่อ", fil: "Ginawa ang order", vi: "Đơn tạo lúc" },
  "transactions.col.cashier": { id: "Kasir", en: "Cashier", ms: "Juruwang", th: "แคชเชียร์", fil: "Cashier", vi: "Thu ngân" },
  "transactions.col.type": { id: "Jenis", en: "Type", ms: "Jenis", th: "ประเภท", fil: "Uri", vi: "Loại" },
  "transactions.col.customer": { id: "Customer", en: "Customer", ms: "Pelanggan", th: "ลูกค้า", fil: "Customer", vi: "Khách hàng" },
  "transactions.col.unit": { id: "Unit", en: "Unit", ms: "Unit", th: "เครื่อง", fil: "Unit", vi: "Máy" },
  "transactions.col.item": { id: "Item", en: "Item", ms: "Item", th: "รายการ", fil: "Item", vi: "Mặt hàng" },
  "transactions.col.total": { id: "Total", en: "Total", ms: "Jumlah", th: "รวม", fil: "Total", vi: "Tổng" },
  "transactions.col.payment": { id: "Payment", en: "Payment", ms: "Pembayaran", th: "การชำระเงิน", fil: "Bayad", vi: "Thanh toán" },
  "transactions.col.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "transactions.col.action": { id: "Aksi", en: "Action", ms: "Tindakan", th: "การดำเนินการ", fil: "Aksyon", vi: "Hành động" },
  "transactions.col.rank": { id: "Rank", en: "Rank", ms: "Kedudukan", th: "อันดับ", fil: "Rank", vi: "Hạng" },
  "transactions.col.transactionCount": { id: "Transaksi", en: "Transactions", ms: "Transaksi", th: "ธุรกรรม", fil: "Transaksyon", vi: "Giao dịch" },
  "transactions.col.totalSales": { id: "Total Penjualan", en: "Total Sales", ms: "Jumlah Jualan", th: "ยอดขายรวม", fil: "Kabuuang Benta", vi: "Tổng doanh số" },
  "transactions.col.average": { id: "Rata-rata", en: "Average", ms: "Purata", th: "เฉลี่ย", fil: "Average", vi: "Trung bình" },
  "transactions.col.shift": { id: "Shift", en: "Shift", ms: "Syif", th: "กะ", fil: "Shift", vi: "Ca làm" },
  "transactions.col.cashVariance": { id: "Cash Variance", en: "Cash Variance", ms: "Varians Tunai", th: "ส่วนต่างเงินสด", fil: "Cash Variance", vi: "Chênh lệch tiền mặt" },

  // --- Loading / empty states ---
  "transactions.loading": { id: "Memuat...", en: "Loading...", ms: "Memuatkan...", th: "กำลังโหลด...", fil: "Nilo-load...", vi: "Đang tải..." },
  "transactions.emptyList": { id: "Tidak ada transaksi pada periode/filter ini.", en: "No transactions found for this period/filter.", ms: "Tiada transaksi untuk tempoh/penapis ini.", th: "ไม่พบธุรกรรมในช่วงเวลา/ตัวกรองนี้", fil: "Walang nahanap na transaksyon sa panahon/filter na ito.", vi: "Không có giao dịch nào trong khoảng thời gian/bộ lọc này." },
  "transactions.emptyCashier": { id: "Tidak ada transaksi kasir pada periode ini.", en: "No cashier transactions for this period.", ms: "Tiada transaksi juruwang untuk tempoh ini.", th: "ไม่มีธุรกรรมของแคชเชียร์ในช่วงเวลานี้", fil: "Walang transaksyon ng cashier sa panahong ito.", vi: "Không có giao dịch của thu ngân trong khoảng thời gian này." },

  // --- Row actions ---
  "transactions.action.detail": { id: "Detail", en: "Details", ms: "Butiran", th: "รายละเอียด", fil: "Detalye", vi: "Chi tiết" },
  "transactions.action.receipt": { id: "Struk", en: "Receipt", ms: "Resit", th: "ใบเสร็จ", fil: "Resibo", vi: "Hóa đơn" },
  "transactions.action.refund": { id: "Refund", en: "Refund", ms: "Bayaran Balik", th: "คืนเงิน", fil: "Refund", vi: "Hoàn tiền" },
  "transactions.action.void": { id: "Batalkan", en: "Void", ms: "Batal", th: "ยกเลิกรายการ", fil: "Void", vi: "Hủy giao dịch" },
  "transactions.action.markPaid": { id: "Tandai Lunas", en: "Mark as Paid", ms: "Tanda Selesai Bayar", th: "ทำเครื่องหมายว่าชำระแล้ว", fil: "Markahan na Bayad", vi: "Đánh dấu đã thanh toán" },
  "transactions.action.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Burahin", vi: "Xóa" },

  // --- Prompts / confirmations / alerts ---
  "transactions.prompt.refundReason": { id: "Alasan refund?", en: "Reason for refund?", ms: "Sebab bayaran balik?", th: "เหตุผลในการคืนเงิน?", fil: "Dahilan ng refund?", vi: "Lý do hoàn tiền?" },
  "transactions.prompt.voidReason": { id: "Alasan void?", en: "Reason for void?", ms: "Sebab pembatalan?", th: "เหตุผลในการยกเลิกรายการ?", fil: "Dahilan ng void?", vi: "Lý do hủy giao dịch?" },
  "transactions.alert.pendingApproval": { id: "Diajukan untuk approval.", en: "Submitted for approval.", ms: "Dihantar untuk kelulusan.", th: "ส่งเพื่อขออนุมัติแล้ว", fil: "Isinumite para sa approval.", vi: "Đã gửi để chờ phê duyệt." },
  "transactions.alert.actionSuccess": { id: "{action} berhasil diproses.", en: "{action} processed successfully.", ms: "{action} berjaya diproses.", th: "ดำเนินการ {action} สำเร็จแล้ว", fil: "Matagumpay na naproseso ang {action}.", vi: "{action} đã được xử lý thành công." },
  "transactions.confirm.deleteTransaction": { id: "Hapus transaksi ini secara PERMANEN? Beda dengan Void — ini menghapus total dari sistem (order, item, pembayaran, jurnal akuntansi) dan tidak bisa dibatalkan. Stok akan dikembalikan otomatis kalau belum di-void sebelumnya.", en: "Permanently delete this transaction? Unlike Void, this completely removes it from the system (order, items, payments, accounting journal) and cannot be undone. Stock will be automatically restored if it wasn't voided already.", ms: "Padam transaksi ini secara KEKAL? Berbeza dengan Void — ini akan memadam sepenuhnya daripada sistem (pesanan, item, pembayaran, jurnal perakaunan) dan tidak boleh dibatalkan. Stok akan dipulihkan secara automatik jika belum di-void sebelum ini.", th: "ต้องการลบธุรกรรมนี้อย่างถาวรหรือไม่? ต่างจาก Void ตรงที่การลบนี้จะลบออกจากระบบทั้งหมด (คำสั่งซื้อ รายการสินค้า การชำระเงิน สมุดบัญชี) และไม่สามารถย้อนกลับได้ สต็อกจะถูกคืนอัตโนมัติหากยังไม่เคยถูกยกเลิกรายการมาก่อน", fil: "Permanenteng burahin ang transaksyong ito? Iba ito sa Void — tuluyang tatanggalin ito sa sistema (order, item, bayad, accounting journal) at hindi na ito maibabalik. Awtomatikong maibabalik ang stock kung hindi pa ito na-void dati.", vi: "Xóa vĩnh viễn giao dịch này? Khác với Hủy giao dịch (Void) — thao tác này sẽ xóa hoàn toàn khỏi hệ thống (đơn hàng, mặt hàng, thanh toán, sổ kế toán) và không thể hoàn tác. Tồn kho sẽ được khôi phục tự động nếu trước đó chưa bị hủy." },
  "transactions.alert.deleteSuccess": { id: "Transaksi berhasil dihapus.", en: "Transaction deleted successfully.", ms: "Transaksi berjaya dipadam.", th: "ลบธุรกรรมสำเร็จแล้ว", fil: "Matagumpay na nabura ang transaksyon.", vi: "Đã xóa giao dịch thành công." },
  "transactions.confirm.settleTransaction": { id: "Tandai transaksi ini LUNAS? Sisa tagihan akan dicatat sebagai dibayar tunai (kecuali sudah ada pembayaran QRIS/lain yang menunggu konfirmasi, itu akan dikonfirmasi dulu).", en: "Mark this transaction as PAID? The remaining balance will be recorded as paid in cash (unless there's already a pending QRIS/other payment, which will be confirmed first).", ms: "Tandakan transaksi ini sebagai SELESAI BAYAR? Baki bil akan direkodkan sebagai dibayar secara tunai (kecuali sudah ada pembayaran QRIS/lain yang menunggu pengesahan, itu akan disahkan dahulu).", th: "ต้องการทำเครื่องหมายว่าธุรกรรมนี้ชำระแล้วหรือไม่? ยอดคงเหลือจะถูกบันทึกว่าชำระด้วยเงินสด (เว้นแต่มีการชำระเงินผ่าน QRIS/อื่นๆ ที่รอการยืนยันอยู่แล้ว ระบบจะยืนยันรายการนั้นก่อน)", fil: "Markahan ang transaksyong ito bilang BAYAD NA? Ang natitirang balanse ay itatala bilang binayaran nang cash (maliban kung may nakabinbing bayad sa QRIS/iba pa, na kukumpirmahin muna).", vi: "Đánh dấu giao dịch này là ĐÃ THANH TOÁN? Số dư còn lại sẽ được ghi nhận là thanh toán bằng tiền mặt (trừ khi đã có thanh toán QRIS/khác đang chờ xác nhận, khoản đó sẽ được xác nhận trước)." },
  "transactions.alert.settleSuccess": { id: "Transaksi ditandai lunas.", en: "Transaction marked as paid.", ms: "Transaksi ditanda selesai bayar.", th: "ทำเครื่องหมายธุรกรรมว่าชำระแล้ว", fil: "Namarkahan ang transaksyon bilang bayad na.", vi: "Đã đánh dấu giao dịch là đã thanh toán." },

  // --- Transaction detail modal ---
  "transactions.detail.title": { id: "Detail Transaksi", en: "Transaction Details", ms: "Butiran Transaksi", th: "รายละเอียดธุรกรรม", fil: "Detalye ng Transaksyon", vi: "Chi tiết giao dịch" },
  "transactions.detail.close": { id: "Tutup", en: "Close", ms: "Tutup", th: "ปิด", fil: "Isara", vi: "Đóng" },
  "transactions.detail.orderId": { id: "Order ID:", en: "Order ID:", ms: "ID Pesanan:", th: "รหัสคำสั่งซื้อ:", fil: "Order ID:", vi: "Mã đơn hàng:" },
  "transactions.detail.status": { id: "Status:", en: "Status:", ms: "Status:", th: "สถานะ:", fil: "Status:", vi: "Trạng thái:" },
  "transactions.detail.cashier": { id: "Kasir:", en: "Cashier:", ms: "Juruwang:", th: "แคชเชียร์:", fil: "Cashier:", vi: "Thu ngân:" },
  "transactions.detail.customer": { id: "Customer:", en: "Customer:", ms: "Pelanggan:", th: "ลูกค้า:", fil: "Customer:", vi: "Khách hàng:" },
  "transactions.detail.time": { id: "Waktu:", en: "Time:", ms: "Masa:", th: "เวลา:", fil: "Oras:", vi: "Thời gian:" },
  "transactions.detail.source": { id: "Sumber:", en: "Source:", ms: "Sumber:", th: "แหล่งที่มา:", fil: "Source:", vi: "Nguồn:" },
  "transactions.detail.subtotal": { id: "Subtotal", en: "Subtotal", ms: "Subtotal", th: "ยอดรวมย่อย", fil: "Subtotal", vi: "Tạm tính" },
  "transactions.detail.serviceCharge": { id: "Service Charge", en: "Service Charge", ms: "Caj Perkhidmatan", th: "ค่าบริการ", fil: "Service Charge", vi: "Phí dịch vụ" },
  "transactions.detail.paymentHeading": { id: "Pembayaran", en: "Payments", ms: "Pembayaran", th: "การชำระเงิน", fil: "Bayad", vi: "Thanh toán" },
  "transactions.detail.noPayments": { id: "Belum ada pembayaran.", en: "No payments yet.", ms: "Belum ada pembayaran.", th: "ยังไม่มีการชำระเงิน", fil: "Wala pang bayad.", vi: "Chưa có khoản thanh toán nào." },
  "transactions.detail.journalHeading": { id: "Jurnal Akuntansi", en: "Accounting Journal", ms: "Jurnal Perakaunan", th: "สมุดบัญชี", fil: "Accounting Journal", vi: "Sổ kế toán" },
  "transactions.detail.noJournal": { id: "Belum ada jurnal terkait.", en: "No related journal entries yet.", ms: "Belum ada jurnal berkaitan.", th: "ยังไม่มีรายการบัญชีที่เกี่ยวข้อง", fil: "Wala pang kaugnay na journal entry.", vi: "Chưa có bút toán sổ kế toán liên quan." },

  // --- Duplicate-transaction flag (Daftar Transaksi table) ---
  "transactions.duplicate.badge": { id: "Mirip Ganda", en: "Possible Duplicate", ms: "Mungkin Pendua", th: "อาจซ้ำ", fil: "Posibleng Duplicate", vi: "Có thể trùng lặp" },
  "transactions.duplicate.tooltip": {
    id: "Kasir, item, dan total sama persis dengan transaksi lain dalam rentang waktu berdekatan — cek kemungkinan transaksi ini terinput dua kali sebelum dianggap valid.",
    en: "Same cashier, items, and total as another transaction close in time — check whether this was accidentally entered twice before treating it as valid.",
    ms: "Juruwang, item, dan jumlah sama persis dengan transaksi lain dalam jarak masa yang dekat — semak kemungkinan transaksi ini dimasukkan dua kali sebelum dianggap sah.",
    th: "แคชเชียร์ รายการ และยอดรวมเหมือนกับธุรกรรมอื่นในช่วงเวลาใกล้เคียงกัน — ตรวจสอบว่าธุรกรรมนี้ถูกบันทึกซ้ำสองครั้งหรือไม่ก่อนถือว่าถูกต้อง",
    fil: "Parehong cashier, item, at total sa ibang transaksyon na malapit ang oras — tingnan kung baka aksidenteng na-input nang dalawang beses ito bago ituring na valid.",
    vi: "Cùng thu ngân, mặt hàng và tổng tiền với một giao dịch khác gần thời điểm — kiểm tra xem giao dịch này có bị nhập trùng hai lần không trước khi xem là hợp lệ.",
  },

  // --- Payment method + amount correction (Owner/Superuser only) ---
  "transactions.payment.editMethod": { id: "Koreksi", en: "Correct", ms: "Betulkan", th: "แก้ไข", fil: "Itama", vi: "Sửa" },
  "transactions.payment.saveMethod": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "transactions.payment.cancelEdit": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "transactions.payment.editHint": {
    id: "Untuk memperbaiki kasir yang salah pilih metode (mis. tercatat QRIS padahal terima Cash) atau nominal yang sudah tidak cocok dengan total setelah koreksi lain. Sistem otomatis membatalkan & memposting ulang jurnal penjualan order ini dengan data yang benar.",
    en: "For fixing a cashier who picked the wrong method (e.g. recorded as QRIS but cash was actually received) or an amount that no longer matches the total after another correction. The system automatically voids and reposts this order's sales journal with the corrected data.",
    ms: "Untuk membetulkan juruwang yang tersilap pilih kaedah (cth. direkodkan QRIS sedangkan tunai yang diterima) atau jumlah yang sudah tidak sepadan dengan jumlah keseluruhan selepas pembetulan lain. Sistem secara automatik membatalkan & memposkan semula jurnal jualan order ini dengan data yang betul.",
    th: "สำหรับแก้ไขกรณีแคชเชียร์เลือกวิธีการชำระผิด (เช่น บันทึกเป็น QRIS แต่จริงๆ รับเป็นเงินสด) หรือจำนวนเงินที่ไม่ตรงกับยอดรวมอีกต่อไปหลังการแก้ไขอื่น ระบบจะยกเลิกและโพสต์สมุดบัญชีการขายของออเดอร์นี้ใหม่โดยอัตโนมัติด้วยข้อมูลที่ถูกต้อง",
    fil: "Para itama ang cashier na napiling maling paraan (hal. naitala bilang QRIS pero cash pala ang natanggap) o halagang hindi na tugma sa total pagkatapos ng ibang pagwawasto. Awtomatikong ibi-void at ire-repost ng sistema ang sales journal ng order na ito gamit ang tamang datos.",
    vi: "Dùng để sửa lỗi thu ngân chọn sai phương thức (vd. ghi là QRIS nhưng thực tế nhận tiền mặt) hoặc số tiền không còn khớp với tổng sau một lần sửa khác. Hệ thống sẽ tự động hủy và đăng lại sổ nhật ký bán hàng của đơn này với dữ liệu đúng.",
  },
  "transactions.payment.correctSuccess": { id: "Pembayaran berhasil dikoreksi.", en: "Payment corrected successfully.", ms: "Pembayaran berjaya dibetulkan.", th: "แก้ไขการชำระเงินสำเร็จแล้ว", fil: "Matagumpay na naitama ang bayad.", vi: "Đã sửa thanh toán thành công." },
  "transactions.payment.correctingProgress": {
    id: "Menyimpan koreksi pembayaran & memposting ulang jurnal...",
    en: "Saving payment correction & reposting journal...",
    ms: "Menyimpan pembetulan pembayaran & memposkan semula jurnal...",
    th: "กำลังบันทึกการแก้ไขการชำระเงินและโพสต์สมุดบัญชีใหม่...",
    fil: "Sine-save ang pagwawasto sa bayad & ire-repost ang journal...",
    vi: "Đang lưu bản sửa thanh toán & đăng lại sổ nhật ký...",
  },
  "transactions.payment.invalidAmount": { id: "Nominal pembayaran tidak valid.", en: "Invalid payment amount.", ms: "Jumlah pembayaran tidak sah.", th: "จำนวนเงินชำระไม่ถูกต้อง", fil: "Hindi valid na halaga ng bayad.", vi: "Số tiền thanh toán không hợp lệ." },

  // --- Rental charge correction (Owner/Superuser only) ---
  "transactions.rental.editAmount": { id: "Koreksi Nominal", en: "Correct Amount", ms: "Betulkan Jumlah", th: "แก้ไขจำนวนเงิน", fil: "Itama ang Halaga", vi: "Sửa số tiền" },
  "transactions.rental.editHint": {
    id: "Untuk memperbaiki tagihan rental yang salah (mis. karena harga paket promo berubah saat sesi masih berjalan). Sistem otomatis membatalkan & memposting ulang jurnal penjualan order ini dengan nominal yang benar.",
    en: "For fixing a wrong rental charge (e.g. the package/promo price changed while the session was still running). The system automatically voids and reposts this order's sales journal with the corrected amount.",
    ms: "Untuk membetulkan caj sewa yang salah (cth. harga pakej promo berubah semasa sesi masih berjalan). Sistem secara automatik membatalkan & memposkan semula jurnal jualan order ini dengan jumlah yang betul.",
    th: "สำหรับแก้ไขค่าเช่าที่ผิดพลาด (เช่น ราคาแพ็กเกจ/โปรโมชันเปลี่ยนขณะเซสชันยังทำงานอยู่) ระบบจะยกเลิกและโพสต์สมุดบัญชีการขายของออเดอร์นี้ใหม่โดยอัตโนมัติด้วยจำนวนที่ถูกต้อง",
    fil: "Para itama ang maling singil sa rental (hal. nagbago ang presyo ng package/promo habang tumatakbo pa ang session). Awtomatikong ibi-void at ire-repost ng sistema ang sales journal ng order na ito gamit ang tamang halaga.",
    vi: "Dùng để sửa lỗi phí thuê sai (vd. giá gói/khuyến mãi thay đổi trong khi phiên vẫn đang chạy). Hệ thống sẽ tự động hủy và đăng lại sổ nhật ký bán hàng của đơn này với số tiền đúng.",
  },
  "transactions.rental.invalidAmount": { id: "Nominal tidak valid.", en: "Invalid amount.", ms: "Jumlah tidak sah.", th: "จำนวนเงินไม่ถูกต้อง", fil: "Hindi valid na halaga.", vi: "Số tiền không hợp lệ." },
  "transactions.rental.correctSuccess": { id: "Nominal rental berhasil dikoreksi.", en: "Rental amount corrected successfully.", ms: "Jumlah sewa berjaya dibetulkan.", th: "แก้ไขจำนวนค่าเช่าสำเร็จแล้ว", fil: "Matagumpay na naitama ang halaga ng rental.", vi: "Đã sửa số tiền thuê thành công." },
  "transactions.rental.correctingProgress": {
    id: "Menyimpan koreksi nominal & memposting ulang jurnal...",
    en: "Saving amount correction & reposting journal...",
    ms: "Menyimpan pembetulan jumlah & memposkan semula jurnal...",
    th: "กำลังบันทึกการแก้ไขจำนวนเงินและโพสต์สมุดบัญชีใหม่...",
    fil: "Sine-save ang pagwawasto ng halaga & ire-repost ang journal...",
    vi: "Đang lưu bản sửa số tiền & đăng lại sổ nhật ký...",
  },
  "transactions.rental.startTime": { id: "Mulai", en: "Start", ms: "Mula", th: "เริ่ม", fil: "Simula", vi: "Bắt đầu" },
  "transactions.rental.stopTime": { id: "Berhenti", en: "Stop", ms: "Henti", th: "สิ้นสุด", fil: "Hinto", vi: "Kết thúc" },

  // --- Per-item delete on an already-paid order (Owner/Superuser only) — e.g. removing a
  // genuinely duplicate rental line left over from merging several TVs'/sessions' bills into one
  // order. ---
  "transactions.item.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },
  "transactions.item.deletedTag": { id: "(dihapus)", en: "(deleted)", ms: "(dipadam)", th: "(ลบแล้ว)", fil: "(tinanggal)", vi: "(đã xóa)" },
  "transactions.item.confirmDelete": {
    id: 'Hapus item "{desc}" ({amount}) dari transaksi ini? Sistem otomatis membatalkan & memposting ulang jurnal penjualan order ini tanpa item ini. Tidak bisa dibatalkan.',
    en: 'Delete item "{desc}" ({amount}) from this transaction? The system automatically voids and reposts this order\'s sales journal without this item. Cannot be undone.',
    ms: 'Padam item "{desc}" ({amount}) daripada transaksi ini? Sistem secara automatik membatalkan & memposkan semula jurnal jualan order ini tanpa item ini. Tidak boleh dibatalkan.',
    th: 'ลบรายการ "{desc}" ({amount}) ออกจากรายการนี้หรือไม่? ระบบจะยกเลิกและโพสต์สมุดบัญชีการขายของออเดอร์นี้ใหม่โดยไม่มีรายการนี้โดยอัตโนมัติ ไม่สามารถย้อนกลับได้',
    fil: 'Tanggalin ang item na "{desc}" ({amount}) mula sa transaksyong ito? Awtomatikong ibi-void at ire-repost ng sistema ang sales journal ng order na ito nang wala ang item na ito. Hindi na maaaring bawiin.',
    vi: 'Xóa mục "{desc}" ({amount}) khỏi giao dịch này? Hệ thống sẽ tự động hủy và đăng lại sổ nhật ký bán hàng của đơn này mà không có mục này. Không thể hoàn tác.',
  },
  "transactions.item.deleteSuccess": { id: "Item berhasil dihapus dari transaksi.", en: "Item deleted from the transaction successfully.", ms: "Item berjaya dipadam daripada transaksi.", th: "ลบรายการออกจากรายการสำเร็จแล้ว", fil: "Matagumpay na natanggal ang item mula sa transaksyon.", vi: "Đã xóa mục khỏi giao dịch thành công." },
  "transactions.item.deletingProgress": {
    id: "Menghapus item & memposting ulang jurnal...",
    en: "Deleting item & reposting journal...",
    ms: "Memadam item & memposkan semula jurnal...",
    th: "กำลังลบรายการและโพสต์สมุดบัญชีใหม่...",
    fil: "Tinatanggal ang item & ire-repost ang journal...",
    vi: "Đang xóa mục & đăng lại sổ nhật ký...",
  },

  // ---- Shared network/error-catch strings for the correction modals (savePaymentMethod,
  // saveRentalAmount, deleteItem) — these were previously plain Indonesian template literals.
  "transactions.error.unknownError": { id: "kesalahan tidak diketahui", en: "unknown error", ms: "ralat tidak diketahui", th: "ข้อผิดพลาดที่ไม่ทราบสาเหตุ", fil: "hindi kilalang error", vi: "lỗi không xác định" },
  "transactions.error.networkSavePayment": {
    id: "Gagal menyimpan koreksi: {msg}. Cek koneksi internet lalu coba lagi.",
    en: "Failed to save correction: {msg}. Check your internet connection and try again.",
    ms: "Gagal menyimpan pembetulan: {msg}. Semak sambungan internet dan cuba lagi.",
    th: "บันทึกการแก้ไขไม่สำเร็จ: {msg} ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง",
    fil: "Nabigong i-save ang pagwawasto: {msg}. Suriin ang internet connection at subukan ulit.",
    vi: "Lưu bản sửa thất bại: {msg}. Kiểm tra kết nối internet rồi thử lại.",
  },
  "transactions.error.networkDeleteItem": {
    id: "Gagal menghapus item: {msg}. Cek koneksi internet lalu coba lagi.",
    en: "Failed to delete item: {msg}. Check your internet connection and try again.",
    ms: "Gagal memadam item: {msg}. Semak sambungan internet dan cuba lagi.",
    th: "ลบรายการไม่สำเร็จ: {msg} ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง",
    fil: "Nabigong tanggalin ang item: {msg}. Suriin ang internet connection at subukan ulit.",
    vi: "Xóa mục thất bại: {msg}. Kiểm tra kết nối internet rồi thử lại.",
  },
  "transactions.error.nonJsonResponse": {
    id: "Server merespons status {status} tanpa isi JSON (kemungkinan endpoint belum ter-deploy atau error server) — coba refresh halaman, dan jika masih gagal, hubungi tim teknis.",
    en: "Server responded with status {status} with no JSON body (the endpoint may not be deployed yet, or the server errored) — try refreshing the page, and contact technical support if it still fails.",
    ms: "Pelayan membalas status {status} tanpa kandungan JSON (kemungkinan endpoint belum digunakan atau ralat pelayan) — cuba muat semula halaman, dan jika masih gagal, hubungi pasukan teknikal.",
    th: "เซิร์ฟเวอร์ตอบกลับสถานะ {status} โดยไม่มีเนื้อหา JSON (endpoint อาจยังไม่ได้ deploy หรือเซิร์ฟเวอร์ผิดพลาด) — ลองรีเฟรชหน้า แล้วติดต่อทีมเทคนิคหากยังไม่สำเร็จ",
    fil: "Sumagot ang server ng status {status} nang walang JSON body (posibleng hindi pa na-deploy ang endpoint o may error ang server) — subukang i-refresh ang page, at kontakin ang technical team kung patuloy pa ring nabibigo.",
    vi: "Máy chủ phản hồi trạng thái {status} không có nội dung JSON (endpoint có thể chưa được triển khai hoặc máy chủ lỗi) — thử tải lại trang, và liên hệ đội kỹ thuật nếu vẫn thất bại.",
  },
  "transactions.error.genericFailStatus": {
    id: "Gagal (status {status}).",
    en: "Failed (status {status}).",
    ms: "Gagal (status {status}).",
    th: "ล้มเหลว (สถานะ {status})",
    fil: "Nabigo (status {status}).",
    vi: "Thất bại (trạng thái {status}).",
  },
});
