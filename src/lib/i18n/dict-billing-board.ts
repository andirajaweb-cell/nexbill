import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/billing-board "Live Billing Board" page — active rental
 * session cards with live timers and running bills. Registered as a side effect on import;
 * import this file (for its side effect) from the page component before any call to
 * useDashboardLang().t().
 */
registerDict({
  "billingBoard.title": { id: "Live Billing Board", en: "Live Billing Board", ms: "Papan Bil Langsung", th: "บอร์ดบิลสด", fil: "Live Billing Board", vi: "Bảng tính giờ trực tiếp" },
  "billingBoard.subtitle": { id: "Semua sesi PS aktif, timer, dan bill berjalan dalam satu layar. Auto-refresh setiap 3 detik.", en: "All active PS sessions, timers, and running bills in one screen. Auto-refreshes every 3 seconds.", ms: "Semua sesi PS aktif, pemasa, dan bil berjalan dalam satu skrin. Muat semula automatik setiap 3 saat.", th: "เซสชัน PS ที่ใช้งานอยู่ทั้งหมด ตัวจับเวลา และบิลที่กำลังดำเนินอยู่ในหน้าจอเดียว รีเฟรชอัตโนมัติทุก 3 วินาที", fil: "Lahat ng aktibong PS session, timer, at tumatakbong bill sa isang screen. Awtomatikong nagre-refresh bawat 3 segundo.", vi: "Tất cả phiên PS đang hoạt động, bộ đếm giờ và hóa đơn đang chạy trên một màn hình. Tự động làm mới mỗi 3 giây." },
  "billingBoard.updatedAt": { id: "Diperbarui {time}", en: "Updated {time}", ms: "Dikemas kini {time}", th: "อัปเดตเมื่อ {time}", fil: "Na-update {time}", vi: "Cập nhật lúc {time}" },
  "billingBoard.loading": { id: "Memuat...", en: "Loading...", ms: "Memuatkan...", th: "กำลังโหลด...", fil: "Nilo-load...", vi: "Đang tải..." },
  "billingBoard.activeSessions": { id: "Sesi Aktif", en: "Active Sessions", ms: "Sesi Aktif", th: "เซสชันที่ใช้งานอยู่", fil: "Aktibong Session", vi: "Phiên đang hoạt động" },
  "billingBoard.playingStat": { id: "Sedang Bermain", en: "Currently Playing", ms: "Sedang Bermain", th: "กำลังเล่นอยู่", fil: "Kasalukuyang Naglalaro", vi: "Đang chơi" },
  "billingBoard.fnbOrdersRunning": { id: "Order F&B Berjalan", en: "Running F&B Orders", ms: "Pesanan F&B Berjalan", th: "ออเดอร์ F&B ที่กำลังดำเนินอยู่", fil: "Tumatakbong F&B Order", vi: "Đơn F&B đang chạy" },
  "billingBoard.totalRunningBill": { id: "Total Bill Berjalan", en: "Total Running Bill", ms: "Jumlah Bil Berjalan", th: "ยอดบิลรวมที่กำลังดำเนินอยู่", fil: "Kabuuang Tumatakbong Bill", vi: "Tổng hóa đơn đang chạy" },
  "billingBoard.noActiveSessions": { id: "Tidak ada sesi rental yang sedang aktif.", en: "No active rental sessions right now.", ms: "Tiada sesi sewa yang sedang aktif.", th: "ไม่มีเซสชันการเช่าที่ใช้งานอยู่ในขณะนี้", fil: "Walang aktibong rental session sa ngayon.", vi: "Hiện không có phiên thuê nào đang hoạt động." },
  "billingBoard.statusPaused": { id: "Jeda", en: "Paused", ms: "Jeda", th: "หยุดชั่วคราว", fil: "Naka-pause", vi: "Tạm dừng" },
  "billingBoard.statusPlaying": { id: "Bermain", en: "Playing", ms: "Bermain", th: "กำลังเล่น", fil: "Naglalaro", vi: "Đang chơi" },
  "billingBoard.extendMinutes": { id: "+{n} menit extend", en: "+{n} min extended", ms: "+{n} minit lanjutan", th: "ขยายเวลา +{n} นาที", fil: "+{n} minutong extend", vi: "+{n} phút gia hạn" },
  "billingBoard.rentalEstimate": { id: "Estimasi Rental ({rate}/jam)", en: "Rental Estimate ({rate}/hr)", ms: "Anggaran Sewa ({rate}/jam)", th: "ประมาณการค่าเช่า ({rate}/ชม.)", fil: "Tinatayang Rental ({rate}/oras)", vi: "Ước tính thuê ({rate}/giờ)" },
  "billingBoard.accessories": { id: "Aksesoris ({n})", en: "Accessories ({n})", ms: "Aksesori ({n})", th: "อุปกรณ์เสริม ({n})", fil: "Accessories ({n})", vi: "Phụ kiện ({n})" },
  "billingBoard.fnbItems": { id: "F&B ({n} item)", en: "F&B ({n} items)", ms: "F&B ({n} item)", th: "F&B ({n} รายการ)", fil: "F&B ({n} item)", vi: "F&B ({n} món)" },
  "billingBoard.runningBill": { id: "Bill Berjalan", en: "Running Bill", ms: "Bil Berjalan", th: "บิลที่กำลังดำเนินอยู่", fil: "Tumatakbong Bill", vi: "Hóa đơn đang chạy" },
});
