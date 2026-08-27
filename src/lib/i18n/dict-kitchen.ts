import { registerDict } from "./registry";

/**
 * Translations for /dashboard/kitchen — the Kitchen Display System (KDS): the F&B order queue
 * kitchen staff work from (new → confirmed → preparing → ready), plus the sound/browser
 * notification toggles that alert cooks to new orders and finished dishes. Registered as a side
 * effect on import; import this file once near the top of the kitchen page before any component
 * calls useDashboardLang().t().
 */
registerDict({
  // --- Header ---
  "kitchen.title": { id: "Kitchen Display System", en: "Kitchen Display System", ms: "Sistem Paparan Dapur", th: "ระบบจอแสดงผลครัว", fil: "Kitchen Display System", vi: "Hệ thống hiển thị bếp" },
  "kitchen.subtitle": {
    id: "Semua pesanan F&B dari sesi rental & POS yang masih perlu diproses dapur. Refresh otomatis tiap 4 detik.",
    en: "All F&B orders from rental sessions & POS that still need the kitchen's attention. Auto-refreshes every 4 seconds.",
    ms: "Semua pesanan F&B daripada sesi sewaan & POS yang masih perlu diproses oleh dapur. Refresh automatik setiap 4 saat.",
    th: "คำสั่งซื้ออาหารและเครื่องดื่มทั้งหมดจากเซสชันเช่าและ POS ที่ยังต้องให้ครัวจัดเตรียม รีเฟรชอัตโนมัติทุก 4 วินาที",
    fil: "Lahat ng F&B order mula sa mga rental session at POS na kailangan pang asikasuhin ng kusina. Awtomatikong nagre-refresh tuwing 4 segundo.",
    vi: "Tất cả đơn hàng F&B từ các phiên thuê & POS vẫn cần bếp xử lý. Tự động làm mới mỗi 4 giây.",
  },

  // --- Column / kitchen status labels ---
  "kitchen.status.new": { id: "Baru", en: "New", ms: "Baharu", th: "ใหม่", fil: "Bago", vi: "Mới" },
  "kitchen.status.confirmed": { id: "Dikonfirmasi", en: "Confirmed", ms: "Disahkan", th: "ยืนยันแล้ว", fil: "Nakumpirma", vi: "Đã xác nhận" },
  "kitchen.status.preparing": { id: "Diproses", en: "Preparing", ms: "Sedang Diproses", th: "กำลังเตรียม", fil: "Inihahanda", vi: "Đang chế biến" },
  "kitchen.status.ready": { id: "Siap", en: "Ready", ms: "Sedia", th: "พร้อม", fil: "Handa na", vi: "Sẵn sàng" },

  // --- Next-action button per column ---
  "kitchen.nextAction.new": { id: "Konfirmasi", en: "Confirm", ms: "Sahkan", th: "ยืนยัน", fil: "Kumpirmahin", vi: "Xác nhận" },
  "kitchen.nextAction.confirmed": { id: "Mulai Masak", en: "Start Cooking", ms: "Mula Masak", th: "เริ่มทำอาหาร", fil: "Simulan ang Pagluluto", vi: "Bắt đầu nấu" },
  "kitchen.nextAction.preparing": { id: "Siap Diantar", en: "Ready to Serve", ms: "Sedia Dihantar", th: "พร้อมเสิร์ฟ", fil: "Handa nang Ihatid", vi: "Sẵn sàng phục vụ" },
  "kitchen.nextAction.ready": { id: "Sudah Diantar", en: "Served", ms: "Sudah Dihantar", th: "เสิร์ฟแล้ว", fil: "Naihatid na", vi: "Đã phục vụ" },

  // --- Card details ---
  "kitchen.walkInPos": { id: "Walk-in POS", en: "Walk-in POS", ms: "Walk-in POS", th: "หน้าร้าน (POS)", fil: "Walk-in POS", vi: "Bán tại quầy (POS)" },
  "kitchen.minutesAgo": { id: "{n} menit lalu", en: "{n} min ago", ms: "{n} minit lalu", th: "{n} นาทีที่แล้ว", fil: "{n} minuto ang nakalipas", vi: "{n} phút trước" },
  "kitchen.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "kitchen.empty": { id: "Kosong", en: "Empty", ms: "Kosong", th: "ว่าง", fil: "Wala", vi: "Trống" },

  // --- Sound & browser notification toggles ---
  "kitchen.soundOn": { id: "Suara Aktif", en: "Sound On", ms: "Bunyi Aktif", th: "เปิดเสียง", fil: "Naka-on ang Tunog", vi: "Đã bật âm thanh" },
  "kitchen.soundOff": { id: "Suara Mati", en: "Sound Off", ms: "Bunyi Mati", th: "ปิดเสียง", fil: "Naka-off ang Tunog", vi: "Đã tắt âm thanh" },
  "kitchen.enableBrowserNotif": { id: "Aktifkan Notifikasi Browser", en: "Enable Browser Notifications", ms: "Aktifkan Pemberitahuan Pelayar", th: "เปิดใช้งานการแจ้งเตือนเบราว์เซอร์", fil: "I-enable ang Browser Notifications", vi: "Bật thông báo trình duyệt" },

  // --- New-order / food-ready alerts (toast + browser Notification title) ---
  "kitchen.notif.newOrderTitle": { id: "Pesanan Baru", en: "New Order", ms: "Pesanan Baharu", th: "คำสั่งซื้อใหม่", fil: "Bagong Order", vi: "Đơn hàng mới" },
  "kitchen.notif.readyTitle": { id: "Makanan Siap", en: "Food Ready", ms: "Makanan Sedia", th: "อาหารพร้อม", fil: "Handa na ang Pagkain", vi: "Món ăn đã sẵn sàng" },
  "kitchen.notif.newBody": { id: "{qty}x {desc} — {unit}", en: "{qty}x {desc} — {unit}", ms: "{qty}x {desc} — {unit}", th: "{qty}x {desc} — {unit}", fil: "{qty}x {desc} — {unit}", vi: "{qty}x {desc} — {unit}" },
  "kitchen.notif.readyBody": {
    id: "{qty}x {desc} — {unit} siap diantar",
    en: "{qty}x {desc} — {unit} ready to serve",
    ms: "{qty}x {desc} — {unit} sedia dihantar",
    th: "{qty}x {desc} — {unit} พร้อมเสิร์ฟ",
    fil: "{qty}x {desc} — {unit} handa nang ihatid",
    vi: "{qty}x {desc} — {unit} đã sẵn sàng phục vụ",
  },

  // --- Cancel-item prompt ---
  "kitchen.cancelPromptMessage": { id: "Alasan batal (mis. bahan habis)?", en: "Reason for cancellation (e.g. out of ingredients)?", ms: "Sebab pembatalan (cth. bahan habis)?", th: "เหตุผลที่ยกเลิก (เช่น วัตถุดิบหมด)?", fil: "Dahilan ng pagkansela (hal. naubusan ng sangkap)?", vi: "Lý do hủy (vd: hết nguyên liệu)?" },
  "kitchen.cancelPromptDefault": { id: "Bahan habis", en: "Out of ingredients", ms: "Bahan habis", th: "วัตถุดิบหมด", fil: "Naubusan ng sangkap", vi: "Hết nguyên liệu" },
});
