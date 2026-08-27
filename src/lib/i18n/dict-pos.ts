import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/pos (cashier / POS) page. Registered as a side effect on
 * import — import this file once (see page.tsx) before any component calls
 * useDashboardLang().t() with a "pos.*" key. Follows the same { id, en, ms, th, fil, vi }
 * per-key shape as dict-shell.ts, with "{token}" placeholders for dynamic values that get
 * `.replace("{token}", String(value))`'d in at the call site.
 */
registerDict({
  "pos.title": { id: "Kasir (POS)", en: "Cashier (POS)", ms: "Juruwang (POS)", th: "แคชเชียร์ (POS)", fil: "Cashier (POS)", vi: "Thu ngân (POS)" },
  "pos.subtitle": { id: "Makanan & minuman. Sewa perangkat dikelola di Home Rental / halaman Rental, bukan di sini.", en: "Food & drinks. Device rentals are managed on the Home Rental / Rental page, not here.", ms: "Makanan & minuman. Sewaan peranti diuruskan di halaman Home Rental / Sewa, bukan di sini.", th: "อาหารและเครื่องดื่ม การเช่าอุปกรณ์จัดการที่หน้า Home Rental / เช่า ไม่ใช่ที่นี่", fil: "Pagkain at inumin. Ang pag-upa ng device ay pinangangasiwaan sa Home Rental / Rental page, hindi dito.", vi: "Đồ ăn & thức uống. Việc cho thuê thiết bị được quản lý ở trang Home Rental / Cho thuê, không phải ở đây." },
  "pos.searchPlaceholder": { id: "Cari nama produk (bisa beberapa kata) atau scan barcode...", en: "Search product name (multiple words OK) or scan barcode...", ms: "Cari nama produk (boleh guna beberapa perkataan) atau imbas barkod...", th: "ค้นหาชื่อสินค้า (ใช้ได้หลายคำ) หรือสแกนบาร์โค้ด...", fil: "Maghanap ng pangalan ng produkto (pwedeng maraming salita) o i-scan ang barcode...", vi: "Tìm tên sản phẩm (có thể nhiều từ) hoặc quét mã vạch..." },
  "pos.openOrders": { id: "Order Terbuka (belum dibayar)", en: "Open Orders (unpaid)", ms: "Pesanan Terbuka (belum dibayar)", th: "ออเดอร์ที่เปิดอยู่ (ยังไม่ชำระ)", fil: "Bukas na Order (hindi pa bayad)", vi: "Đơn hàng đang mở (chưa thanh toán)" },
  "pos.mergeOrders": { id: "Gabung {n} Order", en: "Merge {n} Orders", ms: "Gabung {n} Pesanan", th: "รวม {n} ออเดอร์", fil: "Isama ang {n} Order", vi: "Gộp {n} đơn hàng" },
  "pos.orderTypeRental": { id: "Rental", en: "Rental", ms: "Sewa", th: "เช่า", fil: "Renta", vi: "Thuê" },
  "pos.orderTypeFnb": { id: "F&B", en: "F&B", ms: "F&B", th: "F&B", fil: "F&B", vi: "F&B" },
  "pos.split": { id: "Split", en: "Split", ms: "Split", th: "แยกบิล", fil: "Hatiin", vi: "Tách" },
  "pos.payWithMethod": { id: "Bayar ({method})", en: "Pay ({method})", ms: "Bayar ({method})", th: "ชำระ ({method})", fil: "Bayad ({method})", vi: "Thanh toán ({method})" },
  "pos.searchResults": { id: "Hasil pencarian ({n})", en: "Search results ({n})", ms: "Hasil carian ({n})", th: "ผลการค้นหา ({n})", fil: "Resulta ng paghahanap ({n})", vi: "Kết quả tìm kiếm ({n})" },
  "pos.noMatchingProducts": { id: "Tidak ada produk yang cocok.", en: "No matching products.", ms: "Tiada produk yang sepadan.", th: "ไม่พบสินค้าที่ตรงกัน", fil: "Walang tugmang produkto.", vi: "Không có sản phẩm phù hợp." },
  "pos.stockLabel": { id: "Stok: {n}", en: "Stock: {n}", ms: "Stok: {n}", th: "สต็อก: {n}", fil: "Stock: {n}", vi: "Tồn kho: {n}" },
  "pos.cart": { id: "Keranjang", en: "Cart", ms: "Troli", th: "ตะกร้า", fil: "Cart", vi: "Giỏ hàng" },
  "pos.emptyCart": { id: "Belum ada item.", en: "No items yet.", ms: "Belum ada item.", th: "ยังไม่มีสินค้า", fil: "Wala pang item.", vi: "Chưa có sản phẩm nào." },
  "pos.discountPlaceholder": { id: "Diskon Rp", en: "Discount Rp", ms: "Diskaun Rp", th: "ส่วนลด Rp", fil: "Discount Rp", vi: "Giảm giá Rp" },
  "pos.voucherCodePlaceholder": { id: "Kode voucher", en: "Voucher code", ms: "Kod baucar", th: "รหัสคูปอง", fil: "Voucher code", vi: "Mã voucher" },
  "pos.checkVoucher": { id: "Cek", en: "Check", ms: "Semak", th: "ตรวจสอบ", fil: "Tsekin", vi: "Kiểm tra" },
  "pos.tax": { id: "Pajak", en: "Tax", ms: "Cukai", th: "ภาษี", fil: "Buwis", vi: "Thuế" },
  "pos.serviceCharge": { id: "Service Charge", en: "Service Charge", ms: "Caj Perkhidmatan", th: "ค่าบริการ", fil: "Service Charge", vi: "Phí dịch vụ" },
  "pos.estimatedTotal": { id: "Estimasi Total", en: "Estimated Total", ms: "Anggaran Jumlah", th: "ยอดประมาณการ", fil: "Tinatayang Kabuuan", vi: "Tổng ước tính" },
  "pos.paymentMethod": { id: "Metode Pembayaran", en: "Payment Method", ms: "Kaedah Pembayaran", th: "วิธีการชำระเงิน", fil: "Paraan ng Bayad", vi: "Phương thức thanh toán" },
  "pos.payButton": { id: "Bayar {amount}", en: "Pay {amount}", ms: "Bayar {amount}", th: "ชำระ {amount}", fil: "Bayad {amount}", vi: "Thanh toán {amount}" },
  "pos.orderCreated": { id: "Order #{id} dibuat.", en: "Order #{id} created.", ms: "Pesanan #{id} dicipta.", th: "สร้างออเดอร์ #{id} แล้ว", fil: "Nagawa na ang Order #{id}.", vi: "Đã tạo đơn hàng #{id}." },
  "pos.qrisReady": { id: "QRIS siap discan pelanggan (lihat halaman Pembayaran).", en: "QRIS is ready for the customer to scan (see the Payments page).", ms: "QRIS sedia untuk diimbas pelanggan (lihat halaman Pembayaran).", th: "QRIS พร้อมให้ลูกค้าสแกน (ดูที่หน้าการชำระเงิน)", fil: "Handa nang i-scan ng customer ang QRIS (tingnan sa Payments page).", vi: "QRIS đã sẵn sàng để khách quét (xem ở trang Thanh toán)." },
  "pos.confirmCashReceived": { id: "Konfirmasi Cash Diterima", en: "Confirm Cash Received", ms: "Sahkan Tunai Diterima", th: "ยืนยันรับเงินสดแล้ว", fil: "Kumpirmahin na Natanggap ang Cash", vi: "Xác nhận đã nhận tiền mặt" },
  "pos.printReceipt": { id: "Cetak Struk", en: "Print Receipt", ms: "Cetak Resit", th: "พิมพ์ใบเสร็จ", fil: "I-print ang Resibo", vi: "In hóa đơn" },
  "pos.selectMinTwoOrders": { id: "Pilih minimal 2 order untuk digabung.", en: "Select at least 2 orders to merge.", ms: "Pilih sekurang-kurangnya 2 pesanan untuk digabungkan.", th: "เลือกอย่างน้อย 2 ออเดอร์เพื่อรวม", fil: "Pumili ng hindi bababa sa 2 order para isama.", vi: "Chọn ít nhất 2 đơn hàng để gộp." },
  "pos.splitPromptMessage": { id: "Split jadi berapa bagian?", en: "Split into how many parts?", ms: "Split kepada berapa bahagian?", th: "แยกออกเป็นกี่ส่วน?", fil: "Hahatiin sa ilang bahagi?", vi: "Tách thành bao nhiêu phần?" },
  "pos.voucherOk": { id: "Voucher OK: -{amount}", en: "Voucher OK: -{amount}", ms: "Baucar OK: -{amount}", th: "คูปองใช้ได้: -{amount}", fil: "OK ang Voucher: -{amount}", vi: "Voucher hợp lệ: -{amount}" },
});
