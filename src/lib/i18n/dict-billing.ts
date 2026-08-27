import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/billing page — the outlet's own NEXBILL SaaS subscription/
 * billing page: plan status banners (trial/locked/grace/paid), the checkout flow, the "Produk"
 * (product) shop with weight/dimension-based shipping via Biteship, the AI Add-on upsell card,
 * unpaid-invoice payment/confirmation, and invoice history. Registered as a side effect on
 * import; see dict-shell.ts for the pattern this follows. Dynamic values use a `{token}`-style
 * placeholder resolved at the call site via .replace(), same convention as dict-accounting.ts.
 */
registerDict({
  // --- Loading state ---
  "billing.loading": { id: "Memuat data langganan...", en: "Loading subscription data...", ms: "Memuatkan data langganan...", th: "กำลังโหลดข้อมูลการสมัครสมาชิก...", fil: "Nilo-load ang subscription data...", vi: "Đang tải dữ liệu thuê bao..." },

  // --- Unlimited-plan badges ---
  "billing.unlimited.consoles": { id: "Unlimited Konsol", en: "Unlimited Consoles", ms: "Konsol Tanpa Had", th: "คอนโซลไม่จำกัด", fil: "Walang Limitasyong Console", vi: "Không giới hạn máy chơi" },
  "billing.unlimited.branches": { id: "Unlimited Cabang", en: "Unlimited Branches", ms: "Cawangan Tanpa Had", th: "สาขาไม่จำกัด", fil: "Walang Limitasyong Sangay", vi: "Không giới hạn chi nhánh" },
  "billing.unlimited.users": { id: "Unlimited User", en: "Unlimited Users", ms: "Pengguna Tanpa Had", th: "ผู้ใช้ไม่จำกัด", fil: "Walang Limitasyong User", vi: "Không giới hạn người dùng" },
  "billing.unlimited.aiIncluded": { id: "AI Termasuk", en: "AI Included", ms: "AI Termasuk", th: "รวม AI แล้ว", fil: "Kasama ang AI", vi: "Đã bao gồm AI" },

  // --- Subscription status labels (STATUS_LABEL) ---
  "billing.status.trial": { id: "Masa Percobaan", en: "Trial Period", ms: "Tempoh Percubaan", th: "ช่วงทดลองใช้", fil: "Trial Period", vi: "Giai đoạn dùng thử" },
  "billing.status.trialExpired": { id: "Percobaan Berakhir", en: "Trial Ended", ms: "Percubaan Tamat", th: "หมดช่วงทดลองใช้", fil: "Tapos na ang Trial", vi: "Hết hạn dùng thử" },
  "billing.status.pendingPayment": { id: "Menunggu Pembayaran", en: "Awaiting Payment", ms: "Menunggu Bayaran", th: "รอการชำระเงิน", fil: "Naghihintay ng Bayad", vi: "Chờ thanh toán" },
  "billing.status.active": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งานอยู่", fil: "Aktibo", vi: "Đang hoạt động" },
  "billing.status.grace": { id: "Masa Tenggang", en: "Grace Period", ms: "Tempoh Bertoleransi", th: "ช่วงผ่อนผัน", fil: "Grace Period", vi: "Thời gian gia hạn" },
  "billing.status.suspended": { id: "Ditangguhkan", en: "Suspended", ms: "Digantung", th: "ระงับการใช้งาน", fil: "Suspendido", vi: "Tạm ngừng" },
  "billing.status.cancelled": { id: "Dibatalkan", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิกแล้ว", fil: "Kinansela", vi: "Đã hủy" },

  // --- Invoice type labels (INVOICE_TYPE_LABEL) ---
  "billing.invoiceType.subscriptionFee": { id: "Biaya Langganan", en: "Subscription Fee", ms: "Yuran Langganan", th: "ค่าสมัครสมาชิก", fil: "Bayad sa Subscription", vi: "Phí thuê bao" },
  "billing.invoiceType.smartPlugPurchase": { id: "Pembelian Smart Plug", en: "Smart Plug Purchase", ms: "Pembelian Smart Plug", th: "การซื้อ Smart Plug", fil: "Pagbili ng Smart Plug", vi: "Mua Smart Plug" },
  "billing.invoiceType.setupService": { id: "Jasa Setup Jarak Jauh", en: "Remote Setup Service", ms: "Perkhidmatan Persediaan Jarak Jauh", th: "บริการติดตั้งทางไกล", fil: "Serbisyo ng Remote Setup", vi: "Dịch vụ cài đặt từ xa" },
  "billing.invoiceType.extraConsole": { id: "Konsol Tambahan", en: "Extra Console", ms: "Konsol Tambahan", th: "คอนโซลเพิ่มเติม", fil: "Karagdagang Console", vi: "Máy chơi game bổ sung" },
  "billing.invoiceType.cartOrder": { id: "Belanja Langganan", en: "Subscription Order", ms: "Pesanan Langganan", th: "คำสั่งซื้อการสมัครสมาชิก", fil: "Order ng Subscription", vi: "Đơn hàng thuê bao" },
  "billing.invoiceType.groupRenewal": { id: "Tagihan Gabungan Multi-Outlet", en: "Combined Multi-Outlet Invoice", ms: "Invois Gabungan Pelbagai Outlet", th: "ใบแจ้งหนี้รวมหลายสาขา", fil: "Pinagsamang Invoice ng Maraming Outlet", vi: "Hóa đơn gộp nhiều chi nhánh" },
  "billing.invoiceType.aiAddon": { id: "AI Add-on", en: "AI Add-on", ms: "AI Add-on", th: "AI Add-on", fil: "AI Add-on", vi: "AI Add-on" },

  // --- Shop category labels (CATEGORY_LABEL) — "smart_plug" category display name changed from
  // "Smart Plug" to the broader "Produk" ---
  "billing.category.product": { id: "Produk", en: "Products", ms: "Produk", th: "สินค้า", fil: "Produkto", vi: "Sản phẩm" },
  "billing.category.installationService": { id: "Jasa Instalasi", en: "Installation Service", ms: "Perkhidmatan Pemasangan", th: "บริการติดตั้ง", fil: "Serbisyo ng Installation", vi: "Dịch vụ lắp đặt" },
  "billing.category.extraConsole": { id: "Konsol Tambahan", en: "Extra Console", ms: "Konsol Tambahan", th: "คอนโซลเพิ่มเติม", fil: "Karagdagang Console", vi: "Máy chơi game bổ sung" },

  // --- Payment method labels (VA_BANKS + Cash/QRIS buttons) ---
  "billing.method.cash": { id: "Cash", en: "Cash", ms: "Tunai", th: "เงินสด", fil: "Cash", vi: "Tiền mặt" },
  "billing.method.qris": { id: "QRIS", en: "QRIS", ms: "QRIS", th: "QRIS", fil: "QRIS", vi: "QRIS" },
  "billing.method.crossBorderCard": { id: "Bayar Kartu ({currency})", en: "Pay by Card ({currency})", ms: "Bayar Kad ({currency})", th: "ชำระด้วยบัตร ({currency})", fil: "Magbayad gamit Card ({currency})", vi: "Thanh toán bằng thẻ ({currency})" },
  "billing.currency.note": { id: "Harga di halaman ini dikonversi dari Rupiah ke {currency} berdasarkan kurs terkini (bisa berubah sewaktu-waktu). Semua tagihan tetap dicatat resmi dalam Rupiah.", en: "Prices on this page are converted from Rupiah to {currency} using the current exchange rate (subject to change). All invoices are still officially recorded in Rupiah.", ms: "Harga di halaman ini ditukar daripada Rupiah ke {currency} berdasarkan kadar tukaran semasa (boleh berubah). Semua invois tetap direkodkan secara rasmi dalam Rupiah.", th: "ราคาในหน้านี้แปลงจากรูเปียห์เป็น {currency} ตามอัตราแลกเปลี่ยนปัจจุบัน (อาจเปลี่ยนแปลงได้) ใบแจ้งหนี้ทั้งหมดยังคงบันทึกอย่างเป็นทางการเป็นรูเปียห์", fil: "Ang mga presyo sa pahinang ito ay kino-convert mula Rupiah patungong {currency} base sa kasalukuyang exchange rate (posibleng magbago). Lahat ng invoice ay opisyal pa ring naka-record sa Rupiah.", vi: "Giá trên trang này được quy đổi từ Rupiah sang {currency} theo tỷ giá hiện tại (có thể thay đổi). Mọi hóa đơn vẫn được ghi nhận chính thức bằng Rupiah." },
  "billing.currency.noRate": { id: "Outlet ini terdaftar dalam {currency}, tapi kurs belum diatur NEXBILL — harga sementara tetap tampil dalam Rupiah.", en: "This outlet is registered in {currency}, but NEXBILL hasn't set a rate yet — prices are shown in Rupiah for now.", ms: "Outlet ini didaftarkan dalam {currency}, tetapi kadar tukaran belum ditetapkan NEXBILL — harga masih dipaparkan dalam Rupiah buat masa ini.", th: "สาขานี้ลงทะเบียนเป็น {currency} แต่ NEXBILL ยังไม่ได้ตั้งอัตราแลกเปลี่ยน — ราคาจึงแสดงเป็นรูเปียห์ไปก่อน", fil: "Naka-register ang outlet na ito sa {currency}, pero wala pang exchange rate na naitakda ang NEXBILL — sa ngayon, Rupiah muna ang ipinapakitang presyo.", vi: "Cửa hàng này đăng ký bằng {currency}, nhưng NEXBILL chưa thiết lập tỷ giá — giá hiện vẫn hiển thị bằng Rupiah." },
  "billing.method.vaBca": { id: "VA BCA", en: "VA BCA", ms: "VA BCA", th: "VA BCA", fil: "VA BCA", vi: "VA BCA" },
  "billing.method.vaBni": { id: "VA BNI", en: "VA BNI", ms: "VA BNI", th: "VA BNI", fil: "VA BNI", vi: "VA BNI" },
  "billing.method.vaMandiri": { id: "VA Mandiri", en: "VA Mandiri", ms: "VA Mandiri", th: "VA Mandiri", fil: "VA Mandiri", vi: "VA Mandiri" },
  "billing.method.vaBri": { id: "VA BRI", en: "VA BRI", ms: "VA BRI", th: "VA BRI", fil: "VA BRI", vi: "VA BRI" },
  "billing.method.vaPermata": { id: "VA Permata", en: "VA Permata", ms: "VA Permata", th: "VA Permata", fil: "VA Permata", vi: "VA Permata" },

  // --- Page header ---
  "billing.header.title": { id: "Langganan", en: "Subscription", ms: "Langganan", th: "การสมัครสมาชิก", fil: "Subscription", vi: "Gói thuê bao" },
  "billing.header.subtitle": {
    id: "Status langganan NEXBILL, etalase belanja smart plug & add-on, dan tagihan outlet ini.",
    en: "NEXBILL subscription status, the smart plug & add-on shop, and this outlet's invoices.",
    ms: "Status langganan NEXBILL, etalase belian smart plug & add-on, serta invois outlet ini.",
    th: "สถานะการสมัครสมาชิก NEXBILL ร้านค้า Smart Plug และ Add-on รวมถึงใบแจ้งหนี้ของสาขานี้",
    fil: "Status ng subscription sa NEXBILL, tindahan ng smart plug & add-on, at mga invoice ng outlet na ito.",
    vi: "Trạng thái thuê bao NEXBILL, gian hàng mua smart plug & add-on, và hóa đơn của chi nhánh này.",
  },

  // --- "Rekomendasi Produk" promo banner ---
  "billing.recommend.title": { id: "Rekomendasi Produk", en: "Recommended Products", ms: "Produk Disyorkan", th: "สินค้าแนะนำ", fil: "Mga Rekomendadong Produkto", vi: "Sản phẩm được đề xuất" },
  "billing.recommend.subtitle": {
    id: "Perlengkapan rental pilihan, link belanja langsung (di luar keranjang NEXBILL)",
    en: "Curated rental equipment, direct shopping links (outside the NEXBILL cart)",
    ms: "Peralatan sewaan pilihan, pautan belian terus (di luar troli NEXBILL)",
    th: "อุปกรณ์เช่าที่คัดสรร ลิงก์ซื้อโดยตรง (นอกตะกร้า NEXBILL)",
    fil: "Piniling kagamitan sa rental, direktang link sa pamimili (labas sa cart ng NEXBILL)",
    vi: "Thiết bị cho thuê được chọn lọc, liên kết mua trực tiếp (ngoài giỏ hàng NEXBILL)",
  },
  "billing.recommend.cta": { id: "Lihat →", en: "View →", ms: "Lihat →", th: "ดู →", fil: "Tingnan →", vi: "Xem →" },

  // --- Referral program promo link ---
  "billing.referral.title": { id: "Program Referral", en: "Referral Program", ms: "Program Rujukan", th: "โปรแกรมแนะนำเพื่อน", fil: "Programa sa Referral", vi: "Chương trình giới thiệu" },
  "billing.referral.subtitle": {
    id: "Ajak outlet lain — dapat diskon 20% untuk mereka, komisi berulang untuk kamu",
    en: "Invite other outlets — they get 20% off, you get a recurring commission",
    ms: "Jemput outlet lain — mereka dapat diskaun 20%, anda dapat komisen berulang",
    th: "ชวนร้านอื่น — พวกเขาได้ส่วนลด 20% คุณได้ค่าคอมมิชชันต่อเนื่อง",
    fil: "Anyayahan ang ibang outlet — 20% diskwento sila, recurring commission ka",
    vi: "Mời cửa hàng khác — họ giảm 20%, bạn nhận hoa hồng định kỳ",
  },
  "billing.referral.cta": { id: "Lihat →", en: "View →", ms: "Lihat →", th: "ดู →", fil: "Tingnan →", vi: "Xem →" },

  // --- Multi-outlet billing group card ---
  "billing.group.heading": { id: "Tagihan Gabungan — {n} Outlet", en: "Combined Invoice — {n} Outlets", ms: "Invois Gabungan — {n} Outlet", th: "ใบแจ้งหนี้รวม — {n} สาขา", fil: "Pinagsamang Invoice — {n} Outlet", vi: "Hóa đơn gộp — {n} chi nhánh" },
  "billing.group.subtitle": {
    id: "Outlet ini ditagih bersama outlet lain di bawah akun yang sama — satu invoice, satu pembayaran, memperpanjang semuanya sekaligus.",
    en: "This outlet is billed together with other outlets under the same account — one invoice, one payment, renewing all of them at once.",
    ms: "Outlet ini dibil bersama outlet lain di bawah akaun yang sama — satu invois, satu bayaran, memperbaharui semuanya sekali gus.",
    th: "สาขานี้จะถูกเรียกเก็บเงินร่วมกับสาขาอื่นภายใต้บัญชีเดียวกัน — ใบแจ้งหนี้เดียว การชำระเงินเดียว ต่ออายุทั้งหมดพร้อมกัน",
    fil: "Ang outlet na ito ay sinisingil kasama ng ibang outlet sa ilalim ng parehong account — isang invoice, isang bayad, nire-renew lahat nang sabay.",
    vi: "Chi nhánh này được tính chung hóa đơn với các chi nhánh khác trong cùng tài khoản — một hóa đơn, một lần thanh toán, gia hạn tất cả cùng lúc.",
  },
  "billing.group.totalLabel": { id: "Total per bulan (jika semua aktif)", en: "Total per month (if all are active)", ms: "Jumlah sebulan (jika semua aktif)", th: "รวมต่อเดือน (หากทั้งหมดใช้งานอยู่)", fil: "Kabuuan bawat buwan (kung lahat ay aktibo)", vi: "Tổng mỗi tháng (nếu tất cả đều đang hoạt động)" },

  // --- Superuser exemption card ---
  "billing.superuser.title": { id: "Fitur langganan tidak berlaku untuk akun Superuser", en: "Subscription features don't apply to Superuser accounts", ms: "Ciri langganan tidak terpakai untuk akaun Superuser", th: "ฟีเจอร์การสมัครสมาชิกไม่มีผลกับบัญชี Superuser", fil: "Hindi applicable ang mga feature ng subscription sa Superuser account", vi: "Tính năng thuê bao không áp dụng cho tài khoản Superuser" },
  "billing.superuser.body": {
    id: "Akun Superuser tidak pernah dibatasi oleh trial/lock/masa tenggang. Bagian checkout dan riwayat tagihan di bawah tetap tersedia kalau kamu tetap ingin mengelola pembayaran langganan outlet ini.",
    en: "Superuser accounts are never restricted by trial/lock/grace period. The checkout and invoice history below are still available if you still want to manage this outlet's subscription payments.",
    ms: "Akaun Superuser tidak pernah disekat oleh trial/kunci/tempoh bertoleransi. Bahagian checkout dan sejarah invois di bawah masih tersedia jika anda tetap mahu menguruskan bayaran langganan outlet ini.",
    th: "บัญชี Superuser จะไม่ถูกจำกัดโดยช่วงทดลองใช้/การล็อก/ช่วงผ่อนผันเลย ส่วนการชำระเงินและประวัติใบแจ้งหนี้ด้านล่างยังคงใช้งานได้หากคุณต้องการจัดการการชำระเงินการสมัครสมาชิกของสาขานี้",
    fil: "Ang Superuser account ay hindi kailanman nire-restrict ng trial/lock/grace period. Available pa rin ang checkout at history ng invoice sa baba kung gusto mo pa ring pamahalaan ang bayad sa subscription ng outlet na ito.",
    vi: "Tài khoản Superuser không bao giờ bị giới hạn bởi dùng thử/khóa/gia hạn. Phần thanh toán và lịch sử hóa đơn bên dưới vẫn khả dụng nếu bạn vẫn muốn quản lý thanh toán thuê bao của chi nhánh này.",
  },

  // --- Trial banner ---
  "billing.trial.title": { id: "Masa percobaan gratis — {n} hari lagi", en: "Free trial — {n} days left", ms: "Percubaan percuma — {n} hari lagi", th: "ทดลองใช้ฟรี — เหลืออีก {n} วัน", fil: "Libreng trial — {n} araw na lang", vi: "Dùng thử miễn phí — còn {n} ngày" },
  "billing.trial.body": {
    id: "Selama percobaan, fitur AI (Business Assistant & Insights) gratis dipakai tanpa batas. Smart plug belum bisa dipakai (beli lewat etalase di bawah) dan kontrol TV Android dibatasi 1 unit.",
    en: "During the trial, AI features (Business Assistant & Insights) are free to use without limits. Smart plug isn't usable yet (buy it from the shop below) and Android TV control is limited to 1 unit.",
    ms: "Semasa percubaan, ciri AI (Business Assistant & Insights) percuma digunakan tanpa had. Smart plug belum boleh digunakan (beli melalui etalase di bawah) dan kawalan TV Android dihadkan kepada 1 unit.",
    th: "ในช่วงทดลองใช้ ฟีเจอร์ AI (Business Assistant & Insights) ใช้ได้ฟรีไม่จำกัด Smart plug ยังใช้ไม่ได้ (ซื้อผ่านร้านค้าด้านล่าง) และการควบคุม Android TV จำกัดเพียง 1 เครื่อง",
    fil: "Habang trial, libre at walang limitasyon ang paggamit ng AI features (Business Assistant & Insights). Hindi pa magagamit ang smart plug (bilhin sa tindahan sa baba) at limitado sa 1 unit ang control ng Android TV.",
    vi: "Trong thời gian dùng thử, các tính năng AI (Business Assistant & Insights) được dùng miễn phí không giới hạn. Smart plug chưa thể sử dụng (mua tại gian hàng bên dưới) và điều khiển Android TV giới hạn 1 thiết bị.",
  },

  // --- Locked (read-only) banner ---
  "billing.locked.title": { id: "Akses terbatas (read-only)", en: "Limited access (read-only)", ms: "Akses terhad (baca sahaja)", th: "การเข้าถึงถูกจำกัด (อ่านอย่างเดียว)", fil: "Limitadong access (read-only)", vi: "Truy cập bị giới hạn (chỉ xem)" },
  "billing.locked.trialExpired": {
    id: "Masa percobaan 30 hari sudah berakhir. Data kamu aman — selesaikan pembayaran di bawah untuk membuka akses penuh selama 30 hari ke depan.",
    en: "The 30-day trial period has ended. Your data is safe — complete the payment below to unlock full access for the next 30 days.",
    ms: "Tempoh percubaan 30 hari telah tamat. Data anda selamat — selesaikan bayaran di bawah untuk membuka akses penuh selama 30 hari akan datang.",
    th: "ช่วงทดลองใช้ 30 วันสิ้นสุดแล้ว ข้อมูลของคุณปลอดภัย — ชำระเงินด้านล่างให้เสร็จสิ้นเพื่อปลดล็อกการเข้าถึงเต็มรูปแบบอีก 30 วันข้างหน้า",
    fil: "Tapos na ang 30 araw na trial period. Ligtas ang data mo — kumpletuhin ang bayad sa baba para ma-unlock ang full access sa susunod na 30 araw.",
    vi: "Giai đoạn dùng thử 30 ngày đã kết thúc. Dữ liệu của bạn vẫn an toàn — hoàn tất thanh toán bên dưới để mở khóa toàn quyền truy cập trong 30 ngày tới.",
  },
  "billing.locked.pendingPayment": {
    id: "Checkout sudah dibuat — selesaikan tagihan di bawah untuk mengaktifkan langganan.",
    en: "Checkout has been created — complete the invoice below to activate your subscription.",
    ms: "Checkout telah dibuat — selesaikan invois di bawah untuk mengaktifkan langganan.",
    th: "สร้างการชำระเงินแล้ว — ชำระใบแจ้งหนี้ด้านล่างให้เสร็จสิ้นเพื่อเปิดใช้งานการสมัครสมาชิก",
    fil: "Nagawa na ang checkout — kumpletuhin ang invoice sa baba para i-activate ang subscription.",
    vi: "Đã tạo đơn thanh toán — hoàn tất hóa đơn bên dưới để kích hoạt gói thuê bao.",
  },
  "billing.locked.suspended": {
    id: "Langganan ditangguhkan karena tagihan perpanjangan belum dibayar melewati masa tenggang.",
    en: "Your subscription has been suspended because the renewal invoice wasn't paid within the grace period.",
    ms: "Langganan digantung kerana invois pembaharuan belum dibayar melebihi tempoh bertoleransi.",
    th: "การสมัครสมาชิกถูกระงับเนื่องจากไม่ได้ชำระใบแจ้งหนี้ต่ออายุภายในช่วงผ่อนผัน",
    fil: "Na-suspend ang subscription dahil hindi nabayaran ang renewal invoice bago matapos ang grace period.",
    vi: "Gói thuê bao đã bị tạm ngừng vì hóa đơn gia hạn chưa được thanh toán trong thời gian gia hạn cho phép.",
  },
  "billing.locked.cancelled": {
    id: "Langganan sudah dibatalkan. Hubungi NEXBILL untuk mengaktifkan kembali.",
    en: "Your subscription has been cancelled. Contact NEXBILL to reactivate it.",
    ms: "Langganan telah dibatalkan. Hubungi NEXBILL untuk mengaktifkan semula.",
    th: "การสมัครสมาชิกถูกยกเลิกแล้ว ติดต่อ NEXBILL เพื่อเปิดใช้งานอีกครั้ง",
    fil: "Nakansela na ang subscription. Makipag-ugnayan sa NEXBILL para i-reactivate ito.",
    vi: "Gói thuê bao đã bị hủy. Liên hệ NEXBILL để kích hoạt lại.",
  },

  // --- Grace period banner ---
  "billing.grace.title": { id: "Masa tenggang (toleransi) — segera bayar tagihan perpanjangan", en: "Grace period — pay your renewal invoice soon", ms: "Tempoh bertoleransi — segera bayar invois pembaharuan", th: "ช่วงผ่อนผัน — กรุณาชำระใบแจ้งหนี้ต่ออายุโดยเร็ว", fil: "Grace period — bayaran ang renewal invoice agad", vi: "Thời gian gia hạn — vui lòng thanh toán hóa đơn gia hạn sớm" },
  "billing.grace.body": {
    id: "Tanggal langganan habis: {expiry}. Toleransi diberikan sampai {graceUntil} — setelah itu semua fitur akan dikunci penuh.",
    en: "Subscription expiry date: {expiry}. Grace is given until {graceUntil} — after that all features will be fully locked.",
    ms: "Tarikh langganan tamat: {expiry}. Toleransi diberikan sehingga {graceUntil} — selepas itu semua ciri akan dikunci sepenuhnya.",
    th: "วันที่การสมัครสมาชิกหมดอายุ: {expiry} ระยะผ่อนผันจนถึง {graceUntil} — หลังจากนั้นฟีเจอร์ทั้งหมดจะถูกล็อกอย่างสมบูรณ์",
    fil: "Petsa ng pag-expire ng subscription: {expiry}. Bibigyan ng grace hanggang {graceUntil} — pagkatapos noon, ma-lo-lock nang buo ang lahat ng feature.",
    vi: "Ngày hết hạn gói thuê bao: {expiry}. Thời gian gia hạn đến {graceUntil} — sau đó mọi tính năng sẽ bị khóa hoàn toàn.",
  },

  // --- Shared button/state labels ---
  "billing.common.processing": { id: "Memproses...", en: "Processing...", ms: "Memproses...", th: "กำลังดำเนินการ...", fil: "Prinoseso...", vi: "Đang xử lý..." },
  "billing.common.renewNow": { id: "Perpanjang Sekarang", en: "Renew Now", ms: "Perbaharui Sekarang", th: "ต่ออายุตอนนี้", fil: "I-renew Ngayon", vi: "Gia hạn ngay" },
  "billing.common.checking": { id: "Mengecek...", en: "Checking...", ms: "Menyemak...", th: "กำลังตรวจสอบ...", fil: "Chine-check...", vi: "Đang kiểm tra..." },

  // --- Paid/active plan card ---
  "billing.paid.planTitle": { id: "Paket {plan}", en: "{plan} Plan", ms: "Pakej {plan}", th: "แพ็กเกจ {plan}", fil: "Plan na {plan}", vi: "Gói {plan}" },
  "billing.paid.periodActiveUntil": { id: "Periode aktif sampai {date}", en: "Active period until {date}", ms: "Tempoh aktif sehingga {date}", th: "ระยะเวลาที่ใช้งานอยู่จนถึง {date}", fil: "Aktibong panahon hanggang {date}", vi: "Kỳ hoạt động đến {date}" },
  "billing.paid.expiresToday": { id: "hari ini", en: "today", ms: "hari ini", th: "วันนี้", fil: "ngayon", vi: "hôm nay" },
  "billing.paid.expiresInDays": { id: "{n} hari lagi", en: "in {n} days", ms: "{n} hari lagi", th: "อีก {n} วัน", fil: "sa loob ng {n} araw", vi: "còn {n} ngày" },
  "billing.paid.expiringSoonSuffix": { id: " — akan habis {when}, segera perpanjang.", en: " — expiring {when}, renew soon.", ms: " — akan tamat {when}, segera perbaharui.", th: " — จะหมดอายุ {when} กรุณาต่ออายุโดยเร็ว", fil: " — mag-e-expire {when}, i-renew agad.", vi: " — sắp hết hạn {when}, hãy gia hạn sớm." },
  "billing.paid.smartPlugRegistered": { id: "{n} smart plug terdaftar.", en: "{n} smart plug(s) registered.", ms: "{n} smart plug didaftarkan.", th: "ลงทะเบียน Smart Plug แล้ว {n} เครื่อง", fil: "{n} smart plug ang naka-register.", vi: "Đã đăng ký {n} smart plug." },
  "billing.paid.downloadManual": { id: "Download Buku Manual Smart Plug", en: "Download Smart Plug Manual", ms: "Muat Turun Manual Smart Plug", th: "ดาวน์โหลดคู่มือ Smart Plug", fil: "I-download ang Manual ng Smart Plug", vi: "Tải hướng dẫn sử dụng Smart Plug" },

  // --- Shop / plan checkout section ---
  "billing.shop.subscriptionPlan": { id: "Langganan {plan}", en: "{plan} Subscription", ms: "Langganan {plan}", th: "การสมัครสมาชิก {plan}", fil: "Subscription na {plan}", vi: "Thuê bao {plan}" },
  "billing.shop.mandatoryNote": {
    id: "Wajib untuk mengaktifkan akses penuh NEXBILL — sudah otomatis masuk keranjang di samping.",
    en: "Required to activate full NEXBILL access — already automatically added to the cart on the side.",
    ms: "Wajib untuk mengaktifkan akses penuh NEXBILL — telah automatik dimasukkan ke troli di sebelah.",
    th: "จำเป็นต่อการเปิดใช้งานสิทธิ์การเข้าถึง NEXBILL แบบเต็มรูปแบบ — เพิ่มเข้าตะกร้าด้านข้างโดยอัตโนมัติแล้ว",
    fil: "Kinakailangan para i-activate ang full access sa NEXBILL — awtomatikong naidagdag na sa cart sa gilid.",
    vi: "Bắt buộc để kích hoạt toàn quyền truy cập NEXBILL — đã tự động thêm vào giỏ hàng bên cạnh.",
  },
  "billing.shop.subscriptionFeeLabel": { id: "Biaya langganan (periode pertama)", en: "Subscription fee (first period)", ms: "Yuran langganan (tempoh pertama)", th: "ค่าสมัครสมาชิก (งวดแรก)", fil: "Bayad sa subscription (unang panahon)", vi: "Phí thuê bao (kỳ đầu tiên)" },
  "billing.shop.addToCart": { id: "+ Keranjang", en: "+ Cart", ms: "+ Troli", th: "+ ตะกร้า", fil: "+ Cart", vi: "+ Giỏ hàng" },

  // --- Shipping / installation address section ---
  "billing.install.headingWithShipping": { id: "Alamat Pengiriman & Instalasi", en: "Shipping & Installation Address", ms: "Alamat Penghantaran & Pemasangan", th: "ที่อยู่จัดส่งและติดตั้ง", fil: "Address para sa Shipping & Installation", vi: "Địa chỉ giao hàng & lắp đặt" },
  "billing.install.headingInstallOnly": { id: "Detail Instalasi", en: "Installation Details", ms: "Butiran Pemasangan", th: "รายละเอียดการติดตั้ง", fil: "Detalye ng Installation", vi: "Chi tiết lắp đặt" },
  "billing.install.noteShippingAndInstall": {
    id: "Wajib diisi karena ada Smart Plug di keranjang — juga dipakai vendor Jasa Instalasi untuk menghubungi kontak ini.",
    en: "Required because there's a Smart Plug in the cart — also used by the Installation Service vendor to contact this person.",
    ms: "Wajib diisi kerana ada Smart Plug dalam troli — turut digunakan oleh vendor Perkhidmatan Pemasangan untuk menghubungi kenalan ini.",
    th: "จำเป็นต้องกรอกเนื่องจากมี Smart Plug อยู่ในตะกร้า — ผู้ให้บริการติดตั้งจะใช้ข้อมูลนี้ในการติดต่อด้วย",
    fil: "Kinakailangan dahil may Smart Plug sa cart — ginagamit din ito ng vendor ng Installation Service para makontak ang taong ito.",
    vi: "Bắt buộc nhập vì giỏ hàng có Smart Plug — nhà cung cấp Dịch vụ lắp đặt cũng dùng thông tin này để liên hệ.",
  },
  "billing.install.noteShippingOnly": {
    id: "Wajib diisi karena ada Smart Plug di keranjang — Smart Plug dikirim ke alamat ini.",
    en: "Required because there's a Smart Plug in the cart — the Smart Plug will be shipped to this address.",
    ms: "Wajib diisi kerana ada Smart Plug dalam troli — Smart Plug akan dihantar ke alamat ini.",
    th: "จำเป็นต้องกรอกเนื่องจากมี Smart Plug อยู่ในตะกร้า — จะจัดส่ง Smart Plug ไปยังที่อยู่นี้",
    fil: "Kinakailangan dahil may Smart Plug sa cart — ipapadala ang Smart Plug sa address na ito.",
    vi: "Bắt buộc nhập vì giỏ hàng có Smart Plug — Smart Plug sẽ được giao đến địa chỉ này.",
  },
  "billing.install.noteInstallOnly": {
    id: 'Diisi karena "Jasa Instalasi" ada di keranjang — vendor akan menghubungi kontak ini.',
    en: 'Filled in because "Installation Service" is in the cart — the vendor will contact this person.',
    ms: 'Diisi kerana "Perkhidmatan Pemasangan" ada dalam troli — vendor akan menghubungi kenalan ini.',
    th: 'กรอกเนื่องจากมี "บริการติดตั้ง" อยู่ในตะกร้า — ผู้ให้บริการจะติดต่อบุคคลนี้',
    fil: 'Napupunan dahil may "Jasa Instalasi" sa cart — kokontakin ng vendor ang taong ito.',
    vi: 'Được điền vì giỏ hàng có "Dịch vụ lắp đặt" — nhà cung cấp sẽ liên hệ người này.',
  },
  "billing.install.placeholderName": { id: "Nama Penerima", en: "Recipient Name", ms: "Nama Penerima", th: "ชื่อผู้รับ", fil: "Pangalan ng Tatanggap", vi: "Tên người nhận" },
  "billing.install.placeholderPhone": { id: "No. WhatsApp Penerima", en: "Recipient's WhatsApp Number", ms: "No. WhatsApp Penerima", th: "หมายเลข WhatsApp ผู้รับ", fil: "WhatsApp Number ng Tatanggap", vi: "Số WhatsApp người nhận" },
  "billing.install.placeholderAddress": { id: "Alamat lengkap (jalan, no. rumah, RT/RW)", en: "Full address (street, house number, RT/RW)", ms: "Alamat lengkap (jalan, no. rumah, RT/RW)", th: "ที่อยู่แบบเต็ม (ถนน เลขที่บ้าน RT/RW)", fil: "Kumpletong address (kalye, house number, RT/RW)", vi: "Địa chỉ đầy đủ (đường, số nhà, RT/RW)" },
  "billing.install.destinationLabel": { id: "Kecamatan/Kota Tujuan (untuk hitung ongkos kirim)", en: "Destination District/City (for shipping cost calculation)", ms: "Daerah/Bandar Destinasi (untuk kira kos penghantaran)", th: "เขต/เมืองปลายทาง (สำหรับคำนวณค่าจัดส่ง)", fil: "District/Lungsod na Destinasyon (para sa pagkalkula ng shipping cost)", vi: "Quận/Thành phố nhận hàng (để tính phí vận chuyển)" },
  "billing.install.destinationPlaceholder": { id: "Ketik nama kecamatan/kota, mis. Cilandak...", en: "Type the district/city name, e.g. Cilandak...", ms: "Taip nama daerah/bandar, cth. Cilandak...", th: "พิมพ์ชื่อเขต/เมือง เช่น Cilandak...", fil: "I-type ang pangalan ng district/lungsod, hal. Cilandak...", vi: "Nhập tên quận/thành phố, vd. Cilandak..." },
  "billing.install.searching": { id: "Mencari...", en: "Searching...", ms: "Mencari...", th: "กำลังค้นหา...", fil: "Naghahanap...", vi: "Đang tìm..." },
  "billing.install.notFound": { id: "Tidak ditemukan.", en: "Not found.", ms: "Tidak ditemui.", th: "ไม่พบ", fil: "Walang nahanap.", vi: "Không tìm thấy." },
  "billing.install.checkShipping": { id: "Cek Ongkos Kirim", en: "Check Shipping Cost", ms: "Semak Kos Penghantaran", th: "ตรวจสอบค่าจัดส่ง", fil: "I-check ang Shipping Cost", vi: "Kiểm tra phí vận chuyển" },

  // --- Cart panel ---
  "billing.cart.heading": { id: "Keranjang", en: "Cart", ms: "Troli", th: "ตะกร้า", fil: "Cart", vi: "Giỏ hàng" },
  "billing.cart.empty": {
    id: "Belum ada item lain di keranjang — browse etalase di sebelah kiri untuk tambah produk, jasa instalasi, atau konsol tambahan.",
    en: "No other items in the cart yet — browse the shop on the left to add products, installation service, or extra consoles.",
    ms: "Belum ada item lain dalam troli — layari etalase di sebelah kiri untuk tambah produk, perkhidmatan pemasangan, atau konsol tambahan.",
    th: "ยังไม่มีสินค้าอื่นในตะกร้า — เรียกดูร้านค้าทางด้านซ้ายเพื่อเพิ่มสินค้า บริการติดตั้ง หรือคอนโซลเพิ่มเติม",
    fil: "Wala pang ibang item sa cart — i-browse ang tindahan sa kaliwa para magdagdag ng produkto, installation service, o karagdagang console.",
    vi: "Chưa có sản phẩm nào khác trong giỏ hàng — xem gian hàng bên trái để thêm sản phẩm, dịch vụ lắp đặt, hoặc máy chơi game bổ sung.",
  },
  "billing.cart.shippingLabel": { id: "Ongkos Kirim", en: "Shipping Cost", ms: "Kos Penghantaran", th: "ค่าจัดส่ง", fil: "Shipping Cost", vi: "Phí vận chuyển" },
  "billing.cart.shippingNotSelected": { id: "Belum dipilih", en: "Not selected yet", ms: "Belum dipilih", th: "ยังไม่ได้เลือก", fil: "Hindi pa napipili", vi: "Chưa chọn" },
  "billing.cart.total": { id: "Total", en: "Total", ms: "Jumlah", th: "รวม", fil: "Total", vi: "Tổng cộng" },
  "billing.cart.checkout": { id: "Checkout", en: "Checkout", ms: "Checkout", th: "ชำระเงิน", fil: "Checkout", vi: "Thanh toán" },
  "billing.cart.footnote": {
    id: "Setelah checkout, satu tagihan gabungan akan muncul untuk dibayar (Cash/QRIS/VA) — akses penuh terbuka otomatis 30 hari setelah pembayaran diterima.",
    en: "After checkout, one combined invoice will appear for payment (Cash/QRIS/VA) — full access unlocks automatically 30 days after payment is received.",
    ms: "Selepas checkout, satu invois gabungan akan muncul untuk dibayar (Cash/QRIS/VA) — akses penuh terbuka secara automatik 30 hari selepas bayaran diterima.",
    th: "หลังจากชำระเงิน ใบแจ้งหนี้รวมหนึ่งใบจะปรากฏขึ้นเพื่อชำระ (เงินสด/QRIS/VA) — สิทธิ์การเข้าถึงเต็มรูปแบบจะปลดล็อกอัตโนมัติ 30 วันหลังจากได้รับการชำระเงิน",
    fil: "Pagkatapos mag-checkout, lalabas ang isang pinagsamang invoice para bayaran (Cash/QRIS/VA) — awtomatikong mabubuksan ang full access 30 araw pagkatapos matanggap ang bayad.",
    vi: "Sau khi thanh toán, một hóa đơn gộp sẽ xuất hiện để thanh toán (Tiền mặt/QRIS/VA) — toàn quyền truy cập sẽ tự động mở khóa 30 ngày sau khi nhận được thanh toán.",
  },

  // --- AI Add-on upsell card ---
  "billing.ai.title": { id: "AI Business Assistant & Insights", en: "AI Business Assistant & Insights", ms: "AI Business Assistant & Insights", th: "AI Business Assistant & Insights", fil: "AI Business Assistant & Insights", vi: "AI Business Assistant & Insights" },
  "billing.ai.includedInPlan": {
    id: "Sudah termasuk dalam paket langganan — tidak ada biaya tambahan, tidak perlu diaktifkan terpisah.",
    en: "Already included in your subscription plan — no extra cost, no separate activation needed.",
    ms: "Sudah termasuk dalam pakej langganan — tiada kos tambahan, tidak perlu diaktifkan berasingan.",
    th: "รวมอยู่ในแพ็กเกจสมาชิกแล้ว — ไม่มีค่าใช้จ่ายเพิ่มเติม ไม่ต้องเปิดใช้งานแยกต่างหาก",
    fil: "Kasama na sa subscription plan mo — walang dagdag na bayad, hindi na kailangang i-activate nang hiwalay.",
    vi: "Đã bao gồm trong gói đăng ký — không phát sinh phí, không cần kích hoạt riêng.",
  },
  "billing.ai.includedBadge": { id: "Termasuk", en: "Included", ms: "Termasuk", th: "รวมอยู่แล้ว", fil: "Kasama na", vi: "Đã bao gồm" },
  "billing.ai.freeTrial": {
    id: "Gratis selama masa percobaan berjalan — tidak perlu diaktifkan terpisah.",
    en: "Free for the duration of the trial period — no separate activation needed.",
    ms: "Percuma sepanjang tempoh percubaan berjalan — tidak perlu diaktifkan secara berasingan.",
    th: "ฟรีตลอดช่วงทดลองใช้ — ไม่ต้องเปิดใช้งานแยกต่างหาก",
    fil: "Libre habang tumatakbo ang trial period — hindi na kailangang i-activate nang hiwalay.",
    vi: "Miễn phí trong suốt thời gian dùng thử — không cần kích hoạt riêng.",
  },
  "billing.ai.activeUntil": { id: "Aktif sampai {date}.", en: "Active until {date}.", ms: "Aktif sehingga {date}.", th: "ใช้งานได้ถึง {date}", fil: "Aktibo hanggang {date}.", vi: "Còn hiệu lực đến {date}." },
  "billing.ai.locked": {
    id: "Terkunci — fitur AI berbayar terpisah dari paket langganan reguler (bukan bagian dari harga langganan), karena setiap pemakaiannya punya biaya nyata ke penyedia AI.",
    en: "Locked — the AI feature is billed separately from the regular subscription plan (not included in the subscription price), because every use has a real cost to the AI provider.",
    ms: "Terkunci — ciri AI dikenakan bayaran berasingan daripada pelan langganan biasa (bukan sebahagian daripada harga langganan), kerana setiap penggunaannya mempunyai kos sebenar kepada penyedia AI.",
    th: "ล็อกอยู่ — ฟีเจอร์ AI มีค่าใช้จ่ายแยกต่างหากจากแพ็กเกจสมัครสมาชิกปกติ (ไม่รวมอยู่ในราคาสมัครสมาชิก) เนื่องจากการใช้งานแต่ละครั้งมีต้นทุนจริงต่อผู้ให้บริการ AI",
    fil: "Naka-lock — sinisingil nang hiwalay ang AI feature mula sa regular na subscription plan (hindi kasama sa presyo ng subscription), dahil may aktwal na gastos sa AI provider ang bawat paggamit.",
    vi: "Đang khóa — tính năng AI được tính phí riêng ngoài gói thuê bao thông thường (không nằm trong giá thuê bao), vì mỗi lần sử dụng đều phát sinh chi phí thực tế cho nhà cung cấp AI.",
  },
  "billing.ai.perMonthSuffix": { id: "/bulan", en: "/month", ms: "/bulan", th: "/เดือน", fil: "/buwan", vi: "/tháng" },
  "billing.ai.renewButton": { id: "Perpanjang AI Add-on", en: "Renew AI Add-on", ms: "Perbaharui AI Add-on", th: "ต่ออายุ AI Add-on", fil: "I-renew ang AI Add-on", vi: "Gia hạn AI Add-on" },
  "billing.ai.activateButton": { id: "Aktifkan AI Add-on", en: "Activate AI Add-on", ms: "Aktifkan AI Add-on", th: "เปิดใช้งาน AI Add-on", fil: "I-activate ang AI Add-on", vi: "Kích hoạt AI Add-on" },

  // --- Unpaid invoices section ---
  "billing.invoices.unpaidHeading": { id: "Tagihan Belum Lunas", en: "Unpaid Invoices", ms: "Invois Belum Selesai", th: "ใบแจ้งหนี้ที่ยังไม่ชำระ", fil: "Mga Hindi Pa Bayad na Invoice", vi: "Hóa đơn chưa thanh toán" },
  "billing.invoices.markPaid": { id: "Tandai Lunas", en: "Mark as Paid", ms: "Tandakan Selesai", th: "ทำเครื่องหมายว่าชำระแล้ว", fil: "Markahan bilang Bayad", vi: "Đánh dấu đã thanh toán" },
  "billing.invoices.lineDetailLabel": { id: "Rincian belanja:", en: "Order details:", ms: "Butiran belian:", th: "รายละเอียดคำสั่งซื้อ:", fil: "Detalye ng order:", vi: "Chi tiết đơn hàng:" },
  "billing.invoices.vaTransferTo": { id: "Transfer ke Virtual Account {bank}", en: "Transfer to {bank} Virtual Account", ms: "Pindahan ke Virtual Account {bank}", th: "โอนเงินไปยัง Virtual Account {bank}", fil: "Mag-transfer sa Virtual Account {bank}", vi: "Chuyển khoản đến Virtual Account {bank}" },
  "billing.invoices.qrAlt": { id: "QR pembayaran langganan", en: "Subscription payment QR code", ms: "Kod QR bayaran langganan", th: "QR การชำระเงินสมัครสมาชิก", fil: "QR code para sa bayad ng subscription", vi: "Mã QR thanh toán thuê bao" },
  "billing.invoices.crossBorderPending": { id: "Pembayaran kartu lintas negara sedang diproses — ref: {ref}. Hubungi NEXBILL Support jika belum menerima link pembayaran.", en: "Cross-border card payment is processing — ref: {ref}. Contact NEXBILL Support if you haven't received a payment link.", ms: "Pembayaran kad rentas negara sedang diproses — ref: {ref}. Hubungi NEXBILL Support jika belum menerima pautan pembayaran.", th: "การชำระเงินด้วยบัตรข้ามประเทศกำลังดำเนินการ — อ้างอิง: {ref} ติดต่อ NEXBILL Support หากยังไม่ได้รับลิงก์ชำระเงิน", fil: "Pinoproseso ang cross-border card payment — ref: {ref}. Makipag-ugnayan sa NEXBILL Support kung wala ka pang natatanggap na payment link.", vi: "Thanh toán thẻ xuyên biên giới đang được xử lý — mã: {ref}. Liên hệ NEXBILL Support nếu chưa nhận được liên kết thanh toán." },

  // --- Invoice history ---
  "billing.history.heading": { id: "Riwayat Tagihan", en: "Invoice History", ms: "Sejarah Invois", th: "ประวัติใบแจ้งหนี้", fil: "History ng Invoice", vi: "Lịch sử hóa đơn" },
  "billing.history.paid": { id: "Lunas", en: "Paid", ms: "Selesai", th: "ชำระแล้ว", fil: "Bayad na", vi: "Đã thanh toán" },
  "billing.history.unpaid": { id: "Belum Bayar", en: "Unpaid", ms: "Belum Bayar", th: "ยังไม่ชำระ", fil: "Hindi Pa Bayad", vi: "Chưa thanh toán" },

  // --- Footer links ---
  "billing.footer.terms": { id: "Syarat & Ketentuan", en: "Terms & Conditions", ms: "Terma & Syarat", th: "ข้อกำหนดและเงื่อนไข", fil: "Mga Tuntunin at Kundisyon", vi: "Điều khoản & Điều kiện" },
  "billing.footer.refundPolicy": { id: "Kebijakan Refund & Pembatalan", en: "Refund & Cancellation Policy", ms: "Dasar Bayaran Balik & Pembatalan", th: "นโยบายการคืนเงินและการยกเลิก", fil: "Patakaran sa Refund at Pagkansela", vi: "Chính sách hoàn tiền & hủy" },

  // --- Alerts / confirms ---
  "billing.alert.selectCourierFirst": {
    id: 'Pilih kurir pengiriman untuk Smart Plug dulu (klik "Cek Ongkos Kirim" di bawah keranjang).',
    en: 'Select a shipping courier for the Smart Plug first (click "Check Shipping Cost" below the cart).',
    ms: 'Pilih kurier penghantaran untuk Smart Plug dahulu (klik "Semak Kos Penghantaran" di bawah troli).',
    th: 'เลือกผู้ให้บริการจัดส่งสำหรับ Smart Plug ก่อน (คลิก "ตรวจสอบค่าจัดส่ง" ใต้ตะกร้า)',
    fil: 'Pumili muna ng shipping courier para sa Smart Plug (i-click ang "I-check ang Shipping Cost" sa ilalim ng cart).',
    vi: 'Vui lòng chọn đơn vị vận chuyển cho Smart Plug trước (nhấn "Kiểm tra phí vận chuyển" bên dưới giỏ hàng).',
  },
  "billing.alert.fetchRatesFailed": { id: "Gagal mengambil ongkos kirim.", en: "Failed to fetch shipping cost.", ms: "Gagal mendapatkan kos penghantaran.", th: "ไม่สามารถดึงค่าจัดส่งได้", fil: "Nabigong makuha ang shipping cost.", vi: "Không thể lấy phí vận chuyển." },
  "billing.alert.noCourierAvailable": { id: "Belum ada kurir yang aktif untuk rute ini — hubungi NEXBILL.", en: "No active courier for this route yet — contact NEXBILL.", ms: "Belum ada kurier aktif untuk laluan ini — hubungi NEXBILL.", th: "ยังไม่มีผู้ให้บริการจัดส่งที่ใช้งานได้สำหรับเส้นทางนี้ — ติดต่อ NEXBILL", fil: "Wala pang aktibong courier para sa route na ito — makipag-ugnayan sa NEXBILL.", vi: "Chưa có đơn vị vận chuyển hoạt động cho tuyến này — liên hệ NEXBILL." },
  "billing.confirm.cashReceived": { id: "Konfirmasi tunai {amount} sudah diterima NEXBILL?", en: "Confirm that the cash payment of {amount} has been received by NEXBILL?", ms: "Sahkan tunai {amount} telah diterima oleh NEXBILL?", th: "ยืนยันว่า NEXBILL ได้รับเงินสดจำนวน {amount} แล้วใช่หรือไม่?", fil: "Kumpirmahin na natanggap na ng NEXBILL ang cash na {amount}?", vi: "Xác nhận NEXBILL đã nhận được tiền mặt {amount}?" },
});
