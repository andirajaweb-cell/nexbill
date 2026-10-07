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
    id: "Selama percobaan semua fitur Pro terbuka — termasuk akuntansi, aset, PPOB, anti-fraud, dan AI. Smart plug belum bisa dipakai (beli lewat etalase di bawah) dan kontrol TV Android dibatasi 1 unit. Setelah trial, pilih Starter atau Pro.",
    en: "During the trial every Pro feature is open — including accounting, assets, bill payments, anti-fraud, and AI. Smart plug isn't usable yet (buy it from the shop below) and Android TV control is limited to 1 unit. After the trial, choose Starter or Pro.",
    ms: "Semasa percubaan semua ciri Pro dibuka — termasuk perakaunan, aset, PPOB, anti-penipuan dan AI. Smart plug belum boleh digunakan (beli melalui etalase di bawah) dan kawalan TV Android dihadkan kepada 1 unit. Selepas percubaan, pilih Starter atau Pro.",
    th: "ช่วงทดลองใช้เปิดทุกฟีเจอร์ Pro — รวมบัญชี สินทรัพย์ PPOB ป้องกันการทุจริต และ AI Smart plug ยังใช้ไม่ได้ (ซื้อผ่านร้านค้าด้านล่าง) และควบคุม Android TV ได้ 1 เครื่อง หลังทดลองใช้ เลือก Starter หรือ Pro",
    fil: "Habang trial, bukas ang lahat ng Pro feature — kasama ang accounting, assets, PPOB, anti-fraud, at AI. Hindi pa magagamit ang smart plug (bilhin sa tindahan sa baba) at limitado sa 1 unit ang control ng Android TV. Pagkatapos ng trial, pumili ng Starter o Pro.",
    vi: "Trong thời gian dùng thử mở toàn bộ tính năng Pro — gồm kế toán, tài sản, PPOB, chống gian lận và AI. Smart plug chưa thể sử dụng (mua tại gian hàng bên dưới) và điều khiển Android TV giới hạn 1 thiết bị. Sau khi dùng thử, chọn Starter hoặc Pro.",
  },

  // --- Locked (read-only) banner ---
  "billing.locked.title": { id: "Akses terbatas (read-only)", en: "Limited access (read-only)", ms: "Akses terhad (baca sahaja)", th: "การเข้าถึงถูกจำกัด (อ่านอย่างเดียว)", fil: "Limitadong access (read-only)", vi: "Truy cập bị giới hạn (chỉ xem)" },
  "billing.locked.trialExpired": {
    id: "Masa percobaan 30 hari sudah berakhir. Data kamu aman — pilih paket Starter atau Pro di bawah dan selesaikan pembayaran untuk membuka akses kembali.",
    en: "The 30-day trial has ended. Your data is safe — choose Starter or Pro below and complete the payment to unlock access again.",
    ms: "Tempoh percubaan 30 hari telah tamat. Data anda selamat — pilih pelan Starter atau Pro di bawah dan selesaikan bayaran untuk membuka akses semula.",
    th: "ช่วงทดลองใช้ 30 วันสิ้นสุดแล้ว ข้อมูลของคุณปลอดภัย — เลือกแพ็กเกจ Starter หรือ Pro ด้านล่างแล้วชำระเงินเพื่อปลดล็อกอีกครั้ง",
    fil: "Tapos na ang 30 araw na trial. Ligtas ang data mo — pumili ng Starter o Pro sa baba at kumpletuhin ang bayad para ma-unlock muli.",
    vi: "Giai đoạn dùng thử 30 ngày đã kết thúc. Dữ liệu của bạn vẫn an toàn — chọn gói Starter hoặc Pro bên dưới và thanh toán để mở lại quyền truy cập.",
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
    id: "Pilih Starter (per unit PS, fitur operasional) atau Pro (flat per outlet, semua fitur + AI), bulanan atau tahunan — paket yang dipilih otomatis masuk keranjang di samping.",
    en: "Choose Starter (per PS unit, operational features) or Pro (flat per outlet, every feature + AI), monthly or yearly — the chosen plan is added to the cart automatically.",
    ms: "Pilih Starter (setiap unit PS, ciri operasi) atau Pro (rata setiap outlet, semua ciri + AI), bulanan atau tahunan — pelan yang dipilih automatik masuk ke troli.",
    th: "เลือก Starter (ต่อเครื่อง PS ฟีเจอร์งานหน้าร้าน) หรือ Pro (ราคาเดียวต่อสาขา ทุกฟีเจอร์ + AI) รายเดือนหรือรายปี — แพ็กเกจที่เลือกจะเข้าไปในตะกร้าอัตโนมัติ",
    fil: "Pumili ng Starter (bawat PS unit, operational na feature) o Pro (flat bawat outlet, lahat ng feature + AI), buwanan o taunan — awtomatikong nadadagdag sa cart ang napiling plano.",
    vi: "Chọn Starter (theo máy PS, tính năng vận hành) hoặc Pro (giá cố định mỗi cơ sở, mọi tính năng + AI), theo tháng hoặc năm — gói đã chọn tự động vào giỏ hàng.",
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
    id: "Belum ada item lain di keranjang — browse etalase di sebelah kiri untuk tambah smart plug atau jasa instalasi.",
    en: "No other items in the cart yet — browse the shop on the left to add smart plugs or installation service.",
    ms: "Belum ada item lain dalam troli — layari etalase di sebelah kiri untuk tambah smart plug atau perkhidmatan pemasangan.",
    th: "ยังไม่มีสินค้าอื่นในตะกร้า — เรียกดูร้านค้าทางด้านซ้ายเพื่อเพิ่มสมาร์ตปลั๊กหรือบริการติดตั้ง",
    fil: "Wala pang ibang item sa cart — i-browse ang tindahan sa kaliwa para magdagdag ng smart plug o installation service.",
    vi: "Chưa có sản phẩm nào khác trong giỏ hàng — xem gian hàng bên trái để thêm ổ cắm thông minh hoặc dịch vụ lắp đặt.",
  },
  "billing.cart.shippingLabel": { id: "Ongkos Kirim", en: "Shipping Cost", ms: "Kos Penghantaran", th: "ค่าจัดส่ง", fil: "Shipping Cost", vi: "Phí vận chuyển" },
  "billing.cart.shippingNotSelected": { id: "Belum dipilih", en: "Not selected yet", ms: "Belum dipilih", th: "ยังไม่ได้เลือก", fil: "Hindi pa napipili", vi: "Chưa chọn" },
  "billing.cart.total": { id: "Total", en: "Total", ms: "Jumlah", th: "รวม", fil: "Total", vi: "Tổng cộng" },
  "billing.cart.checkout": { id: "Checkout", en: "Checkout", ms: "Checkout", th: "ชำระเงิน", fil: "Checkout", vi: "Thanh toán" },
  "billing.cart.footnote": {
    id: "Setelah checkout, satu tagihan gabungan akan muncul untuk dibayar (Cash/QRIS/VA) — akses terbuka otomatis begitu pembayaran diterima: 30 hari untuk bulanan, 12 bulan untuk tahunan.",
    en: "After checkout, one combined invoice appears for payment (Cash/QRIS/VA) — access unlocks automatically once payment is received: 30 days for monthly, 12 months for yearly.",
    ms: "Selepas checkout, satu invois gabungan akan muncul untuk dibayar (Cash/QRIS/VA) — akses dibuka automatik sebaik bayaran diterima: 30 hari untuk bulanan, 12 bulan untuk tahunan.",
    th: "หลังชำระเงิน จะมีใบแจ้งหนี้รวมหนึ่งใบให้ชำระ (เงินสด/QRIS/VA) — ปลดล็อกอัตโนมัติเมื่อได้รับเงิน: 30 วันสำหรับรายเดือน 12 เดือนสำหรับรายปี",
    fil: "Pagkatapos mag-checkout, lalabas ang isang pinagsamang invoice (Cash/QRIS/VA) — awtomatikong bubukas ang access kapag natanggap ang bayad: 30 araw para sa buwanan, 12 buwan para sa taunan.",
    vi: "Sau khi thanh toán, một hóa đơn gộp sẽ xuất hiện (Tiền mặt/QRIS/VA) — tự động mở khi nhận được tiền: 30 ngày với gói tháng, 12 tháng với gói năm.",
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
    id: "Terkunci — di paket Starter, AI diaktifkan sebagai Add-on terpisah karena setiap pemakaiannya punya biaya nyata ke penyedia AI. Paket Pro sudah termasuk AI.",
    en: "Locked — on Starter, AI is activated as a separate add-on because every use has a real cost to the AI provider. The Pro plan includes AI.",
    ms: "Terkunci — pada pelan Starter, AI diaktifkan sebagai Add-on berasingan kerana setiap penggunaan mempunyai kos sebenar kepada penyedia AI. Pelan Pro sudah termasuk AI.",
    th: "ล็อกอยู่ — ในแพ็กเกจ Starter ต้องเปิด AI เป็นส่วนเสริมแยก เพราะการใช้แต่ละครั้งมีต้นทุนจริงกับผู้ให้บริการ AI แพ็กเกจ Pro รวม AI แล้ว",
    fil: "Naka-lock — sa Starter, ina-activate ang AI bilang hiwalay na add-on dahil may aktwal na gastos sa AI provider ang bawat paggamit. Kasama na ang AI sa Pro.",
    vi: "Đang khóa — với gói Starter, AI được kích hoạt như tiện ích mua thêm vì mỗi lần dùng đều có chi phí thực cho nhà cung cấp AI. Gói Pro đã bao gồm AI.",
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

  // --- More alerts (auto-poll / sync) ---
  "billing.alert.autoPaid": { id: "Berhasil melakukan pembayaran secara otomatis!", en: "Payment completed automatically!", ms: "Pembayaran berjaya dibuat secara automatik!", th: "ชำระเงินสำเร็จโดยอัตโนมัติ!", fil: "Matagumpay na nakumpleto ang bayad nang awtomatiko!", vi: "Thanh toán tự động thành công!" },
  "billing.alert.syncPaid": { id: "Pembayaran berhasil dikonfirmasi dan lunas!", en: "Payment confirmed and marked as paid!", ms: "Bayaran berjaya disahkan dan selesai!", th: "ยืนยันการชำระเงินสำเร็จและชำระเรียบร้อยแล้ว!", fil: "Matagumpay na na-confirm ang bayad at bayad na ito!", vi: "Đã xác nhận thanh toán thành công!" },
  "billing.alert.syncPending": {
    id: "Pembayaran belum diterima atau masih tertunda di payment gateway. Sistem mengecek otomatis setiap 5 detik.",
    en: "Payment hasn't been received yet, or is still pending at the payment gateway. The system checks automatically every 5 seconds.",
    ms: "Bayaran belum diterima atau masih tertangguh di payment gateway. Sistem menyemak secara automatik setiap 5 saat.",
    th: "ยังไม่ได้รับการชำระเงินหรือยังอยู่ระหว่างดำเนินการที่เกตเวย์การชำระเงิน ระบบจะตรวจสอบอัตโนมัติทุก 5 วินาที",
    fil: "Hindi pa natatanggap ang bayad o pending pa sa payment gateway. Awtomatikong che-check ng sistema kada 5 segundo.",
    vi: "Chưa nhận được thanh toán hoặc vẫn đang chờ xử lý tại cổng thanh toán. Hệ thống sẽ tự động kiểm tra mỗi 5 giây.",
  },

  // --- Tab navigation bar ---
  "billing.tab.dashboard": { id: "Dashboard", en: "Dashboard", ms: "Dashboard", th: "แดชบอร์ด", fil: "Dashboard", vi: "Bảng điều khiển" },
  "billing.tab.profile": { id: "Profil Billing", en: "Billing Profile", ms: "Profil Bil", th: "โปรไฟล์การเรียกเก็บเงิน", fil: "Billing Profile", vi: "Hồ sơ thanh toán" },
  "billing.tab.deposit": { id: "Saldo Deposit", en: "Deposit Balance", ms: "Baki Deposit", th: "ยอดเงินฝาก", fil: "Deposit Balance", vi: "Số dư đặt cọc" },
  "billing.tab.invoices": { id: "Riwayat Faktur", en: "Invoice History", ms: "Sejarah Invois", th: "ประวัติใบแจ้งหนี้", fil: "History ng Invoice", vi: "Lịch sử hóa đơn" },
  "billing.tab.usage": { id: "Pertumbuhan Data", en: "Usage Growth", ms: "Pertumbuhan Data", th: "การเติบโตของข้อมูล", fil: "Paglago ng Data", vi: "Tăng trưởng dữ liệu" },
  "billing.tab.toko": { id: "Toko", en: "Store", ms: "Kedai", th: "ร้านค้า", fil: "Tindahan", vi: "Cửa hàng" },

  // --- "Toko" tab — standalone product purchase, separate from subscription checkout ---
  "billing.toko.intro": {
    id: "Belanja produk fisik NEXBILL (Smart Plug, produk lain) kapan saja — terpisah dari tagihan langganan, bisa dibeli meskipun akses NEXBILL sedang terkunci.",
    en: "Shop NEXBILL's physical products (Smart Plug, other items) anytime — separate from your subscription invoice, purchasable even while NEXBILL access is locked.",
    ms: "Beli produk fizikal NEXBILL (Smart Plug, produk lain) pada bila-bila masa — berasingan daripada bil langganan, boleh dibeli walaupun akses NEXBILL sedang dikunci.",
    th: "ซื้อสินค้าจริงของ NEXBILL (Smart Plug ผลิตภัณฑ์อื่นๆ) ได้ทุกเมื่อ — แยกจากบิลสมาชิก สามารถซื้อได้แม้การเข้าใช้งาน NEXBILL จะถูกล็อกอยู่",
    fil: "Bumili ng mga pisikal na produkto ng NEXBILL (Smart Plug, iba pang produkto) anumang oras — hiwalay sa bill ng subscription, mabibili kahit naka-lock ang access sa NEXBILL.",
    vi: "Mua sản phẩm vật lý của NEXBILL (Smart Plug, sản phẩm khác) bất cứ lúc nào — tách biệt với hóa đơn thuê bao, có thể mua kể cả khi quyền truy cập NEXBILL đang bị khóa.",
  },
  "billing.toko.empty": { id: "Belum ada produk di Toko.", en: "No products in the Store yet.", ms: "Belum ada produk di Kedai.", th: "ยังไม่มีสินค้าในร้านค้า", fil: "Wala pang produkto sa Tindahan.", vi: "Chưa có sản phẩm nào trong Cửa hàng." },
  "billing.toko.emptyCart": { id: "Keranjang Toko masih kosong.", en: "Your Store cart is still empty.", ms: "Troli Kedai masih kosong.", th: "ตะกร้าร้านค้ายังว่างอยู่", fil: "Wala pang laman ang cart ng Tindahan.", vi: "Giỏ hàng Cửa hàng vẫn còn trống." },
  "billing.toko.cartEmpty": {
    id: "Belum ada item di keranjang — browse Toko di sebelah kiri.",
    en: "No items in your cart yet — browse the Store on the left.",
    ms: "Belum ada item dalam troli — layari Kedai di sebelah kiri.",
    th: "ยังไม่มีสินค้าในตะกร้า — เลือกดูร้านค้าทางด้านซ้าย",
    fil: "Wala pang item sa cart — mag-browse sa Tindahan sa kaliwa.",
    vi: "Chưa có sản phẩm nào trong giỏ hàng — hãy xem Cửa hàng ở bên trái.",
  },
  "billing.toko.noteShippingOnly": {
    id: "Wajib diisi karena ada produk fisik di keranjang — barang dikirim ke alamat ini.",
    en: "Required because there's a physical product in your cart — the item ships to this address.",
    ms: "Wajib diisi kerana terdapat produk fizikal dalam troli — barang dihantar ke alamat ini.",
    th: "จำเป็นต้องกรอกเพราะมีสินค้าจริงในตะกร้า — สินค้าจะถูกจัดส่งไปยังที่อยู่นี้",
    fil: "Kailangang punan dahil may pisikal na produkto sa cart — ipapadala ang item sa address na ito.",
    vi: "Bắt buộc điền vì có sản phẩm vật lý trong giỏ hàng — hàng sẽ được giao đến địa chỉ này.",
  },
  "billing.toko.footnote": {
    id: 'Setelah checkout, tagihan terpisah dari langganan akan muncul di kartu "Tagihan Belum Lunas" pada tab Dashboard — bayar lewat Cash/QRIS/VA/iPaymu.',
    en: 'After checkout, an invoice separate from your subscription will appear in the "Unpaid Invoices" card on the Dashboard tab — pay via Cash/QRIS/VA/iPaymu.',
    ms: 'Selepas checkout, invois berasingan daripada langganan akan muncul dalam kad "Tagihan Belum Bayar" pada tab Dashboard — bayar melalui Cash/QRIS/VA/iPaymu.',
    th: 'หลังจากชำระเงิน ใบแจ้งหนี้ที่แยกจากค่าสมาชิกจะปรากฏในการ์ด "ใบแจ้งหนี้ที่ยังไม่ชำระ" บนแท็บแดชบอร์ด — ชำระผ่าน Cash/QRIS/VA/iPaymu',
    fil: 'Pagkatapos mag-checkout, lalabas ang invoice na hiwalay sa subscription sa card na "Mga Hindi Pa Bayad na Invoice" sa tab ng Dashboard — bayaran via Cash/QRIS/VA/iPaymu.',
    vi: 'Sau khi thanh toán, hóa đơn tách biệt với thuê bao sẽ xuất hiện ở thẻ "Hóa đơn chưa thanh toán" trên tab Dashboard — thanh toán qua Cash/QRIS/VA/iPaymu.',
  },
  "billing.toko.orderCreated": {
    id: 'Pesanan dibuat — selesaikan pembayarannya di kartu "Tagihan Belum Lunas" pada tab Dashboard.',
    en: 'Order created — complete payment in the "Unpaid Invoices" card on the Dashboard tab.',
    ms: 'Pesanan dibuat — selesaikan bayaran dalam kad "Tagihan Belum Bayar" pada tab Dashboard.',
    th: 'สร้างคำสั่งซื้อแล้ว — ชำระเงินให้เสร็จสิ้นที่การ์ด "ใบแจ้งหนี้ที่ยังไม่ชำระ" บนแท็บแดชบอร์ด',
    fil: 'Nagawa ang order — kumpletuhin ang bayad sa card na "Mga Hindi Pa Bayad na Invoice" sa tab ng Dashboard.',
    vi: 'Đã tạo đơn hàng — hoàn tất thanh toán tại thẻ "Hóa đơn chưa thanh toán" trên tab Dashboard.',
  },
  "billing.toko.category.otherProduct": { id: "Produk Lain", en: "Other Products", ms: "Produk Lain", th: "ผลิตภัณฑ์อื่นๆ", fil: "Ibang Produkto", vi: "Sản phẩm khác" },

  // --- Unpaid invoice auto-expire notice + generalized sync/reopen buttons ---
  "billing.invoices.autoExpireNotice": {
    id: "Tagihan yang belum dibayar dalam 2x24 jam akan otomatis kedaluwarsa (dibatalkan otomatis, tetap tercatat di Riwayat Faktur).",
    en: "Invoices left unpaid for 2x24 hours automatically expire (auto-cancelled, still recorded in Invoice History).",
    ms: "Invois yang tidak dibayar dalam masa 2x24 jam akan tamat tempoh secara automatik (dibatalkan automatik, tetap direkodkan dalam Sejarah Invois).",
    th: "ใบแจ้งหนี้ที่ยังไม่ชำระภายใน 2x24 ชั่วโมงจะหมดอายุโดยอัตโนมัติ (ยกเลิกอัตโนมัติ แต่ยังคงบันทึกไว้ในประวัติใบแจ้งหนี้)",
    fil: "Ang mga invoice na hindi nabayaran sa loob ng 2x24 oras ay awtomatikong mag-e-expire (awtomatikong makakansela, naka-record pa rin sa History ng Invoice).",
    vi: "Hóa đơn chưa thanh toán trong 2x24 giờ sẽ tự động hết hạn (tự động hủy, vẫn được ghi lại trong Lịch sử hóa đơn).",
  },
  "billing.invoices.syncStatus": { id: "Cek Status Pembayaran", en: "Check Payment Status", ms: "Semak Status Bayaran", th: "ตรวจสอบสถานะการชำระเงิน", fil: "I-check ang Payment Status", vi: "Kiểm tra trạng thái thanh toán" },
  "billing.invoices.reopenPayment": { id: "Buka Halaman Pembayaran", en: "Open Payment Page", ms: "Buka Halaman Bayaran", th: "เปิดหน้าชำระเงิน", fil: "Buksan ang Payment Page", vi: "Mở lại trang thanh toán" },
  "billing.invoices.vaAmountNote": { id: "Sistem kami akan memeriksa pembayaran ini secara otomatis.", en: "Our system will check this payment automatically.", ms: "Sistem kami akan menyemak bayaran ini secara automatik.", th: "ระบบของเราจะตรวจสอบการชำระเงินนี้โดยอัตโนมัติ", fil: "Awtomatikong che-check ng aming sistema ang bayad na ito.", vi: "Hệ thống sẽ tự động kiểm tra thanh toán này." },
  "billing.invoices.qrisNote": { id: "Silakan scan kode QRIS ini. Sistem akan mengecek otomatis.", en: "Please scan this QRIS code. The system will check automatically.", ms: "Sila imbas kod QRIS ini. Sistem akan menyemak secara automatik.", th: "กรุณาสแกนรหัส QRIS นี้ ระบบจะตรวจสอบโดยอัตโนมัติ", fil: "Paki-scan ang QRIS code na ito. Awtomatikong che-check ng sistema.", vi: "Vui lòng quét mã QRIS này. Hệ thống sẽ tự động kiểm tra." },
  "billing.invoices.ipaymuHostedPending": {
    id: "Pembayaran via E-Wallet/Retail sedang diproses. Silakan selesaikan di halaman iPaymu, atau klik 'Buka Hal. Pembayaran'.",
    en: "E-Wallet/Retail payment is being processed. Please complete it on the iPaymu page, or click 'Reopen Payment Page'.",
    ms: "Bayaran E-Wallet/Runcit sedang diproses. Sila selesaikan di halaman iPaymu, atau klik 'Buka Semula Halaman Bayaran'.",
    th: "การชำระเงินผ่าน E-Wallet/ร้านค้าปลีกกำลังดำเนินการ กรุณาชำระให้เสร็จสิ้นที่หน้า iPaymu หรือคลิก 'เปิดหน้าชำระเงินอีกครั้ง'",
    fil: "Pinoproseso ang bayad sa E-Wallet/Retail. Paki-kumpleto sa pahina ng iPaymu, o i-click ang 'Buksan Muli ang Payment Page'.",
    vi: "Thanh toán qua Ví điện tử/Cửa hàng bán lẻ đang được xử lý. Vui lòng hoàn tất trên trang iPaymu, hoặc nhấn 'Mở lại trang thanh toán'.",
  },
  "billing.invoices.crossBorderNote": { id: "Sistem akan mengecek pembayaran ini secara otomatis.", en: "The system will check this payment automatically.", ms: "Sistem akan menyemak bayaran ini secara automatik.", th: "ระบบจะตรวจสอบการชำระเงินนี้โดยอัตโนมัติ", fil: "Awtomatikong che-check ng sistema ang bayad na ito.", vi: "Hệ thống sẽ tự động kiểm tra thanh toán này." },
  "billing.method.ipaymuHosted": { id: "E-Wallet / Retail", en: "E-Wallet / Retail", ms: "E-Wallet / Runcit", th: "E-Wallet / ร้านค้าปลีก", fil: "E-Wallet / Retail", vi: "Ví điện tử / Cửa hàng bán lẻ" },
  // The single button that replaced the per-channel row on 2026-09-16 — it sends the outlet to
  // iPaymu's hosted page, where the channel is actually picked.
  "billing.invoices.payNow": { id: "Bayar Sekarang", en: "Pay Now", ms: "Bayar Sekarang", th: "ชำระเงินตอนนี้", fil: "Magbayad Ngayon", vi: "Thanh toán ngay" },
  "billing.alert.noPaymentUrl": { id: "Halaman pembayaran belum bisa dibuka. Coba lagi, atau hubungi NEXBILL bila berulang.", en: "The payment page could not be opened. Please try again, or contact NEXBILL if this keeps happening.", ms: "Halaman bayaran tidak dapat dibuka. Cuba lagi, atau hubungi NEXBILL jika berulang.", th: "ไม่สามารถเปิดหน้าชำระเงินได้ กรุณาลองใหม่ หรือติดต่อ NEXBILL หากยังเกิดขึ้นอีก", fil: "Hindi mabuksan ang payment page. Subukan ulit, o makipag-ugnayan sa NEXBILL kung paulit-ulit ito.", vi: "Không thể mở trang thanh toán. Vui lòng thử lại, hoặc liên hệ NEXBILL nếu tình trạng này lặp lại." },

  // --- Invoice type/status labels shared with InvoiceHistoryTab ---
  "billing.invoiceType.depositTopup": { id: "Top Up Saldo Deposit", en: "Deposit Balance Top Up", ms: "Tambah Nilai Baki Deposit", th: "เติมยอดเงินฝาก", fil: "Top Up ng Deposit Balance", vi: "Nạp tiền vào số dư đặt cọc" },
  "billing.invoiceType.productOrder": { id: "Belanja Toko", en: "Store Purchase", ms: "Belian Kedai", th: "การซื้อจากร้านค้า", fil: "Pagbili sa Tindahan", vi: "Mua hàng tại Cửa hàng" },
  "billing.invoiceStatus.unpaid": { id: "Belum Bayar", en: "Unpaid", ms: "Belum Bayar", th: "ยังไม่ชำระ", fil: "Hindi Pa Bayad", vi: "Chưa thanh toán" },
  "billing.invoiceStatus.paid": { id: "Lunas", en: "Paid", ms: "Selesai", th: "ชำระแล้ว", fil: "Bayad na", vi: "Đã thanh toán" },
  "billing.invoiceStatus.expired": { id: "Kedaluwarsa (Otomatis)", en: "Expired (Automatic)", ms: "Tamat Tempoh (Automatik)", th: "หมดอายุ (อัตโนมัติ)", fil: "Na-expire (Awtomatiko)", vi: "Đã hết hạn (Tự động)" },
  "billing.invoiceStatus.cancelled": { id: "Dibatalkan", en: "Cancelled", ms: "Dibatalkan", th: "ยกเลิกแล้ว", fil: "Kinansela", vi: "Đã hủy" },
  "billing.history.viewAll": { id: "Lihat semua di Riwayat Faktur →", en: "View all in Invoice History →", ms: "Lihat semua dalam Sejarah Invois →", th: "ดูทั้งหมดในประวัติใบแจ้งหนี้ →", fil: "Tingnan lahat sa History ng Invoice →", vi: "Xem tất cả trong Lịch sử hóa đơn →" },

  // --- Riwayat Faktur (InvoiceHistoryTab) ---
  "billing.invoiceHistory.title": { id: "Riwayat Faktur", en: "Invoice History", ms: "Sejarah Invois", th: "ประวัติใบแจ้งหนี้", fil: "History ng Invoice", vi: "Lịch sử hóa đơn" },
  "billing.invoiceHistory.filterAll": { id: "Semua", en: "All", ms: "Semua", th: "ทั้งหมด", fil: "Lahat", vi: "Tất cả" },
  "billing.invoiceHistory.empty": { id: "Tidak ada faktur untuk filter ini.", en: "No invoices for this filter.", ms: "Tiada invois untuk penapis ini.", th: "ไม่มีใบแจ้งหนี้สำหรับตัวกรองนี้", fil: "Walang invoice para sa filter na ito.", vi: "Không có hóa đơn nào cho bộ lọc này." },
  "billing.invoiceHistory.print": { id: "Cetak / Unduh", en: "Print / Download", ms: "Cetak / Muat Turun", th: "พิมพ์ / ดาวน์โหลด", fil: "I-print / I-download", vi: "In / Tải xuống" },
  "billing.invoiceHistory.autoExpiredNote": { id: "kedaluwarsa otomatis 2x24 jam", en: "auto-expired after 2x24 hours", ms: "tamat tempoh automatik selepas 2x24 jam", th: "หมดอายุอัตโนมัติหลัง 2x24 ชั่วโมง", fil: "awtomatikong na-expire pagkatapos ng 2x24 oras", vi: "tự động hết hạn sau 2x24 giờ" },
  "billing.invoices.lineType": { id: "Jenis Tagihan", en: "Invoice Type", ms: "Jenis Invois", th: "ประเภทใบแจ้งหนี้", fil: "Uri ng Invoice", vi: "Loại hóa đơn" },
  "billing.invoices.lineStatus": { id: "Status", en: "Status", ms: "Status", th: "สถานะ", fil: "Status", vi: "Trạng thái" },
  "billing.invoices.lineCreated": { id: "Dibuat", en: "Created", ms: "Dicipta", th: "สร้างเมื่อ", fil: "Ginawa", vi: "Ngày tạo" },
  "billing.invoices.linePaid": { id: "Dibayar", en: "Paid", ms: "Dibayar", th: "ชำระเมื่อ", fil: "Binayaran", vi: "Ngày thanh toán" },

  // --- Saldo Deposit (DepositTab) ---
  "billing.deposit.balanceLabel": { id: "Saldo Deposit", en: "Deposit Balance", ms: "Baki Deposit", th: "ยอดเงินฝาก", fil: "Deposit Balance", vi: "Số dư đặt cọc" },
  "billing.deposit.balanceGroupLabel": { id: "Saldo Deposit (gabungan multi-outlet)", en: "Deposit Balance (combined multi-outlet)", ms: "Baki Deposit (gabungan pelbagai outlet)", th: "ยอดเงินฝาก (รวมหลายสาขา)", fil: "Deposit Balance (pinagsamang multi-outlet)", vi: "Số dư đặt cọc (gộp nhiều chi nhánh)" },
  "billing.deposit.amountPlaceholder": { id: "Jumlah (Rp)", en: "Amount (Rp)", ms: "Jumlah (Rp)", th: "จำนวน (Rp)", fil: "Halaga (Rp)", vi: "Số tiền (Rp)" },
  "billing.deposit.topupButton": { id: "Tambah Deposit", en: "Add Deposit", ms: "Tambah Deposit", th: "เติมเงินฝาก", fil: "Magdagdag ng Deposit", vi: "Nạp thêm tiền" },
  "billing.deposit.invalidAmount": { id: "Masukkan jumlah top up yang valid.", en: "Enter a valid top-up amount.", ms: "Masukkan jumlah tambah nilai yang sah.", th: "กรอกจำนวนเงินเติมที่ถูกต้อง", fil: "Maglagay ng valid na halaga para sa top up.", vi: "Nhập số tiền nạp hợp lệ." },
  "billing.deposit.invoiceCreated": {
    id: "Tagihan top up dibuat — selesaikan pembayarannya di bagian Tagihan Belum Lunas.",
    en: "Top-up invoice created — complete the payment in the Unpaid Invoices section.",
    ms: "Invois tambah nilai dicipta — selesaikan bayaran di bahagian Invois Belum Selesai.",
    th: "สร้างใบแจ้งหนี้เติมเงินแล้ว — กรุณาชำระเงินให้เสร็จสิ้นในส่วนใบแจ้งหนี้ที่ยังไม่ชำระ",
    fil: "Nagawa na ang top-up invoice — kumpletuhin ang bayad sa seksyon ng Mga Hindi Pa Bayad na Invoice.",
    vi: "Đã tạo hóa đơn nạp tiền — hoàn tất thanh toán tại mục Hóa đơn chưa thanh toán.",
  },
  "billing.deposit.loadFailed": { id: "Gagal memuat saldo deposit.", en: "Failed to load deposit balance.", ms: "Gagal memuatkan baki deposit.", th: "โหลดยอดเงินฝากไม่สำเร็จ", fil: "Nabigong i-load ang deposit balance.", vi: "Không tải được số dư đặt cọc." },
  "billing.deposit.autoApplyNote": {
    id: "Saldo deposit otomatis dipakai untuk membayar tagihan perpanjangan langganan berikutnya, sebagian atau penuh, tanpa perlu tindakan tambahan.",
    en: "The deposit balance is automatically used to pay your next renewal invoice, partially or in full, with no extra action needed.",
    ms: "Baki deposit digunakan secara automatik untuk membayar invois pembaharuan langganan seterusnya, sebahagian atau sepenuhnya, tanpa tindakan tambahan.",
    th: "ยอดเงินฝากจะถูกนำมาใช้ชำระใบแจ้งหนี้ต่ออายุครั้งถัดไปโดยอัตโนมัติ ไม่ว่าจะบางส่วนหรือเต็มจำนวน โดยไม่ต้องดำเนินการเพิ่มเติม",
    fil: "Awtomatikong ginagamit ang deposit balance para bayaran ang susunod na renewal invoice, bahagya man o buo, nang walang karagdagang aksyon.",
    vi: "Số dư đặt cọc sẽ tự động được dùng để thanh toán hóa đơn gia hạn tiếp theo, một phần hoặc toàn bộ, không cần thao tác thêm.",
  },
  "billing.deposit.mutationsHeading": { id: "Daftar Mutasi", en: "Mutation List", ms: "Senarai Mutasi", th: "รายการเคลื่อนไหว", fil: "Listahan ng Mutation", vi: "Danh sách biến động" },
  "billing.deposit.noMutations": { id: "Belum ada mutasi saldo deposit.", en: "No deposit balance mutations yet.", ms: "Belum ada mutasi baki deposit.", th: "ยังไม่มีรายการเคลื่อนไหวยอดเงินฝาก", fil: "Wala pang mutation sa deposit balance.", vi: "Chưa có biến động số dư đặt cọc nào." },
  "billing.deposit.balanceAfter": { id: "Saldo: {n}", en: "Balance: {n}", ms: "Baki: {n}", th: "ยอดคงเหลือ: {n}", fil: "Balanse: {n}", vi: "Số dư: {n}" },
  "billing.deposit.type.topup": { id: "Top Up", en: "Top Up", ms: "Tambah Nilai", th: "เติมเงิน", fil: "Top Up", vi: "Nạp tiền" },
  "billing.deposit.type.usage": { id: "Pemakaian", en: "Usage", ms: "Penggunaan", th: "การใช้งาน", fil: "Paggamit", vi: "Sử dụng" },
  "billing.deposit.type.refund": { id: "Refund", en: "Refund", ms: "Bayaran Balik", th: "การคืนเงิน", fil: "Refund", vi: "Hoàn tiền" },
  "billing.deposit.type.adjustment": { id: "Penyesuaian", en: "Adjustment", ms: "Pelarasan", th: "การปรับปรุง", fil: "Adjustment", vi: "Điều chỉnh" },

  // --- Profil Billing (BillingProfileTab) ---
  "billing.profile.title": { id: "Profil Billing — Data Faktur Pajak", en: "Billing Profile — Tax Invoice Data", ms: "Profil Bil — Data Invois Cukai", th: "โปรไฟล์การเรียกเก็บเงิน — ข้อมูลใบกำกับภาษี", fil: "Billing Profile — Datos ng Tax Invoice", vi: "Hồ sơ thanh toán — Dữ liệu hóa đơn thuế" },
  "billing.profile.subtitle": {
    id: "Data ini dipakai untuk mencetak Faktur Pajak/invoice resmi NEXBILL atas nama outlet ini — sama seperti Profil Billing di Accurate.id.",
    en: "This data is used to print NEXBILL's official Tax Invoice/invoice under this outlet's name — just like the Billing Profile on Accurate.id.",
    ms: "Data ini digunakan untuk mencetak Invois Cukai/invois rasmi NEXBILL atas nama outlet ini — sama seperti Profil Bil di Accurate.id.",
    th: "ข้อมูลนี้ใช้สำหรับพิมพ์ใบกำกับภาษี/ใบแจ้งหนี้อย่างเป็นทางการของ NEXBILL ในนามของสาขานี้ — เช่นเดียวกับโปรไฟล์การเรียกเก็บเงินใน Accurate.id",
    fil: "Ginagamit ang datos na ito para i-print ang opisyal na Tax Invoice/invoice ng NEXBILL sa ngalan ng outlet na ito — katulad ng Billing Profile sa Accurate.id.",
    vi: "Dữ liệu này dùng để in Hóa đơn thuế/hóa đơn chính thức của NEXBILL dưới tên chi nhánh này — giống như Hồ sơ thanh toán trên Accurate.id.",
  },
  "billing.profile.hasNpwp": { id: "Outlet ini memiliki NPWP", en: "This outlet has an NPWP (tax ID)", ms: "Outlet ini mempunyai NPWP (ID cukai)", th: "สาขานี้มี NPWP (เลขประจำตัวผู้เสียภาษี)", fil: "May NPWP (tax ID) ang outlet na ito", vi: "Chi nhánh này có NPWP (mã số thuế)" },
  "billing.profile.npwpNumber": { id: "Nomor NPWP", en: "NPWP Number", ms: "Nombor NPWP", th: "หมายเลข NPWP", fil: "NPWP Number", vi: "Số NPWP" },
  "billing.profile.nitku": { id: "NITKU (jika ada)", en: "NITKU (if any)", ms: "NITKU (jika ada)", th: "NITKU (ถ้ามี)", fil: "NITKU (kung meron)", vi: "NITKU (nếu có)" },
  "billing.profile.taxpayerName": { id: "Nama Wajib Pajak", en: "Taxpayer Name", ms: "Nama Pembayar Cukai", th: "ชื่อผู้เสียภาษี", fil: "Pangalan ng Taxpayer", vi: "Tên người nộp thuế" },
  "billing.profile.entityType": { id: "Jenis Badan Usaha", en: "Business Entity Type", ms: "Jenis Entiti Perniagaan", th: "ประเภทนิติบุคคล", fil: "Uri ng Business Entity", vi: "Loại hình doanh nghiệp" },
  "billing.profile.entitySelect": { id: "— Pilih —", en: "— Select —", ms: "— Pilih —", th: "— เลือก —", fil: "— Pumili —", vi: "— Chọn —" },
  "billing.profile.entity.individual": { id: "Perorangan", en: "Individual", ms: "Individu", th: "บุคคลธรรมดา", fil: "Indibidwal", vi: "Cá nhân" },
  "billing.profile.entity.corporate": { id: "Badan Usaha (PT/CV/dll)", en: "Corporate Entity (PT/CV/etc.)", ms: "Entiti Perniagaan (PT/CV/dll)", th: "นิติบุคคล (PT/CV/อื่นๆ)", fil: "Business Entity (PT/CV/atbp.)", vi: "Doanh nghiệp (PT/CV/khác)" },
  "billing.profile.entity.branch": { id: "Cabang", en: "Branch", ms: "Cawangan", th: "สาขา", fil: "Sangay", vi: "Chi nhánh" },
  "billing.profile.taxpayerAddress": { id: "Alamat Wajib Pajak", en: "Taxpayer Address", ms: "Alamat Pembayar Cukai", th: "ที่อยู่ผู้เสียภาษี", fil: "Address ng Taxpayer", vi: "Địa chỉ người nộp thuế" },
  "billing.profile.businessType": { id: "Jenis Usaha", en: "Business Type", ms: "Jenis Perniagaan", th: "ประเภทธุรกิจ", fil: "Uri ng Negosyo", vi: "Loại hình kinh doanh" },
  "billing.profile.businessTypePlaceholder": { id: "mis. Rental PlayStation / Warnet", en: "e.g. PlayStation Rental / Internet Cafe", ms: "cth. Sewaan PlayStation / Kafe Internet", th: "เช่น ร้านเช่า PlayStation / ร้านอินเทอร์เน็ต", fil: "hal. Rental PlayStation / Internet Cafe", vi: "vd. Cho thuê PlayStation / Quán net" },
  "billing.profile.save": { id: "Simpan Profil Billing", en: "Save Billing Profile", ms: "Simpan Profil Bil", th: "บันทึกโปรไฟล์การเรียกเก็บเงิน", fil: "I-save ang Billing Profile", vi: "Lưu hồ sơ thanh toán" },
  "billing.profile.saved": { id: "Profil Billing berhasil disimpan.", en: "Billing Profile saved successfully.", ms: "Profil Bil berjaya disimpan.", th: "บันทึกโปรไฟล์การเรียกเก็บเงินสำเร็จ", fil: "Matagumpay na na-save ang Billing Profile.", vi: "Đã lưu hồ sơ thanh toán thành công." },
  "billing.profile.loadFailed": { id: "Gagal memuat profil billing.", en: "Failed to load billing profile.", ms: "Gagal memuatkan profil bil.", th: "โหลดโปรไฟล์การเรียกเก็บเงินไม่สำเร็จ", fil: "Nabigong i-load ang billing profile.", vi: "Không tải được hồ sơ thanh toán." },

  // --- Pertumbuhan Data (UsageGrowthTab) ---
  "billing.usage.title": { id: "Pertumbuhan Data — Transaksi & Pendapatan 6 Bulan Terakhir", en: "Usage Growth — Transactions & Revenue, Last 6 Months", ms: "Pertumbuhan Data — Transaksi & Pendapatan 6 Bulan Terakhir", th: "การเติบโตของข้อมูล — ธุรกรรมและรายได้ 6 เดือนล่าสุด", fil: "Paglago ng Data — Transaksyon at Kita sa Huling 6 na Buwan", vi: "Tăng trưởng dữ liệu — Giao dịch & Doanh thu 6 tháng gần nhất" },
  "billing.usage.totalOrders": { id: "Total Transaksi (6 bulan)", en: "Total Transactions (6 months)", ms: "Jumlah Transaksi (6 bulan)", th: "ธุรกรรมทั้งหมด (6 เดือน)", fil: "Kabuuang Transaksyon (6 buwan)", vi: "Tổng giao dịch (6 tháng)" },
  "billing.usage.totalRevenue": { id: "Total Pendapatan (6 bulan)", en: "Total Revenue (6 months)", ms: "Jumlah Pendapatan (6 bulan)", th: "รายได้ทั้งหมด (6 เดือน)", fil: "Kabuuang Kita (6 buwan)", vi: "Tổng doanh thu (6 tháng)" },
  "billing.usage.ordersLegend": { id: "Transaksi", en: "Transactions", ms: "Transaksi", th: "ธุรกรรม", fil: "Transaksyon", vi: "Giao dịch" },
  "billing.usage.revenueLegend": { id: "Pendapatan", en: "Revenue", ms: "Pendapatan", th: "รายได้", fil: "Kita", vi: "Doanh thu" },
  "billing.usage.empty": { id: "Belum ada data transaksi untuk ditampilkan.", en: "No transaction data to show yet.", ms: "Belum ada data transaksi untuk dipaparkan.", th: "ยังไม่มีข้อมูลธุรกรรมให้แสดง", fil: "Wala pang transaction data na ipapakita.", vi: "Chưa có dữ liệu giao dịch để hiển thị." },

  // --- Billing (terjemahan yang sebelumnya hilang) ---
  "billing.freeForever.title": { id: "Akses Gratis Selamanya", en: "Free Access Forever", ms: "Akses Percuma Selamanya", th: "ใช้งานฟรีตลอดไป", fil: "Libreng Access Habambuhay", vi: "Truy cập miễn phí vĩnh viễn" },
  "billing.freeForever.body": { id: "Outlet ini mendapat akses NEXBILL gratis permanen dari tim NEXBILL — tidak akan pernah ditagih. Konsol, cabang, dan staf tanpa batas. AI Add-on (Business Assistant & Insights) tetap dibeli terpisah seperti outlet lain.", en: "This outlet has permanent free NEXBILL access from the NEXBILL team — it will never be billed. Unlimited consoles, branches, and staff. The AI Add-on (Business Assistant & Insights) is still purchased separately like other outlets.", ms: "Outlet ini mendapat akses NEXBILL percuma secara kekal daripada pasukan NEXBILL — tidak akan dicaj. Konsol, cawangan, dan kakitangan tanpa had. AI Add-on (Business Assistant & Insights) tetap dibeli secara berasingan seperti outlet lain.", th: "สาขานี้ได้รับสิทธิ์ใช้ NEXBILL ฟรีถาวรจากทีม NEXBILL — จะไม่ถูกเรียกเก็บเงิน คอนโซล สาขา และพนักงานไม่จำกัด ส่วน AI Add-on (Business Assistant & Insights) ยังคงซื้อแยกเหมือนสาขาอื่น", fil: "May permanenteng libreng NEXBILL access ang outlet na ito mula sa NEXBILL team — hindi ito sisingilin kailanman. Walang limit sa console, sangay, at staff. Hiwalay pa ring binibili ang AI Add-on (Business Assistant & Insights) gaya ng ibang outlet.", vi: "Cửa hàng này được NEXBILL cấp quyền truy cập miễn phí vĩnh viễn — sẽ không bao giờ bị tính phí. Không giới hạn máy chơi, chi nhánh và nhân viên. AI Add-on (Business Assistant & Insights) vẫn mua riêng như các cửa hàng khác." },

  // --- Key peta (label/placeholder) (terjemahan yang sebelumnya hilang) ---
  "billing.status.freeForever": { id: "Gratis Selamanya", en: "Free Forever", ms: "Percuma Selamanya", th: "ฟรีตลอดไป", fil: "Libre Habambuhay", vi: "Miễn phí vĩnh viễn" },

  // --- FAQ Billing (terjemahan yang sebelumnya hilang) ---
  "billing.invoice.timeLeft": { id: "Sisa Waktu:", en: "Time left:", ms: "Baki masa:", th: "เวลาที่เหลือ:", fil: "Natitirang oras:", vi: "Thời gian còn lại:" },
  "billing.faq.title": { id: "Pertanyaan yang Sering Diajukan (FAQ)", en: "Frequently Asked Questions (FAQ)", ms: "Soalan Lazim (FAQ)", th: "คำถามที่พบบ่อย (FAQ)", fil: "Mga Madalas Itanong (FAQ)", vi: "Câu hỏi thường gặp (FAQ)" },
  "billing.faq.group.general": { id: "Umum & Masa Percobaan", en: "General & Trial", ms: "Umum & Tempoh Percubaan", th: "ทั่วไปและช่วงทดลองใช้", fil: "Pangkalahatan at Trial", vi: "Chung & Dùng thử" },
  "billing.faq.trial.q": { id: "Apa itu masa percobaan (trial) 30 hari?", en: "What is the 30-day trial?", ms: "Apakah tempoh percubaan 30 hari?", th: "ช่วงทดลองใช้ 30 วันคืออะไร?", fil: "Ano ang 30-araw na trial?", vi: "Dùng thử 30 ngày là gì?" },
  "billing.faq.trial.a": { id: "Setiap outlet baru otomatis mendapat masa percobaan gratis 30 hari sejak pertama kali dibuat — tidak perlu aktivasi apa pun. Selama trial semua fitur Pro terbuka (termasuk akuntansi, aset, PPOB, anti-fraud, dan AI), kontrol TV Android dibatasi 1 unit, dan Smart Plug (untuk TV non-Android) belum bisa dipakai sampai dibeli lewat etalase di halaman ini.", en: "Every new outlet automatically gets a free 30-day trial from the moment it's created — no activation needed. During the trial all Pro features are unlocked (including accounting, assets, PPOB, anti-fraud, and AI), Android TV control is limited to 1 unit, and Smart Plugs (for non-Android TVs) can't be used until purchased through the shop on this page.", ms: "Setiap outlet baharu automatik mendapat tempoh percubaan percuma 30 hari sejak mula dibuat — tidak perlu sebarang pengaktifan. Semasa percubaan semua ciri Pro dibuka (termasuk perakaunan, aset, PPOB, anti-penipuan, dan AI), kawalan TV Android dihadkan 1 unit, dan Palam Pintar (untuk TV bukan Android) belum boleh digunakan sehingga dibeli melalui etalase di halaman ini.", th: "ทุกสาขาใหม่จะได้รับช่วงทดลองใช้ฟรี 30 วันโดยอัตโนมัตินับจากวันที่สร้าง — ไม่ต้องเปิดใช้งานใดๆ ระหว่างทดลองใช้ ฟีเจอร์ Pro ทั้งหมดเปิดให้ใช้ (รวมบัญชี สินทรัพย์ PPOB ป้องกันการทุจริต และ AI) การควบคุม Android TV จำกัด 1 เครื่อง และยังใช้สมาร์ทปลั๊ก (สำหรับทีวีที่ไม่ใช่ Android) ไม่ได้จนกว่าจะซื้อผ่านร้านค้าในหน้านี้", fil: "Bawat bagong outlet ay awtomatikong may libreng 30-araw na trial mula nang malikha — walang kailangang i-activate. Habang trial, bukas ang lahat ng Pro feature (kasama ang accounting, asset, PPOB, anti-fraud, at AI), limitado sa 1 unit ang kontrol ng Android TV, at hindi pa magagamit ang Smart Plug (para sa non-Android TV) hangga't hindi nabibili sa tindahan sa page na ito.", vi: "Mỗi cửa hàng mới tự động được dùng thử miễn phí 30 ngày kể từ khi tạo — không cần kích hoạt. Trong thời gian dùng thử, mọi tính năng Pro đều mở (gồm kế toán, tài sản, PPOB, chống gian lận và AI), điều khiển Android TV giới hạn 1 máy, và chưa dùng được Ổ cắm thông minh (cho TV không chạy Android) cho đến khi mua qua cửa hàng trên trang này." },
  "billing.faq.trialEnded.q": { id: "Apa yang terjadi setelah 30 hari trial berakhir?", en: "What happens after the 30-day trial ends?", ms: "Apa yang berlaku selepas percubaan 30 hari tamat?", th: "จะเกิดอะไรขึ้นหลังทดลองใช้ 30 วันสิ้นสุด?", fil: "Ano ang mangyayari pagkatapos ng 30-araw na trial?", vi: "Chuyện gì xảy ra khi hết 30 ngày dùng thử?" },
  "billing.faq.trialEnded.a": { id: "Status berubah menjadi \"Percobaan Berakhir\" dan dashboard masuk mode read-only (data tetap aman, tidak hilang) sampai kamu memilih paket ({starter} atau {pro}) dan menyelesaikan pembayaran checkout pertama di halaman ini. Setelah semua tagihan checkout lunas, akses terbuka otomatis — 30 hari untuk bulanan, 12 bulan untuk tahunan.", en: "The status changes to \"Trial Ended\" and the dashboard goes into read-only mode (data stays safe, nothing is lost) until you choose a plan ({starter} or {pro}) and complete the first checkout payment on this page. Once all checkout invoices are paid, access unlocks automatically — 30 days for monthly, 12 months for yearly.", ms: "Status bertukar kepada \"Percubaan Tamat\" dan papan pemuka masuk mod baca sahaja (data kekal selamat, tidak hilang) sehingga anda memilih pakej ({starter} atau {pro}) dan menyelesaikan bayaran checkout pertama di halaman ini. Selepas semua bil checkout dijelaskan, akses dibuka secara automatik — 30 hari untuk bulanan, 12 bulan untuk tahunan.", th: "สถานะจะเปลี่ยนเป็น \"สิ้นสุดการทดลองใช้\" และแดชบอร์ดเข้าสู่โหมดอ่านอย่างเดียว (ข้อมูลยังปลอดภัย ไม่สูญหาย) จนกว่าคุณจะเลือกแพ็กเกจ ({starter} หรือ {pro}) และชำระเงินเช็กเอาต์ครั้งแรกในหน้านี้ เมื่อชำระใบแจ้งหนี้เช็กเอาต์ครบทั้งหมด การเข้าถึงจะเปิดอัตโนมัติ — 30 วันสำหรับรายเดือน 12 เดือนสำหรับรายปี", fil: "Magiging \"Tapos na ang Trial\" ang status at mapupunta sa read-only mode ang dashboard (ligtas ang data, walang mawawala) hanggang pumili ka ng plano ({starter} o {pro}) at tapusin ang unang checkout payment sa page na ito. Kapag bayad na ang lahat ng invoice ng checkout, awtomatikong magbubukas ang access — 30 araw para sa buwanan, 12 buwan para sa taunan.", vi: "Trạng thái chuyển thành \"Hết dùng thử\" và bảng điều khiển vào chế độ chỉ đọc (dữ liệu vẫn an toàn, không mất) cho đến khi bạn chọn gói ({starter} hoặc {pro}) và hoàn tất thanh toán checkout đầu tiên trên trang này. Khi mọi hóa đơn checkout đã thanh toán, quyền truy cập tự động mở — 30 ngày với gói tháng, 12 tháng với gói năm." },
  "billing.faq.dataSafe.q": { id: "Apakah data saya hilang kalau langganan terkunci/ditangguhkan?", en: "Is my data lost if the subscription is locked/suspended?", ms: "Adakah data saya hilang jika langganan dikunci/digantung?", th: "ข้อมูลของฉันจะหายไหมถ้าการสมัครถูกล็อก/ระงับ?", fil: "Mawawala ba ang data ko kapag naka-lock/suspendido ang subscription?", vi: "Dữ liệu của tôi có mất khi gói bị khóa/tạm ngưng không?" },
  "billing.faq.dataSafe.a": { id: "Tidak. Terkuncinya akses hanya membatasi PENGGUNAAN fitur (read-only) — seluruh data transaksi, laporan, dan pengaturan tetap tersimpan utuh dan langsung bisa diakses lagi begitu tagihan dibayar.", en: "No. Locked access only restricts USING features (read-only) — all transaction data, reports, and settings stay fully stored and are accessible again as soon as the invoice is paid.", ms: "Tidak. Akses yang dikunci hanya menyekat PENGGUNAAN ciri (baca sahaja) — semua data transaksi, laporan, dan tetapan kekal tersimpan sepenuhnya dan boleh diakses semula sebaik sahaja bil dibayar.", th: "ไม่หาย การล็อกการเข้าถึงจำกัดเพียงการใช้งานฟีเจอร์ (อ่านอย่างเดียว) — ข้อมูลธุรกรรม รายงาน และการตั้งค่าทั้งหมดยังถูกเก็บไว้ครบ และเข้าถึงได้อีกครั้งทันทีที่ชำระใบแจ้งหนี้", fil: "Hindi. Nililimitahan lang ng naka-lock na access ang PAGGAMIT ng feature (read-only) — buo pa ring nakaimbak ang lahat ng data ng transaksyon, ulat, at setting at maa-access ulit agad kapag nabayaran ang invoice.", vi: "Không. Khóa truy cập chỉ hạn chế VIỆC SỬ DỤNG tính năng (chỉ đọc) — mọi dữ liệu giao dịch, báo cáo và thiết lập vẫn được lưu đầy đủ và truy cập lại được ngay khi thanh toán hóa đơn." },
  "billing.faq.group.pricing": { id: "Harga, Paket & Add-on", en: "Pricing, Plans & Add-ons", ms: "Harga, Pakej & Tambahan", th: "ราคา แพ็กเกจ และส่วนเสริม", fil: "Presyo, Plano at Add-on", vi: "Giá, Gói & Tiện ích bổ sung" },
  "billing.faq.price.q": { id: "Berapa harga paket NEXBILL?", en: "How much do NEXBILL plans cost?", ms: "Berapakah harga pakej NEXBILL?", th: "แพ็กเกจ NEXBILL ราคาเท่าไร?", fil: "Magkano ang mga plano ng NEXBILL?", vi: "Các gói NEXBILL giá bao nhiêu?" },
  "billing.faq.price.a": { id: "{starter}: {starterPrice}/unit PS/bulan (minimal {starterMin} unit) — fitur operasional: billing & timer, kasir F&B, booking online, membership, kontrol TV/smart plug, QR pelanggan. {pro}: {proPrice}/outlet/bulan flat — unit PS tak terbatas plus akuntansi & laporan keuangan, manajemen aset, PPOB, kontrol anti-fraud, AI Business Assistant, multi-cabang, dan rental ke rumah.", en: "{starter}: {starterPrice}/PS unit/month (minimum {starterMin} units) — operational features: billing & timer, F&B cashier, online booking, membership, TV/smart plug control, customer QR. {pro}: {proPrice}/outlet/month flat — unlimited PS units plus accounting & financial reports, asset management, PPOB, anti-fraud controls, AI Business Assistant, multi-branch, and home rental.", ms: "{starter}: {starterPrice}/unit PS/bulan (minimum {starterMin} unit) — ciri operasi: bil & pemasa, juruwang F&B, tempahan dalam talian, keahlian, kawalan TV/palam pintar, QR pelanggan. {pro}: {proPrice}/outlet/bulan tetap — unit PS tanpa had serta perakaunan & laporan kewangan, pengurusan aset, PPOB, kawalan anti-penipuan, AI Business Assistant, berbilang cawangan, dan sewaan ke rumah.", th: "{starter}: {starterPrice}/เครื่อง PS/เดือน (ขั้นต่ำ {starterMin} เครื่อง) — ฟีเจอร์ด้านการดำเนินงาน: คิดค่าเช่าและตัวจับเวลา แคชเชียร์ F&B จองออนไลน์ สมาชิก ควบคุมทีวี/สมาร์ทปลั๊ก QR ลูกค้า {pro}: {proPrice}/สาขา/เดือน ราคาคงที่ — เครื่อง PS ไม่จำกัด พร้อมบัญชีและรายงานการเงิน การจัดการสินทรัพย์ PPOB การควบคุมป้องกันการทุจริต AI Business Assistant หลายสาขา และให้เช่าถึงบ้าน", fil: "{starter}: {starterPrice}/PS unit/buwan (minimum {starterMin} unit) — operational na feature: billing at timer, F&B cashier, online booking, membership, kontrol ng TV/smart plug, customer QR. {pro}: {proPrice}/outlet/buwan flat — walang limit na PS unit kasama ang accounting at financial report, asset management, PPOB, anti-fraud control, AI Business Assistant, multi-branch, at home rental.", vi: "{starter}: {starterPrice}/máy PS/tháng (tối thiểu {starterMin} máy) — tính năng vận hành: tính tiền & hẹn giờ, thu ngân F&B, đặt chỗ trực tuyến, thành viên, điều khiển TV/ổ cắm thông minh, QR khách hàng. {pro}: {proPrice}/cửa hàng/tháng cố định — không giới hạn máy PS kèm kế toán & báo cáo tài chính, quản lý tài sản, PPOB, kiểm soát chống gian lận, AI Business Assistant, nhiều chi nhánh và cho thuê tại nhà." },
  "billing.faq.annual.q": { id: "Apakah ada harga tahunan?", en: "Is there yearly pricing?", ms: "Adakah harga tahunan?", th: "มีราคารายปีไหม?", fil: "May taunang presyo ba?", vi: "Có giá theo năm không?" },
  "billing.faq.annual.a": { id: "Ada. Pilih siklus \"Tahunan\" saat checkout atau di Ganti Paket: bayar {annualMonths} bulan, aktif 12 bulan — berlaku untuk Starter maupun Pro.", en: "Yes. Choose the \"Yearly\" cycle at checkout or in Change Plan: pay {annualMonths} months, active for 12 months — applies to both Starter and Pro.", ms: "Ada. Pilih kitaran \"Tahunan\" semasa checkout atau di Tukar Pakej: bayar {annualMonths} bulan, aktif 12 bulan — terpakai untuk Starter dan Pro.", th: "มี เลือกรอบ \"รายปี\" ตอนเช็กเอาต์หรือในเปลี่ยนแพ็กเกจ: จ่าย {annualMonths} เดือน ใช้งานได้ 12 เดือน — ใช้ได้ทั้ง Starter และ Pro", fil: "Mayroon. Piliin ang \"Taunan\" na cycle sa checkout o sa Palitan ang Plano: magbayad ng {annualMonths} buwan, aktibo nang 12 buwan — para sa Starter at Pro.", vi: "Có. Chọn chu kỳ \"Năm\" khi checkout hoặc trong Đổi gói: trả {annualMonths} tháng, dùng 12 tháng — áp dụng cho cả Starter và Pro." },
  "billing.faq.branches.q": { id: "Bagaimana kalau punya beberapa cabang?", en: "What if I have several branches?", ms: "Bagaimana jika ada beberapa cawangan?", th: "ถ้ามีหลายสาขาล่ะ?", fil: "Paano kung marami akong sangay?", vi: "Nếu tôi có nhiều chi nhánh thì sao?" },
  "billing.faq.branches.a": { id: "Multi-cabang termasuk paket Pro. Outlet Pro ke-2 dan seterusnya dalam satu grup penagihan mendapat diskon {branchDiscount}% per outlet, dan semua cabang ditagih dalam satu invoice gabungan.", en: "Multi-branch is included in the Pro plan. The 2nd and later Pro outlets in one billing group get a {branchDiscount}% discount per outlet, and all branches are billed in one combined invoice.", ms: "Berbilang cawangan termasuk dalam pakej Pro. Outlet Pro ke-2 dan seterusnya dalam satu kumpulan bil mendapat diskaun {branchDiscount}% setiap outlet, dan semua cawangan dibilkan dalam satu invois gabungan.", th: "หลายสาขารวมอยู่ในแพ็กเกจ Pro สาขา Pro ที่ 2 เป็นต้นไปในกลุ่มการเรียกเก็บเงินเดียวกันได้ส่วนลด {branchDiscount}% ต่อสาขา และทุกสาขาเรียกเก็บในใบแจ้งหนี้รวมใบเดียว", fil: "Kasama sa Pro plan ang multi-branch. Ang ika-2 at susunod na Pro outlet sa iisang billing group ay may {branchDiscount}% diskwento bawat outlet, at sinisingil ang lahat ng sangay sa iisang pinagsamang invoice.", vi: "Nhiều chi nhánh có trong gói Pro. Cửa hàng Pro thứ 2 trở đi trong cùng nhóm thanh toán được giảm {branchDiscount}% mỗi cửa hàng, và mọi chi nhánh được tính trong một hóa đơn gộp." },
  "billing.faq.starterQuota.q": { id: "Bagaimana kuota unit di paket Starter?", en: "How does the unit quota work on the Starter plan?", ms: "Bagaimana kuota unit dalam pakej Starter?", th: "โควตาเครื่องในแพ็กเกจ Starter ทำงานอย่างไร?", fil: "Paano gumagana ang unit quota sa Starter plan?", vi: "Hạn mức máy trong gói Starter hoạt động thế nào?" },
  "billing.faq.starterQuota.a": { id: "Starter ditagih per unit PS aktif (minimal {starterMin} unit). Kalau ingin menambah unit melebihi kuota, buka Ganti Paket lalu naikkan kuota — selisihnya ditagih prorata untuk sisa periode dan kuota baru langsung berlaku setelah dibayar. Atau upgrade ke Pro untuk unit tak terbatas.", en: "Starter is billed per active PS unit (minimum {starterMin} units). To add units beyond the quota, open Change Plan and raise the quota — the difference is billed pro rata for the rest of the period and the new quota applies as soon as it's paid. Or upgrade to Pro for unlimited units.", ms: "Starter dibilkan setiap unit PS aktif (minimum {starterMin} unit). Untuk menambah unit melebihi kuota, buka Tukar Pakej dan naikkan kuota — perbezaannya dibilkan secara prorata bagi baki tempoh dan kuota baharu terus berkuat kuasa selepas dibayar. Atau naik taraf ke Pro untuk unit tanpa had.", th: "Starter คิดตามเครื่อง PS ที่ใช้งานอยู่ (ขั้นต่ำ {starterMin} เครื่อง) หากต้องการเพิ่มเครื่องเกินโควตา ให้เปิดเปลี่ยนแพ็กเกจแล้วเพิ่มโควตา — ส่วนต่างคิดตามสัดส่วนของช่วงเวลาที่เหลือ และโควตาใหม่มีผลทันทีที่ชำระ หรืออัปเกรดเป็น Pro เพื่อใช้เครื่องไม่จำกัด", fil: "Sinisingil ang Starter bawat aktibong PS unit (minimum {starterMin} unit). Para magdagdag ng unit na lampas sa quota, buksan ang Palitan ang Plano at taasan ang quota — sisingilin nang pro rata ang diperensya para sa natitirang panahon at agad na epektibo ang bagong quota kapag nabayaran. O mag-upgrade sa Pro para sa walang limit na unit.", vi: "Starter tính theo mỗi máy PS đang hoạt động (tối thiểu {starterMin} máy). Để thêm máy vượt hạn mức, mở Đổi gói và tăng hạn mức — phần chênh lệch được tính theo tỷ lệ cho thời gian còn lại và hạn mức mới áp dụng ngay khi thanh toán. Hoặc nâng cấp lên Pro để không giới hạn máy." },
  "billing.faq.changePlan.q": { id: "Bisa naik/turun paket kapan saja?", en: "Can I upgrade/downgrade anytime?", ms: "Boleh naik/turun pakej bila-bila masa?", th: "อัปเกรด/ดาวน์เกรดแพ็กเกจได้ตลอดไหม?", fil: "Puwede bang mag-upgrade/downgrade anumang oras?", vi: "Có thể nâng/hạ gói bất cứ lúc nào không?" },
  "billing.faq.changePlan.a": { id: "Bisa. Naik ke Pro atau tambah kuota unit langsung berlaku setelah selisih prorata dibayar. Turun ke Starter, kurangi kuota, atau ganti siklus bulanan/tahunan berlaku mulai perpanjangan berikutnya (tanpa refund sisa periode). Saat turun ke Starter, menu modul Pro terkunci tapi datanya tetap tersimpan.", en: "Yes. Upgrading to Pro or adding unit quota takes effect as soon as the pro-rata difference is paid. Downgrading to Starter, reducing quota, or switching between monthly/yearly takes effect from the next renewal (no refund of the remaining period). When you downgrade to Starter, Pro module menus are locked but their data is kept.", ms: "Boleh. Naik ke Pro atau tambah kuota unit terus berkuat kuasa selepas perbezaan prorata dibayar. Turun ke Starter, kurangkan kuota, atau tukar kitaran bulanan/tahunan berkuat kuasa mulai pembaharuan seterusnya (tanpa bayaran balik baki tempoh). Apabila turun ke Starter, menu modul Pro dikunci tetapi datanya tetap disimpan.", th: "ได้ การอัปเกรดเป็น Pro หรือเพิ่มโควตาเครื่องมีผลทันทีที่ชำระส่วนต่างตามสัดส่วน การลดเป็น Starter ลดโควตา หรือเปลี่ยนรอบรายเดือน/รายปีมีผลตั้งแต่การต่ออายุครั้งถัดไป (ไม่คืนเงินช่วงที่เหลือ) เมื่อลดเป็น Starter เมนูโมดูล Pro จะถูกล็อกแต่ข้อมูลยังคงอยู่", fil: "Oo. Agad na epektibo ang pag-upgrade sa Pro o pagdagdag ng unit quota kapag nabayaran ang pro-rata na diperensya. Ang pag-downgrade sa Starter, pagbawas ng quota, o pagpalit ng buwanan/taunan ay epektibo mula sa susunod na renewal (walang refund sa natitirang panahon). Kapag nag-downgrade sa Starter, naka-lock ang mga menu ng Pro module pero nananatili ang data.", vi: "Có. Nâng lên Pro hoặc thêm hạn mức máy có hiệu lực ngay khi thanh toán phần chênh lệch theo tỷ lệ. Hạ xuống Starter, giảm hạn mức hoặc đổi chu kỳ tháng/năm có hiệu lực từ kỳ gia hạn tiếp theo (không hoàn tiền thời gian còn lại). Khi hạ xuống Starter, các menu mô-đun Pro bị khóa nhưng dữ liệu vẫn được giữ." },
  "billing.faq.smartPlug.q": { id: "Apa itu Smart Plug dan kenapa saya harus beli?", en: "What is a Smart Plug and why do I need to buy one?", ms: "Apakah Palam Pintar dan kenapa saya perlu membelinya?", th: "สมาร์ทปลั๊กคืออะไร และทำไมต้องซื้อ?", fil: "Ano ang Smart Plug at bakit kailangan kong bumili?", vi: "Ổ cắm thông minh là gì và tại sao tôi phải mua?" },
  "billing.faq.smartPlug.a": { id: "TV Android bisa langsung dikontrol nyala/mati dari sistem tanpa alat tambahan. TV non-Android (Smart TV biasa/TV Analog) butuh Smart Plug (colokan pintar) supaya bisa dikontrol otomatis dari NEXBILL — harga mulai {smartPlugPrice}/unit, tersedia beberapa varian di etalase di atas. Ini barang fisik terpisah dari harga langganan, berapa pun paketnya.", en: "Android TVs can be switched on/off from the system directly without extra hardware. Non-Android TVs (regular Smart TVs/analog TVs) need a Smart Plug so NEXBILL can control them automatically — prices start at {smartPlugPrice}/unit, with several variants in the shop above. It's a physical product separate from the subscription price, whatever your plan.", ms: "TV Android boleh terus dikawal hidup/mati daripada sistem tanpa alat tambahan. TV bukan Android (Smart TV biasa/TV Analog) memerlukan Palam Pintar supaya boleh dikawal secara automatik daripada NEXBILL — harga bermula {smartPlugPrice}/unit, beberapa varian tersedia di etalase di atas. Ini barang fizikal yang berasingan daripada harga langganan, apa pun pakejnya.", th: "Android TV เปิด/ปิดจากระบบได้โดยตรงโดยไม่ต้องใช้อุปกรณ์เพิ่ม ทีวีที่ไม่ใช่ Android (สมาร์ททีวีทั่วไป/ทีวีอนาล็อก) ต้องใช้สมาร์ทปลั๊กเพื่อให้ NEXBILL ควบคุมได้อัตโนมัติ — ราคาเริ่มต้น {smartPlugPrice}/ชิ้น มีหลายรุ่นในร้านค้าด้านบน เป็นสินค้าจริงที่แยกจากค่าสมัครใช้งาน ไม่ว่าแพ็กเกจใด", fil: "Direktang nakokontrol ang Android TV na i-on/i-off mula sa sistema nang walang dagdag na gamit. Ang non-Android TV (karaniwang Smart TV/analog TV) ay nangangailangan ng Smart Plug para awtomatiko itong makontrol ng NEXBILL — mula {smartPlugPrice}/unit ang presyo, may ilang variant sa tindahan sa itaas. Pisikal na produkto ito na hiwalay sa presyo ng subscription, anuman ang plano.", vi: "Android TV có thể bật/tắt trực tiếp từ hệ thống mà không cần thiết bị thêm. TV không chạy Android (Smart TV thường/TV analog) cần Ổ cắm thông minh để NEXBILL điều khiển tự động — giá từ {smartPlugPrice}/chiếc, có nhiều loại trong cửa hàng phía trên. Đây là sản phẩm vật lý tách riêng khỏi phí thuê bao, bất kể gói nào." },
  "billing.faq.setupService.q": { id: "Apa itu Jasa Setup Jarak Jauh?", en: "What is the Remote Setup Service?", ms: "Apakah Perkhidmatan Persediaan Jarak Jauh?", th: "บริการตั้งค่าระยะไกลคืออะไร?", fil: "Ano ang Remote Setup Service?", vi: "Dịch vụ cài đặt từ xa là gì?" },
  "billing.faq.setupService.a": { id: "Opsional ({setupPrice}) — kalau kamu tidak familiar menyambungkan Smart Plug ke akun cloud-nya sendiri, vendor akan bantu setting dari jarak jauh. Kalau dicentang saat checkout, kolom kontak PIC & alamat outlet akan diminta supaya vendor bisa menghubungi.", en: "Optional ({setupPrice}) — if you're not familiar with connecting a Smart Plug to its own cloud account, the vendor will help set it up remotely. If ticked at checkout, you'll be asked for a PIC contact & the outlet address so the vendor can reach you.", ms: "Pilihan ({setupPrice}) — jika anda tidak biasa menyambungkan Palam Pintar ke akaun awannya sendiri, vendor akan membantu menetapkannya dari jauh. Jika ditanda semasa checkout, maklumat hubungan PIC & alamat outlet akan diminta supaya vendor boleh menghubungi.", th: "ไม่บังคับ ({setupPrice}) — หากคุณไม่คุ้นเคยกับการเชื่อมสมาร์ทปลั๊กกับบัญชีคลาวด์ของมัน ผู้ขายจะช่วยตั้งค่าจากระยะไกล หากเลือกตอนเช็กเอาต์ จะขอข้อมูลติดต่อผู้รับผิดชอบและที่อยู่สาขาเพื่อให้ผู้ขายติดต่อได้", fil: "Opsyonal ({setupPrice}) — kung hindi ka pamilyar sa pagkonekta ng Smart Plug sa sarili nitong cloud account, tutulungan ka ng vendor na i-setup ito nang remote. Kapag nilagyan ng tsek sa checkout, hihingin ang contact ng PIC at address ng outlet para makontak ka ng vendor.", vi: "Tùy chọn ({setupPrice}) — nếu bạn chưa quen kết nối Ổ cắm thông minh với tài khoản đám mây của nó, nhà cung cấp sẽ giúp cài đặt từ xa. Nếu chọn khi checkout, bạn sẽ được yêu cầu thông tin liên hệ người phụ trách & địa chỉ cửa hàng để nhà cung cấp liên lạc." },
  "billing.faq.ai.q": { id: "Apakah fitur AI (Business Assistant & Insights) bayar terpisah?", en: "Is the AI feature (Business Assistant & Insights) paid separately?", ms: "Adakah ciri AI (Business Assistant & Insights) dibayar berasingan?", th: "ฟีเจอร์ AI (Business Assistant & Insights) จ่ายแยกไหม?", fil: "Hiwalay bang binabayaran ang AI feature (Business Assistant & Insights)?", vi: "Tính năng AI (Business Assistant & Insights) có trả phí riêng không?" },
  "billing.faq.ai.a": { id: "Di paket Pro AI sudah termasuk tanpa biaya tambahan. Di paket Starter, AI bisa diaktifkan sebagai AI Add-on ({aiPrice}/bulan) karena setiap pemakaiannya punya biaya nyata ke penyedia AI. Selama trial 30 hari AI gratis. Hanya akun Owner atau Superuser yang bisa memakainya.", en: "On the Pro plan, AI is included at no extra cost. On the Starter plan, AI can be enabled as the AI Add-on ({aiPrice}/month) because every use has a real cost from the AI provider. AI is free during the 30-day trial. Only Owner or Superuser accounts can use it.", ms: "Dalam pakej Pro, AI sudah termasuk tanpa caj tambahan. Dalam pakej Starter, AI boleh diaktifkan sebagai AI Add-on ({aiPrice}/bulan) kerana setiap penggunaannya ada kos sebenar kepada penyedia AI. Semasa percubaan 30 hari AI percuma. Hanya akaun Pemilik atau Superuser boleh menggunakannya.", th: "ในแพ็กเกจ Pro มี AI รวมอยู่โดยไม่มีค่าใช้จ่ายเพิ่ม ในแพ็กเกจ Starter เปิดใช้ AI ได้เป็น AI Add-on ({aiPrice}/เดือน) เพราะการใช้งานแต่ละครั้งมีต้นทุนจริงจากผู้ให้บริการ AI ระหว่างทดลองใช้ 30 วัน AI ใช้ฟรี เฉพาะบัญชีเจ้าของหรือ Superuser เท่านั้นที่ใช้ได้", fil: "Sa Pro plan, kasama na ang AI nang walang dagdag na bayad. Sa Starter plan, maaaring i-enable ang AI bilang AI Add-on ({aiPrice}/buwan) dahil may totoong gastos sa AI provider ang bawat paggamit. Libre ang AI habang 30-araw na trial. Ang Owner o Superuser account lang ang makakagamit nito.", vi: "Ở gói Pro, AI đã bao gồm không tốn thêm phí. Ở gói Starter, AI có thể bật dưới dạng AI Add-on ({aiPrice}/tháng) vì mỗi lần dùng đều có chi phí thật từ nhà cung cấp AI. AI miễn phí trong 30 ngày dùng thử. Chỉ tài khoản Chủ sở hữu hoặc Superuser mới dùng được." },
  "billing.faq.group.payment": { id: "Pembayaran & Tagihan", en: "Payments & Invoices", ms: "Bayaran & Bil", th: "การชำระเงินและใบแจ้งหนี้", fil: "Bayad at Invoice", vi: "Thanh toán & Hóa đơn" },
  "billing.faq.methods.q": { id: "Metode pembayaran apa saja yang tersedia?", en: "Which payment methods are available?", ms: "Kaedah pembayaran apa yang tersedia?", th: "มีวิธีชำระเงินอะไรบ้าง?", fil: "Anong mga paraan ng pagbabayad ang available?", vi: "Có những phương thức thanh toán nào?" },
  "billing.faq.methods.a": { id: "Cash (konfirmasi manual oleh NEXBILL), QRIS, dan Virtual Account (BCA, BNI, Mandiri, BRI, Permata) — pilih salah satu lewat tombol pada tagihan yang belum lunas.", en: "Cash (confirmed manually by NEXBILL), QRIS, and Virtual Accounts (BCA, BNI, Mandiri, BRI, Permata) — choose one with the buttons on an unpaid invoice.", ms: "Tunai (pengesahan manual oleh NEXBILL), QRIS, dan Akaun Maya (BCA, BNI, Mandiri, BRI, Permata) — pilih salah satu melalui butang pada bil yang belum dijelaskan.", th: "เงินสด (NEXBILL ยืนยันด้วยตนเอง) QRIS และบัญชีเสมือน (BCA, BNI, Mandiri, BRI, Permata) — เลือกได้จากปุ่มบนใบแจ้งหนี้ที่ยังไม่ชำระ", fil: "Cash (manwal na kinukumpirma ng NEXBILL), QRIS, at Virtual Account (BCA, BNI, Mandiri, BRI, Permata) — pumili gamit ang mga button sa hindi pa bayad na invoice.", vi: "Tiền mặt (NEXBILL xác nhận thủ công), QRIS và Tài khoản ảo (BCA, BNI, Mandiri, BRI, Permata) — chọn bằng các nút trên hóa đơn chưa thanh toán." },
  "billing.faq.cash.q": { id: "Bagaimana proses konfirmasi pembayaran Cash?", en: "How is a Cash payment confirmed?", ms: "Bagaimana proses pengesahan bayaran Tunai?", th: "การยืนยันการชำระเงินสดทำอย่างไร?", fil: "Paano kinukumpirma ang Cash na bayad?", vi: "Thanh toán Tiền mặt được xác nhận thế nào?" },
  "billing.faq.cash.a": { id: "Setelah klik \"Cash\", akan muncul konfirmasi apakah NEXBILL sudah menerima pembayaran tunai tersebut — begitu dikonfirmasi, tagihan langsung ditandai lunas.", en: "After clicking \"Cash\", a confirmation asks whether NEXBILL has received the cash payment — once confirmed, the invoice is marked paid immediately.", ms: "Selepas klik \"Tunai\", pengesahan akan muncul sama ada NEXBILL sudah menerima bayaran tunai tersebut — sebaik sahaja disahkan, bil terus ditanda dijelaskan.", th: "หลังคลิก \"เงินสด\" จะมีการยืนยันว่า NEXBILL ได้รับเงินสดแล้วหรือยัง — เมื่อยืนยัน ใบแจ้งหนี้จะถูกทำเครื่องหมายว่าชำระแล้วทันที", fil: "Pagkatapos i-click ang \"Cash\", may kumpirmasyong lalabas kung natanggap na ng NEXBILL ang cash na bayad — kapag nakumpirma, agad na mamarkahang bayad ang invoice.", vi: "Sau khi bấm \"Tiền mặt\", sẽ có xác nhận NEXBILL đã nhận tiền mặt chưa — khi xác nhận, hóa đơn được đánh dấu đã thanh toán ngay." },
  "billing.faq.markPaid.q": { id: "Untuk QRIS/Virtual Account, kapan saya klik \"Tandai Lunas\"?", en: "For QRIS/Virtual Account, when do I click \"Mark Paid\"?", ms: "Untuk QRIS/Akaun Maya, bila saya klik \"Tandakan Dijelaskan\"?", th: "สำหรับ QRIS/บัญชีเสมือน ควรคลิก \"ทำเครื่องหมายว่าชำระแล้ว\" เมื่อไร?", fil: "Para sa QRIS/Virtual Account, kailan ko iki-click ang \"Markahang Bayad\"?", vi: "Với QRIS/Tài khoản ảo, khi nào tôi bấm \"Đánh dấu đã trả\"?" },
  "billing.faq.markPaid.a": { id: "Setelah transfer/scan pembayaran BENAR-BENAR masuk. Tombol ini muncul setelah kamu memilih metode pembayaran pada tagihan tersebut — klik hanya setelah dana diterima, supaya status langganan tidak salah aktif sebelum pembayaran nyata.", en: "After the transfer/scan payment has REALLY arrived. This button appears after you choose a payment method on that invoice — click it only after the funds are received, so the subscription isn't activated by mistake before a real payment.", ms: "Selepas pindahan/imbasan bayaran BENAR-BENAR masuk. Butang ini muncul selepas anda memilih kaedah pembayaran pada bil tersebut — klik hanya selepas dana diterima, supaya status langganan tidak tersalah aktif sebelum bayaran sebenar.", th: "หลังจากเงินโอน/สแกนจ่ายเข้าจริงแล้ว ปุ่มนี้จะแสดงหลังคุณเลือกวิธีชำระเงินในใบแจ้งหนี้นั้น — คลิกหลังได้รับเงินแล้วเท่านั้น เพื่อไม่ให้การสมัครเปิดใช้งานผิดพลาดก่อนชำระจริง", fil: "Pagkatapos TALAGANG pumasok ang transfer/scan na bayad. Lalabas ang button na ito kapag pumili ka ng paraan ng pagbabayad sa invoice na iyon — i-click lang kapag natanggap na ang pera, para hindi magkamaling ma-activate ang subscription bago ang totoong bayad.", vi: "Sau khi tiền chuyển khoản/quét mã đã THỰC SỰ vào. Nút này hiện sau khi bạn chọn phương thức thanh toán cho hóa đơn đó — chỉ bấm khi đã nhận tiền, để gói không bị kích hoạt nhầm trước khi thanh toán thật." },
  "billing.faq.access.q": { id: "Kapan akses penuh terbuka setelah bayar?", en: "When does full access open after paying?", ms: "Bila akses penuh dibuka selepas bayar?", th: "หลังชำระเงิน การเข้าถึงเต็มรูปแบบจะเปิดเมื่อไร?", fil: "Kailan magbubukas ang buong access pagkatapos magbayad?", vi: "Khi nào mở toàn quyền truy cập sau khi trả tiền?" },
  "billing.faq.access.a": { id: "Begitu SEMUA tagihan dari satu checkout yang sama berstatus lunas (bukan cuma sebagian), status langganan otomatis berubah menjadi \"Aktif\" (30 hari untuk bulanan, 12 bulan untuk tahunan) — tidak perlu refresh manual atau menunggu approval tambahan.", en: "As soon as ALL invoices from the same checkout are paid (not just some), the subscription status automatically changes to \"Active\" (30 days for monthly, 12 months for yearly) — no manual refresh or extra approval needed.", ms: "Sebaik sahaja SEMUA bil daripada satu checkout yang sama dijelaskan (bukan hanya sebahagian), status langganan automatik bertukar kepada \"Aktif\" (30 hari untuk bulanan, 12 bulan untuk tahunan) — tidak perlu muat semula manual atau menunggu kelulusan tambahan.", th: "เมื่อใบแจ้งหนี้ทั้งหมดจากการเช็กเอาต์เดียวกันถูกชำระครบ (ไม่ใช่แค่บางส่วน) สถานะการสมัครจะเปลี่ยนเป็น \"ใช้งานอยู่\" อัตโนมัติ (30 วันสำหรับรายเดือน 12 เดือนสำหรับรายปี) — ไม่ต้องรีเฟรชเองหรือรอการอนุมัติเพิ่ม", fil: "Kapag bayad na ang LAHAT ng invoice mula sa iisang checkout (hindi lang ang ilan), awtomatikong magiging \"Aktibo\" ang status ng subscription (30 araw para sa buwanan, 12 buwan para sa taunan) — walang manual na refresh o dagdag na approval.", vi: "Ngay khi TẤT CẢ hóa đơn của cùng một lần checkout được thanh toán (không chỉ một phần), trạng thái gói tự động chuyển thành \"Hoạt động\" (30 ngày với gói tháng, 12 tháng với gói năm) — không cần tải lại thủ công hay chờ duyệt thêm." },
  "billing.faq.editCheckout.q": { id: "Saya sudah checkout tapi mau ubah/batalkan item — bisa?", en: "I've checked out but want to change/cancel an item — can I?", ms: "Saya sudah checkout tetapi mahu ubah/batalkan item — boleh?", th: "เช็กเอาต์แล้วแต่อยากแก้/ยกเลิกรายการ — ทำได้ไหม?", fil: "Nakapag-checkout na ako pero gusto kong baguhin/kanselahin ang item — puwede ba?", vi: "Tôi đã checkout nhưng muốn đổi/hủy món — được không?" },
  "billing.faq.editCheckout.a": { id: "Sebelum klik \"Checkout\", isi keranjang bebas diubah/dihapus lewat tombol +/- di etalase. Setelah checkout ditekan, item sudah terkunci jadi satu tagihan — hubungi NEXBILL kalau perlu penyesuaian setelah itu.", en: "Before clicking \"Checkout\", the cart can be changed/emptied freely with the +/- buttons in the shop. Once checkout is pressed, the items are locked into one invoice — contact NEXBILL if you need an adjustment after that.", ms: "Sebelum klik \"Checkout\", isi troli bebas diubah/dibuang melalui butang +/- di etalase. Selepas checkout ditekan, item sudah dikunci menjadi satu bil — hubungi NEXBILL jika perlu pelarasan selepas itu.", th: "ก่อนคลิก \"เช็กเอาต์\" แก้ไข/ลบสินค้าในตะกร้าได้อิสระด้วยปุ่ม +/- ในร้านค้า เมื่อกดเช็กเอาต์แล้ว รายการจะถูกล็อกเป็นใบแจ้งหนี้เดียว — ติดต่อ NEXBILL หากต้องปรับเปลี่ยนหลังจากนั้น", fil: "Bago i-click ang \"Checkout\", malayang mababago/maaalis ang laman ng cart gamit ang +/- na button sa tindahan. Kapag pinindot na ang checkout, naka-lock na ang mga item sa iisang invoice — makipag-ugnayan sa NEXBILL kung kailangan ng pagbabago pagkatapos noon.", vi: "Trước khi bấm \"Checkout\", giỏ hàng có thể đổi/xóa tự do bằng nút +/- trong cửa hàng. Sau khi bấm checkout, các món bị khóa thành một hóa đơn — hãy liên hệ NEXBILL nếu cần điều chỉnh sau đó." },
  "billing.faq.group.renewal": { id: "Perpanjangan & Masa Tenggang", en: "Renewal & Grace Period", ms: "Pembaharuan & Tempoh Tangguh", th: "การต่ออายุและระยะผ่อนผัน", fil: "Renewal at Grace Period", vi: "Gia hạn & Thời gian ân hạn" },
  "billing.faq.renewalInvoice.q": { id: "Kapan tagihan perpanjangan bulan berikutnya dibuat?", en: "When is next month's renewal invoice created?", ms: "Bila bil pembaharuan bulan seterusnya dibuat?", th: "ใบแจ้งหนี้ต่ออายุเดือนถัดไปสร้างเมื่อไร?", fil: "Kailan ginagawa ang renewal invoice ng susunod na buwan?", vi: "Khi nào hóa đơn gia hạn tháng sau được tạo?" },
  "billing.faq.renewalInvoice.a": { id: "Otomatis dibuat 7 hari sebelum periode langganan berakhir. Kamu juga bisa membayar lebih awal kapan saja lewat tombol \"Perpanjang Sekarang\" begitu tidak ada tagihan lain yang masih menunggu pembayaran.", en: "It's created automatically 7 days before the subscription period ends. You can also pay early anytime with the \"Renew Now\" button once there are no other invoices awaiting payment.", ms: "Dibuat secara automatik 7 hari sebelum tempoh langganan tamat. Anda juga boleh membayar lebih awal bila-bila masa melalui butang \"Perbaharui Sekarang\" apabila tiada bil lain yang masih menunggu bayaran.", th: "สร้างอัตโนมัติ 7 วันก่อนสิ้นสุดรอบการสมัคร คุณยังจ่ายล่วงหน้าได้ทุกเมื่อด้วยปุ่ม \"ต่ออายุเลย\" เมื่อไม่มีใบแจ้งหนี้อื่นที่รอชำระ", fil: "Awtomatiko itong ginagawa 7 araw bago matapos ang panahon ng subscription. Puwede ka ring magbayad nang maaga anumang oras gamit ang button na \"I-renew Ngayon\" kapag wala nang ibang invoice na naghihintay ng bayad.", vi: "Được tạo tự động 7 ngày trước khi kỳ thuê bao kết thúc. Bạn cũng có thể trả sớm bất cứ lúc nào bằng nút \"Gia hạn ngay\" khi không còn hóa đơn nào khác đang chờ thanh toán." },
  "billing.faq.grace.q": { id: "Apa itu \"Masa Tenggang\"?", en: "What is the \"Grace Period\"?", ms: "Apakah \"Tempoh Tangguh\"?", th: "\"ระยะผ่อนผัน\" คืออะไร?", fil: "Ano ang \"Grace Period\"?", vi: "\"Thời gian ân hạn\" là gì?" },
  "billing.faq.grace.a": { id: "Kalau periode langganan habis dan tagihan perpanjangan belum dibayar, kamu diberi toleransi 7 hari (status \"Masa Tenggang\") sebelum akses dikunci penuh — akses masih tetap berjalan normal selama masa tenggang ini, dengan pengingat pembayaran yang muncul sekali sehari.", en: "If the subscription period ends and the renewal invoice hasn't been paid, you get a 7-day tolerance (status \"Grace Period\") before access is fully locked — access keeps working normally during this grace period, with a payment reminder shown once a day.", ms: "Jika tempoh langganan tamat dan bil pembaharuan belum dibayar, anda diberi kelonggaran 7 hari (status \"Tempoh Tangguh\") sebelum akses dikunci sepenuhnya — akses masih berjalan seperti biasa sepanjang tempoh ini, dengan peringatan bayaran yang muncul sekali sehari.", th: "หากรอบการสมัครหมดและยังไม่ได้ชำระใบแจ้งหนี้ต่ออายุ คุณจะได้รับการผ่อนผัน 7 วัน (สถานะ \"ระยะผ่อนผัน\") ก่อนการเข้าถึงจะถูกล็อกเต็มที่ — ระหว่างนี้ยังใช้งานได้ตามปกติ พร้อมการแจ้งเตือนการชำระเงินวันละครั้ง", fil: "Kapag natapos ang panahon ng subscription at hindi pa bayad ang renewal invoice, bibigyan ka ng 7-araw na palugit (status na \"Grace Period\") bago tuluyang ma-lock ang access — normal pa ring gumagana ang access sa panahong ito, na may paalala sa bayad isang beses kada araw.", vi: "Nếu kỳ thuê bao kết thúc mà hóa đơn gia hạn chưa thanh toán, bạn được ân hạn 7 ngày (trạng thái \"Thời gian ân hạn\") trước khi bị khóa hoàn toàn — trong thời gian này vẫn dùng bình thường, kèm nhắc thanh toán mỗi ngày một lần." },
  "billing.faq.suspended.q": { id: "Apa yang terjadi kalau tidak bayar sampai masa tenggang habis?", en: "What happens if I don't pay by the end of the grace period?", ms: "Apa yang berlaku jika tidak bayar sehingga tempoh tangguh tamat?", th: "จะเกิดอะไรขึ้นถ้าไม่ชำระจนหมดระยะผ่อนผัน?", fil: "Ano ang mangyayari kung hindi magbayad hanggang matapos ang grace period?", vi: "Chuyện gì xảy ra nếu tôi không trả đến hết thời gian ân hạn?" },
  "billing.faq.suspended.a": { id: "Status berubah menjadi \"Ditangguhkan\" (suspended) dan dashboard masuk mode read-only penuh, sama seperti trial yang berakhir — bayar tagihan perpanjangan yang tertunda untuk membuka akses lagi.", en: "The status changes to \"Suspended\" and the dashboard goes into full read-only mode, just like an ended trial — pay the outstanding renewal invoice to unlock access again.", ms: "Status bertukar kepada \"Digantung\" dan papan pemuka masuk mod baca sahaja sepenuhnya, sama seperti percubaan yang tamat — bayar bil pembaharuan yang tertunggak untuk membuka akses semula.", th: "สถานะจะเปลี่ยนเป็น \"ถูกระงับ\" และแดชบอร์ดเข้าสู่โหมดอ่านอย่างเดียวเต็มรูปแบบ เหมือนการทดลองใช้ที่สิ้นสุด — ชำระใบแจ้งหนี้ต่ออายุที่ค้างอยู่เพื่อเปิดการเข้าถึงอีกครั้ง", fil: "Magiging \"Suspendido\" ang status at mapupunta sa buong read-only mode ang dashboard, gaya ng natapos na trial — bayaran ang nakabinbing renewal invoice para mabuksan ulit ang access.", vi: "Trạng thái chuyển thành \"Tạm ngưng\" và bảng điều khiển vào chế độ chỉ đọc hoàn toàn, giống như khi hết dùng thử — thanh toán hóa đơn gia hạn còn nợ để mở lại quyền truy cập." },
  "billing.faq.group.multiOutlet": { id: "Multi-Outlet (Cabang)", en: "Multi-Outlet (Branches)", ms: "Berbilang Outlet (Cawangan)", th: "หลายสาขา", fil: "Multi-Outlet (Mga Sangay)", vi: "Nhiều cửa hàng (Chi nhánh)" },
  "billing.faq.billingGroup.q": { id: "Apa itu Tagihan Gabungan (Billing Group)?", en: "What is a Combined Invoice (Billing Group)?", ms: "Apakah Bil Gabungan (Billing Group)?", th: "ใบแจ้งหนี้รวม (Billing Group) คืออะไร?", fil: "Ano ang Pinagsamang Invoice (Billing Group)?", vi: "Hóa đơn gộp (Billing Group) là gì?" },
  "billing.faq.billingGroup.a": { id: "Kalau kamu punya lebih dari satu outlet/cabang di bawah akun Owner yang sama, semuanya digabung dalam SATU tagihan perpanjangan — satu kali pembayaran memperpanjang semua cabang sekaligus, ditampilkan sebagai kartu \"Tagihan Gabungan\" di bagian atas halaman ini.", en: "If you have more than one outlet/branch under the same Owner account, they're all combined into ONE renewal invoice — one payment renews every branch at once, shown as the \"Combined Invoice\" card at the top of this page.", ms: "Jika anda mempunyai lebih daripada satu outlet/cawangan di bawah akaun Pemilik yang sama, semuanya digabungkan dalam SATU bil pembaharuan — satu pembayaran memperbaharui semua cawangan sekaligus, dipaparkan sebagai kad \"Bil Gabungan\" di bahagian atas halaman ini.", th: "หากคุณมีมากกว่าหนึ่งสาขาภายใต้บัญชีเจ้าของเดียวกัน ทั้งหมดจะรวมในใบแจ้งหนี้ต่ออายุใบเดียว — ชำระครั้งเดียวต่ออายุทุกสาขาพร้อมกัน แสดงเป็นการ์ด \"ใบแจ้งหนี้รวม\" ที่ด้านบนของหน้านี้", fil: "Kung may higit sa isang outlet/sangay ka sa ilalim ng iisang Owner account, pinagsasama ang lahat sa ISANG renewal invoice — isang bayad ang magre-renew sa lahat ng sangay nang sabay, ipinapakita bilang card na \"Pinagsamang Invoice\" sa itaas ng page na ito.", vi: "Nếu bạn có nhiều hơn một cửa hàng/chi nhánh dưới cùng tài khoản Chủ sở hữu, tất cả được gộp vào MỘT hóa đơn gia hạn — một lần thanh toán gia hạn mọi chi nhánh cùng lúc, hiển thị ở thẻ \"Hóa đơn gộp\" đầu trang này." },
  "billing.faq.branchStatus.q": { id: "Kalau salah satu cabang statusnya beda dari cabang lain, kenapa?", en: "Why does one branch have a different status from the others?", ms: "Kenapa status satu cawangan berbeza daripada cawangan lain?", th: "ทำไมสถานะของสาขาหนึ่งต่างจากสาขาอื่น?", fil: "Bakit iba ang status ng isang sangay sa iba?", vi: "Tại sao một chi nhánh có trạng thái khác các chi nhánh khác?" },
  "billing.faq.branchStatus.a": { id: "Status tiap cabang (trial/aktif/tenggang) dihitung sendiri-sendiri sampai bergabung dalam satu tagihan perpanjangan berikutnya — jadi wajar kalau cabang yang baru dibuat masih trial sementara cabang lama sudah aktif, sampai keduanya sinkron di siklus tagihan gabungan berikutnya.", en: "Each branch's status (trial/active/grace) is calculated separately until they join one renewal invoice — so it's normal for a newly created branch to still be on trial while older branches are active, until they sync up in the next combined billing cycle.", ms: "Status setiap cawangan (percubaan/aktif/tangguh) dikira berasingan sehingga bergabung dalam satu bil pembaharuan seterusnya — jadi wajar jika cawangan yang baru dibuat masih dalam percubaan sementara cawangan lama sudah aktif, sehingga kedua-duanya selari pada kitaran bil gabungan seterusnya.", th: "สถานะของแต่ละสาขา (ทดลองใช้/ใช้งานอยู่/ผ่อนผัน) คำนวณแยกกันจนกว่าจะรวมในใบแจ้งหนี้ต่ออายุใบถัดไป — จึงเป็นเรื่องปกติที่สาขาที่เพิ่งสร้างยังอยู่ในช่วงทดลองขณะที่สาขาเดิมใช้งานอยู่แล้ว จนกว่าจะตรงกันในรอบใบแจ้งหนี้รวมครั้งถัดไป", fil: "Hiwalay na kinukuwenta ang status ng bawat sangay (trial/aktibo/grace) hanggang mapasama sila sa iisang susunod na renewal invoice — kaya normal na trial pa ang bagong sangay habang aktibo na ang mga luma, hanggang magkatugma sila sa susunod na combined billing cycle.", vi: "Trạng thái của mỗi chi nhánh (dùng thử/hoạt động/ân hạn) được tính riêng cho đến khi gộp vào một hóa đơn gia hạn tiếp theo — nên việc chi nhánh mới tạo vẫn đang dùng thử trong khi chi nhánh cũ đã hoạt động là bình thường, cho đến khi đồng bộ ở chu kỳ hóa đơn gộp kế tiếp." },
  "billing.faq.group.other": { id: "Lainnya", en: "Other", ms: "Lain-lain", th: "อื่นๆ", fil: "Iba pa", vi: "Khác" },
  "billing.faq.whoCanPay.q": { id: "Siapa yang bisa mengelola pembayaran/checkout di halaman ini?", en: "Who can manage payments/checkout on this page?", ms: "Siapa yang boleh mengurus pembayaran/checkout di halaman ini?", th: "ใครจัดการการชำระเงิน/เช็กเอาต์ในหน้านี้ได้บ้าง?", fil: "Sino ang puwedeng mamahala ng bayad/checkout sa page na ito?", vi: "Ai có thể quản lý thanh toán/checkout trên trang này?" },
  "billing.faq.whoCanPay.a": { id: "Hanya akun dengan izin \"manage_settings\" (biasanya Owner) yang bisa checkout, memilih metode bayar, dan menandai tagihan lunas. Role lain tetap bisa melihat status langganan tapi tombol aksinya disembunyikan.", en: "Only accounts with the \"manage_settings\" permission (usually the Owner) can check out, choose a payment method, and mark invoices paid. Other roles can still see the subscription status, but the action buttons are hidden.", ms: "Hanya akaun dengan kebenaran \"manage_settings\" (biasanya Pemilik) boleh checkout, memilih kaedah bayaran, dan menandakan bil dijelaskan. Peranan lain masih boleh melihat status langganan tetapi butang tindakannya disembunyikan.", th: "เฉพาะบัญชีที่มีสิทธิ์ \"manage_settings\" (ปกติคือเจ้าของ) เท่านั้นที่เช็กเอาต์ เลือกวิธีชำระเงิน และทำเครื่องหมายว่าชำระแล้วได้ บทบาทอื่นยังเห็นสถานะการสมัคร แต่ปุ่มดำเนินการจะถูกซ่อน", fil: "Ang mga account lang na may \"manage_settings\" na pahintulot (karaniwang Owner) ang puwedeng mag-checkout, pumili ng paraan ng bayad, at magmarka ng invoice bilang bayad. Makikita pa rin ng ibang role ang status ng subscription pero nakatago ang mga action button.", vi: "Chỉ tài khoản có quyền \"manage_settings\" (thường là Chủ sở hữu) mới checkout, chọn phương thức thanh toán và đánh dấu hóa đơn đã trả. Vai trò khác vẫn xem được trạng thái gói nhưng các nút thao tác bị ẩn." },
  "billing.faq.manual.q": { id: "Di mana saya download buku manual Smart Plug?", en: "Where do I download the Smart Plug manual?", ms: "Di mana saya memuat turun manual Palam Pintar?", th: "ดาวน์โหลดคู่มือสมาร์ทปลั๊กได้ที่ไหน?", fil: "Saan ko ida-download ang manual ng Smart Plug?", vi: "Tôi tải hướng dẫn Ổ cắm thông minh ở đâu?" },
  "billing.faq.manual.a": { id: "Tombol \"Download Buku Manual Smart Plug\" otomatis muncul di kartu status paket begitu kamu pernah membeli minimal 1 unit Smart Plug.", en: "The \"Download Smart Plug Manual\" button appears automatically on the plan status card once you've bought at least 1 Smart Plug.", ms: "Butang \"Muat Turun Manual Palam Pintar\" muncul secara automatik pada kad status pakej sebaik sahaja anda pernah membeli sekurang-kurangnya 1 unit Palam Pintar.", th: "ปุ่ม \"ดาวน์โหลดคู่มือสมาร์ทปลั๊ก\" จะแสดงบนการ์ดสถานะแพ็กเกจอัตโนมัติเมื่อคุณเคยซื้อสมาร์ทปลั๊กอย่างน้อย 1 ชิ้น", fil: "Awtomatikong lalabas ang button na \"I-download ang Manual ng Smart Plug\" sa plan status card kapag nakabili ka na ng kahit 1 Smart Plug.", vi: "Nút \"Tải hướng dẫn Ổ cắm thông minh\" tự động hiện trên thẻ trạng thái gói khi bạn đã mua ít nhất 1 Ổ cắm thông minh." },
  "billing.faq.superuser.q": { id: "Akun Superuser kena aturan trial/kunci juga?", en: "Do Superuser accounts follow the trial/lock rules too?", ms: "Adakah akaun Superuser turut tertakluk pada peraturan percubaan/kunci?", th: "บัญชี Superuser อยู่ภายใต้กฎทดลองใช้/ล็อกด้วยไหม?", fil: "Saklaw din ba ng trial/lock na patakaran ang Superuser account?", vi: "Tài khoản Superuser có chịu quy tắc dùng thử/khóa không?" },
  "billing.faq.superuser.a": { id: "Tidak — akun Superuser (internal/testing NEXBILL) tidak pernah dibatasi trial, kunci akses, atau masa tenggang, supaya semua fitur tetap bisa diuji kapan saja. Bagian checkout & riwayat tagihan tetap tersedia kalau ingin tetap dipakai.", en: "No — Superuser accounts (NEXBILL internal/testing) are never limited by the trial, access lock, or grace period, so every feature can be tested at any time. The checkout & invoice history sections are still available if you want to use them.", ms: "Tidak — akaun Superuser (dalaman/ujian NEXBILL) tidak pernah dihadkan oleh percubaan, kunci akses, atau tempoh tangguh, supaya semua ciri boleh diuji bila-bila masa. Bahagian checkout & sejarah bil tetap tersedia jika mahu digunakan.", th: "ไม่ — บัญชี Superuser (ภายใน/ทดสอบของ NEXBILL) ไม่ถูกจำกัดด้วยการทดลองใช้ การล็อกการเข้าถึง หรือระยะผ่อนผัน เพื่อให้ทดสอบทุกฟีเจอร์ได้ตลอดเวลา ส่วนเช็กเอาต์และประวัติใบแจ้งหนี้ยังใช้ได้หากต้องการ", fil: "Hindi — hindi kailanman nalilimitahan ng trial, access lock, o grace period ang Superuser account (internal/testing ng NEXBILL), para masubok ang lahat ng feature anumang oras. Available pa rin ang checkout at kasaysayan ng invoice kung gusto mong gamitin.", vi: "Không — tài khoản Superuser (nội bộ/kiểm thử của NEXBILL) không bao giờ bị giới hạn bởi dùng thử, khóa truy cập hay thời gian ân hạn, để mọi tính năng luôn kiểm thử được. Phần checkout & lịch sử hóa đơn vẫn có sẵn nếu muốn dùng." },
});
