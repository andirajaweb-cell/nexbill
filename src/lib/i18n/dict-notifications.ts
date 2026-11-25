import { registerDict } from "./registry";

/**
 * Translations for the server-computed notification bell content (lib/notifications/index.ts) —
 * distinct from dict-notifikasi.ts, which only covers that page's own chrome (title, filters,
 * type-label chips). This dictionary covers the actual item.title/item.message text baked into
 * each NotificationItem before it's sent to the client, so it must be imported by
 * lib/notifications/index.ts itself (server-side) rather than relying on some client page having
 * already registered it — see dashboard-lang.tsx's doc comment on why side-effect registration
 * has to happen in every module that actually needs the keys at runtime.
 */
registerDict({
  "notifications.lowStock.title": { id: "Stok menipis", en: "Low stock", ms: "Stok rendah", th: "สินค้าใกล้หมด", fil: "Mababa na ang stock", vi: "Sắp hết hàng" },
  "notifications.lowStock.message": {
    id: "{name} tersisa {qty} {unit} (ambang batas {threshold})",
    en: "{name} has {qty} {unit} left (threshold {threshold})",
    ms: "{name} tinggal {qty} {unit} (ambang {threshold})",
    th: "{name} เหลือ {qty} {unit} (เกณฑ์ {threshold})",
    fil: "{name} may natitirang {qty} {unit} (threshold {threshold})",
    vi: "{name} còn lại {qty} {unit} (ngưỡng {threshold})",
  },

  "notifications.approvalPending.titlePrefix": { id: "Persetujuan", en: "Approval", ms: "Kelulusan", th: "การอนุมัติ", fil: "Approval", vi: "Phê duyệt" },
  "notifications.approvalPending.messageFallback": {
    id: "Menunggu persetujuan ({refType})",
    en: "Awaiting approval ({refType})",
    ms: "Menunggu kelulusan ({refType})",
    th: "รอการอนุมัติ ({refType})",
    fil: "Naghihintay ng approval ({refType})",
    vi: "Đang chờ phê duyệt ({refType})",
  },

  "notifications.manualCost.title": { id: "Harga modal diubah manual: {product}", en: "Cost price changed manually: {product}", ms: "Harga kos diubah secara manual: {product}", th: "แก้ต้นทุนด้วยตนเอง: {product}", fil: "Manwal na binago ang puhunan: {product}", vi: "Giá vốn bị sửa thủ công: {product}" },
  "notifications.manualCost.message": { id: "{from} → {to} oleh {staff}. HPP & laba penjualan berikutnya memakai angka ini sampai Belanja Supplier berikutnya; nilai Persediaan dinilai ulang {reval} (Koreksi Persediaan).", en: "{from} → {to} by {staff}. COGS & profit on future sales use this figure until the next supplier purchase; inventory value revalued {reval} (Inventory Correction).", ms: "{from} → {to} oleh {staff}. Kos jualan & untung jualan seterusnya guna angka ini sehingga belian pembekal seterusnya; nilai inventori dinilai semula {reval} (Pembetulan Inventori).", th: "{from} → {to} โดย {staff} ต้นทุนขายและกำไรของการขายครั้งต่อไปใช้ตัวเลขนี้จนกว่าจะซื้อจากซัพพลายเออร์ครั้งถัดไป มูลค่าสินค้าคงคลังถูกปรับ {reval} (ปรับปรุงสินค้าคงคลัง)", fil: "{from} → {to} ni {staff}. Gagamitin ang halagang ito sa COGS at kita ng susunod na benta hanggang sa susunod na pagbili sa supplier; muling tinasa ang imbentaryo {reval} (Pagwawasto ng Imbentaryo).", vi: "{from} → {to} bởi {staff}. Giá vốn & lợi nhuận các lần bán sau dùng số này đến lần mua NCC tiếp theo; giá trị tồn kho được đánh giá lại {reval} (Điều chỉnh tồn kho)." },
  "notifications.expensePending.title": { id: "Expense butuh persetujuan", en: "Expense needs approval", ms: "Perbelanjaan perlu kelulusan", th: "รายจ่ายต้องได้รับการอนุมัติ", fil: "Kailangan ng approval ang expense", vi: "Chi phí cần phê duyệt" },

  "notifications.bookingPending.title": { id: "Booking baru menunggu konfirmasi", en: "New booking awaiting confirmation", ms: "Tempahan baharu menunggu pengesahan", th: "การจองใหม่รอการยืนยัน", fil: "Bagong booking na naghihintay ng kumpirmasyon", vi: "Đặt chỗ mới đang chờ xác nhận" },
  "notifications.bookingPending.customerFallback": { id: "Pelanggan", en: "Customer", ms: "Pelanggan", th: "ลูกค้า", fil: "Customer", vi: "Khách hàng" },

  "notifications.subscriptionTrial.endingTitle": { id: "Masa trial akan berakhir", en: "Trial period ending soon", ms: "Tempoh percubaan akan tamat", th: "ช่วงทดลองใช้กำลังจะสิ้นสุด", fil: "Malapit nang matapos ang trial period", vi: "Thời gian dùng thử sắp kết thúc" },
  "notifications.subscriptionTrial.daysLeft": { id: "Sisa {n} hari lagi.", en: "{n} day(s) left.", ms: "Baki {n} hari lagi.", th: "เหลืออีก {n} วัน", fil: "{n} araw na lang.", vi: "Còn lại {n} ngày." },
  "notifications.subscriptionTrial.endsToday": { id: "Masa trial berakhir hari ini.", en: "The trial period ends today.", ms: "Tempoh percubaan tamat hari ini.", th: "ช่วงทดลองใช้สิ้นสุดวันนี้", fil: "Nagtatapos ngayon ang trial period.", vi: "Thời gian dùng thử kết thúc hôm nay." },
  "notifications.subscriptionTrial.expiredTitle": { id: "Masa trial sudah berakhir", en: "Trial period has ended", ms: "Tempoh percubaan telah tamat", th: "ช่วงทดลองใช้สิ้นสุดแล้ว", fil: "Natapos na ang trial period", vi: "Thời gian dùng thử đã kết thúc" },
  "notifications.subscriptionTrial.expiredMessage": { id: "Berlangganan sekarang supaya sistem tidak terkunci.", en: "Subscribe now so the system doesn't get locked.", ms: "Langgan sekarang supaya sistem tidak dikunci.", th: "สมัครสมาชิกตอนนี้เพื่อไม่ให้ระบบถูกล็อก", fil: "Mag-subscribe na para hindi ma-lock ang sistema.", vi: "Đăng ký ngay để hệ thống không bị khóa." },
  "notifications.subscriptionTrial.graceTitle": { id: "Pembayaran langganan gagal", en: "Subscription payment failed", ms: "Pembayaran langganan gagal", th: "การชำระเงินสมาชิกล้มเหลว", fil: "Nabigo ang bayad sa subscription", vi: "Thanh toán gói đăng ký thất bại" },
  "notifications.subscriptionTrial.suspendedTitle": { id: "Langganan disuspend", en: "Subscription suspended", ms: "Langganan digantung", th: "ระงับการสมัครสมาชิก", fil: "Naka-suspend ang subscription", vi: "Gói đăng ký đã bị tạm ngưng" },
  "notifications.subscriptionTrial.resolveMessage": { id: "Segera selesaikan pembayaran di halaman Langganan.", en: "Please complete payment on the Subscription page right away.", ms: "Sila selesaikan pembayaran di halaman Langganan segera.", th: "โปรดชำระเงินให้เสร็จสิ้นที่หน้าการสมัครสมาชิกโดยเร็ว", fil: "Kumpletuhin agad ang bayad sa pahina ng Subscription.", vi: "Vui lòng hoàn tất thanh toán trên trang Đăng ký ngay." },

  "notifications.maintenanceDue.title": { id: "Unit butuh servis", en: "Unit needs service", ms: "Unit perlu servis", th: "เครื่องต้องซ่อมบำรุง", fil: "Kailangan ng serbisyo ang unit", vi: "Máy cần bảo trì" },
  "notifications.maintenanceDue.message": {
    id: "{name} sudah dipakai {hours} jam sejak servis terakhir (ambang batas {threshold} jam){overdue}",
    en: "{name} has been used {hours}h since last service (threshold {threshold}h){overdue}",
    ms: "{name} telah digunakan {hours} jam sejak servis terakhir (ambang {threshold} jam){overdue}",
    th: "{name} ถูกใช้งาน {hours} ชม. ตั้งแต่ซ่อมบำรุงล่าสุด (เกณฑ์ {threshold} ชม.){overdue}",
    fil: "{name} ay nagamit ng {hours} oras mula sa huling serbisyo (threshold {threshold} oras){overdue}",
    vi: "{name} đã được sử dụng {hours} giờ kể từ lần bảo trì gần nhất (ngưỡng {threshold} giờ){overdue}",
  },
  "notifications.maintenanceDue.overdueSuffix": {
    id: " — lewat {overdue} jam",
    en: " — {overdue}h overdue",
    ms: " — lewat {overdue} jam",
    th: " — เกิน {overdue} ชม.",
    fil: " — {overdue} oras na lampas",
    vi: " — quá hạn {overdue} giờ",
  },
});
