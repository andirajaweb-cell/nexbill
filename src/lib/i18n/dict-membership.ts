import { registerDict } from "./registry";

/**
 * Translations for /dashboard/membership — Customer/CRM, Membership Tier management,
 * loyalty Rewards catalog, Vouchers, and the "Jual Keanggotaan" paid-membership sale flow
 * inside the customer detail panel. Registered as a side effect on import; import this file
 * from the membership page before any component on that page calls useDashboardLang().t().
 */
registerDict({
  // --- Page header ---
  "membership.pageTitle": { id: "Membership & CRM", en: "Membership & CRM", ms: "Keahlian & CRM", th: "สมาชิกและ CRM", fil: "Membership & CRM", vi: "Thành viên & CRM" },
  "membership.pageSubtitle": { id: "Poin loyalty & upgrade tier otomatis setiap transaksi selesai — atau langsung jual keanggotaan (Cash/QRIS) dari detail customer, dengan biaya yang bisa diatur per outlet di tab Membership Tier.", en: "Loyalty points & tier upgrades happen automatically on every completed transaction — or sell a membership directly (Cash/QRIS) from the customer detail panel, with fees configurable per outlet in the Membership Tier tab.", ms: "Mata kesetiaan & naik taraf tahap berlaku secara automatik pada setiap transaksi selesai — atau jual terus keahlian (Tunai/QRIS) dari panel butiran pelanggan, dengan yuran yang boleh ditetapkan mengikut outlet di tab Tahap Keahlian.", th: "แต้มสะสมและการอัปเกรดระดับสมาชิกจะเกิดขึ้นอัตโนมัติทุกครั้งที่ทำธุรกรรมสำเร็จ — หรือขายสมาชิกภาพโดยตรง (เงินสด/QRIS) จากแผงรายละเอียดลูกค้า โดยตั้งค่าธรรมเนียมได้ตามแต่ละสาขาในแท็บระดับสมาชิก", fil: "Awtomatikong nagbibigay ng loyalty points at nag-a-upgrade ng tier sa bawat kumpletong transaksyon — o direktang magbenta ng membership (Cash/QRIS) mula sa detail panel ng customer, na may bayad na maaaring i-set per outlet sa tab na Membership Tier.", vi: "Điểm tích lũy & nâng hạng tự động sau mỗi giao dịch hoàn tất — hoặc bán hội viên trực tiếp (Tiền mặt/QRIS) từ bảng chi tiết khách hàng, với phí có thể tùy chỉnh theo từng chi nhánh trong tab Hạng Hội Viên." },

  // --- Tabs ---
  "membership.tabCustomer": { id: "Customer", en: "Customer", ms: "Pelanggan", th: "ลูกค้า", fil: "Customer", vi: "Khách hàng" },
  "membership.tabTier": { id: "Membership Tier", en: "Membership Tier", ms: "Tahap Keahlian", th: "ระดับสมาชิก", fil: "Membership Tier", vi: "Hạng Hội Viên" },
  "membership.tabReward": { id: "Reward", en: "Reward", ms: "Ganjaran", th: "รางวัล", fil: "Reward", vi: "Phần thưởng" },
  "membership.tabVoucher": { id: "Voucher", en: "Voucher", ms: "Baucar", th: "คูปอง", fil: "Voucher", vi: "Voucher" },

  // --- Customer tab: list + add form ---
  "membership.searchPlaceholder": { id: "Cari nama/HP...", en: "Search name/phone...", ms: "Cari nama/telefon...", th: "ค้นหาชื่อ/เบอร์โทร...", fil: "Maghanap ng pangalan/numero...", vi: "Tìm tên/số điện thoại..." },
  "membership.newCustomerNamePlaceholder": { id: "Nama customer baru", en: "New customer name", ms: "Nama pelanggan baharu", th: "ชื่อลูกค้าใหม่", fil: "Pangalan ng bagong customer", vi: "Tên khách hàng mới" },
  "membership.phonePlaceholder": { id: "No. HP", en: "Phone no.", ms: "No. telefon", th: "เบอร์โทรศัพท์", fil: "Numero ng telepono", vi: "Số điện thoại" },
  "membership.addCustomerBtn": { id: "Tambah Customer", en: "Add Customer", ms: "Tambah Pelanggan", th: "เพิ่มลูกค้า", fil: "Magdagdag ng Customer", vi: "Thêm khách hàng" },
  "membership.colMemberNumber": { id: "No. Anggota", en: "Member No.", ms: "No. Ahli", th: "เลขที่สมาชิก", fil: "Member No.", vi: "Số hội viên" },
  "membership.colName": { id: "Nama", en: "Name", ms: "Nama", th: "ชื่อ", fil: "Pangalan", vi: "Tên" },
  "membership.colPhone": { id: "HP", en: "Phone", ms: "Telefon", th: "โทรศัพท์", fil: "Telepono", vi: "Điện thoại" },
  "membership.colTotalSpending": { id: "Total Belanja", en: "Total Spending", ms: "Jumlah Perbelanjaan", th: "ยอดใช้จ่ายรวม", fil: "Kabuuang Gastos", vi: "Tổng chi tiêu" },
  "membership.colPoints": { id: "Poin", en: "Points", ms: "Mata", th: "แต้ม", fil: "Puntos", vi: "Điểm" },
  "membership.deleteBtn": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },
  "membership.totalSpendingLabel": { id: "Total Belanja", en: "Total Spending", ms: "Jumlah Perbelanjaan", th: "ยอดใช้จ่ายรวม", fil: "Kabuuang Gastos", vi: "Tổng chi tiêu" },
  "membership.loyaltyPointsLabel": { id: "Poin Loyalty", en: "Loyalty Points", ms: "Mata Kesetiaan", th: "แต้มสะสม", fil: "Loyalty Points", vi: "Điểm tích lũy" },

  // --- Customer detail panel ---
  "membership.selectCustomerHint": { id: "Pilih customer untuk lihat detail.", en: "Select a customer to view details.", ms: "Pilih pelanggan untuk lihat butiran.", th: "เลือกลูกค้าเพื่อดูรายละเอียด", fil: "Pumili ng customer para makita ang detalye.", vi: "Chọn khách hàng để xem chi tiết." },
  "membership.sellMembershipTitle": { id: "Jual / Perpanjang Keanggotaan", en: "Sell / Renew Membership", ms: "Jual / Perbaharui Keahlian", th: "ขาย / ต่ออายุสมาชิกภาพ", fil: "Ibenta / I-renew ang Membership", vi: "Bán / Gia hạn hội viên" },
  "membership.noPayableTiers": { id: "Belum ada tier berbayar — atur Biaya Keanggotaan di tab Membership Tier dulu.", en: "No payable tiers yet — set a Membership Fee in the Membership Tier tab first.", ms: "Belum ada tahap berbayar — tetapkan Yuran Keahlian di tab Tahap Keahlian dahulu.", th: "ยังไม่มีระดับที่ต้องชำระเงิน — ตั้งค่าธรรมเนียมสมาชิกในแท็บระดับสมาชิกก่อน", fil: "Wala pang bayad na tier — i-set muna ang Membership Fee sa tab na Membership Tier.", vi: "Chưa có hạng trả phí — hãy đặt Phí hội viên trong tab Hạng Hội Viên trước." },
  "membership.selectTierOption": { id: "Pilih tier...", en: "Select tier...", ms: "Pilih tahap...", th: "เลือกระดับ...", fil: "Pumili ng tier...", vi: "Chọn hạng..." },
  "membership.cashLabel": { id: "Cash", en: "Cash", ms: "Tunai", th: "เงินสด", fil: "Cash", vi: "Tiền mặt" },
  "membership.processing": { id: "Memproses...", en: "Processing...", ms: "Memproses...", th: "กำลังดำเนินการ...", fil: "Pinoproseso...", vi: "Đang xử lý..." },
  "membership.payActivateBtn": { id: "Bayar & Aktifkan", en: "Pay & Activate", ms: "Bayar & Aktifkan", th: "ชำระเงินและเปิดใช้งาน", fil: "Magbayad at I-activate", vi: "Thanh toán & Kích hoạt" },
  "membership.paymentHistoryTitle": { id: "Riwayat Pembayaran", en: "Payment History", ms: "Sejarah Pembayaran", th: "ประวัติการชำระเงิน", fil: "Kasaysayan ng Bayad", vi: "Lịch sử thanh toán" },
  "membership.orderHistoryTitle": { id: "Riwayat Order ({n})", en: "Order History ({n})", ms: "Sejarah Pesanan ({n})", th: "ประวัติคำสั่งซื้อ ({n})", fil: "Kasaysayan ng Order ({n})", vi: "Lịch sử đơn hàng ({n})" },
  "membership.hideBtn": { id: "Sembunyikan", en: "Hide", ms: "Sembunyikan", th: "ซ่อน", fil: "Itago", vi: "Ẩn" },
  "membership.viewAllBtn": { id: "Lihat semua", en: "View all", ms: "Lihat semua", th: "ดูทั้งหมด", fil: "Tingnan lahat", vi: "Xem tất cả" },
  "membership.noOrders": { id: "Belum ada order.", en: "No orders yet.", ms: "Belum ada pesanan.", th: "ยังไม่มีคำสั่งซื้อ", fil: "Wala pang order.", vi: "Chưa có đơn hàng." },
  "membership.posSourceLabel": { id: "Kasir", en: "Cashier", ms: "Juruwang", th: "แคชเชียร์", fil: "Cashier", vi: "Thu ngân" },
  "membership.rentalHistoryTitle": { id: "Riwayat Sewa ({n})", en: "Rental History ({n})", ms: "Sejarah Sewa ({n})", th: "ประวัติการเช่า ({n})", fil: "Kasaysayan ng Upa ({n})", vi: "Lịch sử thuê ({n})" },
  "membership.noRentals": { id: "Belum ada sesi sewa.", en: "No rental sessions yet.", ms: "Belum ada sesi sewa.", th: "ยังไม่มีรอบการเช่า", fil: "Wala pang rental session.", vi: "Chưa có phiên thuê." },
  "membership.unitFallback": { id: "Unit", en: "Unit", ms: "Unit", th: "เครื่อง", fil: "Unit", vi: "Đơn vị" },
  "membership.loyaltyHistoryTitle": { id: "Riwayat Poin & Bonus ({n})", en: "Points & Bonus History ({n})", ms: "Sejarah Mata & Bonus ({n})", th: "ประวัติแต้มและโบนัส ({n})", fil: "Kasaysayan ng Puntos at Bonus ({n})", vi: "Lịch sử điểm & thưởng ({n})" },
  "membership.noLoyaltyHistory": { id: "Belum ada riwayat poin.", en: "No points history yet.", ms: "Belum ada sejarah mata.", th: "ยังไม่มีประวัติแต้ม", fil: "Wala pang kasaysayan ng puntos.", vi: "Chưa có lịch sử điểm." },
  "membership.redeemPointsTitle": { id: "Tukar Poin", en: "Redeem Points", ms: "Tukar Mata", th: "แลกแต้ม", fil: "Palitan ang Puntos", vi: "Đổi điểm" },
  "membership.noRewardsCatalog": { id: "Belum ada reward di katalog.", en: "No rewards in the catalog yet.", ms: "Belum ada ganjaran dalam katalog.", th: "ยังไม่มีรางวัลในแคตตาล็อก", fil: "Wala pang reward sa katalogo.", vi: "Chưa có phần thưởng nào trong danh mục." },
  "membership.pointsCostLabel": { id: "{n} poin", en: "{n} points", ms: "{n} mata", th: "{n} แต้ม", fil: "{n} puntos", vi: "{n} điểm" },
  "membership.partnerFallback": { id: "Partner", en: "Partner", ms: "Rakan Kongsi", th: "พาร์ทเนอร์", fil: "Partner", vi: "Đối tác" },
  "membership.playDiscountLabel": { id: "Diskon main {value}", en: "Play discount {value}", ms: "Diskaun main {value}", th: "ส่วนลดค่าเล่น {value}", fil: "Diskwento sa paglalaro {value}", vi: "Giảm giá chơi {value}" },
  "membership.redeemBtn": { id: "Tukar", en: "Redeem", ms: "Tukar", th: "แลก", fil: "Palitan", vi: "Đổi" },
  "membership.redeemHistoryTitle": { id: "Riwayat Redeem", en: "Redemption History", ms: "Sejarah Penukaran", th: "ประวัติการแลก", fil: "Kasaysayan ng Redemption", vi: "Lịch sử đổi điểm" },
  "membership.statusUsed": { id: "Terpakai", en: "Used", ms: "Telah Digunakan", th: "ใช้แล้ว", fil: "Nagamit na", vi: "Đã dùng" },
  "membership.statusCancelled": { id: "Batal", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิก", fil: "Kinansela", vi: "Đã hủy" },
  "membership.statusUnused": { id: "Belum dipakai", en: "Not used yet", ms: "Belum digunakan", th: "ยังไม่ได้ใช้", fil: "Hindi pa nagamit", vi: "Chưa sử dụng" },

  // --- Customer tab: alerts/confirms ---
  "membership.redeemSuccess": { id: "Berhasil! Kode redeem: {code}", en: "Success! Redeem code: {code}", ms: "Berjaya! Kod tukaran: {code}", th: "สำเร็จ! รหัสแลกรางวัล: {code}", fil: "Tagumpay! Redeem code: {code}", vi: "Thành công! Mã đổi thưởng: {code}" },
  "membership.selectTierAlert": { id: "Pilih tier keanggotaan.", en: "Select a membership tier.", ms: "Pilih tahap keahlian.", th: "กรุณาเลือกระดับสมาชิก", fil: "Pumili ng membership tier.", vi: "Vui lòng chọn hạng hội viên." },
  "membership.sellSuccess": { id: "Berhasil! {paymentNumber} — keanggotaan aktif.", en: "Success! {paymentNumber} — membership is now active.", ms: "Berjaya! {paymentNumber} — keahlian kini aktif.", th: "สำเร็จ! {paymentNumber} — สมาชิกภาพเปิดใช้งานแล้ว", fil: "Tagumpay! {paymentNumber} — aktibo na ang membership.", vi: "Thành công! {paymentNumber} — hội viên đã được kích hoạt." },
  "membership.confirmDeleteCustomer": { id: 'Hapus customer "{name}"? Riwayat order tetap tersimpan.', en: 'Delete customer "{name}"? Their order history will still be kept.', ms: 'Padam pelanggan "{name}"? Sejarah pesanan akan terus disimpan.', th: 'ลบลูกค้า "{name}" หรือไม่? ประวัติคำสั่งซื้อจะยังคงถูกเก็บไว้', fil: 'Tanggalin ang customer na "{name}"? Mananatiling naka-save ang kasaysayan ng order.', vi: 'Xóa khách hàng "{name}"? Lịch sử đơn hàng vẫn được giữ lại.' },

  // --- Tier tab ---
  "membership.addTierTitle": { id: "Tambah Tier", en: "Add Tier", ms: "Tambah Tahap", th: "เพิ่มระดับ", fil: "Magdagdag ng Tier", vi: "Thêm hạng" },
  "membership.tierFormDesc": { id: 'Min belanja = tier didapat otomatis begitu total belanja customer tembus angka ini. Biaya Keanggotaan = tier ini juga bisa langsung "dijual" (Cash/QRIS) di detail customer, tanpa perlu menunggu belanja — isi 0 kalau tidak mau dijual langsung.', en: 'Min. spending = the tier is earned automatically once the customer\'s total spending crosses this amount. Membership Fee = this tier can also be sold directly (Cash/QRIS) from the customer detail panel without waiting for spending — enter 0 if you don\'t want it sold directly.', ms: 'Min perbelanjaan = tahap ini diperoleh secara automatik apabila jumlah perbelanjaan pelanggan mencapai angka ini. Yuran Keahlian = tahap ini juga boleh terus "dijual" (Tunai/QRIS) di butiran pelanggan, tanpa perlu menunggu perbelanjaan — isi 0 jika tidak mahu dijual terus.', th: 'ยอดใช้จ่ายขั้นต่ำ = ลูกค้าจะได้รับระดับนี้โดยอัตโนมัติเมื่อยอดใช้จ่ายรวมถึงจำนวนนี้ ค่าธรรมเนียมสมาชิก = ระดับนี้สามารถ "ขาย" ได้โดยตรง (เงินสด/QRIS) ที่หน้ารายละเอียดลูกค้า โดยไม่ต้องรอยอดใช้จ่าย — ใส่ 0 หากไม่ต้องการขายโดยตรง', fil: 'Min. na paggasta = awtomatikong makukuha ang tier na ito kapag umabot dito ang kabuuang gastos ng customer. Membership Fee = maaari ring direktang "ibenta" ang tier na ito (Cash/QRIS) sa detalye ng customer, nang hindi na hinihintay ang paggasta — ilagay ang 0 kung ayaw itong ibenta nang direkta.', vi: 'Chi tiêu tối thiểu = hạng này sẽ tự động đạt được khi tổng chi tiêu của khách hàng vượt qua con số này. Phí hội viên = hạng này cũng có thể "bán" trực tiếp (Tiền mặt/QRIS) tại bảng chi tiết khách hàng mà không cần chờ chi tiêu — nhập 0 nếu không muốn bán trực tiếp.' },
  "membership.tierNamePlaceholder": { id: "Nama tier", en: "Tier name", ms: "Nama tahap", th: "ชื่อระดับ", fil: "Pangalan ng tier", vi: "Tên hạng" },
  "membership.minSpendingPlaceholder": { id: "Min belanja", en: "Min. spending", ms: "Min perbelanjaan", th: "ยอดใช้จ่ายขั้นต่ำ", fil: "Min. na paggasta", vi: "Chi tiêu tối thiểu" },
  "membership.feeAmountPlaceholder": { id: "Biaya Keanggotaan (Rp)", en: "Membership Fee (Rp)", ms: "Yuran Keahlian (Rp)", th: "ค่าธรรมเนียมสมาชิก (Rp)", fil: "Membership Fee (Rp)", vi: "Phí hội viên (Rp)" },
  "membership.pointMultiplierPlaceholder": { id: "Multiplier poin", en: "Points multiplier", ms: "Pengganda mata", th: "ตัวคูณแต้ม", fil: "Points multiplier", vi: "Hệ số nhân điểm" },
  "membership.discountPercentPlaceholder": { id: "Diskon %", en: "Discount %", ms: "Diskaun %", th: "ส่วนลด %", fil: "Discount %", vi: "Giảm giá %" },
  "membership.saveTierBtn": { id: "Simpan Tier", en: "Save Tier", ms: "Simpan Tahap", th: "บันทึกระดับ", fil: "I-save ang Tier", vi: "Lưu hạng" },
  "membership.tierNameRequired": { id: "Nama tier wajib diisi.", en: "Tier name is required.", ms: "Nama tahap wajib diisi.", th: "กรุณากรอกชื่อระดับ", fil: "Kailangan ang pangalan ng tier.", vi: "Vui lòng nhập tên hạng." },
  "membership.confirmDeleteTier": { id: 'Hapus tier "{name}"?', en: 'Delete tier "{name}"?', ms: 'Padam tahap "{name}"?', th: 'ลบระดับ "{name}" หรือไม่?', fil: 'Tanggalin ang tier na "{name}"?', vi: 'Xóa hạng "{name}"?' },
  "membership.saveBtn": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "membership.cancelBtn": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "membership.editBtn": { id: "Edit", en: "Edit", ms: "Edit", th: "แก้ไข", fil: "I-edit", vi: "Sửa" },
  "membership.minSpendingLabel": { id: "Min belanja {amount}", en: "Min. spending {amount}", ms: "Min perbelanjaan {amount}", th: "ยอดใช้จ่ายขั้นต่ำ {amount}", fil: "Min. na paggasta {amount}", vi: "Chi tiêu tối thiểu {amount}" },
  "membership.pointsMultiplierDiscountLabel": { id: "Poin x{multiplier} · Diskon {percent}%", en: "Points x{multiplier} · Discount {percent}%", ms: "Mata x{multiplier} · Diskaun {percent}%", th: "แต้ม x{multiplier} · ส่วนลด {percent}%", fil: "Points x{multiplier} · Discount {percent}%", vi: "Điểm x{multiplier} · Giảm giá {percent}%" },
  "membership.sellableLabel": { id: "Bisa dijual: {amount}", en: "Sellable: {amount}", ms: "Boleh dijual: {amount}", th: "ขายได้: {amount}", fil: "Puwedeng ibenta: {amount}", vi: "Có thể bán: {amount}" },
  "membership.notSellableLabel": { id: "Tidak dijual langsung (via belanja saja)", en: "Not sold directly (via spending only)", ms: "Tidak dijual terus (melalui perbelanjaan sahaja)", th: "ไม่ได้ขายโดยตรง (ผ่านยอดใช้จ่ายเท่านั้น)", fil: "Hindi direktang ibinebenta (sa paggasta lang)", vi: "Không bán trực tiếp (chỉ qua chi tiêu)" },

  // --- Reward tab ---
  "membership.rewardNameRequired": { id: "Nama reward dan poin wajib diisi.", en: "Reward name and points are required.", ms: "Nama ganjaran dan mata wajib diisi.", th: "กรุณากรอกชื่อรางวัลและแต้ม", fil: "Kailangan ang pangalan ng reward at puntos.", vi: "Vui lòng nhập tên phần thưởng và điểm." },
  "membership.confirmDeleteReward": { id: 'Hapus reward "{name}"?', en: 'Delete reward "{name}"?', ms: 'Padam ganjaran "{name}"?', th: 'ลบรางวัล "{name}" หรือไม่?', fil: 'Tanggalin ang reward na "{name}"?', vi: 'Xóa phần thưởng "{name}"?' },
  "membership.addRewardTitle": { id: "Tambah Reward", en: "Add Reward", ms: "Tambah Ganjaran", th: "เพิ่มรางวัล", fil: "Magdagdag ng Reward", vi: "Thêm phần thưởng" },
  "membership.rewardNamePlaceholder": { id: "Nama reward", en: "Reward name", ms: "Nama ganjaran", th: "ชื่อรางวัล", fil: "Pangalan ng reward", vi: "Tên phần thưởng" },
  "membership.partnerBrandOption": { id: "Belanja Brand Partner", en: "Partner Brand Purchase", ms: "Belian Jenama Rakan Kongsi", th: "ซื้อสินค้าแบรนด์พาร์ทเนอร์", fil: "Bili sa Partner Brand", vi: "Mua hàng thương hiệu đối tác" },
  "membership.playDiscountOption": { id: "Diskon Main", en: "Play Discount", ms: "Diskaun Main", th: "ส่วนลดค่าเล่น", fil: "Diskwento sa Paglalaro", vi: "Giảm giá chơi" },
  "membership.pointsCostPlaceholder": { id: "Poin dibutuhkan", en: "Points required", ms: "Mata diperlukan", th: "แต้มที่ต้องใช้", fil: "Kinakailangang puntos", vi: "Số điểm cần" },
  "membership.partnerBrandNamePlaceholder": { id: "Nama brand partner", en: "Partner brand name", ms: "Nama jenama rakan kongsi", th: "ชื่อแบรนด์พาร์ทเนอร์", fil: "Pangalan ng partner brand", vi: "Tên thương hiệu đối tác" },
  "membership.descriptionPlaceholder": { id: "Keterangan (mis. Voucher belanja Rp50.000)", en: "Description (e.g. Rp50,000 shopping voucher)", ms: "Keterangan (cth. Baucar belian Rp50,000)", th: "รายละเอียด (เช่น คูปองซื้อสินค้ามูลค่า Rp50,000)", fil: "Paglalarawan (hal. Rp50,000 shopping voucher)", vi: "Mô tả (VD: Voucher mua sắm Rp50.000)" },
  "membership.percentOption": { id: "Persen (%)", en: "Percent (%)", ms: "Peratus (%)", th: "เปอร์เซ็นต์ (%)", fil: "Porsyento (%)", vi: "Phần trăm (%)" },
  "membership.amountOption": { id: "Nominal (Rp)", en: "Fixed amount (Rp)", ms: "Nilai Tetap (Rp)", th: "จำนวนเงิน (Rp)", fil: "Halagang Fixed (Rp)", vi: "Số tiền cố định (Rp)" },
  "membership.discountValuePlaceholder": { id: "Nilai diskon", en: "Discount value", ms: "Nilai diskaun", th: "มูลค่าส่วนลด", fil: "Halaga ng diskwento", vi: "Giá trị giảm giá" },
  "membership.saveRewardBtn": { id: "Simpan Reward", en: "Save Reward", ms: "Simpan Ganjaran", th: "บันทึกรางวัล", fil: "I-save ang Reward", vi: "Lưu phần thưởng" },
  "membership.pointsPlaceholder": { id: "Poin", en: "Points", ms: "Mata", th: "แต้ม", fil: "Puntos", vi: "Điểm" },
  "membership.brandNamePlaceholder": { id: "Nama brand", en: "Brand name", ms: "Nama jenama", th: "ชื่อแบรนด์", fil: "Pangalan ng brand", vi: "Tên thương hiệu" },
  "membership.descriptionShortPlaceholder": { id: "Keterangan", en: "Description", ms: "Keterangan", th: "รายละเอียด", fil: "Paglalarawan", vi: "Mô tả" },
  "membership.brandLabel": { id: "Brand: {name}", en: "Brand: {name}", ms: "Jenama: {name}", th: "แบรนด์: {name}", fil: "Brand: {name}", vi: "Thương hiệu: {name}" },
  "membership.playDiscountFullLabel": { id: "Diskon main: {value}", en: "Play discount: {value}", ms: "Diskaun main: {value}", th: "ส่วนลดค่าเล่น: {value}", fil: "Diskwento sa paglalaro: {value}", vi: "Giảm giá chơi: {value}" },
  "membership.activeLabel": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งานอยู่", fil: "Aktibo", vi: "Đang hoạt động" },
  "membership.inactiveLabel": { id: "Nonaktif", en: "Inactive", ms: "Tidak Aktif", th: "ปิดใช้งาน", fil: "Hindi Aktibo", vi: "Ngừng hoạt động" },

  // --- Voucher tab ---
  "membership.createVoucherTitle": { id: "Buat Voucher", en: "Create Voucher", ms: "Cipta Baucar", th: "สร้างคูปอง", fil: "Gumawa ng Voucher", vi: "Tạo voucher" },
  "membership.codePlaceholder": { id: "Kode", en: "Code", ms: "Kod", th: "รหัส", fil: "Code", vi: "Mã" },
  "membership.valuePlaceholder": { id: "Nilai", en: "Value", ms: "Nilai", th: "มูลค่า", fil: "Halaga", vi: "Giá trị" },
  "membership.createVoucherBtn": { id: "Buat Voucher", en: "Create Voucher", ms: "Cipta Baucar", th: "สร้างคูปอง", fil: "Gumawa ng Voucher", vi: "Tạo voucher" },
  "membership.colCode": { id: "Kode", en: "Code", ms: "Kod", th: "รหัส", fil: "Code", vi: "Mã" },
  "membership.colType": { id: "Tipe", en: "Type", ms: "Jenis", th: "ประเภท", fil: "Uri", vi: "Loại" },
  "membership.colValue": { id: "Nilai", en: "Value", ms: "Nilai", th: "มูลค่า", fil: "Halaga", vi: "Giá trị" },
  "membership.colUsed": { id: "Terpakai", en: "Used", ms: "Digunakan", th: "ใช้ไปแล้ว", fil: "Nagamit", vi: "Đã dùng" },
  "membership.colStatus": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },

  // --- Loyalty type labels (loyaltyHistory badges) ---
  "membership.loyaltyType.earn": { id: "Diperoleh", en: "Earned", ms: "Diperoleh", th: "ได้รับ", fil: "Nakuha", vi: "Nhận được" },
  "membership.loyaltyType.redeem": { id: "Ditukar", en: "Redeemed", ms: "Ditukar", th: "แลกแล้ว", fil: "Na-redeem", vi: "Đã đổi" },
  "membership.loyaltyType.adjust": { id: "Penyesuaian", en: "Adjustment", ms: "Pelarasan", th: "การปรับปรุง", fil: "Adjustment", vi: "Điều chỉnh" },
  "membership.loyaltyType.expire": { id: "Kedaluwarsa", en: "Expired", ms: "Luput", th: "หมดอายุ", fil: "Nag-expire", vi: "Hết hạn" },

  // --- Rental status labels (rentalHistory badges) ---
  "membership.rentalStatus.running": { id: "Berjalan", en: "Running", ms: "Berjalan", th: "กำลังดำเนินการ", fil: "Tumatakbo", vi: "Đang chạy" },
  "membership.rentalStatus.paused": { id: "Jeda", en: "Paused", ms: "Dijeda", th: "หยุดชั่วคราว", fil: "Naka-pause", vi: "Tạm dừng" },
  "membership.rentalStatus.finished": { id: "Selesai", en: "Finished", ms: "Selesai", th: "เสร็จสิ้น", fil: "Tapos na", vi: "Hoàn thành" },
  "membership.rentalStatus.cancelled": { id: "Batal", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิก", fil: "Kinansela", vi: "Đã hủy" },
});
