import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/notifikasi (notifications list) page. Registered as a side
 * effect on import — see dict-shell.ts for the pattern this follows.
 */
registerDict({
  "notifikasi.title": { id: "Notifikasi", en: "Notifications", ms: "Notifikasi", th: "การแจ้งเตือน", fil: "Mga Notification", vi: "Thông báo" },
  "notifikasi.subtitle": {
    id: "Semua hal yang butuh perhatianmu di outlet ini — stok menipis, approval tertunda, dan lainnya.",
    en: "Everything that needs your attention at this outlet — low stock, pending approvals, and more.",
    ms: "Semua perkara yang memerlukan perhatian anda di outlet ini — stok rendah, kelulusan tertunda, dan lain-lain.",
    th: "ทุกสิ่งที่ต้องให้ความสนใจในสาขานี้ — สินค้าใกล้หมด การอนุมัติที่รอดำเนินการ และอื่นๆ",
    fil: "Lahat ng bagay na kailangan ng iyong atensyon sa outlet na ito — mababang stock, nakabinbing approval, at iba pa.",
    vi: "Mọi thứ cần bạn chú ý tại chi nhánh này — tồn kho thấp, phê duyệt đang chờ, và hơn thế nữa.",
  },
  "notifikasi.markAllRead": { id: "Tandai semua dibaca", en: "Mark all as read", ms: "Tanda semua dibaca", th: "ทำเครื่องหมายว่าอ่านทั้งหมด", fil: "Markahan lahat bilang nabasa", vi: "Đánh dấu đã đọc tất cả" },
  "notifikasi.filterAll": { id: "Semua ({n})", en: "All ({n})", ms: "Semua ({n})", th: "ทั้งหมด ({n})", fil: "Lahat ({n})", vi: "Tất cả ({n})" },
  "notifikasi.filterUnread": { id: "Belum Dibaca ({n})", en: "Unread ({n})", ms: "Belum Dibaca ({n})", th: "ยังไม่ได้อ่าน ({n})", fil: "Hindi Nabasa ({n})", vi: "Chưa đọc ({n})" },
  "notifikasi.loading": { id: "Memuat…", en: "Loading…", ms: "Memuatkan…", th: "กำลังโหลด…", fil: "Nilo-load…", vi: "Đang tải…" },
  "notifikasi.emptyUnread": { id: "Tidak ada notifikasi yang belum dibaca.", en: "No unread notifications.", ms: "Tiada notifikasi belum dibaca.", th: "ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน", fil: "Walang hindi nabasang notification.", vi: "Không có thông báo chưa đọc." },
  "notifikasi.emptyAll": { id: "Tidak ada notifikasi.", en: "No notifications.", ms: "Tiada notifikasi.", th: "ไม่มีการแจ้งเตือน", fil: "Walang notification.", vi: "Không có thông báo." },
  "notifikasi.markRead": { id: "Tandai dibaca", en: "Mark as read", ms: "Tanda dibaca", th: "ทำเครื่องหมายว่าอ่านแล้ว", fil: "Markahan bilang nabasa", vi: "Đánh dấu đã đọc" },

  "notifikasi.type.lowStock": { id: "Stok", en: "Stock", ms: "Stok", th: "สต็อก", fil: "Stock", vi: "Tồn kho" },
  "notifikasi.type.approvalPending": { id: "Approval", en: "Approval", ms: "Kelulusan", th: "การอนุมัติ", fil: "Approval", vi: "Phê duyệt" },
  "notifikasi.type.expensePending": { id: "Expense", en: "Expense", ms: "Perbelanjaan", th: "ค่าใช้จ่าย", fil: "Expense", vi: "Chi phí" },
  "notifikasi.type.bookingPending": { id: "Booking", en: "Booking", ms: "Tempahan", th: "การจอง", fil: "Booking", vi: "Đặt chỗ" },
  "notifikasi.type.subscriptionTrial": { id: "Langganan", en: "Subscription", ms: "Langganan", th: "การสมัครสมาชิก", fil: "Subscription", vi: "Gói đăng ký" },
  "notifikasi.type.announcement": { id: "Pengumuman", en: "Announcement", ms: "Pengumuman", th: "ประกาศ", fil: "Anunsyo", vi: "Thông báo chung" },
});
