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
  "transactions.pageSubtitle": { id: "Seluruh transaksi Rental, F&B, dan Produk yang diinput kasir — PPOB akan muncul di sini setelah modulnya dibangun. Hapus permanen hanya bisa dilakukan akun Superuser.", en: "All Rental, F&B, and Product transactions entered by cashiers — PPOB will appear here once that module is built. Permanent deletion is only available to Superuser accounts.", ms: "Semua transaksi Sewa, F&B, dan Produk yang dimasukkan oleh juruwang — PPOB akan muncul di sini selepas modul tersebut dibina. Padam kekal hanya boleh dilakukan oleh akaun Superuser.", th: "ธุรกรรมเช่า, F&B และสินค้าทั้งหมดที่แคชเชียร์บันทึกไว้ — PPOB จะปรากฏที่นี่หลังจากโมดูลนั้นถูกสร้างขึ้น การลบถาวรทำได้เฉพาะบัญชี Superuser เท่านั้น", fil: "Lahat ng transaksyon sa Rental, F&B, at Produkto na inilagay ng cashier — lalabas ang PPOB dito kapag natapos na ang module nito. Ang permanenteng pagbura ay para lang sa Superuser account.", vi: "Toàn bộ giao dịch Thuê, F&B và Sản phẩm do thu ngân nhập — PPOB sẽ xuất hiện ở đây sau khi mô-đun đó được xây dựng xong. Chỉ tài khoản Superuser mới có thể xóa vĩnh viễn." },

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
  "transactions.stat.rentalRevenue": { id: "Rental Revenue", en: "Rental Revenue", ms: "Hasil Sewa", th: "รายได้จากการเช่า", fil: "Kita sa Rental", vi: "Doanh thu cho thuê" },
  "transactions.stat.fnbRevenue": { id: "F&B Revenue", en: "F&B Revenue", ms: "Hasil F&B", th: "รายได้ F&B", fil: "Kita sa F&B", vi: "Doanh thu F&B" },
  "transactions.stat.ppobRevenue": { id: "PPOB Revenue", en: "PPOB Revenue", ms: "Hasil PPOB", th: "รายได้ PPOB", fil: "Kita sa PPOB", vi: "Doanh thu PPOB" },
  "transactions.stat.otherProducts": { id: "Produk/Lainnya", en: "Product/Other", ms: "Produk/Lain-lain", th: "สินค้า/อื่นๆ", fil: "Produkto/Iba pa", vi: "Sản phẩm/Khác" },
  "transactions.stat.discount": { id: "Diskon", en: "Discount", ms: "Diskaun", th: "ส่วนลด", fil: "Diskwento", vi: "Giảm giá" },
  "transactions.stat.tax": { id: "Pajak", en: "Tax", ms: "Cukai", th: "ภาษี", fil: "Buwis", vi: "Thuế" },
  "transactions.stat.refund": { id: "Refund", en: "Refund", ms: "Bayaran Balik", th: "การคืนเงิน", fil: "Refund", vi: "Hoàn tiền" },

  // --- Table columns (Transaction List + Cashier Performance) ---
  "transactions.col.time": { id: "Waktu", en: "Time", ms: "Masa", th: "เวลา", fil: "Oras", vi: "Thời gian" },
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
  "transactions.action.void": { id: "Void", en: "Void", ms: "Batal", th: "ยกเลิกรายการ", fil: "Void", vi: "Hủy giao dịch" },
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
});
