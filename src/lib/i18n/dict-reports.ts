import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/reports page (Laporan & Analitik) — sales, rental, home
 * rental, inventory/COGS, customer, and expense report tabs. Registered as a side effect on
 * import; import this file from the reports page before any component calls
 * useDashboardLang().t().
 */
registerDict({
  // --- Page header ---
  "reports.title": { id: "Laporan & Analitik", en: "Reports & Analytics", ms: "Laporan & Analitik", th: "รายงานและการวิเคราะห์", fil: "Mga Ulat at Analytics", vi: "Báo cáo & Phân tích" },
  "reports.subtitle": { id: "Laporan operasional per periode — penjualan, rental, inventori/HPP, dan pelanggan.", en: "Operational reports by period — sales, rentals, inventory/COGS, and customers.", ms: "Laporan operasi mengikut tempoh — jualan, sewa, inventori/HPP, dan pelanggan.", th: "รายงานการดำเนินงานตามช่วงเวลา — ยอดขาย การเช่า สินค้าคงคลัง/ต้นทุนขาย และลูกค้า", fil: "Mga ulat sa operasyon kada period — benta, rental, imbentaryo/COGS, at customer.", vi: "Báo cáo vận hành theo kỳ — doanh số, cho thuê, tồn kho/giá vốn và khách hàng." },

  // --- Tabs ---
  "reports.tab.sales": { id: "Penjualan", en: "Sales", ms: "Jualan", th: "ยอดขาย", fil: "Benta", vi: "Doanh số" },
  "reports.tab.rental": { id: "Rental", en: "Rental", ms: "Sewa", th: "เช่า", fil: "Rental", vi: "Cho thuê" },
  "reports.tab.homeRental": { id: "Home Rental", en: "Home Rental", ms: "Sewa Rumah", th: "เช่าถึงบ้าน", fil: "Home Rental", vi: "Cho thuê tại nhà" },
  "reports.tab.inventory": { id: "Inventori & HPP", en: "Inventory & COGS", ms: "Inventori & HPP", th: "สินค้าคงคลังและต้นทุนขาย", fil: "Imbentaryo at COGS", vi: "Tồn kho & Giá vốn" },
  "reports.tab.customers": { id: "Pelanggan", en: "Customers", ms: "Pelanggan", th: "ลูกค้า", fil: "Customer", vi: "Khách hàng" },
  "reports.tab.expenses": { id: "Beban", en: "Expenses", ms: "Perbelanjaan", th: "ค่าใช้จ่าย", fil: "Gastos", vi: "Chi phí" },

  // --- Date range picker ---
  "reports.dateFrom": { id: "Dari Tanggal", en: "From Date", ms: "Dari Tarikh", th: "จากวันที่", fil: "Mula sa Petsa", vi: "Từ ngày" },
  "reports.dateTo": { id: "Sampai Tanggal", en: "To Date", ms: "Hingga Tarikh", th: "ถึงวันที่", fil: "Hanggang Petsa", vi: "Đến ngày" },
  "reports.apply": { id: "Terapkan", en: "Apply", ms: "Gunakan", th: "นำไปใช้", fil: "I-apply", vi: "Áp dụng" },

  // --- Shared empty states / units ---
  "reports.noDataPeriod": { id: "Tidak ada data pada periode ini.", en: "No data for this period.", ms: "Tiada data untuk tempoh ini.", th: "ไม่มีข้อมูลในช่วงเวลานี้", fil: "Walang data para sa period na ito.", vi: "Không có dữ liệu trong khoảng thời gian này." },
  "reports.noData": { id: "Tidak ada data.", en: "No data.", ms: "Tiada data.", th: "ไม่มีข้อมูล", fil: "Walang data.", vi: "Không có dữ liệu." },
  "reports.minutesSuffix": { id: "menit", en: "min", ms: "minit", th: "นาที", fil: "minuto", vi: "phút" },

  // --- Shared table headers ---
  "reports.table.unit": { id: "Unit", en: "Unit", ms: "Unit", th: "เครื่อง", fil: "Unit", vi: "Máy" },
  "reports.table.type": { id: "Tipe", en: "Type", ms: "Jenis", th: "ประเภท", fil: "Uri", vi: "Loại" },
  "reports.table.sessions": { id: "Sesi", en: "Sessions", ms: "Sesi", th: "เซสชัน", fil: "Session", vi: "Phiên" },
  "reports.table.revenue": { id: "Pendapatan", en: "Revenue", ms: "Hasil", th: "รายได้", fil: "Kita", vi: "Doanh thu" },
  "reports.table.transactionCount": { id: "Jumlah Transaksi", en: "Transaction Count", ms: "Jumlah Transaksi", th: "จำนวนธุรกรรม", fil: "Bilang ng Transaksyon", vi: "Số giao dịch" },
  "reports.table.product": { id: "Produk", en: "Product", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "reports.table.qtySold": { id: "Qty Terjual", en: "Qty Sold", ms: "Kuantiti Dijual", th: "จำนวนที่ขาย", fil: "Qty na Nabenta", vi: "SL đã bán" },
  "reports.table.cogs": { id: "HPP", en: "COGS", ms: "HPP", th: "ต้นทุนขาย", fil: "COGS", vi: "Giá vốn" },
  "reports.table.margin": { id: "Margin", en: "Margin", ms: "Margin", th: "กำไร", fil: "Margin", vi: "Lợi nhuận" },
  "reports.table.marginPercent": { id: "Margin %", en: "Margin %", ms: "Margin %", th: "กำไร %", fil: "Margin %", vi: "Lợi nhuận %" },
  "reports.table.name": { id: "Nama", en: "Name", ms: "Nama", th: "ชื่อ", fil: "Pangalan", vi: "Tên" },
  "reports.table.tier": { id: "Tier", en: "Tier", ms: "Tier", th: "ระดับ", fil: "Tier", vi: "Hạng" },
  "reports.table.totalSpending": { id: "Total Belanja", en: "Total Spending", ms: "Jumlah Perbelanjaan", th: "ยอดใช้จ่ายรวม", fil: "Kabuuang Gastos", vi: "Tổng chi tiêu" },
  "reports.table.loyaltyPoints": { id: "Poin Loyalti", en: "Loyalty Points", ms: "Mata Kesetiaan", th: "คะแนนสะสม", fil: "Loyalty Points", vi: "Điểm thân thiết" },
  "reports.table.visitsPeriod": { id: "Kunjungan (Periode)", en: "Visits (Period)", ms: "Kunjungan (Tempoh)", th: "จำนวนครั้งที่มา (ช่วงเวลา)", fil: "Bisita (Period)", vi: "Lượt ghé (kỳ)" },
  "reports.table.no": { id: "No.", en: "No.", ms: "No.", th: "ลำดับ", fil: "No.", vi: "STT" },
  "reports.table.date": { id: "Tanggal", en: "Date", ms: "Tarikh", th: "วันที่", fil: "Petsa", vi: "Ngày" },
  "reports.table.account": { id: "Akun", en: "Account", ms: "Akaun", th: "บัญชี", fil: "Account", vi: "Tài khoản" },
  "reports.table.description": { id: "Deskripsi", en: "Description", ms: "Penerangan", th: "รายละเอียด", fil: "Deskripsyon", vi: "Mô tả" },
  "reports.table.supplierPayee": { id: "Supplier/Payee", en: "Supplier/Payee", ms: "Pembekal/Penerima", th: "ผู้จัดจำหน่าย/ผู้รับเงิน", fil: "Supplier/Payee", vi: "Nhà cung cấp/Người nhận" },
  "reports.table.nominal": { id: "Nominal", en: "Amount", ms: "Jumlah", th: "จำนวนเงิน", fil: "Halaga", vi: "Số tiền" },
  "reports.table.status": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },

  // --- Sales tab ---
  "reports.sales.totalRevenue": { id: "Total Pendapatan", en: "Total Revenue", ms: "Jumlah Hasil", th: "รายได้รวม", fil: "Kabuuang Kita", vi: "Tổng doanh thu" },
  "reports.sales.rentalRevenue": { id: "Pendapatan Rental", en: "Rental Revenue", ms: "Hasil Sewa", th: "รายได้จากการเช่า", fil: "Kita sa Rental", vi: "Doanh thu cho thuê" },
  "reports.sales.posRevenue": { id: "Pendapatan POS / F&B", en: "POS / F&B Revenue", ms: "Hasil POS / F&B", th: "รายได้ POS / F&B", fil: "Kita sa POS / F&B", vi: "Doanh thu POS / F&B" },
  "reports.sales.paidOrders": { id: "Jumlah Order Lunas", en: "Paid Orders", ms: "Jumlah Pesanan Selesai Bayar", th: "จำนวนออเดอร์ที่ชำระแล้ว", fil: "Bilang ng Bayad na Order", vi: "Số đơn đã thanh toán" },
  "reports.sales.dailyTrend": { id: "Tren Pendapatan Harian", en: "Daily Revenue Trend", ms: "Trend Hasil Harian", th: "แนวโน้มรายได้รายวัน", fil: "Daily Revenue Trend", vi: "Xu hướng doanh thu hàng ngày" },
  "reports.sales.byPaymentMethod": { id: "Pendapatan per Metode Pembayaran", en: "Revenue by Payment Method", ms: "Hasil mengikut Kaedah Pembayaran", th: "รายได้ตามวิธีการชำระเงิน", fil: "Kita ayon sa Paraan ng Bayad", vi: "Doanh thu theo phương thức thanh toán" },
  "reports.sales.discountTaxService": { id: "Diskon, Pajak & Service Charge", en: "Discount, Tax & Service Charge", ms: "Diskaun, Cukai & Caj Perkhidmatan", th: "ส่วนลด ภาษี และค่าบริการ", fil: "Diskwento, Buwis at Service Charge", vi: "Chiết khấu, thuế & phí dịch vụ" },
  "reports.sales.totalDiscount": { id: "Total Diskon", en: "Total Discount", ms: "Jumlah Diskaun", th: "ส่วนลดรวม", fil: "Kabuuang Diskwento", vi: "Tổng chiết khấu" },
  "reports.sales.totalTax": { id: "Total Pajak", en: "Total Tax", ms: "Jumlah Cukai", th: "ภาษีรวม", fil: "Kabuuang Buwis", vi: "Tổng thuế" },
  "reports.sales.totalServiceCharge": { id: "Total Service Charge", en: "Total Service Charge", ms: "Jumlah Caj Perkhidmatan", th: "ค่าบริการรวม", fil: "Kabuuang Service Charge", vi: "Tổng phí dịch vụ" },

  // --- Rental tab ---
  "reports.rental.totalRevenue": { id: "Total Pendapatan Rental", en: "Total Rental Revenue", ms: "Jumlah Hasil Sewa", th: "รายได้รวมจากการเช่า", fil: "Kabuuang Kita sa Rental", vi: "Tổng doanh thu cho thuê" },
  "reports.rental.totalSessions": { id: "Total Sesi Selesai", en: "Total Completed Sessions", ms: "Jumlah Sesi Selesai", th: "จำนวนเซสชันที่เสร็จสิ้น", fil: "Kabuuang Natapos na Session", vi: "Tổng số phiên hoàn tất" },
  "reports.rental.avgDuration": { id: "Rata-rata Durasi", en: "Average Duration", ms: "Purata Tempoh", th: "ระยะเวลาเฉลี่ย", fil: "Average na Tagal", vi: "Thời lượng trung bình" },
  "reports.rental.unitCount": { id: "Jumlah Unit PS", en: "Number of PS Units", ms: "Jumlah Unit PS", th: "จำนวนเครื่อง PS", fil: "Bilang ng Unit ng PS", vi: "Số lượng máy PS" },
  "reports.rental.revenuePerUnit": { id: "Pendapatan per Unit PS", en: "Revenue per PS Unit", ms: "Hasil per Unit PS", th: "รายได้ต่อเครื่อง PS", fil: "Kita bawat Unit ng PS", vi: "Doanh thu theo từng máy PS" },
  "reports.rental.noSessions": { id: "Belum ada sesi selesai pada periode ini.", en: "No completed sessions yet in this period.", ms: "Belum ada sesi selesai pada tempoh ini.", th: "ยังไม่มีเซสชันที่เสร็จสิ้นในช่วงเวลานี้", fil: "Wala pang natapos na session sa period na ito.", vi: "Chưa có phiên nào hoàn tất trong kỳ này." },

  // --- Home rental tab ---
  "reports.homeRental.totalRevenue": { id: "Total Pendapatan Home Rental", en: "Total Home Rental Revenue", ms: "Jumlah Hasil Sewa Rumah", th: "รายได้รวมจากเช่าถึงบ้าน", fil: "Kabuuang Kita sa Home Rental", vi: "Tổng doanh thu cho thuê tại nhà" },
  "reports.homeRental.transactions": { id: "Transaksi", en: "Transactions", ms: "Transaksi", th: "ธุรกรรม", fil: "Transaksyon", vi: "Giao dịch" },
  "reports.homeRental.lateFee": { id: "Denda Keterlambatan", en: "Late Fee", ms: "Denda Lewat", th: "ค่าปรับล่าช้า", fil: "Multa sa Late", vi: "Phí trễ hạn" },
  "reports.homeRental.damageFee": { id: "Penggantian Kerusakan", en: "Damage Compensation", ms: "Ganti Rugi Kerosakan", th: "ค่าชดเชยความเสียหาย", fil: "Bayad sa Sira", vi: "Bồi thường hư hỏng" },
  "reports.homeRental.revenueByCategory": { id: "Rincian Pendapatan per Kategori", en: "Revenue Breakdown by Category", ms: "Pecahan Hasil mengikut Kategori", th: "รายละเอียดรายได้ตามหมวดหมู่", fil: "Breakdown ng Kita ayon sa Kategorya", vi: "Chi tiết doanh thu theo danh mục" },
  "reports.homeRental.rentalFeeLabel": { id: "Sewa (12 jam / 24 jam / mingguan / tambahan hari)", en: "Rental (12hr / 24hr / weekly / extra day)", ms: "Sewa (12 jam / 24 jam / mingguan / hari tambahan)", th: "ค่าเช่า (12 ชม. / 24 ชม. / รายสัปดาห์ / วันเพิ่ม)", fil: "Rental (12 oras / 24 oras / lingguhan / extra na araw)", vi: "Thuê (12 giờ / 24 giờ / theo tuần / ngày thêm)" },
  "reports.homeRental.deliveryFee": { id: "Biaya Antar (Delivery)", en: "Delivery Fee", ms: "Bayaran Penghantaran", th: "ค่าจัดส่ง", fil: "Bayad sa Delivery", vi: "Phí giao hàng" },
  "reports.homeRental.pickupFee": { id: "Biaya Jemput (Pickup)", en: "Pickup Fee", ms: "Bayaran Pengambilan", th: "ค่ารับกลับ", fil: "Bayad sa Pickup", vi: "Phí lấy hàng" },
  "reports.homeRental.discount": { id: "Diskon", en: "Discount", ms: "Diskaun", th: "ส่วนลด", fil: "Diskwento", vi: "Chiết khấu" },
  "reports.homeRental.revenueByType": { id: "Pendapatan per Tipe Produk (PS3/PS4/PS5/Playbox/TV/Accessory/Package)", en: "Revenue by Product Type (PS3/PS4/PS5/Playbox/TV/Accessory/Package)", ms: "Hasil mengikut Jenis Produk (PS3/PS4/PS5/Playbox/TV/Accessory/Package)", th: "รายได้ตามประเภทสินค้า (PS3/PS4/PS5/Playbox/TV/Accessory/Package)", fil: "Kita ayon sa Uri ng Produkto (PS3/PS4/PS5/Playbox/TV/Accessory/Package)", vi: "Doanh thu theo loại sản phẩm (PS3/PS4/PS5/Playbox/TV/Accessory/Package)" },
  "reports.homeRental.noTransactions": { id: "Belum ada transaksi Home Rental pada periode ini.", en: "No Home Rental transactions yet in this period.", ms: "Belum ada transaksi Sewa Rumah pada tempoh ini.", th: "ยังไม่มีธุรกรรมเช่าถึงบ้านในช่วงเวลานี้", fil: "Wala pang Home Rental transaksyon sa period na ito.", vi: "Chưa có giao dịch cho thuê tại nhà trong kỳ này." },
  "reports.homeRental.deposit": { id: "Deposit", en: "Deposit", ms: "Deposit", th: "เงินมัดจำ", fil: "Deposit", vi: "Tiền cọc" },
  "reports.homeRental.depositHeld": { id: "Ditahan", en: "Held", ms: "Ditahan", th: "ถูกกักไว้", fil: "Naka-hold", vi: "Đang giữ" },
  "reports.homeRental.depositReleased": { id: "Dilepas", en: "Released", ms: "Dilepaskan", th: "คืนแล้ว", fil: "Na-release", vi: "Đã hoàn trả" },
  "reports.homeRental.depositPartial": { id: "Dipotong Sebagian", en: "Partially Deducted", ms: "Dipotong Sebahagian", th: "หักบางส่วน", fil: "Bahagyang Nabawasan", vi: "Trừ một phần" },
  "reports.homeRental.depositForfeited": { id: "Hangus", en: "Forfeited", ms: "Hangus", th: "ริบ", fil: "Nawala", vi: "Mất cọc" },

  // --- Inventory tab ---
  "reports.inventory.productRevenue": { id: "Pendapatan Produk", en: "Product Revenue", ms: "Hasil Produk", th: "รายได้จากสินค้า", fil: "Kita sa Produkto", vi: "Doanh thu sản phẩm" },
  "reports.inventory.totalCogs": { id: "Total HPP", en: "Total COGS", ms: "Jumlah HPP", th: "ต้นทุนขายรวม", fil: "Kabuuang COGS", vi: "Tổng giá vốn" },
  "reports.inventory.grossMargin": { id: "Margin Kotor", en: "Gross Margin", ms: "Margin Kasar", th: "กำไรขั้นต้น", fil: "Gross Margin", vi: "Lợi nhuận gộp" },
  "reports.inventory.marginPerProduct": { id: "Margin per Produk", en: "Margin per Product", ms: "Margin per Produk", th: "กำไรต่อสินค้า", fil: "Margin bawat Produkto", vi: "Lợi nhuận theo sản phẩm" },
  "reports.inventory.noProductSales": { id: "Belum ada penjualan produk pada periode ini.", en: "No product sales yet in this period.", ms: "Belum ada jualan produk pada tempoh ini.", th: "ยังไม่มียอดขายสินค้าในช่วงเวลานี้", fil: "Wala pang benta ng produkto sa period na ito.", vi: "Chưa có sản phẩm bán ra trong kỳ này." },
  "reports.inventory.waste": { id: "Waste / Kerusakan Stok", en: "Waste / Damaged Stock", ms: "Pembaziran / Stok Rosak", th: "ของเสีย / สินค้าเสียหาย", fil: "Waste / Sirang Stock", vi: "Hao hụt / Hỏng hàng" },
  "reports.inventory.noWaste": { id: "Tidak ada catatan waste pada periode ini.", en: "No waste recorded for this period.", ms: "Tiada rekod pembaziran untuk tempoh ini.", th: "ไม่มีบันทึกของเสียในช่วงเวลานี้", fil: "Walang naitalang waste sa period na ito.", vi: "Không có ghi nhận hao hụt trong kỳ này." },
  "reports.inventory.lowStockNow": { id: "Stok Menipis (Saat Ini)", en: "Low Stock (Current)", ms: "Stok Rendah (Semasa)", th: "สินค้าใกล้หมด (ปัจจุบัน)", fil: "Mababang Stock (Ngayon)", vi: "Tồn kho thấp (hiện tại)" },
  "reports.inventory.minShort": { id: "min", en: "min", ms: "min", th: "ขั้นต่ำ", fil: "min", vi: "tối thiểu" },
  "reports.inventory.allStockSafe": { id: "Semua stok aman.", en: "All stock levels are healthy.", ms: "Semua stok berada pada tahap selamat.", th: "สต็อกทั้งหมดอยู่ในระดับปลอดภัย", fil: "Ligtas ang lahat ng stock.", vi: "Tất cả tồn kho đều ổn." },

  // --- Customer tab ---
  "reports.customer.totalRegistered": { id: "Total Pelanggan Terdaftar", en: "Total Registered Customers", ms: "Jumlah Pelanggan Berdaftar", th: "จำนวนลูกค้าที่ลงทะเบียนทั้งหมด", fil: "Kabuuang Rehistradong Customer", vi: "Tổng số khách hàng đã đăng ký" },
  "reports.customer.tierDistribution": { id: "Distribusi Membership Tier", en: "Membership Tier Distribution", ms: "Taburan Tier Keahlian", th: "การกระจายระดับสมาชิก", fil: "Distribution ng Membership Tier", vi: "Phân bổ hạng thành viên" },
  "reports.customer.topCustomers": { id: "Top Pelanggan (Total Belanja Sepanjang Waktu)", en: "Top Customers (Total Spending All Time)", ms: "Pelanggan Teratas (Jumlah Perbelanjaan Sepanjang Masa)", th: "ลูกค้าอันดับต้น (ยอดใช้จ่ายรวมตลอดกาล)", fil: "Top Customer (Kabuuang Gastos Buong Panahon)", vi: "Khách hàng hàng đầu (tổng chi tiêu mọi thời điểm)" },
  "reports.customer.noCustomers": { id: "Belum ada pelanggan.", en: "No customers yet.", ms: "Belum ada pelanggan.", th: "ยังไม่มีลูกค้า", fil: "Wala pang customer.", vi: "Chưa có khách hàng." },

  // --- Expense tab ---
  "reports.expense.total": { id: "Total Expense", en: "Total Expense", ms: "Jumlah Perbelanjaan", th: "ค่าใช้จ่ายรวม", fil: "Kabuuang Expense", vi: "Tổng chi phí" },
  "reports.expense.totalRevenueSamePeriod": { id: "Total Revenue (periode sama)", en: "Total Revenue (same period)", ms: "Jumlah Hasil (tempoh sama)", th: "รายได้รวม (ช่วงเวลาเดียวกัน)", fil: "Kabuuang Revenue (parehong period)", vi: "Tổng doanh thu (cùng kỳ)" },
  "reports.expense.vsRevenue": { id: "Expense vs Revenue", en: "Expense vs Revenue", ms: "Perbelanjaan vs Hasil", th: "ค่าใช้จ่ายเทียบรายได้", fil: "Expense vs Revenue", vi: "Chi phí so với doanh thu" },
  "reports.expense.netProfitSamePeriod": { id: "Laba Bersih (periode sama)", en: "Net Profit (same period)", ms: "Untung Bersih (tempoh sama)", th: "กำไรสุทธิ (ช่วงเวลาเดียวกัน)", fil: "Net Profit (parehong period)", vi: "Lợi nhuận ròng (cùng kỳ)" },
  "reports.expense.trend": { id: "Expense Trend", en: "Expense Trend", ms: "Trend Perbelanjaan", th: "แนวโน้มค่าใช้จ่าย", fil: "Expense Trend", vi: "Xu hướng chi phí" },
  "reports.expense.byCategory": { id: "Expense by Category", en: "Expense by Category", ms: "Perbelanjaan mengikut Kategori", th: "ค่าใช้จ่ายตามหมวดหมู่", fil: "Expense ayon sa Kategorya", vi: "Chi phí theo danh mục" },
  "reports.expense.byAccount": { id: "Expense by Account (COA)", en: "Expense by Account (COA)", ms: "Perbelanjaan mengikut Akaun (COA)", th: "ค่าใช้จ่ายตามบัญชี (COA)", fil: "Expense ayon sa Account (COA)", vi: "Chi phí theo tài khoản (COA)" },
  "reports.expense.bySupplier": { id: "Expense by Supplier / Payee", en: "Expense by Supplier / Payee", ms: "Perbelanjaan mengikut Pembekal / Penerima Bayaran", th: "ค่าใช้จ่ายตามผู้จัดจำหน่าย / ผู้รับเงิน", fil: "Expense ayon sa Supplier / Payee", vi: "Chi phí theo nhà cung cấp / người nhận" },
  "reports.expense.byPaymentMethod": { id: "Expense by Payment Method", en: "Expense by Payment Method", ms: "Perbelanjaan mengikut Kaedah Pembayaran", th: "ค่าใช้จ่ายตามวิธีการชำระเงิน", fil: "Expense ayon sa Paraan ng Bayad", vi: "Chi phí theo phương thức thanh toán" },
  "reports.expense.byBranch": { id: "Expense by Branch", en: "Expense by Branch", ms: "Perbelanjaan mengikut Cawangan", th: "ค่าใช้จ่ายตามสาขา", fil: "Expense ayon sa Branch", vi: "Chi phí theo chi nhánh" },
  "reports.expense.byCostCenter": { id: "Expense by Cost Center / Unit PS", en: "Expense by Cost Center / PS Unit", ms: "Perbelanjaan mengikut Pusat Kos / Unit PS", th: "ค่าใช้จ่ายตามศูนย์ต้นทุน / เครื่อง PS", fil: "Expense ayon sa Cost Center / Unit ng PS", vi: "Chi phí theo trung tâm chi phí / máy PS" },
  "reports.expense.detail": { id: "Expense Detail", en: "Expense Detail", ms: "Butiran Perbelanjaan", th: "รายละเอียดค่าใช้จ่าย", fil: "Detalye ng Expense", vi: "Chi tiết chi phí" },
  "reports.expense.noExpenses": { id: "Belum ada expense pada periode ini.", en: "No expenses yet in this period.", ms: "Belum ada perbelanjaan pada tempoh ini.", th: "ยังไม่มีค่าใช้จ่ายในช่วงเวลานี้", fil: "Wala pang expense sa period na ito.", vi: "Chưa có chi phí trong kỳ này." },

  // --- Tab (cont.) ---
  "reports.tab.financialHealth": { id: "Kesehatan Keuangan", en: "Financial Health", ms: "Kesihatan Kewangan", th: "สุขภาพทางการเงิน", fil: "Kalusugan ng Pananalapi", vi: "Sức khỏe tài chính" },

  // --- FinancialHealthTab ---
  "reports.health.profitability": { id: "Profitabilitas", en: "Profitability", ms: "Keuntungan", th: "ความสามารถในการทำกำไร", fil: "Profitability", vi: "Khả năng sinh lời" },
  "reports.health.grossMargin": { id: "Margin Kotor (Gross Margin)", en: "Gross Margin", ms: "Margin Kasar", th: "อัตรากำไรขั้นต้น", fil: "Gross Margin", vi: "Biên lợi nhuận gộp" },
  "reports.health.grossMarginHint": { id: "Laba kotor ÷ pendapatan bersih", en: "Gross profit ÷ net revenue", ms: "Untung kasar ÷ hasil bersih", th: "กำไรขั้นต้น ÷ รายได้สุทธิ", fil: "Gross profit ÷ net revenue", vi: "Lợi nhuận gộp ÷ doanh thu thuần" },
  "reports.health.netMargin": { id: "Margin Bersih (Net Margin)", en: "Net Margin", ms: "Margin Bersih", th: "อัตรากำไรสุทธิ", fil: "Net Margin", vi: "Biên lợi nhuận ròng" },
  "reports.health.netMarginHint": { id: "Laba bersih ÷ pendapatan bersih", en: "Net profit ÷ net revenue", ms: "Untung bersih ÷ hasil bersih", th: "กำไรสุทธิ ÷ รายได้สุทธิ", fil: "Net profit ÷ net revenue", vi: "Lợi nhuận ròng ÷ doanh thu thuần" },
  "reports.health.bepAchievement": { id: "Pencapaian Target BEP", en: "BEP Target Achievement", ms: "Pencapaian Sasaran BEP", th: "การบรรลุเป้าหมาย BEP", fil: "Naabot na Target BEP", vi: "Mức đạt mục tiêu BEP" },
  "reports.health.bepHintPrefix": { id: "Target bulanan", en: "Monthly target", ms: "Sasaran bulanan", th: "เป้าหมายรายเดือน", fil: "Target buwanan", vi: "Mục tiêu hàng tháng" },
  "reports.health.bepNotSet": { id: "Target Omzet Bulanan belum diatur di Pengaturan", en: "Monthly Revenue Target isn't set in Settings yet", ms: "Sasaran Omzet Bulanan belum ditetapkan di Tetapan", th: "ยังไม่ได้ตั้งเป้าหมายยอดขายรายเดือนในการตั้งค่า", fil: "Hindi pa naitakda ang Monthly Revenue Target sa Setting", vi: "Chưa thiết lập Mục tiêu doanh thu hàng tháng trong Cài đặt" },
  "reports.health.liquidity": { id: "Likuiditas", en: "Liquidity", ms: "Kecairan", th: "สภาพคล่อง", fil: "Liquidity", vi: "Thanh khoản" },
  "reports.health.currentRatio": { id: "Current Ratio", en: "Current Ratio", ms: "Current Ratio", th: "Current Ratio", fil: "Current Ratio", vi: "Hệ số thanh toán hiện hành" },
  "reports.health.currentRatioHint": {
    id: "Aset lancar ÷ kewajiban lancar — kemampuan bayar kewajiban jangka pendek",
    en: "Current assets ÷ current liabilities — ability to cover short-term obligations",
    ms: "Aset semasa ÷ liabiliti semasa — keupayaan membayar liabiliti jangka pendek",
    th: "สินทรัพย์หมุนเวียน ÷ หนี้สินหมุนเวียน — ความสามารถในการชำระหนี้ระยะสั้น",
    fil: "Current assets ÷ current liabilities — kakayahang bayaran ng obligasyong panandalian",
    vi: "Tài sản ngắn hạn ÷ nợ ngắn hạn — khả năng thanh toán nghĩa vụ ngắn hạn",
  },
  "reports.health.cashRatio": { id: "Cash Ratio", en: "Cash Ratio", ms: "Cash Ratio", th: "Cash Ratio", fil: "Cash Ratio", vi: "Hệ số thanh toán tiền mặt" },
  "reports.health.cashRatioHint": {
    id: "Kas & bank ÷ kewajiban lancar — kemampuan bayar pakai kas langsung",
    en: "Cash & bank ÷ current liabilities — ability to pay using cash on hand alone",
    ms: "Tunai & bank ÷ liabiliti semasa — keupayaan membayar terus guna tunai",
    th: "เงินสดและธนาคาร ÷ หนี้สินหมุนเวียน — ความสามารถในการชำระด้วยเงินสดโดยตรง",
    fil: "Cash at bank ÷ current liabilities — kakayahang magbayad gamit lang ang cash",
    vi: "Tiền mặt & ngân hàng ÷ nợ ngắn hạn — khả năng thanh toán chỉ bằng tiền mặt",
  },
  "reports.health.currentLiabilities": { id: "Total Kewajiban Lancar", en: "Total Current Liabilities", ms: "Jumlah Liabiliti Semasa", th: "รวมหนี้สินหมุนเวียน", fil: "Kabuuang Current Liabilities", vi: "Tổng nợ ngắn hạn" },
  "reports.health.efficiency": { id: "Efisiensi Operasional", en: "Operational Efficiency", ms: "Kecekapan Operasi", th: "ประสิทธิภาพการดำเนินงาน", fil: "Operational Efficiency", vi: "Hiệu quả vận hành" },
  "reports.health.cogsRatio": { id: "Rasio HPP (COGS) / Pendapatan", en: "COGS / Revenue Ratio", ms: "Nisbah HPP (COGS) / Hasil", th: "อัตราส่วนต้นทุนขาย (COGS) / รายได้", fil: "COGS / Revenue Ratio", vi: "Tỷ lệ giá vốn (COGS) / doanh thu" },
  "reports.health.cogsRatioHint": { id: "Makin rendah makin efisien pembelian/produksi", en: "Lower is more efficient purchasing/production", ms: "Semakin rendah semakin cekap pembelian/pengeluaran", th: "ยิ่งต่ำยิ่งมีประสิทธิภาพในการจัดซื้อ/ผลิต", fil: "Mas mababa, mas efficient ang pagbili/produksyon", vi: "Càng thấp càng hiệu quả trong mua hàng/sản xuất" },
  "reports.health.opexRatio": { id: "Rasio Beban Operasional / Pendapatan", en: "Operating Expense / Revenue Ratio", ms: "Nisbah Perbelanjaan Operasi / Hasil", th: "อัตราส่วนค่าใช้จ่ายดำเนินงาน / รายได้", fil: "Operating Expense / Revenue Ratio", vi: "Tỷ lệ chi phí vận hành / doanh thu" },
  "reports.health.opexRatioHint": { id: "Di luar HPP — gaji, sewa, listrik, dll.", en: "Excludes COGS — salaries, rent, electricity, etc.", ms: "Di luar HPP — gaji, sewa, elektrik, dll.", th: "ไม่รวมต้นทุนขาย — เงินเดือน ค่าเช่า ค่าไฟ ฯลฯ", fil: "Hindi kasama ang COGS — sahod, upa, kuryente, atbp.", vi: "Không bao gồm giá vốn — lương, thuê mặt bằng, điện, v.v." },
  "reports.health.unitUtilization": { id: "Utilisasi Unit PS", en: "PS Unit Utilization", ms: "Penggunaan Unit PS", th: "การใช้งานเครื่อง PS", fil: "Utilization ng Unit ng PS", vi: "Tỷ lệ sử dụng máy PS" },
  "reports.health.unitUtilizationHint": {
    id: "Estimasi jam pakai vs jam tersedia (asumsi buka 24 jam) — {n} unit.",
    en: "Estimated hours used vs. available (assumes 24-hour operation) — {n} units.",
    ms: "Anggaran jam digunakan berbanding jam tersedia (andaian beroperasi 24 jam) — {n} unit.",
    th: "ประมาณชั่วโมงที่ใช้เทียบกับชั่วโมงที่มี (สมมติเปิด 24 ชม.) — {n} เครื่อง",
    fil: "Tinatayang oras na ginamit vs available (ipinapalagay 24-oras na operasyon) — {n} unit.",
    vi: "Ước tính số giờ sử dụng so với số giờ khả dụng (giả định hoạt động 24 giờ) — {n} máy.",
  },

  // --- Reports (terjemahan yang sebelumnya hilang) ---
  "reports.sales.recognizedOrders": { id: "Jumlah Order (lunas + sebagian)", en: "Number of Orders (paid + partial)", ms: "Bilangan Pesanan (lunas + sebahagian)", th: "จำนวนออร์เดอร์ (ชำระครบ + บางส่วน)", fil: "Bilang ng Order (bayad + bahagya)", vi: "Số đơn (đã trả đủ + một phần)" },
  "reports.sales.partialNote": { id: "{n} belum lunas · piutang {amount}", en: "{n} not fully paid · receivable {amount}", ms: "{n} belum lunas · penghutang {amount}", th: "{n} ยังชำระไม่ครบ · ลูกหนี้ {amount}", fil: "{n} hindi pa bayad nang buo · receivable {amount}", vi: "{n} chưa trả đủ · phải thu {amount}" },
  "reports.sales.reconTitle": { id: "Cocokkan dengan Accounting (Laba Rugi periode sama)", en: "Match with Accounting (Profit & Loss for the same period)", ms: "Padankan dengan Perakaunan (Untung Rugi tempoh yang sama)", th: "เทียบกับบัญชี (งบกำไรขาดทุนช่วงเดียวกัน)", fil: "Itugma sa Accounting (Profit & Loss ng parehong panahon)", vi: "Đối chiếu với Kế toán (Lãi lỗ cùng kỳ)" },
  "reports.sales.reconOrders": { id: "Penjualan kasir & rental (laporan ini)", en: "Cashier & rental sales (this report)", ms: "Jualan juruwang & sewaan (laporan ini)", th: "ยอดขายแคชเชียร์และค่าเช่า (รายงานนี้)", fil: "Benta ng kahera at rental (ulat na ito)", vi: "Doanh thu thu ngân & cho thuê (báo cáo này)" },
  "reports.sales.reconGl": { id: "Pendapatan usaha di Laba Rugi", en: "Operating revenue in Profit & Loss", ms: "Hasil operasi dalam Untung Rugi", th: "รายได้จากการดำเนินงานในงบกำไรขาดทุน", fil: "Operating revenue sa Profit & Loss", vi: "Doanh thu hoạt động trong Lãi lỗ" },
  "reports.sales.reconOther": { id: "Pendapatan lain-lain (47xx/7xxx, di luar pendapatan usaha)", en: "Other income (47xx/7xxx, outside operating revenue)", ms: "Pendapatan lain (47xx/7xxx, di luar hasil operasi)", th: "รายได้อื่น (47xx/7xxx นอกรายได้จากการดำเนินงาน)", fil: "Iba pang kita (47xx/7xxx, labas sa operating revenue)", vi: "Thu nhập khác (47xx/7xxx, ngoài doanh thu hoạt động)" },
  "reports.sales.reconNote": { id: "Selisih wajar karena laporan ini hanya berisi order kasir & rental (termasuk pajak & service charge), sedangkan Laba Rugi juga memuat fee PPOB, iuran membership, dan Home Rental. Selisih di luar itu → cek Accounting → Rekonsiliasi.", en: "A difference is expected because this report only contains cashier & rental orders (including tax & service charge), while Profit & Loss also includes PPOB fees, membership fees, and Home Rental. Any other difference → check Accounting → Reconciliation.", ms: "Selisih adalah wajar kerana laporan ini hanya mengandungi pesanan juruwang & sewaan (termasuk cukai & caj perkhidmatan), manakala Untung Rugi turut memuatkan yuran PPOB, yuran keahlian, dan Home Rental. Selisih selain itu → semak Perakaunan → Penyesuaian.", th: "ส่วนต่างเป็นเรื่องปกติ เพราะรายงานนี้มีเฉพาะออร์เดอร์แคชเชียร์และค่าเช่า (รวมภาษีและค่าบริการ) ส่วนงบกำไรขาดทุนรวมค่าธรรมเนียม PPOB ค่าสมาชิก และ Home Rental ด้วย ส่วนต่างอื่นนอกจากนี้ → ตรวจสอบที่ บัญชี → กระทบยอด", fil: "Inaasahan ang diperensya dahil order lang ng kahera at rental ang laman ng ulat na ito (kasama ang buwis at service charge), habang kasama rin sa Profit & Loss ang PPOB fee, membership fee, at Home Rental. Ibang diperensya → tingnan ang Accounting → Reconciliation.", vi: "Chênh lệch là bình thường vì báo cáo này chỉ gồm đơn thu ngân & cho thuê (kể cả thuế & phí dịch vụ), còn Lãi lỗ còn gồm phí PPOB, phí thành viên và Home Rental. Chênh lệch ngoài các khoản đó → kiểm tra Kế toán → Đối soát." },
  "reports.rental.excludedCancelled": { id: "{n} sesi dengan tagihan dibatalkan tidak dihitung", en: "{n} sessions with cancelled bills are not counted", ms: "{n} sesi dengan bil dibatalkan tidak dikira", th: "ไม่นับ {n} เซสชันที่ยกเลิกบิลแล้ว", fil: "Hindi binilang ang {n} session na may kinanselang bill", vi: "{n} phiên có hóa đơn bị hủy không được tính" },
  "reports.inventory.glCogs": { id: "HPP di Laba Rugi: {amount}", en: "COGS in Profit & Loss: {amount}", ms: "Kos jualan dalam Untung Rugi: {amount}", th: "ต้นทุนขายในงบกำไรขาดทุน: {amount}", fil: "COGS sa Profit & Loss: {amount}", vi: "Giá vốn trong Lãi lỗ: {amount}" },
  "reports.inventory.estimatedNote": { id: "* HPP bertanda bintang dihitung dengan harga modal SAAT INI (tidak ada catatan harga pokok per order — metode rata-rata, produk resep, atau order lama). HPP resmi ada di Laba Rugi; selisih kecil terhadapnya wajar.", en: "* COGS marked with an asterisk is calculated using the CURRENT cost price (no per-order cost record — average method, recipe products, or old orders). The official COGS is in Profit & Loss; a small difference from it is normal.", ms: "* Kos jualan bertanda bintang dikira dengan harga kos SEMASA (tiada rekod kos bagi setiap pesanan — kaedah purata, produk resipi, atau pesanan lama). Kos jualan rasmi ada dalam Untung Rugi; selisih kecil terhadapnya adalah wajar.", th: "* ต้นทุนขายที่มีเครื่องหมายดอกจันคำนวณด้วยราคาทุนปัจจุบัน (ไม่มีบันทึกต้นทุนต่อออร์เดอร์ — วิธีถัวเฉลี่ย สินค้าตามสูตร หรือออร์เดอร์เก่า) ต้นทุนขายที่เป็นทางการอยู่ในงบกำไรขาดทุน ส่วนต่างเล็กน้อยถือเป็นเรื่องปกติ", fil: "* Ang COGS na may asterisk ay kinuwenta gamit ang KASALUKUYANG cost price (walang tala ng cost kada order — average method, produktong may recipe, o lumang order). Nasa Profit & Loss ang opisyal na COGS; normal ang maliit na diperensya rito.", vi: "* Giá vốn có dấu sao được tính theo giá vốn HIỆN TẠI (không có ghi nhận giá vốn theo từng đơn — phương pháp bình quân, sản phẩm theo công thức, hoặc đơn cũ). Giá vốn chính thức nằm trong Lãi lỗ; chênh lệch nhỏ là bình thường." },
  "reports.customer.activePeriod": { id: "{n} bertransaksi pada periode ini · {amount}", en: "{n} made transactions in this period · {amount}", ms: "{n} bertransaksi dalam tempoh ini · {amount}", th: "{n} ทำธุรกรรมในช่วงนี้ · {amount}", fil: "{n} ang nag-transaksyon sa panahong ito · {amount}", vi: "{n} giao dịch trong kỳ này · {amount}" },
  "reports.expense.glHint": { id: "Beban operasional (6xxx) di Laba Rugi juga memuat penyusutan, selisih stok/kas, dan jurnal manual yang tidak lewat Expense Management.", en: "Operating expenses (6xxx) in Profit & Loss also include depreciation, stock/cash differences, and manual journals that don't go through Expense Management.", ms: "Perbelanjaan operasi (6xxx) dalam Untung Rugi turut memuatkan susut nilai, selisih stok/tunai, dan jurnal manual yang tidak melalui Pengurusan Perbelanjaan.", th: "ค่าใช้จ่ายในการดำเนินงาน (6xxx) ในงบกำไรขาดทุนรวมค่าเสื่อมราคา ส่วนต่างสต็อก/เงินสด และรายการบันทึกแบบกำหนดเองที่ไม่ผ่านการจัดการค่าใช้จ่ายด้วย", fil: "Kasama rin sa operating expenses (6xxx) sa Profit & Loss ang depreciation, diperensya sa stock/cash, at manual na journal na hindi dumaan sa Expense Management.", vi: "Chi phí hoạt động (6xxx) trong Lãi lỗ còn gồm khấu hao, chênh lệch tồn kho/tiền và bút toán thủ công không qua Quản lý chi phí." },
  "reports.expense.glOperating": { id: "Beban operasional di Laba Rugi: {amount}", en: "Operating expenses in Profit & Loss: {amount}", ms: "Perbelanjaan operasi dalam Untung Rugi: {amount}", th: "ค่าใช้จ่ายในการดำเนินงานในงบกำไรขาดทุน: {amount}", fil: "Operating expenses sa Profit & Loss: {amount}", vi: "Chi phí hoạt động trong Lãi lỗ: {amount}" },
  "reports.health.bepPeriod": { id: "target periode ini ({days} hari)", en: "target for this period ({days} days)", ms: "sasaran tempoh ini ({days} hari)", th: "เป้าหมายของช่วงนี้ ({days} วัน)", fil: "target para sa panahong ito ({days} araw)", vi: "mục tiêu kỳ này ({days} ngày)" },
  "reports.health.bepBasis": { id: "dibandingkan dengan pendapatan usaha", en: "compared with operating revenue", ms: "berbanding hasil operasi", th: "เทียบกับรายได้จากการดำเนินงาน", fil: "kumpara sa operating revenue", vi: "so với doanh thu hoạt động" },
  "reports.health.opexRatioHint2": { id: "Beban operasional 6xxx (gaji, sewa, listrik, penyusutan, dll.) ÷ pendapatan usaha", en: "Operating expenses 6xxx (salaries, rent, electricity, depreciation, etc.) ÷ operating revenue", ms: "Perbelanjaan operasi 6xxx (gaji, sewa, elektrik, susut nilai, dll.) ÷ hasil operasi", th: "ค่าใช้จ่ายในการดำเนินงาน 6xxx (เงินเดือน ค่าเช่า ค่าไฟ ค่าเสื่อมราคา ฯลฯ) ÷ รายได้จากการดำเนินงาน", fil: "Operating expenses 6xxx (sweldo, upa, kuryente, depreciation, atbp.) ÷ operating revenue", vi: "Chi phí hoạt động 6xxx (lương, thuê mặt bằng, điện, khấu hao, v.v.) ÷ doanh thu hoạt động" },
});
