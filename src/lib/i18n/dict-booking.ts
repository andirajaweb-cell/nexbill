import { registerDict } from "./registry";

/**
 * Translations for /dashboard/booking — reservation search/check-in, the new-booking form,
 * the QR check-in and unit-transfer panels, and the booking list (status/source badges,
 * per-row actions, alerts/prompts). Registered as a side effect on import; import this file
 * once near the top of booking/page.tsx before any component calls useDashboardLang().t().
 */
registerDict({
  // --- Page header ---
  "booking.pageTitle": { id: "Booking / Reservasi", en: "Booking / Reservation", ms: "Tempahan / Reservasi", th: "การจอง / สำรอง", fil: "Booking / Reserbasyon", vi: "Đặt chỗ / Đặt trước" },
  "booking.pageSubtitle": { id: "DP opsional, deteksi bentrok otomatis (termasuk booking \"konsol apa saja\"), waiting list auto-promote, reminder WhatsApp H-24/H-2/15 menit, dan auto-release bila belum check-in.", en: "Optional down payment, automatic clash detection (including \"any console\" bookings), auto-promoting waiting list, WhatsApp reminders at 24h/2h/15min before, and auto-release if not checked in.", ms: "DP pilihan, pengesanan pertindihan automatik (termasuk tempahan \"mana-mana konsol\"), senarai tunggu auto-promote, peringatan WhatsApp 24 jam/2 jam/15 minit sebelum, dan pelepasan automatik jika tidak check-in.", th: "มัดจำเป็นทางเลือก ตรวจจับการชนกันของตารางอัตโนมัติ (รวมถึงการจองแบบ \"เครื่องใดก็ได้\") ระบบเลื่อนคิวรออัตโนมัติ แจ้งเตือนผ่าน WhatsApp ล่วงหน้า 24 ชม./2 ชม./15 นาที และปล่อยคิวอัตโนมัติหากยังไม่เช็คอิน", fil: "Opsyonal ang DP, may automatic na pagtukoy ng magkakabanggang schedule (kasama ang booking na \"kahit anong console\"), auto-promote na waiting list, paalala sa WhatsApp 24 oras/2 oras/15 minuto bago, at auto-release kung hindi pa naka-check-in.", vi: "Đặt cọc tùy chọn, tự động phát hiện trùng lịch (kể cả đặt chỗ \"bất kỳ máy nào\"), tự động thăng hạng danh sách chờ, nhắc nhở qua WhatsApp trước 24 giờ/2 giờ/15 phút, và tự động hủy giữ chỗ nếu chưa check-in." },

  // --- Quick lookup / check-in ---
  "booking.lookupLabel": { id: "Cari Kode Booking (check-in cepat)", en: "Search Booking Code (quick check-in)", ms: "Cari Kod Tempahan (check-in pantas)", th: "ค้นหารหัสการจอง (เช็คอินด่วน)", fil: "Maghanap ng Booking Code (mabilis na check-in)", vi: "Tìm mã đặt chỗ (check-in nhanh)" },
  "booking.lookupButton": { id: "Cari & Check-in", en: "Search & Check-in", ms: "Cari & Check-in", th: "ค้นหาและเช็คอิน", fil: "Hanapin at Check-in", vi: "Tìm & Check-in" },

  // --- New booking form ---
  "booking.newBookingTitle": { id: "Booking Baru", en: "New Booking", ms: "Tempahan Baharu", th: "การจองใหม่", fil: "Bagong Booking", vi: "Đặt chỗ mới" },
  "booking.customerNamePlaceholder": { id: "Nama pelanggan", en: "Customer name", ms: "Nama pelanggan", th: "ชื่อลูกค้า", fil: "Pangalan ng customer", vi: "Tên khách hàng" },
  "booking.phonePlaceholder": { id: "No. HP", en: "Phone number", ms: "No. Telefon", th: "เบอร์โทรศัพท์", fil: "Numero ng telepono", vi: "Số điện thoại" },
  "booking.anyUnitOption": { id: "Unit apa saja (pilih jenis konsol)", en: "Any unit (choose console type)", ms: "Mana-mana unit (pilih jenis konsol)", th: "เครื่องใดก็ได้ (เลือกประเภทคอนโซล)", fil: "Kahit anong unit (pumili ng uri ng console)", vi: "Bất kỳ máy nào (chọn loại máy)" },
  "booking.anyConsoleOption": { id: "Konsol apa saja", en: "Any console", ms: "Mana-mana konsol", th: "คอนโซลใดก็ได้", fil: "Kahit anong console", vi: "Bất kỳ loại máy nào" },
  "booking.dpPlaceholder": { id: "DP (opsional)", en: "Down payment (optional)", ms: "DP (pilihan)", th: "มัดจำ (ไม่บังคับ)", fil: "DP (opsyonal)", vi: "Đặt cọc (tùy chọn)" },
  "booking.createButton": { id: "Buat Booking", en: "Create Booking", ms: "Buat Tempahan", th: "สร้างการจอง", fil: "Gumawa ng Booking", vi: "Tạo đặt chỗ" },

  // --- QR check-in panel ---
  "booking.qrTitle": { id: "QR Check-in — {code}", en: "QR Check-in — {code}", ms: "QR Check-in — {code}", th: "QR เช็คอิน — {code}", fil: "QR Check-in — {code}", vi: "QR Check-in — {code}" },
  "booking.closeButton": { id: "Tutup", en: "Close", ms: "Tutup", th: "ปิด", fil: "Isara", vi: "Đóng" },

  // --- Transfer unit panel ---
  "booking.transferUnitTitle": { id: "Pindah Unit", en: "Transfer Unit", ms: "Pindah Unit", th: "ย้ายเครื่อง", fil: "Lumipat ng Unit", vi: "Chuyển máy" },
  "booking.selectDestUnit": { id: "Pilih unit tujuan", en: "Select destination unit", ms: "Pilih unit destinasi", th: "เลือกเครื่องปลายทาง", fil: "Piliin ang unit na patutunguhan", vi: "Chọn máy muốn chuyển đến" },
  "booking.transferSubmit": { id: "Pindahkan", en: "Transfer", ms: "Pindahkan", th: "ย้าย", fil: "Ilipat", vi: "Chuyển" },
  "booking.cancelButton": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },

  // --- Booking list rows ---
  "booking.noName": { id: "Tanpa nama", en: "No name", ms: "Tiada nama", th: "ไม่ระบุชื่อ", fil: "Walang pangalan", vi: "Không có tên" },
  "booking.waitlistPrefix": { id: "Antrian #{n}", en: "Queue #{n}", ms: "Giliran #{n}", th: "คิวที่ #{n}", fil: "Pila #{n}", vi: "Hàng chờ #{n}" },
  "booking.dpPrefix": { id: "DP {amount}", en: "Down payment {amount}", ms: "DP {amount}", th: "มัดจำ {amount}", fil: "DP {amount}", vi: "Đặt cọc {amount}" },
  "booking.confirmButton": { id: "Konfirmasi", en: "Confirm", ms: "Sahkan", th: "ยืนยัน", fil: "Kumpirmahin", vi: "Xác nhận" },
  "booking.checkInButton": { id: "Check-in", en: "Check-in", ms: "Check-in", th: "เช็คอิน", fil: "Check-in", vi: "Check-in" },
  "booking.qrButton": { id: "QR", en: "QR", ms: "QR", th: "QR", fil: "QR", vi: "QR" },
  "booking.noShowButton": { id: "No-show", en: "No-show", ms: "Tidak Hadir", th: "ไม่มาตามนัด", fil: "Hindi Dumating", vi: "Không đến" },
  "booking.cancelBookingPrompt": { id: "Alasan pembatalan?", en: "Reason for cancellation?", ms: "Sebab pembatalan?", th: "เหตุผลในการยกเลิก?", fil: "Dahilan ng pagkansela?", vi: "Lý do hủy?" },
  "booking.undoNoShowButton": { id: "Batalkan No-show", en: "Undo No-show", ms: "Batalkan Tidak Hadir", th: "ยกเลิกสถานะไม่มาตามนัด", fil: "I-undo ang No-show", vi: "Hoàn tác Không đến" },
  "booking.undoNoShowConfirm": { id: "Batalkan status no-show untuk booking {code}? Status akan kembali ke \"Confirmed\".", en: "Undo the no-show status for booking {code}? The status will revert to \"Confirmed\".", ms: "Batalkan status tidak hadir untuk tempahan {code}? Status akan kembali kepada \"Confirmed\".", th: "ยกเลิกสถานะไม่มาตามนัดสำหรับการจอง {code} หรือไม่? สถานะจะกลับไปเป็น \"Confirmed\"", fil: "I-undo ang no-show status para sa booking {code}? Babalik ang status sa \"Confirmed\".", vi: "Hoàn tác trạng thái không đến cho đặt chỗ {code}? Trạng thái sẽ quay về \"Confirmed\"." },
  "booking.emptyState": { id: "Belum ada booking.", en: "No bookings yet.", ms: "Belum ada tempahan.", th: "ยังไม่มีการจอง", fil: "Wala pang booking.", vi: "Chưa có đặt chỗ nào." },

  // --- Alerts / prompts ---
  "booking.alertFillSchedule": { id: "Isi jadwal mulai & selesai.", en: "Please fill in the start & end schedule.", ms: "Sila isi jadual mula & tamat.", th: "กรุณากรอกเวลาเริ่มและสิ้นสุด", fil: "Punan ang oras ng simula at pagtatapos.", vi: "Vui lòng nhập thời gian bắt đầu và kết thúc." },
  "booking.alertWaitlisted": { id: "Jadwal bentrok — booking {code} dimasukkan ke waiting list (#{position}).", en: "Schedule clash — booking {code} was added to the waiting list (#{position}).", ms: "Jadual bertindih — tempahan {code} dimasukkan ke senarai tunggu (#{position}).", th: "ตารางเวลาชนกัน — การจอง {code} ถูกเพิ่มเข้าคิวรอ (#{position})", fil: "May nagbanggaan sa schedule — idinagdag ang booking {code} sa waiting list (#{position}).", vi: "Trùng lịch — đặt chỗ {code} đã được thêm vào danh sách chờ (#{position})." },
  "booking.alertSelectDestUnit": { id: "Pilih unit tujuan.", en: "Please select a destination unit.", ms: "Sila pilih unit destinasi.", th: "กรุณาเลือกเครื่องปลายทาง", fil: "Pumili ng unit na patutunguhan.", vi: "Vui lòng chọn máy muốn chuyển đến." },
  "booking.transferReasonPrompt": { id: "Alasan pindah unit? (opsional)", en: "Reason for the unit transfer? (optional)", ms: "Sebab pindah unit? (pilihan)", th: "เหตุผลในการย้ายเครื่อง? (ไม่บังคับ)", fil: "Dahilan ng paglipat ng unit? (opsyonal)", vi: "Lý do chuyển máy? (tùy chọn)" },

  // --- Status labels ---
  "booking.status.pending": { id: "Pending", en: "Pending", ms: "Pending", th: "รอดำเนินการ", fil: "Pending", vi: "Chờ xử lý" },
  "booking.status.confirmed": { id: "Confirmed", en: "Confirmed", ms: "Confirmed", th: "ยืนยันแล้ว", fil: "Confirmed", vi: "Đã xác nhận" },
  "booking.status.checkedIn": { id: "Checked-in", en: "Checked-in", ms: "Checked-in", th: "เช็คอินแล้ว", fil: "Naka-check-in", vi: "Đã check-in" },
  "booking.status.completed": { id: "Completed", en: "Completed", ms: "Completed", th: "เสร็จสิ้น", fil: "Tapos na", vi: "Hoàn tất" },
  "booking.status.cancelled": { id: "Cancelled", en: "Cancelled", ms: "Cancelled", th: "ยกเลิกแล้ว", fil: "Kinansela", vi: "Đã hủy" },
  "booking.status.noShow": { id: "No-show", en: "No-show", ms: "Tidak Hadir", th: "ไม่มาตามนัด", fil: "Hindi Dumating", vi: "Không đến" },
  "booking.status.expired": { id: "Expired", en: "Expired", ms: "Luput Tempoh", th: "หมดอายุ", fil: "Nag-expire", vi: "Hết hạn" },
  "booking.status.waitlisted": { id: "Waiting List", en: "Waiting List", ms: "Senarai Tunggu", th: "รายชื่อรอคิว", fil: "Waiting List", vi: "Danh sách chờ" },

  // --- Source labels ---
  "booking.source.kasir": { id: "Kasir", en: "Cashier", ms: "Juruwang", th: "แคชเชียร์", fil: "Cashier", vi: "Thu ngân" },
  "booking.source.online": { id: "Online", en: "Online", ms: "Online", th: "ออนไลน์", fil: "Online", vi: "Trực tuyến" },
  "booking.source.whatsapp": { id: "WhatsApp", en: "WhatsApp", ms: "WhatsApp", th: "WhatsApp", fil: "WhatsApp", vi: "WhatsApp" },
});
